import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
const GUARDIAN_TYPES = ['adult', 'combo_adult', 'mix_ac', 'mix_suite', 'super_mix'];

const SimpleCalendar = ({ 
  availableDays = [], 
  specialDates = [], 
  onDateSelect, 
  selectedDate, 
  prices = {}, 
  products = [], 
  blockedDates = [], 
  basePrice = 0 
}) => {
  const [curr, setCurr] = useState(new Date());

  const daysInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
  
  const prevMonth = () => {
    const newDate = new Date(curr);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurr(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(curr);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurr(newDate);
  };

  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isAvailable = (day) => {
      const date = new Date(curr.getFullYear(), curr.getMonth(), day);
      const dateStr = formatDateLocal(date); 
      const today = new Date();
      today.setHours(0,0,0,0);

      if (date < today) return false;
      if (blockedDates.includes(dateStr)) return false;

      // Conversão segura para garantir a comparação
      const safeAvailableDays = availableDays.map(d => Number(d));
      const isStandardDay = safeAvailableDays.includes(date.getDay());
      const isSpecialDate = specialDates.includes(dateStr);

      return isStandardDay || isSpecialDate;
  };
  
  const getDayPrice = (day) => {
      const date = new Date(curr.getFullYear(), curr.getMonth(), day);
      const dateStr = formatDateLocal(date); 
      const dayIndex = date.getDay(); 
      
      let minAdultPrice = Infinity; // Menor preço de Adulto
      let minChildPrice = Infinity; // Menor preço de Criança/Outros (Fallback)

      // 1. Lógica de Produtos (Prioritária)
      if (products && products.length > 0) {
          products.forEach((product) => {
              let isProductAvailable = false;

              // Verifica disponibilidade
              let productWeekDays = product.availableDays || [0, 1, 2, 3, 4, 5, 6];
              const safeWeekDays = productWeekDays.map(d => Number(d));
              const productSpecialDates = product.includedSpecialDates || [];
              
              if (safeWeekDays.includes(dayIndex) || productSpecialDates.includes(dateStr)) {
                  isProductAvailable = true;
              }

              if (isProductAvailable) {
                  let priceFound = Number(product.price || 0);
                  
                  // Override Semanal
                  if (product.weeklyPrices && product.weeklyPrices[dayIndex]) {
                      const wp = product.weeklyPrices[dayIndex];
                      const wpPrice = (typeof wp === 'object') ? wp.price : wp;
                      if (wpPrice !== undefined && wpPrice !== null && wpPrice !== "") {
                          priceFound = Number(wpPrice);
                      }
                  }

                  if (priceFound > 0) {
                      // 🔥 SEPARAÇÃO POR TIPO
                      if (GUARDIAN_TYPES.includes(product.type)) {
                          if (priceFound < minAdultPrice) minAdultPrice = priceFound;
                      } else {
                          if (priceFound < minChildPrice) minChildPrice = priceFound;
                      }
                  }
              }
          });
      }

      // 2. Fallback Legado (Se não achou nada nos produtos, olha no objeto prices)
      if (minAdultPrice === Infinity && minChildPrice === Infinity) {
          const globalDayConfig = prices[dayIndex];
          
          if (globalDayConfig) {
              if (typeof globalDayConfig === 'object') {
                  const pA = Number(globalDayConfig.adult || 0);
                  const pC = Number(globalDayConfig.child || 0);
                  const pU = Number(globalDayConfig.price || 0);
                  
                  // Prioriza Adulto legado
                  if (pA > 0) minAdultPrice = pA;
                  // Se não tem adulto, tenta o genérico (pU) como adulto ou fallback
                  else if (pU > 0) minAdultPrice = pU; 
                  // Criança
                  if (pC > 0) minChildPrice = pC;

              } else if (!isNaN(globalDayConfig)) {
                  const p = Number(globalDayConfig);
                  if (p > 0) minAdultPrice = p; // Assume que preço único é adulto
              }
          } else {
              const base = Number(basePrice || 0);
              if (base > 0) minAdultPrice = base;
          }
      }

      // 🔥 RETORNO COM PRIORIDADE
      // 1º Retorna menor preço adulto
      if (minAdultPrice !== Infinity) return minAdultPrice;
      // 2º Se não tem adulto, retorna menor preço infantil (fallback visual)
      if (minChildPrice !== Infinity) return minChildPrice;
      
      return 0;
  };

  // Lógica visual para destacar o menor preço (ignora 0)
  let minPriceInView = Infinity;
  for (let d = 1; d <= daysInMonth; d++) {
      if (isAvailable(d)) {
          const p = getDayPrice(d);
          if (p > 0 && p < minPriceInView) { 
              minPriceInView = p;
          }
      }
  }

  const handleDayClick = (day) => {
    if (isAvailable(day)) {
      const date = new Date(curr.getFullYear(), curr.getMonth(), day);
      onDateSelect(formatDateLocal(date)); 
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronLeft size={20}/></button>
        <span className="font-bold text-slate-700 capitalize">{curr.toLocaleString('pt-BR',{month:'long', year:'numeric'})}</span>
        <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight size={20}/></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-bold text-slate-400">
        {weekDays.map((d,i)=><span key={i}>{d}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({length: firstDay}).map((_,i)=><div key={`e-${i}`}/>)}
        {Array.from({length: daysInMonth}).map((_,i)=>{
          const d = i+1;
          const available = isAvailable(d);
          const price = getDayPrice(d);
          
          const date = new Date(curr.getFullYear(), curr.getMonth(), d);
          const dateStr = formatDateLocal(date);

          const isSelected = dateStr === selectedDate;
          const isCheapest = available && price === minPriceInView && minPriceInView !== Infinity;

          return (
            <button 
                key={d} type="button" onClick={()=>handleDayClick(d)} disabled={!available}
                className={`h-14 w-full rounded-lg text-sm font-medium relative flex flex-col items-center justify-center transition-all border ${
                    isSelected ? 'bg-[#0097A8] text-white border-[#0097A8] shadow-lg scale-105 z-10'
                    : available ? 'hover:bg-cyan-50 text-slate-700 border-transparent hover:border-cyan-100'
                    : 'text-slate-300 border-transparent cursor-not-allowed bg-slate-50'
                }`}
            >
              <span className="z-10">{d}</span>
              
              {/* 🔥 BLINDAGEM VISUAL: Se disponível mas preço for 0 ou erro, mostra bolinha */}
              {available && (
                  <div className="mt-1 z-10 flex items-center justify-center h-3">
                      {price > 0 ? (
                          <span className={`text-[9px] font-normal ${isSelected ? 'text-cyan-100' : isCheapest ? 'text-green-600 font-extrabold' : 'text-slate-400'}`}>
                              R${price}
                          </span>
                      ) : (
                          // Se preço for 0, mostra apenas uma bolinha verde discreta
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />
                      )}
                  </div>
              )}
            </button>
          )
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex gap-4 justify-center">
         <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Melhor Preço</span>
         <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#0097A8]"></div> Selecionado</span>
      </div>
    </div>
  );
};

export default SimpleCalendar;