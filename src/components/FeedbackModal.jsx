import React from 'react';
import ModalOverlay from './ModalOverlay';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

const FeedbackModal = ({ isOpen, onClose, type = 'success', title, msg }) => {
  if (!isOpen) return null;

  const config = {
    success: { icon: <CheckCircle size={32}/>, color: 'text-green-600', bg: 'bg-green-100' },
    error: { icon: <AlertCircle size={32}/>, color: 'text-red-600', bg: 'bg-red-100' },
    warning: { icon: <AlertTriangle size={32}/>, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  };

  const style = config[type] || config.success;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white p-6 rounded-3xl shadow-2xl text-center animate-fade-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${style.bg} ${style.color}`}>
          {style.icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">{msg}</p>
        <button onClick={onClose} className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">
          OK
        </button>
      </div>
    </ModalOverlay>
  );
};

export default FeedbackModal;