import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Button from '../Button'; // Seu componente de botão existente

const ComparisonSearchTool = ({ allItems }) => {
  const navigate = useNavigate();
  
  const [selected1, setSelected1] = useState(null);
  const [selected2, setSelected2] = useState(null);
  const [term1, setTerm1] = useState("");
  const [term2, setTerm2] = useState("");
  const [showList1, setShowList1] = useState(false);
  const [showList2, setShowList2] = useState(false);

  const filtered1 = allItems.filter(i => i.name.toLowerCase().includes(term1.toLowerCase())).slice(0, 5);
  const filtered2 = allItems.filter(i => i.name.toLowerCase().includes(term2.toLowerCase())).slice(0, 5);

  const handleCompare = () => {
      if (selected1 && selected2) {
          navigate(`/comparativo/${selected1.slug}-vs-${selected2.slug}`);
      }
  };

  const renderInputGroup = (label, term, setTerm, showList, setShowList, selected, setSelected, filtered, zIndexClass) => (
    <div className={`relative ${zIndexClass}`}> 
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 text-left tracking-wider pl-1">{label}</p>
        
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400 group-focus-within:text-[#0097A8] transition-colors"/>
            </div>

            <input 
                className="w-full bg-slate-50 border border-transparent hover:bg-white hover:border-slate-200 focus:bg-white focus:border-[#0097A8] focus:ring-4 focus:ring-[#0097A8]/10 pl-10 pr-12 py-3 rounded-xl font-semibold text-slate-700 outline-none transition-all text-sm shadow-sm"
                placeholder="Buscar local..."
                value={term}
                onChange={e => { setTerm(e.target.value); setShowList(true); setSelected(null); }}
                onFocus={() => setShowList(true)}
                onBlur={() => setTimeout(() => setShowList(false), 200)}
            />

            {selected && (
                <div className="absolute right-2 top-2 w-8 h-8 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                    <img src={selected.image} className="w-full h-full object-cover" alt={selected.name} />
                </div>
            )}

            {showList && term && (
                <div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-xl mt-2 border border-slate-100 overflow-hidden text-left animate-fade-in-down">
                    {filtered.length > 0 ? filtered.map(item => (
                        <div 
                            key={item.slug} 
                            onClick={() => { setSelected(item); setTerm(item.name); setShowList(false); }} 
                            className="p-3 hover:bg-cyan-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center gap-3 transition-colors"
                        >
                            <img src={item.image} className="w-8 h-8 rounded-md object-cover bg-slate-100" alt="" />
                            <div>
                                <p className="font-bold text-sm text-slate-700 leading-tight">{item.name}</p>
                                <p className="text-[10px] text-slate-400">{item.city}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="p-3 text-xs text-slate-400 text-center">Nenhum local encontrado</div>
                    )}
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative mb-16 max-w-3xl mx-auto w-full">
        
        {/* 🔥 CORREÇÃO: O 'VS' agora está DENTRO da div 'grid'. 
           Isso garante que o 'top-1/2' seja calculado em relação aos inputs apenas. */}
        <div className="grid md:grid-cols-2 gap-10 md:gap-12 relative">
            
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center font-black text-xs border-4 border-white">
                VS
            </div>

            {renderInputGroup("Primeira Opção", term1, setTerm1, showList1, setShowList1, selected1, setSelected1, filtered1, "z-30")}
            {renderInputGroup("Segunda Opção", term2, setTerm2, showList2, setShowList2, selected2, setSelected2, filtered2, "z-20")}
        </div>

        <div className="mt-8 flex justify-center">
            <Button 
                onClick={handleCompare} 
                disabled={!selected1 || !selected2}
                className="w-full md:w-auto px-8 py-3 text-sm font-bold shadow-lg shadow-[#0097A8]/20 rounded-xl"
            >
                Comparar Agora
            </Button>
        </div>
    </div>
  );
};

export default ComparisonSearchTool;