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

  // Recebe paymentId (pode ser MP ID ou Firebase Doc ID) e ownerId (opcional)
  let { paymentId, ownerId } = req.body;

  if (!paymentId) return res.status(400).json({ error: 'ID é obrigatório.' });

  try {
    const db = initFirebase();
    let mpPaymentId = paymentId; // Assume que é o ID numérico inicialmente

    // --- CORREÇÃO DE ID (Inteligência Híbrida) ---
    // Se o ID não for apenas números (ou seja, é um ID do Firebase tipo "Nvt5...")
    if (isNaN(paymentId)) {
        console.log(`🔄 Recebido ID Firebase (${paymentId}). Buscando ID Real do MP...`);
        
        const docRef = await db.collection('reservations').doc(paymentId).get();
        
        if (!docRef.exists) {
            return res.status(404).json({ error: 'Reserva não encontrada no sistema.' });
        }

        const data = docRef.data();
        
        // Tenta pegar o ID do pagamento dentro da reserva
        // O regex remove prefixos como "PIX-" se existirem
        if (data.paymentId) {
            mpPaymentId = data.paymentId.toString().replace(/^(FRONT_|PIX-|CARD_)/, '');
        } else {
            // Se ainda não tem paymentId salvo, retorna pendente (usuário acabou de criar)
            return res.status(200).json({ status: 'pending', status_detail: 'waiting_creation' });
        }

        // Se não veio ownerId no body, pega da reserva para garantir o token certo
        if (!ownerId && data.ownerId) {
            ownerId = data.ownerId;
        }
    }

    // --- SELEÇÃO DE TOKEN ---
    let accessToken = process.env.MP_ACCESS_TOKEN; // Default: Plataforma

    if (ownerId) {
        try {
            const ownerDoc = await db.collection('users').doc(ownerId).get();
            if (ownerDoc.exists && ownerDoc.data().mp_access_token) {
                accessToken = ownerDoc.data().mp_access_token;
            }
        } catch (dbError) {
            console.warn("Falha ao buscar token do parceiro, usando padrão.", dbError);
        }
    }

    if (!accessToken) throw new Error("Token MP não configurado.");

    // --- CONSULTA MERCADO PAGO ---
    // Agora temos certeza que mpPaymentId é numérico
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    
    //console.log(`🔍 Consultando MP ID: ${mpPaymentId}`);
    const paymentData = await payment.get({ id: mpPaymentId });

    // Se aprovado, podemos até atualizar o Firebase aqui para garantir sincronia
    if (paymentData.status === 'approved' && isNaN(paymentId)) {
        // Atualiza status se veio pelo ID do Firebase
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
    
    // Se erro for 404 do MP, é porque o pagamento ainda não propagou ou ID está errado
    if (error.status === 404 || error.message.includes('not found')) {
         return res.status(200).json({ status: 'pending', status_detail: 'not_found_yet' });
    }

    return res.status(500).json({ 
        error: 'Erro na verificação', 
        message: error.message 
    });
  }
}