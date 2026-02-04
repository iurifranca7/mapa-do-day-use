import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE 
// ==================================================================
const initFirebase = () => {
    console.log("🔥 [1] Init Firebase...");
    if (admin.apps.length > 0) {
        console.log("✅ [1] Firebase já estava inicializado.");
        return admin.firestore();
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    try {
        if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
            const credential = admin.credential.cert({ projectId, clientEmail, privateKey });
            admin.initializeApp({ credential });
            console.log("✅ [1] Firebase Iniciado Agora.");
        } else {
            console.error("❌ Credenciais de ambiente ausentes.");
            throw new Error("Credenciais do Firebase incompletas.");
        }
    } catch (e) { 
        console.error("❌ Erro no Init Firebase:", e);
        throw new Error(`Credentials Error: ${e.message}`); 
    }

    return admin.firestore();
};

export default async function handler(req, res) {
  console.log("🚀 [2] API PROCESS-PAYMENT CHAMADA");

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = initFirebase();
    const { token, payment_method_id, issuer_id, installments, payer, bookingDetails, reservationId } = req.body;

    console.log("📦 [3] Payload Recebido:", {
        dayuseId: bookingDetails?.dayuseId,
        temCartItems: !!bookingDetails?.cartItems,
        qtdItens: bookingDetails?.cartItems?.length || 0
    });

    const targetId = bookingDetails?.dayuseId || bookingDetails?.item?.id;

    if (!targetId) {
        console.error("❌ Payload sem ID do Day Use");
        throw new Error("ID do Day Use não fornecido.");
    }

    // ==================================================================
    // 2. BUSCAS NO BANCO DE DADOS
    // ==================================================================
    const dayUseRef = db.collection('dayuses').doc(targetId);
    const dayUseSnap = await dayUseRef.get();
   
    if (!dayUseSnap.exists) {
        console.error("❌ Day Use não encontrado:", targetId);
        throw new Error("Day Use não encontrado.");
    }
    const item = dayUseSnap.data();
    console.log("✅ [4] DayUse encontrado:", item.name);

    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
   
    // Prioriza token de teste do ambiente (dev), senão usa do banco (prod)
    const partnerAccessToken = process.env.MP_ACCESS_TOKEN_TEST || (ownerSnap.exists ? ownerSnap.data().mp_access_token : null);

    if (!partnerAccessToken) {
        console.error(`❌ Parceiro ${item.ownerId} sem token.`);
        throw new Error("Estabelecimento não configurou o recebimento de pagamentos.");
    }

    // ==================================================================
    // 🛑 GUARDIÃO DO ESTOQUE (Mantido Intacto)
    // ==================================================================
    const bookingDate = bookingDetails.date;
    let limit = 50;
    if (item.dailyStock) {
        if (typeof item.dailyStock === 'object' && item.dailyStock.adults) limit = Number(item.dailyStock.adults);
        else if (typeof item.dailyStock === 'number' || typeof item.dailyStock === 'string') limit = Number(item.dailyStock);
    } else if (item.limit) limit = Number(item.limit);
   
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
        console.warn(`⛔ Overbooking: Tentou ${newGuests}, Restam ${limit - currentOccupancy}`);
        return res.status(409).json({ error: 'Sold Out', message: 'Vagas esgotadas.' });
    }

    // ==================================================================
    // 💰 CÁLCULOS FINANCEIROS (NOVA LÓGICA DE SPLIT E CUPONS)
    // ==================================================================
    console.log("💰 [5] Iniciando Cálculo Financeiro...");
    
    let calculatedGrossTotal = 0; // Valor BRUTO antes de qualquer desconto
    const mpItemsList = []; // Lista detalhada para salvar no banco (audit)

    // A) Validação de Preço (Carrinho vs Banco)
    if (bookingDetails.cartItems && bookingDetails.cartItems.length > 0) {
        console.log("🛒 [5.1] Usando Validação de Carrinho");
        const productsRef = db.collection('products').where('dayUseId', '==', targetId);
        const productsSnap = await productsRef.get();
        
        const dbProductsMap = {};
        productsSnap.forEach(doc => { dbProductsMap[doc.id] = { ...doc.data(), id: doc.id }; });

        for (const cartItem of bookingDetails.cartItems) {
            const qty = Number(cartItem.quantity);
            if (qty <= 0) continue;
            const realProduct = dbProductsMap[cartItem.id];
            
            if (!realProduct) {
                 console.error(`❌ Produto não encontrado: ${cartItem.id}`);
                 continue; 
            }
            const unitPrice = Number(realProduct.price || 0);
            calculatedGrossTotal += (unitPrice * qty);
            
            // Adiciona para auditoria
            mpItemsList.push({
                id: cartItem.id,
                title: realProduct.title,
                quantity: qty,
                unit_price: unitPrice
            });
        }
    } else {
        // Fallback Legado
        console.log("⚠️ [5.1] Usando Lógica Legada");
        // ... (Lógica de dias da semana simplificada para brevidade, mantendo compatibilidade)
        let priceAdult = Number(item.priceAdult || 0);
        let priceChild = Number(item.priceChild || 0);
        calculatedGrossTotal = (Number(bookingDetails.adults || 0) * priceAdult) + (Number(bookingDetails.children || 0) * priceChild);
        
        mpItemsList.push({ id: 'legacy', title: 'Day Use Legacy', quantity: 1, unit_price: calculatedGrossTotal });
    }

    // B) Definição da Taxa Base da Plataforma
    // Se promoRate for true (ativado no admin), usa 10%. Padrão 12%.
    const PLATFORM_PERCENTAGE = item.promoRate === true ? 0.10 : 0.12;
    console.log(`📊 Taxa Base Aplicada: ${(PLATFORM_PERCENTAGE * 100)}%`);

    // C) Cupons e Subsídios
    let transactionAmount = calculatedGrossTotal;
    let platformSubsidy = 0; // Quanto a plataforma paga do desconto

    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) {
            const discountValue = (calculatedGrossTotal * coupon.percentage / 100);
            transactionAmount -= discountValue;
            
            // Se cupom for de ADMIN, plataforma subsidia (abate da comissão)
            if (coupon.createdBy === 'admin') {
                platformSubsidy = discountValue;
                console.log(`🎁 Cupom ADMIN: -R$ ${discountValue.toFixed(2)} (Subsidiado)`);
            } else {
                console.log(`🎟️ Cupom PARCEIRO: -R$ ${discountValue.toFixed(2)}`);
            }
        }
    }
    
    // Arredondamento e Validação Final do Valor a Pagar
    transactionAmount = Number(transactionAmount.toFixed(2));
    console.log(`💵 [6] Valor Final a Pagar: R$ ${transactionAmount}`);

    if (transactionAmount <= 0) throw new Error("Valor total inválido (Zero ou negativo).");

    // D) Cálculo do Split (Engenharia Reversa)
    
    // 1. Taxa MP (Estimada) sobre o valor PAGO (Transacionado)
    const mpRate = payment_method_id === 'pix' ? 0.0099 : 0.0398;
    const mpFeeCost = transactionAmount * mpRate;

    // 2. Comissão Bruta da Plataforma (Sobre o valor BRUTO dos produtos)
    const rawPlatformCommission = calculatedGrossTotal * PLATFORM_PERCENTAGE;

    // 3. Comissão Líquida (Application Fee)
    // (Comissão Bruta) - (Subsídio Cupom) - (Custo MP Absorvido)
    let finalApplicationFee = rawPlatformCommission - platformSubsidy - mpFeeCost;

    // Proteção contra valores negativos
    if (finalApplicationFee < 0) finalApplicationFee = 0;
    
    finalApplicationFee = Math.round(finalApplicationFee * 100) / 100;

    console.log("🧮 SPLIT FINAL:", {
        Bruto: calculatedGrossTotal,
        Pago: transactionAmount,
        TaxaPlataforma: rawPlatformCommission.toFixed(2),
        CustoMP: mpFeeCost.toFixed(2),
        Subsidio: platformSubsidy.toFixed(2),
        FeeFinal: finalApplicationFee
    });

    // ==================================================================
    // PROCESSAMENTO MERCADO PAGO
    // ==================================================================
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);
    const rawBaseUrl = process.env.VITE_BASE_URL || 'https://mapadodayuse.com';
    const baseUrl = rawBaseUrl.replace(/\/$/, "");

    const cleanName = (item.name || "DayUse").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 15);
    const descriptor = `DU*${cleanName}`;

    const paymentBody = {
      transaction_amount: transactionAmount,
      description: `Reserva: ${item.name}`,
      payment_method_id,
      
      // 🔥 AQUI ESTÁ A LÓGICA CONDICIONAL
      // Se for teste de ambiente, manda null. Se for produção, manda o split calculado.
      application_fee: process.env.MP_ACCESS_TOKEN_TEST ? null : finalApplicationFee,
      
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
      // Envio como PACOTE ÚNICO para evitar erros de validação do MP
      additional_info: {
          items: [
              {
                  id: item.id,
                  title: `Reserva Day Use: ${item.name}`,
                  description: "Pacote de reserva (Validado pelo servidor)",
                  quantity: 1,
                  unit_price: transactionAmount 
              }
          ],
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      }
    };

    if (payment_method_id !== 'pix') {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
      if (issuer_id) paymentBody.issuer_id = Number(issuer_id);
    }

    console.log("🚀 [7] Enviando para o Mercado Pago...");
    const result = await payment.create({ body: paymentBody });
    console.log("✅ [8] Resposta MP:", result.status, "| ID:", result.id);

    // ==================================================================
    // 6. ATUALIZAÇÃO E RESPOSTA
    // ==================================================================
    if (reservationId) {
        await db.collection('reservations').doc(reservationId).update({
            paymentId: result.id.toString(),
            paymentMethod: payment_method_id,
            status: result.status === 'approved' ? 'confirmed' : 'pending',
            mpStatus: result.status,
            updatedAt: new Date(),
            financialSnapshot: {
                grossTotal: calculatedGrossTotal,
                paidTotal: transactionAmount,
                platformFee: finalApplicationFee,
                mpFeeEstimated: mpFeeCost,
                platformSubsidy: platformSubsidy,
                items: mpItemsList // Salva a lista detalhada no banco para seu histórico
            }
        });
    }

    return res.status(200).json({
      id: result.id.toString(),
      status: result.status,
      point_of_interaction: result.point_of_interaction,
      charged_amount: transactionAmount
    });

  } catch (error) {
    console.error("❌ [ERRO FATAL API]:", error);
    if (error.cause) console.error("Detalhes MP:", JSON.stringify(error.cause, null, 2));

    return res.status(500).json({ 
        error: 'Erro interno', 
        message: error.message,
        details: error.cause 
    });
  }
}