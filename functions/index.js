const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// O Firebase carrega automaticamente o arquivo .env da pasta functions
const MERCADO_PAGO_TOKEN = process.env.MP_ACCESS_TOKEN;

// Função de Sincronização Financeira
exports.synchronizeMercadoPagoTransactions = functions.https.onCall(async (data, context) => {
    // 1. Segurança: Verificar se usuário está logado
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login necessário');
    }

    if (!MERCADO_PAGO_TOKEN) {
        console.error("ERRO CRÍTICO: Token do Mercado Pago não configurado.");
        throw new functions.https.HttpsError('internal', 'Erro de configuração no servidor.');
    }

    const { begin_date, end_date } = data;

    try {
        // 2. Buscar transações no Mercado Pago (Search API)
        const url = 'https://api.mercadopago.com/v1/payments/search';
        const params = {
            range: 'date_created',
            begin_date: begin_date,
            end_date: end_date,
            sort: 'date_created',
            criteria: 'desc',
            limit: 1000, // Limite seguro para uma sincronização manual
            offset: 0
        };

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${MERCADO_PAGO_TOKEN}` },
            params: params
        });

        const transactions = response.data.results || [];
        let updateCount = 0;
        const updatePromises = [];

        // 3. Processar cada transação e atualizar no Firestore
        for (const transaction of transactions) {
            // O 'external_reference' deve conter o ID da sua reserva no Firebase
            // Isso deve ter sido configurado no momento da criação da preferência de pagamento
            const reservationId = transaction.external_reference;

            if (reservationId) {
                const reservationRef = db.collection('reservations').doc(reservationId);
                
                // Extrair dados financeiros reais
                const netReceived = transaction.transaction_details?.net_received_amount || 0;
                const totalFee = transaction.fee_details?.reduce((acc, fee) => acc + fee.amount, 0) || 0;
                const releaseDate = transaction.money_release_date;
                const realStatus = transaction.status;
                const realStatusDetail = transaction.status_detail;

                // Preparar atualização
                const updatePromise = reservationRef.update({
                    mercadoPagoStatus: realStatus,
                    mercadoPagoStatusDetail: realStatusDetail,
                    mercadoPagoFee: totalFee, // Taxa real cobrada pelo MP
                    mercadoPagoNetReceived: netReceived, // Valor líquido real
                    mercadoPagoReleaseDate: releaseDate, // Quando o dinheiro cai
                    mercadoPagoPaymentId: String(transaction.id),
                    paymentMethodDetail: `${transaction.payment_method_id} - ${transaction.installments}x`, // Ex: credit_card - 3x
                    lastSynchronizationAt: admin.firestore.FieldValue.serverTimestamp(),
                    isFinanciallyReconciled: true // Marca como conciliado
                }).then(() => {
                    updateCount++;
                }).catch(err => {
                    console.warn(`Falha ao atualizar reserva ${reservationId}:`, err);
                });

                updatePromises.push(updatePromise);
            }
        }

        // Aguarda todas as atualizações terminarem
        await Promise.all(updatePromises);

        return { 
            success: true, 
            message: `Sincronização concluída. ${updateCount} registros atualizados.`,
            processed: transactions.length,
            updated: updateCount
        };

    } catch (error) {
        console.error("Erro na sincronização MP:", error.response?.data || error.message);
        throw new functions.https.HttpsError('internal', 'Erro ao conectar com Mercado Pago.');
    }
});