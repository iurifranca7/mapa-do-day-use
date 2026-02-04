import React from 'react';
import Button from '../Button';

const PartnersTab = ({ users, onViewDoc }) => {
  if (users.length === 0) {
    return <p className="text-slate-400 text-center py-8">Tudo limpo!</p>;
  }

  return (
    <div className="grid gap-4">
      {users.map((p) => (
        <div key={p.id} className="bg-white p-6 rounded-2xl border flex justify-between items-center">
          <div>
            <p className="font-bold">{p.name}</p>
            <p className="text-sm text-slate-500">{p.email}</p>
            <p className="text-xs text-slate-400">
              Enviado: {p.submittedAt?.toDate().toLocaleString()}
            </p>
          </div>
          <Button onClick={() => onViewDoc(p)}>Analisar</Button>
        </div>
      ))}
    </div>
  );
};

export default PartnersTab;