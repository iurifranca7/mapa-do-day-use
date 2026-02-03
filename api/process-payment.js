import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE 
// ==================================================================
const initFirebase = () => {
    console.log("🔥 [1] Init Firebase...");
    
    // Se já estiver inicializado, reaproveita a instância
    if (admin.apps.length > 0) {
        console.log("✅ [1] Firebase já estava inicializado.");
        return admin.firestore();
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    try {
        if (projectId && clientEmail && privateKeyRaw) {
            // Corrige formatação da chave privada que vem com \n do ambiente
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
            
            const credential = admin.credential.cert({ projectId, clientEmail, privateKey });
            admin.initializeApp({ credential });
            console.log("✅ [1] Firebase Iniciado Agora.");
        } else {
            console.error("❌ Credenciais de ambiente ausentes.");
            throw new Error("Credenciais do Firebase incompletas nas Variáveis de Ambiente.");
        }
    } catch (e) { 
        console.error("❌ Erro no Init Firebase:", e);
        throw new Error(`Credentials Error: ${e.message}`); 
    }

    return admin.firestore();
};

export default async function handler(req, res) {
  // LOG 02: API foi chamada?
  console.log("🚀 [2] API PROCESS-PAYMENT CHAMADA");

  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = initFirebase();
    
    // Extração dos dados do corpo da requisição
    const { token, payment_method_id, issuer_id, installments, payer, bookingDetails, reservationId } = req.body;

    // LOG 03: Verificando o que chegou do Frontend
    console.log("📦 [3] Payload Recebido:", {
        dayuseId: bookingDetails?.dayuseId,
        date: bookingDetails?.date,
        metodo: payment_method_id,
        temCartItems: !!bookingDetails?.cartItems,
        qtdItens: bookingDetails?.cartItems?.length || 0
    });

    // --- Robustez na busca do ID ---
    const targetId = bookingDetails?.dayuseId || bookingDetails?.item?.id;

    if (!targetId) {
        console.error("❌ Payload sem ID do Day Use");
        throw new Error("ID do Day Use não fornecido.");
    }

    // ==================================================================
    // 2. BUSCAS NO BANCO DE DADOS
    // ==================================================================

    // A) Busca dados do Day Use (Local)
    const dayUseRef = db.collection('dayuses').doc(targetId);
    const dayUseSnap = await dayUseRef.get();
   
    if (!dayUseSnap.exists) {
        console.error("❌ Day Use não encontrado no banco:", targetId);
        throw new Error("Day Use não encontrado.");
    }
    const item = dayUseSnap.data();
    console.log("✅ [4] DayUse encontrado:", item.name);

    // B) Busca Token do Parceiro (Dono do Day Use)
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
   
    // Lógica: Usa token de teste do ambiente OU o token do parceiro no banco
    const partnerAccessToken = process.env.MP_ACCESS_TOKEN_TEST || (ownerSnap.exists ? ownerSnap.data().mp_access_token : null);

    if (!partnerAccessToken) {
        console.error(`❌ Parceiro ${item.ownerId} sem token configurado.`);
        throw new Error("Estabelecimento não configurou o recebimento de pagamentos.");
    }

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

    // Nota: Aqui assumimos que "adults" e "children" ainda vêm preenchidos para controle de lotação
    // mesmo usando o carrinho novo. O frontend costuma manter esses campos.
    const newGuests = Number(bookingDetails.adults || 0) + Number(bookingDetails.children || 0);

    if ((currentOccupancy + newGuests) > limit) {
        console.warn(`⛔ Bloqueio de Overbooking: Tentou ${newGuests}, Restam ${limit - currentOccupancy}`);
        return res.status(409).json({ error: 'Sold Out', message: 'Vagas esgotadas.' });
    }

    // ==================================================================
    // 💰 CÁLCULOS FINANCEIROS (AQUI ESTÁ A LÓGICA MISTA)
    // ==================================================================
    console.log("💰 [5] Iniciando Cálculo Financeiro...");
    
    let calculatedGrossTotal = 0;
    const mpItemsList = []; // Lista para o Mercado Pago

    // HIPÓTESE A: Temos carrinho novo?
    if (bookingDetails.cartItems && bookingDetails.cartItems.length > 0) {
        console.log("🛒 [5.1] Usando Lógica de Carrinho (Produtos Dinâmicos)");
        
        // Busca produtos no banco para validar preços
        const productsRef = db.collection('products').where('dayUseId', '==', targetId);
        const productsSnap = await productsRef.get();
        
        console.log(`🔎 [5.2] Produtos encontrados no banco: ${productsSnap.size}`);

        // Cria Mapa para busca rápida
        const dbProductsMap = {};
        productsSnap.forEach(doc => {
            dbProductsMap[doc.id] = { ...doc.data(), id: doc.id };
        });

        for (const cartItem of bookingDetails.cartItems) {
            const qty = Number(cartItem.quantity);
            if (qty <= 0) continue;

            const realProduct = dbProductsMap[cartItem.id];
            
            if (!realProduct) {
                 console.error(`❌ [Erro] Produto do carrinho não achado no banco: ${cartItem.id}`);
                 // Se não achou, ignora ou lança erro. Vamos logar e continuar por segurança neste teste.
                 continue; 
            }

            const unitPrice = Number(realProduct.price || 0);
            calculatedGrossTotal += (unitPrice * qty);
            
            console.log(`   -> Item: ${realProduct.title} | ${qty}x R$${unitPrice}`);

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
    } 
    // HIPÓTESE B: É o sistema antigo (sem carrinho)? Fallback para não quebrar vendas legadas.
    else {
        console.log("⚠️ [5.1] Carrinho vazio. Usando lógica LEGADA (Adultos/Crianças)");
        
        let priceAdult = Number(item.priceAdult);
        let priceChild = Number(item.priceChild || 0);
        let pricePet = Number(item.petFee || 0);
        
        // Lógica simples de dia da semana (resumida da original)
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

        calculatedGrossTotal = 
            (Number(bookingDetails.adults) * priceAdult) + 
            (Number(bookingDetails.children) * priceChild) + 
            (Number(bookingDetails.pets) * pricePet);
        
        // Adiciona um item genérico para o MP
        mpItemsList.push({
            id: 'legacy_item',
            title: `Day Use: ${item.name}`,
            quantity: 1,
            unit_price: calculatedGrossTotal
        });
    }

    // Aplicação de Cupons
    let transactionAmount = calculatedGrossTotal;
    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) {
            const discount = (calculatedGrossTotal * coupon.percentage / 100);
            transactionAmount -= discount;
            console.log(`🎟️ [5.3] Desconto aplicado: -R$ ${discount}`);
        }
    }
    
    // Arredondamento final
    transactionAmount = Number(transactionAmount.toFixed(2));
    console.log(`💵 [6] Valor Final a Cobrar: R$ ${transactionAmount}`);

    if (transactionAmount <= 0) {
        console.error("❌ Valor total zero ou negativo.");
        throw new Error("Valor total inválido (Zero ou negativo).");
    }

    // ==================================================================
    // CÁLCULO DE COMISSÃO
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
    // PROCESSAMENTO MERCADO PAGO
    // ==================================================================
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);
   
    const rawBaseUrl = process.env.VITE_BASE_URL || 'https://mapadodayuse.com';
    const baseUrl = rawBaseUrl.replace(/\/$/, "");

    // Limpeza do nome para a fatura
    const cleanName = (item.name || "DayUse")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();

    let descriptor = `DAYUSE*${cleanName}`;
    if (descriptor.length > 22) descriptor = descriptor.substring(0, 22);

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

      // 🔥 LISTA DE ITENS PARA ANTIFRAUDE (Gerada no passo 5)
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

    console.log("🚀 [7] Enviando requisição para o Mercado Pago...");
    
    // CHAMADA REAL AO MERCADO PAGO
    const result = await payment.create({ body: paymentBody });
    
    console.log("✅ [8] Resposta MP:", result.status, "| ID:", result.id);

    // ==================================================================
    // 6. ATUALIZAÇÃO E RESPOSTA
    // ==================================================================
    
    // Atualiza a reserva no banco com o resultado
    if (reservationId) {
        await db.collection('reservations').doc(reservationId).update({
            paymentId: result.id.toString(),
            paymentMethod: payment_method_id,
            status: result.status === 'approved' ? 'confirmed' : 'pending',
            mpStatus: result.status,
            updatedAt: new Date(),
            financialSnapshot: {
                totalPaid: transactionAmount,
                commission: commission,
                items: mpItemsList
            }
        });
    }

    const statusValidos = ['approved', 'in_process', 'pending'];
    if (!statusValidos.includes(result.status)) {
        console.warn(`⚠️ Pagamento recusado: ${result.status_detail}`);
        return res.status(402).json({ 
            error: 'Pagamento recusado', 
            message: result.status_detail || 'Transação não autorizada pelo banco.' 
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
    
    // Log detalhado do erro interno do MP se houver
    if (error.cause) console.error("Detalhes MP:", JSON.stringify(error.cause, null, 2));

    return res.status(500).json({ 
        error: 'Erro interno', 
        message: error.message,
        details: error.cause 
    });
  }
}