import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, query, where, getDocs, doc, writeBatch, updateDoc, getDoc, arrayUnion 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Search, Users, FileText, CheckSquare, Square, X, RefreshCw, 
  Calendar as CalendarIcon, ArrowRight, ChevronLeft, ChevronRight, 
  User, MapPin, Mail, Phone, CreditCard, Activity, Clock, Ban, 
  CheckCircle, QrCode, ExternalLink, AlertTriangle, Printer, Filter, ChevronDown, ChevronUp,
  ScanLine, AlertCircle, DollarSign, Link as LinkIcon, Package
} from 'lucide-react';
import Button from './Button';
import FeedbackModal from './FeedbackModal';
import { formatBRL } from '../utils/format';
import QrScannerModal from './QrScannerModal';
import ModalOverlay from './ModalOverlay';
import VoucherModal from './VoucherModal';
import { notifyTicketStatusChange, notifyReschedule } from '../utils/notifications';
import TicketValidationModal from './TicketValidationModal';

const PartnerCalendar = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reservationsCache, setReservationsCache] = useState([]); 
  const [displayReservations, setDisplayReservations] = useState([]);
  const dateInputRef = useRef(null);

  // --- BLOCO DO SCANNER ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedRes, setScannedRes] = useState(null);

  // --- CONFIGURAÇÃO DE VISUALIZAÇÃO ---
  const [showFilters, setShowFilters] = useState(false); 
  const [statusFilter, setStatusFilter] = useState('all'); 

  // --- DATA SELECIONADA ---
  const getLocalDateString = (dateObj = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [uiSelectedDate, setUiSelectedDate] = useState(getLocalDateString());
  const [feedback, setFeedback] = useState(null);

  // --- STATES GERAIS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedResIds, setSelectedResIds] = useState([]);
  const [targetDate, setTargetDate] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // --- DRAWER & MODAIS ---
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showValidationConfirm, setShowValidationConfirm] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // --- HELPERS ---
  const formatDateDisplay = (dateValue) => {
    if (!dateValue) return 'S/ Data';
    if (typeof dateValue === 'string' && dateValue.includes('-')) return dateValue.split('-').reverse().join('/');
    if (dateValue?.toDate) return dateValue.toDate().toLocaleDateString('pt-BR');
    return dateValue;
  };

  const formatDateTime = (timestamp) => {
      if (!timestamp) return '-';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const translateStatusDisplay = (status) => {
      const s = (status || '').toLowerCase();
      if (['approved', 'confirmed', 'paid'].includes(s)) return 'Pago/Confirmado';
      if (['validated'].includes(s)) return 'Já Utilizado';
      if (['pending', 'waiting_payment'].includes(s)) return 'Aguardando Pagamento';
      if (['cancelled', 'rejected'].includes(s)) return 'Cancelado';
      return status;
  };

  const getTicketStatus = (res) => {

      // CORREÇÃO: Adicionamos 'res.mpStatus' como primeira opção de busca
      const payStatus = (res.mpStatus || res.paymentStatus || res.status || '').toLowerCase();

      if (['rejected', 'cancelled', 'refunded', 'failed_payment'].includes(payStatus)) {
          return { label: 'Cancelado', color: 'bg-red-100 text-red-700', type: 'cancelled' };
      }
      if (['pending', 'in_process', 'waiting_payment'].includes(payStatus)) {
          return { label: 'Pendente', color: 'bg-amber-100 text-amber-700', type: 'pending' };
      }
      if (['approved', 'confirmed', 'paid'].includes(payStatus)) {
          // Se já foi validado (entrou), mudamos o selo visualmente, mas o pagamento continua confirmado
          if (res.status === 'validated' || res.checkedInAt) {
              return { label: 'Já Utilizado', color: 'bg-blue-100 text-blue-700', type: 'validated' };
          }
          
          const resDate = new Date(res.date + 'T23:59:59');
          const today = new Date();
          if (resDate < today) {
              return { label: 'Expirado', color: 'bg-slate-200 text-slate-600', type: 'cancelled' };
          }
          return { label: 'Confirmado', color: 'bg-green-100 text-green-700', type: 'confirmed' };
      }
      return { label: 'Pendente', color: 'bg-slate-100 text-slate-500', type: 'pending' };
  };

  const getMPStatusInfo = (status, detail, fullRes) => { 
      // 1. DEFINIÇÃO DA VARIÁVEL 's' (Essa linha é obrigatória)
      const s = (fullRes?.mpStatus || status || '').toLowerCase();

      // 2. CHECAGENS USANDO 's'
      if (s === 'approved' || s === 'confirmed') return { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14}/> };
      if (s === 'in_process') return { label: 'Em análise', color: 'bg-amber-100 text-amber-700', icon: <Clock size={14}/> };
      if (s === 'pending' || s === 'waiting_payment') return { label: 'Esperando Pagamento', color: 'bg-amber-100 text-amber-700', icon: <Clock size={14}/> };
      if (s === 'rejected') return { label: 'Recusado', color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={14}/> };
      if (s === 'cancelled') return { label: 'Cancelado', color: 'bg-slate-200 text-slate-600', icon: <Ban size={14}/> };
      
      // 3. RETORNO PADRÃO
      return { label: s === 'validated' ? 'Aprovado (Validado)' : (status || 'Desconhecido'), color: 'bg-slate-100 text-slate-500' };
  };

  const translatePaymentMethod = (method) => {
      const m = (method || '').toLowerCase();
      if (m.includes('card') || m.includes('credit')) return 'Cartão de Crédito';
      if (m.includes('pix')) return 'Pix';
      if (m.includes('boleto')) return 'Boleto';
      return method || 'Não informado';
  };

  const calculateTotalGuests = (res) => {
      if (res.cartItems && Array.isArray(res.cartItems)) {
          return res.cartItems.reduce((acc, item) => acc + (Number(item.quantity) || Number(item.amount) || 1), 0);
      }
      if (res.totalGuests && Number(res.totalGuests) > 0) return Number(res.totalGuests);
      if (res.items && Array.isArray(res.items)) {
          return res.items.reduce((acc, item) => acc + (Number(item.amount) || 1), 0);
      }
      return 1; 
  };

  const getReservationTotal = (res) => {
      if (res.selectedSpecial && res.selectedSpecial.total) return Number(res.selectedSpecial.total);
      if (res.total !== undefined && res.total !== null) return Number(res.total);
      return Number(res.totalPrice || 0);
  };

  // --- CARREGAMENTO ---
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const baseDate = new Date(uiSelectedDate + 'T12:00:00');
      const startDate = new Date(baseDate); startDate.setDate(startDate.getDate() - 5);
      const endDate = new Date(baseDate); endDate.setDate(endDate.getDate() + 15);

      const targetOwnerId = user.effectiveOwnerId || user.uid;

      const q = query(
        collection(db, "reservations"), 
        where("ownerId", "==", targetOwnerId), // <--- CORREÇÃO
        where("date", ">=", getLocalDateString(startDate)),
        where("date", "<=", getLocalDateString(endDate))
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReservationsCache(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (!isSearching) loadData(); }, [uiSelectedDate, user]);

  useEffect(() => {
    let filtered = [...reservationsCache];
    if (!isSearching) filtered = filtered.filter(r => r.date === uiSelectedDate);
    if (statusFilter !== 'all') filtered = filtered.filter(r => getTicketStatus(r).type === statusFilter);
    filtered.sort((a, b) => a.guestName?.localeCompare(b.guestName));
    setDisplayReservations(filtered);
  }, [uiSelectedDate, reservationsCache, isSearching, statusFilter]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) { setIsSearching(false); loadData(); return; }
    setLoading(true); setIsSearching(true);
    try {
        const results = []; const term = searchTerm.trim().toLowerCase();
        const qAll = query(collection(db, "reservations"), where("ownerId", "==", user.uid));
        const snapAll = await getDocs(qAll);
        snapAll.forEach(doc => {
             const data = doc.data();
             const matches = data.guestName?.toLowerCase().includes(term) || data.guestEmail?.toLowerCase().includes(term) || (data.ticketCode || '').toLowerCase() === term || doc.id === term;
             if (matches) results.push({ id: doc.id, ...data });
        });
        setReservationsCache(results);
    } catch (err) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha na busca.' }); } 
    finally { setLoading(false); }
  };

  // --- AÇÕES ---
  const handleScanTicket = async (rawValue) => {
      setScanLoading(true);
      try {
          let code = rawValue || '';
          if (code.includes('http') || code.includes('/')) {
              if (code.endsWith('/')) code = code.slice(0, -1);
              const parts = code.split('/');
              code = parts[parts.length - 1]; 
          }
          code = code.trim(); 
          console.log("Calendário buscando:", code);

          const qTicketCode = query(collection(db, "reservations"), where("ownerId", "==", user.uid), where("ticketCode", "==", code.toUpperCase()));
          const docRef = doc(db, "reservations", code);
          const [snapTicket, docSnapId] = await Promise.all([getDocs(qTicketCode), getDoc(docRef)]);

          let foundData = null;
          if (!snapTicket.empty) foundData = { id: snapTicket.docs[0].id, ...snapTicket.docs[0].data() };
          else if (docSnapId.exists() && docSnapId.data().ownerId === user.uid) foundData = { id: docSnapId.id, ...docSnapId.data() };

          if (!foundData) { alert(`Ingresso não encontrado.\nCódigo: ${code}`); setScanLoading(false); return; }

          const payStatus = (foundData.paymentStatus || foundData.status || '').toLowerCase();
          if (['cancelled', 'rejected', 'refunded'].includes(payStatus)) alert(`ATENÇÃO: Ingresso CANCELADO ou REEMBOLSADO!`);

          setScannedRes(foundData); 
          setIsScannerOpen(false); 
      } catch (error) { console.error("Erro busca:", error); alert("Erro técnico."); } 
      finally { setScanLoading(false); }
  };

  // --- VALIDAÇÃO COM LOG E EMAIL ---
  const handleConfirmValidation = async () => {
      if (!scannedRes) return;
      try {
          const updateData = {
              status: 'validated',
              checkedInAt: new Date(),
              validationMethod: 'qr_calendar',
              // Adiciona logs ao histórico
              history: arrayUnion(
                  `Validado via QR Code em ${new Date().toLocaleString('pt-BR')}`,
                  `📧 E-mail de entrada confirmada enviado para o cliente`
              )
          };

          // Lógica do Responsável (Mantida)
          if (parentRes && parentVerified) {
              const logMsg = `Entrada autorizada mediante presença do responsável: ${parentRes.guestName}`;
              // Se já tem history no updateData, adicionamos mais um item ao arrayUnion não funciona direto assim
              // O ideal no firebase é mandar tudo num arrayUnion só se possível, mas aqui vamos simplificar garantindo o log principal
              updateData.checkInNote = logMsg; 
          }

          await updateDoc(doc(db, "reservations", scannedRes.id), updateData);

          setFeedback({ type: 'success', title: 'Entrada Confirmada', msg: `${scannedRes.guestName} liberado!` });
          
          notifyTicketStatusChange(scannedRes, 'validated'); // Dispara email

          setScannedRes(null);
          setParentRes(null);
      } catch (error) {
          console.error("Erro validar:", error);
          setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao validar.' });
      }
  };
  
  const handleBulkReschedule = async () => { 
      if (selectedResIds.length === 0) return alert("Selecione pelo menos um ingresso.");
      if (!targetDate) return alert("Selecione a nova data.");
      setLoading(true);
      try {
          const batch = writeBatch(db);
          const emailPromises = [];

          selectedResIds.forEach(resId => {
              const docRef = doc(db, "reservations", resId);
              // Log de E-mail e Reagendamento
              batch.update(docRef, { 
                  date: targetDate, 
                  updatedAt: new Date(), 
                  history: arrayUnion(
                      `Reagendado para ${targetDate.split('-').reverse().join('/')}`,
                      `📧 E-mail de aviso de nova data enviado`
                  )
              });

              const originalRes = reservationsCache.find(r => r.id === resId);
              if (originalRes) emailPromises.push(notifyReschedule(originalRes, originalRes.date, targetDate));
          });

          await batch.commit();
          await Promise.all(emailPromises);

          setFeedback({ type: 'success', title: 'Sucesso', msg: 'Reagendamento concluído!' });
          if (!isSearching) loadData();
          setIsSelectionMode(false); setSelectedResIds([]); setTargetDate(''); setShowRescheduleModal(false);
      } catch (err) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao reagendar.' }); } 
      finally { setLoading(false); }
  };

  const handleValidateTicket = async () => { 
      if (!selectedReservation) return;
      setLoading(true);
      try {
          const now = new Date();
          await updateDoc(doc(db, "reservations", selectedReservation.id), { 
              status: 'validated', 
              checkedInAt: now, 
              validationMethod: 'manual_panel', 
              updatedAt: now,
              // Log de E-mail
              history: arrayUnion(
                  `Validado manualmente pelo painel em ${now.toLocaleString('pt-BR')}`,
                  `📧 E-mail de entrada confirmada enviado`
              )
          });
          
          // Atualiza state local...
          const updatedRes = { ...selectedReservation, status: 'validated', checkedInAt: now };
          setSelectedReservation(updatedRes);
          setReservationsCache(prev => prev.map(r => r.id === updatedRes.id ? updatedRes : r));
          setShowValidationConfirm(false);
          setFeedback({ type: 'success', title: 'Validado', msg: 'Ingresso validado!' });

          notifyTicketStatusChange(selectedReservation, 'validated');

      } catch (error) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao validar.' }); } 
      finally { setLoading(false); }
  };

  const handleCancelReservation = async (resId) => { 
      if(!window.confirm("Tem certeza que deseja cancelar e invalidar este ingresso?")) return;
      setLoading(true);
      try {
          const resToCancel = reservationsCache.find(r => r.id === resId) || selectedReservation;
          const now = new Date();

          await updateDoc(doc(db, "reservations", resId), { 
              status: 'cancelled', 
              updatedAt: now, 
              // Log de E-mail
              history: arrayUnion(
                  `Cancelado pelo parceiro em ${now.toLocaleDateString()}`,
                  `📧 E-mail de cancelamento enviado`
              )
          });
          
          setFeedback({ type: 'success', title: 'Cancelado', msg: 'Ingresso cancelado com sucesso.' });
          setReservationsCache(prev => prev.map(r => r.id === resId ? {...r, status: 'cancelled'} : r));
          setSelectedReservation(null); 
          
          if(resToCancel) notifyTicketStatusChange(resToCancel, 'cancelled');

      } catch (error) { setFeedback({ type: 'error', title: 'Erro', msg: 'Erro ao cancelar.' }); } 
      finally { setLoading(false); }
  };

  const handleSyncPayment = async () => { 
      if (!selectedReservation) return;
      setSyncing(true);
      try {
          const docRef = doc(db, "reservations", selectedReservation.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              const newData = { id: docSnap.id, ...docSnap.data() };
              setSelectedReservation(newData);
              setReservationsCache(prev => prev.map(r => r.id === newData.id ? newData : r));
              setFeedback({ type: 'success', title: 'Atualizado', msg: 'Status sincronizado.' });
          }
      } catch (err) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao verificar.' }); } 
      finally { setSyncing(false); }
  };

  const handleValidationSuccess = (updatedRes) => {
      setFeedback({ type: 'success', title: 'Entrada Confirmada', msg: `${updatedRes.guestName} liberado!` });
      // Atualiza o cache local para refletir a validação instantaneamente
      setReservationsCache(prev => prev.map(r => r.id === updatedRes.id ? {...r, status: 'validated', checkedInAt: new Date()} : r));
      setScannedRes(null); // Fecha o modal
  };

  const openRescheduleFromPanel = (res) => { setSelectedResIds([res.id]); setSelectedReservation(null); setShowRescheduleModal(true); };
  const handlePrevDay = () => { const d = new Date(uiSelectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setUiSelectedDate(getLocalDateString(d)); };
  const handleNextDay = () => { const d = new Date(uiSelectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setUiSelectedDate(getLocalDateString(d)); };

  const renderHorizontalCalendar = () => { 
    const baseD = new Date(uiSelectedDate + 'T12:00:00');
    const startOffset = -3; 
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(baseD); d.setDate(d.getDate() + startOffset + i); return getLocalDateString(d); });
    return (
        <div className="mb-6 overflow-x-auto custom-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-3 min-w-max">
                {days.map(dateStr => {
                    const daily = reservationsCache.filter(r => { if (r.date !== dateStr) return false; const st = getTicketStatus(r); return st.type === 'confirmed' || st.type === 'validated'; });
                    const count = daily.reduce((acc, curr) => acc + calculateTotalGuests(curr), 0);
                    const isSelected = dateStr === uiSelectedDate;
                    const [year, month, day] = dateStr.split('-');
                    const dateObj = new Date(Number(year), Number(month)-1, Number(day));
                    const weekDay = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','');
                    return (
                        <button key={dateStr} onClick={() => { setUiSelectedDate(dateStr); setIsSelectionMode(false); setSelectedResIds([]); }} className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[80px] border transition-all relative ${isSelected ? 'bg-[#0097A8] text-white border-[#0097A8] shadow-md transform scale-105 z-10' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0097A8] hover:bg-cyan-50'}`}>
                            <span className={`text-xs uppercase font-bold ${isSelected ? 'opacity-90' : 'opacity-60'}`}>{weekDay}</span><span className="text-xl font-bold my-1">{day}/{month}</span><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count} pax</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 animate-fade-in pb-24 relative">
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
         <div><h1 className="text-2xl font-bold text-slate-900">Agenda Diária</h1><p className="text-slate-500 text-sm">Gerencie suas reservas e ocupação.</p></div>
         <div className="flex flex-wrap items-center gap-3">
             <button onClick={() => setIsScannerOpen(true)} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-slate-800 transition-all active:scale-95 text-sm"><QrCode size={18} className="text-[#0097A8]"/> <span className="hidden sm:inline">Validar Ingresso</span><span className="sm:hidden">Validar</span></button>
             <div className="flex gap-2">
                 {!isSearching && displayReservations.length > 0 && !isSelectionMode && (<button onClick={() => setIsSelectionMode(true)} className="text-sm font-bold text-[#0097A8] bg-cyan-50 px-4 py-2 rounded-lg hover:bg-cyan-100 transition-colors flex items-center gap-2"><RefreshCw size={16}/> Reagendar</button>)}
                 <button onClick={() => setShowFilters(!showFilters)} className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border ${showFilters ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}><Filter size={16}/> Filtros {showFilters ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
             </div>
         </div>
      </div>

      {showFilters && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 space-y-4 animate-slide-down">
              <form onSubmit={handleSearch} className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input type="text" placeholder="Buscar reserva (Nome, ID, Ticket)..." className="w-full pl-10 pr-10 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#0097A8] transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>{isSearching && (<button type="button" onClick={() => { setSearchTerm(''); setIsSearching(false); loadData(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1"><X size={18}/></button>)}</form>
              {!isSearching && (<div className="flex items-center justify-between pt-2 border-t border-slate-100"><button onClick={handlePrevDay} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={24}/></button><label className="flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200 relative"><CalendarIcon size={20} className="text-[#0097A8]"/><span className="text-lg font-bold text-slate-800 capitalize select-none">{new Date(uiSelectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span><input ref={dateInputRef} type="date" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" style={{ zIndex: 10 }} value={uiSelectedDate} onChange={(e) => { if(e.target.value) setUiSelectedDate(e.target.value); }} onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}/><p className="text-[10px] text-center text-slate-400 font-medium -mt-1 pointer-events-none">Toque para mudar</p></label><button onClick={handleNextDay} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={24}/></button></div>)}
              <div className="pt-2 border-t border-slate-100"><p className="text-xs font-bold text-slate-400 mb-2 uppercase">Filtrar por Status</p><div className="flex flex-wrap gap-2"><button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${statusFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>Todos</button><button onClick={() => setStatusFilter('confirmed')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${statusFilter === 'confirmed' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-600 border-green-200'}`}>Confirmados</button><button onClick={() => setStatusFilter('validated')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${statusFilter === 'validated' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>Validados</button><button onClick={() => setStatusFilter('pending')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${statusFilter === 'pending' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-600 border-amber-200'}`}>Pendentes</button><button onClick={() => setStatusFilter('cancelled')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${statusFilter === 'cancelled' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-600 border-red-200'}`}>Cancelados</button></div></div>
          </div>
      )}

      {!isSearching && renderHorizontalCalendar()}

      {isSelectionMode && (<div className="sticky top-4 z-20 bg-[#0097A8]/10 backdrop-blur-md p-3 rounded-xl border border-[#0097A8]/30 mb-4 animate-fade-in flex items-center justify-between shadow-lg"><div className="flex items-center gap-3"><div className="flex items-center gap-2"><CheckSquare size={20} className="text-[#0097A8]"/><span className="font-bold text-[#0097A8]">{selectedResIds.length} selecionados</span></div><button onClick={() => selectedResIds.length === displayReservations.length ? setSelectedResIds([]) : setSelectedResIds(displayReservations.map(r => r.id))} className="text-xs font-bold text-slate-500 underline hover:text-[#0097A8]">{selectedResIds.length === displayReservations.length ? 'Desmarcar' : 'Todos'}</button></div><div className="flex gap-2"><button onClick={() => setShowRescheduleModal(true)} disabled={selectedResIds.length === 0} className="px-4 py-2 bg-[#0097A8] text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50 hover:bg-[#008ba0] flex items-center gap-1">Mover <ArrowRight size={14}/></button><button onClick={() => { setIsSelectionMode(false); setSelectedResIds([]); }} className="px-3 py-2 bg-white text-slate-500 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50">X</button></div></div>)}

      {loading ? (<div className="text-center py-12"><div className="w-8 h-8 border-4 border-[#0097A8] border-t-transparent rounded-full animate-spin mx-auto"></div><p className="text-xs text-slate-400 mt-2">Carregando...</p></div>) : displayReservations.length === 0 ? (<div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200"><p className="text-slate-400 font-bold text-lg">Sem Reservas</p><p className="text-sm text-slate-400">Nenhum registro encontrado.</p>{isSearching && <p className="text-xs text-[#0097A8] font-bold mt-2 cursor-pointer" onClick={() => {setSearchTerm(''); setIsSearching(false); loadData();}}>Limpar busca</p>}</div>) : (
          <div className="space-y-3">
              {displayReservations.map(res => {
                  const isSelected = selectedResIds.includes(res.id);
                  const ticketStatus = getTicketStatus(res);
                  return (
                      <div key={res.id} className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4 transition-all ${isSelectionMode ? 'cursor-pointer hover:border-[#0097A8]' : 'cursor-pointer hover:shadow-md'} ${isSelected ? 'border-[#0097A8] bg-[#0097A8]/5' : 'border-slate-100'}`} onClick={() => { if (isSelectionMode) { setSelectedResIds(prev => prev.includes(res.id) ? prev.filter(id => id !== res.id) : [...prev, res.id]); } else { setSelectedReservation(res); } }}>
                          {isSelectionMode && <div className={`text-slate-300 ${isSelected ? 'text-[#0097A8]' : ''}`}>{isSelected ? <CheckSquare size={24}/> : <Square size={24}/>}</div>}
                          <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1"><h3 className="font-bold text-slate-900 truncate pr-2 text-lg">{res.guestName || 'Cliente sem nome'}</h3><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${ticketStatus.color}`}>{ticketStatus.label}</span></div>
                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 mt-2">
                                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg"><Users size={14} className="text-slate-400"/> <strong>{calculateTotalGuests(res)}</strong> pessoas</span>
                                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg font-mono"><FileText size={14} className="text-slate-400"/> #{res.ticketCode || res.id.slice(0,6)}</span>
                                  {(isSearching || statusFilter !== 'all') && <span className="flex items-center gap-1 bg-[#0097A8]/10 text-[#0097A8] px-2 py-1 rounded-lg font-bold"><CalendarIcon size={14}/> {formatDateDisplay(res.date)}</span>}
                              </div>
                          </div>
                          {!isSelectionMode && <div className="text-slate-300"><ChevronRight size={20}/></div>}
                      </div>
                  );
              })}
          </div>
      )}

      {/* DRAWER LATERAL */}
      {selectedReservation && createPortal(
          <>
            <div className="fixed inset-0 bg-black/50 z-[100] animate-fade-in" onClick={() => setSelectedReservation(null)}/>
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] overflow-y-auto animate-slide-in-right">
                <div className="sticky top-0 bg-white z-10 border-b border-slate-100 p-6 flex justify-between items-start shadow-sm">
                    <div><h2 className="text-xl font-bold text-slate-800">Detalhes da Reserva</h2>{(() => { const st = getTicketStatus(selectedReservation); return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded mt-2 inline-block ${st.color}`}>{st.label}</span>; })()}</div>
                    <button onClick={() => setSelectedReservation(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={24}/></button>
                </div>
                <div className="p-6 space-y-8">
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><CalendarIcon size={16}/> Dados da Reserva</h3>
                        <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                                <div><span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Código de Validação</span><span className="text-lg font-mono font-bold text-slate-800 tracking-wider">{selectedReservation.ticketCode || selectedReservation.id.slice(0,8).toUpperCase()}</span></div>
                                {getTicketStatus(selectedReservation).type === 'confirmed' && selectedReservation.status !== 'validated' && (<button onClick={() => setShowValidationConfirm(true)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm transition-colors"><QrCode size={14}/> Validar</button>)}
                                {selectedReservation.status === 'validated' && (<span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> Validado</span>)}
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-sm text-slate-500">Data Selecionada</span><span className="text-sm font-bold text-[#0097A8]">{formatDateDisplay(selectedReservation.date)}</span></div>
                            <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-sm text-slate-500">Valor Pago</span><span className="text-sm font-bold text-slate-700">{formatBRL(getReservationTotal(selectedReservation))}</span></div>
                            <div className="flex justify-between items-center pt-1"><span className="text-sm text-slate-500">Voucher Oficial</span><button onClick={() => setShowVoucherModal(true)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">Ver Completo <ExternalLink size={12}/></button></div>
                            <div className="pt-2"><span className="text-sm text-slate-500 block mb-2">Itens Inclusos:</span><div className="flex flex-wrap gap-2">{(selectedReservation.cartItems || selectedReservation.items)?.map((item, i) => (<span key={i} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-600 font-medium">{item.quantity || item.amount || 1}x {item.title || 'Ingresso'}</span>))}<span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold">Total: {calculateTotalGuests(selectedReservation)} pessoas</span></div></div>
                        </div>
                    </section>
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User size={16}/> Dados do Cliente</h3>
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm"><div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={24}/></div><div><p className="font-bold text-slate-900">{selectedReservation.guestName || 'Não informado'}</p><p className="text-xs text-slate-500">ID: {selectedReservation.userId || '-'}</p></div></div><div className="space-y-3 text-sm"><div className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-400"/> {selectedReservation.guestPhone || '-'}</div><div className="flex items-center gap-2 text-slate-600"><Mail size={14} className="text-slate-400"/> {selectedReservation.guestEmail || '-'}</div><div className="flex items-center gap-2 text-slate-600"><MapPin size={14} className="text-slate-400"/> {selectedReservation.guestAddress || 'Endereço não informado'}</div></div></div>
                    </section>
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><CreditCard size={16}/> Pagamento</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Data Compra</span><span className="text-slate-700 font-medium">{formatDateTime(selectedReservation.createdAt)}</span></div><div className="flex justify-between items-start"><div className="flex items-center gap-2"><span className="text-slate-500 pt-1">Status de pagamento</span><button onClick={handleSyncPayment} disabled={syncing} title="Atualizar Status" className="text-[#0097A8] hover:bg-blue-50 p-1 rounded-full transition-colors animate-fade-in">{syncing ? <RefreshCw size={14} className="animate-spin"/> : <RefreshCw size={14}/>}</button></div>
                        {(() => { const info = getMPStatusInfo(selectedReservation.paymentStatus || selectedReservation.status, selectedReservation.statusDetail,selectedReservation); return (<div className="flex flex-col items-end"><span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 ${info.color}`}>{info.icon} {info.label}</span>{info.desc && <span className="text-[10px] text-slate-500 mt-1 max-w-[150px] text-right leading-tight">{info.desc}</span>}</div>); })()}</div><div className="flex justify-between"><span className="text-slate-500">ID Transação</span><span className="font-mono text-xs text-slate-400 truncate w-32 text-right" title={selectedReservation.paymentId}>{selectedReservation.paymentId || selectedReservation.id}</span></div><div className="flex justify-between"><span className="text-slate-500">Método</span><span className="font-bold text-slate-700">{translatePaymentMethod(selectedReservation.paymentMethod)}</span></div></div>
                    </section>
                    
                    {/* LOGS DE ACESSO ATUALIZADO */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Activity size={16}/> Histórico & Logs
                        </h3>
                        
                        <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:h-[95%] before:w-0.5 before:bg-slate-100 pb-2">
                            
                            {/* Log de Criação (Fixo) */}
                            <div className="relative pl-8">
                                <div className="absolute left-0 top-1 w-4 h-4 bg-slate-100 rounded-full border-2 border-white flex items-center justify-center z-10">
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                </div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700">Reserva Criada</p>
                                        <p className="text-[10px] text-slate-500">Checkout finalizado</p>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{formatDateTime(selectedReservation.createdAt)}</span>
                                </div>
                            </div>

                            {/* Renderiza Status Atuais Importantes (Confirmado/Cancelado) */}
                            {getTicketStatus(selectedReservation).type === 'confirmed' && (
                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1 w-4 h-4 bg-green-100 rounded-full border-2 border-white flex items-center justify-center z-10"><DollarSign size={10} className="text-green-600"/></div>
                                    <div className="flex justify-between items-start">
                                        <div><p className="text-xs font-bold text-green-700">Pagamento Confirmado</p></div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Renderiza o Array History (Logs de E-mail, Reagendamento e Notas) */}
                            {selectedReservation.history && Array.isArray(selectedReservation.history) && selectedReservation.history.map((logItem, idx) => (
                                <div key={idx} className="relative pl-8 animate-fade-in">
                                    <div className="absolute left-0 top-1 w-4 h-4 bg-blue-50 rounded-full border-2 border-white flex items-center justify-center z-10">
                                        {/* Ícone dinâmico baseado no texto do log */}
                                        {logItem.includes('📧') ? <Mail size={10} className="text-blue-500"/> : 
                                        logItem.includes('Reagendado') ? <RefreshCw size={10} className="text-amber-500"/> :
                                        logItem.includes('Cancelado') ? <Ban size={10} className="text-red-500"/> :
                                        <FileText size={10} className="text-slate-400"/>}
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs text-slate-600 leading-tight">{logItem}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Logs Especiais de Vínculo e Check-in */}
                            {selectedReservation.linkedToReservationId && (
                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1 w-4 h-4 bg-blue-100 rounded-full border-2 border-white flex items-center justify-center z-10"><LinkIcon size={10} className="text-blue-600"/></div>
                                    <div>
                                        <p className="text-xs font-bold text-blue-700">Vínculo Detectado</p>
                                        <p className="text-[10px] text-blue-500">Responsável: #{selectedReservation.linkedToReservationId.slice(0,6).toUpperCase()}</p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Nota de Validação (Ex: Responsável presente) */}
                            {selectedReservation.checkInNote && (
                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1 w-4 h-4 bg-amber-100 rounded-full border-2 border-white flex items-center justify-center z-10"><Users size={10} className="text-amber-600"/></div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-700">Observação de Entrada</p>
                                        <p className="text-[10px] text-slate-500 italic bg-amber-50 p-1.5 rounded mt-1 border border-amber-100">{selectedReservation.checkInNote}</p>
                                    </div>
                                </div>
                            )}

                            {/* Log de Validação Final */}
                            {selectedReservation.checkedInAt && (
                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1 w-4 h-4 bg-purple-100 rounded-full border-2 border-white flex items-center justify-center z-10"><CheckCircle size={10} className="text-purple-600"/></div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-purple-700">Acesso Validado</p>
                                            <p className="text-[10px] text-slate-500">{selectedReservation.validationMethod === 'manual_panel' ? 'Via Painel' : 'Via QR Code'}</p>
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{formatDateTime(selectedReservation.checkedInAt)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                        <div className="pt-4 border-t border-slate-100 pb-20">
                        {selectedReservation.status !== 'cancelled' ? (
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    onClick={() => openRescheduleFromPanel(selectedReservation)} 
                                    disabled={selectedReservation.status === 'validated' || selectedReservation.checkedInAt}
                                    className={`flex items-center justify-center gap-2 ${selectedReservation.status === 'validated' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#0097A8] hover:bg-[#008ba0]'}`}
                                >
                                    <RefreshCw size={16}/> Remarcar
                                </Button>
                                
                                <button 
                                    onClick={() => handleCancelReservation(selectedReservation.id)} 
                                    disabled={selectedReservation.status === 'validated' || selectedReservation.checkedInAt}
                                    className={`border rounded-xl font-bold text-sm py-3 flex items-center justify-center gap-2 transition-colors ${selectedReservation.status === 'validated' ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed' : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'}`}
                                >
                                    <Ban size={16}/> Cancelar
                                </button>
                            </div>
                        ) : (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-center text-sm font-bold">
                                Ingresso Cancelado
                            </div>
                        )}
                        
                        {/* Aviso explicativo se estiver validado */}
                        {(selectedReservation.status === 'validated' || selectedReservation.checkedInAt) && (
                            <p className="text-[10px] text-center text-slate-400 mt-2">
                                * Ingressos já validados não podem ser alterados.
                            </p>
                        )}
                        </div>                </div>
                            </div>
                        </>, document.body
                        )}

      {/* --- MODAIS DE SUPORTE --- */}
      {showRescheduleModal && createPortal(<div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"><h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Reagendar Ingressos</h3><div className="mb-6"><input type="date" className="w-full border p-4 rounded-xl outline-none focus:border-[#0097A8] bg-slate-50 text-lg font-bold text-slate-700" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /></div><div className="flex gap-3"><button onClick={() => setShowRescheduleModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancelar</button><Button onClick={handleBulkReschedule} disabled={loading} className="flex-1 py-3 text-base">{loading ? '...' : 'Confirmar'}</Button></div></div></div>, document.body)}
      {showValidationConfirm && createPortal(<div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center border border-white/20"><div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><QrCode size={32}/></div><h3 className="text-xl font-bold text-slate-900 mb-2">Validar Ingresso?</h3><p className="text-sm text-slate-500 mb-6">Você confirma a entrada do cliente?</p><div className="flex gap-3"><button onClick={() => setShowValidationConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">Cancelar</button><Button onClick={handleValidateTicket} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">{loading ? '...' : 'Confirmar Entrada'}</Button></div></div></div>, document.body)}
      {showVoucherModal && selectedReservation && (<VoucherModal isOpen={showVoucherModal} trip={selectedReservation} onClose={() => setShowVoucherModal(false)} />)}
      {feedback && createPortal(<div style={{zIndex: 20000, position: 'relative'}}><FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback?.type} title={feedback?.title} msg={feedback?.msg} /></div>, document.body)}
      
      {/* SCANNER MODAL */}
      <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScanTicket} loading={scanLoading} />

      {/* --- MODAL DE CONFERÊNCIA PÓS-SCAN --- */}
      {scannedRes && (
           <TicketValidationModal 
               reservation={scannedRes}
               onClose={() => setScannedRes(null)}
               onValidationSuccess={handleValidationSuccess}
           />
       )}

    </div>
  );
};

export default PartnerCalendar;