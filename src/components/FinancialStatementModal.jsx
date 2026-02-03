import React from 'react';
import { createPortal } from 'react-dom'; // <--- A MÁGICA PARA SAIR DA DIV PAI
import ModalOverlay from './ModalOverlay';
import { X, DollarSign, Tag, Info, AlertCircle, Calculator } from 'lucide-react';
import { formatBRL } from '../utils/format';

const FinancialStatementModal = ({ isOpen, onClose, reservations, monthIndex, items = [] }) => {
  if (!isOpen) return null;

  // 1. Definição da Taxa (Lógica da Promoção)
  const firstActiveItem = items.find(i => i.firstActivationDate);
  const promoStartDate = firstActiveItem?.firstActivationDate?.toDate?.() || null;
  
  // 2. Filtra reservas do mês
  const monthlyRes = reservations.filter(r => 
      r.createdAt && 
      new Date(r.createdAt.seconds * 1000).getMonth() === monthIndex && 
      ['confirmed', 'validated', 'approved'].includes(r.status)
  );

  // 3. Cálculo Financeiro Agregado
  const stats = monthlyRes.reduce((acc, r) => {
      // A. Engenharia reversa do Cupom
      let couponPercent = 0;
      if (r.couponCode) {
          const item = items.find(i => i.id === r.dayuseId);
          const coupon = item?.coupons?.find(c => c.code === r.couponCode);
          if (coupon) couponPercent = coupon.percentage;
      }

      // Valor Pago (O que entrou no checkout)
      const valorPago = r.total || 0;
      
      // Valor Bruto (Valor original do produto sem desconto)
      const valorBruto = couponPercent > 0 ? valorPago / (1 - (couponPercent/100)) : valorPago;
      
      // Valor do Desconto
      const valorDesconto = valorBruto - valorPago;

      // B. Taxa da Plataforma (Sobre o BRUTO)
      let taxaPercentual = 0.12; // Padrão 12%
      
      if (promoStartDate) {
          const resDate = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
          const diffDays = Math.ceil(Math.abs(resDate - promoStartDate) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) taxaPercentual = 0.10;
      }

      const valorTaxa = valorBruto * taxaPercentual;

      // C. Líquido (Bruto - Cupom - Taxa)
      const valorLiquido = valorBruto - valorDesconto - valorTaxa;

      return {
          gross: acc.gross + valorBruto,
          coupons: acc.coupons + valorDesconto,
          fees: acc.fees + valorTaxa,
          net: acc.net + valorLiquido,
          isPromo: taxaPercentual === 0.10
      };
  }, { gross: 0, coupons: 0, fees: 0, net: 0, isPromo: false });

  // --- RENDERIZAÇÃO VIA PORTAL (SOLUÇÃO DO POSICIONAMENTO) ---
  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl animate-fade-in overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
            <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <Calculator className="text-[#0097A8]" size={20}/> Extrato Mensal
                </h3>
                <p className="text-xs text-slate-500">Detalhamento de faturamento e taxas</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* 1. Faturamento Bruto */}
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Faturado (Bruto)</p>
                <div className="flex justify-between items-baseline">
                    <h2 className="text-2xl font-bold text-slate-800">{formatBRL(stats.gross)}</h2>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Vendas Totais</span>
                </div>
            </div>

            {/* Linha Divisória */}
            <div className="border-t border-slate-100"></div>

            {/* 2. Deduções */}
            <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deduções</p>
                
                {/* Cupons */}
                <div className="flex justify-between items-center text-sm text-slate-600">
                    <span className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><Tag size={14}/></div>
                        Descontos (Cupons)
                    </span>
                    <span className="font-medium text-orange-600">- {formatBRL(stats.coupons)}</span>
                </div>

                {/* Taxa Unificada */}
                <div className="flex justify-between items-center text-sm text-slate-600">
                    <span className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-100 text-red-600 rounded-lg"><Info size={14}/></div>
                        <span>
                            Taxa Unificada 
                            <span className="ml-1 text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {stats.isPromo ? 'PROMO 10%' : '12%'}
                            </span>
                        </span>
                    </span>
                    <span className="font-medium text-red-600">- {formatBRL(stats.fees)}</span>
                </div>
            </div>

            {/* 3. Total Líquido */}
            <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-green-800">Total Líquido Estimado</span>
                    <DollarSign size={18} className="text-green-600"/>
                </div>
                <p className="text-3xl font-extrabold text-green-700 tracking-tight">{formatBRL(stats.net)}</p>
            </div>

            {/* Aviso de Variação (Rodapé) */}
            <div className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                <AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0"/>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                    * Os valores disponíveis para saque podem variar conforme o seu plano de recebimento configurado no Mercado Pago (Na hora, 14 dias ou 30 dias).
                </p>
            </div>

        </div>
      </div>
    </ModalOverlay>,
    document.body // O segundo argumento do portal: joga o modal lá pro final do body
  );
};

export default FinancialStatementModal;