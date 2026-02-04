import React, { useState } from 'react';
import { Search, ExternalLink, Archive, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CmsTab = ({ items, onToggleStatus, onDelete }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredItems = items.filter(i => 
    (i.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (i.city || "").toLowerCase().includes(search.toLowerCase())
  );

  // Helper simples para slug de estado (pode ser movido para utils se usado em outro lugar)
  const getStateSlug = (uf) => uf ? uf.toLowerCase() : 'br';

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
        <input
          className="w-full border p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-[#0097A8]"
          placeholder="Buscar página..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
              <tr>
                <th className="p-4">Capa</th>
                <th className="p-4">Nome</th>
                <th className="p-4">Local</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <img src={item.image} className="w-12 h-12 rounded-lg object-cover bg-slate-200" alt="Capa" />
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <a
                      href={`/${getStateSlug(item.state)}/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#0097A8] hover:underline flex items-center gap-1"
                    >
                      Ver online <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="p-4 text-slate-600">
                    {item.city}, {item.state}
                  </td>
                  <td className="p-4">
                    {item.paused ? (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                        <Archive size={12} /> Arquivado
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                        <CheckCircle size={12} /> Ativo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => navigate(`/partner/edit/${item.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => onToggleStatus(item)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title={item.paused ? "Publicar" : "Arquivar"}>
                        <Archive size={16} />
                      </button>
                      <button onClick={() => onDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CmsTab;