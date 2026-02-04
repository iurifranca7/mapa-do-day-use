import React, { useState } from 'react';
import { Download } from 'lucide-react';
import Button from '../../Button';

const LeadsTab = ({ leads }) => {
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const filteredLeads = leads.filter((l) => {
    if (!dateStart && !dateEnd) return true;
    const d = l.createdAt?.toDate ? l.createdAt.toDate() : new Date();
    const s = dateStart ? new Date(dateStart) : new Date('2000-01-01');
    const e = dateEnd ? new Date(dateEnd) : new Date();
    e.setHours(23, 59, 59);
    return d >= s && d <= e;
  });

  const exportLeadsCSV = () => {
    const headers = ["Data Hora", "Nome", "Email", "Cidade", "Newsletter", "Companhia", "Pet", "Alimentação", "Exigência"];
    const rows = filteredLeads.map(l => [
      l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString('pt-BR') : '-',
      l.name, l.email, l.city, l.newsletter ? "Sim" : "Não",
      l.preferences?.company || "-", 
      l.preferences?.pet ? "Sim" : "Não", 
      l.preferences?.food || "-",
      l.preferences?.must_have || "-"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_dayuse_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl border flex justify-between items-center">
        <div className="flex gap-4">
          <input type="date" className="border p-2 rounded" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          <input type="date" className="border p-2 rounded" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 mb-1">Total: <strong>{filteredLeads.length}</strong></p>
          <Button onClick={exportLeadsCSV} variant="outline" className="text-xs h-9">
            <Download size={14} /> CSV
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-3xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
              <tr>
                <th className="p-4 whitespace-nowrap">Data/Hora</th>
                <th className="p-4 whitespace-nowrap">Nome</th>
                <th className="p-4 whitespace-nowrap">Email</th>
                <th className="p-4 whitespace-nowrap">Cidade</th>
                <th className="p-4 whitespace-nowrap">Preferências</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-500 whitespace-nowrap">
                    {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="p-4 font-bold text-slate-700">{lead.name}</td>
                  <td className="p-4 text-slate-600">{lead.email}</td>
                  <td className="p-4 text-slate-600">{lead.city}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 text-xs">
                      {lead.preferences?.company && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded w-fit">Perfil: {lead.preferences.company}</span>}
                      {lead.preferences?.pet !== undefined && <span className={`px-2 py-0.5 rounded w-fit ${lead.preferences.pet ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>Pet: {lead.preferences.pet ? 'Sim' : 'Não'}</span>}
                      {lead.preferences?.food && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded w-fit">Comida: {lead.preferences.food}</span>}
                      {lead.preferences?.must_have && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded w-fit">Exigência: {lead.preferences.must_have}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && <p className="text-center py-8 text-slate-400">Nenhum lead encontrado.</p>}
      </div>
    </div>
  );
};

export default LeadsTab;