import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SimpleCalendar = ({ 
  availableDays = [], 
  specialDates = [], // Recebe a lista de datas "exceção" (ex: Carnaval)
  onDateSelect, 
  selectedDate, 
  prices = {}, 
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

  // Função auxiliar segura para formatar YYYY-MM-DD localmente
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isAvailable = (day) => {
     const date = new Date(curr.getFullYear(), curr.getMonth(), day);
     const dateStr = formatDateLocal(date); // Uso da formatação segura
     
     // Zera hora para comparação de passado
     const today = new Date();
     today.setHours(0,0,0,0);

     // 1. Verifica se é passado
     if (date < today) return false;

     // 2. Verifica Bloqueio Global (Prioridade Máxima)
     if (blockedDates.includes(dateStr)) return false;

     // 3. Verifica Abertura (Dia da Semana PADRÃO OU Data ESPECIAL)
     const isStandardDay = availableDays.includes(date.getDay());
     const isSpecialDate = specialDates.includes(dateStr);

     // O dia está liberado se for um dia padrão OU se for uma data especial cadastrada
     return isStandardDay || isSpecialDate;
  };
  
  const getDayPrice = (day) => {
      const date = new Date(curr.getFullYear(), curr.getMonth(), day);
      const dayIndex = date.getDay();
      const dayConfig = prices[dayIndex];
      let price = Number(basePrice);

      if (dayConfig) {
          if (typeof dayConfig === 'object' && dayConfig.adult) {
              price = Number(dayConfig.adult);
          } else if (!isNaN(dayConfig)) {
              price = Number(dayConfig);
          }
      }
      return price > 0 ? price : basePrice;
  };

  // Melhor preço do mês (para destaque verde)
  let minPriceInView = Infinity;
  for (let d = 1; d <= daysInMonth; d++) {
      if (isAvailable(d)) {
          const p = getDayPrice(d);
          if (p < minPriceInView) minPriceInView = p;
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
              {available && <span className={`text-[9px] font-normal mt-0.5 z-10 ${isSelected ? 'text-cyan-100' : isCheapest ? 'text-green-600 font-extrabold' : 'text-slate-400'}`}>R${price}</span>}
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