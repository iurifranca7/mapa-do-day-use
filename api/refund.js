import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';
import { MailtrapClient } from 'mailtrap';

// --- TEMPLATE DO EMAIL DE ESTORNO ---
const getRefundEmailHtml = (guestName, amount, paymentId, itemName) => {
    return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <div style="background-color: #ef4444; padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Reembolso Processado</h1>
                <p style="color: #fee2e2; margin: 8px 0 0; font-size: 14px;">O valor foi devolvido para sua conta</p>
            </div>

            <div style="padding: 32px;">
                <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">
                    Olá, <strong>${guestName}</strong>.
                </p>
                <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
                    Confirmamos que o estorno referente à sua reserva em <strong>${itemName}</strong> foi realizado com sucesso.
                </p>

                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #991b1b; font-weight: bold; letter-spacing: 0.5px;">Valor Reembolsado</p>
                    <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #dc2626;">R$ ${amount}</p>
                </div>

                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; font-size: 13px; color: #64748b;">
                    <p style="margin: 0 0 8px;"><strong>ℹ️ Prazos Bancários:</strong></p>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 4px;"><strong>Pix:</strong> Geralmente imediato (verifique seu extrato).</li>
                        <li><strong>Cartão de Crédito:</strong> Pode levar de 1 a 2 faturas para aparecer, dependendo do seu banco.</li>
                    </ul>
                </div>

                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px;">
                    ID da Transação: ${paymentId}
                </p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">Mapa do Day Use</p>
            </div>
        </div>
    </div>
    `;
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
    // Agora aceitamos mais dados para poder enviar o e-mail
    const { paymentId, amount, partnerAccessToken, guestEmail, guestName, itemName } = req.body;

    // 1. Validação
    if (!paymentId) throw new Error("ID do pagamento não fornecido.");

    // 2. Token de Acesso
    const accessToken = partnerAccessToken || process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Token do Mercado Pago não configurado.");

    // 3. Conexão MP e Estorno
    const client = new MercadoPagoConfig({ accessToken });
    const refund = new PaymentRefund(client);

    const body = amount ? { amount: Number(amount) } : undefined;
    
    console.log(`💸 Processando Estorno MP. ID: ${paymentId}`);
    const result = await refund.create({ payment_id: paymentId, body });

    // 4. ENVIO DE EMAIL (MAILTRAP)
    // Só tentamos enviar se tivermos o email do cliente e o Token do Mailtrap
    if (guestEmail && process.env.MAILTRAP_TOKEN) {
        try {
            console.log(`📧 Enviando aviso de estorno para: ${guestEmail}`);
            const mailtrap = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });
            
            const senderEmail = "mailtrap@demomailtrap.com"; // Em produção, use seu domínio verificado
            
            await mailtrap.send({
                from: { email: senderEmail, name: "Mapa do Day Use" },
                to: [{ email: guestEmail }],
                subject: `Reembolso Processado: ${itemName || 'Sua Reserva'}`,
                html: getRefundEmailHtml(
                    guestName || 'Cliente', 
                    result.amount || amount || 'Total', // Tenta pegar do resultado do MP ou do body
                    paymentId,
                    itemName || 'Day Use'
                ),
                category: "Refund Notification"
            });
        } catch (emailError) {
            console.error("⚠️ Erro ao enviar e-mail de estorno (mas o dinheiro foi devolvido):", emailError);
            // Não vamos quebrar a resposta se o e-mail falhar, pois o dinheiro JÁ FOI devolvido.
        }
    }

    return res.status(200).json({ 
        success: true, 
        id: result.id,
        status: result.status,
        message: "Estorno realizado e e-mail enviado."
    });

  } catch (error) {
    console.error("Erro Refund API:", error);
    return res.status(500).json({ 
        error: 'Erro no reembolso', 
        message: error.message || "Erro desconhecido",
        details: error.cause 
    });
  }
}