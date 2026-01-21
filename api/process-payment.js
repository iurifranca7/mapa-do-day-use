import { MercadoPagoConfig, Payment } from 'mercadopago';

// API PURA PARA PRODUÇÃO (MODELO CENTRALIZADO / AIRBNB)
// Não conecta no Firebase. Apenas processa o pagamento na conta da Plataforma.

export default async function handler(req, res) {
  // 1. Configuração de CORS (Permite chamadas do seu site)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { 
        token, 
        payment_method_id, 
        installments, 
        payer, 
        bookingDetails, 
        transactionAmount 
    } = req.body;

    // 2. Token da Plataforma (Você recebe o dinheiro)
    // Certifique-se de que MP_ACCESS_TOKEN está nas variáveis de ambiente da Vercel
    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error("Erro Crítico: Token do Mercado Pago não configurado no servidor.");
    }

    // 3. Validação do Valor
    // Como não consultamos o banco, confiamos no valor enviado pelo Frontend (transactionAmount)
    // ou tentamos extrair do bookingDetails.
    let finalAmount = Number(transactionAmount);
    
    if (!finalAmount && bookingDetails?.total) {
        finalAmount = Number(bookingDetails.total);
    }

    if (!finalAmount || finalAmount <= 0) {
         throw new Error("Valor da transação inválido ou zerado.");
    }

    // 4. Configuração do Mercado Pago
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    // 5. Montagem da Cobrança
    const paymentBody = {
      transaction_amount: Number(finalAmount.toFixed(2)),
      description: `Reserva Day Use - ${bookingDetails?.dayuseId || 'Ingresso'}`,
      payment_method_id,
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
      },
      // Metadados para ajudar na sua gestão financeira depois
      metadata: {
          dayuse_id: bookingDetails?.dayuseId,
          // Calcula a parte do parceiro (90%) apenas para registro no MP, não afeta a cobrança
          partner_net: Number((finalAmount * 0.90).toFixed(2)) 
      }
    };

    // Adiciona token e parcelas se for cartão
    if (payment_method_id !== 'pix') {
      paymentBody.token = token;
      paymentBody.installments = Number(installments);
    }

    console.log(`💳 Processando Venda Centralizada: R$ ${finalAmount}`);

    // 6. Executa a Venda
    const result = await payment.create({ body: paymentBody });

    // 7. Retorna Sucesso
    return res.status(200).json({
      id: result.id,
      status: result.status,
      detail: result.status_detail,
      point_of_interaction: result.point_of_interaction, // QR Code (se for Pix)
      charged_amount: finalAmount
    });

  } catch (error) {
    console.error("Erro no Processamento:", error);
    
    let msg = error.message;
    
    // Tratamento de erros comuns do MP
    if (JSON.stringify(error).includes("user_allowed_only_in_test")) {
        msg = "ERRO: Não é possível pagar usando a mesma conta do vendedor. Use um e-mail diferente.";
    } else if (error.cause && error.cause[0]) {
        msg = `Mercado Pago Recusou: ${error.cause[0].description || error.cause[0].code}`;
    }

    return res.status(500).json({ 
        error: 'Falha no pagamento', 
        message: msg
    });
  }
}