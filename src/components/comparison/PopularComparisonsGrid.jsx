import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const PopularComparisonsGrid = ({ comparisons }) => {
  const navigate = useNavigate();

  if (!comparisons || comparisons.length === 0) return null;

  return (
    <div className="w-full text-left max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8 justify-center">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">
                Comparações em Alta 🔥
            </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisons.map((comp, idx) => (
                <div 
                    key={idx}
                    onClick={() => navigate(comp.url)}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col"
                >
                    {/* IMAGEM SPLIT */}
                    <div className="h-40 relative flex">
                        <div className="w-1/2 h-full relative">
                            <img src={comp.itemA.image} className="w-full h-full object-cover" alt={comp.itemA.name} />
                            {/* Overlay sutil */}
                            <div className="absolute inset-0 bg-black/10"></div>
                        </div>
                        <div className="w-1/2 h-full relative">
                            <img src={comp.itemB.image} className="w-full h-full object-cover" alt={comp.itemB.name} />
                            <div className="absolute inset-0 bg-black/10"></div>
                        </div>
                        
                        {/* VS Minimalista */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center font-black text-[10px] text-slate-800 shadow-sm border border-slate-100 z-10">
                            VS
                        </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-slate-700 text-sm leading-tight mb-2 group-hover:text-[#0097A8] transition-colors text-center">
                                {comp.itemA.name} <br/> <span className="text-slate-300 font-light text-[10px]">vs</span> <br/> {comp.itemB.name}
                            </h3>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-center gap-1 text-[#0097A8]">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Ver batalha</span>
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform"/>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default PopularComparisonsGrid;