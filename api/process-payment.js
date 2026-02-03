import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE (Mantida original)
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
    const { token, payment_method_id, issuer_id, installments, payer, bookingDetails, reservationId } = req.body;

    // 🕵️ LOGS DE DIAGNÓSTICO (Adicionados para monitoramento)
    console.log("📦 [API] Iniciando processamento...");
    console.log(`📅 Data: ${bookingDetails?.date}`);
    console.log(`🛒 Itens no Carrinho: ${bookingDetails?.cartItems?.length || 0}`);

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
    // 🛑 GUARDIÃO DO ESTOQUE (Mantido Lógica Original)
    // Nota: Assume que 'bookingDetails.adults' ainda é enviado pelo front como somatória
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
    // 💰 CÁLCULOS FINANCEIROS (AJUSTADO PARA NOVOS PRODUTOS)
    // ==================================================================
    
    // Validação de Segurança: Carrinho Obrigatório
    if (!bookingDetails.cartItems || bookingDetails.cartItems.length === 0) {
        throw new Error("Carrinho vazio ou formato inválido.");
    }

    // 1. Busca TODOS os produtos deste DayUse no banco para validar preços reais
    const productsRef = db.collection('products').where('dayuseId', '==', targetId);
    const productsSnap = await productsRef.get();
    
    // Cria Mapa para busca rápida: ID -> Dados do Banco
    const dbProductsMap = {};
    productsSnap.forEach(doc => {
        dbProductsMap[doc.id] = { ...doc.data(), id: doc.id };
    });

    let calculatedGrossTotal = 0;
    const mpItemsList = []; // Lista detalhada para o Mercado Pago

    // 2. Loop sobre os itens enviados pelo Frontend
    for (const cartItem of bookingDetails.cartItems) {
        const qty = Number(cartItem.quantity);
        if (qty <= 0) continue;

        // Busca o produto REAL no banco usando o ID enviado
        const realProduct = dbProductsMap[cartItem.id];

        // Se não existir no banco, é um erro de segurança ou produto deletado
        if (!realProduct) {
             console.error(`❌ Produto não encontrado no banco: ${cartItem.id}`);
             throw new Error(`Produto indisponível ou ID inválido: ${cartItem.title}`);
        }

        // Usa o PREÇO DO BANCO (Segurança)
        const unitPrice = Number(realProduct.price || 0);
        
        calculatedGrossTotal += (unitPrice * qty);

        // Adiciona à lista de qualidade do MP
        mpItemsList.push({
            id: cartItem.id,
            title: realProduct.title || realProduct.name || cartItem.title,
            description: `Tipo: ${realProduct.type || 'Ingresso'}`,
            picture_url: realProduct.images?.[0] || item.images?.[0] || null,
            category_id: "tickets",
            quantity: qty,
            unit_price: unitPrice
        });
    }

    // 3. Aplicação de Cupons (Lógica Original Mantida)
    let transactionAmount = calculatedGrossTotal;
    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) {
            const discount = (calculatedGrossTotal * coupon.percentage / 100);
            transactionAmount -= discount;
            console.log(`🎟️ Cupom aplicado: -R$ ${discount}`);
        }
    }
    transactionAmount = Number(transactionAmount.toFixed(2));

    if (transactionAmount <= 0) throw new Error("Valor total inválido (Zero ou negativo).");

    // ==================================================================
    // CÁLCULO DE COMISSÃO (Lógica Original Mantida)
    // ==================================================================
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
    // PROCESSAMENTO MP (Atualizado com mpItemsList)
    // ==================================================================
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);
   
    const rawBaseUrl = process.env.VITE_BASE_URL || 'https://mapadodayuse.com';
    const baseUrl = rawBaseUrl.replace(/\/$/, "");

    const cleanName = item.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();

    let descriptor = `DAYUSE*${cleanName}`;
    if (descriptor.length > 22) {
        descriptor = descriptor.substring(0, 22);
    }

    const paymentBody = {
      transaction_amount: transactionAmount,
      description: `Reserva: ${item.name}`,
      payment_method_id,
      application_fee: commission,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      statement_descriptor: descriptor,
     
      external_reference: reservationId,
      binary_mode: true,
     
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
      },

      // 🔥 ATUALIZADO: Enviando lista detalhada de itens para o MP
      additional_info: {
          items: mpItemsList,
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      }
    };

    if (!isPix) {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
      if (issuer_id) {
          paymentBody.issuer_id = Number(issuer_id);
      }
    }

    console.log(`🚀 Enviando para MP: R$ ${transactionAmount}`);

    const result = await payment.create({ body: paymentBody });

    if (reservationId) {
        await db.collection('reservations').doc(reservationId).update({
            paymentId: result.id.toString(),
            paymentMethod: payment_method_id,
            status: result.status === 'approved' ? 'confirmed' : 'pending',
            mpStatus: result.status,
            updatedAt: new Date(),
            // Salva snapshot financeiro para auditoria futura
            financialSnapshot: {
                items: mpItemsList,
                total: transactionAmount,
                commission: commission
            }
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
    // Tenta pegar erro detalhado do MP
    const mpMsg = error.cause?.[0]?.description || error.message;
    return res.status(500).json({
        error: 'Erro interno',
        message: mpMsg,
        details: error.cause
    });
  }
}