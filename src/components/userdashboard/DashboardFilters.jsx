import React from 'react';
import { Search, Filter, ChevronUp, ChevronDown, X } from 'lucide-react';

const DashboardFilters = ({
  searchTerm, setSearchTerm,
  filterDate, setFilterDate,
  filterStatus, setFilterStatus,
  showFilters, setShowFilters,
  hasActiveFilters, clearFilters
}) => {
  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Meus Ingressos</h1>
        
        {/* BOTÃO MOBILE PARA ABRIR FILTROS */}
        <button 
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl w-full justify-between"
        >
            <span className="flex items-center gap-2"><Filter size={16}/> Filtros {hasActiveFilters && <span className="w-2 h-2 bg-teal-500 rounded-full"></span>}</span>
            {showFilters ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </button>
      </div>

      {/* BARRA DE FILTROS (COLLAPSIBLE NO MOBILE) */}
      <div className={`bg-white md:p-4 rounded-2xl md:border border-slate-200 md:shadow-sm mb-8 flex flex-col md:flex-row gap-4 overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-[500px] opacity-100 p-4 border shadow-sm' : 'max-h-0 opacity-0 md:max-h-none md:opacity-100 md:overflow-visible'}`}>
          
          {/* Campo de Busca */}
          <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input 
                  type="text" 
                  placeholder="Buscar por nome ou cidade..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>

          {/* Campo de Data */}
          <div className="relative w-full md:w-auto">
              <input 
                  type="date" 
                  className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
              />
          </div>

          {/* Campo de Status */}
          <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <select 
                  className="w-full md:w-auto pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
              >
                  <option value="all">Todos os Status</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="waiting_payment">Aguardando Pagamento</option>
                  <option value="validated">Utilizados</option>
                  <option value="cancelled">Cancelados</option>
              </select>
          </div>

          {/* Botão Limpar Filtros */}
          {hasActiveFilters && (
              <button 
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors md:w-auto w-full border border-transparent hover:border-red-100"
              >
                  <X size={14}/> Limpar
              </button>
          )}
      </div>
    </>
  );
};

export default DashboardFilters;