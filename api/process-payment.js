import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO DO FIREBASE
// ==================================================================
const initFirebase = () => {
    if (!admin || !admin.apps) {
        throw new Error("Biblioteca Firebase Admin não foi carregada corretamente.");
    }

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
            const serviceAccount = JSON.parse(buffer.toString('utf-8'));
            credential = admin.credential.cert(serviceAccount);
        } else if (serviceAccountJSON) {
            const serviceAccount = JSON.parse(serviceAccountJSON);
            credential = admin.credential.cert(serviceAccount);
        } else if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); 
            credential = admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            });
        }
    } catch (parseError) {
        throw new Error(`Falha ao ler credenciais do Firebase: ${parseError.message}`);
    }

    if (!credential) {
        throw new Error("Nenhuma credencial do Firebase encontrada nas Variáveis de Ambiente.");
    }

    try {
        admin.initializeApp({ credential });
    } catch (e) {
        if (!e.message.includes('already exists')) {
             throw e;
        }
    }

    return admin.firestore();
};

// ==================================================================
// 2. FUNÇÃO PRINCIPAL (HANDLER)
// ==================================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = initFirebase();
    const { token, payment_method_id, installments, payer, bookingDetails } = req.body;

    // --- A. VALIDAÇÕES ---
    if (!bookingDetails?.dayuseId) throw new Error("ID do Day Use não fornecido.");

    const dayUseRef = db.collection('dayuses').doc(bookingDetails.dayuseId);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    if (!ownerSnap.exists || !ownerSnap.data().mp_access_token) {
        throw new Error("O estabelecimento não configurou o recebimento de pagamentos.");
    }
    
    const partnerAccessToken = ownerSnap.data().mp_access_token;

    // --- B. CÁLCULO DO PREÇO BRUTO (Sem descontos) ---
    const dateParts = bookingDetails.date.split('-'); 
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0); 
    const dayOfWeek = dateObj.getDay();

    let priceAdult = Number(item.priceAdult);
    let priceChild = Number(item.priceChild || 0);
    let pricePet = Number(item.petFee || 0);

    // Ajuste por dia da semana
    if (item.weeklyPrices && item.weeklyPrices[dayOfWeek]) {
        const dayConfig = item.weeklyPrices[dayOfWeek];
        if (typeof dayConfig === 'object') {
            if (dayConfig.adult) priceAdult = Number(dayConfig.adult);
            if (dayConfig.child) priceChild = Number(dayConfig.child);
            if (dayConfig.pet) pricePet = Number(dayConfig.pet);
        } else if (!isNaN(dayConfig)) priceAdult = Number(dayConfig);
    }

    // 1. Valor BRUTO Total (Soma dos itens)
    let calculatedGrossTotal = 
        (Number(bookingDetails.adults) * priceAdult) + 
        (Number(bookingDetails.children) * priceChild) + 
        (Number(bookingDetails.pets) * pricePet);

    // Ingressos especiais
    if (bookingDetails.selectedSpecial && item.specialTickets) {
        Object.entries(bookingDetails.selectedSpecial).forEach(([idx, qtd]) => {
            const ticket = item.specialTickets[idx];
            if (ticket && qtd > 0) calculatedGrossTotal += (Number(ticket.price) * Number(qtd));
        });
    }

    if (calculatedGrossTotal <= 0) throw new Error("Valor total inválido.");

    // 2. Aplicação do Cupom (Define quanto o cliente PAGA)
    let transactionAmount = calculatedGrossTotal; // Começa igual
    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) {
            // Desconto é aplicado sobre o valor que o cliente vai pagar
            transactionAmount -= (calculatedGrossTotal * coupon.percentage / 100);
        }
    }
    
    // Arredonda valor final a cobrar
    transactionAmount = Number(transactionAmount.toFixed(2));

    // ==================================================================
    // C. LÓGICA DE DATA (PROMOÇÃO 30 DIAS)
    // ==================================================================
    let refDate = null;

    if (item.firstActivationDate) {
        refDate = item.firstActivationDate.toDate ? item.firstActivationDate.toDate() : new Date(item.firstActivationDate);
    } else if (item.createdAt) {
        refDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
    } else {
        refDate = new Date();
    }

    const today = new Date();
    const diffTime = Math.abs(today - refDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    // Definição da Taxa da Plataforma (10% ou 12%)
    let PLATFORM_RATE = 0.12; // 12% Padrão
    if (diffDays <= 30) {
        PLATFORM_RATE = 0.10; // 10% Promo
    }

    // ==================================================================
    // D. LÓGICA FINANCEIRA (TAXA SOBRE BRUTO)
    // ==================================================================
    const TAXA_PIX = 0.0099; // 0.99%
    const TAXA_CARTAO = 0.0398; // 3.98%

    const isPix = payment_method_id === 'pix';
    const currentMpFeeRate = isPix ? TAXA_PIX : TAXA_CARTAO;

    // 1. Quanto a Plataforma quer ganhar? (Taxa % sobre o BRUTO)
    const platformGrossRevenue = calculatedGrossTotal * PLATFORM_RATE;

    // 2. Quanto o Mercado Pago vai cobrar? (Taxa % sobre o que o cliente PAGOU)
    const mpFeeCost = transactionAmount * currentMpFeeRate;

    // 3. Cálculo do Split (Application Fee)
    // A plataforma recebe sua parte bruta, mas "paga" o custo do MP de dentro dela
    // para garantir que o parceiro não pague o MP duas vezes (já está incluso nos 10%/12%).
    let commission = platformGrossRevenue - mpFeeCost;

    // Segurança matemática
    if (commission < 0) commission = 0;
    commission = Math.round(commission * 100) / 100;

    // ==================================================================
    // E. PROCESSAMENTO MP
    // ==================================================================
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);

    const paymentBody = {
      transaction_amount: transactionAmount, // Cliente paga o valor com desconto
      description: `Reserva: ${item.name}`,
      payment_method_id,
      application_fee: commission, // Sua comissão ajustada
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
      }
    };

    if (!isPix) {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
    }

    console.log(`💳 Processando. Bruto: R$${calculatedGrossTotal}. Pago: R$${transactionAmount}`);
    console.log(`📊 Taxa: ${(PLATFORM_RATE*100).toFixed(0)}%. Meta App: R$${platformGrossRevenue.toFixed(2)}. Custo MP: R$${mpFeeCost.toFixed(2)}. App Fee Final: R$${commission.toFixed(2)}`);
    
    const result = await payment.create({ body: paymentBody });

    // ==================================================================
    // F. VALIDAÇÃO DE STATUS
    // ==================================================================
    const statusValidos = ['approved', 'in_process', 'pending'];

    if (!statusValidos.includes(result.status)) {
        console.warn(`❌ Pagamento Recusado: ${result.status}`);
        return res.status(402).json({
            error: 'Pagamento recusado',
            status: result.status,
            detail: result.status_detail,
            message: traduzirErroMP(result.status_detail)
        });
    }

    return res.status(200).json({
      id: result.id.toString(), 
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

function traduzirErroMP(statusDetail) {
    const erros = {
        'cc_rejected_bad_filled_card_number': 'Verifique o número do cartão.',
        'cc_rejected_bad_filled_date': 'Verifique a data de validade.',
        'cc_rejected_bad_filled_other': 'Verifique os dados do titular (CPF/Nome).',
        'cc_rejected_bad_filled_security_code': 'Verifique o código de segurança (CVV).',
        'cc_rejected_blacklist': 'Cartão recusado. Tente outro cartão.',
        'cc_rejected_call_for_authorize': 'Você precisa autorizar o pagamento junto ao seu banco.',
        'cc_rejected_card_disabled': 'Cartão inativo. Ligue para o seu banco.',
        'cc_rejected_duplicated_payment': 'Pagamento duplicado identificado.',
        'cc_rejected_high_risk': 'Operação recusada por segurança. Tente outro meio de pagamento.',
        'cc_rejected_insufficient_amount': 'Saldo insuficiente.',
        'cc_rejected_max_attempts': 'Muitas tentativas. Tente novamente mais tarde.',
    };
    return erros[statusDetail] || 'O pagamento foi recusado pela operadora.';
}