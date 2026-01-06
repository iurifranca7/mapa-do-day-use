import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';
import * as admin from 'firebase-admin';

// Função auxiliar para inicializar o Firebase de forma segura (Padronizada)
function initFirebaseAdmin() {
  if (admin.apps.length > 0) return; // Já inicializado

  // 1. Tenta via BASE64 (Prioridade - Mais seguro para Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      try {
        const buffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
        const serviceAccount = JSON.parse(buffer.toString('utf-8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin (Refund) iniciado via Base64.");
        return;
      } catch (e) {
        console.warn(`⚠️ Falha ao ler FIREBASE_SERVICE_ACCOUNT_BASE64: ${e.message}`);
      }
  } 
  
  // 2. Tenta via Variável JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin (Refund) iniciado via JSON.");
        return;
      } catch (e) {
         console.warn(`⚠️ Falha ao ler FIREBASE_SERVICE_ACCOUNT: ${e.message}`);
      }
  } 
  
  // 3. Variáveis Individuais (Foco da solicitação atual)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyRaw) {
      try {
        let privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        // Remove aspas extras se houver (erro comum ao copiar do JSON)
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
        console.log("✅ Firebase Admin (Refund) iniciado via Chaves Individuais.");
        return;
      } catch (e) {
          throw new Error(`Erro ao inicializar com chaves individuais: ${e.message}`);
      }
  }

  // Diagnóstico detalhado se falhar
  const missing = [];
  if (!projectId) missing.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKeyRaw) missing.push("FIREBASE_PRIVATE_KEY");

  throw new Error(`Nenhuma credencial do Firebase válida encontrada. Variáveis ausentes: ${missing.join(', ')}`);
}

const db = admin.apps.length ? admin.firestore() : null; // Define db globalmente se já estiver ativo, senão pega no handler

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Inicializa Firebase
    initFirebaseAdmin();
    const firestore = admin.firestore();

    const { reservationId, action, percentage, newDate } = req.body;
    // action: 'reschedule', 'cancel_full', 'cancel_partial'

    console.log(`Processando ação: ${action} para reserva ${reservationId}`);

    const resRef = firestore.collection('reservations').doc(reservationId);
    const resDoc = await resRef.get();
    
    if (!resDoc.exists) throw new Error("Reserva não encontrada.");
    const reservation = resDoc.data();

    // Ação: Reagendar (Apenas banco de dados)
    if (action === 'reschedule') {
        await resRef.update({ date: newDate, updatedAt: new Date() });
        return res.status(200).json({ success: true, message: "Data alterada com sucesso." });
    }

    // Ação: Cancelamento (Envolve Mercado Pago)
    if (action.includes('cancel')) {
        // Validação: Se não tiver Payment ID, cancela apenas no banco (sem reembolso financeiro)
        if (!reservation.paymentId || reservation.paymentId === "MANUAL_OR_LEGACY") {
             console.warn("Reserva sem ID de pagamento válido. Cancelando apenas registro local.");
             await resRef.update({ status: 'cancelled', cancelledAt: new Date(), note: 'Cancelado sem estorno automático (ID de pagamento ausente).' });
             return res.status(200).json({ success: true, message: "Reserva cancelada (Sem estorno automático disponível)." });
        }

        // Busca token do parceiro para autorizar o estorno
        const ownerDoc = await firestore.collection('users').doc(reservation.ownerId).get();
        const partnerToken = ownerDoc.data()?.mp_access_token;

        if (!partnerToken) throw new Error("Token do parceiro não encontrado. O parceiro precisa reconectar a conta MP.");

        const client = new MercadoPagoConfig({ accessToken: partnerToken });
        const refund = new PaymentRefund(client);

        let refundAmount;
        if (action === 'cancel_full') {
            refundAmount = undefined; // MP entende como total se omitido
        } else {
            // Reembolso Parcial
            refundAmount = Number((reservation.total * (percentage / 100)).toFixed(2));
        }

        console.log(`Solicitando reembolso MP: ${reservation.paymentId}, Valor: ${refundAmount || 'Total'}`);

        // Executa estorno no MP
        await refund.create({
            payment_id: reservation.paymentId,
            body: refundAmount ? { amount: refundAmount } : {}
        });

        // Atualiza status no banco
        await resRef.update({
            status: 'cancelled',
            refundStatus: action === 'cancel_full' ? 'full' : 'partial',
            refundedAmount: refundAmount || reservation.total,
            cancelledAt: new Date()
        });

        return res.status(200).json({ success: true, message: "Cancelamento e estorno realizados com sucesso." });
    }

  } catch (error) {
    console.error("Erro Refund:", error);
    // Retorna JSON legível em vez de crashar
    return res.status(500).json({ 
        error: 'Erro ao processar', 
        message: error.message || 'Erro interno no servidor.',
        details: error.cause // Detalhes do MP se houver
    });
  }
}