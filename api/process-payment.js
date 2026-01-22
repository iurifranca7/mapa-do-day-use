import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// 1. INICIALIZAÇÃO FIREBASE (Mesma versão robusta dos outros arquivos)
const initFirebase = () => {
    if (!admin || !admin.apps) throw new Error("Erro init Firebase");
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
        admin.initializeApp({ credential });
    } catch (e) {
        if (!e.message.includes('already exists')) throw e;
    }
    return admin.firestore();
};

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = initFirebase();
    const { token, payment_method_id, installments, payer, bookingDetails, reservationId } = req.body;

    // --- 1. VALIDAÇÃO DE DADOS ---
    if (!bookingDetails?.item?.id) throw new Error("ID do Day Use não fornecido.");
    
    // Busca Dados do Banco (para garantir integridade)
    const dayUseRef = db.collection('dayuses').doc(bookingDetails.item.id);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    // ==================================================================
    // 🛑 2. GUARDIÃO DO ESTOQUE (CHECK FINAL NO SERVIDOR)
    // ==================================================================
    
    // A. Define o Limite (Lógica do Mapa corrigida)
    let limit = 50;
    if (item.dailyStock) {
        if (typeof item.dailyStock === 'object' && item.dailyStock.adults) {
            limit = Number(item.dailyStock.adults);
        } else if (typeof item.dailyStock === 'string' || typeof item.dailyStock === 'number') {
            limit = Number(item.dailyStock);
        }
    } else if (item.limit) {
        limit = Number(item.limit);
    }

    // B. Conta Ocupação Atual
    // Atenção: Aqui usamos o campo 'item.id' aninhado, igual corrigimos no Front
    const reservationsSnapshot = await db.collection('reservations')
        .where('item.id', '==', item.id) 
        .where('date', '==', bookingDetails.date)
        .where('status', 'in', ['confirmed', 'validated', 'approved', 'paid']) 
        .get();

    let currentOccupancy = 0;
    reservationsSnapshot.forEach(doc => {
        const d = doc.data();
        currentOccupancy += (Number(d.adults || 0) + Number(d.children || 0)); 
    });

    const newGuests = Number(bookingDetails.adults || 0) + Number(bookingDetails.children || 0);

    // C. O Veredito
    if ((currentOccupancy + newGuests) > limit) {
        console.warn(`⛔ Bloqueio de Overbooking: Tentou comprar ${newGuests}, mas só restam ${limit - currentOccupancy}`);
        
        // Retorna erro 409 (Conflict) para o Frontend avisar o usuário
        return res.status(409).json({ 
            error: 'Sold Out', 
            message: 'Infelizmente as últimas vagas acabaram de ser vendidas.' 
        });
    }

    // ==================================================================
    // 3. PREPARAÇÃO DO PAGAMENTO (Se passou no guardião)
    // ==================================================================
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    const partnerAccessToken = process.env.MP_ACCESS_TOKEN_TEST || process.env.VITE_MP_ACCESS_TOKEN_TEST || (ownerSnap.exists ? ownerSnap.data().mp_access_token : null);

    if (!partnerAccessToken) throw new Error("Token MP não configurado.");

    // Recálculo de Valores (Segurança)
    // Em produção, você deve recalcular o 'transactionAmount' usando os preços do 'item' do banco,
    // e não confiar apenas no que vem do frontend. Aqui mantemos simples para o teste.
    const transactionAmount = Number(Number(bookingDetails.total).toFixed(2));
    
    // Comissão (Simplificado)
    const isPix = payment_method_id === 'pix';
    const mpFeeCost = transactionAmount * (isPix ? 0.0099 : 0.0398);
    const platformGrossRevenue = (transactionAmount * 0.10); 
    let commission = Math.round((platformGrossRevenue - mpFeeCost) * 100) / 100;
    if (commission < 0) commission = 0;

    // ==================================================================
    // 4. ENVIO PARA O MERCADO PAGO
    // ==================================================================
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);
    
    const rawBaseUrl = process.env.VITE_BASE_URL || 'https://mapadodayuse.com';
    const baseUrl = rawBaseUrl.replace(/\/$/, ""); 

    const paymentBody = {
      transaction_amount: transactionAmount,
      description: `Reserva: ${item.name}`,
      payment_method_id,
      application_fee: commission,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
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

    const result = await payment.create({ body: paymentBody });

    // Atualiza a reserva com o ID do pagamento
    if (reservationId) {
        await db.collection('reservations').doc(reservationId).update({
            paymentId: result.id.toString(),
            paymentMethod: payment_method_id,
            status: result.status === 'approved' ? 'confirmed' : 'pending',
            mpStatus: result.status,
            updatedAt: new Date()
        });
    }

    return res.status(200).json({
      id: result.id.toString(),
      status: result.status,
      point_of_interaction: result.point_of_interaction,
      charged_amount: transactionAmount
    });

  } catch (error) {
    console.error("❌ Erro Backend:", error);
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}