import React, { useState } from 'react';
import Button from '../Button';

const ClaimsTab = ({ claims, onViewClaim }) => {
  const [filter, setFilter] = useState('pending');

  const filteredClaims = claims.filter(c => filter === 'all' || c.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>Pendentes</button>
        <button onClick={() => setFilter('done')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>Concluídas</button>
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>Todas</button>
      </div>

      <div className="grid gap-4">
        {filteredClaims.map((claim) => (
          <div key={claim.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-lg text-slate-800">{claim.propertyName}</h3>
                {claim.status === 'done'
                  ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-green-200">Transferido</span>
                  : <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-orange-200">Pendente</span>
                }
              </div>
              <p className="text-sm text-slate-500 mb-1"><strong>Solicitante:</strong> {claim.userName} ({claim.userEmail})</p>
              <p className="text-xs text-slate-400">Solicitado em: {claim.createdAt?.toDate ? claim.createdAt.toDate().toLocaleString() : 'Data inválida'}</p>
            </div>

            {claim.status !== 'done' && (
              <Button onClick={() => onViewClaim(claim)} className="px-6 shadow-sm bg-slate-800 hover:bg-slate-900">
                Analisar Pedido
              </Button>
            )}
          </div>
        ))}
        {filteredClaims.length === 0 && <p className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Nenhuma solicitação encontrada.</p>}
      </div>
    </div>
  );
};

export default ClaimsTab;