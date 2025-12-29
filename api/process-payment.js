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
      // Recebe os dados manuais enviados pelo Frontend
      const { 
        transaction_amount, 
        token, 
        description, 
        installments, 
        payment_method_id, 
        payer, 
        partnerAccessToken 
      } = req.body;

      if (!partnerAccessToken) {
        throw new Error("Token do parceiro não fornecido.");
      }

      // 1. Inicializa o cliente com o Token do Parceiro (Vendedor)
      // Isso garante que o dinheiro principal vá para a conta dele
      const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
      const payment = new Payment(client);

      // 2. Calcula comissão (15%)
      const commission = Math.round(transaction_amount * 0.15 * 100) / 100;

      // 3. Monta o corpo do pagamento
      const paymentBody = {
        transaction_amount: Number(transaction_amount),
        description: description || "Reserva Day Use",
        payment_method_id,
        application_fee: commission, // Taxa da plataforma
        payer: {
          email: payer.email,
          first_name: payer.first_name,
          last_name: payer.last_name,
          identification: payer.identification
        }
      };

      // Adiciona campos específicos de cartão se não for Pix
      if (payment_method_id !== 'pix') {
        paymentBody.token = token;
        paymentBody.installments = Number(installments);
        // issuer_id é recomendado, mas vamos simplificar para o MVP
      }

      // 4. Processa
      const result = await payment.create({ body: paymentBody });

      res.status(200).json({
        id: result.id,
        status: result.status,
        detail: result.status_detail,
        point_of_interaction: result.point_of_interaction // Necessário para o Pix (QR Code)
      });

    } catch (error) {
      console.error("Erro no Processamento:", error);
      res.status(500).json({ 
        error: 'Erro ao processar pagamento', 
        message: error.message,
        api_response: error.cause 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}