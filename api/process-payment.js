import { MercadoPagoConfig, Payment } from 'mercadopago';
import * as admin from 'firebase-admin';

// --- 1. Inicialização do Firebase (Backend) ---
if (!admin.apps.length) {
    try {
        // Tenta ler a variável Base64 (Recomendado para Vercel)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
            const buffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
            const serviceAccount = JSON.parse(buffer.toString('utf-8'));
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        } 
        // Fallback para JSON direto
        else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
        }
        else {
            console.error("❌ Erro: Nenhuma credencial do Firebase encontrada.");
        }
    } catch (e) {
        console.error("❌ Erro ao iniciar Firebase:", e);
    }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, payment_method_id, installments, payer, bookingDetails } = req.body;

    // 1. Busca dados seguros do Day Use no Banco
    const dayUseRef = db.collection('dayuses').doc(bookingDetails.dayuseId);
    const dayUseSnap = await dayUseRef.get();
    
    if (!dayUseSnap.exists) throw new Error("Day Use não encontrado.");
    const item = dayUseSnap.data();

    // 2. Busca Token do Parceiro (Para Split/Recebimento)
    const ownerRef = db.collection('users').doc(item.ownerId);
    const ownerSnap = await ownerRef.get();
    
    // Se o parceiro não conectou, usamos a conta da plataforma (fallback) ou lançamos erro
    // Aqui vamos lançar erro para garantir o fluxo de marketplace
    if (!ownerSnap.exists || !ownerSnap.data().mp_access_token) {
        throw new Error("O estabelecimento não conectou a conta financeira.");
    }
    const partnerAccessToken = ownerSnap.data().mp_access_token;

    // 3. Cálculo do Valor (Nunca confie no valor vindo do frontend)
    const dateParts = bookingDetails.date.split('-'); 
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0); 
    const dayOfWeek = dateObj.getDay();

    let priceAdult = Number(item.priceAdult);
    let priceChild = Number(item.priceChild || 0);
    let pricePet = Number(item.petFee || 0);

    // Preço Dinâmico (Dia da semana)
    if (item.weeklyPrices && item.weeklyPrices[dayOfWeek]) {
        const dayConfig = item.weeklyPrices[dayOfWeek];
        if (typeof dayConfig === 'object') {
            if (dayConfig.adult) priceAdult = Number(dayConfig.adult);
            if (dayConfig.child) priceChild = Number(dayConfig.child);
            if (dayConfig.pet) pricePet = Number(dayConfig.pet);
        } else if (!isNaN(dayConfig)) {
            priceAdult = Number(dayConfig);
        }
    }

    let total = (Number(bookingDetails.adults) * priceAdult) + 
                (Number(bookingDetails.children) * priceChild) + 
                (Number(bookingDetails.pets) * pricePet);

    // Soma Extras
    if (bookingDetails.selectedSpecial && item.specialTickets) {
        Object.entries(bookingDetails.selectedSpecial).forEach(([idx, qtd]) => {
            const ticket = item.specialTickets[idx];
            if (ticket && qtd > 0) total += (Number(ticket.price) * Number(qtd));
        });
    }

    // Aplica Cupom
    if (bookingDetails.couponCode && item.coupons) {
        const coupon = item.coupons.find(c => c.code === bookingDetails.couponCode);
        if (coupon) {
            total -= (total * coupon.percentage) / 100;
        }
    }

    // Comissão da Plataforma (ex: 15%)
    const commission = Math.round(total * 0.15 * 100) / 100;

    // 4. Criação do Pagamento no Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);

    const paymentBody = {
      transaction_amount: Number(total.toFixed(2)),
      description: `Reserva: ${item.name}`,
      payment_method_id,
      application_fee: commission, // O MP desconta isso e manda pra você
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
      }
    };

    if (payment_method_id !== 'pix') {
      paymentBody.token = token; // Token do cartão gerado no front
      paymentBody.installments = Number(installments);
    }

    const result = await payment.create({ body: paymentBody });

    // Retorna dados para o frontend (incluindo QR Code se for Pix)
    return res.status(200).json({
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      point_of_interaction: result.point_of_interaction, // Aqui vem o QR Code
      charged_amount: total 
    });

  } catch (error) {
    console.error("Erro Pagamento:", error);
    return res.status(500).json({ error: error.message, details: error.cause });
  }
}