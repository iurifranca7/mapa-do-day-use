import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// Função auxiliar para inicializar o Firebase de forma segura (Igual ao process-payment.js)
const initFirebase = () => {
    if (admin.apps.length > 0) return admin.firestore();

    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    let credential;

    try {
        if (serviceAccountBase64) {
            const buffer = Buffer.from(serviceAccountBase64, 'base64');
            const serviceAccount = JSON.parse(buffer.toString('utf-8'));
            credential = admin.credential.cert(serviceAccount);
        } else if (serviceAccountJSON) {
            const serviceAccount = JSON.parse(serviceAccountJSON);
            credential = admin.credential.cert(serviceAccount);
        } else if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); 
            credential = admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            });
        }
    } catch (parseError) {
        throw new Error(`Falha ao ler credenciais do Firebase: ${parseError.message}`);
    }

    if (!credential) {
        throw new Error("Nenhuma credencial do Firebase encontrada nas Variáveis de Ambiente.");
    }

    try {
        admin.initializeApp({ credential });
    } catch (e) {
        if (!e.message.includes('already exists')) {
             throw e;
        }
    }

    return admin.firestore();
};

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentId, ownerId } = req.body;

  if (!paymentId) return res.status(400).json({ error: 'ID do pagamento é obrigatório.' });

  try {
    const db = initFirebase();

    // 1. Define qual token usar (do Parceiro ou da Plataforma)
    let accessToken = process.env.MP_ACCESS_TOKEN; // Começa com o da plataforma

    // Se tiver ownerId, busca o token específico do parceiro no banco
    if (ownerId) {
        try {
            const ownerDoc = await db.collection('users').doc(ownerId).get();
            if (ownerDoc.exists && ownerDoc.data().mp_access_token) {
                accessToken = ownerDoc.data().mp_access_token;
            }
        } catch (dbError) {
            console.warn("Aviso: Não foi possível buscar token do parceiro. Usando fallback.", dbError);
        }
    }

    if (!accessToken) throw new Error("Token MP não encontrado para consulta.");

    // 2. Consulta Status no Mercado Pago
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    
    const paymentData = await payment.get({ id: paymentId });

    return res.status(200).json({
        id: paymentData.id,
        status: paymentData.status, // 'approved', 'pending', 'rejected'
        status_detail: paymentData.status_detail
    });

  } catch (error) {
    console.error("Erro Check Status:", error);
    // Retorna JSON legível para debugging
    return res.status(500).json({ 
        error: 'Erro na verificação', 
        message: error.message || 'Erro interno no servidor.',
        details: error.cause 
    });
  }
}