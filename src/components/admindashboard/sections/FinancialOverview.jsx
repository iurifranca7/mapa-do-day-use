import React, { useMemo } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, CreditCard } from 'lucide-react';
import { formatBRL } from './../../../utils/format'; // Use seu formatador existente

const FinancialOverview = ({ reservations }) => {
  // Cálculos em tempo real
  const metrics = useMemo(() => {
    let grossTotal = 0; // GMV (Volume Bruto)
    let netRevenue = 0; // Sua Comissão
    let orders = 0;
    let mpCost = 0;     // Custo MP Absorvido

    reservations.forEach(r => {
      // Filtra apenas vendas reais
      if (['approved', 'confirmed', 'paid'].includes(r.status) || r.mpStatus === 'approved') {
        const snap = r.financialSnapshot || {};
        
        // Prioriza o snapshot salvo na hora da venda, senão tenta calcular (legado)
        const saleValue = snap.paidTotal || r.total || 0;
        const commission = snap.platformFee || 0; 
        const fee = snap.mpFeeEstimated || 0;

        grossTotal += Number(saleValue);
        netRevenue += Number(commission);
        mpCost += Number(fee);
        orders++;
      }
    });

    return {
      grossTotal,
      netRevenue,
      orders,
      avgTicket: orders > 0 ? grossTotal / orders : 0,
      mpCost
    };
  }, [reservations]);

  const cards = [
    { label: 'Volume Transacionado (GMV)', value: formatBRL(metrics.grossTotal), icon: <DollarSign />, color: 'bg-blue-500' },
    { label: 'Receita Líquida (Comissão)', value: formatBRL(metrics.netRevenue), icon: <TrendingUp />, color: 'bg-green-500' },
    { label: 'Total de Vendas', value: metrics.orders, icon: <ShoppingBag />, color: 'bg-orange-500' },
    { label: 'Ticket Médio', value: formatBRL(metrics.avgTicket), icon: <CreditCard />, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{card.value}</p>
            </div>
            <div className={`p-3 rounded-xl text-white ${card.color} shadow-lg shadow-${card.color}/30`}>
              {React.cloneElement(card.icon, { size: 24 })}
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de Vendas Recentes (Exemplo) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Últimas Transações</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="p-3 rounded-l-lg">Data</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Local</th>
                <th className="p-3">Valor</th>
                <th className="p-3 text-right rounded-r-lg">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.slice(0, 10).map(r => (
                <tr key={r.id}>
                  <td className="p-3">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : '-'}</td>
                  <td className="p-3 font-medium">{r.guestName}</td>
                  <td className="p-3 text-slate-500">{r.item?.name || '-'}</td>
                  <td className="p-3 text-slate-700">{formatBRL(r.total)}</td>
                  <td className="p-3 text-right text-green-600 font-bold">
                    {formatBRL(r.financialSnapshot?.platformFee || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;