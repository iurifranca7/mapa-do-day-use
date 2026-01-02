import { MailtrapClient } from "mailtrap";
import * as admin from 'firebase-admin';

// Variável para capturar o erro exato da inicialização
let initError = null;

// --- INICIALIZAÇÃO BLINDADA DO FIREBASE ADMIN ---
if (!admin.apps.length) {
  try {
    // 1. Tenta via BASE64 (A PROVA DE FALHAS DE FORMATAÇÃO)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const buffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
        const serviceAccount = JSON.parse(buffer.toString('utf-8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin (Email) iniciado via Base64.");
    } 
    // 2. Tenta via Variável JSON (Legado)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin (Email) iniciado via JSON.");
    } 
    // 3. Fallback para variáveis individuais (Legado)
    else {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKeyRaw) {
            let privateKey = privateKeyRaw.replace(/\\n/g, '\n');
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.slice(1, -1);
            }

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log("✅ Firebase Admin (Email) iniciado via Chaves.");
        } else {
            initError = "Variáveis de ambiente (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY) estão faltando ou vazias.";
            console.error("❌ " + initError);
        }
    }
  } catch (e) { 
      console.error("❌ Erro fatal ao iniciar Firebase Admin (Email):", e.message); 
      initError = e.message; // Captura a mensagem real do erro
  }
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

  // Verificações de segurança antes de prosseguir
  if (!admin.apps.length) {
      return res.status(500).json({ 
          error: 'Erro Crítico de Configuração', 
          message: 'O Firebase Admin não conseguiu inicializar.',
          details: initError || 'Verifique os logs do servidor.'
      });
  }
  if (!TOKEN) {
      return res.status(500).json({ error: 'Erro de Configuração: MAILTRAP_TOKEN ausente.' });
  }

  const { email, type, name, newEmail } = req.body;
  const targetEmail = newEmail || email;

  try {
    const auth = admin.auth();
    let link = '';
    let subject = '';
    let htmlContent = '';

    const actionCodeSettings = {
        url: 'https://mapadodayuse.com/profile',
        handleCodeInApp: true,
    };

    console.log(`Gerando link do tipo ${type} para ${targetEmail}...`);

    if (type === 'reset_password') {
        link = await auth.generatePasswordResetLink(targetEmail, actionCodeSettings);
        subject = "Redefinição de Senha - Mapa do Day Use";
        htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0097A8; margin-top: 0;">Redefinição de Senha</h2>
                <p>Olá, <strong>${name || 'Viajante'}</strong>!</p>
                <p>Recebemos uma solicitação para alterar sua senha no <strong>Mapa do Day Use</strong>.</p>
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${link}" style="background-color: #0097A8; color: white; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Redefinir Minha Senha</a>
                </div>
                <p style="font-size: 12px; color: #777;">Se você não solicitou essa alteração, nenhuma ação é necessária.</p>
            </div>
        `;
    } else if (type === 'verify_email' || type === 'update_email') {
        link = await auth.generateEmailVerificationLink(targetEmail, actionCodeSettings);
        subject = "Confirme seu E-mail - Mapa do Day Use";
        htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0097A8; margin-top: 0;">Bem-vindo(a) ao Mapa do Day Use!</h2>
                <p>Por favor, confirme seu endereço de e-mail para garantir a segurança da sua conta.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${link}" style="background-color: #0097A8; color: white; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Confirmar E-mail</a>
                </div>
            </div>
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

    console.log("✅ E-mail enviado com sucesso.");
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("❌ Erro Auth Email:", error);
    return res.status(500).json({ error: error.message });
  }
}