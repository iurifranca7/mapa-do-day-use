import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';
import * as admin from 'firebase-admin';

// Variável para capturar erro de inicialização
let initError = null;

// --- INICIALIZAÇÃO BLINDADA (Igual ao process-payment.js) ---
if (!admin.apps.length) {
  try {
    // 1. Tenta via Variável JSON (Legado/Backup)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin (Refund) iniciado via JSON.");
    } 
    // 2. Tenta via Variáveis Individuais (Seu caso atual)
    else {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKeyRaw) {
            // Tratamento robusto para a chave privada (Obrigatório na Vercel)
            let privateKey = privateKeyRaw.replace(/\\n/g, '\n');
            
            // Remove aspas extras se houver
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
            console.log("✅ Firebase Admin (Refund) iniciado via Chaves.");
        } else {
            initError = "Variáveis de ambiente (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY) estão faltando.";
            console.error("❌ " + initError);
        }
    }
  } catch (e) { 
      console.error("❌ Erro fatal ao iniciar Firebase Admin (Refund):", e.message); 
      initError = e.message;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verificação de Segurança
  if (!admin.apps.length) {
      return res.status(500).json({ 
          error: 'Erro Crítico de Configuração', 
          message: 'O Firebase Admin não conseguiu inicializar.',
          details: initError || 'Verifique os logs da Vercel.'
      });
  }

  const { reservationId, action, percentage, newDate } = req.body;
  const db = admin.firestore();

  try {
    const resRef = db.collection('reservations').doc(reservationId);
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
        // Validação: Se não tiver Payment ID, cancela apenas no banco
        if (!reservation.paymentId || reservation.paymentId === "MANUAL_OR_LEGACY" || reservation.paymentId.startsWith("FAKE")) {
             console.warn("Reserva sem ID de pagamento válido. Cancelando apenas registro local.");
             await resRef.update({ status: 'cancelled', cancelledAt: new Date(), note: 'Cancelado sem estorno automático (ID de pagamento inválido ou manual).' });
             return res.status(200).json({ success: true, message: "Reserva cancelada no sistema (Sem estorno financeiro)." });
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