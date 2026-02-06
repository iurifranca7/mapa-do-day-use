import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';
import { MailtrapClient } from 'mailtrap';
import admin from 'firebase-admin';
import { getRefundEmailHtml } from '../../utils/templates'; // Importando seu template limpo

// ==================================================================
// 1. INICIALIZAÇÃO FIREBASE (SINGLETON) - Igual ao process-payment
// ==================================================================
const initFirebase = () => {
    if (admin.apps.length > 0) {
        return admin.firestore();
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    try {
        if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
            const credential = admin.credential.cert({ projectId, clientEmail, privateKey });
            admin.initializeApp({ credential });
        } else {
            throw new Error("Credenciais do Firebase incompletas no ambiente.");
        }
    } catch (e) { 
        console.error("❌ Erro Crítico Firebase (Refund):", e);
        throw new Error(`Server Error: ${e.message}`); 
    }

    return admin.firestore();
};

export default async function handler(req, res) {
    // ==================================================================
    // 2. CONFIGURAÇÃO CORS MANUAL (Igual ao process-payment)
    // ==================================================================
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Inicializa o banco
        const db = initFirebase();
        
        const { paymentId, amount, ownerId, guestEmail, guestName, itemName } = req.body;

        // --- VALIDAÇÕES ---
        if (!paymentId) throw new Error("ID do pagamento não fornecido.");
        if (!ownerId) throw new Error("ID do proprietário (ownerId) necessário para localizar as credenciais.");

        // ==================================================================
        // 3. BUSCA DO TOKEN DO PARCEIRO (Igual ao process-payment)
        // ==================================================================
        console.log(`🔍 [API REFUND] Buscando credenciais para o parceiro: ${ownerId}`);
        const userRef = db.collection('users').doc(ownerId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) throw new Error("Parceiro não encontrado no banco de dados.");
        
        const userData = userDoc.data();
        const partnerAccessToken = userData.mp_access_token || userData.mercadopago?.access_token;

        if (!partnerAccessToken) {
            console.error(`❌ ERRO: Parceiro ${ownerId} sem token MP.`);
            throw new Error("Este parceiro não conectou a conta do Mercado Pago. Impossível realizar estorno.");
        }

        // ==================================================================
        // 4. PROCESSAMENTO DO ESTORNO NO MERCADO PAGO
        // ==================================================================
        // Autentica COMO O VENDEDOR (Parceiro)
        const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
        const refund = new PaymentRefund(client);

        // Se amount for undefined ou 0, o MP entende como reembolso TOTAL
        const body = amount ? { amount: Number(amount) } : undefined;
        
        console.log(`💸 [API REFUND] Processando ID ${paymentId} (${amount ? 'R$'+amount : 'Total'})...`);
        
        const result = await refund.create({ payment_id: paymentId, body });

        // ==================================================================
        // 5. ENVIO DE EMAIL (MAILTRAP)
        // ==================================================================
        if (guestEmail && process.env.MAILTRAP_TOKEN) {
            try {
                const mailtrap = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });
                const senderEmail = "no-reply@mapadodayuse.com"; // Ajuste se necessário
                
                await mailtrap.send({
                    from: { email: senderEmail, name: "Mapa do Day Use" },
                    to: [{ email: guestEmail }],
                    subject: `Reembolso Processado: ${itemName || 'Sua Reserva'}`,
                    html: getRefundEmailHtml(
                        guestName || 'Cliente', 
                        result.amount || amount || 'Total', 
                        paymentId, 
                        itemName || 'Day Use'
                    ),
                    category: "Refund Notification"
                });
                console.log(`📧 [API REFUND] Email enviado para ${guestEmail}`);
            } catch (emailError) {
                console.error("⚠️ [API REFUND] Falha no envio de email (ignorado):", emailError);
            }
        }

        // Retorno de Sucesso
        return res.status(200).json({ 
            success: true, 
            id: result.id, 
            status: result.status, 
            message: "Estorno realizado com sucesso no Mercado Pago." 
        });

    } catch (error) {
        console.error("❌ [ERRO API REFUND]:", error);
        
        // Tenta extrair a mensagem de erro real do Mercado Pago (ex: "Insufficient balance")
        const mpError = error.cause?.message || error.message || "Erro desconhecido";
        
        return res.status(500).json({ 
            error: 'Erro no reembolso', 
            message: mpError,
            details: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}