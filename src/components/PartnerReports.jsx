import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  FileText, Users, Tag, Calendar, Download, CheckCircle, AlertCircle 
} from 'lucide-react';
import Button from './Button';
import ModalOverlay from './ModalOverlay';

const PartnerReports = ({ user }) => {
  const [reportType, setReportType] = useState('sales'); // sales, customers, coupons
  const [dateRange, setDateRange] = useState('this_month');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Custom Date States
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // --- 1. LÓGICA DE DATAS (Reutilizável) ---
  const getDateRangeDates = (range) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch(range) {
          case 'today': return { start: today, end: new Date(today.getTime() + 86400000) };
          case 'yesterday': 
              const yest = new Date(today); yest.setDate(yest.getDate() - 1);
              const yestEnd = new Date(today);
              return { start: yest, end: yestEnd };
          case 'this_month':
              return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
          case 'last_month':
              return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
          case 'last_90':
              const d90 = new Date(today); d90.setDate(d90.getDate() - 90);
              return { start: d90, end: now };
          case 'last_12_months':
              const d365 = new Date(today); d365.setFullYear(d365.getFullYear() - 1);
              return { start: d365, end: now };
          case 'custom':
              if (!customStart || !customEnd) return null;
              return { start: new Date(customStart), end: new Date(new Date(customEnd).getTime() + 86400000) };
          default: return null; // 'all'
      }
  };

  // --- 2. MOTOR DE DADOS (Extração) ---
  // --- 2. MOTOR DE DADOS (Extração CORRIGIDA) ---
  const fetchReportData = async () => {
      if (!user) return [];
      
      // 🔥 Define o ID correto (Chefe ou Próprio)
      const targetId = user.effectiveOwnerId || user.uid;
      console.log("📊 [REPORTS] Gerando relatório para:", targetId);

      try {
          const q = query(
              collection(db, "reservations"), 
              where("ownerId", "==", targetId) // <--- CORREÇÃO AQUI
          );
          
          const snapshot = await getDocs(q);
          const dates = getDateRangeDates(dateRange);
          let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Filtro de Data
          if (dates && dateRange !== 'all') {
              data = data.filter(item => {
                  const d = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                  return d >= dates.start && d <= dates.end;
              });
          }
          
          // Ordenação Padrão
          data.sort((a, b) => {
              const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
              const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
              return dateB - dateA;
          });

          return data;
      } catch (error) {
          console.error("Erro ao buscar dados do relatório:", error);
          setFeedback({ type: 'error', msg: 'Erro de permissão ou conexão.' });
          return [];
      }
  };

  // --- 3. PROCESSADORES DE RELATÓRIO (Lógica Específica) ---

  // A. Relatório de VENDAS (Financeiro Detalhado)
  const processSalesReport = (data) => {
      const header = [
          "ID Reserva", "Data Venda", "Data Visita", "Status Pagamento", 
          "Status Reserva", "Cliente Nome", "Cliente Email", 
          "Produto", "Qtd Pessoas", 
          "Valor Bruto", "Desconto Cupom", "Taxa Plataforma", "Valor Líquido",
          "Método Pagamento", "Parcelas", "ID Transação MP", "Data Liberação MP", "Origem"
      ];

      const rows = data.map(item => {
          // Cálculos Financeiros
          const paidAmount = Number(item.total || item.totalPrice || 0);
          const discount = Number(item.discount || 0);
          const gross = paidAmount + discount;
          
          // Taxas (Usa real se tiver sync, senão estima 12% se for mapa)
          const source = item.sourceUrl || 'mapadodayuse.com';
          const isReconciled = !!item.isFinanciallyReconciled;
          const fee = isReconciled ? (item.mercadoPagoFee || 0) : (source.includes('mapa') ? gross * 0.12 : 0);
          const net = isReconciled ? (item.mercadoPagoNetReceived || 0) : (gross - fee - discount);

          // Data
          const dateSale = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : '-';
          
          return [
              item.ticketCode || item.id,
              dateSale,
              item.date || '-',
              item.paymentStatus || item.status,
              item.status, // Status da reserva (validado/cancelado)
              item.guestName,
              item.guestEmail,
              item.items?.map(i => i.title).join(' + ') || 'Day Use',
              item.totalGuests || 1,
              gross.toFixed(2).replace('.', ','),
              discount.toFixed(2).replace('.', ','),
              fee.toFixed(2).replace('.', ','),
              net.toFixed(2).replace('.', ','),
              item.paymentMethod || '-',
              item.installments || '1',
              item.paymentId || '-',
              item.mercadoPagoReleaseDate ? new Date(item.mercadoPagoReleaseDate).toLocaleDateString() : 'A Liberar',
              source
          ];
      });

      return { header, rows, filename: `relatorio_vendas_${dateRange}` };
  };

  // B. Relatório de CLIENTES (CRM / Marketing)
  const processCustomersReport = (data) => {
      // Agrupar por Email para consolidar dados do cliente
      const customers = {};

      data.forEach(item => {
          const email = item.guestEmail || 'sem_email';
          if (!customers[email]) {
              customers[email] = {
                  name: item.guestName,
                  email: item.guestEmail,
                  phone: item.guestPhone || '-',
                  cpf: item.guestDoc || '-',
                  city: item.guestAddress || '-', // Supondo que venha no address
                  totalSpent: 0,
                  visitCount: 0,
                  lastVisit: null,
                  status: 'Ativo'
              };
          }
          
          // Só soma se pago
          if (['approved', 'confirmed', 'paid'].includes((item.paymentStatus || '').toLowerCase())) {
              customers[email].totalSpent += Number(item.total || item.totalPrice || 0);
              customers[email].visitCount += 1;
              
              const visitDate = item.date; // YYYY-MM-DD
              if (visitDate > (customers[email].lastVisit || '')) {
                  customers[email].lastVisit = visitDate;
              }
          }
      });

      const header = ["Nome", "Email", "Telefone", "CPF", "Cidade", "Total Gasto (LTV)", "Qtd Visitas", "Última Visita", "Ticket Médio"];
      
      const rows = Object.values(customers).map(c => {
          if (c.email === 'sem_email') return null; // Pula dados sujos
          const avgTicket = c.visitCount > 0 ? c.totalSpent / c.visitCount : 0;
          
          return [
              c.name, c.email, c.phone, c.cpf, c.city,
              c.totalSpent.toFixed(2).replace('.', ','),
              c.visitCount,
              c.lastVisit ? c.lastVisit.split('-').reverse().join('/') : '-',
              avgTicket.toFixed(2).replace('.', ',')
          ];
      }).filter(Boolean);

      return { header, rows, filename: `relatorio_clientes_crm_${dateRange}` };
  };

  // C. Relatório de CUPONS (Performance de Marketing)
  const processCouponsReport = (data) => {
      const coupons = {};

      data.forEach(item => {
          const code = item.couponCode; // Ajustado conforme sua estrutura
          if (code) {
              if (!coupons[code]) {
                  coupons[code] = { 
                      code: code, 
                      usedCount: 0, 
                      totalDiscountGiven: 0, 
                      totalSalesGenerated: 0 
                  };
              }
              
              // Considera apenas vendas válidas para estatística de conversão real
              if (['approved', 'confirmed', 'paid'].includes((item.paymentStatus || '').toLowerCase())) {
                  coupons[code].usedCount++;
                  coupons[code].totalDiscountGiven += Number(item.discount || 0);
                  coupons[code].totalSalesGenerated += Number(item.total || 0); // Valor pago com o cupom
              }
          }
      });

      const header = ["Código do Cupom", "Qtd Usos (Pagos)", "Total Descontos Concedidos", "Receita Gerada (Com Cupom)", "ROI Aproximado"];
      
      const rows = Object.values(coupons).map(c => [
          c.code,
          c.usedCount,
          c.totalDiscountGiven.toFixed(2).replace('.', ','),
          c.totalSalesGenerated.toFixed(2).replace('.', ','),
          c.totalDiscountGiven > 0 ? (c.totalSalesGenerated / c.totalDiscountGiven).toFixed(1) + 'x' : '-'
      ]);

      return { header, rows, filename: `relatorio_cupons_${dateRange}` };
  };

  // --- 4. GERAÇÃO DE CSV ---
  const handleGenerateReport = async () => {
      setLoading(true);
      try {
          const rawData = await fetchReportData();
          
          if (rawData.length === 0) {
              setFeedback({ type: 'error', msg: 'Nenhum dado encontrado para o período selecionado.' });
              setLoading(false);
              return;
          }

          let reportResult;
          if (reportType === 'sales') reportResult = processSalesReport(rawData);
          if (reportType === 'customers') reportResult = processCustomersReport(rawData);
          if (reportType === 'coupons') reportResult = processCouponsReport(rawData);

          if (!reportResult || reportResult.rows.length === 0) {
              setFeedback({ type: 'warning', msg: 'Dados insuficientes para gerar este tipo de relatório.' });
              setLoading(false);
              return;
          }

          // Criar CSV
          const csvContent = [
              reportResult.header.join(";"),
              ...reportResult.rows.map(r => r.map(cell => `"${cell}"`).join(";")) // Aspas evitam quebras com ; no texto
          ].join("\n");

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${reportResult.filename}.csv`;
          link.click();

          setFeedback({ type: 'success', msg: 'Relatório gerado e baixado com sucesso!' });

      } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', msg: 'Erro ao processar relatório.' });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in pb-20">
      
      <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Central de Relatórios</h1>
          <p className="text-slate-500">Extraia dados completos para análise externa.</p>
      </div>

      {/* 1. SELEÇÃO DE TIPO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button 
            onClick={() => setReportType('sales')}
            className={`p-6 rounded-2xl border-2 text-left transition-all group ${reportType === 'sales' ? 'border-[#0097A8] bg-[#0097A8]/5 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
          >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${reportType === 'sales' ? 'bg-[#0097A8] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  <FileText size={24}/>
              </div>
              <h3 className={`font-bold text-lg mb-1 ${reportType === 'sales' ? 'text-[#0097A8]' : 'text-slate-700'}`}>Vendas Detalhadas</h3>
              <p className="text-xs text-slate-500">Dados transacionais completos, status, taxas, líquido e datas de repasse.</p>
          </button>

          <button 
            onClick={() => setReportType('customers')}
            className={`p-6 rounded-2xl border-2 text-left transition-all group ${reportType === 'customers' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
          >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${reportType === 'customers' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  <Users size={24}/>
              </div>
              <h3 className={`font-bold text-lg mb-1 ${reportType === 'customers' ? 'text-blue-600' : 'text-slate-700'}`}>Base de Clientes</h3>
              <p className="text-xs text-slate-500">Lista consolidada de clientes, LTV (valor total gasto), contatos e frequência.</p>
          </button>

          <button 
            onClick={() => setReportType('coupons')}
            className={`p-6 rounded-2xl border-2 text-left transition-all group ${reportType === 'coupons' ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
          >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${reportType === 'coupons' ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  <Tag size={24}/>
              </div>
              <h3 className={`font-bold text-lg mb-1 ${reportType === 'coupons' ? 'text-purple-600' : 'text-slate-700'}`}>Desempenho de Cupons</h3>
              <p className="text-xs text-slate-500">Análise de uso de cupons, descontos concedidos e retorno sobre investimento.</p>
          </button>
      </div>

      {/* 2. SELEÇÃO DE PERÍODO E AÇÃO */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg max-w-2xl mx-auto">
          <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 text-center">Configurar Exportação</h3>
          
          <div className="flex flex-col gap-6">
              
              {/* Seletor de Data */}
              <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2"><Calendar size={16}/> Período dos Dados</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#0097A8] font-medium text-slate-700 cursor-pointer"
                    value={dateRange}
                    onChange={(e) => {
                        if(e.target.value === 'custom') setIsCustomDateOpen(true);
                        setDateRange(e.target.value);
                    }}
                  >
                      <option value="today">Hoje</option>
                      <option value="yesterday">Ontem</option>
                      <option value="this_month">Este Mês</option>
                      <option value="last_month">Mês Passado</option>
                      <option value="last_90">Últimos 90 dias</option>
                      <option value="last_12_months">Últimos 12 Meses</option>
                      <option value="all">Todo o Período</option>
                      <option value="custom">Personalizado...</option>
                  </select>
              </div>

              {/* Botão de Ação */}
              <button 
                onClick={handleGenerateReport}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
                    loading ? 'bg-slate-400 cursor-wait' : 'bg-[#0097A8] hover:bg-[#008ba0] hover:shadow-2xl'
                }`}
              >
                  {loading ? (
                      'Processando...'
                  ) : (
                      <>
                        <Download size={24}/> Exportar CSV
                      </>
                  )}
              </button>

              {/* Feedback Visual Inline */}
              {feedback && (
                  <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-fade-in ${
                      feedback.type === 'success' ? 'bg-green-50 text-green-700' : 
                      feedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                      {feedback.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                      {feedback.msg}
                  </div>
              )}
          </div>
      </div>

      {/* Modal Custom Date */}
      {isCustomDateOpen && (
          <ModalOverlay onClose={() => setIsCustomDateOpen(false)}>
              <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4">Selecionar Período Personalizado</h3>
                  <div className="space-y-3 mb-6">
                      <div><label className="text-xs font-bold text-slate-500">Início</label><input type="date" className="w-full border p-2 rounded-lg" value={customStart} onChange={e => setCustomStart(e.target.value)} /></div>
                      <div><label className="text-xs font-bold text-slate-500">Fim</label><input type="date" className="w-full border p-2 rounded-lg" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>
                  </div>
                  <Button onClick={() => setIsCustomDateOpen(false)}>Confirmar Datas</Button>
              </div>
          </ModalOverlay>
      )}

    </div>
  );
};

export default PartnerReports;