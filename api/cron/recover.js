import { MailtrapClient } from 'mailtrap';
import admin from 'firebase-admin';

// --- CONFIGURAÇÕES ---
const MIN_MINUTES_AGO = 20; // Só recupera após 20 min
const MAX_HOURS_AGO = 24;   // Não recupera coisas muito velhas

// --- INICIALIZAÇÃO SEGURA DO FIREBASE ---
const initFirebase = () => {
    if (admin.apps.length > 0) return admin.firestore();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    try {
        if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); 
            const credential = admin.credential.cert({ projectId, clientEmail, privateKey });
            admin.initializeApp({ credential });
        } else {
            console.warn("⚠️ Variáveis do Firebase ausentes no Cron.");
        }
    } catch (e) {
        if (!e.message.includes('already exists')) {
            throw new Error(`Firebase Init Error: ${e.message}`);
        }
    }
    return admin.firestore();
};

// --- TEMPLATE DE EMAIL ---
const getRecoveryHtml = (userName, productName, link) => `
<div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <h2 style="color: #0097A8; text-align: center;">Olá, ${userName}! 👋</h2>
        <p style="font-size: 16px; color: #555;">Notamos que você começou uma reserva para <strong>${productName}</strong>, mas não finalizou.</p>
        <p style="font-size: 16px; color: #555;">As vagas para essa data estão acabando. Que tal garantir seu lugar agora?</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #0097A8; color: white; padding: 15px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; font-size: 16px;">RETOMAR MINHA RESERVA</a>
        </div>
        <p style="font-size: 12px; color: #999; text-align: center;">Se você já realizou a compra, desconsidere este e-mail.</p>
    </div>
</div>
`;

export default async function handler(req, res) {
    // 1. Logs Iniciais
    console.log("🤖 Robô de Recuperação Iniciado...");
    
    try {
        const db = initFirebase();
        const mailtrapToken = process.env.MAILTRAP_TOKEN;

        if (!mailtrapToken) {
            console.error("❌ MAILTRAP_TOKEN não configurado.");
            return res.status(500).json({ error: "Configuração de email ausente." });
        }

        // 2. Define Janela de Tempo
        const now = new Date();
        const timeStart = new Date(now.getTime() - (MAX_HOURS_AGO * 60 * 60 * 1000)); // 24h atrás
        const timeEnd = new Date(now.getTime() - (MIN_MINUTES_AGO * 60 * 1000));     // 20min atrás

        console.log(`🔎 Buscando reservas entre ${timeStart.toISOString()} e ${timeEnd.toISOString()}`);

        // 3. Busca no Banco
        // Reservas Pendentes, criadas nessa janela, que AINDA NÃO receberam email
        const snapshot = await db.collection('reservations')
            .where('status', 'in', ['pending', 'waiting_payment'])
            .where('createdAt', '>=', timeStart)
            .where('createdAt', '<=', timeEnd)
            .get();

        if (snapshot.empty) {
            console.log("✅ Nenhuma reserva abandonada encontrada nesta janela.");
            return res.status(200).json({ processed: 0, message: "Nenhum carrinho abandonado." });
        }

        // 4. Processa Envios
        const client = new MailtrapClient({ token: mailtrapToken });
        const sender = { email: "mailtrap@demomailtrap.com", name: "Mapa do Day Use" };
        let count = 0;
        let errors = 0;

        // Processa em paralelo
        const promises = snapshot.docs.map(async (doc) => {
            const data = doc.data();

            // Proteção extra: Se já enviou, pula (caso o filtro do firebase falhe por falta de index)
            if (data.recoverySent === true) return;
            if (!data.guestEmail) return;

            try {
                // Link para retomar (direto para 'minhas viagens' ou checkout)
                const recoveryLink = "https://mapadodayuse.com/minhas-viagens"; 

                await client.send({
                    from: sender,
                    to: [{ email: data.guestEmail }],
                    subject: `Não perca sua vaga no ${data.itemName || 'Day Use'}!`,
                    html: getRecoveryHtml(data.guestName || 'Viajante', data.itemName || 'seu passeio', recoveryLink),
                    category: "Cart Recovery"
                });

                // Marca como enviado para não mandar de novo
                await doc.ref.update({ recoverySent: true, recoverySentAt: new Date() });
                count++;
                console.log(`📧 Recuperação enviada para: ${data.guestEmail}`);

            } catch (err) {
                console.error(`❌ Erro ao enviar para ${data.guestEmail}:`, err.message);
                errors++;
            }
        });

        await Promise.all(promises);

        console.log(`🏁 Robô finalizado. Enviados: ${count}, Erros: ${errors}`);
        return res.status(200).json({ success: true, processed: count, errors });

    } catch (error) {
        console.error("🔥 CRASH NO ROBÔ:", error);
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
}