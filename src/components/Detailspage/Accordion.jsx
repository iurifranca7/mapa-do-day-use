import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const Accordion = ({ title, icon: Icon, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-0 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left group hover:bg-slate-50/50 transition-colors px-2 rounded-xl"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-[#0097A8]/10 text-[#0097A8]' : 'bg-slate-50 text-slate-400 group-hover:text-slate-600'}`}>
              <Icon size={18} />
            </div>
          )}
          <span className={`font-bold text-sm ${isOpen ? 'text-slate-900' : 'text-slate-600'}`}>
            {title}
          </span>
        </div>
        <ChevronDown 
          size={18} 
          className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#0097A8]' : ''}`} 
        />
      </button>

      <div 
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100 pb-6' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-2 pt-2 text-slate-500 text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Accordion;