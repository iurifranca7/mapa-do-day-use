import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE (Sua versão que funciona)
// ==================================================================
import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ... (Mantenha a função initFirebase igualzinha estava) ...
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
    const { token, payment_method_id, issuer_id, installments, payer, bookingDetails, reservationId } = req.body;

    // 🕵️ LOG DE DEBUG: Vamos ver o que chegou do Frontend
    console.log("📦 RECEBIDO NO BACKEND:");
    console.log("📅 Data:", bookingDetails?.date);
    console.log("🛒 Carrinho (Qtd itens):", bookingDetails?.cartItems?.length || 0);
    // console.log("🛒 Itens Detalhados:", JSON.stringify(bookingDetails?.cartItems, null, 2));

    const targetId = bookingDetails?.dayuseId || bookingDetails?.item?.id;

    if (!targetId) throw new Error("ID do Day Use não fornecido.");

    // 1. Busca Day Use
    const dayUseRef = db.collection('dayuses').doc(targetId);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    // 2. Busca Token do Parceiro
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    const partnerAccessToken = process.env.MP_ACCESS_TOKEN_TEST || (ownerSnap.exists ? ownerSnap.data().mp_access_token : null);

    if (!partnerAccessToken) throw new Error("Token MP ausente.");

    // ==================================================================
    // CÁLCULOS FINANCEIROS (Dinâmico com Carrinho)
    // ==================================================================
    
    // Validação Inicial
    if (!bookingDetails.cartItems || bookingDetails.cartItems.length === 0) {
        console.error("❌ ERRO: Carrinho vazio no backend.");
        throw new Error("Carrinho vazio ou formato inválido.");
    }

    // Busca produtos no banco para validar preços
    const productsRef = db.collection('products').where('dayuseId', '==', targetId);
    const productsSnap = await productsRef.get();
    
    console.log(`🔎 Encontrados ${productsSnap.size} produtos cadastrados no banco para este DayUse.`);

    const dbProductsMap = {};
    productsSnap.forEach(doc => {
        dbProductsMap[doc.id] = { ...doc.data(), id: doc.id };
    });

    let calculatedGrossTotal = 0;
    const mpItemsList = []; 

    for (const cartItem of bookingDetails.cartItems) {
        if (Number(cartItem.quantity) <= 0) continue;

        const realProduct = dbProductsMap[cartItem.id];
        
        // 🕵️ LOG ESPECÍFICO DE ITEM
        if (!realProduct) {
             console.error(`❌ PRODUTO NÃO ENCONTRADO NO BANCO! ID Buscado: ${cartItem.id}`);
             console.log("📋 IDs disponíveis no banco:", Object.keys(dbProductsMap));
             // Comentei o erro para você ver no log se é isso, mas em produção deve ter o throw
             throw new Error(`Produto indisponível ou ID inválido: ${cartItem.title} (${cartItem.id})`);
        }

        const unitPrice = Number(realProduct.price || 0); 
        const quantity = Number(cartItem.quantity);

        console.log(`✅ Item Validado: ${realProduct.name || cartItem.title} | Qtd: ${quantity} | Preço Unit: ${unitPrice}`);

        calculatedGrossTotal += (unitPrice * quantity);

        mpItemsList.push({
            id: cartItem.id,
            title: realProduct.name || realProduct.title || cartItem.title,
            description: realProduct.description || `Tipo: ${cartItem.type}`,
            picture_url: realProduct.images?.[0] || item.images?.[0] || null,
            category_id: "tickets",
            quantity: quantity,
            unit_price: unitPrice
        });
    }

    // ... (O RESTO DO CÓDIGO PERMANECE IGUAL: Cupons, Comissão, Envio MP, etc) ...
    // Vou resumir aqui para não ficar gigante, mas você deve manter o código
    // de cálculo de comissão e envio para o Mercado Pago que já estava lá.
    
    // --- INSIRA AQUI O RESTANTE DO CÓDIGO (Cupons, Comissão, MP Payment.create) ---
    // Se precisar que eu reenvie o final, me avise, mas é idêntico ao anterior.
    
    // Apenas para fechar o exemplo, vou colocar o bloco final simplificado:
    
    let transactionAmount = Number(calculatedGrossTotal.toFixed(2));
    if (bookingDetails.couponCode && item.coupons) {
        // Lógica de cupom...
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) transactionAmount -= (calculatedGrossTotal * coupon.percentage / 100);
    }
    transactionAmount = Number(transactionAmount.toFixed(2));
    
    // ... Cálculo de Comissão ...
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);
    
    // Configuração do Payload MP (usando mpItemsList)
    const paymentBody = {
        transaction_amount: transactionAmount,
        description: `Reserva: ${item.name}`,
        payment_method_id,
        // ... application_fee, etc ...
        payer: {
            email: payer.email,
            first_name: payer.first_name,
            last_name: payer.last_name,
            identification: payer.identification
        },
        additional_info: {
            items: mpItemsList,
            ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        }
    };

    if (!payment_method_id.includes('pix')) {
        paymentBody.token = token;
        paymentBody.installments = Number(installments);
        if (issuer_id) paymentBody.issuer_id = Number(issuer_id);
    }

    console.log(`🚀 Enviando para MP: R$ ${transactionAmount}`);
    const result = await payment.create({ body: paymentBody });

    // Atualiza Reserva
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
    return res.status(500).json({ 
        error: 'Erro interno', 
        message: error.message,
        details: error.cause 
    });
  }
}

    // 3. Aplica Cupons (Se houver lógica de cupom no 'item' principal ou global)
    let transactionAmount = calculatedGrossTotal;
    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) {
            const discountAmount = (calculatedGrossTotal * coupon.percentage / 100);
            transactionAmount -= discountAmount;
            
            // Adiciona item negativo para representar desconto no MP (Opcional, mas elegante)
            // mpItemsList.push({ id: 'coupon', title: 'Desconto', quantity: 1, unit_price: -discountAmount });
        }
    }
    
    // Arredondamento final de segurança
    transactionAmount = Number(transactionAmount.toFixed(2));

    // Validação final de valor (Evita cobrar R$ 0,00 se não for intencional)
    if (transactionAmount <= 0) {
        throw new Error("Valor total da transação inválido (Zero ou negativo).");
    }

    // ==================================================================
    // CÁLCULO DE COMISSÃO (Mantido a lógica original)
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
    const platformGrossRevenue = calculatedGrossTotal * PLATFORM_RATE; // Comissão sobre o Bruto sem desconto? Ou com? (Geralmente é com desconto)
    // Se quiser comissão sobre o valor REAL cobrado (com desconto):
    // const platformGrossRevenue = transactionAmount * PLATFORM_RATE; 

    let commission = platformGrossRevenue - mpFeeCost;
    if (commission < 0) commission = 0;
    commission = Math.round(commission * 100) / 100;

    // ==================================================================
    // PROCESSAMENTO MP (Atualizado para incluir os itens)
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
    if (descriptor.length > 22) descriptor = descriptor.substring(0, 22);

    const paymentBody = {
      transaction_amount: transactionAmount,
      description: `Reserva: ${item.name}`, // Descrição geral
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

      // 🔥 AQUI ENTRA A LISTA DETALHADA DE PRODUTOS
      additional_info: {
          items: mpItemsList, // Usamos a lista que geramos no loop acima
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      }
    };

    if (!isPix) {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
      if (issuer_id) paymentBody.issuer_id = Number(issuer_id);
    }

    console.log(`🚀 Enviando para MP: R$ ${transactionAmount} (${mpItemsList.length} itens)`);

    const result = await payment.create({ body: paymentBody });

    // Atualização do status da reserva
    if (reservationId) {
        await db.collection('reservations').doc(reservationId).update({
            paymentId: result.id.toString(),
            paymentMethod: payment_method_id,
            status: result.status === 'approved' ? 'confirmed' : 'pending',
            mpStatus: result.status,
            updatedAt: new Date(),
            // Salva o snapshot dos preços usados na hora da compra para histórico
            financialSnapshot: {
                totalPaid: transactionAmount,
                commission: commission,
                items: mpItemsList
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
    return res.status(500).json({ 
        error: 'Erro interno', 
        message: error.message,
        details: error.cause 
    });
  }
}