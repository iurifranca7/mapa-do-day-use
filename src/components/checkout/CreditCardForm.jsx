import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, Calendar, Lock } from 'lucide-react';

const CreditCardForm = ({ mp, onCardDataChange }) => {
  const mounted = useRef(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mp || mounted.current) return;

    try {
      console.log("💳 Inicializando Secure Fields do Mercado Pago...");
      
      const style = {
        color: "#334155", // slate-700
        fontSize: "16px",
        fontFamily: "sans-serif",
        placeholderColor: "#94a3b8" // slate-400
      };

      // 1. Número do Cartão
      const cardNumberElement = mp.fields.create('cardNumber', {
        placeholder: "0000 0000 0000 0000",
        style
      });
      cardNumberElement.mount('form-checkout__cardNumber');
      
      // Listener para detectar bandeira (BIN)
      cardNumberElement.on('binChange', (data) => {
        if (onCardDataChange && data.bin) {
            onCardDataChange({ bin: data.bin });
        }
      });

      // 2. Data de Validade
      const expirationDateElement = mp.fields.create('expirationDate', {
        placeholder: "MM/AA",
        style
      });
      expirationDateElement.mount('form-checkout__expirationDate');

      // 3. Código de Segurança
      const securityCodeElement = mp.fields.create('securityCode', {
        placeholder: "123",
        style
      });
      securityCodeElement.mount('form-checkout__securityCode');

      mounted.current = true;
      setLoading(false);

    } catch (e) {
      console.error("Erro ao montar campos do MP:", e);
    }

    return () => {
      // O SDK do MP não tem um 'unmount' limpo para React, 
      // então controlamos via ref para não duplicar.
    };
  }, [mp]);

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Container Número do Cartão */}
      <div>
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1">
            Número do Cartão
        </label>
        <div className="relative w-full h-[50px] border border-slate-300 rounded-lg bg-white overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#0097A8] focus-within:border-transparent">
            {/* Ícone Decorativo */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                <CreditCard size={18} />
            </div>
            {/* O Mercado Pago injeta o iframe AQUI */}
            <div id="form-checkout__cardNumber" className="w-full h-full pl-10 pr-3 flex items-center" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Container Validade */}
        <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1">
                Validade
            </label>
            <div className="relative w-full h-[50px] border border-slate-300 rounded-lg bg-white overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#0097A8] focus-within:border-transparent">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                    <Calendar size={18} />
                </div>
                <div id="form-checkout__expirationDate" className="w-full h-full pl-10 pr-3 flex items-center" />
            </div>
        </div>

        {/* Container CVV */}
        <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1">
                CVV
            </label>
            <div className="relative w-full h-[50px] border border-slate-300 rounded-lg bg-white overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#0097A8] focus-within:border-transparent">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                    <Lock size={18} />
                </div>
                <div id="form-checkout__securityCode" className="w-full h-full pl-10 pr-3 flex items-center" />
            </div>
        </div>
      </div>

      {loading && (
        <div className="text-center text-xs text-slate-400 animate-pulse">
            Carregando campos de segurança...
        </div>
      )}
    </div>
  );
};

export default CreditCardForm;