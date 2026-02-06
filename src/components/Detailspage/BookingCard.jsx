import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, CheckCircle, Ban, Lock, ShoppingCart, 
  Trash2, Flame, AlertCircle, Link as LinkIcon, Info, X
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore'; 
import { db } from '../../firebase'; 
import { formatBRL } from '../../utils/format';
import SimpleCalendar from '../Detailspage/SimpleCalendar';
import Button from '../Button';

// --- DEFINIÇÃO DE REGRAS ---
const GUARDIAN_TYPES = ['adult', 'combo_adult', 'mix_ac', 'mix_suite', 'super_mix'];
const DEPENDENT_TYPES = ['child', 'pet', 'combo_child', 'parking_moto', 'parking_car'];

const BookingCard = ({ 
  item, products = [], 
  date, setDate, 
  isSoldOut, isTimeBlocked, checkingStock, availableSpots, 
  handleBook,
  user 
}) => {
  
  const [cart, setCart] = useState({});
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  
  // Modais e Avisos
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [foundReservation, setFoundReservation] = useState(null);
  const [pendingProductToAdd, setPendingProductToAdd] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => { setCart({}); }, [date]);

  // 🔥 1. FUNÇÃO DE VALIDAÇÃO DE REGRA MÍNIMA (CORRIGIDA)
  const checkMinQuantityRule = (product, currentQty) => {
      if (!date) return { valid: true }; 

      // 1. Identificar Data e Dia da Semana
      const dateStr = date; // "YYYY-MM-DD"
      // Adiciona hora fixa para garantir que o fuso não mude o dia da semana
      const dateObj = new Date(date + 'T12:00:00'); 
      const dayOfWeek = dateObj.getDay(); // 0 a 6

      // 2. Buscar a regra correta (Prioridade: Data Específica > Dia da Semana)
      const rules = product.minQuantityRules || {};
      let minRequired = 1;

      if (rules[dateStr]) {
          // Tem regra para esta data específica (ex: Feriado)?
          minRequired = Number(rules[dateStr]);
      } else if (rules[dayOfWeek] !== undefined) {
          // Tem regra para este dia da semana?
          minRequired = Number(rules[dayOfWeek]);
      }

      // 3. Validar
      if (minRequired > 1) {
          const remaining = minRequired - currentQty;
          const isValid = currentQty >= minRequired;
          
          return {
              hasRule: true,
              min: minRequired,
              valid: isValid,
              remaining: Math.max(0, remaining),
              message: isValid ? "Mínimo alcançado!" : `Mínimo de ${minRequired} pessoas`
          };
      }

      return { valid: true, hasRule: false };
  };

  // --- TOAST CENTRALIZADO E DISRUPTIVO ---
  const showToast = (msg, type = 'error') => {
      setFeedbackMsg({ text: msg, type });
      setTimeout(() => setFeedbackMsg(null), 4500); 
  };

  const getProductsForSelectedDate = () => {
      if (!date) return [];
      const selectedDayOfWeek = new Date(date + 'T12:00:00').getDay();
      const selectedDateStr = date;

      const filtered = products.filter(prod => {
          const isOpenDay = prod.availableDays?.includes(selectedDayOfWeek);
          const isSpecialDate = prod.includedSpecialDates?.includes(selectedDateStr);
          return isOpenDay || isSpecialDate;
      });

      return filtered.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : 999;
          const orderB = b.order !== undefined ? b.order : 999;
          return orderA - orderB;
      });
  };

  const validProducts = getProductsForSelectedDate();

  // 🔥 2. BLOQUEIO GLOBAL DO BOTÃO (Atualizado para usar a função corrigida)
  const hasPendingRules = validProducts.some(prod => {
      const qty = cart[prod.id]?.quantity || 0;
      // Se a quantidade é 0, não bloqueamos o botão (a menos que seja obrigatório comprar algo, mas normalmente validamos só o que está no carrinho)
      // Se você quiser OBRIGAR a compra do item se ele tiver regra, remova o "if (qty === 0)"
      if (qty === 0) return false; 
      
      const rule = checkMinQuantityRule(prod, qty);
      return !rule.valid;
  });

  const totalAmount = validProducts.reduce((acc, prod) => {
      const qty = cart[prod.id]?.quantity || 0; 
      const price = prod.price || prod.priceAdult || 0;
      return acc + (qty * price);
  }, 0);

  const totalItems = Object.values(cart).reduce((a, b) => a + (b.quantity || 0), 0);

  // --- LÓGICA DE VINCULAÇÃO ---
  const checkExistingReservation = async (product) => {
      if (!user) {
          showToast("Para comprar ingressos dependentes (Criança/Pet) ou estacionamento, faça login ou selecione um ingresso adulto primeiro.", "warning");
          return;
      }

      setIsVerifyingLink(true);

      try {
          const q1 = query(
              collection(db, "reservations"),
              where("item.id", "==", item.id),
              where("date", "==", date),
              where("userId", "==", user.uid),
              where("status", "in", ["confirmed", "approved", "paid"])
          );

          const snapshot1 = await getDocs(q1);

          if (!snapshot1.empty) {
              const reservation = { id: snapshot1.docs[0].id, ...snapshot1.docs[0].data() };
              setFoundReservation(reservation);
              setPendingProductToAdd(product);
              setLinkModalOpen(true);
          } else {
              // Tentativa secundária (nova estrutura)
              const q2 = query(
                  collection(db, "reservations"),
                  where("bookingDetails.dayuseId", "==", item.id),
                  where("date", "==", date),
                  where("userId", "==", user.uid),
                  where("status", "in", ["confirmed", "approved", "paid"])
              );
              
              const snapshot2 = await getDocs(q2);

              if (!snapshot2.empty) {
                  const reservation2 = { id: snapshot2.docs[0].id, ...snapshot2.docs[0].data() };
                  setFoundReservation(reservation2);
                  setPendingProductToAdd(product);
                  setLinkModalOpen(true);
              } else {
                  showToast("Este ingresso requer um responsável. Adicione um adulto ao carrinho primeiro.", "warning");
              }
          }
      } catch (error) {
          console.error("Erro:", error);
          showToast("Erro ao verificar disponibilidade.");
      } finally {
          setIsVerifyingLink(false);
      }
  };

  const confirmLink = () => {
      if (pendingProductToAdd && foundReservation) {
          setCart(prev => ({
              ...prev,
              [pendingProductToAdd.id]: {
                  quantity: 1,
                  linkedTo: foundReservation.id 
              }
          }));
          setLinkModalOpen(false);
          setFoundReservation(null);
          setPendingProductToAdd(null);
          showToast("Item vinculado com sucesso!", "success");
      }
  };

  const updateQuantity = async (prod, delta) => {
      const prodId = prod.id;
      const currentEntry = cart[prodId] || { quantity: 0 };
      const currentQty = currentEntry.quantity;
      const newQty = Math.max(0, currentQty + delta);

      // Validações de Estoque e Dependência
      if (delta > 0) {
          if (availableSpots !== null && (totalItems + 1) > availableSpots && !prod.isPhysical) {
              showToast("Limite de vagas do dia atingido.");
              return; 
          }

          const isDependent = DEPENDENT_TYPES.includes(prod.type);
          if (isDependent) {
              const hasGuardianInCart = validProducts.some(p => 
                  cart[p.id]?.quantity > 0 && GUARDIAN_TYPES.includes(p.type)
              );
              const isAlreadyLinked = !!currentEntry.linkedTo;

              if (!hasGuardianInCart && !isAlreadyLinked) {
                  await checkExistingReservation(prod);
                  return;
              }
          }
      }

      if (delta < 0) {
          if (GUARDIAN_TYPES.includes(prod.type)) {
              const otherGuardiansQty = validProducts.reduce((sum, p) => {
                  if (p.id === prodId) return sum;
                  if (GUARDIAN_TYPES.includes(p.type)) return sum + (cart[p.id]?.quantity || 0);
                  return sum;
              }, 0);

              if (otherGuardiansQty === 0 && newQty === 0) {
                  // Se remover o último adulto, verifica se tem dependentes órfãos
                  const hasOrphanDependents = validProducts.some(p => 
                      DEPENDENT_TYPES.includes(p.type) && 
                      cart[p.id]?.quantity > 0 && 
                      !cart[p.id]?.linkedTo 
                  );

                  if (hasOrphanDependents) {
                      showToast("Dependentes removidos pois ficaram sem responsável.", "warning");
                      setCart(prev => {
                          const cleanedCart = { ...prev };
                          delete cleanedCart[prodId]; 
                          validProducts.forEach(p => {
                              if (DEPENDENT_TYPES.includes(p.type) && !cleanedCart[p.id]?.linkedTo) {
                                  delete cleanedCart[p.id];
                              }
                          });
                          return cleanedCart;
                      });
                      return; 
                  }
              }
          }
      }

      setCart(prev => {
          const newCart = { ...prev };
          if (newQty === 0) delete newCart[prodId];
          else newCart[prodId] = { ...currentEntry, quantity: newQty };
          return newCart;
      });
  };

  const onConfirmBooking = () => {
      const selectedItems = validProducts
          .filter(p => cart[p.id]?.quantity > 0)
          .map(p => {
              const cartItem = cart[p.id];
              let snapshot = 999; 
              if (p.isPhysical) {
                  snapshot = p.stock !== null && p.stock !== undefined ? Number(p.stock) : 999;
              } else {
                  snapshot = availableSpots !== null ? Number(availableSpots) : 999;
              }
              return {
                  ...p,
                  quantity: cartItem.quantity,
                  totalItem: cartItem.quantity * (p.price || 0),
                  stockSnapshot: snapshot,
                  linkedToReservationId: cartItem.linkedTo || null 
              };
          });

      handleBook({
          cartItems: selectedItems,
          total: totalAmount,
          date: date
      });
  };

  const allAvailableDays = [...new Set(products.flatMap(p => p.availableDays || []))];
  const allSpecialDates = [...new Set(products.flatMap(p => p.includedSpecialDates || []))];

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6 animate-fade-in relative">
      
      {feedbackMsg && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setFeedbackMsg(null)}></div>
              <div className={`relative bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center text-center gap-3 max-w-sm w-full transform transition-all scale-100 ${feedbackMsg.type === 'error' || feedbackMsg.type === 'warning' ? 'border-b-4 border-red-400' : 'border-b-4 border-green-400'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${feedbackMsg.type === 'error' || feedbackMsg.type === 'warning' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {feedbackMsg.type === 'success' ? <CheckCircle size={24}/> : <AlertCircle size={24}/>}
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Atenção</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{feedbackMsg.text}</p>
                  <button onClick={() => setFeedbackMsg(null)} className="mt-2 text-xs font-bold text-slate-400 uppercase hover:text-slate-600">Fechar</button>
              </div>
          </div>,
          document.body
      )}

      {/* Modal de Vinculação (código mantido, igual ao original) */}
      {linkModalOpen && foundReservation && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLinkModalOpen(false)}></div>
              <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 relative z-10 shadow-2xl animate-scale-up">
                  <button onClick={() => setLinkModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  <div className="text-center mb-6">
                      <div className="w-14 h-14 bg-teal-50 text-[#0097A8] rounded-full flex items-center justify-center mb-4 mx-auto shadow-sm border border-teal-100"><LinkIcon size={28} /></div>
                      <h4 className="font-bold text-slate-900 text-xl mb-2">Vincular a Reserva Existente?</h4>
                      <p className="text-sm text-slate-500">Encontramos um voucher ativo que pode ser usado como responsável.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 text-left">
                      <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-400 uppercase">Local</span><span className="text-xs font-bold text-slate-700">{foundReservation.item?.name}</span></div>
                      <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-400 uppercase">Titular</span><span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{user?.displayName || user?.email || "Você"}</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase">Código</span><span className="text-sm font-mono font-bold text-[#0097A8] bg-white px-2 py-0.5 rounded border border-teal-100">#{foundReservation.id.slice(0,6).toUpperCase()}</span></div>
                  </div>
                  <div className="flex flex-col gap-3">
                      <button onClick={confirmLink} className="w-full py-3.5 text-sm font-bold text-white bg-[#0097A8] rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-200 transition-transform active:scale-[0.98]">Sim, Vincular Ingressos</button>
                      <button onClick={() => { setLinkModalOpen(false); setFoundReservation(null); showToast("Ok! Adicione um ingresso adulto ao carrinho.", "warning"); }} className="w-full py-3 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">Não, quero comprar separado</button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* 1. SELEÇÃO DE DATA */}
      <div>
        <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><CalendarIcon size={16} className="text-[#0097A8]"/> {date ? "Data Selecionada" : "Escolha uma data"}</label>
            {date && (<button onClick={()=>setDate("")} className="text-xs text-[#0097A8] hover:underline font-bold">Trocar Data</button>)}
        </div>
        <div className={date ? "" : "animate-pulse-slow"}>
            <SimpleCalendar availableDays={allAvailableDays.length > 0 ? allAvailableDays : item.availableDays} specialDates={allSpecialDates} blockedDates={item.blockedDates || []} basePrice={0} onDateSelect={setDate} selectedDate={date} products={products} />
        </div>
      </div>

      {/* 2. LOADING E AVISOS */}
      {date && (
          <div className="transition-all duration-300">
            {(checkingStock || isVerifyingLink) && (<div className="bg-slate-100 text-slate-500 text-xs font-bold py-3 rounded-xl text-center flex justify-center gap-2"><div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> {isVerifyingLink ? "Verificando reservas..." : "Verificando disponibilidade..."}</div>)}
            {!checkingStock && !isVerifyingLink && isTimeBlocked && (<div className="bg-amber-50 text-amber-800 text-xs font-bold py-3 px-4 rounded-xl text-center border border-amber-200"><span className="block mb-1">⏰ Vendas Encerradas</span> Horário limite excedido.</div>)}
            {!checkingStock && !isVerifyingLink && isSoldOut && (<div className="bg-red-50 text-red-700 text-xs font-bold py-3 px-4 rounded-xl text-center border border-red-200"><span className="block mb-1">🚫 Esgotado</span> Não há vagas.</div>)}
          </div>
      )}

      {/* 3. LISTA DE PRODUTOS */}
      {date && !checkingStock && !isSoldOut && !isTimeBlocked && (
        <div className="space-y-4 animate-slide-up">
            {validProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><Ban size={24} className="mx-auto mb-2 opacity-50"/><p className="text-sm">Nenhum ingresso disponível.</p></div>
            ) : (
                <>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-t border-slate-100 pt-4"><ShoppingCart size={14}/> Ingressos Disponíveis</p>
                    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                        {validProducts.map(prod => {
                            const cartItem = cart[prod.id] || { quantity: 0 };
                            const qty = cartItem.quantity;
                            const isLinked = !!cartItem.linkedTo;
                            const currentLimit = prod.isPhysical ? (prod.stock || 0) : (availableSpots || 99);
                            const isScarcity = currentLimit <= 10;
                            const isDependent = DEPENDENT_TYPES.includes(prod.type);

                            // 🔥 VERIFICA A REGRA AQUI PARA RENDERIZAR O BADGE
                            const ruleStatus = checkMinQuantityRule(prod, qty);

                            return (
                                <div key={prod.id} className={`relative p-4 rounded-2xl border transition-all ${qty > 0 ? 'border-[#0097A8] bg-cyan-50/20 ring-1 ring-[#0097A8]/20' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                                    <div className="flex flex-col md:flex-row justify-between gap-3 md:items-center">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1"><h4 className={`font-bold text-sm leading-tight ${qty > 0 ? 'text-[#0097A8]' : 'text-slate-800'}`}>{prod.title}</h4>{isLinked && <LinkIcon size={14} className="text-[#0097A8]" />}</div>
                                            {prod.description && (<p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 pr-2 mb-2">{prod.description}</p>)}
                                        </div>
                                        <div className="flex items-end justify-between md:flex-col md:items-end md:gap-1">
                                            <div className="flex flex-col"><span className="text-lg font-bold text-slate-900 md:text-right">{formatBRL(prod.price || 0)}</span></div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className={`flex items-center gap-3 rounded-lg p-1 transition-colors ${qty > 0 ? 'bg-white shadow-sm border border-[#0097A8]/30' : 'bg-slate-50 border border-slate-200'}`}>
                                                    <button onClick={() => updateQuantity(prod, -1)} className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${qty === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-[#0097A8] hover:bg-cyan-50 font-bold'}`} disabled={qty === 0}>{qty === 1 ? <Trash2 size={16}/> : '-'}</button>
                                                    <span className={`w-6 text-center font-bold text-sm ${qty > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{qty}</span>
                                                    <button onClick={() => updateQuantity(prod, 1)} className="w-8 h-8 flex items-center justify-center text-[#0097A8] hover:bg-cyan-50 rounded-md font-bold transition-colors">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* ÁREA DE BADGES */}
                                    <div className="mt-3 pt-3 border-t border-dashed border-slate-200/50 flex flex-wrap gap-2">
                                        {(isScarcity || (prod.isPhysical && prod.stock)) && (<span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${isScarcity ? 'bg-orange-50 text-orange-700 border border-orange-100 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>{isScarcity && <Flame size={10} fill="currentColor" />}{isScarcity ? `Restam só ${currentLimit}!` : `Restam ${prod.stock}`}</span>)}
                                        {isDependent && qty === 0 && (<span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1"><Info size={10}/> Requer responsável</span>)}
                                        
                                        {/* 🔥 BADGE DE REGRA MÍNIMA */}
                                        {ruleStatus.hasRule && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 transition-all ${
                                                qty === 0 ? 'bg-amber-50 text-amber-600 border-amber-200' 
                                                : ruleStatus.valid ? 'bg-green-50 text-green-600 border-green-200' 
                                                : 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                                            }`}>
                                                {ruleStatus.valid ? <CheckCircle size={10}/> : <Info size={10}/>}
                                                {ruleStatus.valid ? ruleStatus.message : qty === 0 ? ruleStatus.message : `Faltam ${ruleStatus.remaining} ingressos`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
      )}

      <div className="pt-4 border-t border-dashed border-slate-200 sticky bottom-0 bg-white pb-2 z-20">
        <div className="flex justify-between items-center mb-3"><span className="text-slate-500 text-xs font-medium">Total Estimado</span><span className="text-xl font-bold text-slate-900">{formatBRL(totalAmount)}</span></div>
        <Button 
            className="w-full py-4 text-lg shadow-xl shadow-teal-100 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]" 
            disabled={!date || checkingStock || totalItems === 0 || isSoldOut || isTimeBlocked || isVerifyingLink || hasPendingRules} 
            onClick={() => {
                if (hasPendingRules) {
                    showToast("Você precisa atingir a quantidade mínima de ingressos para a data selecionada.", "warning");
                    return;
                }
                onConfirmBooking();
            }}
        >
            {checkingStock || isVerifyingLink ? 'Aguarde...' : <>{totalItems > 0 && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full ml-1">{totalItems} item{totalItems > 1 ? 's' : ''}</span>} Reservar Agora</>}
        </Button>
        <p className="text-center text-[10px] text-slate-400 mt-3 flex items-center justify-center gap-1"><Lock size={10}/> Compra 100% segura via Mercado Pago</p>
      </div>
    </div>
  );
};

export default BookingCard;