import { MercadoPagoConfig, Payment } from 'mercadopago';

// NÃO IMPORTAMOS MAIS O FIREBASE-ADMIN

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, payment_method_id, installments, payer, bookingDetails, partnerAccessToken: tokenFromFront, transactionAmount } = req.body;

    // 1. Definição do Token de Acesso (Prioridade: Front > Env)
    // Em produção, o token deve vir do banco de dados (passado pelo front ou buscado aqui se tivesse firebase-admin)
    const accessToken = tokenFromFront || process.env.MP_ACCESS_TOKEN;

    // 2. Definição do Valor
    let finalAmount = transactionAmount;
    
    if (!finalAmount && bookingDetails) {
        // Tenta recuperar o total do objeto bookingDetails se não vier explícito
        finalAmount = Number(bookingDetails.total || 0);
    }

    // --- VALIDAÇÃO RÍGIDA (MODO PRODUÇÃO) ---
    if (!accessToken) {
         throw new Error("Configuração incompleta: Token de acesso do Mercado Pago não fornecido.");
    }

    if (!finalAmount || finalAmount <= 0) {
         throw new Error("Valor da transação inválido ou zerado.");
    }

    // --- PROCESSAMENTO REAL (MERCADO PAGO) ---
    
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    // Calcula comissão da plataforma (ex: 15%)
    const commission = Math.round(finalAmount * 0.15 * 100) / 100;

    const paymentBody = {
      transaction_amount: Number(Number(finalAmount).toFixed(2)),
      description: `Reserva Day Use`, 
      payment_method_id,
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
      }
    };

    if (payment_method_id !== 'pix') {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
    }

    console.log("💳 Processando MP Real:", finalAmount);
    const result = await payment.create({ body: paymentBody });

    return res.status(200).json({
      id: result.id,
      status: result.status,
      detail: result.status_detail,
      point_of_interaction: result.point_of_interaction,
      charged_amount: finalAmount
    });

  } catch (error) {
    console.error("Erro Backend (Payment):", error);
    
    let msg = error.message;
    // Tradução de erros comuns do MP para o usuário final
    if (JSON.stringify(error).includes("user_allowed_only_in_test")) {
        msg = "ERRO SANDBOX: Não é possível usar a própria conta do vendedor para pagar. Use um e-mail/conta diferente.";
    } else if (error.cause && error.cause[0] && error.cause[0].description) {
        msg = `Mercado Pago: ${error.cause[0].description}`;
    }

    return res.status(500).json({ 
        error: 'Erro no processamento', 
        message: msg,
        details: error.cause 
    });
  }
}