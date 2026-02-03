import React from 'react';
import { User } from 'lucide-react';
import Button from '../Button';

const ProfileCompletionModal = ({ 
  isOpen,
  onClose,
  tempName, setTempName,
  tempSurname, setTempSurname,
  tempPhone, setTempPhone,
  handleSaveProfile,
  savingProfile
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
                onClick={onClose}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 font-bold"
            >
                ✕
            </button>

            <div className="text-center mb-5">
                <div className="w-12 h-12 bg-[#e0f7fa] text-[#0097A8] rounded-full flex items-center justify-center mx-auto mb-3">
                    <User size={24}/>
                </div>
                <h4 className="font-bold text-slate-800 text-lg">Dados do Titular</h4>
                <p className="text-xs text-slate-500 mt-1">
                    Mantenha seus dados atualizados para receber o voucher.
                </p>
            </div>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</label>
                        <input className="w-full border border-slate-300 p-2.5 rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-[#0097A8]" value={tempName} onChange={e=>setTempName(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sobrenome</label>
                        <input className="w-full border border-slate-300 p-2.5 rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-[#0097A8]" value={tempSurname} onChange={e=>setTempSurname(e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp / Celular</label>
                    <input className="w-full border border-slate-300 p-2.5 rounded-lg bg-slate-50 focus:bg-white outline-none focus:border-[#0097A8]" value={tempPhone} onChange={e=>setTempPhone(e.target.value)} />
                </div>

                <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full py-3 mt-2">
                    {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>
        </div>
    </div>
  );
};

export default ProfileCompletionModal;