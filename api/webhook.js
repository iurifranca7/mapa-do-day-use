export default async function handler(req, res) {
  // Configuração CORS (Essencial para APIs na Vercel)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  // Responde rápido para o ping do Mercado Pago (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Mercado Pago envia notificações via POST
  if (req.method === 'POST') {
    try {
      const notification = req.body;
      
      // Log para você monitorar no dashboard da Vercel -> Logs
      console.log("🔔 Webhook MP Recebido:", JSON.stringify(notification, null, 2));

      // AQUI VOCÊ PODE IMPLEMENTAR LÓGICA FUTURA
      // Ex: Se notification.type === 'payment', buscar o status no MP e atualizar o Firebase.
      
      // Resposta OBRIGATÓRIA de sucesso para o Mercado Pago não reenviar
      return res.status(200).json({ received: true });

    } catch (error) {
      console.error("❌ Erro no Webhook:", error);
      // Mesmo com erro interno, respondemos 200 para o MP não ficar tentando infinitamente (loop de erro)
      // O log acima vai te avisar do problema.
      return res.status(200).json({ error: 'Internal logic error, handled.' });
    }
  }

  // Bloqueia outros métodos
  return res.status(405).json({ error: 'Method Not Allowed' });
}