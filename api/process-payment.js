import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE (SINGLETON)
// ==================================================================
const initFirebase = () => {
    if (admin.apps.length > 0) {
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
        } else {
            throw new Error("Credenciais do Firebase incompletas no ambiente.");
        }
    } catch (e) { 
        console.error("❌ Erro Crítico Firebase:", e);
        throw new Error(`Server Error: ${e.message}`); 
    }

    return admin.firestore();
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = initFirebase();
    const { token, payment_method_id, issuer_id, installments, payer, bookingDetails, reservationId } = req.body;

    // Normalizações básicas
    const normalizedCouponCode = bookingDetails?.couponCode ? bookingDetails.couponCode.toString().trim().toUpperCase() : null;

    // Regra de Negócio: Parcelamento Máximo
    if (Number(installments) > 5) {
        throw new Error("O parcelamento máximo permitido é de 5x.");
    }

    const targetId = bookingDetails?.dayuseId || bookingDetails?.item?.id;
    if (!targetId) throw new Error("ID do Day Use não fornecido.");

    // ==================================================================
    // 2. BUSCAS E VALIDAÇÃO DE CONTA (PRODUÇÃO)
    // ==================================================================
    const dayUseRef = db.collection('dayuses').doc(targetId);
    const dayUseSnap = await dayUseRef.get();
   
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();
    
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
   
    // 🔥 LÓGICA DE PRODUÇÃO ESTRITA 🔥
    // O token PRECISA vir do banco de dados do parceiro.
    // Se não existir, travamos a operação para evitar erro financeiro.
    const partnerAccessToken = ownerSnap.exists ? ownerSnap.data().mp_access_token : null;

    if (!partnerAccessToken) {
        console.error(`❌ ERRO CRÍTICO: Parceiro ${item.ownerId} não conectou o Mercado Pago.`);
        throw new Error("Este estabelecimento ainda não configurou o recebimento de pagamentos. A venda não pode ser processada.");
    }

    // ==================================================================
    // 🛑 GUARDIÃO DO ESTOQUE
    // ==================================================================
    const bookingDate = bookingDetails.date;
    let limit = 50; // Default seguro
    if (item.dailyStock) {
        if (typeof item.dailyStock === 'object' && item.dailyStock.adults) limit = Number(item.dailyStock.adults);
        else if (typeof item.dailyStock === 'number' || typeof item.dailyStock === 'string') limit = Number(item.dailyStock);
    } else if (item.limit) limit = Number(item.limit);
   
    // Verifica ocupação atual
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
        return res.status(409).json({ error: 'Sold Out', message: 'Vagas esgotadas para esta data.' });
    }

    // ==================================================================
    // 💰 CÁLCULOS FINANCEIROS
    // ==================================================================
    let calculatedGrossTotal = 0; 
    const mpItemsList = []; 

    // A) Validação de Preço (Segurança Backend)
    if (bookingDetails.cartItems && bookingDetails.cartItems.length > 0) {
        const productsRef = db.collection('products').where('dayUseId', '==', targetId);
        const productsSnap = await productsRef.get();
        const dbProductsMap = {};
        productsSnap.forEach(doc => { dbProductsMap[doc.id] = { ...doc.data(), id: doc.id }; });

        for (const cartItem of bookingDetails.cartItems) {
            const qty = Number(cartItem.quantity);
            if (qty <= 0) continue;
            
            const realProduct = dbProductsMap[cartItem.id];
            if (!realProduct) continue; 
            
            // 🔥 DECLARAÇÃO DA VARIÁVEL (O erro estava aqui: esta linha é obrigatória)
            let unitPrice = Number(realProduct.price || 0);
            
            // Lógica de Promoção: Se tiver promo, sobrescreve o valor
            if (realProduct.hasPromo && realProduct.promoPrice) {
                unitPrice = Number(realProduct.promoPrice);
            }

            calculatedGrossTotal += (unitPrice * qty);
            mpItemsList.push({ id: cartItem.id, title: realProduct.title, quantity: qty, unit_price: unitPrice });
        }
    } else {
        // Fallback Legado (apenas se não houver itens no carrinho)
        let priceAdult = Number(item.priceAdult || 0);
        let priceChild = Number(item.priceChild || 0);
        
        // Verifica se o DayUse principal tem promo no legado (raro, mas bom garantir)
        // (Opcional, mantendo lógica simples para legado)
        
        calculatedGrossTotal = (Number(bookingDetails.adults || 0) * priceAdult) + (Number(bookingDetails.children || 0) * priceChild);
        mpItemsList.push({ id: 'legacy', title: 'Day Use', quantity: 1, unit_price: calculatedGrossTotal });
    }

    // B) Definição da Taxa Base
    const PLATFORM_PERCENTAGE = item.promoRate === true ? 0.10 : 0.12;

    // C) Aplicação de Cupons
    let transactionAmount = calculatedGrossTotal;
    let platformSubsidy = 0; 

    if (normalizedCouponCode && item.coupons && Array.isArray(item.coupons)) {
        const coupon = item.coupons.find(c => c.code && c.code.trim().toUpperCase() === normalizedCouponCode);
        
        if (coupon) {
            let discountValue = 0;
            if (coupon.discountType === 'fixed' && coupon.discountValue) {
                discountValue = Number(coupon.discountValue);
            } else {
                const percent = Number(coupon.discountValue || coupon.percentage || 0);
                discountValue = (calculatedGrossTotal * percent / 100);
            }
            transactionAmount -= discountValue;
            
            // Se o cupom for do admin, a plataforma absorve o custo (subsídio)
            if (coupon.createdBy === 'admin') platformSubsidy = discountValue;
        }
    }
    
    // Arredondamento final e trava de segurança
    transactionAmount = Number(transactionAmount.toFixed(2));
    if (transactionAmount <= 0) throw new Error("Valor total da transação inválido.");

    // D) Cálculo do Split (Comissão Líquida)
    const mpRate = payment_method_id === 'pix' ? 0.0099 : 0.0398; // Taxas estimadas MP
    const mpFeeCost = transactionAmount * mpRate;
    const rawPlatformCommission = calculatedGrossTotal * PLATFORM_PERCENTAGE;

    // Comissão Final = (Bruto * %) - Subsídios - Taxa MP
    let finalApplicationFee = rawPlatformCommission - platformSubsidy - mpFeeCost;
    if (finalApplicationFee < 0) finalApplicationFee = 0;
    
    finalApplicationFee = Math.round(finalApplicationFee * 100) / 100;

    // ==================================================================
    // 🚀 PROCESSAMENTO MERCADO PAGO
    // ==================================================================
    // Autentica COMO O VENDEDOR (Parceiro)
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    
    const payment = new Payment(client);
    
    const rawBaseUrl = process.env.VITE_BASE_URL || 'https://mapadodayuse.com';
    const baseUrl = rawBaseUrl.replace(/\/$/, "");

    const cleanName = (item.name || "DayUse").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 13);
    const descriptor = `DU*${cleanName}`;

    // Tratamento de IP (Production Safe)
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : rawIp.toString().split(',')[0].trim();

    const paymentBody = {
      transaction_amount: transactionAmount, 
      description: `Reserva: ${item.name}`,
      payment_method_id,
      // SPLIT PAYMENT: Cobra a taxa calculada e envia para a conta do App
      application_fee: finalApplicationFee, 
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
      installments: Number(installments),
      issuer_id: issuer_id ? Number(issuer_id) : null,
      
      additional_info: {
          items: [
              {
                  id: item.id,
                  title: `Reserva Day Use: ${item.name}`,
                  description: "Pacote de reserva",
                  quantity: 1,
                  unit_price: transactionAmount 
              }
          ],
          ip_address: clientIp
      }
    };

    if (payment_method_id !== 'pix') {
      paymentBody.token = token;
    }

    // Criação com Idempotência (Evita duplicidade em retries de rede)
    const result = await payment.create({ 
        body: paymentBody,
        requestOptions: { idempotencyKey: reservationId } 
    });
    
    // Captura o valor real pago pelo cliente (incluindo juros se houver)
    const totalCobradoCliente = result.transaction_details?.total_paid_amount || transactionAmount;
    
    // ==================================================================
    // 6. ATUALIZAÇÃO NO BANCO (SUCESSO)
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
                totalPaidWithInterest: totalCobradoCliente,
                platformFee: finalApplicationFee,
                mpFeeEstimated: mpFeeCost,
                platformSubsidy: platformSubsidy,
                items: mpItemsList
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
    console.error("❌ [ERRO API PAGAMENTO]:", error);
    
    // Tratamento de erro detalhado para o frontend
    const errorDetails = error.cause || error.message;
    return res.status(500).json({ 
        error: 'Falha no processamento', 
        message: 'Não foi possível concluir o pagamento.',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
}