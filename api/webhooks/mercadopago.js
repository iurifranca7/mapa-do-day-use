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
    // Webhooks do MP geralmente são POST
    if (req.method !== 'POST') return res.status(200).end(); // Retorna 200 pro MP não ficar tentando de novo

    try {
        const db = initFirebase();
        const { type, data, action } = req.body;

        // O Mercado Pago envia vários tipos de notificação. Focamos em 'payment'.
        // Às vezes vem como type='payment', às vezes action='payment.created'/'payment.updated'
        const isPayment = type === 'payment' || (action && action.startsWith('payment.'));
        const paymentId = data?.id;

        if (!isPayment || !paymentId) {
            // Ignora outros tipos de notificação (ex: plano de assinatura, merchant order)
            return res.status(200).json({ message: "Ignored" });
        }

        console.log(`🔔 [WEBHOOK] Notificação recebida para Pagamento ID: ${paymentId}`);

        // ==================================================================
        // 1. IDENTIFICAR O DONO DO PAGAMENTO (SPLIT PAYMENT)
        // ==================================================================
        // O desafio aqui é: O webhook chega sem o ownerId. 
        // Precisamos achar a reserva primeiro para saber de quem é o token.
        
        const reservationsRef = db.collection('reservations');
        // Buscamos pela reserva que tem este paymentId salvo
        const snapshot = await reservationsRef.where('paymentId', '==', String(paymentId)).limit(1).get();

        if (snapshot.empty) {
            console.warn(`⚠️ Reserva não encontrada para o Payment ID: ${paymentId}. Tentando achar via referência externa...`);
            // Se não achou pelo ID (pode ser que o webhook chegou antes do front salvar), não temos como consultar sem o Token do parceiro.
            // Em arquiteturas complexas, usaríamos o Token da Plataforma para buscar a transação, 
            // mas no modo Marketplace, a transação pertence ao vendedor.
            // Vamos retornar 200 para não travar a fila do MP, mas logar o erro.
            return res.status(200).json({ message: "Reservation not found yet" });
        }

        const reservationDoc = snapshot.docs[0];
        const reservationData = reservationDoc.data();
        const reservationId = reservationDoc.id;
        const ownerId = reservationData.ownerId;

        // ==================================================================
        // 2. BUSCAR TOKEN DO PARCEIRO
        // ==================================================================
        const ownerDoc = await db.collection('users').doc(ownerId).get();
        if (!ownerDoc.exists) throw new Error("Dono da reserva não encontrado");
        
        const partnerAccessToken = ownerDoc.data().mp_access_token;
        if (!partnerAccessToken) throw new Error("Parceiro sem token MP");

        // ==================================================================
        // 3. CONSULTAR O PAGAMENTO (A RECOMENDAÇÃO DO PAINEL) ✅
        // ==================================================================
        // Aqui cumprimos a exigência: Vamos no MP buscar a verdade.
        const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
        const payment = new Payment(client);
        
        const paymentData = await payment.get({ id: paymentId });
        
        const currentStatus = paymentData.status; // approved, pending, rejected, refunded
        const statusDetail = paymentData.status_detail; // accredited, insufficient_amount, etc.

        console.log(`✅ [WEBHOOK] Status Real MP: ${currentStatus} (${statusDetail})`);

        // ==================================================================
        // 4. ATUALIZAR FIREBASE COM A VERDADE
        // ==================================================================
        
        // Mapeamento de Status MP -> Status do Sistema
        let systemStatus = reservationData.status;
        
        if (currentStatus === 'approved') systemStatus = 'confirmed';
        else if (currentStatus === 'refunded') systemStatus = 'cancelled';
        else if (currentStatus === 'cancelled' || currentStatus === 'rejected') systemStatus = 'cancelled';
        
        // Só atualiza se mudou algo ou para enriquecer dados
        await reservationsRef.doc(reservationId).update({
            mpStatus: currentStatus,       // Guardamos o status CRU do MP (approved, refunded)
            paymentStatus: currentStatus,  // Atualizamos o legado se quiser manter compatibilidade
            status: systemStatus,          // Status da reserva (confirmed/cancelled)
            paymentDetails: {              // Guardamos detalhes técnicos para auditoria
                status_detail: statusDetail,
                paid_amount: paymentData.transaction_details?.total_paid_amount,
                net_received: paymentData.transaction_details?.net_received_amount,
                fee_mp: paymentData.fee_details?.map(f => f.amount).reduce((a, b) => a + b, 0) || 0,
                last_update: new Date()
            },
            updatedAt: new Date(),
            // Adiciona histórico sem apagar o anterior
            history: admin.firestore.FieldValue.arrayUnion(
                `Webhook MP: Status alterado para ${currentStatus.toUpperCase()} em ${new Date().toLocaleString()}`
            )
        });

        // (Opcional) Disparar e-mail de confirmação SE acabou de ser aprovado 
        // e ainda não estava confirmado.
        if (currentStatus === 'approved' && reservationData.mpStatus !== 'approved') {
            // Aqui você poderia chamar sua função de envio de e-mail 
            // ou deixar que o Frontend faça isso no "Obrigado".
            // Para robustez total, o ideal seria disparar daqui.
            console.log("🚀 Pagamento aprovado via Webhook! Cliente liberado.");
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("❌ Erro Webhook:", error);
        // Retornamos 500 para o MP tentar enviar novamente depois (Retry policy)
        // Mas se for erro de lógica nossa (ex: user não achado), talvez seja melhor 200 pra não ficar spammando erro.
        return res.status(200).json({ error: error.message }); 
    }
}