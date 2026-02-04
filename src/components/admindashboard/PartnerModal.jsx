import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ModalOverlay from './../ModalOverlay'; // Ajuste o caminho conforme seu projeto

const PartnerModal = ({ data, onClose, onAction }) => {
  if (!data) return null;

  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div className="bg-white p-6 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X />
        </button>
        <h2 className="text-2xl font-bold mb-4">Análise</h2>
        <div className="bg-slate-100 h-[500px] flex items-center justify-center rounded-xl mb-4">
          {data.docFile ? (
            <iframe src={data.docFile} className="w-full h-full" title="Documento"></iframe>
          ) : (
            <p>Sem arquivo</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onAction(data.id, 'rejected')}
            className="bg-red-50 text-red-600 py-3 rounded-xl font-bold"
          >
            Rejeitar
          </button>
          <button
            onClick={() => onAction(data.id, 'verified')}
            className="bg-green-600 text-white py-3 rounded-xl font-bold"
          >
            Aprovar Parceiro
          </button>
        </div>
      </div>
    </ModalOverlay>,
    document.body
  );
};

export default PartnerModal;