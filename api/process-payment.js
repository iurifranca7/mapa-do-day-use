import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO DO FIREBASE
// ==================================================================
const initFirebase = () => {
    if (!admin || !admin.apps) {
        throw new Error("Biblioteca Firebase Admin não foi carregada corretamente.");
    }

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
            const serviceAccount = JSON.parse(buffer.toString('utf-8'));
            credential = admin.credential.cert(serviceAccount);
        } else if (serviceAccountJSON) {
            const serviceAccount = JSON.parse(serviceAccountJSON);
            credential = admin.credential.cert(serviceAccount);
        } else if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); 
            credential = admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            });
        }
    } catch (parseError) {
        throw new Error(`Falha ao ler credenciais do Firebase: ${parseError.message}`);
    }

    if (!credential) {
        throw new Error("Nenhuma credencial do Firebase encontrada nas Variáveis de Ambiente.");
    }

    try {
        admin.initializeApp({ credential });
    } catch (e) {
        if (!e.message.includes('already exists')) {
             throw e;
        }
    }

    return admin.firestore();
};

// ==================================================================
// 2. FUNÇÃO PRINCIPAL (HANDLER)
// ==================================================================
export default async function handler(req, res) {
  // Headers de CORS e Métodos
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = initFirebase();
    const { token, payment_method_id, installments, payer, bookingDetails } = req.body;

    // --- A. VALIDAÇÕES E BUSCAS ---
    if (!bookingDetails?.dayuseId) throw new Error("ID do Day Use não fornecido.");

    // Busca Day Use
    const dayUseRef = db.collection('dayuses').doc(bookingDetails.dayuseId);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    // Busca Token do Parceiro
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    if (!ownerSnap.exists || !ownerSnap.data().mp_access_token) {
        throw new Error("O estabelecimento não configurou o recebimento de pagamentos.");
    }
    
    const partnerAccessToken = ownerSnap.data().mp_access_token;

    // --- B. CÁLCULO DO PREÇO BRUTO (Valor Original dos Ingressos) ---
    const dateParts = bookingDetails.date.split('-'); 
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0); 
    const dayOfWeek = dateObj.getDay();

    let priceAdult = Number(item.priceAdult);
    let priceChild = Number(item.priceChild || 0);
    let pricePet = Number(item.petFee || 0);

    // Ajuste por dia da semana
    if (item.weeklyPrices && item.weeklyPrices[dayOfWeek]) {
        const dayConfig = item.weeklyPrices[dayOfWeek];
        if (typeof dayConfig === 'object') {
            if (dayConfig.adult) priceAdult = Number(dayConfig.adult);
            if (dayConfig.child) priceChild = Number(dayConfig.child);
            if (dayConfig.pet) pricePet = Number(dayConfig.pet);
        } else if (!isNaN(dayConfig)) priceAdult = Number(dayConfig);
    }

    // 1. Soma total BRUTA (Sem descontos)
    let calculatedGrossTotal = 
        (Number(bookingDetails.adults) * priceAdult) + 
        (Number(bookingDetails.children) * priceChild) + 
        (Number(bookingDetails.pets) * pricePet);

    // Adicionais / Especiais
    if (bookingDetails.selectedSpecial && item.specialTickets) {
        Object.entries(bookingDetails.selectedSpecial).forEach(([idx, qtd]) => {
            const ticket = item.specialTickets[idx];
            if (ticket && qtd > 0) calculatedGrossTotal += (Number(ticket.price) * Number(qtd));
        });
    }

    if (calculatedGrossTotal <= 0) throw new Error("Valor total inválido.");

    // 2. Aplicação do Cupom (Calcula quanto o cliente vai PAGAR)
    let transactionAmount = calculatedGrossTotal; 
    
    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) {
            // O desconto reduz o valor transacionado
            transactionAmount -= (calculatedGrossTotal * coupon.percentage / 100);
        }
    }
    
    // Arredonda valor final a cobrar do cliente
    transactionAmount = Number(transactionAmount.toFixed(2));

    // ==================================================================
    // C. LÓGICA DE DATA (PROMOÇÃO 30 DIAS)
    // ==================================================================
    let refDate = null;

    // Prioridade 1: Data de Ativação (Gravada ao clicar em "Reativar/Criar")
    if (item.firstActivationDate) {
        refDate = item.firstActivationDate.toDate ? item.firstActivationDate.toDate() : new Date(item.firstActivationDate);
    } 
    // Prioridade 2: Fallback para Data de Criação (Itens antigos ativos)
    else if (item.createdAt) {
        refDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
    } else {
        refDate = new Date();
    }

    const today = new Date();
    const diffTime = Math.abs(today - refDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    // Definição da Taxa da Plataforma
    let PLATFORM_RATE = 0.12; // 12% Padrão (> 30 dias)
    if (diffDays <= 30) {
        PLATFORM_RATE = 0.10; // 10% Promo (<= 30 dias)
    }

    // ==================================================================
    // D. LÓGICA FINANCEIRA (TAXA SOBRE BRUTO + SPLIT)
    // ==================================================================
    const TAXA_PIX = 0.0099; // 0.99%
    const TAXA_CARTAO = 0.0398; // 3.98%

    const isPix = payment_method_id === 'pix';
    const currentMpFeeRate = isPix ? TAXA_PIX : TAXA_CARTAO;

    // 1. Quanto a Plataforma quer ganhar? (Taxa % sobre o BRUTO TOTAL)
    // O parceiro paga a taxa sobre o valor cheio, absorvendo o custo do cupom.
    const platformGrossRevenue = calculatedGrossTotal * PLATFORM_RATE;

    // 2. Quanto o Mercado Pago vai cobrar de custo? (Taxa % sobre o que foi PAGO)
    const mpFeeCost = transactionAmount * currentMpFeeRate;

    // 3. Cálculo da Application Fee (Sua Comissão Líquida no MP)
    // Application Fee = Sua Parte Bruta - Custo que o MP vai morder do Parceiro
    let commission = platformGrossRevenue - mpFeeCost;

    // Segurança matemática
    if (commission < 0) commission = 0;
    commission = Math.round(commission * 100) / 100;

    // ==================================================================
    // E. PROCESSAMENTO MP (COM WEBHOOK)
    // ==================================================================
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);

    // Defina a URL base do seu site para o Webhook
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://mapadodayuse.com';

    const paymentBody = {
      transaction_amount: transactionAmount, // Valor com desconto (Real a pagar)
      description: `Reserva: ${item.name}`,
      payment_method_id,
      application_fee: commission, // Sua comissão calculada
      
      // CRÍTICO: Avisar o MP onde notificar mudanças de status
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

    console.log(`💳 Processando MP. 
      Bruto: R$${calculatedGrossTotal} 
      Pago: R$${transactionAmount}
      Taxa App: ${(PLATFORM_RATE*100).toFixed(0)}% (R$${platformGrossRevenue.toFixed(2)})
      Custo MP: R$${mpFeeCost.toFixed(2)}
      App Fee Final: R$${commission.toFixed(2)}`);
    
    const result = await payment.create({ body: paymentBody });

    // ==================================================================
    // H. VINCULAR PAGAMENTO À RESERVA (CRÍTICO PARA WEBHOOK)
    // ==================================================================
    // Se o frontend mandou o ID da reserva que ele criou previamente
    if (req.body.reservationId) {
        const resId = req.body.reservationId;
        console.log(`🔗 Vinculando Pagamento ${result.id} à Reserva ${resId}`);
        
        await db.collection('reservations').doc(resId).update({
            paymentId: result.id.toString(), // Salva o ID do MP na reserva
            paymentMethod: payment_method_id,
            status: result.status === 'approved' ? 'confirmed' : 'pending', // Atualiza status
            mpStatus: result.status,
            updatedAt: new Date()
        });
    }

    // ==================================================================
    // F. VALIDAÇÃO IMEDIATA (CARTÃO RECUSADO)
    // ==================================================================
    const statusValidos = ['approved', 'in_process', 'pending'];

    if (!statusValidos.includes(result.status)) {
        console.warn(`❌ Pagamento Recusado: ${result.status} | ${result.status_detail}`);
        return res.status(402).json({
            error: 'Pagamento recusado',
            status: result.status,
            detail: result.status_detail,
            message: traduzirErroMP(result.status_detail)
        });
    }

    // ==================================================================
    // G. SUCESSO
    // ==================================================================
    return res.status(200).json({
      id: result.id.toString(), // Convertido para string para evitar erro no frontend
      status: result.status,
      detail: result.status_detail,
      point_of_interaction: result.point_of_interaction, // Necessário para QR Code Pix
      charged_amount: transactionAmount
    });

  } catch (error) {
    console.error("Erro Backend (Payment):", error);
    return res.status(500).json({ 
        error: 'Erro no processamento', 
        message: error.message || "Erro desconhecido",
        details: error.cause 
    });
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