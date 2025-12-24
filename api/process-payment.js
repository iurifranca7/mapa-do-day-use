import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { 
        token, 
        issuer_id, 
        payment_method_id, 
        transaction_amount, 
        installments, 
        payer, 
        partnerAccessToken 
      } = req.body;

      if (!partnerAccessToken) throw new Error("Token do parceiro ausente.");

      // 1. Inicializa o MP com a chave do PARCEIRO (Vendedor)
      const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
      const payment = new Payment(client);

      // 2. Calcula comissão (15%)
      const commission = Math.round(transaction_amount * 0.15 * 100) / 100;

      // 3. Cria o pagamento
      const paymentData = {
        body: {
          token,
          issuer_id,
          payment_method_id,
          transaction_amount: Number(transaction_amount),
          installments: Number(installments),
          description: "Reserva Day Use",
          payer: {
            email: payer.email,
            first_name: payer.first_name,
            last_name: payer.last_name,
            identification: payer.identification // CPF
          },
          application_fee: commission, // Split: Sua parte
        }
      };

      const result = await payment.create(paymentData);

      return res.status(200).json({
        id: result.id,
        status: result.status,
        detail: result.status_detail,
      });

    } catch (error) {
      console.error("Erro Pagamento:", error);
      return res.status(500).json({ 
        error: 'Erro ao processar', 
        message: error.message,
        cause: error.cause 
      });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}