import React, { useEffect } from 'react';

const ModalOverlay = ({ onClose, children }) => {
  
  // Fecha ao apertar ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 animate-fade-in"
      onClick={onClose}
    >
      {/* WRAPPER INTERNO:
         - w-full: Permite que o modal cresça até o limite da tela (respeitando o padding do pai)
         - flex justify-center: Mantém o modal centralizado
         - e.stopPropagation: Garante que clicar no modal não feche ele
      */}
      <div 
        className="w-full h-full flex items-center justify-center pointer-events-none"
        // pointer-events-none permite cliques vazados nas bordas, mas o filho reativa
      >
        <div 
          className="pointer-events-auto flex justify-center w-full max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModalOverlay;