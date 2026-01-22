import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE (Versão Vercel/Env)
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
            // Tenta fallback para variáveis locais se estiver rodando localmente sem Vercel Env
            // Mas na Vercel vai cair no erro se não estiver configurado
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
    const { token, payment_method_id, installments, payer, bookingDetails, reservationId } = req.body;

    if (!bookingDetails?.dayuseId) throw new Error("ID do Day Use não fornecido.");

    // 1. Busca Day Use
    const dayUseRef = db.collection('dayuses').doc(bookingDetails.dayuseId);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    // 2. Busca Token do Parceiro
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    // Prioriza Token de Teste do ENV, senão usa do parceiro
    const partnerAccessToken = process.env.MP_ACCESS_TOKEN_TEST || (ownerSnap.exists ? ownerSnap.data().mp_access_token : null);

    if (!partnerAccessToken) throw new Error("Token MP ausente (Teste ou Produção).");

    // ==================================================================
    // 🛑 GUARDIÃO DO ESTOQUE (CORRIGIDO)
    // ==================================================================
   const bookingDate = bookingDetails.date; // Data: "2024-02-20"
    
    // 1. Pega a Capacidade Máxima (dailyStock)
    // Se não tiver dailyStock, usa limit, se não tiver, assume 50
    const maxCapacity = Number(item.dailyStock || item.limit || 50); 
    
    // 2. Busca TODAS as reservas confirmadas para ESSE DIA
    const reservationsSnapshot = await db.collection('reservations')
        .where('dayuseId', '==', bookingDetails.dayuseId) 
        .where('date', '==', bookingDate)
        .where('status', 'in', ['confirmed', 'validated']) // Apenas quem já pagou conta espaço
        .get();

    // 3. Soma quantas pessoas já ocuparam lugar
    let currentOccupancy = 0;
    reservationsSnapshot.forEach(doc => {
        const d = doc.data();
        // Soma Adultos + Crianças (assumindo que crianças contam na lotação)
        currentOccupancy += (Number(d.adults || 0) + Number(d.children || 0)); 
    });

    // 4. Quantos querem entrar agora?
    const newGuests = Number(bookingDetails.adults || 0) + Number(bookingDetails.children || 0);

    console.log(`📊 Estoque Dia ${bookingDate}: Ocupado ${currentOccupancy} + Novo ${newGuests} / Máx ${maxCapacity}`);

    // 5. Verifica se cabe
    if ((currentOccupancy + newGuests) > maxCapacity) {
        return res.status(409).json({ 
            error: 'Sold Out', 
            message: `Ops! Restam apenas ${maxCapacity - currentOccupancy} vagas para esta data.` 
        });
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

    // Define Taxa (Promo vs Padrão)
    // Tenta pegar data de ativação, criação ou hoje
    let refDate = new Date();
    if (item.firstActivationDate) {
        refDate = item.firstActivationDate.toDate ? item.firstActivationDate.toDate() : new Date(item.firstActivationDate);
    } else if (item.createdAt) {
        refDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
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
    // PROCESSAMENTO MP
    // ==================================================================
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);
    
    // IMPORTANTE: Garantir que a URL Base não tenha barra no final
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

    console.log("🚀 Enviando para MP:", JSON.stringify({amount: transactionAmount, fee: commission, webhook: paymentBody.notification_url}));

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
    // Retorna o erro detalhado para facilitar o debug no console do navegador
    return res.status(500).json({ 
        error: 'Erro interno', 
        message: error.message,
        details: error.cause 
    });
  }
}