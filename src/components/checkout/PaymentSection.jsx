import React, { useState, useEffect } from 'react';
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

  // ESTADO DE CONTROLE DE MONTAGEM DO CARTÃO
  const [isCardFormReady, setIsCardFormReady] = useState(false);

  // GARANTIA DE PRIORIDADE: Força o método inicial como PIX ao montar
  useEffect(() => {
    if (paymentMethod !== 'pix') {
      changeMethod('pix');
    }
  }, []); 

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

        {/* ÁREA DE PAGAMENTO */}
        <div className="relative min-h-[400px]">
            
            {/* --- CONTEÚDO PIX --- */}
            {paymentMethod === 'pix' && (
                <div className="animate-fade-in block">
                    <div className="text-center py-4">
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
            {/* Usamos visibility e opacity para manter o form no DOM */}
            <div 
                className={`transition-all duration-500 w-full ${paymentMethod === 'card' ? 'opacity-100 visible relative' : 'opacity-0 invisible absolute top-0 left-0 pointer-events-none'}`}
            >
                {mpInstance ? (
                    <div className="space-y-5">
                        <CreditCardForm 
                            mp={mpInstance} 
                            onReady={() => {
                                console.log("Formulário de Cartão Montado!");
                                setIsCardFormReady(true);
                            }}
                            onCardDataChange={(data) => {
                                if (data.bin && mpInstance) {
                                    mpInstance.getPaymentMethods({ bin: data.bin }).then(({ results }) => {
                                        if(results?.[0]) {
                                            setMpPaymentMethodId(results[0].id);
                                            setIssuerId(results[0].issuer.id);
                                        }
                                    }).catch(console.error);
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
                        
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Parcelamento</label>
                            <div className="relative">
                                <select 
                                    className="w-full border border-slate-300 p-3 rounded-lg mt-1 bg-white appearance-none focus:ring-2 focus:ring-[#0097A8] outline-none" 
                                    value={installments} 
                                    onChange={e=>setInstallments(e.target.value)}
                                >
                                    <option value={1}>1x de {formatBRL(finalTotal)} (Sem juros)</option>
                                    <option value={2}>2x de {formatBRL(finalTotal/2)}</option>
                                    <option value={3}>3x de {formatBRL(finalTotal/3)}</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                            </div>
                        </div>

                        <AddressForm {...addressProps} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl min-h-[200px]">
                        <div className="w-8 h-8 border-4 border-[#0097A8] border-t-transparent rounded-full animate-spin mb-4"/>
                        <p className="text-sm text-slate-500 font-medium">Carregando módulos de pagamento...</p>
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
                disabled={processing || !user || (paymentMethod === 'card' && !isCardFormReady)}
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