import { MercadoPagoConfig, Payment } from 'mercadopago';
import * as admin from 'firebase-admin';

// --- INICIALIZAÇÃO BLINDADA (Mesma dos outros arquivos) ---
function initFirebaseAdmin() {
  if (admin.apps.length > 0) return;
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
            let privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
            admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
        }
    }
  } catch (e) { console.error("Erro Firebase Init:", e); }
}

const getDb = () => admin.apps.length ? admin.firestore() : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentId, ownerId } = req.body;

  try {
    initFirebaseAdmin();
    const db = getDb();

    // 1. Define qual token usar (do Parceiro ou da Plataforma)
    let accessToken = process.env.MP_ACCESS_TOKEN; // Default

    if (ownerId && db) {
        const ownerDoc = await db.collection('users').doc(ownerId).get();
        if (ownerDoc.exists && ownerDoc.data().mp_access_token) {
            accessToken = ownerDoc.data().mp_access_token;
        }
    }

    if (!accessToken) throw new Error("Token MP não encontrado.");

    // 2. Consulta Status no Mercado Pago
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    
    const paymentData = await payment.get({ id: paymentId });

    return res.status(200).json({
        id: paymentData.id,
        status: paymentData.status, // 'approved', 'pending', etc.
        status_detail: paymentData.status_detail
    });

  } catch (error) {
    console.error("Erro Check Status:", error);
    return res.status(500).json({ error: error.message });
  }
}