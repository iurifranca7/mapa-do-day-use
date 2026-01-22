import admin from 'firebase-admin';
import { MailtrapClient } from 'mailtrap';

// ==================================================================
// 1. CONFIGURAÇÃO DE EMAIL (MAILTRAP API)
// ==================================================================
// Se estiver usando o modo de TESTE (Sandbox), o remetente não importa tanto.
// Se estiver em PRODUÇÃO (Sending), o 'from' deve ser seu domínio verificado.
const SENDER_EMAIL = "noreplyp@mapadodayuse.com"; // Ou seu e-mail verificado no Mailtrap
const SENDER_NAME = "Mapa do Day Use";

const getRecoveryHtml = (guestName, itemName, date, link) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: #0097A8; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Mapa do Day Use</h1>
        </div>
        <div style="padding: 32px;">
            <h2 style="color: #1e293b; margin-top: 0;">Olá, ${guestName}!</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Notamos que você começou uma reserva para <strong>${itemName}</strong> no dia <strong>${date.split('-').reverse().join('/')}</strong>, mas não concluiu o pagamento.
            </p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                As vagas para este dia estão muito concorridas! Garanta seu lugar antes que esgote.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="${link}" style="background-color: #0097A8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Continuar Minha Reserva
                </a>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
                Se você já realizou esta compra, por favor desconsidere este e-mail.
            </p>
        </div>
    </div>
    `;
};

// ==================================================================
// 2. INICIALIZAÇÃO FIREBASE
// ==================================================================
const initFirebase = () => {
    if (admin.apps.length > 0) return admin.firestore();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
        admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey })
        });
    } else {
        console.error("❌ Credenciais do Firebase ausentes no Cron.");
    }
    return admin.firestore();
};

// ==================================================================
// 3. HANDLER DO CRON
// ==================================================================
export default async function handler(req, res) {
    console.log("⏰ Iniciando Cron de Recuperação de Carrinho...");
    
    // Verifica Token Mailtrap
    const token = process.env.MAILTRAP_TOKEN;
    if (!token) {
        console.error("❌ MAILTRAP_TOKEN não encontrado.");
        return res.status(500).json({ error: "Configuração de e-mail ausente." });
    }

    const db = initFirebase();
    const mailtrapClient = new MailtrapClient({ token });
    
    // Janela de Tempo: 20 min a 24 horas atrás
    const now = new Date();
    const minTime = new Date(now.getTime() - 20 * 60 * 1000); 
    const maxTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); 

    try {
        const snapshot = await db.collection('reservations')
            .where('status', 'in', ['waiting_payment', 'pending'])
            .where('createdAt', '<=', minTime)
            .where('createdAt', '>=', maxTime)
            .where('recoverySent', '!=', true) 
            .get();

        if (snapshot.empty) {
            return res.status(200).json({ message: 'Nenhum carrinho para recuperar.' });
        }

        let stats = { processed: 0, sent: 0, cancelled: 0 };
        const baseUrl = (process.env.VITE_BASE_URL || 'https://mapadodayuse.com').replace(/\/$/, "");

        // Processamento em Paralelo
        await Promise.all(snapshot.docs.map(async (docSnap) => {
            const reservation = docSnap.data();
            const dayUseId = reservation.item?.id || reservation.dayuseId;

            if (!dayUseId) return;

            // 1. Checa Estoque
            const dayUseRef = await db.collection('dayuses').doc(dayUseId).get();
            if (!dayUseRef.exists) return; 
            const item = dayUseRef.data();

            let limit = 50;
            if (item.dailyStock) {
                 if (typeof item.dailyStock === 'object' && item.dailyStock.adults) limit = Number(item.dailyStock.adults);
                 else if (typeof item.dailyStock === 'string' || typeof item.dailyStock === 'number') limit = Number(item.dailyStock);
            } else if (item.limit) limit = Number(item.limit);

            const occSnap = await db.collection('reservations')
                .where('item.id', '==', dayUseId)
                .where('date', '==', reservation.date)
                .where('status', 'in', ['confirmed', 'validated', 'approved', 'paid'])
                .get();

            let occupied = 0;
            occSnap.forEach(d => occupied += (Number(d.data().adults || 0) + Number(d.data().children || 0)));
            
            const guestsInCart = Number(reservation.adults || 0) + Number(reservation.children || 0);

            // 2. Decisão
            if ((occupied + guestsInCart) > limit) {
                // A) SEM ESTOQUE: Cancela
                await docSnap.ref.update({ 
                    status: 'cancelled_sold_out', 
                    autoCancelled: true,
                    updatedAt: new Date() 
                });
                stats.cancelled++;
            } else {
                // B) TEM VAGA: Envia E-mail via Mailtrap API
                if (reservation.guestEmail) {
                    const recoveryLink = `${baseUrl}/minhas-viagens`;

                    await mailtrapClient.send({
                        from: { email: SENDER_EMAIL, name: SENDER_NAME },
                        to: [{ email: reservation.guestEmail }],
                        subject: `🔥 Não perca sua reserva em ${item.name}!`,
                        html: getRecoveryHtml(
                            reservation.guestName || 'Viajante', 
                            item.name, 
                            reservation.date, 
                            recoveryLink
                        ),
                        category: "Cart Recovery"
                    });

                    await docSnap.ref.update({ 
                        recoverySent: true, 
                        recoveryAt: new Date() 
                    });
                    stats.sent++;
                }
            }
            stats.processed++;
        }));

        return res.status(200).json({ success: true, ...stats });

    } catch (e) {
        console.error("Erro no Cron:", e);
        return res.status(500).json({ error: e.message });
    }
}