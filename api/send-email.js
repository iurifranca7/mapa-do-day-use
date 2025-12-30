import { MailtrapClient } from "mailtrap";

const TOKEN = process.env.MAILTRAP_TOKEN; // Vamos configurar isso na Vercel depois
const SENDER_EMAIL = "noreply@mapadodayuse.com"; // Seu e-mail verificado no Mailtrap

export default async function handler(req, res) {
  // 1. Configuração de Segurança (CORS) - Permite que seu site use essa API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Faltam dados: to, subject ou html' });
    }

    try {
      const client = new MailtrapClient({ token: TOKEN });

      await client.send({
        from: { name: "Mapa do Day Use", email: SENDER_EMAIL },
        to: [{ email: to }],
        subject: subject,
        text: text || "Visualize este e-mail em um navegador compatível com HTML.",
        html: html,
        category: "Transactional",
      });

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error("Erro Mailtrap:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}