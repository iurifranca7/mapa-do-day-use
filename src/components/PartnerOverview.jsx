import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs, doc, Timestamp, getDoc } from 'firebase/firestore'; // updateDoc removido pois o hook faz isso
import { db } from '../firebase';
import { 
  Users, DollarSign, TrendingUp, ArrowRight, QrCode, 
  ChevronDown, Eye, EyeOff, Calendar, RefreshCw,
  ScanLine, X, AlertCircle, MessageCircle, Info,
  Link as LinkIcon, Package, CheckCircle // Novos ícones necessários para o modal rico
} from 'lucide-react';
import { formatBRL } from '../utils/format';
import Chart from 'react-apexcharts';
import QrScannerModal from './QrScannerModal';
import ModalOverlay from './ModalOverlay';
import Button from './Button';
import { useTicketValidation } from '../hooks/useTicketValidation'; // <--- SEU HOOK

const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const PartnerOverview = ({ user, setActiveTab }) => {
  const [isRefreshing, setIsRefreshing] = useState(true);
  
  // Filtros Financeiros
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showBalance, setShowBalance] = useState(false);

  // Dados
  const [stats, setStats] = useState({
    revenueMonth: 0, salesCountMonth: 0, checkinsToday: 0, pendingCheckinsToday: 0, ticketAverage: 0
  });

  const [chartData, setChartData] = useState({
    series: [{ name: "Vendas", data: [] }],
    options: {
      chart: { type: 'area', height: 350, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3, colors: ['#0097A8'] },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] }, colors: ['#0097A8'] },
      xaxis: { type: 'category', categories: [], axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: '#94a3b8', fontSize: '10px' } } },
      yaxis: { labels: { formatter: (value) => value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0}), style: { colors: '#94a3b8' } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      colors: ['#0097A8'],
      tooltip: { y: { formatter: (val) => formatBRL(val) } }
    }
  });

  // --- ESTADOS DO SCANNER E HOOK ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [parentVerified, setParentVerified] = useState(false); // Checkbox local

  // INTEGRANDO O HOOK DE VALIDAÇÃO (Substitui a lógica manual)
  const { 
      scannedRes, parentRes, loading: scanLoading, 
      scanTicket, confirmValidation, resetScan 
  } = useTicketValidation(user);

  const handleScanWrapper = (code) => {
      scanTicket(code);
      setIsScannerOpen(false); 
      setParentVerified(false);
  };

  const handleConfirmWrapper = async () => {
      const success = await confirmValidation(parentVerified);
      if (success) {
          // Atualiza KPI localmente após sucesso (Cosmético, para não precisar recarregar tudo)
          setStats(prev => ({
              ...prev,
              checkinsToday: prev.checkinsToday + (Number(scannedRes.totalGuests) || 1),
              pendingCheckinsToday: Math.max(0, prev.pendingCheckinsToday - (Number(scannedRes.totalGuests) || 1))
          }));
      }
  };

  // Helpers Visuais
  const translateStatusDisplay = (status) => {
      const s = (status || '').toLowerCase();
      if (['approved', 'confirmed', 'paid'].includes(s)) return 'Pago/Confirmado';
      if (['validated'].includes(s)) return 'Já Utilizado';
      if (['pending', 'waiting_payment'].includes(s)) return 'Aguardando Pagamento';
      if (['cancelled', 'rejected'].includes(s)) return 'Cancelado';
      return status;
  };

  const maskedValue = (value, type = 'currency') => {
      if (!showBalance) return '••••••';
      if (type === 'currency') return formatBRL(value);
      return value;
  };

  // --- BUSCA DE DADOS (MANTIDA INTACTA) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsRefreshing(true);
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const startOfMonth = new Date(filterYear, filterMonth, 1);
      const endOfMonth = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59);

      try {
        const qFinancial = query(collection(db, "reservations"), where("ownerId", "==", user.uid), where("createdAt", ">=", Timestamp.fromDate(startOfMonth)), where("createdAt", "<=", Timestamp.fromDate(endOfMonth)));
        const qOperational = query(collection(db, "reservations"), where("ownerId", "==", user.uid), where("date", "==", todayStr));

        const [snapFinancial, snapOperational] = await Promise.all([getDocs(qFinancial), getDocs(qOperational)]);

        let revMonth = 0, countMonth = 0;
        const lastDay = endOfMonth.getDate();
        const salesByDay = Array(lastDay).fill(0);

        snapFinancial.forEach(doc => {
            const d = doc.data();
            if (['approved', 'confirmed', 'paid', 'validated'].includes((d.paymentStatus || d.status).toLowerCase())) {
                const val = Number(d.total || d.totalPrice || 0);
                revMonth += val;
                countMonth++;
                if (d.createdAt) {
                    const dayIndex = d.createdAt.toDate().getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < lastDay) salesByDay[dayIndex] += val;
                }
            }
        });

        let checkinsT = 0, pendingT = 0;
        snapOperational.forEach(doc => {
            const d = doc.data();
            if (['approved', 'confirmed', 'paid', 'validated'].includes((d.paymentStatus || d.status).toLowerCase())) {
                const guests = Number(d.totalGuests) || 1;
                (d.checkedInAt || d.status === 'validated') ? checkinsT += guests : pendingT += guests;
            }
        });

        setStats({ revenueMonth: revMonth, salesCountMonth: countMonth, ticketAverage: countMonth > 0 ? revMonth / countMonth : 0, checkinsToday: checkinsT, pendingCheckinsToday: pendingT });
        setChartData(prev => ({ ...prev, series: [{ name: "Vendas", data: salesByDay }], options: { ...prev.options, xaxis: { ...prev.options.xaxis, categories: Array.from({length: lastDay}, (_, i) => `${i + 1}/${filterMonth + 1}`) } } }));

      } catch (err) { console.error("Erro dashboard:", err); } finally { setIsRefreshing(false); }
    };
    fetchData();
  }, [user, filterMonth, filterYear]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* BOTÃO DE SCANNER (SÓ APARECE NO DESKTOP AGORA) */}
      <div className="hidden md:flex justify-end mb-[-40px] relative z-10">
          <button onClick={() => setIsScannerOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-transform active:scale-95 text-sm">
              <QrCode size={18} className="text-[#0097A8]"/> Validar Ingresso
          </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 pt-10 md:pt-0">
          {/* CARDS FINANCEIRO E VISITANTES (IGUAIS AO ANTERIOR) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2 rounded-lg text-slate-600 font-bold text-sm flex items-center gap-2 cursor-pointer hover:bg-slate-200 transition-colors group relative">
                          <Calendar size={14} className="text-[#0097A8]"/> {months[filterMonth]} {isRefreshing && <RefreshCw size={10} className="animate-spin text-slate-400"/>} <ChevronDown size={14}/>
                          <select className="absolute inset-0 opacity-0 cursor-pointer" value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}>{months.map((m,i) => <option key={i} value={i}>{m}</option>)}</select>
                      </div>
                  </div>
                  <button onClick={() => setShowBalance(!showBalance)} className="text-slate-400 hover:text-slate-600 transition-colors">{showBalance ? <Eye size={20}/> : <EyeOff size={20}/>}</button>
              </div>
              <div className="mb-6"><p className="text-sm text-slate-500 font-medium mb-1">Vendas Totais em {months[filterMonth]}</p><div className="flex items-center gap-2"><h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">{maskedValue(stats.revenueMonth, 'currency')}</h2></div></div>
              <div className="flex items-center gap-4"><button onClick={() => setActiveTab('sales')} className="text-sm font-bold text-[#0097A8] hover:bg-cyan-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 border border-transparent hover:border-cyan-100">Ver detalhamento financeiro <ArrowRight size={14}/></button></div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              <div><h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-wider"><Users className="text-blue-500" size={18}/> Visitantes Hoje</h3><div className="mb-2"><p className="text-3xl md:text-4xl font-extrabold text-slate-900">{maskedValue(stats.checkinsToday, 'number')} <span className="text-lg text-slate-300 font-medium">/ {maskedValue(stats.checkinsToday + stats.pendingCheckinsToday, 'number')}</span></p><p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-wider">Check-ins Realizados</p></div></div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center"><p className="text-xs text-slate-400">
                      Total esperado hoje: <strong className="text-slate-600">{maskedValue(stats.checkinsToday + stats.pendingCheckinsToday, 'number')}</strong>
                  </p><button onClick={() => setActiveTab('calendar')} className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors">Ver Agenda</button></div>
          </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2"><div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={18}/></div><span className="text-xs font-bold text-slate-400 uppercase">Ticket Médio</span></div>
              <h3 className="text-2xl font-black text-slate-800">{maskedValue(stats.ticketAverage, 'currency')}</h3>
              <p className="text-xs text-slate-400 mt-1">por venda em {months[filterMonth]}</p>
          </div>
          <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><TrendingUp size={16} className="text-[#0097A8]"/> Evolução Diária de Vendas</h3></div>
              <div className="w-full h-[250px]">{showBalance ? (<Chart options={chartData.options} series={chartData.series} type="area" height={230} />) : (<div className="h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-xl"><EyeOff size={48} className="mb-2 opacity-50"/><p className="text-sm font-bold">Gráfico Oculto</p></div>)}</div>
          </div>
          
          {/* AJUDA */}
          <div className="bg-slate-900 rounded-3xl p-8 text-center text-white mt-12 mb-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-2">Precisa de ajuda?</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">Fale diretamente com nosso suporte técnico exclusivo para parceiros.</p>
            <div className="flex justify-center gap-4">
                <a href="https://wa.me/5531920058081" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#20bd5a] transition-all transform hover:scale-105 shadow-lg"><MessageCircle size={22} /> WhatsApp</a>
                <a href="https://mapadodayuse.notion.site/Central-de-Ajuda-Mapa-do-Day-Use-2dc9dd27aaf88071b399cdb623b66b77" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-slate-800 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all shadow-lg"><Info size={22} /> Central de Ajuda</a>
            </div>
        </div>
      </div>

      {/* --- MODAIS DE VALIDAÇÃO (USANDO O HOOK) --- */}
      <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScanWrapper} loading={scanLoading} />

      {scannedRes && createPortal(
            <ModalOverlay onClose={resetScan}>
                <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md animate-fade-in relative mx-4">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                            <ScanLine className="text-[#0097A8]"/> Conferir Ingresso
                        </h3>
                        <button onClick={resetScan}><X size={20}/></button>
                    </div>

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">{scannedRes.guestName}</h2>
                        <p className="text-sm text-slate-500 font-mono mt-1">#{scannedRes.ticketCode || scannedRes.id.slice(0,6).toUpperCase()}</p>
                    </div>

                    {scannedRes.date !== new Date().toISOString().split('T')[0] && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl text-left shadow-sm">
                            <div className="flex items-center gap-2 text-red-800 font-bold mb-1"><AlertCircle size={20}/> <span>ATENÇÃO: DATA ERRADA!</span></div>
                            <p className="text-sm text-red-700">Este ingresso é válido para <strong>{scannedRes.date ? scannedRes.date.split('-').reverse().join('/') : 'Data indefinida'}</strong>.<br/>Hoje é {new Date().toLocaleDateString('pt-BR')}.</p>
                        </div>
                    )}

                    {/* DETALHAMENTO DE ITENS */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Package size={12}/> Itens do Ingresso</p>
                        <div className="space-y-2">
                            {(scannedRes.cartItems || scannedRes.items)?.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                                    <div className="leading-tight">
                                        <span className="font-bold text-slate-700">{item.quantity || item.amount}x {item.title}</span>
                                        {item.description && <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{item.description}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">Status Atual:</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${['approved','confirmed','paid'].includes(scannedRes.status || scannedRes.paymentStatus) ? 'bg-green-100 text-green-700' : scannedRes.status === 'validated' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                {translateStatusDisplay(scannedRes.status === 'validated' ? 'validated' : (scannedRes.status || scannedRes.paymentStatus))}
                            </span>
                        </div>
                    </div>

                    {/* AVISO DE INGRESSO VINCULADO (COM LÓGICA DO HOOK) */}
                    {scannedRes.linkedToReservationId && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 text-left">
                            <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                                <LinkIcon size={18}/> Verificação de Responsável
                            </div>
                            <p className="text-xs text-amber-700 mb-3">
                                Este é um ingresso <strong>dependente</strong>. A entrada só é permitida na presença do titular.
                            </p>
                            {parentRes ? (
                                <div className="bg-white p-3 rounded-lg border border-amber-100 mb-3">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Responsável</p>
                                    <p className="font-bold text-slate-800">{parentRes.guestName}</p>
                                    <p className="text-xs text-slate-500 font-mono">#{parentRes.ticketCode || parentRes.id.slice(0,6).toUpperCase()}</p>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic mb-3">Buscando dados do responsável...</div>
                            )}
                            <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-amber-100/50 rounded-lg transition-colors">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-colors ${parentVerified ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-amber-300'}`}>
                                    {parentVerified && <CheckCircle size={14}/>}
                                </div>
                                <input type="checkbox" className="hidden" checked={parentVerified} onChange={(e) => setParentVerified(e.target.checked)} />
                                <span className="text-xs font-bold text-slate-700 leading-tight select-none">
                                    Confirmo que o responsável acima está presente no local.
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={resetScan} className="flex-1 justify-center">Cancelar</Button>
                        {['approved', 'confirmed', 'paid'].includes(scannedRes.status || scannedRes.paymentStatus) && scannedRes.status !== 'validated' ? (
                            <Button 
                                onClick={handleConfirmWrapper} 
                                disabled={scannedRes.linkedToReservationId && !parentVerified}
                                className={`flex-1 justify-center shadow-lg ${scannedRes.linkedToReservationId && !parentVerified ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'}`}
                            >
                                Confirmar Entrada
                            </Button>
                        ) : (
                             <Button disabled className="flex-1 justify-center opacity-50 cursor-not-allowed bg-slate-200 text-slate-500 border-none">
                                {scannedRes.status === 'validated' ? 'Já Validado' : 'Inválido'}
                             </Button>
                        )}
                    </div>
                </div>
            </ModalOverlay>, 
            document.body
      )}

    </div>
  );
};

export default PartnerOverview;