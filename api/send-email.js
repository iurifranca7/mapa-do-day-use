import { MailtrapClient } from "mailtrap";

const TOKEN = process.env.MAILTRAP_TOKEN;
const SENDER_EMAIL = "noreply@mapadodayuse.com"; 

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!TOKEN) {
      return res.status(500).json({ error: 'MAILTRAP_TOKEN não configurado.' });
  }

  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Faltam dados (to, subject, html).' });
  }

  try {
    const client = new MailtrapClient({ token: TOKEN });
    
    await client.send({
      from: { name: "Mapa do Day Use", email: SENDER_EMAIL },
      to: [{ email: to }],
      subject: subject,
      html: html,
      category: "Notification",
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    return res.status(500).json({ error: error.message });
  }
}