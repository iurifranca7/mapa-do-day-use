import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';
import { MailtrapClient } from 'mailtrap';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        }),
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    // Configuração de CORS (Essencial para chamar do front)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { paymentId, amount, ownerId, guestEmail, guestName, itemName } = req.body;

        // 1. Validações Básicas
        if (!paymentId) throw new Error("ID do pagamento não fornecido.");
        if (!ownerId) throw new Error("ID do proprietário (ownerId) necessário para localizar as credenciais.");

        // 2. BUSCA SEGURA DO TOKEN DO PARCEIRO (Server-Side)
        console.log(`🔍 [API] Buscando credenciais para o parceiro: ${ownerId}`);
        const userDoc = await db.collection('users').doc(ownerId).get();
        
        if (!userDoc.exists) throw new Error("Parceiro não encontrado no banco de dados.");
        
        const userData = userDoc.data();
        
        // Verifica onde o token está salvo (ajuste conforme seu padrão de salvamento)
        const partnerAccessToken = userData.mp_access_token || userData.mercadopago?.access_token;

        if (!partnerAccessToken) {
            throw new Error("Este parceiro não conectou a conta do Mercado Pago. Impossível realizar estorno.");
        }

        // 3. Conexão MP com o Token do PARCEIRO
        const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
        const refund = new PaymentRefund(client);

        const body = amount ? { amount: Number(amount) } : undefined;
        
        console.log(`💸 [API] Processando Estorno MP ID ${paymentId} (${amount ? 'R$'+amount : 'Total'})...`);
        
        // EXECUTA O ESTORNO NO MERCADO PAGO
        const result = await refund.create({ payment_id: paymentId, body });

        // 4. ENVIO DE EMAIL (MAILTRAP)
        if (guestEmail && process.env.MAILTRAP_TOKEN) {
            try {
                console.log(`📧 [API] Enviando email para ${guestEmail}`);
                const mailtrap = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });
                
                // Use seu e-mail verificado no Mailtrap aqui
                const senderEmail = "no-reply@mapadodayuse.com"; 
                // Se estiver em modo sandbox/demo, use o e-mail da sandbox
                
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
            } catch (emailError) {
                console.error("⚠️ [API] Erro ao enviar e-mail (mas estorno ok):", emailError);
            }
        }

        return res.status(200).json({ 
            success: true, 
            id: result.id,
            status: result.status,
            message: "Estorno realizado com sucesso no Mercado Pago."
        });

    } catch (error) {
        console.error("❌ [API] Erro Fatal Refund:", error);
        
        // Tenta extrair a mensagem de erro real do Mercado Pago
        const mpError = error.cause?.message || error.message;
        
        return res.status(500).json({ 
            error: 'Erro no reembolso', 
            message: mpError,
            details: error 
        });
    }
}