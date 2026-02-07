import React from 'react';
import { Search, ArrowRight } from 'lucide-react';

const HomeSearchBar = ({ searchTerm, setSearchTerm }) => {
  return (
    <div className="sticky top-4 z-30 px-4 -mt-8">
        <div className="max-w-3xl mx-auto">
            <div className="relative group bg-white rounded-full p-1.5 shadow-xl border border-slate-100 flex items-center transition-all focus-within:ring-4 focus-within:ring-cyan-100">
                <div className="pl-4 pr-2 text-slate-400">
                    <Search size={20} className="group-focus-within:text-[#0097A8] transition-colors"/>
                </div>
                <input 
                    className="flex-1 bg-transparent py-3 text-slate-700 font-medium placeholder:text-slate-400 outline-none"
                    placeholder="Para onde você quer ir? (Ex: Brumadinho, Hotel Fazenda...)"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button className="bg-[#0097A8] text-white p-3 rounded-full hover:bg-[#007F8F] transition-colors shadow-sm">
                    <ArrowRight size={20}/>
                </button>
            </div>
        </div>
    </div>
  );
};

export default HomeSearchBar;