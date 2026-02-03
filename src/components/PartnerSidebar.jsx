import React from 'react';
import { 
  LayoutDashboard, // <--- NOVO ÍCONE
  Store,
  ShoppingBag,
  DollarSign,
  FileBarChart2,
  Ticket,
  Users,
  CalendarDays,
  LogOut 
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const PartnerSidebar = ({ activeTab, setActiveTab }) => {
  
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: <LayoutDashboard size={20} /> }, // <--- VOLTOU!
    { id: 'my-dayuse', label: 'Meu Day Use', icon: <Store size={20} /> },
    { id: 'products', label: 'Produtos', icon: <ShoppingBag size={20} /> },
    { id: 'sales', label: 'Vendas', icon: <DollarSign size={20} /> },
    { id: 'reports', label: 'Relatórios', icon: <FileBarChart2 size={20} /> },
    { id: 'coupons', label: 'Cupons', icon: <Ticket size={20} /> },
    { id: 'team', label: 'Equipe', icon: <Users size={20} /> },
    { id: 'schedule', label: 'Agenda', icon: <CalendarDays size={20} /> },
  ];

  const handleLogout = async () => {
    if (window.confirm("Deseja sair do painel?")) {
      await signOut(auth);
    }
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-50">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0097A8] rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
            <span className="font-bold text-slate-800 text-lg tracking-tight">Parceiro</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                activeTab === item.id
                  ? 'bg-[#0097A8]/10 text-[#0097A8]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium">
            <LogOut size={20} /> Sair da conta
          </button>
        </div>
      </div>

      {/* MOBILE BOTTOM BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-2 py-2 flex justify-between items-center pb-safe overflow-x-auto no-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${
              activeTab === item.id ? 'text-[#0097A8]' : 'text-slate-400'
            }`}
          >
            {React.cloneElement(item.icon, { size: 22 })}
            <span className="text-[9px] font-bold whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

export default PartnerSidebar;