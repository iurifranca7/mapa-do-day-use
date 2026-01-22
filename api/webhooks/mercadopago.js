import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// ==================================================================
// 1. INICIALIZAÇÃO DO FIREBASE (ROBUSTA)
// ==================================================================
const initFirebase = () => {
    if (!admin || !admin.apps) {
        throw new Error("Biblioteca Firebase Admin não foi carregada corretamente.");
    }

    if (admin.apps.length > 0) return admin.firestore();

    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    let credential;

    try {
        if (serviceAccountBase64) {
            const buffer = Buffer.from(serviceAccountBase64, 'base64');
            const serviceAccount = JSON.parse(buffer.toString('utf-8'));
            credential = admin.credential.cert(serviceAccount);
        } else if (serviceAccountJSON) {
            const serviceAccount = JSON.parse(serviceAccountJSON);
            credential = admin.credential.cert(serviceAccount);
        } else if (projectId && clientEmail && privateKeyRaw) {
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"|"$/g, ''); 
            credential = admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            });
        }
    } catch (parseError) {
        throw new Error(`Falha ao ler credenciais do Firebase: ${parseError.message}`);
    }

    if (!credential) {
        throw new Error("Nenhuma credencial do Firebase encontrada nas Variáveis de Ambiente.");
    }

    try {
        admin.initializeApp({ credential });
    } catch (e) {
        if (!e.message.includes('already exists')) {
             throw e;
        }
    }

    return admin.firestore();
};

// ==================================================================
// 2. FUNÇÃO DE DISPARO DE E-MAIL (VOUCHER)
// ==================================================================
const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const notifyCustomer = async (reservationData, reservationId) => {
    console.log(`📧 Preparando envio de voucher para: ${reservationData.guestEmail}`);
    
    try {
        // Gera URLs
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${reservationId}`;
        const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservationData.item.name + " " + reservationData.item.city)}`;
        
        // 1. Tratamento de Dados para Exibição
        const transactionId = reservationData.paymentId?.replace(/^(FRONT_|PIX-)/, '') || "N/A";
        const purchaseDate = new Date().toLocaleString('pt-BR');
        const paymentLabel = reservationData.paymentMethod === 'pix' ? 'Pix (À vista)' : 'Cartão de Crédito';
        
        // 2. Lógica de Horário
        let openingHours = "08:00 às 18:00"; 
        if (reservationData.date && reservationData.item.weeklyPrices) {
            try {
                const [ano, mes, dia] = reservationData.date.split('-');
                const dateObj = new Date(ano, mes - 1, dia, 12); 
                const dayConfig = reservationData.item.weeklyPrices[dateObj.getDay()];
                if (dayConfig?.hours) openingHours = dayConfig.hours;
            } catch (e) {}
        }

        // 3. Regras de Acesso (HTML Condicional)
        let rulesHtml = '';
        const allowFood = reservationData.item.allowFood;
        
        if (allowFood !== undefined) {
            if (allowFood === false) {
                rulesHtml = `
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td width="30" valign="top" style="font-size: 20px;">🚫</td>
                            <td>
                                <strong style="font-size: 14px;">Proibida a entrada de alimentos e bebidas</strong><br/>
                                <span style="font-size: 12px; opacity: 0.9;">Sujeito a revista de bolsas. Restaurante no local.</span>
                            </td>
                        </tr>
                    </table>
                </div>`;
            } else {
                rulesHtml = `
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td width="30" valign="top" style="font-size: 20px;">✅</td>
                            <td style="font-size: 14px; font-weight: bold;">Entrada de alimentos e bebidas permitida</td>
                        </tr>
                    </table>
                </div>`;
            }
        }

        const emailHtml = `
        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 0;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                
                <div style="background-color: #0097A8; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: 1px; text-transform: uppercase;">Voucher de Acesso</h1>
                    <p style="color: #e0f2fe; margin: 5px 0 0; font-size: 13px;">Apresente este e-mail na portaria</p>
                </div>

                <div style="padding: 40px 30px;">
                    
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h2 style="color: #0f172a; margin: 0 0 5px; font-size: 24px;">${reservationData.item.name}</h2>
                        <p style="color: #64748b; margin: 0; font-size: 14px;">${reservationData.item.city}, ${reservationData.item.state}</p>
                        <a href="${mapLink}" style="color: #0097A8; font-size: 12px; font-weight: bold; text-decoration: none; display: inline-block; margin-top: 8px; background: #ecfeff; padding: 5px 12px; border-radius: 20px;">
                            📍 Abrir no Google Maps
                        </a>
                    </div>
                    
                    <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                        <img src="${qrCodeUrl}" alt="QR Code" style="width: 150px; height: 150px; margin-bottom: 10px; mix-blend-mode: multiply;" />
                        <p style="margin: 5px 0 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Código de Validação</p>
                        <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: 3px; font-family: monospace;">${reservationId.slice(0,6).toUpperCase()}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border-top: 1px solid #f1f5f9;">
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 50%; vertical-align: top;">
                                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 2px;">Data do Passeio</span>
                                <span style="font-size: 15px; color: #1e293b; font-weight: 600;">${reservationData.date.split('-').reverse().join('/')}</span>
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 50%; vertical-align: top;">
                                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 2px;">Horário</span>
                                <span style="font-size: 15px; color: #1e293b; font-weight: 600;">${openingHours}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 2px;">Titular</span>
                                <span style="font-size: 14px; color: #1e293b; font-weight: 600;">${reservationData.guestName}</span>
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 2px;">Pagamento</span>
                                <span style="font-size: 14px; color: #1e293b; font-weight: 600;">${paymentLabel}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 2px;">ID Transação</span>
                                <span style="font-size: 11px; color: #475569; font-family: monospace;">${transactionId}</span>
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 2px;">Data Compra</span>
                                <span style="font-size: 11px; color: #475569;">${purchaseDate}</span>
                            </td>
                        </tr>
                    </table>

                    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="color: #0369a1; font-weight: bold; font-size: 12px; text-transform: uppercase; margin: 0 0 10px 0;">Resumo do Pedido</p>
                        <ul style="margin: 0; padding-left: 0; list-style: none; font-size: 14px; color: #334155;">
                            <li style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Adultos</span> <strong>${reservationData.adults}</strong></li>
                            ${reservationData.children > 0 ? `<li style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Crianças</span> <strong>${reservationData.children}</strong></li>` : ''}
                            ${reservationData.pets > 0 ? `<li style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Pets</span> <strong>${reservationData.pets}</strong></li>` : ''}
                            ${reservationData.freeChildren > 0 ? `<li style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #15803d;"><span>Crianças Grátis</span> <strong>${reservationData.freeChildren}</strong></li>` : ''}
                        </ul>
                        <div style="display: flex; justify-content: space-between; border-top: 1px solid #bae6fd; margin-top: 15px; padding-top: 10px; color: #075985; font-weight: bold; font-size: 16px;">
                            <span>TOTAL PAGO</span>
                            <span>${formatBRL(reservationData.total)}</span>
                        </div>
                    </div>

                    ${rulesHtml}

                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; font-size: 12px; color: #4b5563; border: 1px solid #e5e7eb; margin-top: 20px;">
                        <strong style="text-transform: uppercase; color: #94a3b8; font-size: 10px; display: block; margin-bottom: 8px;">Fale com o local</strong>
                        ${reservationData.item.localWhatsapp ? `WhatsApp: <strong>${reservationData.item.localWhatsapp}</strong><br/>` : ''} 
                        ${reservationData.item.localPhone ? `Tel: <strong>${reservationData.item.localPhone}</strong>` : ''}
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-style: italic; color: #6b7280;">
                            * Política: Remarcações, cancelamentos e reembolsos devem ser tratados diretamente com o estabelecimento pelos contatos acima.
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://mapadodayuse.com/minhas-viagens" style="display: inline-block; background-color: #0097A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                            🖨️ Acessar para Imprimir
                        </a>
                    </div>
                    
                    <p style="text-align: center; font-size: 10px; color: #9ca3af; margin-top: 30px;">
                        Emitido por <strong>Mapa do Day Use</strong> em ${new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
        `;

        // Define a URL da API. No Webhook (Server-side), precisamos do domínio completo.
        // Usa VITE_BASE_URL (definido no .env) ou fallback
        const rawBaseUrl = process.env.VITE_BASE_URL || 'https://mapadodayuse.com';
        const baseUrl = rawBaseUrl.replace(/\/$/, ""); 
        
        await fetch(`${baseUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                to: reservationData.guestEmail, 
                subject: `Seu Voucher: ${reservationData.item.name}`, 
                html: emailHtml 
            })
        });

        console.log("✅ E-mail de voucher disparado com sucesso.");

    } catch (e) {
        console.error("❌ Erro ao disparar e-mail no Webhook:", e);
    }
};

// ==================================================================
// 3. HELPER DE REEMBOLSO (OVERBOOKING)
// ==================================================================
const processOverbookingRefund = async (paymentId, partnerToken) => {
    try {
        const client = new MercadoPagoConfig({ accessToken: partnerToken });
        const payment = new Payment(client);
        await payment.refund({ payment_id: paymentId });
        console.log(`💸 Reembolso Overbooking: ${paymentId}`);
        return true;
    } catch (e) { 
        console.error("Falha reembolso:", e); 
        return false; 
    }
};

// ==================================================================
// 4. HANDLER PRINCIPAL DO WEBHOOK
// ==================================================================
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    const { action, type, data } = req.body;
    
    // Ignora eventos que não sejam atualização de pagamento
    if (type !== 'payment' && action !== 'payment.updated') return res.status(200).send('Ignored');

    try {
        const paymentId = data?.id;
        const db = initFirebase();

        // 1. Busca Reserva pelo PaymentID
        const snapshot = await db.collection('reservations')
            .where('paymentId', '==', String(paymentId))
            .limit(1)
            .get();
            
        if (snapshot.empty) return res.status(200).send('Reservation not found');
        
        const resDoc = snapshot.docs[0];
        const resData = resDoc.data();
        
        // 2. Busca Token do Parceiro
        const ownerSnap = await db.collection('users').doc(resData.ownerId).get();
        const partnerAccessToken = process.env.MP_ACCESS_TOKEN_TEST || process.env.VITE_MP_ACCESS_TOKEN_TEST || (ownerSnap.exists ? ownerSnap.data().mp_access_token : null);

        if (!partnerAccessToken) return res.status(200).send('No token');

        // 3. Consulta Status no Mercado Pago
        const client = new MercadoPagoConfig({ accessToken: partnerAccessToken });
        const payment = new Payment(client);
        const mpPayment = await payment.get({ id: paymentId });
        const statusMP = mpPayment.status;

        console.log(`Webhook: ${paymentId} -> ${statusMP}`);

        // 4. Processamento de Aprovação (Com Checagem de Estoque)
        if (statusMP === 'approved' && resData.status !== 'confirmed') {
            
            const dayUseSnap = await db.collection('dayuses').doc(resData.dayuseId).get();
            const item = dayUseSnap.data();
            
            // Define capacidade (dailyStock tem prioridade, depois limit, depois 50)
            const maxCapacity = Number(item.dailyStock || item.limit || 50);
            
            // Busca ocupação atual (SÓ CONFIRMADOS)
            const occupiedSnap = await db.collection('reservations')
                .where('item.id', '==', resData.item.id)
                .where('date', '==', resData.date)
                .where('status', 'in', ['confirmed', 'validated'])
                .get();
            
            let currentOccupancy = 0;
            occupiedSnap.forEach(d => currentOccupancy += (Number(d.data().adults || 0) + Number(d.data().children || 0)));
            
            const newGuests = Number(resData.adults || 0) + Number(resData.children || 0);

            // Verifica se estourou a capacidade
            if ((currentOccupancy + newGuests) > maxCapacity) {
                console.warn(`🚨 Overbooking Pix! Cap: ${maxCapacity}, Ocup: ${currentOccupancy}, Novo: ${newGuests}`);
                
                await processOverbookingRefund(paymentId, partnerAccessToken);
                await resDoc.ref.update({ 
                    status: 'overbooking_refund', 
                    updatedAt: new Date(), 
                    mpStatus: 'refunded' 
                });
                
                return res.status(200).send('Overbooking handled');
            }

            // Tem vaga! Confirma e envia voucher.
            await resDoc.ref.update({ 
                status: 'confirmed', 
                approvedAt: new Date(), 
                mpStatus: 'approved' 
            });
            
            // Garante que o item está carregado nos dados para o e-mail
            if (!resData.item) {
                resData.item = item; // Hydrate com dados do dayuse se faltar
            }
            
            await notifyCustomer(resData, resDoc.id);
        } 
        // 5. Outros Status
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