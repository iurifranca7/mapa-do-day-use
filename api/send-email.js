import { MailtrapClient } from "mailtrap";

// Inicializa o cliente FORA do handler para reutilizar a conexão
const TOKEN = process.env.MAILTRAP_TOKEN;
const ENDPOINT = process.env.MAILTRAP_ENDPOINT || "https://send.api.mailtrap.io/"; // Use o endpoint correto se for Sandbox

const client = new MailtrapClient({ token: TOKEN });

export default async function handler(req, res) {
  // 1. Configuração de CORS (Obrigatório para React falar com Vercel)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Ou coloque 'https://mapadodayuse.com'
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responde ao "pre-flight" do navegador
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Dados incompletos (to, subject, html)' });
    }

    // 2. Quem está enviando?
    // IMPORTANTE: No Mailtrap Produção, este e-mail DEVE ser do domínio verificado no painel deles.
    // Ex: nao-responda@mapadodayuse.com
    const sender = {
      email: "noreply@mapadodayuse.com", // <--- TROQUE PELO SEU EMAIL VERIFICADO NO MAILTRAP
      name: "Mapa do Day Use",
    };

    const recipients = [
      {
        email: to,
      }
    ];

    // 3. Envia usando o SDK
    console.log(`📨 Tentando enviar email para ${to}...`);
    
    const response = await client.send({
      from: sender,
      to: recipients,
      subject: subject,
      html: html,
      category: "Integration Test",
    });

    console.log("✅ Email enviado!", response);
    return res.status(200).json({ success: true, id: response.message_ids });

  } catch (error) {
    console.error("❌ Erro Mailtrap:", error);
    // Retorna o erro real para o console do navegador
    return res.status(500).json({ error: error.message || "Erro desconhecido ao enviar email" });
  }
}