import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';
import { MailtrapClient } from 'mailtrap';
import admin from 'firebase-admin';

// ==================================================================
// 1. HELPER DE EMAIL (EMBUTIDO PARA EVITAR ERRO DE IMPORTAÇÃO)
// ==================================================================
// Colocamos aqui dentro para garantir que a Vercel encontre o código
const getRefundEmailHtml = (guestName, amount, paymentId, itemName) => {
    const styleContainer = 'font-family: Arial, sans-serif; background-color: #f1f5f9; padding: 40px 0;';
    const styleBox = 'max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;';
    
    return `
    <div style="${styleContainer}">
        <div style="${styleBox}">
            <div style="background-color: #ef4444; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Reembolso Confirmado</h1>
            </div>
            <div style="padding: 40px 30px;">
                <p style="color: #333; font-size: 16px;">Olá, <strong>${guestName}</strong>.</p>
                <p style="color: #555; line-height: 1.5;">O estorno referente à reserva em <strong>${itemName}</strong> foi processado.</p>
                
                <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                    <p style="color: #991b1b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Valor Reembolsado</p>
                    <p style="color: #dc2626; font-size: 32px; font-weight: bold; margin: 10px 0;">R$ ${amount}</p>
                </div>

                <p style="color: #666; font-size: 13px; text-align: center;">ID Transação: ${paymentId}</p>
            </div>
        </div>
    </div>`;
};

// ==================================================================
// 2. INICIALIZAÇÃO FIREBASE (SINGLETON) - Igual ao process-payment
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
            // Tratamento vital para Vercel
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
            
            admin.initializeApp({
                credential: admin.credential.cert({ projectId, clientEmail, privateKey })
            });
        } else {
            throw new Error("Credenciais do Firebase incompletas.");
        }
    } catch (e) { 
        console.error("❌ Erro Crítico Firebase (Refund):", e);
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
        const { paymentId, amount, ownerId, guestEmail, guestName, itemName } = req.body;

        // Validações
        if (!paymentId) throw new Error("ID do pagamento não fornecido.");
        if (!ownerId) throw new Error("ID do proprietário necessário.");

        // 3. BUSCA TOKEN DO PARCEIRO
        console.log(`🔍 [API] Buscando credenciais: ${ownerId}`);
        const userDoc = await db.collection('users').doc(ownerId).get();
        
        if (!userDoc.exists) throw new Error("Parceiro não encontrado.");
        
        const userData = userDoc.data();
        const partnerAccessToken = userData.mp_access_token || userData.mercadopago?.access_token;

        if (!partnerAccessToken) throw new Error("Parceiro sem conta MP conectada.");

        // 4. ESTORNO NO MERCADO PAGO
        const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
        const refund = new PaymentRefund(client);
        
        // Se amount for undefined, estorna tudo
        const body = amount ? { amount: Number(amount) } : undefined;
        
        console.log(`💸 [API] Estornando MP ID ${paymentId}...`);
        const result = await refund.create({ payment_id: paymentId, body });

        // 5. EMAIL (Opcional, mas seguro agora que está embutido)
        if (guestEmail && process.env.MAILTRAP_TOKEN) {
            try {
                const mailtrap = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });
                await mailtrap.send({
                    from: { email: "no-reply@mapadodayuse.com", name: "Mapa do Day Use" },
                    to: [{ email: guestEmail }],
                    subject: `Reembolso Processado: ${itemName || 'Reserva'}`,
                    html: getRefundEmailHtml(
                        guestName || 'Cliente', 
                        result.amount || amount || 'Total', 
                        paymentId, 
                        itemName || 'Day Use'
                    ),
                    category: "Refund Notification"
                });
            } catch (emailError) {
                console.error("⚠️ [API] Erro email (ignorado):", emailError);
            }
        }

        return res.status(200).json({ 
            success: true, 
            id: result.id, 
            status: result.status 
        });

    } catch (error) {
        console.error("❌ [API] Erro Refund:", error);
        const mpError = error.cause?.message || error.message || "Erro desconhecido";
        return res.status(500).json({ error: 'Erro no reembolso', message: mpError });
    }
}