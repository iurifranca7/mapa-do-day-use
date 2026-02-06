import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// 1. INICIALIZAÇÃO FIREBASE (Mesmo padrão robusto)
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
        } else {
            throw new Error("Credenciais Firebase ausentes.");
        }
    } catch (e) { 
        console.error("❌ Erro Firebase Init:", e);
        throw new Error(`Server Error: ${e.message}`); 
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

    try {
        const db = initFirebase();
        const { ownerId, beginDate, endDate } = req.body;

        if (!ownerId) throw new Error("Owner ID obrigatório.");

        // 2. BUSCA TOKEN DO PARCEIRO
        console.log(`🔍 [SYNC] Buscando token para: ${ownerId}`);
        const userDoc = await db.collection('users').doc(ownerId).get();
        
        if (!userDoc.exists) throw new Error("Parceiro não encontrado.");
        
        const partnerAccessToken = userDoc.data().mp_access_token;
        if (!partnerAccessToken) throw new Error("Conta MP não conectada.");

        // 3. BUSCA VENDAS NO MERCADO PAGO (SEARCH API)
        const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
        const payment = new Payment(client);

        // Formata datas para o padrão ISO 8601 que o MP aceita
        // Ex: 2023-01-01T00:00:00.000-04:00
        const filters = {
            sort: 'date_created',
            criteria: 'desc',
            range: 'date_created',
            begin_date: new Date(beginDate).toISOString(),
            end_date: new Date(endDate).toISOString(),
            limit: 100, // Limite seguro por lote
            offset: 0
        };

        console.log(`📡 [SYNC] Consultando MP de ${filters.begin_date} a ${filters.end_date}`);
        const searchResult = await payment.search({ options: filters });
        
        const mpPayments = searchResult.results || [];
        console.log(`📊 [SYNC] Encontrados ${mpPayments.length} pagamentos no MP.`);

        let updatedCount = 0;

        // 4. ATUALIZA O FIREBASE (CONCILIAÇÃO)
        const batch = db.batch();
        let batchCount = 0;

        for (const mpPay of mpPayments) {
            // Só nos interessa pagamentos que tenham external_reference (nosso ID de reserva)
            if (!mpPay.external_reference) continue;

            const reservationRef = db.collection('reservations').doc(mpPay.external_reference);
            
            // Dados Reais da Transação
            const updateData = {
                isFinanciallyReconciled: true, // Marca como auditado
                lastReconciledAt: new Date(),
                
                // Atualiza Status Real
                mpStatus: mpPay.status,
                paymentStatus: mpPay.status,
                
                // Dados Financeiros Exatos
                mercadoPagoFee: mpPay.fee_details?.reduce((acc, curr) => acc + curr.amount, 0) || 0,
                mercadoPagoNetReceived: mpPay.transaction_details?.net_received_amount || 0,
                mercadoPagoReleaseDate: mpPay.money_release_date || null,
                
                // Metadados
                paymentMethodDetail: mpPay.payment_method_id,
                paymentType: mpPay.payment_type_id
            };

            // Se aprovado, garante status confirmed no sistema também
            if (mpPay.status === 'approved') {
                updateData.status = 'confirmed';
            } else if (mpPay.status === 'refunded' || mpPay.status === 'cancelled') {
                updateData.status = 'cancelled';
            }

            batch.update(reservationRef, updateData);
            batchCount++;
            updatedCount++;

            // Firebase Batch limite é 500
            if (batchCount >= 400) {
                await batch.commit();
                batchCount = 0;
            }
        }

        if (batchCount > 0) await batch.commit();

        return res.status(200).json({ 
            success: true, 
            processed: mpPayments.length,
            updated: updatedCount,
            message: `Sincronização concluída. ${updatedCount} vendas atualizadas.`
        });

    } catch (error) {
        console.error("❌ [API SYNC] Erro:", error);
        return res.status(500).json({ error: error.message });
    }
}