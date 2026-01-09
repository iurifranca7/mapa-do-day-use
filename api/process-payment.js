import { MercadoPagoConfig, Payment } from 'mercadopago';
import * as admin from 'firebase-admin';

// --- INICIALIZAÇÃO DO FIREBASE (SIMPLIFICADA) ---
if (!admin.apps.length) {
  try {
    // Tenta variáveis individuais (Mais comum de funcionar se configurado manualmente na Vercel)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
        // Corrige a chave privada (substitui \\n por \n reais)
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/"/g, '');
        
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        console.log("✅ Firebase Admin conectado.");
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        // Fallback para Base64 se existir
        const buffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
        const serviceAccount = JSON.parse(buffer.toString('utf-8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
        console.error("❌ Credenciais do Firebase não encontradas nas variáveis de ambiente.");
    }
  } catch (e) {
    console.error("❌ Erro ao iniciar Firebase:", e.message);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Se o banco não conectou, não dá para fazer split seguro
  if (!db) {
      return res.status(500).json({ 
          error: 'Erro de Configuração', 
          message: 'O servidor não conseguiu conectar ao banco de dados para buscar os dados do parceiro.' 
      });
  }

  try {
    const { token, payment_method_id, installments, payer, bookingDetails } = req.body;

    // 1. Busca Day Use
    const dayUseRef = db.collection('dayuses').doc(bookingDetails.dayuseId);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    // 2. Busca Token do Parceiro (ESSENCIAL PARA O SPLIT)
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    if (!ownerSnap.exists || !ownerSnap.data().mp_access_token) {
        throw new Error("O estabelecimento não conectou a conta do Mercado Pago para receber.");
    }
    
    // O Token que usaremos para autenticar a venda é o do PARCEIRO
    const partnerAccessToken = ownerSnap.data().mp_access_token;

    // 3. Recalcula Valor (Segurança)
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

    // 4. Configura o Pagamento com SPLIT
    // Inicializa o Mercado Pago como se fôssemos o Parceiro
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);

    // Define sua comissão (15%)
    const commission = Math.round(calculatedTotal * 0.15 * 100) / 100;

    const paymentBody = {
      transaction_amount: Number(calculatedTotal.toFixed(2)),
      description: `Reserva: ${item.name}`,
      payment_method_id,
      application_fee: commission, // AQUI ACONTECE A MÁGICA: O MP tira isso do parceiro e manda pra você
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
      }
    };

    if (payment_method_id !== 'pix') {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
    }

    console.log(`💳 Processando Split. Total: ${calculatedTotal}, Comissão: ${commission}`);
    
    const result = await payment.create({ body: paymentBody });

    return res.status(200).json({
      id: result.id,
      status: result.status,
      detail: result.status_detail,
      point_of_interaction: result.point_of_interaction,
      charged_amount: calculatedTotal
    });

  } catch (error) {
    console.error("Erro Backend:", error);
    
    let msg = error.message;
    if (JSON.stringify(error).includes("user_allowed_only_in_test")) {
        msg = "ERRO SANDBOX: Use um e-mail de comprador diferente da conta do vendedor.";
    }

    return res.status(500).json({ 
        error: 'Erro no processamento', 
        message: msg,
        details: error.cause 
    });
  }
}