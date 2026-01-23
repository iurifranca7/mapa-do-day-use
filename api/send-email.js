import { MailtrapClient } from 'mailtrap';

export default async function handler(req, res) {
  // CORS (Permite que o frontend chame esta API)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, subject, html } = req.body;
  const token = process.env.MAILTRAP_TOKEN;

  if (!token) {
      console.error("❌ Erro: MAILTRAP_TOKEN não configurado no .env");
      return res.status(500).json({ error: 'Mailtrap Token missing' });
  }

  try {
    const client = new MailtrapClient({ token });
    const sender = { email: "mailtrap@demomailtrap.com", name: "Mapa do Day Use" };

    console.log(`📨 Tentando enviar email para: ${to}`);

    await client.send({
      from: sender,
      to: [{ email: to }],
      subject: subject,
      html: html,
      category: "Transactional"
    });

    console.log("✅ Email enviado com sucesso!");
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("❌ Erro Mailtrap:", error);
    return res.status(500).json({ error: error.message });
  }
}