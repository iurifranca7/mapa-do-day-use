import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE (Segura para Serverless)
// ==================================================================
const initFirebase = () => {
    // Se já estiver inicializado, reaproveita a instância
    if (admin.apps.length > 0) return admin.firestore();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Corrige formatação da chave privada que vem com \n do ambiente
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    try {
        if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); 
            const credential = admin.credential.cert({ projectId, clientEmail, privateKey });
            admin.initializeApp({ credential });
        } else {
            console.error("❌ Credenciais de ambiente ausentes.");
            throw new Error("Credenciais do Firebase incompletas nas Variáveis de Ambiente.");
        }
    } catch (e) { 
        throw new Error(`Credentials Error: ${e.message}`); 
    }

    return admin.firestore();
};

export default async function handler(req, res) {
  // Configuração de CORS (Permite que seu site acesse a API)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = initFirebase();
    
    // Extrai dados enviados pelo Frontend
    const { token, payment_method_id, issuer_id, installments, payer, bookingDetails, reservationId } = req.body;

    // 🕵️ LOGS DE DEBUG (Para você ver na Vercel)
    console.log("📦 [API] Processando Pagamento...");
    console.log(`📅 Data: ${bookingDetails?.date}`);
    console.log(`🛒 Itens no Carrinho: ${bookingDetails?.cartItems?.length || 0}`);
    
    // Validação básica do ID do Day Use
    const targetId = bookingDetails?.dayuseId || bookingDetails?.item?.id;
    if (!targetId) throw new Error("ID do Day Use não fornecido.");

    // ==================================================================
    // 2. BUSCAS NO BANCO DE DADOS
    // ==================================================================

    // A) Busca dados do Day Use (Local)
    const dayUseRef = db.collection('dayuses').doc(targetId);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado no banco.");
    const item = dayUseSnap.data();

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
    // 3. CÁLCULOS FINANCEIROS (DINÂMICO COM CARRINHO)
    // ==================================================================
    
    // Validação: Carrinho não pode estar vazio
    if (!bookingDetails.cartItems || bookingDetails.cartItems.length === 0) {
        throw new Error("Carrinho vazio ou formato inválido.");
    }

    // C) Busca TODOS os produtos deste Day Use no banco para validar preços
    const productsRef = db.collection('products').where('dayuseId', '==', targetId);
    const productsSnap = await productsRef.get();
    
    // Cria um Mapa (Dicionário) para busca rápida: ID -> Dados Reais
    const dbProductsMap = {};
    productsSnap.forEach(doc => {
        dbProductsMap[doc.id] = { ...doc.data(), id: doc.id };
    });

    let calculatedGrossTotal = 0;
    const mpItemsList = []; // Lista para enviar ao Mercado Pago (Qualidade)

    // Loop item a item do carrinho
    for (const cartItem of bookingDetails.cartItems) {
        // Ignora itens zerados
        if (Number(cartItem.quantity) <= 0) continue;

        // Verifica se o produto existe no banco (Segurança)
        const realProduct = dbProductsMap[cartItem.id];
        
        if (!realProduct) {
             console.error(`❌ Tentativa de compra de item inexistente: ${cartItem.id}`);
             // Em produção, isso deve bloquear a compra.
             throw new Error(`Produto indisponível ou alterado: ${cartItem.title}`);
        }

        // 💰 PEGA O PREÇO REAL DO BANCO (Ignora o do frontend)
        const unitPrice = Number(realProduct.price || 0); 
        const quantity = Number(cartItem.quantity);

        // Soma ao total
        calculatedGrossTotal += (unitPrice * quantity);

        // Adiciona à lista do Mercado Pago
        mpItemsList.push({
            id: cartItem.id,
            title: realProduct.name || realProduct.title || cartItem.title, 
            description: `Tipo: ${realProduct.type || 'Ingresso'}`,
            picture_url: realProduct.images?.[0] || item.images?.[0] || null,
            category_id: "tickets",
            quantity: quantity,
            unit_price: unitPrice
        });
    }

    console.log(`💰 Total Calculado (Bruto): R$ ${calculatedGrossTotal}`);

    // D) Aplica Cupons (Lógica original mantida)
    let transactionAmount = calculatedGrossTotal;
    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) {
            const discountAmount = (calculatedGrossTotal * coupon.percentage / 100);
            transactionAmount -= discountAmount;
            console.log(`🎟️ Cupom aplicado: -R$ ${discountAmount}`);
        }
    }
    
    // Arredondamento final
    transactionAmount = Number(transactionAmount.toFixed(2));

    if (transactionAmount <= 0) throw new Error("Valor total inválido (Zero ou negativo).");

    // ==================================================================
    // 4. CÁLCULO DE COMISSÃO E SPLIT
    // ==================================================================
    let refDate = new Date();
    // Tenta pegar data de ativação ou criação para definir taxa
    if (item.firstActivationDate) {
         const d = item.firstActivationDate.toDate ? item.firstActivationDate.toDate() : new Date(item.firstActivationDate);
         if (!isNaN(d)) refDate = d;
    } else if (item.createdAt) {
         const d = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
         if (!isNaN(d)) refDate = d;
    }
    
    const diffDays = Math.ceil(Math.abs(new Date() - refDate) / (1000 * 60 * 60 * 24)); 
    // Regra: < 30 dias = 10%, > 30 dias = 12%
    const PLATFORM_RATE = diffDays <= 30 ? 0.10 : 0.12;

    const isPix = payment_method_id === 'pix';
    // Custo estimado do MP (para descontar da sua comissão, não do parceiro)
    const mpFeeCost = transactionAmount * (isPix ? 0.0099 : 0.0398);
    const platformGrossRevenue = calculatedGrossTotal * PLATFORM_RATE; 

    let commission = platformGrossRevenue - mpFeeCost;
    if (commission < 0) commission = 0;
    commission = Math.round(commission * 100) / 100;

    // ==================================================================
    // 5. PROCESSAMENTO MERCADO PAGO
    // ==================================================================
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);
    
    const rawBaseUrl = process.env.VITE_BASE_URL || 'https://mapadodayuse.com';
    const baseUrl = rawBaseUrl.replace(/\/$/, ""); 

    // Limpeza do nome para a fatura do cartão
    const cleanName = item.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-zA-Z0-9]/g, "") 
        .toUpperCase();

    let descriptor = `DAYUSE*${cleanName}`; 
    if (descriptor.length > 22) descriptor = descriptor.substring(0, 22);

    // Montagem do Payload Final
    const paymentBody = {
      transaction_amount: transactionAmount,
      description: `Reserva: ${item.name}`,
      payment_method_id,
      application_fee: commission, // Sua comissão
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      statement_descriptor: descriptor,
      
      external_reference: reservationId,
      binary_mode: true, // Aprovação instantânea ou recusa (sem 'em análise')
      
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
      },

      // 🔥 LISTA DE ITENS PARA ANTIFRAUDE
      additional_info: {
          items: mpItemsList,
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      }
    };

    // Adiciona dados específicos se não for Pix
    if (!isPix) {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
      if (issuer_id) paymentBody.issuer_id = Number(issuer_id);
    }

    console.log(`🚀 Enviando para MP...`);

    // CHAMA O MERCADO PAGO
    const result = await payment.create({ body: paymentBody });

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
                platformRate: PLATFORM_RATE,
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

    console.log(`✅ Sucesso! ID: ${result.id}`);

    return res.status(200).json({
      id: result.id.toString(),
      status: result.status,
      point_of_interaction: result.point_of_interaction, // QR Code do Pix vem aqui
      charged_amount: transactionAmount
    });

  } catch (error) {
    console.error("❌ Erro Crítico Backend:", error);
    
    // Tenta extrair mensagem útil do erro do Mercado Pago
    const mpErrorMsg = error.cause?.[0]?.description || error.message;

    return res.status(500).json({ 
        error: 'Erro interno de processamento', 
        message: mpErrorMsg,
        details: error.cause 
    });
  }
}