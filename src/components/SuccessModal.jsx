import React from 'react';
import ModalOverlay from './ModalOverlay'; // Ajuste o caminho se necessário

const SuccessModal = ({ isOpen, onClose, title, message, actionLabel, onAction }) => {
  if (!isOpen) return null;
  
  return (
    <ModalOverlay onClose={onClose}>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
        {/* Decoração de fundo */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#0097A8]"></div>
        
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">{title || "Sucesso!"}</h2>
        <p className="text-slate-500 mb-8">{message || "Operação realizada com sucesso."}</p>

        {actionLabel && onAction && (
            <button 
                onClick={onAction} 
                className="w-full bg-[#0097A8] hover:bg-[#007f8c] text-white font-bold py-4 rounded-xl text-lg transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-cyan-500/20"
            >
                {actionLabel}
            </button>
        )}
        
        
        <button onClick={onClose} className="mt-4 text-slate-400 text-sm hover:text-slate-600 font-medium">
            Fechar
        </button>
      </div>
    </div>
    </ModalOverlay>
  );
};

export default SuccessModal;