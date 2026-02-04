import React, { useState, useMemo } from 'react';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase'; // Ajuste o import
import { Plus, Tag, Trash2, Search, Info, X } from 'lucide-react';
import { formatBRL } from '../../../utils/format';

const CouponManager = ({ dayUses, reservations = [] }) => {
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null); // Para ver detalhes
  
  const [form, setForm] = useState({
    code: '', percentage: 10, dayUseId: '', limit: 100, validUntil: ''
  });

  // --- Processamento de Dados ---
  const allCoupons = useMemo(() => {
    let list = [];
    dayUses.forEach(dayUse => {
      if (dayUse.coupons && Array.isArray(dayUse.coupons)) {
        dayUse.coupons.forEach((coupon, index) => {
          // Uso e Receita Gerada
          const relatedReservations = reservations.filter(r => 
            r.status === 'approved' && 
            r.bookingDetails?.couponCode === coupon.code
          );
          
          const revenueGenerated = relatedReservations.reduce((acc, r) => acc + (r.total || 0), 0);

          list.push({
            ...coupon,
            dayUseName: dayUse.name,
            dayUseId: dayUse.id,
            originalIndex: index,
            usageCount: relatedReservations.length,
            revenueGenerated
          });
        });
      }
    });
    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [dayUses, reservations]);

  const filteredCoupons = allCoupons.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase()) || 
    c.dayUseName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!form.code || !form.dayUseId) return alert("Preencha campos obrigatórios");

    try {
      const dayUseRef = doc(db, "dayuses", form.dayUseId);
      const newCoupon = {
        code: form.code.toUpperCase().trim(),
        percentage: Number(form.percentage),
        limit: Number(form.limit),
        validUntil: form.validUntil,
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        active: true
      };

      await updateDoc(dayUseRef, { coupons: arrayUnion(newCoupon) });
      alert("Cupom criado!");
      setForm({ ...form, code: '' });
      setShowCreateModal(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao criar.");
    }
  };

  const handleDelete = async (e, coupon) => {
    e.stopPropagation(); // Evita abrir detalhes ao clicar no lixo
    if (coupon.createdBy !== 'admin') return alert("Você só pode excluir cupons criados pela plataforma.");
    
    if (!confirm(`Excluir cupom ${coupon.code}?`)) return;
    
    // Lógica de exclusão (Filtro array)
    try {
        const dayUse = dayUses.find(d => d.id === coupon.dayUseId);
        const newCoupons = dayUse.coupons.filter((_, idx) => idx !== coupon.originalIndex);
        await updateDoc(doc(db, "dayuses", coupon.dayUseId), { coupons: newCoupons });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER E BUSCA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="pl-10 pr-4 py-2 border rounded-xl w-full outline-none focus:ring-2 focus:ring-[#0097A8]" placeholder="Buscar cupom..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowCreateModal(true)} className="bg-[#0097A8] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#007f8f] transition-colors">
          <Plus size={18} /> Novo Cupom Admin
        </button>
      </div>

      {/* LISTAGEM */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Código</th>
              <th className="p-4">Parceiro</th>
              <th className="p-4">Desc.</th>
              <th className="p-4">Origem</th>
              <th className="p-4 text-center">Uso</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCoupons.map((c, idx) => (
              <tr 
                key={`${c.dayUseId}-${idx}`} 
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setSelectedCoupon(c)} // Abre detalhes
              >
                <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                  <Tag size={14} className="text-[#0097A8]" /> {c.code}
                </td>
                <td className="p-4 text-slate-600">{c.dayUseName}</td>
                <td className="p-4 font-bold text-green-600">{c.percentage}%</td>
                <td className="p-4">
                  {c.createdBy === 'admin' 
                    ? <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">Admin</span> 
                    : <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs font-bold">Parceiro</span>}
                </td>
                <td className="p-4 text-center">
                  <span className="font-bold">{c.usageCount}</span> <span className="text-slate-400">/ {c.limit}</span>
                </td>
                <td className="p-4 text-right">
                  {c.createdBy === 'admin' && (
                    <button onClick={(e) => handleDelete(e, c)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-lg shadow-2xl relative animate-fade-in">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4"><X/></button>
            <h2 className="text-xl font-bold mb-6">Criar Cupom Subsidiado</h2>
            <p className="text-sm bg-blue-50 text-blue-800 p-3 rounded-xl mb-6">O desconto deste cupom será abatido da comissão da plataforma.</p>
            
            <form onSubmit={handleCreateCoupon} className="space-y-4">
                {/* Campos do formulário igual ao anterior ... */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Código</label>
                        <input className="w-full border p-2 rounded-lg" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} placeholder="EX: VERAO10" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Desconto %</label>
                        <input type="number" className="w-full border p-2 rounded-lg" value={form.percentage} onChange={e=>setForm({...form, percentage:e.target.value})} />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Parceiro</label>
                    <select className="w-full border p-2 rounded-lg bg-white" value={form.dayUseId} onChange={e=>setForm({...form, dayUseId:e.target.value})}>
                        <option value="">Selecione...</option>
                        {dayUses.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold uppercase text-slate-500">Limite</label><input type="number" className="w-full border p-2 rounded-lg" value={form.limit} onChange={e=>setForm({...form, limit:e.target.value})} /></div>
                    <div><label className="text-xs font-bold uppercase text-slate-500">Validade</label><input type="date" className="w-full border p-2 rounded-lg" value={form.validUntil} onChange={e=>setForm({...form, validUntil:e.target.value})} /></div>
                </div>
                <button type="submit" className="w-full bg-[#0097A8] text-white font-bold py-3 rounded-xl">Confirmar Criação</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {selectedCoupon && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setSelectedCoupon(null)} className="absolute top-4 right-4"><X/></button>
            
            <div className="text-center mb-6">
                <div className="inline-block bg-slate-100 p-4 rounded-full mb-3"><Tag size={32} className="text-[#0097A8]"/></div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedCoupon.code}</h2>
                <p className="text-slate-500">{selectedCoupon.dayUseName}</p>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Desconto</span>
                    <span className="font-bold text-green-600">{selectedCoupon.percentage}%</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Origem</span>
                    <span className="font-bold">{selectedCoupon.createdBy === 'admin' ? 'Plataforma' : 'Parceiro'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Utilizações</span>
                    <span className="font-bold">{selectedCoupon.usageCount} / {selectedCoupon.limit}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Receita Gerada</span>
                    <span className="font-bold text-[#0097A8]">{formatBRL(selectedCoupon.revenueGenerated)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Criado em</span>
                    <span className="font-bold text-xs">{new Date(selectedCoupon.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Válido até</span>
                    <span className="font-bold text-xs">{selectedCoupon.validUntil ? new Date(selectedCoupon.validUntil).toLocaleDateString() : 'Indeterminado'}</span>
                </div>
            </div>

            {selectedCoupon.createdBy !== 'admin' && (
                <div className="mt-6 bg-slate-50 p-3 rounded-lg text-center text-xs text-slate-400">
                    Este cupom pertence ao parceiro e não pode ser editado pelo admin.
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManager;