import { MercadoPagoConfig, Payment } from 'mercadopago';

// Inicializa o cliente do Mercado Pago com a chave secreta definida no .env
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

export default async function handler(req, res) {
  // --- Configuração de CORS ---
  // Permite que o seu frontend (em qualquer domínio) acesse esta API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responde imediatamente a requisições OPTIONS (preflight do navegador)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Processa apenas requisições POST
  if (req.method === 'POST') {
    try {
      // Instancia o objeto de pagamento
      const payment = new Payment(client);
      
      // O corpo da requisição (req.body) contém os dados criptografados enviados pelo Brick no frontend
      const body = req.body;

      // Envia os dados para o Mercado Pago criar a cobrança
      const result = await payment.create({ body });

      // Retorna o resultado para o frontend (se foi aprovado, recusado ou está pendente)
      res.status(200).json({
        id: result.id,
        status: result.status,
        detail: result.status_detail,
      });
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      res.status(500).json({ 
        error: 'Erro ao processar pagamento no Mercado Pago', 
        details: error.message 
      });
    }
  } else {
    // Retorna erro se o método não for POST
    res.status(405).json({ error: 'Method not allowed' });
  }
}