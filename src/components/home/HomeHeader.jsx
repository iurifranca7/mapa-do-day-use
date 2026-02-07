import React from 'react';
import { Search } from 'lucide-react';

const HomeHeader = ({ searchTerm, setSearchTerm }) => {
  return (
    // Removi shadow-sm e border-b
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md pt-4 pb-2 px-4 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
            
            {/* H1 Oculto para SEO (Técnica sr-only) */}
            <h1 className="sr-only">Mapa do Day Use - Encontre Day Use Perto de Você</h1>

            {/* Barra de Busca */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={20} className="text-slate-400 group-focus-within:text-[#0097A8] transition-colors"/>
                </div>
                <input 
                    className="block w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-full text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0097A8]/20 focus:border-[#0097A8] shadow-sm transition-all"
                    placeholder="Para onde você quer ir?"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
    </div>
  );
};

export default HomeHeader;