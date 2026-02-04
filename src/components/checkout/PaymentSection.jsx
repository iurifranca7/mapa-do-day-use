import { useState, useEffect } from 'react'; // Importação corrigida para evitar tela branca
import { Lock, CreditCard, QrCode, ChevronDown, Info } from 'lucide-react';
import Button from './../Button';
import { formatBRL } from '../../utils/format';
import CreditCardForm from './../../CreditCardForm';
import AddressForm from './AddressForm';

const PaymentSection = ({
  paymentMethod, changeMethod,
  mpInstance, setMpPaymentMethodId, setIssuerId,
  cardName, setCardName,
  docNumber, setDocNumber,
  installments, setInstallments,
  finalTotal,
  processPayment, processing,
  saveUserData, setSaveUserData,
  user,
  addressProps
}) => {

  // Controle de estado do formulário
  const [isCardFormReady, setIsCardFormReady] = useState(false);
  
  // 🔥 NOVOS STATES: Necessários para a lógica de busca de parcelas e juros
  const [installmentOptions, setInstallmentOptions] = useState([]);
  const [bin, setBin] = useState('');

  // Fallback de segurança: Se o MP carregar mas o callback falhar, libera o botão em 3s
  useEffect(() => {
    if (paymentMethod === 'card' && mpInstance && !isCardFormReady) {
       const safetyTimer = setTimeout(() => setIsCardFormReady(true), 3000);
       return () => clearTimeout(safetyTimer);
    }
  }, [paymentMethod, mpInstance, isCardFormReady]);

  // Garante Pix como padrão se nada estiver selecionado
  useEffect(() => {
    if (!paymentMethod) {
      changeMethod('pix');
    }
  }, []);

  // 🔥 EFEITO QUE BUSCA AS PARCELAS E CORRIGE O ERRO DE ISSUER
  useEffect(() => {
    // Só roda se tivermos instância, valor total e os 6 primeiros dígitos do cartão (BIN)
    if (mpInstance && finalTotal > 0 && bin && bin.length >= 6) {
      console.log("🔄 [DEBUG] Buscando parcelas para BIN:", bin, "Valor:", finalTotal);

      mpInstance.getInstallments({
        amount: String(finalTotal),
        bin: bin,
        paymentTypeId: 'credit_card'
      })
      .then((response) => {
        if (response.length > 0) {
          const data = response[0]; // Dados do meio de pagamento identificado
          
          // 🛠️ AS DUAS LINHAS VITAIS PARA CORRIGIR O ERRO "installments_excludes_country"
          // Capturamos o Banco (Issuer) e a Bandeira diretamente da resposta de parcelamento
          if (data.issuer && data.issuer.id) {
              setIssuerId(data.issuer.id);
          }
          if (data.payment_method_id) {
              setMpPaymentMethodId(data.payment_method_id);
          }

          const payerCosts = data.payer_costs;
          
          // 🔍 FILTRO: Limita a exibição para no máximo 5 parcelas
          const filteredOptions = payerCosts.filter(opt => opt.installments <= 5);
          
          setInstallmentOptions(filteredOptions);
          
          // Se a parcela selecionada anteriormente não existe mais na nova lista, reseta para 1x
          if (!installments || !filteredOptions.find(opt => opt.installments === Number(installments))) {
              setInstallments(1);
          }
        } else {
            setInstallmentOptions([]);
        }
      })
      .catch((error) => {
        console.error("❌ [DEBUG] Erro ao buscar parcelas:", error);
      });
    }
  }, [mpInstance, finalTotal, bin]);

  return (
    <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 transition-all duration-300 ${!user ? 'opacity-60 grayscale-[0.8]' : ''}`}>
        <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">Pagamento Seguro <Lock size={16} className="text-green-500"/></h3>
        </div>

        {/* Abas de Seleção */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            <button 
                type="button"
                onClick={() => changeMethod('pix')} 
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${paymentMethod === 'pix' ? 'bg-white shadow-md text-[#0097A8] transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <QrCode size={16}/> Pix
            </button>

            <button 
                type="button"
                onClick={() => changeMethod('card')} 
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${paymentMethod === 'card' ? 'bg-white shadow-md text-[#0097A8] transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <CreditCard size={16}/> Cartão
            </button>
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div className="relative">
            
            {/* --- CONTEÚDO PIX --- */}
            {paymentMethod === 'pix' && (
                <div className="animate-fade-in block pb-4">
                    <div className="text-center">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left flex items-start gap-3">
                            <Info size={20} className="text-blue-600 mt-0.5 shrink-0"/>
                            <div>
                                <p className="text-sm text-blue-900 font-bold mb-1">Aprovação Imediata</p>
                                <p className="text-xs text-blue-700 leading-relaxed">O voucher é enviado para o seu e-mail assim que o pagamento é confirmado via Pix.</p>
                            </div>
                        </div>

                        <div className="text-left">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">CPF para emissão (Obrigatório)</label>
                            <input 
                                className="w-full border border-slate-300 p-3 rounded-lg mt-1 focus:ring-2 focus:ring-[#0097A8] outline-none transition-all text-lg tracking-wide" 
                                placeholder="000.000.000-00" 
                                value={docNumber} 
                                onChange={e=>setDocNumber(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- CONTEÚDO CARTÃO DE CRÉDITO --- */}
            <div 
                className="transition-opacity duration-300 w-full"
                style={{
                    opacity: paymentMethod === 'card' ? 1 : 0,
                    position: paymentMethod === 'card' ? 'relative' : 'absolute',
                    top: paymentMethod === 'card' ? 'auto' : 0,
                    left: paymentMethod === 'card' ? 'auto' : -9999, // Joga para fora da tela
                    pointerEvents: paymentMethod === 'card' ? 'auto' : 'none',
                    visibility: 'visible' // OBRIGATÓRIO: O Mercado Pago exige que o elemento seja visível no DOM
                }}
            >
                {mpInstance ? (
                    <div className="space-y-5">
                        <CreditCardForm 
                            mp={mpInstance} 
                            onReady={() => setIsCardFormReady(true)}
                            onCardDataChange={(data) => {
                                // Captura o BIN e guarda no estado para disparar o useEffect
                                if (data.bin) {
                                    setBin(data.bin);
                                }
                            }}
                        />
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Nome no Cartão</label>
                                <input 
                                    className="w-full border border-slate-300 p-3 rounded-lg mt-1 focus:ring-2 focus:ring-[#0097A8] outline-none transition-all" 
                                    value={cardName} 
                                    onChange={e=>setCardName(e.target.value)} 
                                    placeholder="Como está impresso" 
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">CPF do Titular</label>
                                <input 
                                    className="w-full border border-slate-300 p-3 rounded-lg mt-1 focus:ring-2 focus:ring-[#0097A8] outline-none transition-all" 
                                    placeholder="000.000.000-00" 
                                    value={docNumber} 
                                    onChange={e=>setDocNumber(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {/* SELECT DE PARCELAMENTO DINÂMICO (Juros Calculados pelo MP) */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Parcelamento (Max 5x)</label>
                            <div className="relative">
                                <select 
                                    className="w-full border border-slate-300 p-3 rounded-lg mt-1 bg-white appearance-none focus:ring-2 focus:ring-[#0097A8] outline-none truncate pr-8 text-sm" 
                                    value={installments} 
                                    onChange={e=>setInstallments(e.target.value)}
                                    disabled={installmentOptions.length === 0}
                                >
                                    {installmentOptions.length === 0 ? (
                                        <option value={1}>1x de {formatBRL(finalTotal)} (Calculando...)</option>
                                    ) : (
                                        installmentOptions.map((opt) => {
                                            // Lógica Visual: Compara total parcelado com total à vista para indicar juros
                                            const totalAmount = opt.total_amount || 0;
                                            const hasInterest = totalAmount > (finalTotal + 0.10); 
                                            const label = hasInterest ? `(Total: ${formatBRL(totalAmount)})` : "(Sem juros)";

                                            return (
                                                <option key={opt.installments} value={opt.installments}>
                                                    {opt.installments}x de {formatBRL(opt.installment_amount)} {label}
                                                </option>
                                            );
                                        })
                                    )}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 pl-1">
                                * Juros de parcelamento calculados pela operadora do cartão.
                            </p>
                        </div>

                        <AddressForm {...addressProps} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl min-h-[200px]">
                        <div className="w-8 h-8 border-4 border-[#0097A8] border-t-transparent rounded-full animate-spin mb-4"/>
                        <p className="text-sm text-slate-500 font-medium">Carregando segurança...</p>
                    </div>
                )}
            </div>
        </div>

        {/* CHECKBOX SALVAR DADOS */}
        {paymentMethod === 'card' && (
            <div className="mt-4 flex items-center gap-2 animate-fade-in">
                <input 
                    type="checkbox" 
                    id="save-data" 
                    className="w-4 h-4 text-[#0097A8] rounded border-slate-300 focus:ring-[#0097A8]"
                    checked={saveUserData}
                    onChange={e => setSaveUserData(e.target.checked)}
                />
                <label htmlFor="save-data" className="text-xs text-slate-600 cursor-pointer select-none">
                    Salvar dados para facilitar compras futuras.
                </label>
            </div>
        )}

        {/* Botão de Ação */}
        <div className="mt-8">
            <Button 
                className="w-full py-4 text-lg shadow-lg shadow-[#0097A8]/20 hover:shadow-[#0097A8]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={processPayment} 
                disabled={
                    processing || 
                    !user || 
                    (paymentMethod === 'card' && !mpInstance) || 
                    (paymentMethod === 'card' && mpInstance && !isCardFormReady)
                }
            >
                {processing ? (
                    <span className="flex items-center gap-2 justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> 
                        Processando...
                    </span>
                ) : (
                    `Pagar ${formatBRL(finalTotal)}`
                )}
            </Button>
        </div>

        {/* Rodapé de Segurança */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-2 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1 justify-center">
                <Lock size={10}/> Ambiente Criptografado e Seguro
            </p>
            <span className="text-[10px] text-slate-500">Pagamento processado via Mercado Pago</span>
        </div>
    </div>
  );
};

export default PaymentSection;