// src/utils/notifications.js
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Ajuste o caminho conforme sua estrutura

// Helper simples
const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

// --- 1. NOTIFICAÇÃO CLIENTE (VOUCHER) ---
export const notifyCustomer = async (reservationData, reservationId) => {
    try {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${reservationId}`;
        const mapLink = `https://www.google.com/maps/search/?api=1&query=$?q=${encodeURIComponent(reservationData.item.name + " " + reservationData.item.city)}`;
        
        const transactionId = reservationData.paymentId?.replace(/^(FRONT_|PIX-|CARD_)/, '') || reservationId;
        const purchaseDate = new Date().toLocaleString('pt-BR');
        const paymentLabel = reservationData.paymentMethod === 'pix' ? 'Pix (À vista)' : 'Cartão de Crédito';
        
        // Lógica de Horário
        let openingHours = "08:00 às 18:00"; 
        if (reservationData.date && reservationData.item.weeklyPrices) {
            try {
                const [ano, mes, dia] = reservationData.date.split('-');
                const dateObj = new Date(ano, mes - 1, dia, 12); 
                const dayConfig = reservationData.item.weeklyPrices[dateObj.getDay()];
                if (dayConfig?.hours) openingHours = dayConfig.hours;
            } catch (e) {}
        }

        // Regras (Comida/Bebida)
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
                      </table>
                      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                          <p style="color: #0369a1; font-weight: bold; font-size: 12px; text-transform: uppercase; margin: 0 0 10px 0;">Resumo do Pedido</p>
                          <ul style="margin: 0; padding-left: 0; list-style: none; font-size: 14px; color: #334155;">
                              <li style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Adultos</span> <strong>${reservationData.adults}</strong></li>
                              ${reservationData.children > 0 ? `<li style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Crianças</span> <strong>${reservationData.children}</strong></li>` : ''}
                              ${reservationData.pets > 0 ? `<li style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Pets</span> <strong>${reservationData.pets}</strong></li>` : ''}
                          </ul>
                          <div style="display: flex; justify-content: space-between; border-top: 1px solid #bae6fd; margin-top: 15px; padding-top: 10px; color: #075985; font-weight: bold; font-size: 16px;">
                              <span>TOTAL PAGO</span>
                              <span>${formatBRL(reservationData.total)}</span>
                          </div>
                      </div>
                      ${rulesHtml}
                      <div style="text-align: center; margin-top: 30px;">
                          <a href="https://mapadodayuse.com/minhas-viagens" style="display: inline-block; background-color: #0097A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                              🖨️ Acessar para Imprimir
                          </a>
                      </div>
                  </div>
              </div>
          </div>`;

        await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                to: reservationData.guestEmail, 
                subject: `Seu Voucher: ${reservationData.item.name}`, 
                html: emailHtml 
            })
        });
    } catch (e) {
        console.error("Erro ao notificar cliente:", e);
    }
};

// --- 2. NOTIFICAÇÃO PARCEIRO (NOVA VENDA) ---
export const notifyPartner = async (reservationData, paymentId) => {
      try {
          // BLINDAGEM: Se não tiver ID do dono, aborta sem quebrar
          if (!reservationData || !reservationData.ownerId) {
              console.warn("⚠️ notifyPartner chamado sem ownerId:", reservationData);
              return;
          }

          const ownerSnap = await getDoc(doc(db, "users", reservationData.ownerId));

          // 🛡️ BLINDAGEM 2: Se o dono não existir no banco
          if (!ownerSnap.exists()) {
             console.warn("⚠️ Dono não encontrado no banco de dados.");
             return;
          }

          const ownerEmail = ownerSnap.data().email; 

          if (!ownerEmail) {
             console.warn("⚠️ O dono do Day Use não tem e-mail cadastrado.");
             return;
          }

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 40px 0;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #eee;">
                  <div style="background-color: #0097A8; padding: 25px; text-align: center;">
                      <h2 style="color: white; margin: 0; font-size: 24px;">Nova Venda Confirmada! 🚀</h2>
                  </div>
                  <div style="padding: 35px;">
                      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                          Olá! Uma nova reserva foi realizada para o <strong>${reservationData.item.name}</strong>.
                      </p>
                      <div style="background-color: #e0f7fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid #0097A8;">
                          <p style="margin: 0; font-size: 13px; color: #006064; font-weight: bold; text-transform: uppercase;">Valor Total da Venda</p>
                          <p style="margin: 5px 0 10px 0; font-size: 36px; font-weight: bold; color: #0097A8;">${formatBRL(reservationData.total)}</p>
                          <p style="margin: 0; font-size: 11px; color: #666;">* Valor bruto. Taxas serão descontadas.</p>
                      </div>
                      <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Detalhes do Cliente</h3>
                      <ul style="list-style: none; padding: 0; color: #555; font-size: 14px; line-height: 2;">
                          <li><strong>Nome:</strong> ${reservationData.guestName}</li>
                          <li><strong>Data do Passeio:</strong> ${reservationData.date.split('-').reverse().join('/')}</li>
                          <li><strong>Pagamento:</strong> ${reservationData.paymentMethod === 'pix' ? 'Pix' : 'Cartão de Crédito'}</li>
                      </ul>
                      <div style="text-align: center; margin-top: 35px;">
                          <a href="https://mapadodayuse.com/partner" style="background-color: #0097A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">
                              Acessar Painel
                          </a>
                      </div>
                  </div>
              </div>
          </div>`;

        await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  to: ownerEmail, // <--- Agora essa variável existe!
                  subject: `Nova Venda: ${formatBRL(reservationData.total)}`, 
                  html: emailHtml 
              })
          });
          
          console.log("✅ E-mail enviado para o parceiro:", ownerEmail);

      } catch (e) { console.error("Erro email parceiro:", e); }
  };