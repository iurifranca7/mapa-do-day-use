import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button'; 

const RefundModal = ({ isOpen, onClose, onConfirm, reservation, loading }) => {
  if (!isOpen || !reservation) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-md w-full border-b-4 border-red-500">
        <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={24}/>
            </div>
            <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Estorno?</h3>
        
        <div className="text-sm text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="mb-2"><strong>Cliente:</strong> {reservation.guestName}</p>
            <p className="mb-2"><strong>Data:</strong> {reservation.date.split('-').reverse().join('/')}</p>
            <p className="mb-0"><strong>Valor a devolver:</strong> R$ {reservation.total}</p>
        </div>

        <p className="text-xs text-red-500 mb-6 text-center font-bold">
            ⚠️ O dinheiro sairá da sua conta Mercado Pago e voltará para o cliente imediatamente.
        </p>

        <div className="flex gap-3">
            <button 
                onClick={onClose} 
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                disabled={loading}
            >
                Cancelar
            </button>
            <Button 
                onClick={() => onConfirm(reservation)} 
                className="flex-1 bg-red-600 hover:bg-red-700 shadow-red-200 justify-center"
                disabled={loading}
            >
                {loading ? 'Processando...' : 'Confirmar Estorno'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default RefundModal;