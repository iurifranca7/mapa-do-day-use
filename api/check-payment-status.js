import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// Inicialização segura do Firebase
const initFirebase = () => {
    if (admin.apps.length > 0) return admin.firestore();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    try {
        if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); 
            const credential = admin.credential.cert({ projectId, clientEmail, privateKey });
            admin.initializeApp({ credential });
        }
    } catch (e) {
        if (!e.message.includes('already exists')) throw e;
    }
    return admin.firestore();
};

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentId, ownerId } = req.body;

  if (!paymentId) {
      return res.status(400).json({ error: 'ID do pagamento ou reserva é obrigatório.' });
  }

  try {
    const db = initFirebase();
    let mpPaymentId = paymentId; 
    let currentStatus = 'pending';

    // 1. Se for ID do Firebase (string longa), busca o ID numérico do MP
    if (isNaN(paymentId)) {
        const docRef = await db.collection('reservations').doc(paymentId).get();
        if (!docRef.exists) return res.status(404).json({ error: 'Reserva não encontrada.' });
        
        const data = docRef.data();
        currentStatus = data.status; // Pega status atual do banco

        // Se já tiver ID do MP salvo, usa ele
        if (data.paymentId && !isNaN(data.paymentId)) {
            mpPaymentId = data.paymentId;
        } else {
            // Se não tem ID do MP ainda, retorna o status do banco
            return res.status(200).json({ status: data.status || 'pending', source: 'firebase' });
        }
    }

    // 2. Busca Token do Parceiro (ou usa Teste)
    let accessToken = process.env.MP_ACCESS_TOKEN_TEST; 
    if (ownerId) {
        const ownerDoc = await db.collection('users').doc(ownerId).get();
        if (ownerDoc.exists && ownerDoc.data().mp_access_token) {
            accessToken = ownerDoc.data().mp_access_token;
        }
    }

    // 3. Consulta Mercado Pago
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    
    try {
        const paymentData = await payment.get({ id: mpPaymentId });
        
        // Se mudou para aprovado, atualiza o Firebase
        if (paymentData.status === 'approved' && isNaN(paymentId)) {
            await db.collection('reservations').doc(paymentId).update({ 
                status: 'confirmed', // ou 'approved'
                updatedAt: new Date()
            });
        }

        return res.status(200).json({
            id: paymentData.id,
            status: paymentData.status,
            status_detail: paymentData.status_detail
        });

    } catch (mpError) {
        // Se deu erro no MP, retorna o status que temos no banco
        console.warn("Pagamento não encontrado no MP, retornando status local.");
        return res.status(200).json({ status: currentStatus, source: 'local_fallback' });
    }

  } catch (error) {
    console.error("Erro Check Status:", error);
    return res.status(500).json({ error: error.message });
  }
}