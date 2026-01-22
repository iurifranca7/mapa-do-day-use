import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// 1. INICIALIZAÇÃO FIREBASE (Usando suas variáveis)
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
            throw new Error("Credenciais do Firebase incompletas.");
        }
    } catch (e) { throw new Error(`Credentials Error: ${e.message}`); }

    return admin.firestore();
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = initFirebase();
    const { token, payment_method_id, installments, payer, bookingDetails, reservationId } = req.body;

    if (!bookingDetails?.dayuseId) throw new Error("ID do Day Use não fornecido.");

    const dayUseRef = db.collection('dayuses').doc(bookingDetails.dayuseId);
    const dayUseSnap = await dayUseRef.get();
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    // --- LÓGICA DE TOKEN DE TESTE ---
    // Se existir a variável MP_ACCESS_TOKEN_TEST, usamos ela (Sandbox do Admin)
    // Caso contrário, usamos o token do parceiro cadastrado no banco
    const partnerAccessToken = process.env.MP_ACCESS_TOKEN_TEST || (ownerSnap.exists ? ownerSnap.data().mp_access_token : null);

    if (!partnerAccessToken) throw new Error("Token MP ausente (Teste ou Produção).");

    // ==================================================================
    // GUARDIÃO DO ESTOQUE
    // ==================================================================
    const bookingDate = bookingDetails.date;
    const limit = Number(item.limit || 50); 
    
    const reservationsSnapshot = await db.collection('reservations')
        .where('dayuseId', '==', item.id) 
        .where('date', '==', bookingDate)
        .where('status', 'in', ['confirmed', 'validated']) 
        .get();

    let currentOccupancy = 0;
    reservationsSnapshot.forEach(doc => {
        const d = doc.data();
        currentOccupancy += (Number(d.adults) + Number(d.children)); 
    });

    const newGuests = Number(bookingDetails.adults) + Number(bookingDetails.children);

    if ((currentOccupancy + newGuests) > limit) {
        return res.status(409).json({ error: 'Sold Out', message: 'Vagas esgotadas.' });
    }

    // ==================================================================
    // CÁLCULOS
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

    let refDate = item.firstActivationDate ? (item.firstActivationDate.toDate ? item.firstActivationDate.toDate() : new Date(item.firstActivationDate)) : (item.createdAt ? (item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt)) : new Date());
    const diffDays = Math.ceil(Math.abs(new Date() - refDate) / (1000 * 60 * 60 * 24)); 
    const PLATFORM_RATE = diffDays <= 30 ? 0.10 : 0.12;

    const isPix = payment_method_id === 'pix';
    const mpFeeCost = transactionAmount * (isPix ? 0.0099 : 0.0398);
    const platformGrossRevenue = calculatedGrossTotal * PLATFORM_RATE;
    let commission = platformGrossRevenue - mpFeeCost;
    if (commission < 0) commission = 0;
    commission = Math.round(commission * 100) / 100;

    // ==================================================================
    // PROCESSAMENTO
    // ==================================================================
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);
    
    // --- USA VITE_BASE_URL PARA O WEBHOOK ---
    const baseUrl = process.env.VITE_BASE_URL || 'https://mapadodayuse.com';

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
        return res.status(402).json({ error: 'Pagamento recusado', message: 'Recusado pelo banco.' });
    }

    return res.status(200).json({
      id: result.id.toString(),
      status: result.status,
      point_of_interaction: result.point_of_interaction,
      charged_amount: transactionAmount
    });

  } catch (error) {
    console.error("Erro Backend:", error);
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

// Helper para mensagens amigáveis de erro
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