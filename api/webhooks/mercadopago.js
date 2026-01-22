import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ... (Mesma initFirebase do process-payment, copie de lá para evitar duplicação) ...
const initFirebase = () => { /* Copie a initFirebase do arquivo acima */ if (!admin || !admin.apps) throw new Error("Erro"); if (admin.apps.length > 0) return admin.firestore(); const projectId = process.env.FIREBASE_PROJECT_ID; const clientEmail = process.env.FIREBASE_CLIENT_EMAIL; const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY; try { if (projectId && clientEmail && privateKeyRaw) { const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); const credential = admin.credential.cert({ projectId, clientEmail, privateKey }); admin.initializeApp({ credential }); } else { throw new Error("Credenciais do Firebase incompletas."); } } catch (e) { throw new Error(`Credentials Error: ${e.message}`); } return admin.firestore(); };

const notifyCustomer = async (data, id) => { /* ... SEU CÓDIGO DE E-MAIL AQUI ... */ };

const processOverbookingRefund = async (paymentId, partnerToken) => {
    try {
        const client = new MercadoPagoConfig({ accessToken: partnerToken });
        const payment = new Payment(client);
        await payment.refund({ payment_id: paymentId });
        console.log(`💸 Reembolso automático processado para ${paymentId}`);
        return true;
    } catch (e) { console.error("Falha ao reembolsar:", e); return false; }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    const { action, type, data } = req.body;
    if (type !== 'payment' && action !== 'payment.updated') return res.status(200).send('Ignored');

    try {
        const paymentId = data?.id;
        const db = initFirebase();

        const snapshot = await db.collection('reservations').where('paymentId', '==', String(paymentId)).limit(1).get();
        if (snapshot.empty) return res.status(200).send('Reservation not found');
        
        const resDoc = snapshot.docs[0];
        const resData = resDoc.data();
        
        const ownerSnap = await db.collection('users').doc(resData.ownerId).get();
        
        // --- USA O TOKEN DE TESTE SE EXISTIR ---
        const partnerAccessToken = process.env.MP_ACCESS_TOKEN_TEST || (ownerSnap.exists ? ownerSnap.data().mp_access_token : null);

        if (!partnerAccessToken) return res.status(200).send('No token');

        const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
        const payment = new Payment(client);
        const mpPayment = await payment.get({ id: paymentId });
        const statusMP = mpPayment.status;

        console.log(`Webhook: ${paymentId} -> ${statusMP}`);

        if (statusMP === 'approved' && resData.status !== 'confirmed') {
            const dayUseSnap = await db.collection('dayuses').doc(resData.dayuseId).get();
            const limit = Number(dayUseSnap.data().limit || 50);
            
            const occupiedSnap = await db.collection('reservations')
                .where('dayuseId', '==', resData.dayuseId)
                .where('date', '==', resData.date)
                .where('status', 'in', ['confirmed', 'validated'])
                .get();
            
            let currentCount = 0;
            occupiedSnap.forEach(d => currentCount += (Number(d.data().adults) + Number(d.data().children)));
            const newCount = Number(resData.adults) + Number(resData.children);

            if ((currentCount + newCount) > limit) {
                console.warn(`🚨 Overbooking no Pix ${paymentId}.`);
                await processOverbookingRefund(paymentId, partnerAccessToken);
                await resDoc.ref.update({ status: 'overbooking_refund', updatedAt: new Date(), mpStatus: 'refunded' });
                return res.status(200).send('Overbooking handled');
            }

            await resDoc.ref.update({ status: 'confirmed', approvedAt: new Date(), mpStatus: 'approved' });
            // Chamada segura para envio de e-mail (usando VITE_BASE_URL)
            if (typeof notifyCustomer === 'function') {
                 // Nota: Você precisa reimplementar notifyCustomer aqui ou importá-lo se estiver em outro arquivo
            }
        } 
        else if (statusMP === 'charged_back') {
            await resDoc.ref.update({ status: 'chargeback', alert: 'Contestação Recebida' });
        }
        else if (['cancelled', 'rejected'].includes(statusMP) && resData.status !== 'cancelled') {
            await resDoc.ref.update({ status: 'cancelled', cancelledAt: new Date() });
        }

        return res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        return res.status(500).send('Error');
    }
}