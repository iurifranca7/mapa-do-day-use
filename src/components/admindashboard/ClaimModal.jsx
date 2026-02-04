import React from 'react';
import { createPortal } from 'react-dom';
import { X, Briefcase, User, Mail, Phone } from 'lucide-react';
import  Button from '../Button'; // Ajuste o caminho
import ModalOverlay from '../ModalOverlay'; // Ajuste o caminho

const ClaimModal = ({ data, onClose, onTransfer, onArchive }) => {
  if (!data) return null;

  // --- 🧠 NORMALIZAÇÃO DE DADOS (NOVO || ANTIGO) ---
  const display = {
      propertyName: data.dayUseName || data.propertyName || 'Nome não disponível',
      propertyId:   data.dayUseId   || data.propertyId   || 'ID desconhecido',
      city:         data.dayUseCity || '', 
      
      userName:     data.claimantName  || data.userName  || 'Desconhecido',
      userEmail:    data.claimantEmail || data.userEmail || 'Sem e-mail',
      userPhone:    data.claimantPhone || data.userPhone || 'Não informado',
      userRole:     data.claimantRole  || data.userJob   || 'Não informado'
  };

  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div className="bg-white p-8 rounded-3xl w-full max-w-md animate-fade-in relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100">
          <X />
        </button>
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Briefcase className="text-[#0097A8]" /> Transferência
        </h2>
        
        <div className="space-y-4 mb-8">
          {/* DADOS DA PROPRIEDADE */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Propriedade Alvo</p>
            <p className="font-bold text-slate-800 text-lg">{display.propertyName}</p>
            <p className="text-xs text-slate-400 font-mono select-all">ID: {display.propertyId}</p>
            {display.city && <p className="text-xs text-slate-500 mt-1">{display.city}</p>}
          </div>

          {/* DADOS DO SOLICITANTE */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados do Solicitante</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <User size={16} className="text-slate-400 shrink-0" />
                <span className="font-bold text-slate-700">{display.userName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase size={16} className="text-slate-400 shrink-0" />
                <span className="text-slate-600">{display.userRole}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <span className="text-slate-600 break-all">{display.userEmail}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-slate-400 shrink-0" />
                <span className="text-slate-600">{display.userPhone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={() => onArchive(data.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full justify-center">
            Arquivar
          </Button>
          <Button onClick={() => onTransfer(data)} className="bg-[#0097A8] hover:bg-[#007F8F] w-full justify-center text-white">
            Aprovar
          </Button>
        </div>
      </div>
    </ModalOverlay>,
    document.body
  );
};

export default ClaimModal;