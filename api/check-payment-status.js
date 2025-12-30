import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { paymentId, partnerAccessToken } = req.body;

      if (!paymentId || !partnerAccessToken) {
        throw new Error("Dados insuficientes para verificação.");
      }

      const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
      const payment = new Payment(client);

      const result = await payment.get({ id: paymentId });

      return res.status(200).json({ 
        status: result.status,
        status_detail: result.status_detail 
      });

    } catch (error) {
      console.error("Erro Check Status:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}