import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ... (MANTENHA A FUNÇÃO initFirebase IGUAL AO SEU CÓDIGO ORIGINAL) ...
const initFirebase = () => {
    if (!admin || !admin.apps) throw new Error("Biblioteca Firebase Admin não foi carregada corretamente.");
    if (admin.apps.length > 0) return admin.firestore();

    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    let credential;
    try {
        if (serviceAccountBase64) {
            const buffer = Buffer.from(serviceAccountBase64, 'base64');
            credential = admin.credential.cert(JSON.parse(buffer.toString('utf-8')));
        } else if (serviceAccountJSON) {
            credential = admin.credential.cert(JSON.parse(serviceAccountJSON));
        } else if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); 
            credential = admin.credential.cert({ projectId, clientEmail, privateKey });
        }
    } catch (parseError) {
        throw new Error(`Falha ao ler credenciais do Firebase: ${parseError.message}`);
    }

    if (!credential) throw new Error("Nenhuma credencial do Firebase encontrada.");

    try {
        admin.initializeApp({ credential });
        console.log("✅ Firebase Admin inicializado.");
    } catch (e) {
        if (!e.message.includes('already exists')) throw e;
    }
    return admin.firestore();
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = initFirebase();
    const { token, payment_method_id, installments, payer, bookingDetails } = req.body;

    // Validação básica
    if (!bookingDetails?.dayuseId) throw new Error("ID do Day Use não fornecido.");

    // 2. Busca Day Use
    const dayUseRef = db.collection('dayuses').doc(bookingDetails.dayuseId);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    // 3. Busca Token do Parceiro
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    if (!ownerSnap.exists || !ownerSnap.data().mp_access_token) {
        throw new Error("O estabelecimento não configurou o recebimento de pagamentos (Token MP ausente).");
    }
    
    const partnerAccessToken = ownerSnap.data().mp_access_token;

    // 4. Cálculo de Preço Seguro
    const dateParts = bookingDetails.date.split('-'); 
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0); 
    const dayOfWeek = dateObj.getDay();

    let priceAdult = Number(item.priceAdult);
    let priceChild = Number(item.priceChild || 0);
    let pricePet = Number(item.petFee || 0);

    if (item.weeklyPrices && item.weeklyPrices[dayOfWeek]) {
        const dayConfig = item.weeklyPrices[dayOfWeek];
        if (typeof dayConfig === 'object') {
            if (dayConfig.adult) priceAdult = Number(dayConfig.adult);
            if (dayConfig.child) priceChild = Number(dayConfig.child);
            if (dayConfig.pet) pricePet = Number(dayConfig.pet);
        } else if (!isNaN(dayConfig)) priceAdult = Number(dayConfig);
    }

    let calculatedTotal = 
        (Number(bookingDetails.adults) * priceAdult) + 
        (Number(bookingDetails.children) * priceChild) + 
        (Number(bookingDetails.pets) * pricePet);

    if (bookingDetails.selectedSpecial && item.specialTickets) {
        Object.entries(bookingDetails.selectedSpecial).forEach(([idx, qtd]) => {
            const ticket = item.specialTickets[idx];
            if (ticket && qtd > 0) calculatedTotal += (Number(ticket.price) * Number(qtd));
        });
    }

    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) calculatedTotal -= (calculatedTotal * coupon.percentage / 100);
    }
    
    if (calculatedTotal <= 0) throw new Error("Valor total inválido.");

    // ---------------------------------------------------------
    // 5. Processar Pagamento (Com Lógica de Comissão Ajustada)
    // ---------------------------------------------------------
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);

    // Definição das Taxas
    const TAXA_PIX = 0.0099; // 0.99%
    const TAXA_CARTAO = 0.0398; // 3.98% (D+30 Padrão)
    const PERCENTUAL_PARCEIRO = 0.90; // Parceiro recebe 90% fixo

    // Identifica qual taxa aplicar
    const isPix = payment_method_id === 'pix';
    const currentMpFeeRate = isPix ? TAXA_PIX : TAXA_CARTAO;

    // Cálculos de valores absolutos
    const mpFeeAmount = calculatedTotal * currentMpFeeRate; // Quanto o MP vai morder
    const partnerNetShare = calculatedTotal * PERCENTUAL_PARCEIRO; // Quanto o parceiro TEM que receber (90%)

    // Cálculo da Application Fee (Sua comissão)
    // Total - Taxa MP - Parte do Parceiro = Sua Comissão
    let commission = calculatedTotal - mpFeeAmount - partnerNetShare;

    // Prevenção de erro matemático (Arredondamento e segurança para não ficar negativo)
    if (commission < 0) commission = 0;
    
    // Arredonda para 2 casas decimais (Formato moeda)
    commission = Math.round(commission * 100) / 100;
    
    // Formata o total também para garantir precisão no envio
    const transactionAmount = Number(calculatedTotal.toFixed(2));

    const paymentBody = {
      transaction_amount: transactionAmount,
      description: `Reserva: ${item.name}`,
      payment_method_id,
      application_fee: commission, // Sua comissão calculada dinamicamente
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
      }
    };

    // Configuração para Cartão de Crédito
    if (!isPix) {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
      
      // NOTA: Ao não passar 'payer_costs', o comportamento padrão do MP 
      // é cobrar os juros do comprador se o parcelamento tiver juros configurado.
      // O vendedor receberá o valor 'transaction_amount' (principal) menos as taxas.
    }

    console.log(`💳 Processando MP (${payment_method_id}). 
      Total: R$${transactionAmount}
      Taxa MP Estimada: R$${mpFeeAmount.toFixed(2)}
      Parceiro (90%): R$${partnerNetShare.toFixed(2)}
      Commission (App Fee): R$${commission.toFixed(2)}`);
    
    const result = await payment.create({ body: paymentBody });

    return res.status(200).json({
      id: result.id,
      status: result.status,
      detail: result.status_detail,
      point_of_interaction: result.point_of_interaction,
      charged_amount: transactionAmount
    });

  } catch (error) {
    console.error("Erro Backend (Payment):", error);
    return res.status(500).json({ 
        error: 'Erro no processamento', 
        message: error.message || "Erro desconhecido",
        details: error.cause 
    });
  }
}