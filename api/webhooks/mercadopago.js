import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE (SINGLETON)
// ==================================================================
const initFirebase = () => {
    if (admin.apps.length > 0) return admin.firestore();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    try {
        if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
            admin.initializeApp({
                credential: admin.credential.cert({ projectId, clientEmail, privateKey })
            });
        }
    } catch (e) {
        console.error("❌ Erro Firebase Webhook:", e);
    }
    return admin.firestore();
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).end();

    try {
        const db = initFirebase();
        const { type, data, action } = req.body;

        console.log(`🔔 [WEBHOOK] Evento recebido: ${action || type}`);

        // ==================================================================
        // CASO 1: ATUALIZAÇÃO DE PAGAMENTO (O que já tínhamos)
        // ==================================================================
        if (type === 'payment' || action?.startsWith('payment.')) {
            // ... (Mantenha sua lógica anterior de atualização de pagamento aqui) ...
            // Vou focar no novo fluxo abaixo
            return await handlePaymentUpdate(db, data.id);
        }

        // ==================================================================
        // CASO 2: CONTESTAÇÃO / DISPUTA (NOVO 🔥)
        // ==================================================================
        // O MP manda 'chargebacks' ou 'dispute' dependendo da versão
        if (type === 'chargeback' || action?.startsWith('dispute.') || topic === 'chargebacks') {
            const disputeId = data.id;
            console.warn(`🚨 [CHARGEBACK] Disputa iniciada! ID: ${disputeId}`);
            
            // Nota: O Webhook de disputa do MP às vezes manda o ID da Disputa, não do Pagamento.
            // Precisamos buscar detalhes da disputa para achar o payment_id.
            // Como isso varia por conta, a estratégia mais segura é buscar a reserva pelo ID da transação
            // se ele vier no payload, ou varrer o banco se necessário.
            
            // Mas, geralmente, o MP também manda um 'payment.updated' com status 'charged_back'.
            // Então, a função handlePaymentUpdate abaixo já vai capturar isso se o status mudar.
            
            return res.status(200).json({ received: true });
        }

        return res.status(200).json({ message: "Event ignored" });

    } catch (error) {
        console.error("❌ Erro Webhook:", error);
        return res.status(200).json({ error: error.message }); // 200 para não travar fila
    }
}

// ==================================================================
// FUNÇÃO AUXILIAR DE PROCESSAMENTO (Reutiliza lógica e trata Chargeback)
// ==================================================================
async function handlePaymentUpdate(db, paymentId) {
    
    // 1. Busca a Reserva
    const snapshot = await db.collection('reservations').where('paymentId', '==', String(paymentId)).limit(1).get();
    
    if (snapshot.empty) {
        console.log("Reserva não encontrada para este pagamento.");
        return { message: "Not found" };
    }

    const docRef = snapshot.docs[0].ref;
    const reservation = snapshot.docs[0].data();
    const ownerId = reservation.ownerId;

    // 2. Busca Token do Parceiro
    const ownerDoc = await db.collection('users').doc(ownerId).get();
    const partnerAccessToken = ownerDoc.data()?.mp_access_token;

    if (!partnerAccessToken) throw new Error("Token do parceiro não encontrado.");

    // 3. Consulta Status Real no MP
    const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });
    
    const status = paymentData.status; // approved, charged_back, in_mediation
    const statusDetail = paymentData.status_detail; // chargeback_initiated

    console.log(`✅ [SYNC] Status Atual: ${status} (${statusDetail})`);

    // 4. Lógica de Atualização
    let newSystemStatus = reservation.status;
    let alertAdmin = false;

    // 🔥 DETECÇÃO DE CONTESTAÇÃO 🔥
    if (status === 'charged_back' || status === 'in_mediation') {
        newSystemStatus = 'disputed'; // Bloqueia o ingresso
        alertAdmin = true;
    } else if (status === 'approved') {
        newSystemStatus = 'confirmed';
    } else if (status === 'refunded') {
        newSystemStatus = 'cancelled';
    }

    // Atualiza Banco
    await docRef.update({
        mpStatus: status,
        paymentStatus: status,
        status: newSystemStatus, // Se for 'disputed', o app do scanner vai bloquear
        paymentDetails: {
            status_detail: statusDetail,
            updated_at: new Date()
        },
        history: admin.firestore.FieldValue.arrayUnion(
            `Webhook: Status atualizado para ${status.toUpperCase()} em ${new Date().toLocaleString()}`
        )
    });

    // Dispara Alerta Crítico
    if (alertAdmin && reservation.status !== 'disputed') {
        await notifyChargebackAlert({
            partnerEmail: ownerDoc.data().email,
            guestName: reservation.guestName,
            amount: reservation.total,
            reservationId: snapshot.docs[0].id,
            paymentId: paymentId
        });
    }

    return { success: true };
}