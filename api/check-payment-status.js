import { MercadoPagoConfig, Payment } from 'mercadopago';
import * as admin from 'firebase-admin';

// --- INICIALIZAÇÃO FIREBASE (Mesma lógica segura do processamento) ---
const initFirebase = () => {
  if (admin.apps.length > 0) return admin.firestore();

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const buffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(buffer.toString('utf-8'))) });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    } else {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
        if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
            admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
        }
    }
  } catch (e) { console.error("Erro Firebase Init:", e); }
  
  return admin.firestore();
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentId, ownerId } = req.body;

  try {
    const db = initFirebase();

    // 1. Define qual token usar
    // Se tiver ownerId (Venda com Split), busca o token do parceiro
    let accessToken = process.env.MP_ACCESS_TOKEN; // Default (Plataforma)

    if (ownerId && db) {
        const ownerDoc = await db.collection('users').doc(ownerId).get();
        if (ownerDoc.exists && ownerDoc.data().mp_access_token) {
            accessToken = ownerDoc.data().mp_access_token;
            console.log("🔍 Verificando na conta do Parceiro:", ownerId);
        }
    }

    if (!accessToken) throw new Error("Token MP não encontrado para consulta.");

    // 2. Consulta Status no Mercado Pago
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    
    const paymentData = await payment.get({ id: paymentId });

    return res.status(200).json({
        id: paymentData.id,
        status: paymentData.status, // approved, pending, rejected
        status_detail: paymentData.status_detail
    });

  } catch (error) {
    console.error("Erro Check Status:", error);
    return res.status(500).json({ error: error.message });
  }
}