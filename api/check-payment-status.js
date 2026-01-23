import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// Inicialização segura do Firebase
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
            credential = admin.credential.cert({ projectId, clientEmail, privateKey });
        }
    } catch (parseError) {
        throw new Error(`Falha credenciais Firebase: ${parseError.message}`);
    }

    if (!credential) throw new Error("Credenciais Firebase não encontradas.");

    try {
        admin.initializeApp({ credential });
    } catch (e) {
        if (!e.message.includes('already exists')) throw e;
    }

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

  let { paymentId, ownerId } = req.body;

  if (!paymentId) return res.status(400).json({ error: 'ID é obrigatório.' });

  try {
    const db = initFirebase();
    let mpPaymentId = paymentId; 

    // --- CORREÇÃO DE ID (Híbrido) ---
    // Se o ID não for numérico (ex: ID do Firebase), buscamos o ID real
    if (isNaN(paymentId)) {
        const docRef = await db.collection('reservations').doc(paymentId).get();
        
        if (!docRef.exists) {
            return res.status(404).json({ error: 'Reserva não encontrada.' });
        }

        const data = docRef.data();
        if (data.paymentId) {
            mpPaymentId = data.paymentId.toString().replace(/^(FRONT_|PIX-|CARD_)/, '');
        } else {
            return res.status(200).json({ status: 'pending', status_detail: 'waiting_creation' });
        }

        if (!ownerId && data.ownerId) ownerId = data.ownerId;
    }

    // --- SELEÇÃO DE TOKEN ---
    let accessToken = process.env.MP_ACCESS_TOKEN; 

    if (ownerId) {
        try {
            const ownerDoc = await db.collection('users').doc(ownerId).get();
            if (ownerDoc.exists && ownerDoc.data().mp_access_token) {
                accessToken = ownerDoc.data().mp_access_token;
            }
        } catch (dbError) {
            console.warn("Falha ao buscar token do parceiro.", dbError);
        }
    }

    if (!accessToken) throw new Error("Token MP não configurado.");

    // --- CONSULTA MERCADO PAGO ---
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    
    const paymentData = await payment.get({ id: mpPaymentId });

    // Atualiza Firebase se aprovado
    if (paymentData.status === 'approved' && isNaN(paymentId)) {
        await db.collection('reservations').doc(paymentId).update({ 
            status: 'approved',
            updatedAt: new Date()
        });
    }

    return res.status(200).json({
        id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail
    });

  } catch (error) {
    console.error(`❌ Erro Check Status (ID: ${paymentId}):`, error.message);
    if (error.status === 404 || error.message.includes('not found')) {
         return res.status(200).json({ status: 'pending', status_detail: 'not_found_yet' });
    }
    return res.status(500).json({ error: 'Erro na verificação', message: error.message });
  }
}