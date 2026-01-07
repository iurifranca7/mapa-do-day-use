import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';
import * as admin from 'firebase-admin';

// --- INICIALIZAÇÃO SIMPLIFICADA (DIRETA) ---
if (!admin.apps.length) {
  try {
    // Tenta inicializar usando apenas as variáveis individuais
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Usa a chave exatamente como veio da variável de ambiente
                // Se você copiou com aspas ou sem tratamento de linha, o erro aparecerá no log
                privateKey: process.env.FIREBASE_PRIVATE_KEY,
            }),
        });
        
        console.log("✅ Firebase Admin (Refund) iniciado com variáveis individuais.");
    } else {
        console.error("❌ Variáveis de ambiente do Firebase ausentes (PROJECT_ID, CLIENT_EMAIL ou PRIVATE_KEY).");
    }
  } catch (e) {
    console.error("❌ Erro fatal na inicialização do Firebase:", e.message);
  }
}

// Define db globalmente
const db = admin.apps.length ? admin.firestore() : null; 

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verificação básica se o DB subiu
  if (!db) {
      return res.status(500).json({ 
          error: 'Server Configuration Error', 
          message: 'Firebase Admin não inicializado. Verifique os logs da Vercel.' 
      });
  }

  try {
    const { reservationId, action, percentage, newDate } = req.body;
    // action: 'reschedule', 'cancel_full', 'cancel_partial'

    console.log(`Processando ação: ${action} para reserva ${reservationId}`);

    const resRef = db.collection('reservations').doc(reservationId);
    const resDoc = await resRef.get();
    
    if (!resDoc.exists) throw new Error("Reserva não encontrada.");
    const reservation = resDoc.data();

    // --- REAGENDAMENTO ---
    if (action === 'reschedule') {
        await resRef.update({ date: newDate, updatedAt: new Date() });
        return res.status(200).json({ success: true, message: "Data alterada com sucesso." });
    }

    // --- CANCELAMENTO E ESTORNO ---
    if (action.includes('cancel')) {
        // Validação: Se não tiver Payment ID
        if (!reservation.paymentId || reservation.paymentId === "MANUAL_OR_LEGACY" || reservation.paymentId.startsWith("FAKE")) {
             console.warn("Reserva sem ID de pagamento válido. Cancelando apenas no banco.");
             await resRef.update({ status: 'cancelled', cancelledAt: new Date(), note: 'Cancelado sem estorno automático (ID inválido).' });
             return res.status(200).json({ success: true, message: "Reserva cancelada (Sem estorno financeiro automático)." });
        }

        // Busca token do parceiro para autorizar o estorno
        const ownerDoc = await db.collection('users').doc(reservation.ownerId).get();
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
    return res.status(500).json({ 
        error: 'Erro ao processar', 
        message: error.message || 'Erro interno no servidor.',
        details: error.cause 
    });
  }
}