import React from 'react';
import { LayoutDashboard, Users, Ticket, BarChart3, FileText, Shield } from 'lucide-react';

const AdminLayout = ({ activeTab, onTabChange, children }) => {
  const menuItems = [
    { id: 'financial', label: 'Visão CFO', icon: <BarChart3 size={20} /> },
    { id: 'partners', label: 'Gestão Parceiros', icon: <Users size={20} /> },
    { id: 'coupons', label: 'Cupons Admin', icon: <Ticket size={20} /> },
    { id: 'cms', label: 'CMS / Conteúdo', icon: <LayoutDashboard size={20} /> },
    { id: 'leads', label: 'Leads', icon: <FileText size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-full z-10 hidden md:block">
        <div className="p-6 flex items-center gap-2 border-b border-slate-100">
          <Shield className="text-[#0097A8]" size={28} />
          <span className="font-bold text-xl text-slate-800 tracking-tight">Admin<span className="text-[#0097A8]">Pro</span></span>
        </div>
        <nav className="p-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-[#0097A8]/10 text-[#0097A8]' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{menuItems.find(i => i.id === activeTab)?.label}</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie a plataforma Mapa do Day Use</p>
        </header>
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;