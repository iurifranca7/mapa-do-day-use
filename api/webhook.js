export default async function handler(req, res) {
  // Configuração CORS (Padrão para APIs na Vercel)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // O Mercado Pago envia os dados via POST
  if (req.method === 'POST') {
    try {
      const notification = req.body;
      
      // Log para você ver o que chegou no painel da Vercel
      console.log("🔔 Webhook Recebido:", notification);

      // Aqui futuramente você pode adicionar a lógica para atualizar o Firebase
      // Ex: Se notification.action === 'payment.updated', buscar o status novo e salvar.

      // É CRUCIAL responder 200 ou 201 para o Mercado Pago saber que você recebeu.
      // Se não responder, ele vai ficar tentando enviar e dar erro.
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Erro no Webhook:", error);
      res.status(500).json({ error: 'Erro interno' });
    }
  } else {
    // Qualquer outro método (GET, PUT) recebe 405
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}