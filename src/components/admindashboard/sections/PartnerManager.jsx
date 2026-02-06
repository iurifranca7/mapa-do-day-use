import React, { useState } from 'react';
import { Search, Star, Percent, ExternalLink, Info, CheckCircle, XCircle, CheckSquare } from 'lucide-react';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase'; // Ajuste o import

const PartnerManager = ({ dayUses, pendingUsers, claims, onOpenDocModal, onOpenClaimModal }) => {
  const [search, setSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Logs e Ações com Confirmação Melhorada
  const handleTogglePromo = async (dayUse) => {
    const isActivating = !dayUse.promoRate;
    const msg = isActivating 
      ? `CONFIRMAÇÃO:\n\nVocê vai ATIVAR a Taxa Promocional de 10% para ${dayUse.name}.\nIsso deve durar 30 dias.\n\nDeseja continuar?`
      : `CONFIRMAÇÃO:\n\nVocê vai DESATIVAR a promoção e voltar para 12%.\n\nDeseja continuar?`;

    if (confirm(msg)) {
      await updateDoc(doc(db, "dayuses", dayUse.id), { 
        promoRate: isActivating,
        adminLogs: arrayUnion({
          action: isActivating ? 'PROMO_RATE_ON' : 'PROMO_RATE_OFF',
          date: new Date().toISOString(),
          details: isActivating ? 'Ativado por Admin - Taxa 10%' : 'Desativado por Admin - Taxa 12%'
        })
      });
    }
  };

  const handleToggleAds = async (dayUse) => {
    // Aqui poderíamos abrir um modal de data, mas para MVP vamos usar prompt ou direto
    const days = prompt("Quantos dias este destaque deve durar? (Deixe vazio para indeterminado)");
    if (days === null) return; // Cancelou

    const isActivating = !dayUse.isHighlighted;
    
    await updateDoc(doc(db, "dayuses", dayUse.id), { 
      isHighlighted: isActivating,
      adsExpiry: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null,
      adminLogs: arrayUnion({
        action: isActivating ? 'ADS_ON' : 'ADS_OFF',
        date: new Date().toISOString(),
        duration: days ? `${days} dias` : 'Indeterminado'
      })
    });
  };

  const filtered = dayUses.filter(d => d.name?.toLowerCase().includes(search.toLowerCase()));

  const pendingClaims = claims.filter(c => c.status === 'pending');
  const doneClaims = claims.filter(c => c.status === 'done');

  return (
    <div className="space-y-8">
      
      {/* SEÇÃO DE MODERAÇÃO E CLAIMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Pendências de Documento */}
          <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl h-fit">
            <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">⚠️ Validação de Documentos ({pendingUsers.length})</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {pendingUsers.map(u => (
                <div key={u.id} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-sm font-bold">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <button onClick={() => onOpenDocModal(u)} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-bold hover:bg-orange-200">
                    Analisar Doc
                  </button>
                </div>
              ))}
              {pendingUsers.length === 0 && <p className="text-sm text-orange-400">Nenhuma pendência.</p>}
            </div>
          </div>

          {/* Área de Transferências (Pendentes + Histórico) */}
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">🔄 Transferências ({pendingClaims.length})</h3>
                <button 
                    onClick={() => setShowHistory(!showHistory)} 
                    className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                >
                    {showHistory ? 'Ocultar Histórico' : 'Ver Concluídas'}
                </button>
            </div>

            {/* Lista Pendente */}
            <div className="space-y-3 mb-4">
              {pendingClaims.map(c => (
                <div key={c.id} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm border-l-4 border-orange-400">
                  <div className="overflow-hidden pr-2">
                    <p className="text-sm font-bold truncate">{c.dayUseName || c.propertyName || 'Local Desconhecido'}</p>
                    <p className="text-xs text-slate-500 truncate">Novo Dono: {c.claimantName || c.userName}</p>
                  </div>
                  <button onClick={() => onOpenClaimModal(c)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-bold hover:bg-blue-200 whitespace-nowrap">
                    Avaliar
                  </button>
                </div>
              ))}
              {pendingClaims.length === 0 && <p className="text-sm text-blue-400 italic">Nenhuma solicitação pendente.</p>}
            </div>

            {/* Lista Concluída (Histórico) */}
            {showHistory && (
                <div className="border-t border-blue-200 pt-4 mt-4 animate-fade-in">
                    <h4 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-1"><CheckSquare size={12}/> Histórico de Aprovações</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {doneClaims.map(c => (
                            <div key={c.id} className="flex justify-between items-center text-sm bg-blue-100/50 p-2 rounded-lg">
                                <div>
                                    <span className="font-bold text-slate-700">{c.dayUseName || c.propertyName}</span>
                                    <span className="text-slate-500 text-xs block"> Transf. para: {c.claimantEmail || c.userEmail}</span>
                                </div>
                                <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full">Feito</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
      </div>

      {/* Tabela de Parceiros */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg">Gerenciar Parceiros</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              className="pl-10 pr-4 py-2 border rounded-xl text-sm w-64 focus:ring-2 focus:ring-[#0097A8] outline-none"
              placeholder="Buscar parceiro..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="p-4">Parceiro</th>
                <th className="p-4 text-center">Taxa</th>
                <th className="p-4 text-center">Ads / Destaque</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Painel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{d.name}</p>
                    <p className="text-xs text-slate-500">{d.city}</p>
                  </td>
                  
                  {/* Taxa com Tooltip Simples */}
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleTogglePromo(d)}
                      title={d.promoRate ? "Clique para voltar a 12%" : "Clique para ativar Promo 10%"}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 mx-auto ${d.promoRate ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200' : 'bg-slate-100 text-slate-500'}`}
                    >
                      <Percent size={12} /> {d.promoRate ? '10% (Promo)' : '12%'}
                    </button>
                  </td>

                  {/* Ads com Lógica de Data */}
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleToggleAds(d)}
                      title={d.isHighlighted ? `Ativo até: ${d.adsExpiry ? new Date(d.adsExpiry).toLocaleDateString() : 'Indeterminado'}` : "Ativar Destaque"}
                      className={`p-2 rounded-lg transition-colors mx-auto ${d.isHighlighted ? 'text-yellow-500 bg-yellow-50 ring-1 ring-yellow-200' : 'text-slate-300 hover:bg-slate-100'}`}
                    >
                      <Star size={18} fill={d.isHighlighted ? "currentColor" : "none"} />
                    </button>
                  </td>

                  <td className="p-4 text-center">
                    {d.paused 
                      ? <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1"><XCircle size={12}/> Pausado</span> 
                      : <span className="text-green-500 bg-green-50 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1"><CheckCircle size={12}/> Ativo</span>
                    }
                  </td>

                  <td className="p-4 text-right">
                    {/* LINK CORRIGIDO: Passa o ID do Dono (User), não do Passeio */}
                      <a 
                        href={`/partner-panel/${d.ownerId}`}  // <--- MUDANÇA AQUI: de d.id para d.ownerId
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#0097A8] hover:text-[#007f8f] font-bold text-xs flex items-center justify-end gap-1"
                      >
                        Acessar <ExternalLink size={12}/>
                      </a>
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

export default PartnerManager;