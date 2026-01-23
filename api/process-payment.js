import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE (Sua versão que funciona)
// ==================================================================
const initFirebase = () => {
    if (!admin || !admin.apps) throw new Error("Erro init Firebase");
    if (admin.apps.length > 0) return admin.firestore();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    try {
        if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); 
            const credential = admin.credential.cert({ projectId, clientEmail, privateKey });
            admin.initializeApp({ credential });
        } else {
            throw new Error("Credenciais do Firebase incompletas nas Variáveis de Ambiente.");
        }
    } catch (e) { throw new Error(`Credentials Error: ${e.message}`); }

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
    // 🌟 ADICIONEI 'issuer_id' AQUI (Necessário para qualidade alta)
    const { token, payment_method_id, issuer_id, installments, payer, bookingDetails, reservationId } = req.body;

    // --- Robustez na busca do ID ---
    const targetId = bookingDetails?.dayuseId || bookingDetails?.item?.id;

    if (!targetId) {
        console.error("❌ Payload sem ID:", JSON.stringify(bookingDetails));
        throw new Error("ID do Day Use não fornecido.");
    }

    // 1. Busca Day Use
    const dayUseRef = db.collection('dayuses').doc(targetId);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    // 2. Busca Token do Parceiro
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    const partnerAccessToken = process.env.MP_ACCESS_TOKEN_TEST || (ownerSnap.exists ? ownerSnap.data().mp_access_token : null);

    if (!partnerAccessToken) throw new Error("Token MP ausente (Teste ou Produção).");

    // ==================================================================
    // 🛑 GUARDIÃO DO ESTOQUE
    // ==================================================================
    const bookingDate = bookingDetails.date;
    
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
    
    const reservationsSnapshot = await db.collection('reservations')
        .where('item.id', '==', targetId) 
        .where('date', '==', bookingDate)
        .where('status', 'in', ['confirmed', 'validated', 'approved', 'paid']) 
        .get()
        .catch(() => ({ empty: true, forEach: () => {} })); 

    let currentOccupancy = 0;
    if (!reservationsSnapshot.empty) {
        reservationsSnapshot.forEach(doc => {
            const d = doc.data();
            currentOccupancy += (Number(d.adults || 0) + Number(d.children || 0)); 
        });
    }

    const newGuests = Number(bookingDetails.adults || 0) + Number(bookingDetails.children || 0);

    if ((currentOccupancy + newGuests) > limit) {
        console.warn(`⛔ Bloqueio de Overbooking: Tentou ${newGuests}, Restam ${limit - currentOccupancy}`);
        return res.status(409).json({ error: 'Sold Out', message: 'Vagas esgotadas.' });
    }

    // ==================================================================
    // CÁLCULOS FINANCEIROS
    // ==================================================================
    let priceAdult = Number(item.priceAdult);
    let priceChild = Number(item.priceChild || 0);
    let pricePet = Number(item.petFee || 0);

    const dateParts = bookingDetails.date.split('-'); 
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12); 
    const dayOfWeek = dateObj.getDay();

    if (item.weeklyPrices && item.weeklyPrices[dayOfWeek]) {
        const dayConfig = item.weeklyPrices[dayOfWeek];
        if (typeof dayConfig === 'object') {
            if (dayConfig.adult) priceAdult = Number(dayConfig.adult);
            if (dayConfig.child) priceChild = Number(dayConfig.child);
            if (dayConfig.pet) pricePet = Number(dayConfig.pet);
        } else if (!isNaN(dayConfig)) priceAdult = Number(dayConfig);
    }

    let calculatedGrossTotal = 
        (Number(bookingDetails.adults) * priceAdult) + 
        (Number(bookingDetails.children) * priceChild) + 
        (Number(bookingDetails.pets) * pricePet);

    if (bookingDetails.selectedSpecial && item.specialTickets) {
        Object.entries(bookingDetails.selectedSpecial).forEach(([idx, qtd]) => {
            const ticket = item.specialTickets[idx];
            if (ticket && qtd > 0) calculatedGrossTotal += (Number(ticket.price) * Number(qtd));
        });
    }

    let transactionAmount = calculatedGrossTotal;
    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) transactionAmount -= (calculatedGrossTotal * coupon.percentage / 100);
    }
    transactionAmount = Number(transactionAmount.toFixed(2));

    let refDate = new Date();
    if (item.firstActivationDate) {
         const d = item.firstActivationDate.toDate ? item.firstActivationDate.toDate() : new Date(item.firstActivationDate);
         if (!isNaN(d)) refDate = d;
    } else if (item.createdAt) {
         const d = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
         if (!isNaN(d)) refDate = d;
    }
    
    const diffDays = Math.ceil(Math.abs(new Date() - refDate) / (1000 * 60 * 60 * 24)); 
    const PLATFORM_RATE = diffDays <= 30 ? 0.10 : 0.12;

    const isPix = payment_method_id === 'pix';
    const mpFeeCost = transactionAmount * (isPix ? 0.0099 : 0.0398);
    const platformGrossRevenue = calculatedGrossTotal * PLATFORM_RATE;
    let commission = platformGrossRevenue - mpFeeCost;
    if (commission < 0) commission = 0;
    commission = Math.round(commission * 100) / 100;

    // ==================================================================
    // PROCESSAMENTO MP (COM MELHORIAS DE QUALIDADE)
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
      
      // 🌟 [QUALIDADE MP] CAMPOS ADICIONAIS OBRIGATÓRIOS
      external_reference: reservationId, // Liga a venda ao seu banco de dados
      statement_descriptor: "MAPADODAYUSE", // Nome que aparece na fatura (Max 22 chars)
      binary_mode: true, // Força resposta imediata (Aprovado/Recusado) sem ficar "Em análise"
      
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
      
      // 🌟 [QUALIDADE MP] Envia o ID do Banco Emissor se disponível
      if (issuer_id) {
          paymentBody.issuer_id = Number(issuer_id);
      }
    }

    console.log("🚀 Enviando para MP:", transactionAmount);

    const result = await payment.create({ body: paymentBody });

    if (reservationId) {
        await db.collection('reservations').doc(reservationId).update({
            paymentId: result.id.toString(),
            paymentMethod: payment_method_id,
            status: result.status === 'approved' ? 'confirmed' : 'pending',
            mpStatus: result.status,
            updatedAt: new Date()
        });
    }

    const statusValidos = ['approved', 'in_process', 'pending'];
    if (!statusValidos.includes(result.status)) {
        return res.status(402).json({ 
            error: 'Pagamento recusado', 
            message: result.status_detail || 'Recusado pelo banco.' 
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
    return res.status(500).json({ 
        error: 'Erro interno', 
        message: error.message,
        details: error.cause 
    });
  }
}