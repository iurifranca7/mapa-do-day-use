import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Plus, Edit, Trash2, Ticket, Calendar, Hash, 
  Check, X, Power, ShoppingBag, AlertCircle,
  MoreHorizontal, PlayCircle, PauseCircle
} from 'lucide-react';
import Button from './Button';
import ModalOverlay from './ModalOverlay';
import FeedbackModal from './FeedbackModal';

const PartnerCoupons = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]); // Para seleção
  const [feedback, setFeedback] = useState(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});

  // 1. CARREGAR DADOS (Cupons e Produtos)
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Carregar Produtos (para o seletor)
      const qProd = query(collection(db, "products"), where("ownerId", "==", user.uid));
      const snapProd = await getDocs(qProd);
      const prodList = snapProd.docs.map(d => ({ id: d.id, title: d.data().title }));
      setProducts(prodList);

      // Carregar Cupons
      const qCoupons = query(collection(db, "coupons"), where("ownerId", "==", user.uid));
      const snapCoupons = await getDocs(qCoupons);
      setCoupons(snapCoupons.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao carregar dados.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // --- HANDLERS ---

  // --- AÇÃO EM MASSA (ATIVAR/PAUSAR TUDO) ---
  const handleBulkUpdate = async (targetStatus) => {
    const actionName = targetStatus === 'active' ? 'ATIVAR' : 'PAUSAR';
    
    if (!window.confirm(`Tem certeza que deseja ${actionName} todos os cupons listados?`)) {
        return;
    }

    setLoading(true);
    setShowBulkMenu(false); // Fecha o menu

    try {
        const batch = writeBatch(db);
        
        // Prepara a atualização para cada cupom
        coupons.forEach(coupon => {
            const docRef = doc(db, "coupons", coupon.id);
            batch.update(docRef, { 
                status: targetStatus,
                updatedAt: new Date()
            });
        });

        // Executa tudo de uma vez
        await batch.commit();

        // Atualiza estado local
        setCoupons(prev => prev.map(c => ({ ...c, status: targetStatus })));
        
        setFeedback({ 
            type: 'success', 
            title: 'Sucesso', 
            msg: `Todos os cupons foram ${targetStatus === 'active' ? 'ativados' : 'pausados'}.` 
        });

    } catch (err) {
        console.error(err);
        setFeedback({ type: 'error', title: 'Erro', msg: 'Falha na atualização em massa.' });
    } finally {
        setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setFormData({
      code: '',
      discountType: 'percentage', // percentage | fixed
      discountValue: '',
      limitType: 'none', // none | quantity | date | both
      maxUsage: '',
      expiryDate: '',
      applyToAllProducts: true,
      selectedProductIds: [],
      status: 'active',
      currentUsage: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (coupon) => {
    setFormData({ ...coupon });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (coupon) => {
    const newStatus = coupon.status === 'paused' ? 'active' : 'paused';
    setLoading(true);
    try {
        await updateDoc(doc(db, "coupons", coupon.id), { 
            status: newStatus,
            updatedAt: new Date()
        });
        setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, status: newStatus } : c));
        setFeedback({ type: 'success', title: 'Sucesso', msg: `Cupom ${newStatus === 'active' ? 'ativado' : 'pausado'}.` });
    } catch (err) {
        setFeedback({ type: 'error', title: 'Erro', msg: 'Erro ao alterar status.' });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Tem certeza que deseja excluir este cupom?")) return;
    try {
      await deleteDoc(doc(db, "coupons", id));
      setCoupons(prev => prev.filter(c => c.id !== id));
      setFeedback({ type: 'success', title: 'Excluído', msg: 'Cupom removido.' });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro', msg: 'Erro ao excluir.' });
    }
  };

  const handleSave = async () => {
    if (!formData.code || !formData.discountValue) {
      alert("Preencha o código e o valor do desconto.");
      return;
    }

    // Validação de Produtos
    if (!formData.applyToAllProducts && formData.selectedProductIds.length === 0) {
        alert("Selecione pelo menos um produto ou marque 'Aplicar em todos'.");
        return;
    }

    setLoading(true);
    try {
      const payload = {
        ownerId: user.uid,
        updatedAt: new Date(),
        code: formData.code.toUpperCase().trim(), // Sempre maiúsculo
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        
        // Limites
        maxUsage: formData.maxUsage ? Number(formData.maxUsage) : null,
        expiryDate: formData.expiryDate || null,
        
        // Vínculo Produtos
        applyToAllProducts: formData.applyToAllProducts,
        selectedProductIds: formData.applyToAllProducts ? [] : formData.selectedProductIds,
        
        status: formData.status || 'active',
        currentUsage: formData.currentUsage || 0
      };

      if (formData.id) {
        await updateDoc(doc(db, "coupons", formData.id), payload);
      } else {
        await addDoc(collection(db, "coupons"), { ...payload, createdAt: new Date() });
      }

      setIsModalOpen(false);
      loadData();
      setFeedback({ type: 'success', title: 'Salvo', msg: 'Cupom salvo com sucesso.' });

    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao salvar.' });
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER: CALCULAR STATUS VISUAL ---
  const getCouponStatus = (coupon) => {
    if (coupon.status === 'paused') return { label: 'Pausado', color: 'bg-amber-100 text-amber-700', active: false };
    
    // Verifica validade
    if (coupon.expiryDate) {
        const today = new Date().toISOString().split('T')[0];
        if (today > coupon.expiryDate) return { label: 'Expirado', color: 'bg-red-100 text-red-700', active: false };
    }

    // Verifica Quantidade
    if (coupon.maxUsage && coupon.currentUsage >= coupon.maxUsage) {
        return { label: 'Esgotado', color: 'bg-slate-200 text-slate-600', active: false };
    }

    return { label: 'Ativo', color: 'bg-green-100 text-green-700', active: true };
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cupons de Desconto</h1>
          <p className="text-slate-500">Crie códigos promocionais para impulsionar suas vendas.</p>
        </div>
        
        <div className="flex items-center gap-2 relative">
            {/* Botão de Opções em Massa */}
            <div className="relative">
                <button 
                    onClick={() => setShowBulkMenu(!showBulkMenu)} 
                    className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0097A8] transition-colors bg-white shadow-sm"
                    title="Gerenciar Cupons em Massa"
                >
                    <MoreHorizontal size={20}/>
                </button>

                {/* Dropdown Menu */}
                {showBulkMenu && (
                    <>
                        {/* Overlay invisível para fechar ao clicar fora */}
                        <div className="fixed inset-0 z-10" onClick={() => setShowBulkMenu(false)}></div>
                        
                        <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-fade-in">
                            <button 
                                onClick={() => handleBulkUpdate('active')}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-green-700 hover:bg-green-50 flex items-center gap-2 transition-colors border-b border-slate-50"
                            >
                                <PlayCircle size={16}/> Ativar Todos
                            </button>
                            <button 
                                onClick={() => handleBulkUpdate('paused')}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors"
                            >
                                <PauseCircle size={16}/> Pausar Todos
                            </button>
                        </div>
                    </>
                )}
            </div>

            <Button onClick={handleOpenNew} className="flex items-center gap-2 px-6">
                <Plus size={20}/> Criar Cupom
            </Button>
        </div>
      </div>

      {/* LISTA DE CUPONS */}
      {coupons.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Ticket size={32}/>
              </div>
              <p className="text-slate-500">Nenhum cupom ativo.</p>
          </div>
      ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coupons.map(item => {
                  const status = getCouponStatus(item);
                  return (
                    <div key={item.id} className={`bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all flex flex-col ${!status.active ? 'border-slate-100 opacity-80' : 'border-[#0097A8]/20'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-2">
                                <div className="bg-slate-50 p-2 rounded-xl text-slate-500">
                                    <Ticket size={20}/>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg flex items-center h-fit mt-1 ${status.color}`}>
                                    {status.label}
                                </span>
                            </div>
                            <span className="text-xl font-mono font-bold text-slate-800 tracking-wider">
                                {item.code}
                            </span>
                        </div>
                        
                        <div className="mb-4">
                             <p className="text-3xl font-bold text-[#0097A8]">
                                {item.discountType === 'percentage' ? `${item.discountValue}%` : `R$ ${item.discountValue}`}
                                <span className="text-xs font-normal text-slate-400 ml-1">OFF</span>
                             </p>
                        </div>

                        {/* Estatísticas e Limites */}
                        <div className="space-y-2 text-xs text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl">
                            <div className="flex justify-between">
                                <span>Usos:</span>
                                <span className="font-bold text-slate-700">
                                    {item.currentUsage} {item.maxUsage ? `/ ${item.maxUsage}` : '(Ilimitado)'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Validade:</span>
                                <span className="font-bold text-slate-700">
                                    {item.expiryDate ? item.expiryDate.split('-').reverse().join('/') : 'Indeterminado'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Produtos:</span>
                                <span className="font-bold text-slate-700">
                                    {item.applyToAllProducts ? 'Todos' : `${item.selectedProductIds?.length || 0} selecionados`}
                                </span>
                            </div>
                        </div>
                        
                        <div className="mt-auto flex gap-2 border-t pt-4 border-slate-50">
                            <button 
                                onClick={() => handleToggleStatus(item)} 
                                className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors ${item.status === 'paused' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                            >
                                <Power size={14}/> {item.status === 'paused' ? 'Ativar' : 'Pausar'}
                            </button>
                            <button onClick={() => handleEdit(item)} className="p-2 hover:bg-slate-100 rounded-lg text-blue-600"><Edit size={18}/></button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 rounded-lg text-red-500"><Trash2 size={18}/></button>
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      {isModalOpen && createPortal(
        <ModalOverlay onClose={() => setIsModalOpen(false)}>
            <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-2xl text-slate-900">{formData.id ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                    <button onClick={() => setIsModalOpen(false)}><X size={24}/></button>
                </div>

                <div className="space-y-6">
                    
                    {/* 1. DADOS PRINCIPAIS */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">Código do Cupom</label>
                            <input 
                                className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8] uppercase font-mono tracking-wider placeholder-slate-300" 
                                placeholder="EX: VERAO10"
                                maxLength={20}
                                value={formData.code} 
                                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-sm font-bold text-slate-700 block mb-1">Desconto</label>
                                <input 
                                    type="number"
                                    className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" 
                                    placeholder="0"
                                    value={formData.discountValue} 
                                    onChange={e => setFormData({...formData, discountValue: e.target.value})}
                                />
                            </div>
                            <div className="w-24">
                                <label className="text-sm font-bold text-slate-700 block mb-1">Tipo</label>
                                <select 
                                    className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]"
                                    value={formData.discountType}
                                    onChange={e => setFormData({...formData, discountType: e.target.value})}
                                >
                                    <option value="percentage">%</option>
                                    <option value="fixed">R$</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. LIMITES */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="text-sm font-bold text-slate-700 block mb-3 flex items-center gap-2">
                             <AlertCircle size={16}/> Limitações (Opcional)
                        </label>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1 flex items-center gap-1">
                                    <Hash size={12}/> Quantidade Máxima de Usos
                                </label>
                                <input 
                                    type="number"
                                    className="w-full border p-2 rounded-lg bg-white placeholder-slate-300" 
                                    placeholder="Ex: 50 (Vazio = Ilimitado)"
                                    value={formData.maxUsage || ''} 
                                    onChange={e => setFormData({...formData, maxUsage: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1 flex items-center gap-1">
                                    <Calendar size={12}/> Validade Até
                                </label>
                                <input 
                                    type="date"
                                    className="w-full border p-2 rounded-lg bg-white" 
                                    value={formData.expiryDate || ''} 
                                    onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. PRODUTOS VÁLIDOS */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 block mb-3 flex items-center gap-2">
                             <ShoppingBag size={16}/> Válido para quais produtos?
                        </label>
                        
                        <label className="flex items-center gap-2 mb-4 cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="accent-[#0097A8] w-5 h-5"
                                checked={formData.applyToAllProducts}
                                onChange={e => setFormData({...formData, applyToAllProducts: e.target.checked})}
                            />
                            <span className="text-sm font-bold text-slate-700">Aplicar em todos os produtos</span>
                        </label>

                        {!formData.applyToAllProducts && (
                            <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto p-2 bg-slate-50 custom-scrollbar animate-fade-in">
                                {products.length === 0 ? (
                                    <p className="text-xs text-center p-4 text-slate-400">Nenhum produto encontrado.</p>
                                ) : (
                                    products.map(prod => (
                                        <label key={prod.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                            <input 
                                                type="checkbox" 
                                                className="accent-[#0097A8] w-4 h-4"
                                                checked={formData.selectedProductIds?.includes(prod.id)}
                                                onChange={() => {
                                                    const current = formData.selectedProductIds || [];
                                                    const newIds = current.includes(prod.id)
                                                        ? current.filter(id => id !== prod.id)
                                                        : [...current, prod.id];
                                                    setFormData({...formData, selectedProductIds: newIds});
                                                }}
                                            />
                                            <span className="text-sm text-slate-600">{prod.title}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <Button onClick={handleSave} disabled={loading} className="w-full py-4 text-lg mt-4">
                        {loading ? 'Salvando...' : 'Salvar Cupom'}
                    </Button>
                </div>
            </div>
        </ModalOverlay>, document.body
      )}

      {feedback && createPortal(
        <FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback?.type} title={feedback?.title} msg={feedback?.msg} />,
        document.body
      )}
    </div>
  );
};

export default PartnerCoupons;