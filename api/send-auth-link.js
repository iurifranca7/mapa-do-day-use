import { MailtrapClient } from "mailtrap";
import * as admin from 'firebase-admin';

// --- INICIALIZAÇÃO BLINDADA DO FIREBASE ADMIN ---
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '');
        if(privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
        }
    }
  } catch (e) { console.error("Erro Firebase Admin:", e); }
}

const TOKEN = process.env.MAILTRAP_TOKEN;
const SENDER_EMAIL = "noreply@mapadodayuse.com"; 

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verificação de segurança
  if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase Admin not initialized' });
  }

  const { email, type, name, newEmail } = req.body;
  const targetEmail = newEmail || email;

  try {
    const auth = admin.auth();
    let link = '';
    let subject = '';
    let htmlContent = '';

    const actionCodeSettings = {
        url: 'https://mapadodayuse.com/profile', // Redireciona para o site
        handleCodeInApp: true,
    };

    if (type === 'reset_password') {
        link = await auth.generatePasswordResetLink(targetEmail, actionCodeSettings);
        subject = "Redefinição de Senha - Mapa do Day Use";
        htmlContent = `
            <h3>Olá, ${name || 'Viajante'}!</h3>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p>Clique no botão abaixo para criar uma nova:</p>
            <a href="${link}" style="background:#0097A8; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Redefinir Senha</a>
            <p style="font-size:12px; color:#666; margin-top:20px;">Se não foi você, ignore este e-mail.</p>
        `;
    } else if (type === 'verify_email' || type === 'update_email') {
        link = await auth.generateEmailVerificationLink(targetEmail, actionCodeSettings);
        subject = "Confirme seu E-mail - Mapa do Day Use";
        htmlContent = `
            <h3>Bem-vindo(a) ao Mapa do Day Use!</h3>
            <p>Por favor, confirme seu e-mail para garantir a segurança da sua conta.</p>
            <a href="${link}" style="background:#0097A8; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Confirmar E-mail</a>
        `;
    } else {
        return res.status(400).json({ error: "Tipo inválido" });
    }

    const client = new MailtrapClient({ token: TOKEN });
    
    await client.send({
      from: { name: "Equipe Mapa do Day Use", email: SENDER_EMAIL },
      to: [{ email: targetEmail }],
      subject: subject,
      html: htmlContent,
      category: "Authentication",
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Erro Auth Email:", error);
    return res.status(500).json({ error: error.message });
  }
}