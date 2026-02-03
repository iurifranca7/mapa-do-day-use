import React from 'react';
import { Calendar, Flame } from 'lucide-react'; 
import { formatBRL } from '../../utils/format';

const OrderSummary = ({ 
  bookingData, 
  discount, 
  finalTotal, 
  couponCode, 
  setCouponCode, 
  handleApplyCoupon, 
  couponMsg,
  isMobile = false 
}) => {
  const item = bookingData.item || bookingData;
  const hasCart = bookingData.cartItems && bookingData.cartItems.length > 0;

  return (
    <div className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-xl ${!isMobile ? 'sticky top-24' : ''}`}>
        <h3 className="font-bold text-xl text-slate-900 mb-1">{item.name}</h3>
        <p className="text-sm text-slate-500 mb-6 flex items-center gap-1">
            <Calendar size={14}/> {bookingData.date ? bookingData.date.split('-').reverse().join('/') : 'Data não selecionada'}
        </p>
        
        <div className="space-y-3 text-sm text-slate-600 border-t pt-4 border-dashed">
            
            {hasCart ? (
                <div className="space-y-4">
                    {bookingData.cartItems.map((prod, idx) => {

                        const remaining = prod.stockSnapshot;
                        const label = prod.isPhysical ? 'unidades' : 'vagas';
                        
                        let badge = null;

                        // Lógica Visual: Só mostra se tiver snapshot válido
                        if (remaining !== undefined && remaining !== null) {
                            if (remaining < 3) {
                                // CRÍTICO (< 3): Vermelho
                                badge = (
                                    <div className="mt-1">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-100 animate-pulse">
                                            <Flame size={8} fill="currentColor" /> Restam só {remaining}!
                                        </span>
                                    </div>
                                );
                            } else if (remaining < 10) {
                                // ALERTA (< 10): Laranja
                                badge = (
                                    <div className="mt-1">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-100">
                                            <Flame size={8} fill="currentColor" /> Restam {remaining} {label}
                                        </span>
                                    </div>
                                );
                            }
                            // SE FOR >= 10, badge continua null (oculto)
                        }

                        return (
                            <div key={idx} className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="text-slate-700 font-bold leading-snug flex items-center gap-2">
                                        <span className="text-[#0097A8] bg-cyan-50 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
                                            {prod.quantity}x
                                        </span> 
                                        <span className="truncate">{prod.title || prod.name}</span>
                                    </div>
                                    
                                    {prod.description && (
                                        <p className="text-[10px] text-slate-400 leading-tight mt-1 pl-9 line-clamp-2">
                                            {prod.description}
                                        </p>
                                    )}

                                    {/* Insere o Badge de Alerta Aqui (Abaixo da descrição, indentado) */}
                                    <div className="pl-9">
                                        {badge}
                                    </div>
                                </div>
                                
                                <div className="text-right shrink-0">
                                    <b className="block text-slate-900 text-xs">
                                        {formatBRL(prod.totalItem || (prod.price * prod.quantity))}
                                    </b>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="opacity-50 text-xs text-center py-2">
                    Detalhes do pedido indisponíveis.
                </div>
            )}
            
            {/* Resto do componente (Cupom, Total...) mantido igual */}
            {discount > 0 && (
                <div className="flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded text-xs mt-4">
                    <span>Desconto aplicado</span>
                    <span>- {formatBRL(discount)}</span>
                </div>
            )}
            
            <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
                <input 
                    className="border border-slate-200 bg-slate-50 p-3 rounded-xl flex-1 text-xs uppercase font-bold tracking-wide outline-none focus:border-[#0097A8] transition-colors" 
                    placeholder="CUPOM DE DESCONTO" 
                    value={couponCode} 
                    onChange={e=>setCouponCode(e.target.value)} 
                />
                <button onClick={handleApplyCoupon} className="bg-slate-800 text-white px-4 rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors">APLICAR</button>
            </div>
            {couponMsg && (<div className={`text-xs p-2 rounded text-center font-bold mt-1 ${couponMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{couponMsg.text}</div>)}
            
            <div className="flex justify-between pt-4 border-t border-slate-200 mt-4 items-center">
                <span className="font-bold text-lg text-slate-700">Total</span>
                <span className="font-bold text-2xl text-[#0097A8]">{formatBRL(finalTotal)}</span>
            </div>

            <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                <p className="text-[10px] text-yellow-800 leading-tight text-justify">
                    📢 <strong>Importante:</strong> O Mapa do Day Use atua como intermediador. A prestação do serviço é de responsabilidade do estabelecimento.
                </p>
            </div>
        </div>
    </div>
  );
};

export default OrderSummary;