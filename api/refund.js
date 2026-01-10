import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';

// API LIMPA (SEM FIREBASE ADMIN) - PROXY PARA MERCADO PAGO
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { paymentId, amount, partnerAccessToken } = req.body;

    // 1. Validação
    if (!paymentId) throw new Error("ID do pagamento não fornecido.");

    // 2. Token de Acesso (Prioridade: Vindo do Front > Vercel Env)
    const accessToken = partnerAccessToken || process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Token do Mercado Pago não configurado.");

    // 3. Conexão MP
    const client = new MercadoPagoConfig({ accessToken });
    const refund = new PaymentRefund(client);

    // 4. Executa Estorno
    // Se amount for undefined/null, o MP entende como estorno total
    const body = amount ? { amount: Number(amount) } : undefined;

    console.log(`💸 Estornando MP. ID: ${paymentId}, Valor: ${amount || 'Total'}`);
    
    const result = await refund.create({ payment_id: paymentId, body });

    return res.status(200).json({ 
        success: true, 
        id: result.id,
        status: result.status,
        message: "Estorno financeiro realizado com sucesso."
    });

  } catch (error) {
    console.error("Erro Refund API:", error);
    // Retorna erro legível
    return res.status(500).json({ 
        error: 'Erro no reembolso', 
        message: error.message || "Erro desconhecido",
        details: error.cause 
    });
  }
}