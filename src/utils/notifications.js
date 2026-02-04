import { formatBRL } from './format'; 
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

// =============================================================================
// ESTILOS GERAIS (PADRÃO VISUAL MAPA DO DAY USE)
// =============================================================================
const STYLES = {
    container: 'font-family: "Segoe UI", Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 0;',
    wrapper: 'max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);',
    header: 'background-color: #0097A8; padding: 30px; text-align: center;',
    headerTitle: 'color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;',
    headerSub: 'color: #ccfbf1; margin: 5px 0 0; font-size: 13px; font-weight: 500;',
    body: 'padding: 40px 30px;',
    footer: 'text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;',
    label: 'font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; margin-bottom: 2px;',
    value: 'font-size: 14px; color: #1e293b; font-weight: 600; display: block;',
    box: 'background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;',
    alertBox: 'padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 13px; line-height: 1.5;',
    btn: 'display: inline-block; background-color: #0097A8; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 151, 168, 0.2);'
};

// Helper interno para envio (evita repetição de fetch)
const sendEmail = async (to, subject, html) => {
    try {
        await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, html })
        });
        console.log(`📧 E-mail enviado para ${to}`);
    } catch (e) {
        console.error("❌ Erro ao enviar e-mail:", e);
    }
};

// =============================================================================
// 1. NOTIFICAÇÃO CLIENTE (VOUCHER COMPLETO)
// =============================================================================
export const notifyCustomer = async (reservationData, reservationId) => {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${reservationId}`;
    const mapLink = `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(reservationData.item.name + " " + reservationData.item.city)}`;
    const purchaseDate = new Date().toLocaleString('pt-BR');
    const paymentLabel = reservationData.paymentMethod === 'pix' ? 'Pix' : 'Cartão';
    
    let openingHours = "08:00 - 18:00"; 
    if (reservationData.date && reservationData.item.weeklyPrices) {
        try {
            const [ano, mes, dia] = reservationData.date.split('-');
            const dateObj = new Date(ano, mes - 1, dia, 12); 
            const dayConfig = reservationData.item.weeklyPrices[dateObj.getDay()];
            if (dayConfig?.hours) openingHours = dayConfig.hours;
        } catch (e) {}
    }

    let rulesHtml = '';
    if (reservationData.item.allowFood !== undefined) {
        const isAllowed = reservationData.item.allowFood;
        rulesHtml = `
            <div style="${STYLES.alertBox} background-color: ${isAllowed ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${isAllowed ? '#bbf7d0' : '#fecaca'}; color: ${isAllowed ? '#166534' : '#991b1b'};">
                <table width="100%"><tr>
                    <td width="24" style="font-size: 18px;">${isAllowed ? '✅' : '🚫'}</td>
                    <td><strong>${isAllowed ? 'Pode levar comida/bebida' : 'Proibido alimentos externos'}</strong><br/><span style="font-size: 11px; opacity: 0.9;">${isAllowed ? 'Vidros proibidos.' : 'Restaurante no local.'}</span></td>
                </tr></table>
            </div>`;
    }

    const html = `
        <div style="${STYLES.container}">
            <div style="${STYLES.wrapper}">
                <div style="${STYLES.header}">
                    <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 10px; line-height: 40px; font-size: 20px;">🎟️</div>
                    <h1 style="${STYLES.headerTitle}">Seu Ingresso</h1>
                    <p style="${STYLES.headerSub}">Apresente este e-mail na portaria</p>
                </div>
                <div style="${STYLES.body}">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #0f172a; margin: 0 0 5px; font-size: 26px; font-weight: 800;">${reservationData.item.name}</h2>
                        <p style="color: #64748b; margin: 0; font-size: 14px;">${reservationData.item.city}, ${reservationData.item.state}</p>
                        <a href="${mapLink}" style="color: #0097A8; font-size: 12px; font-weight: bold; text-decoration: none; display: inline-block; margin-top: 10px; background: #ecfeff; padding: 6px 12px; border-radius: 20px;">📍 Como Chegar</a>
                    </div>
                    
                    <div style="background-color: #ffffff; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 25px; text-align: center; margin-bottom: 30px; position: relative;">
                        <img src="${qrCodeUrl}" alt="QR Code" style="width: 160px; height: 160px; margin-bottom: 15px; mix-blend-mode: multiply;" />
                        <p style="${STYLES.label} letter-spacing: 2px;">CÓDIGO DE VALIDAÇÃO</p>
                        <p style="margin: 5px 0 0; font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: 4px; font-family: monospace;">${reservationId.slice(0,6).toUpperCase()}</p>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                        <tr>
                            <td width="50%" style="padding-bottom: 20px; vertical-align: top;">
                                <span style="${STYLES.label}">DATA DO PASSEIO</span>
                                <span style="${STYLES.value}">${reservationData.date.split('-').reverse().join('/')}</span>
                            </td>
                            <td width="50%" style="padding-bottom: 20px; vertical-align: top;">
                                <span style="${STYLES.label}">HORÁRIO</span>
                                <span style="${STYLES.value}">${openingHours}</span>
                            </td>
                        </tr>
                        <tr>
                            <td width="50%" style="padding-bottom: 20px; vertical-align: top;">
                                <span style="${STYLES.label}">TITULAR</span>
                                <span style="${STYLES.value}">${reservationData.guestName}</span>
                            </td>
                            <td width="50%" style="padding-bottom: 20px; vertical-align: top;">
                                <span style="${STYLES.label}">PAGAMENTO</span>
                                <span style="${STYLES.value}">${paymentLabel}</span>
                            </td>
                        </tr>
                    </table>

                    <div style="${STYLES.box} background-color: #f0f9ff; border-color: #bae6fd;">
                        <p style="color: #0369a1; font-weight: 800; font-size: 11px; text-transform: uppercase; margin: 0 0 15px 0; letter-spacing: 1px;">🛒 Resumo do Pedido</p>
                        <ul style="margin: 0; padding: 0; list-style: none; font-size: 14px; color: #334155;">
                            ${reservationData.cartItems ? reservationData.cartItems.map(item => 
                                `<li style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #bae6fd; padding-bottom: 8px;">
                                    <span>${item.quantity || 1}x ${item.title}</span> 
                                </li>`
                            ).join('') : `<li style="margin-bottom: 5px;">Adultos: ${reservationData.adults}</li>`}
                        </ul>
                        <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 2px solid #bae6fd; color: #0369a1; font-weight: 800; font-size: 16px;">
                            <span>TOTAL PAGO</span>
                            <span>${formatBRL(reservationData.total)}</span>
                        </div>
                    </div>

                    ${rulesHtml}

                    <div style="${STYLES.box}">
                        <strong style="${STYLES.label} margin-bottom: 10px;">FALE COM O LOCAL</strong>
                        <div style="font-size: 14px; color: #334155;">
                            ${reservationData.item.localWhatsapp ? `<p style="margin: 5px 0;">📱 WhatsApp: <strong>${reservationData.item.localWhatsapp}</strong></p>` : ''} 
                            ${reservationData.item.localPhone ? `<p style="margin: 5px 0;">📞 Tel: <strong>${reservationData.item.localPhone}</strong></p>` : ''}
                        </div>
                        <p style="font-size: 11px; color: #94a3b8; margin: 15px 0 0; font-style: italic;">* Para remarcações ou cancelamentos, contate diretamente o estabelecimento.</p>
                    </div>

                    <div style="text-align: center; margin-top: 35px;">
                        <a href="https://mapadodayuse.com/minhas-viagens" style="${STYLES.btn}">Imprimir / Salvar PDF</a>
                    </div>
                    
                    <div style="${STYLES.footer}">Emitido por <strong>Mapa do Day Use</strong> • ${purchaseDate}</div>
                </div>
            </div>
        </div>`;

    await sendEmail(reservationData.guestEmail, `🎟️ Seu Ingresso: ${reservationData.item.name}`, html);
};

// =============================================================================
// 2. NOTIFICAÇÃO DE REAGENDAMENTO (PELO PARCEIRO)
// =============================================================================
export const notifyReschedule = async (reservation, oldDate, newDate) => {
    if (!reservation.guestEmail) return;

    const html = `
        <div style="${STYLES.container}">
            <div style="${STYLES.wrapper}">
                <div style="${STYLES.header} background-color: #f59e0b;">
                    <div style="font-size: 24px;">📅</div>
                    <h1 style="${STYLES.headerTitle}">Reserva Reagendada</h1>
                </div>
                <div style="${STYLES.body}">
                    <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
                        Olá <strong>${reservation.guestName}</strong>,<br/><br/>
                        Informamos que a data da sua visita ao <strong>${reservation.placeName || 'Day Use'}</strong> foi alterada pelo estabelecimento.
                    </p>

                    <div style="${STYLES.box} border-left: 4px solid #f59e0b;">
                        <table width="100%">
                            <tr>
                                <td width="40%" style="color: #94a3b8; text-decoration: line-through;">${oldDate.split('-').reverse().join('/')}</td>
                                <td width="20%" style="text-align: center; font-weight: bold; color: #f59e0b;">➔</td>
                                <td width="40%" style="font-weight: 800; color: #1e293b; font-size: 18px; text-align: right;">
                                    ${newDate.split('-').reverse().join('/')}
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div style="${STYLES.alertBox} background-color: #fffbeb; border: 1px solid #fcd34d; color: #92400e;">
                        <strong>⚠️ Ação realizada pelo parceiro</strong><br/>
                        Caso você não concorde com esta nova data ou não possa comparecer, por favor, entre em contato com o local <strong>o quanto antes</strong> para verificar outras opções ou solicitar reembolso.
                    </div>

                    <div style="${STYLES.box}">
                        <strong style="${STYLES.label} margin-bottom: 10px;">CONTATOS DO LOCAL</strong>
                        ${reservation.item?.localWhatsapp ? `<p style="margin: 5px 0;">📱 WhatsApp: <strong>${reservation.item.localWhatsapp}</strong></p>` : ''}
                        ${reservation.item?.localPhone ? `<p style="margin: 5px 0;">📞 Telefone: <strong>${reservation.item.localPhone}</strong></p>` : ''}
                        <p style="margin: 5px 0;">📍 Local: ${reservation.placeName}</p>
                    </div>

                    <div style="${STYLES.footer}">Mapa do Day Use - Notificação Automática</div>
                </div>
            </div>
        </div>`;

    await sendEmail(reservation.guestEmail, `⚠️ Atenção: Mudança de Data - ${reservation.placeName}`, html);
};

// =============================================================================
// 3. NOTIFICAÇÃO DE STATUS (VALIDADO / CANCELADO PELO PARCEIRO)
// =============================================================================
export const notifyTicketStatusChange = async (reservation, type) => {
    if (!reservation.guestEmail) return;

    let config = { subject: "", title: "", message: "", color: "", icon: "" };

    if (type === 'validated') {
        config = {
            subject: `🎫 Bem-vindo ao ${reservation.placeName || 'Day Use'}!`,
            title: "Entrada Confirmada",
            message: `Sua entrada foi validada com sucesso! Esperamos que você tenha um dia incrível.<br/>Aproveite cada momento!`,
            color: "#10B981", // Verde
            icon: "✅"
        };
    } else if (type === 'cancelled') {
        config = {
            subject: `🚫 Reserva Cancelada: ${reservation.placeName}`,
            title: "Reserva Cancelada",
            message: `Informamos que sua reserva foi cancelada pelo sistema ou pelo estabelecimento.`,
            color: "#EF4444", // Vermelho
            icon: "🛑"
        };
    }

    const cancelInfoHtml = type === 'cancelled' ? `
        <div style="${STYLES.alertBox} background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b;">
            <strong>Ação realizada pelo parceiro/sistema</strong><br/>
            Se você acredita que isso foi um erro ou precisa discutir sobre reembolso, entre em contato diretamente com o estabelecimento pelos canais abaixo.
        </div>
        <div style="${STYLES.box}">
            <strong style="${STYLES.label}">CONTATOS DO LOCAL</strong>
            <p style="margin: 5px 0;">${reservation.placeName}</p>
            ${reservation.item?.localWhatsapp ? `<p style="margin: 5px 0;">WhatsApp: <strong>${reservation.item.localWhatsapp}</strong></p>` : ''}
        </div>
    ` : '';

    const html = `
        <div style="${STYLES.container}">
            <div style="${STYLES.wrapper}">
                <div style="${STYLES.header} background-color: ${config.color};">
                    <div style="font-size: 30px;">${config.icon}</div>
                    <h2 style="${STYLES.headerTitle}">${config.title}</h2>
                </div>
                <div style="${STYLES.body}">
                    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá, <strong>${reservation.guestName}</strong>.</p>
                    <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">${config.message}</p>
                    
                    <div style="${STYLES.box} text-align: center;">
                        <p style="${STYLES.label}">RESUMO</p>
                        <p style="margin: 5px 0; font-weight: bold; color: #1e293b;">${reservation.placeName || 'Day Use'}</p>
                        <p style="margin: 5px 0; font-size: 14px;">Data: ${reservation.date.split('-').reverse().join('/')}</p>
                        <p style="margin: 5px 0; font-size: 14px; font-family: monospace;">Ticket: #${reservation.ticketCode || reservation.id}</p>
                    </div>

                    ${cancelInfoHtml}

                    <div style="${STYLES.footer}">Mapa do Day Use - Notificação Automática</div>
                </div>
            </div>
        </div>`;

    await sendEmail(reservation.guestEmail, config.subject, html);
};

// =============================================================================
// 4. NOTIFICAÇÃO PARCEIRO (NOVA VENDA)
// =============================================================================
export const notifyPartner = async (reservationData, paymentId) => {
    if (!reservationData?.ownerId) return;
    const ownerSnap = await getDoc(doc(db, "users", reservationData.ownerId));
    if (!ownerSnap.exists()) return;
    const ownerEmail = ownerSnap.data().email; 
    if (!ownerEmail) return;

    const html = `
        <div style="${STYLES.container}">
            <div style="${STYLES.wrapper}">
                <div style="${STYLES.header}">
                    <h2 style="${STYLES.headerTitle}">🚀 Nova Venda!</h2>
                    <p style="${STYLES.headerSub}">Você recebeu uma nova reserva</p>
                </div>
                <div style="${STYLES.body}">
                    <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
                        Parabéns! O cliente <strong>${reservationData.guestName}</strong> acabou de reservar no <strong>${reservationData.item.name}</strong>.
                    </p>
                    
                    <div style="${STYLES.box} background-color: #ecfeff; border-color: #0097A8; border-left-width: 5px;">
                        <p style="${STYLES.label} color: #0e7490;">VALOR TOTAL DA VENDA</p>
                        <p style="margin: 5px 0 0; font-size: 32px; font-weight: 800; color: #0097A8;">${formatBRL(reservationData.total)}</p>
                        <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">* Valor bruto (taxas serão descontadas no repasse).</p>
                    </div>

                    <div style="${STYLES.box}">
                        <strong style="${STYLES.label} border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; display: block;">DETALHES DO CLIENTE</strong>
                        <table width="100%" style="font-size: 14px; color: #334155;">
                            <tr><td style="padding: 3px 0;"><strong>Nome:</strong></td><td>${reservationData.guestName}</td></tr>
                            <tr><td style="padding: 3px 0;"><strong>Data Visita:</strong></td><td>${reservationData.date.split('-').reverse().join('/')}</td></tr>
                            <tr><td style="padding: 3px 0;"><strong>Qtd:</strong></td><td>${reservationData.adults} Adt / ${reservationData.children} Cri</td></tr>
                            <tr><td style="padding: 3px 0;"><strong>Telefone:</strong></td><td>${reservationData.guestPhone || '-'}</td></tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://mapadodayuse.com/partner" style="${STYLES.btn}">Acessar Painel do Parceiro</a>
                    </div>
                </div>
            </div>
        </div>`;

    await sendEmail(ownerEmail, `💰 Nova Venda: ${formatBRL(reservationData.total)}`, html);
};

// =============================================================================
// 5. NOTIFICAÇÃO ADMIN (NOVA SOLICITAÇÃO DE PROPRIEDADE)
// =============================================================================
export const notifyAdminNewClaim = async (claimData) => {
    const html = `
      <div style="${STYLES.container}">
        <div style="${STYLES.wrapper}">
          <div style="${STYLES.header}">
            <h2 style="${STYLES.headerTitle}">🔔 Nova Solicitação</h2>
          </div>
          <div style="${STYLES.body}">
            <p>Olá Admin, uma nova solicitação de propriedade chegou.</p>
            <div style="${STYLES.box}">
                <p><strong>Solicitante:</strong> ${claimData.claimantName} (${claimData.claimantRole})</p>
                <p><strong>Local:</strong> ${claimData.dayUseName}</p>
                <p><strong>Tel:</strong> ${claimData.claimantPhone}</p>
                <p><strong>Email:</strong> ${claimData.claimantEmail}</p>
            </div>
            <div style="text-align: center;">
                <a href="https://mapadodayuse.com/painel" style="${STYLES.btn}">Ver no Painel</a>
            </div>
          </div>
        </div>
      </div>`;
  
    await sendEmail('admin@mapadodayuse.com', `🔔 Adm: ${claimData.dayUseName}`, html);
};

// =============================================================================
// 6. NOTIFICAÇÃO STATUS DA CONTA (APROVADO/REJEITADO PELO ADMIN)
// =============================================================================
export const notifyPartnerStatus = async (email, status) => {
    const isApproved = status === 'verified';
    const title = isApproved ? "Conta APROVADA! 🎉" : "Pendência na sua conta";
    const headerColor = isApproved ? "#10B981" : "#F59E0B"; // Verde ou Laranja
    
    const message = isApproved 
        ? "Parabéns! Sua documentação foi analisada e aprovada com sucesso. Sua conta agora tem o selo de verificado e acesso completo ao painel."
        : "Identificamos um problema na documentação enviada (CCMEI ou Contrato Social). Por favor, acesse o painel e envie uma foto mais legível.";

    const html = `
        <div style="${STYLES.container}">
            <div style="${STYLES.wrapper}">
                <div style="${STYLES.header} background-color: ${headerColor};">
                    <h2 style="${STYLES.headerTitle}">${title}</h2>
                </div>
                <div style="${STYLES.body}">
                    <p style="font-size: 16px; color: #333; margin-bottom: 25px;">Olá!</p>
                    <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">${message}</p>
                    
                    <div style="text-align: center; margin-top: 35px;">
                        <a href="https://mapadodayuse.com/partner" style="${STYLES.btn}">
                            ${isApproved ? 'Acessar Painel' : 'Resolver Pendência'}
                        </a>
                    </div>
                    <div style="${STYLES.footer}">Equipe Mapa do Day Use</div>
                </div>
            </div>
        </div>`;

    await sendEmail(email, title, html);
};

// =============================================================================
// 7. NOTIFICAÇÃO TRANSFERÊNCIA APROVADA (NOVO DONO)
// =============================================================================
export const notifyTransferApproved = async (claim) => {
    const html = `
        <div style="${STYLES.container}">
            <div style="${STYLES.wrapper}">
                <div style="${STYLES.header}">
                    <h2 style="${STYLES.headerTitle}">Solicitação Aprovada! 🎉</h2>
                </div>
                <div style="${STYLES.body}">
                    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                        Olá, <strong>${claim.userName}</strong>!
                    </p>
                    <p style="font-size: 16px; color: #333; line-height: 1.5; margin-bottom: 20px;">
                        Temos ótimas notícias! Sua solicitação para administrar o <strong>${claim.propertyName}</strong> foi aprovada pela nossa equipe.
                    </p>
                    
                    <div style="${STYLES.box} background-color: #e0f7fa; border-color: #0097A8; border-left: 5px solid #0097A8;">
                        <p style="margin: 0; font-size: 14px; color: #006064; font-weight: bold;">🚀 Acesso Liberado</p>
                        <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">
                            Você já pode acessar seu painel, configurar seus preços e começar a vender ingressos de Day Use agora mesmo.
                        </p>
                    </div>

                    <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Próximos Passos</h3>
                    <ul style="list-style: none; padding: 0; color: #555; font-size: 14px; line-height: 1.8;">
                        <li>1. Acesse a plataforma com o e-mail: <strong>${claim.userEmail}</strong></li>
                        <li>2. Crie sua senha (caso ainda não tenha) ou faça login.</li>
                        <li>3. Conecte sua conta financeira e revise seu anúncio.</li>
                    </ul>

                    <div style="text-align: center; margin-top: 35px;">
                        <a href="https://mapadodayuse.com/partner" style="${STYLES.btn}">
                            Acessar Painel do Parceiro
                        </a>
                    </div>
                    <div style="${STYLES.footer}">Bem-vindo ao Mapa do Day Use!</div>
                </div>
            </div>
        </div>`;

    await sendEmail(claim.userEmail, "Acesso Liberado! 🔑 - Mapa do Day Use", html);
};