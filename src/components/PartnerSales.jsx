import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'; 
import { getFunctions, httpsCallable } from 'firebase/functions'; 
import { db } from '../firebase';
import { 
  TrendingUp, Download, Search, Filter, ChevronDown, X, 
  DollarSign, CreditCard, User, FileText, Tag, 
  BadgeCheck, Clock, RefreshCw, Phone, Ban
} from 'lucide-react';
import { formatBRL } from '../utils/format';
import Button from './Button';
import ModalOverlay from './ModalOverlay';
import RefundModal from './RefundModal'; 
import FeedbackModal from './FeedbackModal';

// --- DRAWER DE DETALHES (RAIO-X) ---
const SaleDetailDrawer = ({ sale, onClose, onRequestRefund }) => {
    const [fetchedPhone, setFetchedPhone] = useState(null);
    const [loadingPhone, setLoadingPhone] = useState(true);

    // 🔥 CORREÇÃO 1: BUSCA DE TELEFONE ASSÍNCRONA NO USUÁRIO
    useEffect(() => {
        const fetchUserPhone = async () => {
            if (!sale) return;
            setLoadingPhone(true);
            
            // Se já tem no objeto principal da reserva, usa ele
            if (sale.guestPhone && sale.guestPhone.length > 5) {
                setFetchedPhone(sale.guestPhone);
                setLoadingPhone(false);
                return;
            }

            // Se não, busca no documento do usuário
            if (sale.userId) {
                try {
                    const userDoc = await getDoc(doc(db, "users", sale.userId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        // Tenta achar em varios lugares
                        const found = userData.personalData?.phone || userData.phone || userData.mobile || null;
                        setFetchedPhone(found);
                    } else {
                        setFetchedPhone(null);
                    }
                } catch (err) {
                    console.error("Erro ao buscar telefone:", err);
                }
            }
            setLoadingPhone(false);
        };
        fetchUserPhone();
    }, [sale]);

    if (!sale) return null;

    const getStatusColor = (s) => {
        const status = (s || '').toLowerCase();
        if (['approved','confirmed', 'paid'].includes(status)) return 'text-green-600 bg-green-50 border-green-200';
        if (['pending','in_process'].includes(status)) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    // Verifica se pode estornar (apenas se estiver pago)
    const isRefundable = ['approved', 'confirmed', 'paid'].includes((sale.paymentStatus || '').toLowerCase());

    return createPortal(
        <>
            <div className="fixed inset-0 bg-black/50 z-[100] animate-fade-in" onClick={onClose}/>
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] overflow-y-auto animate-slide-in-right">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800">Raio-X da Venda</h2>
                    <button onClick={onClose}><X size={24} className="text-slate-400"/></button>
                </div>
                
                <div className="p-6 space-y-8">
                    {/* INDICADOR DE CONCILIAÇÃO */}
                    {sale.isReconciled ? (
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2 text-green-800 text-xs font-bold">
                            <BadgeCheck size={16}/> Dados Auditados pelo Mercado Pago
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-2 text-amber-800 text-xs font-bold">
                            <Clock size={16}/> Dados Estimados (Sincronize para confirmar)
                        </div>
                    )}

                    {/* RESUMO FINANCEIRO */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Líquido Recebido</span>
                        <div className="text-3xl font-black text-[#0097A8] mt-1">{formatBRL(sale.netValue)}</div>
                        
                        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
                            <div className="flex justify-between text-slate-500">
                                <span>Valor Bruto (Produtos)</span>
                                <span>{formatBRL(sale.grossValue)}</span>
                            </div>
                            {sale.couponValue > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span className="flex items-center gap-1"><Tag size={12}/> Cupom ({sale.couponName})</span>
                                    <span>- {formatBRL(sale.couponValue)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-red-500">
                                <span className="flex items-center gap-1">
                                    {sale.isReconciled ? 'Taxa Real (MP)' : `Taxa Estimada (${sale.feePercent}%)`}
                                </span>
                                <span>- {formatBRL(sale.feeValue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* PREVISÃO DE SAQUE */}
                    <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <span className="text-xs font-bold text-blue-700 uppercase">Disponível em:</span>
                        <span className="text-sm font-bold text-blue-900">{sale.releaseDate}</span>
                    </div>

                    <section>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><CreditCard size={16}/> Transação</h3>
                        <div className="border border-slate-100 p-4 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Status</span>
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold border uppercase ${getStatusColor(sale.paymentStatus)}`}>
                                    {sale.paymentStatus}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">ID Transação</span>
                                <span className="font-mono text-xs bg-slate-100 px-1 rounded">{sale.paymentId || sale.id}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Método</span>
                                <span className="text-sm font-bold text-slate-700 uppercase">{sale.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Data Venda</span>
                                <span className="text-sm font-bold text-slate-700">{sale.createdAtDate.toLocaleString()}</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><User size={16}/> Cliente</h3>
                        <div className="border border-slate-100 p-4 rounded-xl space-y-3 text-sm">
                            <div className="flex gap-3 items-center mb-2">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><User size={20} className="text-slate-400"/></div>
                                <div><p className="font-bold text-slate-800">{sale.guestName}</p><p className="text-xs text-slate-400">{sale.guestEmail}</p></div>
                            </div>
                            <div className="pt-2 border-t border-slate-50 flex items-center gap-2">
                                <Phone size={14} className="text-slate-400"/> 
                                <span className="text-slate-800 font-bold">
                                    {loadingPhone ? 'Buscando...' : fetchedPhone || 'Não informado'}
                                </span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText size={16}/> Itens</h3>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            {sale.items && sale.items.length > 0 ? (
                                <ul className="text-sm space-y-2">
                                    {sale.items.map((item, i) => (
                                        <li key={i} className="flex justify-between items-center border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                                            <span className="text-slate-600 font-medium">{(item.amount || item.quantity)}x {item.title}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Itens não detalhados.</p>
                            )}
                        </div>
                    </section>

                    {/* BOTÃO DE ESTORNO */}
                    {isRefundable && (
                        <div className="pt-4 border-t border-slate-100">
                            <button 
                                onClick={() => onRequestRefund(sale)}
                                className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Ban size={16}/> Estornar Venda
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
};

const PartnerSales = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  // FILTROS
  const [dateRange, setDateRange] = useState('this_month'); 
  const [statusFilter, setStatusFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  
  // Custom Date
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Modais
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleToRefund, setSaleToRefund] = useState(null); 
  const [refundLoading, setRefundLoading] = useState(false);

  // Modais de Confirmação e Feedback
  const [confirmModal, setConfirmModal] = useState(null); // { title, msg, onConfirm }
  const [feedback, setFeedback] = useState(null); // { type, title, msg }

  // KPIs
  const [stats, setStats] = useState({ approvedCount: 0, totalRevenue: 0 });

  // --- SINCRONIZAÇÃO FINANCEIRA (COM MODAL BONITO) ---
  const handleSynchronize = () => {
      const dates = getDateRangeDates(dateRange);
      
      if (!dates) { 
          setFeedback({ type: 'warning', title: 'Atenção', msg: 'Selecione um período específico para atualizar.' });
          return; 
      }

      // Abre modal de confirmação
      setConfirmModal({
          title: "Atualizar Financeiro?",
          msg: `Deseja buscar dados reais no Mercado Pago de ${dates.start.toLocaleDateString()} até ${dates.end.toLocaleDateString()}? Isso pode levar alguns segundos.`,
          onConfirm: async () => {
              setConfirmModal(null); // Fecha o modal de confirmação
              setSyncing(true);

              try {
                  const endpoint = '/api/sync';
                  const payload = {
                      ownerId: user.effectiveOwnerId || user.uid,
                      beginDate: dates.start.toISOString(),
                      endDate: dates.end.toISOString()
                  };

                  const response = await fetch(endpoint, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                  });

                  const data = await response.json();

                  if (!response.ok) throw new Error(data.error || "Erro na API");
                  
                  // Feedback de Sucesso Bonito
                  setFeedback({ 
                      type: 'success', 
                      title: 'Sincronização Concluída', 
                      msg: `Sucesso! ${data.updated} vendas foram auditadas e atualizadas com as taxas reais.` 
                  });
                  
                  loadSales(); 

              } catch (error) {
                  console.error("Erro Sync:", error);
                  setFeedback({ type: 'error', title: 'Erro', msg: `Falha ao sincronizar: ${error.message}` });
              } finally { 
                  setSyncing(false); 
              }
          }
      });
  };

  // --- LÓGICA DE ESTORNO (CORRIGIDA E LOGADA) ---
  const handleConfirmRefund = async (sale) => {
      // Validação de segurança básica
      if (!sale.paymentId) {
          alert("Erro: Esta venda não possui ID de transação. Não é possível estornar automaticamente.");
          return;
      }

      setRefundLoading(true);

      try {
          // 🔥 CORREÇÃO DA URL: Usa caminho relativo
          const endpoint = '/api/refund';

          const payload = {
              paymentId: sale.paymentId,
              amount: sale.paidAmount, 
              // Envia o ID do chefe para a API buscar as credenciais dele
              ownerId: user.effectiveOwnerId || user.uid, 
              guestEmail: sale.guestEmail,
              guestName: sale.guestName,
              itemName: sale.items?.[0]?.title || 'Day Use'
          };

          const response = await fetch(endpoint, { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          // Tenta ler o JSON independente do status para ver o erro
          const data = await response.json();

          if (!response.ok) {
              throw new Error(data.message || `Erro API: ${response.statusText}`);
          }

          await updateDoc(doc(db, "reservations", sale.id), {
              status: 'cancelled',       // Status geral da reserva
              paymentStatus: 'refunded', // Status legado de pagamento
              mpStatus: 'refunded',      // 🔥 STATUS REAL (Importante para o enriquecimento)
              refundId: data.id, 
              updatedAt: new Date(),
              history: arrayUnion(
                  `Estorno de R$ ${sale.paidAmount} realizado em ${new Date().toLocaleString()}`,
                  `ID Reembolso MP: ${data.id}`
              )
          });

          // 3. ATUALIZA A TELA
          setSalesData(prev => prev.map(s => s.id === sale.id ? { ...s, paymentStatus: 'refunded', mpStatus: 'refunded', status: 'cancelled' } : s));
          setFilteredData(prev => prev.map(s => s.id === sale.id ? { ...s, paymentStatus: 'refunded', mpStatus: 'refunded', status: 'cancelled' } : s));
          
          setSaleToRefund(null); 
          setSelectedSale(null);
          
          setFeedback({ 
              type: 'success', 
              title: 'Estorno Realizado', 
              msg: 'O valor foi devolvido para a conta do cliente e o e-mail de confirmação foi enviado.' 
          });

      } catch (error) {
          console.error("❌ ERRO CRÍTICO NO ESTORNO:", error);
          setFeedback({ 
              type: 'error', 
              title: 'Falha no Estorno', 
              msg: error.message});
      } finally {
          console.groupEnd();
          setRefundLoading(false);
      }
  };

  const getDateRangeDates = (range) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      switch(range) {
          case 'today': return { start: today, end: new Date(today.getTime() + 86400000) };
          case 'yesterday': const yest = new Date(today); yest.setDate(yest.getDate() - 1); return { start: yest, end: today };
          case 'this_month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
          case 'last_month': return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
          case 'last_90': const d90 = new Date(today); d90.setDate(d90.getDate() - 90); return { start: d90, end: now };
          case 'last_180': const d180 = new Date(today); d180.setDate(d180.getDate() - 180); return { start: d180, end: now };
          case 'last_12_months': const d365 = new Date(today); d365.setFullYear(d365.getFullYear() - 1); return { start: d365, end: now };
          case 'custom': if (!customStart || !customEnd) return null; return { start: new Date(customStart), end: new Date(new Date(customEnd).getTime() + 86400000) };
          default: return null;
      }
  };

  // --- ENRIQUECIMENTO INTELIGENTE (CORRIGIDO) ---
  const enrichData = (doc) => {
      const data = doc.data();
      
      const paidAmount = Number(data.total || data.totalPrice || 0);
      const couponValue = Number(data.discount || 0); 
      const couponName = data.couponCode || '-';
      const grossValue = paidAmount + couponValue; 

      const isReconciled = !!data.isFinanciallyReconciled;

      let feeValue = 0;
      let netValue = 0;
      let feePercent = 0;
      let releaseDate = null;
      let paymentMethodDisplay = data.paymentMethod || '-';
      
      // 🔥 CORREÇÃO: Prioridade absoluta para 'mpStatus' (conforme seu print)
      // Se não tiver mpStatus, cai para paymentStatus e por fim status geral
      let statusDisplay = data.mpStatus || data.paymentStatus || data.status;

      if (isReconciled) {
          feeValue = data.mercadoPagoFee || 0;
          netValue = data.mercadoPagoNetReceived || 0;
          feePercent = grossValue > 0 ? ((feeValue / grossValue) * 100).toFixed(2) : 0;
          releaseDate = data.mercadoPagoReleaseDate ? new Date(data.mercadoPagoReleaseDate).toLocaleDateString() : 'Pendente';
          paymentMethodDisplay = data.paymentMethodDetail || paymentMethodDisplay;
          // Se já reconciliou, usa o status auditado, senão mantem o mpStatus
          statusDisplay = data.mercadoPagoStatus || statusDisplay;
      } else {
          const sourceUrl = data.sourceUrl || 'mapadodayuse.com';
          feePercent = sourceUrl.includes('mapadodayuse.com') ? 12 : 0;
          feeValue = grossValue * (feePercent / 100);
          netValue = grossValue - feeValue - couponValue;
          releaseDate = 'Previsão D+30'; 
      }

      // Itens Híbridos
      const rawItems = data.cartItems || data.items || data.financialSnapshot?.items || [];
      const normalizedItems = rawItems.map(i => ({
          title: i.title || i.name || 'Day Use',
          amount: i.quantity || i.amount || 1
      }));

      return {
          id: doc.id,
          ...data,
          createdAtDate: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          
          grossValue,
          paidAmount,
          couponValue,
          couponName,
          
          feePercent,
          feeValue,
          netValue,
          releaseDate,
          isReconciled,
          paymentMethod: paymentMethodDisplay,
          paymentStatus: statusDisplay, // Agora carrega o valor correto (ex: refunded, pending)
          items: normalizedItems,
          
          sourceDisplay: (data.sourceUrl || 'mapadodayuse.com').replace('https://', '').replace('www.', '').split('/')[0]
      };
  };

  // --- CARREGAMENTO DAS VENDAS ---
  const loadSales = async () => {
    if (!user) return;
    setLoading(true);
    
    // 🔥 Define o ID correto (Chefe ou Próprio)
    const targetId = user.effectiveOwnerId || user.uid;

    try {
        // Query Correta: Usa targetId em vez de user.uid
        const q = query(
            collection(db, "reservations"), 
            where("ownerId", "==", targetId)
        );
        
        const snapshot = await getDocs(q);
        const dates = getDateRangeDates(dateRange);
        
        let allData = snapshot.docs.map(enrichData);

        // Filtro de Data
        if (dates && dateRange !== 'all') {
            allData = allData.filter(item => item.createdAtDate >= dates.start && item.createdAtDate <= dates.end);
        }
        
        // Ordenação
        allData.sort((a, b) => b.createdAtDate - a.createdAtDate);
        setSalesData(allData);

        // Estatísticas
        const approvedOnly = allData.filter(i => ['approved', 'confirmed', 'paid'].includes((i.paymentStatus || i.status).toLowerCase()));
        setStats({
            approvedCount: approvedOnly.length,
            totalRevenue: approvedOnly.reduce((acc, curr) => acc + curr.paidAmount, 0)
        });

    } catch (err) { 
        console.error("Erro ao carregar vendas:", err); 
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => { loadSales(); }, [user, dateRange, customStart, customEnd]);

  useEffect(() => {
      let filtered = [...salesData];
      if (statusFilter !== 'all') {
          filtered = filtered.filter(item => {
              const s = (item.paymentStatus || item.status || '').toLowerCase();
              if (statusFilter === 'approved') return ['approved', 'confirmed', 'paid'].includes(s);
              if (statusFilter === 'pending') return ['pending', 'in_process', 'waiting_payment'].includes(s);
              if (statusFilter === 'cancelled') return ['cancelled', 'rejected'].includes(s);
              if (statusFilter === 'refunded') return s === 'refunded';
              return s === statusFilter;
          });
      }
      if (productSearch) {
          const lower = productSearch.toLowerCase();
          filtered = filtered.filter(item => 
              item.guestName?.toLowerCase().includes(lower) ||
              item.id.toLowerCase().includes(lower) ||
              item.items?.some(i => i.title.toLowerCase().includes(lower))
          );
      }
      setFilteredData(filtered);
  }, [salesData, statusFilter, productSearch]);

  const handleLocalExport = () => {
      const header = ["Data", "Cliente", "Produto", "Status", "Valor Bruto", "Taxa Estimada", "Vlr Taxa", "Cupom Nome", "Vlr Cupom", "Líquido", "Conciliado?", "Fonte"];
      const rows = filteredData.map(item => [
          item.createdAtDate.toLocaleString(), item.guestName, item.items?.map(i => i.title).join(', ') || 'Day Use',
          item.paymentStatus, item.grossValue.toFixed(2), `${item.feePercent}%`, item.feeValue.toFixed(2),
          item.couponName, item.couponValue.toFixed(2), item.netValue.toFixed(2), item.isReconciled ? 'SIM' : 'NÃO', item.sourceDisplay
      ]);
      const csvContent = [header.join(";"), ...rows.map(e => e.join(";"))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `vendas_local_${dateRange}.csv`; link.click();
  };

  const getStatusBadge = (item) => {
      const s = (item.paymentStatus || '').toLowerCase();
      const ConciliationIcon = item.isReconciled ? <BadgeCheck size={12} className="ml-1 text-inherit opacity-80" title="Verificado no MP"/> : null;

      if (['approved', 'confirmed', 'paid'].includes(s)) return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1">Aprovada {ConciliationIcon}</span>;
      if (['pending', 'in_process'].includes(s)) return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1">Pendente {ConciliationIcon}</span>;
      if (['cancelled', 'rejected'].includes(s)) return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1">Cancelada {ConciliationIcon}</span>;
      if (s === 'refunded') return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1">Estornada {ConciliationIcon}</span>;
      return <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1">{s} {ConciliationIcon}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Relatório de Vendas</h1>
          <p className="text-slate-500">Gestão financeira detalhada.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <button onClick={handleLocalExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 text-xs sm:text-sm">
                <Download size={16}/> Baixar Planilha
            </button>
            <button 
                onClick={handleSynchronize} 
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-[#0097A8] text-white border border-[#0097A8] rounded-lg font-bold hover:bg-[#008ba0] text-xs sm:text-sm disabled:opacity-50 transition-all shadow-sm"
            >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''}/> 
                {syncing ? 'Sincronizando...' : 'Atualizar Financeiro'}
            </button>
        </div>
      </div>

      {/* KPI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div><p className="text-sm text-slate-400 font-bold uppercase">Vendas Aprovadas</p><h3 className="text-3xl font-black text-slate-800">{stats.approvedCount}</h3><p className="text-xs text-slate-400 mt-1">No período selecionado</p></div>
              <div className="bg-green-50 p-3 rounded-full text-green-600"><TrendingUp size={32}/></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div><p className="text-sm text-slate-400 font-bold uppercase">Faturamento Total (Pago)</p><h3 className="text-3xl font-black text-[#0097A8]">{formatBRL(stats.totalRevenue)}</h3><p className="text-xs text-slate-400 mt-1">Soma das vendas aprovadas</p></div>
              <div className="bg-cyan-50 p-3 rounded-full text-[#0097A8]"><DollarSign size={32}/></div>
          </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative min-w-[180px]">
              <select className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-3 pl-4 pr-10 outline-none focus:border-[#0097A8]" value={dateRange} onChange={(e) => { if (e.target.value === 'custom') setIsCustomDateOpen(true); setDateRange(e.target.value); }}>
                  <option value="today">Hoje</option><option value="yesterday">Ontem</option><option value="this_month">Mês Atual</option><option value="last_month">Mês Passado</option><option value="all">Todo o Período</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          </div>
          <div className="relative min-w-[180px]">
              <select className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-3 pl-4 pr-10 outline-none focus:border-[#0097A8]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">Todos Status</option><option value="approved">Aprovada</option><option value="pending">Pendente</option><option value="cancelled">Cancelada</option><option value="refunded">Reembolsada</option>
              </select>
              <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          </div>
          <div className="flex-1 w-full relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input type="text" placeholder="Buscar por cliente, produto ou ID..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[#0097A8] transition-all" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}/>
          </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Data/Hora</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase">Produto</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Bruto</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Taxa</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Cupom</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Líquido</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Fonte</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {loading ? (<tr><td colSpan="9" className="p-8 text-center text-slate-400">Carregando...</td></tr>) : filteredData.length === 0 ? (<tr><td colSpan="9" className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>) : (
                          filteredData.map(sale => (
                              <tr key={sale.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${sale.isReconciled ? 'bg-green-50/30' : ''}`} onClick={() => setSelectedSale(sale)}>
                                  <td className="p-4 whitespace-nowrap"><div className="font-bold text-slate-700">{sale.createdAtDate.toLocaleDateString()}</div><div className="text-[10px] text-slate-400">{sale.createdAtDate.toLocaleTimeString().slice(0,5)}</div></td>
                                  <td className="p-4 font-bold text-slate-700">{sale.guestName}</td>
                                  <td className="p-4 text-slate-600 max-w-[150px] truncate">{sale.items?.[0]?.title || 'Day Use'}</td>
                                  <td className="p-4 text-right font-bold text-slate-700">{formatBRL(sale.grossValue)}</td>
                                  <td className="p-4 text-right"><div className="flex flex-col items-end"><span className="text-red-400 font-bold">-{formatBRL(sale.feeValue)}</span><span className="text-[10px] text-slate-400">{sale.isReconciled ? 'Real' : `${sale.feePercent}%`}</span></div></td>
                                  <td className="p-4 text-right">{sale.couponValue > 0 ? (<div className="flex flex-col items-end"><span className="text-red-400 font-bold">-{formatBRL(sale.couponValue)}</span><span className="text-[10px] text-green-600 font-bold bg-green-50 px-1 rounded">{sale.couponName}</span></div>) : <span className="text-slate-300">-</span>}</td>
                                  <td className="p-4 text-right font-black text-[#0097A8]">{formatBRL(sale.netValue)}</td>
                                  <td className="p-4 text-center">{getStatusBadge(sale)}</td>
                                  <td className="p-4 text-center text-slate-400 text-[10px]">{sale.sourceDisplay}</td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {isCustomDateOpen && createPortal(<ModalOverlay onClose={() => setIsCustomDateOpen(false)}><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h3 className="text-lg font-bold mb-4">Selecionar Período</h3><div className="space-y-3 mb-6"><div><label className="text-xs font-bold text-slate-500">Início</label><input type="date" className="w-full border p-2 rounded-lg" value={customStart} onChange={e => setCustomStart(e.target.value)} /></div><div><label className="text-xs font-bold text-slate-500">Fim</label><input type="date" className="w-full border p-2 rounded-lg" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div></div><Button onClick={() => setIsCustomDateOpen(false)}>Aplicar Filtro</Button></div></ModalOverlay>, document.body)}
      
      {/* DRAWER LATERAL */}
      <SaleDetailDrawer 
          sale={selectedSale} 
          onClose={() => setSelectedSale(null)} 
          onRequestRefund={(s) => setSaleToRefund(s)} // Abre o modal de estorno
      />

      {/* MODAL DE ESTORNO */}
      <RefundModal 
          isOpen={!!saleToRefund}
          reservation={saleToRefund} // ATENÇÃO: Seu RefundModal usa 'reservation' em vez de 'sale'
          onClose={() => setSaleToRefund(null)}
          onConfirm={handleConfirmRefund}
          loading={refundLoading}
      />

                {/* MODAL DE FEEDBACK (Sucesso/Erro) */}
                    {feedback && createPortal(
                <FeedbackModal 
                    isOpen={!!feedback} 
                    onClose={() => setFeedback(null)} 
                    type={feedback.type} 
                    title={feedback.title} 
                    msg={feedback.msg} 
                />,
                document.body
            )}

            {/* MODAL DE CONFIRMAÇÃO GENÉRICO (Para o Sync) */}
            {confirmModal && createPortal(
                <ModalOverlay onClose={() => setConfirmModal(null)}>
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
                        <p className="text-slate-500 mb-6">{confirmModal.msg}</p>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmModal.onConfirm}
                                className="flex-1 py-3 rounded-xl bg-[#0097A8] text-white font-bold hover:bg-[#008ba0] shadow-lg shadow-cyan-100 transition-colors"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </ModalOverlay>,
                document.body
            )}

    </div>
  );
};

export default PartnerSales;