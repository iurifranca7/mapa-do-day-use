import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
  // 1. Configuração de CORS (Permite que o seu front-end converse com essa API)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Em produção, troque '*' pelo seu domínio (ex: 'https://mapadodayuse.com')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responde imediatamente a requisições OPTIONS (Preflight do navegador)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Apenas aceita método POST
  if (req.method === 'POST') {
    try {
      // Recebe os dados enviados pelo Front-end
      // formData: Dados criptografados do cartão/pix vindos do Brick
      // partnerAccessToken: Token do dono do Day Use (para onde vai o dinheiro)
      // amount: Valor final a ser cobrado (já com desconto de cupom, se houver)
      const { formData, partnerAccessToken, amount } = req.body;

      if (!partnerAccessToken) {
        throw new Error("Token do parceiro não fornecido. O estabelecimento precisa conectar a conta.");
      }

      // 3. Inicializa o Mercado Pago agindo COMO O PARCEIRO
      // Isso é fundamental para o Split: quem vende é o parceiro, não a plataforma.
      const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
      const payment = new Payment(client);

      // 4. Calcula a sua comissão (15%)
      // O Mercado Pago desconta isso do valor total e envia para a conta da plataforma
      const commission = Math.round(amount * 0.15 * 100) / 100;

      // 5. Monta o objeto de pagamento
      const paymentBody = {
        ...formData, // Espalha os dados seguros do Brick (token, parcelas, método, etc.)
        transaction_amount: Number(amount), // Garante que o valor cobrado é o correto
        application_fee: commission,        // Define sua taxa de marketplace
        description: "Reserva Day Use - Viajante", // Descrição na fatura
        payer: {
          ...formData.payer,
          // Garante que haja um e-mail, mesmo que o Brick não tenha enviado (fallback)
          email: formData.payer.email || "email_generico@mapadodayuse.com" 
        }
      };

      // 6. Envia para o Mercado Pago
      const result = await payment.create({ body: paymentBody });

      // 7. Retorna o sucesso para o Front-end
      res.status(200).json({
        id: result.id,
        status: result.status,
        detail: result.status_detail,
      });

    } catch (error) {
      console.error("Erro no Processamento:", error);
      
      // Retorna erro detalhado para facilitar o debug no Front
      res.status(500).json({ 
        error: 'Erro ao processar pagamento', 
        message: error.message,
        details: error.cause 
      });
    }
  } else {
    // Bloqueia outros métodos (GET, PUT, etc.)
    res.status(405).json({ error: 'Method not allowed' });
  }
}