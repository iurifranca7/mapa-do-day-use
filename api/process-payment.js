import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      // Agora recebemos 'formData' do Brick, além do token do parceiro e valor final
      const { formData, partnerAccessToken, amount } = req.body;

      if (!partnerAccessToken) {
        throw new Error("Token do parceiro não fornecido.");
      }

      // 1. Inicializa o cliente usando o TOKEN DO PARCEIRO (Vendedor)
      const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
      const payment = new Payment(client);

      // 2. Calcula a comissão (15% sobre o valor FINAL pago pelo cliente)
      // Se houve cupom, a comissão é sobre o valor já com desconto.
      // O parceiro absorve o desconto pois recebe o (valor_pago - comissão).
      const commission = Math.round(amount * 0.15 * 100) / 100;

      // 3. Monta o corpo do pagamento
      // O 'formData' já traz token, método de pagamento, parcelas e dados do pagador criptografados ou formatados pelo Brick.
      const paymentBody = {
        ...formData, 
        transaction_amount: Number(amount), // Garante que o valor processado é o que está no front (com desconto)
        application_fee: commission,        // Taxa do Marketplace
        description: "Reserva Day Use",
      };

      // 4. Processa
      const result = await payment.create({ body: paymentBody });

      res.status(200).json({
        id: result.id,
        status: result.status,
        detail: result.status_detail,
      });

    } catch (error) {
      console.error("Erro no Processamento:", error);
      res.status(500).json({ 
        error: 'Erro ao processar pagamento', 
        message: error.message,
        details: error.cause
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}