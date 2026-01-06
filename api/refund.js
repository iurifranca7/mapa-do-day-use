import { MercadoPagoConfig, PaymentRefund } from 'mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { reservationId, action, percentage, newDate } = req.body;
  // action: 'reschedule', 'cancel_full', 'cancel_partial'

  try {
    const resRef = db.collection('reservations').doc(reservationId);
    const resDoc = await resRef.get();
    
    if (!resDoc.exists) throw new Error("Reserva não encontrada.");
    const reservation = resDoc.data();

    // Ação: Reagendar (Apenas banco de dados)
    if (action === 'reschedule') {
        await resRef.update({ date: newDate, updatedAt: new Date() });
        return res.status(200).json({ success: true, message: "Data alterada com sucesso." });
    }

    // Ação: Cancelamento (Envolve Mercado Pago)
    if (action.includes('cancel')) {
        if (!reservation.paymentId) throw new Error("ID do pagamento não encontrado nesta reserva. Não é possível estornar automaticamente.");

        // Busca token do parceiro para autorizar o estorno
        const ownerDoc = await db.collection('users').doc(reservation.ownerId).get();
        const partnerToken = ownerDoc.data()?.mp_access_token;

        if (!partnerToken) throw new Error("Token do parceiro não encontrado.");

        const client = new MercadoPagoConfig({ accessToken: partnerToken });
        const refund = new PaymentRefund(client);

        let refundAmount;
        if (action === 'cancel_full') {
            refundAmount = undefined; // MP entende como total se omitido, ou podemos mandar o valor cheio
        } else {
            // Reembolso Parcial (Ex: Devolver 50%)
            // O valor a devolver é calculado sobre o total pago
            refundAmount = Number((reservation.total * (percentage / 100)).toFixed(2));
        }

        // Executa estorno no MP
        await refund.create({
            payment_id: reservation.paymentId,
            body: refundAmount ? { amount: refundAmount } : {}
        });

        // Atualiza status no banco
        await resRef.update({
            status: 'cancelled',
            refundStatus: action === 'cancel_full' ? 'full' : 'partial',
            refundedAmount: refundAmount || reservation.total,
            cancelledAt: new Date()
        });

        return res.status(200).json({ success: true, message: "Cancelamento e estorno realizados." });
    }

  } catch (error) {
    console.error("Erro Refund:", error);
    return res.status(500).json({ error: error.message });
  }
}