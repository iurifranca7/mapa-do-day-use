import React, { useEffect, useRef } from 'react';

const CreditCardForm = ({ mp, onCardDataChange }) => {
  const isMounted = useRef(false);
  const fieldsRef = useRef(null); // 1. Ref para guardar as instâncias dos campos

  useEffect(() => {
    if (!mp) return;
    if (isMounted.current) return;

    const mountFields = async () => {
      const cardDiv = document.getElementById('mp-card-number');
      const dateDiv = document.getElementById('mp-expiration-date');
      const codeDiv = document.getElementById('mp-security-code');

      if (!cardDiv || !dateDiv || !codeDiv) {
        setTimeout(mountFields, 100);
        return;
      }

      try {
        // Limpa HTML
        cardDiv.innerHTML = '';
        dateDiv.innerHTML = '';
        codeDiv.innerHTML = '';

        const style = {
          color: '#1e293b',
          fontSize: '14px',
          fontFamily: 'sans-serif',
          placeholderColor: '#94a3b8',
        };

        // Cria os campos
        const cardInstance = mp.fields.create('cardNumber', { placeholder: "0000 0000 0000 0000", style });
        const dateInstance = mp.fields.create('expirationDate', { placeholder: "MM/YY", style });
        const codeInstance = mp.fields.create('securityCode', { placeholder: "123", style });

        // 2. Salva as instâncias na Ref para podermos limpar depois
        fieldsRef.current = { cardInstance, dateInstance, codeInstance };

        cardInstance.mount('mp-card-number');
        dateInstance.mount('mp-expiration-date');
        codeInstance.mount('mp-security-code');

        cardInstance.on('binChange', onCardDataChange);
        
        isMounted.current = true;
        console.log("✅ Campos montados com sucesso!");

      } catch (e) {
        console.error("❌ Erro ao montar campos:", e);
        isMounted.current = false;
      }
    };

    const timer = setTimeout(mountFields, 100);

    // 3. A FAXINA (Cleanup Function)
    // Isso roda automaticamente quando o componente é destruído (ao mudar para Pix)
    return () => {
      clearTimeout(timer);
      isMounted.current = false; // Reseta flag de montagem

      if (fieldsRef.current) {
        console.log("🧹 Limpando instâncias do Mercado Pago...");
        try {
          // Avisa ao SDK para destruir os campos da memória
          const { cardInstance, dateInstance, codeInstance } = fieldsRef.current;
          if (cardInstance) cardInstance.unmount();
          if (dateInstance) dateInstance.unmount();
          if (codeInstance) codeInstance.unmount();
        } catch (err) {
          console.warn("Erro silencioso no cleanup:", err);
        }
        fieldsRef.current = null;
      }
    };
  }, [mp]); 

  return (
    <div className="space-y-4 p-1 relative z-10">
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Número do Cartão</label>
        <div id="mp-card-number" className="w-full border border-slate-300 rounded-lg bg-white h-12 relative z-10" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Validade</label>
          <div id="mp-expiration-date" className="w-full border border-slate-300 rounded-lg bg-white h-12 relative z-10" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">CVV</label>
          <div id="mp-security-code" className="w-full border border-slate-300 rounded-lg bg-white h-12 relative z-10" />
        </div>
      </div>
    </div>
  );
};

export default CreditCardForm;