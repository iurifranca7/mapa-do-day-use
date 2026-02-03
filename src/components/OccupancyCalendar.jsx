import React from 'react';
import { formatBRL } from '../utils/format';

const OccupancyCalendar = ({ reservations = [], selectedDate, onDateSelect }) => {
  // Gera os próximos 14 dias
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const getStatsForDate = (date) => {
    const daily = reservations.filter(r => r.date === date && r.status !== 'cancelled');
    return daily.reduce((acc, curr) => acc + Number(curr.adults || 0) + Number(curr.children || 0), 0);
  };

  return (
    <div className="mb-8 overflow-x-auto custom-scrollbar pb-2">
      <div className="flex gap-3 min-w-max">
        {days.map(date => {
          const count = getStatsForDate(date);
          const isSelected = date === selectedDate;
          const [year, month, day] = date.split('-');
          
          return (
            <button
              key={date}
              onClick={() => onDateSelect(date)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-xl min-w-[80px] border transition-all
                ${isSelected 
                  ? 'bg-[#0097A8] text-white border-[#0097A8] shadow-md transform scale-105' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#0097A8] hover:bg-cyan-50'}
              `}
            >
              <span className="text-xs uppercase font-bold opacity-80">
                {new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','')}
              </span>
              <span className="text-xl font-bold my-1">{day}/{month}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                {count} pax
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OccupancyCalendar;