import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc , writeBatch, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Plus, Edit, Trash2, Package, Tag, Calendar, Clock, 
  ShoppingBag, Users, Car, PawPrint, X, Store, Power, 
  BedDouble, Info, MoreHorizontal, PlayCircle, PauseCircle,
  ArrowUp, ArrowDown, ListOrdered // Novos ícones
} from 'lucide-react';
import Button from './Button';
import ModalOverlay from './ModalOverlay';
import FeedbackModal from './FeedbackModal';
import { formatBRL } from '../utils/format';
import ReorderProductsModal from './ReorderProductsModal';

// --- CONFIGURAÇÃO DOS TIPOS DE OFERTA ---
const ALL_OFFER_TYPES = [
  { id: 'adult', label: '[UNITÁRIO] Adulto', icon: <Users size={16}/>, consume: { adults: 1 } },
  { id: 'child', label: '[UNITÁRIO] Criança', icon: <Users size={16} className="text-sm"/>, consume: { children: 1 } },
  { id: 'pet', label: '[UNITÁRIO] Pet', icon: <PawPrint size={16}/>, consume: { pets: 1 }, requires: 'pets' },
  { id: 'combo_adult', label: '[COMBO] Adultos', icon: <Users size={16}/>, customConsume: ['adults'] },
  { id: 'combo_child', label: '[COMBO] Crianças', icon: <Users size={16}/>, customConsume: ['children'] },
  { id: 'mix_ac', label: '[COMBO] Criança e Adulto', icon: <Users size={16}/>, customConsume: ['adults', 'children'] },
  { id: 'super_mix', label: '[COMBO] Super Mix (Todos)', icon: <Users size={16}/>, customConsume: ['adults', 'children', 'pets'], requires: 'pets' },
  { id: 'parking_moto', label: '[ESTACIONAMENTO] Moto', icon: <Car size={16}/>, consume: { motos: 1 }, requires: 'moto' },
  { id: 'parking_car', label: '[ESTACIONAMENTO] Carro', icon: <Car size={16}/>, consume: { cars: 1 }, requires: 'car' },
  { id: 'product', label: '[ECOMMERCE] Produto Físico', icon: <ShoppingBag size={16}/>, isPhysical: true }
];

const PartnerProducts = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [myDayUses, setMyDayUses] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isReorderOpen, setIsReorderOpen] = useState(false);

  // 1. CARREGAMENTO INICIAL
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const qDayUse = query(collection(db, "dayuses"), where("ownerId", "==", user.uid));
      const snapDayUse = await getDocs(qDayUse);
      const dayUsesData = snapDayUse.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyDayUses(dayUsesData);

      // Busca produtos ordenados por 'order'
      const qProd = query(collection(db, "products"), where("ownerId", "==", user.uid), orderBy("order", "asc"));
      // Fallback se não tiver índice composto ainda (ordenação no front)
      const snapProd = await getDocs(qProd).catch(async () => {
          const qProdSimple = query(collection(db, "products"), where("ownerId", "==", user.uid));
          return await getDocs(qProdSimple);
      });
      
      let loadedProducts = snapProd.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Garante ordenação numérica no front caso o backend falhe ou não tenha order
      loadedProducts.sort((a, b) => (a.order || 999) - (b.order || 999));

      setProducts(loadedProducts);

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

  // --- REORDENAÇÃO ---

  // Função que recebe a lista JÁ ordenada do modal e salva no banco
  const handleSaveReorder = async (orderedList) => {
      try {
          // Atualiza visualmente imediatamente
          setProducts(orderedList.map((item, index) => ({...item, order: index})));
          
          const batch = writeBatch(db);
          orderedList.forEach((prod, index) => {
              // Só atualiza se a ordem mudou para economizar escrita (opcional, mas boa prática)
              if (prod.order !== index) {
                  const ref = doc(db, "products", prod.id);
                  batch.update(ref, { order: index });
              }
          });
          await batch.commit();
          setFeedback({ type: 'success', title: 'Ordem Atualizada', msg: 'A sequência dos produtos foi salva.' });
      } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao salvar a ordem.' });
          loadData(); // Reverte
      }
  };

  // --- AÇÃO EM MASSA (ATIVAR/PAUSAR TUDO) ---
  const handleBulkUpdate = async (targetStatus) => {
    const actionName = targetStatus === 'active' ? 'ATIVAR' : 'PAUSAR';
    
    if (!window.confirm(`Tem certeza que deseja ${actionName} as vendas de TODOS os produtos listados?`)) {
        return;
    }

    setLoading(true);
    setShowBulkMenu(false); 

    try {
        const batch = writeBatch(db);
        
        products.forEach(prod => {
            const docRef = doc(db, "products", prod.id);
            batch.update(docRef, { 
                status: targetStatus,
                updatedAt: new Date()
            });
        });

        await batch.commit();

        setProducts(prev => prev.map(p => ({ ...p, status: targetStatus })));
        
        setFeedback({ 
            type: 'success', 
            title: 'Sucesso', 
            msg: `Todos os produtos foram ${targetStatus === 'active' ? 'ativados' : 'pausados'}.` 
        });

    } catch (err) {
        console.error(err);
        setFeedback({ type: 'error', title: 'Erro', msg: 'Falha na atualização em massa.' });
    } finally {
        setLoading(false);
    }
  };

  const handleOpenNew = () => {
    const defaultDayUseId = myDayUses.length > 0 ? myDayUses[0].id : '';
    const defaultDayUse = myDayUses.find(d => d.id === defaultDayUseId);
    
    // Define a ordem como última (tamanho da lista atual)
    const nextOrder = products.length;

    setFormData({
      dayUseId: defaultDayUseId,
      type: '',
      title: '',
      description: '',
      price: '',
      salesEndHour: '10:00', 
      noSalesLimit: false,
      ageType: 'paid', 
      ageMin: '',      
      ageMax: '',      
      petSize: '',
      availableDays: defaultDayUse?.availableDays || [0,6], 
      includedSpecialDates: defaultDayUse?.specialDates?.map(d => d.date) || [],
      consumption: { adults: 0, children: 0, pets: 0, cars: 0, motos: 0 },
      stock: 0,
      order: nextOrder,
      hasMinRules: false, 
      minQuantityRules: {} 
    });
    setIsModalOpen(true);
  };

  const handleEdit = (prod) => {
    const parentDayUse = myDayUses.find(d => d.id === prod.dayUseId);

    const hasRules = prod.minQuantityRules && Object.keys(prod.minQuantityRules).length > 0;
    
    setFormData({ 
        ...prod,
        noSalesLimit: !prod.salesEndHour,
        ageType: prod.ageType || 'paid',
        ageMin: prod.ageMin || '',
        ageMax: prod.ageMax || '',
        petSize: prod.petSize || '',
        includedSpecialDates: prod.includedSpecialDates || parentDayUse?.specialDates?.map(d => d.date) || []
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (prod) => {
    const newStatus = prod.status === 'paused' ? 'active' : 'paused';
    setLoading(true);
    try {
        await updateDoc(doc(db, "products", prod.id), { 
            status: newStatus,
            updatedAt: new Date()
        });
        setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, status: newStatus } : p));
        setFeedback({ type: 'success', title: 'Sucesso', msg: `Produto ${newStatus === 'active' ? 'ativado' : 'pausado'}.` });
    } catch (err) {
        setFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível alterar o status.' });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Deseja excluir este produto?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(prev => prev.filter(p => p.id !== id));
      setFeedback({ type: 'success', title: 'Excluído', msg: 'Produto removido.' });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível excluir.' });
    }
  };

  const handleSave = async () => {
    if (!formData.dayUseId || !formData.type || !formData.title || (!formData.price && formData.price !== 0)) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const selectedType = ALL_OFFER_TYPES.find(t => t.id === formData.type);
      let finalConsumption = { adults: 0, children: 0, pets: 0, cars: 0, motos: 0 };

      if (selectedType.consume) {
        finalConsumption = { ...finalConsumption, ...selectedType.consume };
      } else if (selectedType.customConsume) {
        finalConsumption = { 
            adults: Number(formData.consumption?.adults || 0),
            children: Number(formData.consumption?.children || 0),
            pets: Number(formData.consumption?.pets || 0),
            cars: 0, motos: 0
        };
      }

      const payload = {
        ownerId: user.uid,
        dayUseId: formData.dayUseId,
        updatedAt: new Date(),
        type: formData.type,
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        salesEndHour: formData.noSalesLimit ? null : formData.salesEndHour,
        
        ageType: formData.ageType,
        ageMin: formData.ageMin,
        ageMax: formData.ageMax,
        petSize: formData.petSize || '',
        
        availableDays: formData.availableDays,
        includedSpecialDates: formData.includedSpecialDates || [],
        isPhysical: !!selectedType.isPhysical,
        stock: selectedType.isPhysical ? Number(formData.stock) : null,
        consumption: finalConsumption,
        order: formData.order !== undefined ? Number(formData.order) : products.length,
        minQuantityRules: formData.hasMinRules ? formData.minQuantityRules : {}
      };

      if (formData.id) {
        await updateDoc(doc(db, "products", formData.id), payload);
      } else {
        await addDoc(collection(db, "products"), { ...payload, createdAt: new Date(), status: 'active' });
      }

      setIsModalOpen(false);
      loadData();
      setFeedback({ type: 'success', title: 'Salvo', msg: 'Produto atualizado com sucesso.' });

    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao salvar.' });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableOfferTypes = () => {
      const selectedDayUse = myDayUses.find(d => d.id === formData.dayUseId);
      if (!selectedDayUse) return [];

      const capacity = selectedDayUse.dailyStock || {};
      const hasPets = selectedDayUse.acceptsPets || (Number(capacity.pets || 0) > 0);
      const hasCar = selectedDayUse.hasPaidParking || (Number(selectedDayUse.parkingCars || 0) > 0);
      const hasMoto = selectedDayUse.hasPaidParking || (Number(selectedDayUse.parkingMoto || 0) > 0);

      return ALL_OFFER_TYPES.filter(type => {
          if (type.isPhysical) return true;
          if (type.requires === 'pets' && !hasPets) return false;
          if (type.requires === 'car' && !hasCar) return false;
          if (type.requires === 'moto' && !hasMoto) return false;
          return true;
      });
  };

  // 🔥 CORREÇÃO FINAL: HANDLER DO MÍNIMO DE PESSOAS
  const handleMinQuantityRuleChange = (key, value) => {
      setFormData(prev => {
          // Cria uma cópia segura das regras atuais
          const currentRules = { ...prev.minQuantityRules };
          
          // Se o usuário apagou tudo, deixamos vazio para não travar o input
          if (value === '') {
              currentRules[key] = ''; 
          } else {
              // Salva o número exatamente como digitado (mesmo se for 1)
              // Isso permite digitar "1", depois "0" virando "10"
              currentRules[key] = Number(value);
          }

          return { 
              ...prev, 
              minQuantityRules: currentRules 
          };
      });
  };

  // --- RENDERIZAÇÃO: REGRAS DE IDADE E QUANTIDADE ---
  const renderAgeSettings = () => {
    if (!formData.type) return null;
    const childAges = Array.from({length: 18}, (_, i) => i); 
    const adultAges = Array.from({length: 83}, (_, i) => i + 10);
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    if (['adult', 'combo_adult'].includes(formData.type)) {
        return (
            <div className="space-y-4">
                {/* 1. Idade (Existente) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4 animate-fade-in">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Classificação (Adultos)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Pessoas acima de:</span>
                        <select className="flex-1 border p-2 rounded-lg bg-white outline-none focus:border-[#0097A8]" value={formData.ageMin} onChange={e => setFormData({...formData, ageMin: e.target.value})}>
                            <option value="">Selecione...</option>
                            {adultAges.map(age => <option key={age} value={age}>{age} anos</option>)}
                        </select>
                    </div>
                </div>
            </div>
        );
    }

    if (['child', 'combo_child'].includes(formData.type)) {
        return (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4 animate-fade-in space-y-3">
                <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Tipo de Ingresso Infantil</label>
                    <select className="w-full border p-2 rounded-lg bg-white outline-none focus:border-[#0097A8]" value={formData.ageType} onChange={e => setFormData({...formData, ageType: e.target.value})}>
                        <option value="paid">Ingresso Pago</option>
                        <option value="free">Ingresso Gratuito / Cortesia</option>
                    </select>
                </div>
                {formData.ageType === 'paid' && (
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Faixa Etária</label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">Entre</span>
                            <select className="w-20 border p-2 rounded-lg bg-white" value={formData.ageMin} onChange={e => setFormData({...formData, ageMin: e.target.value})}>
                                <option value="">Min</option>
                                {childAges.map(age => <option key={age} value={age}>{age}</option>)}
                            </select>
                            <span className="text-sm text-slate-500">e</span>
                            <select className="w-20 border p-2 rounded-lg bg-white" value={formData.ageMax} onChange={e => setFormData({...formData, ageMax: e.target.value})}>
                                <option value="">Max</option>
                                {childAges.map(age => <option key={age} value={age}>{age}</option>)}
                            </select>
                            <span className="text-sm text-slate-500">anos</span>
                        </div>
                    </div>
                )}
                {formData.ageType === 'free' && (
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Faixa Etária</label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">Crianças até</span>
                            <select className="w-24 border p-2 rounded-lg bg-white" value={formData.ageMax} onChange={e => setFormData({...formData, ageMax: e.target.value})}>
                                <option value="">Idade</option>
                                {childAges.map(age => <option key={age} value={age}>{age} anos</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (['mix_ac', 'mix_suite', 'super_mix'].includes(formData.type)) {
        return (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4 animate-fade-in space-y-3">
                <label className="text-xs font-bold text-slate-700 block">Regras de Idade (Mix)</label>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-600 w-1/3">Adultos acima de:</span>
                    <select className="flex-1 border p-2 rounded-lg bg-white outline-none focus:border-[#0097A8]" value={formData.ageMin} onChange={e => setFormData({...formData, ageMin: e.target.value})}>
                        <option value="">Selecione...</option>
                        {adultAges.map(age => <option key={age} value={age}>{age} anos</option>)}
                    </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-600 w-1/3">Crianças até:</span>
                    <select className="flex-1 border p-2 rounded-lg bg-white outline-none focus:border-[#0097A8]" value={formData.ageMax} onChange={e => setFormData({...formData, ageMax: e.target.value})}>
                        <option value="">Selecione...</option>
                        {childAges.map(age => <option key={age} value={age}>{age} anos</option>)}
                    </select>
                </div>
            </div>
        );
    }
    return null;
  };

  // 🔥 2. RENDERIZAÇÃO: MÍNIMO DE PESSOAS (NOVA POSIÇÃO)
  const renderMinQuantitySettings = () => {
      if (!['adult', 'combo_adult'].includes(formData.type)) return null;

      const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      
      // Busca dados do DayUse para pegar o nome dos feriados
      const parentDayUse = myDayUses.find(d => d.id === formData.dayUseId);
      const specialDatesMap = {};
      if (parentDayUse?.specialDates) {
          parentDayUse.specialDates.forEach(sd => {
              specialDatesMap[sd.date] = sd.note || 'Feriado/Especial';
          });
      }

      return (
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-fade-in mt-4">
            <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-amber-800 flex items-center gap-2">
                    <Users size={16}/> Mínimo de Pessoas por Dia
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.hasMinRules} onChange={(e) => setFormData({...formData, hasMinRules: e.target.checked})} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
            </div>
            
            {formData.hasMinRules && (
                <div className="space-y-4 animate-slide-down">
                    <p className="text-xs text-amber-700">Defina a quantidade mínima de pagantes para confirmar reserva em cada dia:</p>
                    
                    {/* Dias da Semana */}
                    {formData.availableDays && formData.availableDays.length > 0 && (
                        <div>
                            <span className="text-[10px] font-bold text-amber-600 uppercase mb-2 block">Dias da Semana</span>
                            <div className="grid grid-cols-2 gap-2">
                                {formData.availableDays.map(dayIdx => (
                                    <div key={`weekday-${dayIdx}`} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-amber-100">
                                        <span className="text-xs font-bold text-slate-500 w-8">{weekDays[dayIdx]}</span>
                                        <input 
                                            type="number" 
                                            min="1"
                                            className="w-full border-none p-0 text-sm font-bold text-slate-700 focus:ring-0 text-right"
                                            placeholder="1"
                                            // Correção: Acessa o valor corretamente
                                            value={(formData.minQuantityRules && formData.minQuantityRules[dayIdx]) ?? ''} 
                                            onChange={(e) => handleMinQuantityRuleChange(dayIdx, e.target.value)}
                                        />
                                        <span className="text-[10px] text-slate-400">min</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Datas Especiais (Se houver selecionadas) */}
                    {formData.includedSpecialDates && formData.includedSpecialDates.length > 0 && (
                        <div className="border-t border-amber-200/50 pt-2">
                            <span className="text-[10px] font-bold text-amber-600 uppercase mb-2 block">Datas Especiais</span>
                            <div className="grid grid-cols-1 gap-2">
                                {formData.includedSpecialDates.map((dateStr) => (
                                    <div key={`special-${dateStr}`} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-amber-100">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-700">{dateStr.split('-').reverse().join('/')}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{specialDatesMap[dateStr]}</p>
                                        </div>
                                        <input 
                                            type="number" 
                                            min="1"
                                            className="w-16 border-l border-slate-100 p-0 pl-2 text-sm font-bold text-slate-700 focus:ring-0 text-right"
                                            placeholder="1"
                                            // Correção: Acessa pela chave de data string
                                            value={(formData.minQuantityRules && formData.minQuantityRules[dateStr]) ?? ''}
                                            onChange={(e) => handleMinQuantityRuleChange(dateStr, e.target.value)}
                                        />
                                        <span className="text-[10px] text-slate-400">min</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      );
  };

  // --- RENDERIZAÇÃO: CAMPOS DINÂMICOS (Mantido Igual) ---
  const renderDynamicFields = () => {
    if (!formData.type) return null;
    const typeDef = ALL_OFFER_TYPES.find(t => t.id === formData.type);
    
    if (typeDef.isPhysical) {
        return (
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mt-4 animate-fade-in">
                <h4 className="font-bold text-orange-800 text-sm mb-2 flex items-center gap-2"><Package size={16}/> Controle de Estoque</h4>
                <label className="text-xs font-bold text-slate-500 block mb-1">Quantidade em Estoque (Universal)</label>
                <input type="number" className="w-full border p-3 rounded-xl bg-white" placeholder="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
        );
    }

    if (formData.type === 'pet') {
        return (
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mt-4 animate-fade-in">
                <label className="text-xs font-bold text-slate-500 block mb-1 flex items-center gap-1"><PawPrint size={14}/> Qual o porte do pet?</label>
                <select className="w-full border p-2 rounded-lg bg-white text-sm outline-none focus:border-[#0097A8]" value={formData.petSize || ''} onChange={e => setFormData({...formData, petSize: e.target.value})}>
                    <option value="">Selecione...</option>
                    <option value="Pequeno">Pequeno</option>
                    <option value="Médio">Médio</option>
                    <option value="Grande">Grande</option>
                    <option value="Todos">Todos os Portes</option>
                </select>
            </div>
        )
    }

    if (typeDef.customConsume) {
        return (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4 animate-fade-in">
                <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2"><Users size={16}/> Configuração do Combo</h4>
                <p className="text-xs text-blue-600 mb-4">Quantidade de pessoas/pets incluídos neste pacote.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        {typeDef.customConsume.includes('adults') && (
                            <div><label className="text-xs font-bold text-slate-500 block mb-1">Qtd. Adultos</label><input type="number" className="w-full border p-2 rounded-lg bg-white font-bold" value={formData.consumption?.adults} onChange={e => setFormData({...formData, consumption: {...formData.consumption, adults: e.target.value}})} /></div>
                        )}
                        {typeDef.customConsume.includes('children') && (
                            <div><label className="text-xs font-bold text-slate-500 block mb-1">Qtd. Crianças</label><input type="number" className="w-full border p-2 rounded-lg bg-white font-bold" value={formData.consumption?.children} onChange={e => setFormData({...formData, consumption: {...formData.consumption, children: e.target.value}})} /></div>
                        )}
                        {typeDef.customConsume.includes('pets') && (
                            <div><label className="text-xs font-bold text-slate-500 block mb-1">Qtd. Pets</label><input type="number" className="w-full border p-2 rounded-lg bg-white font-bold" value={formData.consumption?.pets} onChange={e => setFormData({...formData, consumption: {...formData.consumption, pets: e.target.value}})} /></div>
                        )}
                    </div>
                    {typeDef.customConsume.includes('pets') && (
                        <div className="space-y-3">
                             <div><label className="text-xs font-bold text-slate-500 block mb-1 flex items-center gap-1"><PawPrint size={12}/> Porte dos Pets</label><select className="w-full border p-2 rounded-lg bg-white text-sm" value={formData.petSize || ''} onChange={e => setFormData({...formData, petSize: e.target.value})}><option value="">Selecione...</option><option value="Pequeno">Pequeno</option><option value="Médio">Médio</option><option value="Grande">Grande</option><option value="Todos">Todos os Portes</option></select></div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
  };

  const currentDayUse = myDayUses.find(d => d.id === formData.dayUseId);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Meus Produtos</h1>
          <p className="text-slate-500">Crie ingressos, combos e serviços extras.</p>
        </div>
        
        <div className="flex items-center gap-2 relative">
            {/* BOTÃO NOVO: ORGANIZAR */}
            <button 
                onClick={() => setIsReorderOpen(true)}
                className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0097A8] transition-colors bg-white shadow-sm flex items-center gap-2"
                title="Reordenar Produtos"
            >
                <ListOrdered size={20}/>
                <span className="hidden md:inline text-sm font-bold">Organizar</span>
            </button>

            <div className="relative">
                <button onClick={() => setShowBulkMenu(!showBulkMenu)} className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0097A8] transition-colors bg-white shadow-sm" title="Gerenciar Vendas em Massa"><MoreHorizontal size={20}/></button>
                {showBulkMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowBulkMenu(false)}></div>
                        <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-fade-in">
                            <button onClick={() => handleBulkUpdate('active')} className="w-full text-left px-4 py-3 text-sm font-bold text-green-700 hover:bg-green-50 flex items-center gap-2 transition-colors border-b border-slate-50"><PlayCircle size={16}/> Ativar Todos</button>
                            <button onClick={() => handleBulkUpdate('paused')} className="w-full text-left px-4 py-3 text-sm font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors"><PauseCircle size={16}/> Pausar Todos</button>
                        </div>
                    </>
                )}
            </div>
            <Button onClick={handleOpenNew} className="flex items-center gap-2 px-6"><Plus size={20}/> Novo Produto</Button>
        </div>
      </div>

      {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><Tag size={32}/></div>
              <p className="text-slate-500">Nenhum produto cadastrado.</p>
          </div>
      ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((item, index) => {
                  const typeInfo = ALL_OFFER_TYPES.find(t => t.id === item.type) || {};
                  const isPaused = item.status === 'paused';

                  return (
                    <div key={item.id} className={`bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all flex flex-col ${isPaused ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-2">
                                <div className="bg-slate-50 p-2 rounded-xl text-slate-500">{typeInfo.icon || <Tag size={20}/>}</div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg flex items-center h-fit mt-1 ${isPaused ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    {isPaused ? 'Pausado' : 'Ativo'}
                                </span>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-blue-50 text-blue-600">{typeInfo.label}</span>
                            </div>
                        </div>
                        
                        <h3 className={`font-bold text-xl mb-1 line-clamp-1 ${isPaused ? 'text-slate-500' : 'text-slate-900'}`}>{item.title}</h3>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-2 h-10">{item.description}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-4">
                            {item.ageMin && ['adult', 'combo_adult', 'mix_ac', 'mix_suite', 'super_mix'].includes(item.type) && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">+{item.ageMin} anos</span>}
                            {item.ageType === 'free' && <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded border border-green-100">Grátis</span>}
                            {item.petSize && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-100 flex items-center gap-1"><PawPrint size={8}/> {item.petSize}</span>}
                        </div>
                        
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                            <span className={`text-xl font-extrabold ${isPaused ? 'text-slate-400' : 'text-[#0097A8]'}`}>{item.price === 0 ? 'Grátis' : formatBRL(item.price)}</span>
                            <div className="flex gap-2">
                                <button onClick={() => handleToggleStatus(item)} className={`p-2 rounded-lg transition-colors ${isPaused ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'}`} title={isPaused ? "Ativar Vendas" : "Pausar Vendas"}><Power size={18}/></button>
                                <button onClick={() => handleEdit(item)} className="p-2 hover:bg-slate-100 rounded-lg text-blue-600"><Edit size={18}/></button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 rounded-lg text-red-500"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {isModalOpen && createPortal(
        <ModalOverlay onClose={() => setIsModalOpen(false)}>
            <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-2xl text-slate-900">{formData.id ? 'Editar Produto' : 'Novo Produto'}</h3>
                    <button onClick={() => setIsModalOpen(false)}><X size={24}/></button>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="text-sm font-bold text-slate-700 block mb-2 flex items-center gap-2"><Store size={16}/> Vincular ao Day Use</label>
                        <select className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" value={formData.dayUseId} onChange={(e) => { const newId = e.target.value; const newDayUse = myDayUses.find(d => d.id === newId); setFormData({ ...formData, dayUseId: newId, type: '', availableDays: newDayUse?.availableDays || [0,6], includedSpecialDates: newDayUse?.specialDates?.map(d => d.date) || [] }); }} disabled={!!formData.id}>
                            <option value="">Selecione um estabelecimento...</option>
                            {myDayUses.map(du => <option key={du.id} value={du.id}>{du.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Tipo de Oferta</label>
                        <select className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8] disabled:opacity-50" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} disabled={!!formData.id || !formData.dayUseId}>
                            <option value="">Selecione o tipo...</option>
                            {getAvailableOfferTypes().map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>

                    {formData.type && (
                        <>
                            {renderAgeSettings()}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div><div className="flex justify-between"><label className="text-sm font-bold text-slate-700 block mb-1">Título</label><span className="text-[10px] text-slate-400">{formData.title?.length || 0}/40</span></div><input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" maxLength={40} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                                <div><label className="text-sm font-bold text-slate-700 block mb-1">Preço (R$)</label><input type="number" className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" placeholder="0.00" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
                            </div>
                            <div><div className="flex justify-between"><label className="text-sm font-bold text-slate-700 block mb-1">Descrição Curta</label><span className="text-[10px] text-slate-400">{formData.description?.length || 0}/120</span></div><textarea className="w-full border p-3 rounded-xl h-24 resize-none outline-none focus:border-[#0097A8]" maxLength={120} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div><label className="text-sm font-bold text-slate-700 block mb-1 flex items-center gap-1"><Clock size={14}/> Encerrar vendas às:</label><input type="time" className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8] disabled:bg-slate-100 disabled:text-slate-400" value={formData.salesEndHour || ''} onChange={e => setFormData({...formData, salesEndHour: e.target.value})} disabled={formData.noSalesLimit} /></div>
                                <div className="flex items-center pt-6"><label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" className="accent-[#0097A8] w-4 h-4" checked={formData.noSalesLimit} onChange={(e) => setFormData({...formData, noSalesLimit: e.target.checked})} /> Não se aplica (Sem limite)</label></div>
                            </div>
                            {!ALL_OFFER_TYPES.find(t=>t.id === formData.type)?.isPhysical && currentDayUse && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="text-sm font-bold text-slate-700 block mb-3 flex items-center gap-2"><Calendar size={16}/> Dias de Funcionamento</label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => {
                                            const isOpenGlobally = currentDayUse?.availableDays?.includes(idx);
                                            const isSelected = formData.availableDays?.includes(idx);
                                            return <button key={idx} disabled={!isOpenGlobally} onClick={() => { const newDays = isSelected ? formData.availableDays.filter(d => d !== idx) : [...formData.availableDays, idx]; setFormData({...formData, availableDays: newDays.sort()}); }} className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${!isOpenGlobally ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50' : isSelected ? 'bg-[#0097A8] text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:border-[#0097A8]'}`}>{day}</button>;
                                        })}
                                    </div>
                                    {currentDayUse.specialDates && currentDayUse.specialDates.length > 0 && (
                                        <div className="border-t border-slate-200 pt-3 mt-3">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">Datas Especiais / Feriados <span className="bg-slate-100 text-slate-400 px-1.5 rounded text-[9px]">Opcional</span></p>
                                            <div className="flex flex-wrap gap-2">
                                                {currentDayUse.specialDates.map((sd, i) => {
                                                    const isIncluded = formData.includedSpecialDates?.includes(sd.date);
                                                    return <button key={i} onClick={() => { const currentList = formData.includedSpecialDates || []; const newList = isIncluded ? currentList.filter(date => date !== sd.date) : [...currentList, sd.date]; setFormData({...formData, includedSpecialDates: newList}); }} className={`px-3 py-2 rounded-lg border flex flex-col items-center transition-all ${isIncluded ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-200'}`}><span className="text-xs font-bold">{sd.date.split('-').reverse().join('/')}</span><span className="text-[9px] opacity-70">{sd.note || 'Feriado'}</span></button>;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-3">* Este produto estará disponível nos dias da semana marcados acima E nas datas especiais selecionadas.</p>
                                </div>
                            )}
                            {/* 🔥 3. AQUI FICA O NOVO CARD DE MÍNIMO DE PESSOAS */}
                            {renderMinQuantitySettings()}

                            {renderDynamicFields()}
                            <Button onClick={handleSave} disabled={loading} className="w-full py-4 text-lg mt-4">{loading ? 'Salvando...' : 'Salvar Produto'}</Button>
                        </>
                    )}

                </div>
            </div>
        </ModalOverlay>, document.body
      )}

      {feedback && createPortal(
        <FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback?.type} title={feedback?.title} msg={feedback?.msg} />,
        document.body
      )}

      {/* MODAL DE REORDENAÇÃO */}
      <ReorderProductsModal 
        isOpen={isReorderOpen}
        onClose={() => setIsReorderOpen(false)}
        products={products}
        onSave={handleSaveReorder}
      />

    </div>
  );
};

export default PartnerProducts;