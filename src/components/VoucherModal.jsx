import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { createPortal } from 'react-dom';
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from '../firebase'; 
import { 
  X, MapPin, Calendar, Clock, User, CreditCard, 
  CheckCircle, Ban, Phone, MessageCircle, FileText, 
  Printer, Link as LinkIcon, Utensils, Receipt
} from 'lucide-react';
import { formatBRL, formatDate } from '../utils/format';
import Button from './Button';

const VoucherModal = ({ isOpen, trip, onClose }) => {
  const printRef = useRef();
  
  // Inicialização Híbrida (Root + Item + BookingDetails)
  const [fullItem, setFullItem] = useState({
      ...trip, 
      ...(trip?.item || {}),
      ...(trip?.bookingDetails?.item || {})
  });

  // Busca dados frescos do banco
  useEffect(() => {
    if (isOpen && trip) {
        const dayUseId = trip.bookingDetails?.dayuseId || trip.bookingDetails?.item?.id || trip.item?.id || trip.dayuseId;

        if (dayUseId) {
            const fetchDayUseDetails = async () => {
                try {
                    const docRef = doc(db, "dayuses", dayUseId);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        const freshData = docSnap.data();
                        setFullItem(prev => ({ 
                            ...prev, 
                            ...freshData,
                            name: freshData.name || prev.name 
                        }));
                    }
                } catch (error) {
                    console.error("Erro ao atualizar detalhes do local:", error);
                }
            };
            fetchDayUseDetails();
        }
    }
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  // --- LÓGICA DE DADOS CORRIGIDA ---
  
  // 1. Normaliza a lista de itens
  const itemsList = trip.cartItems || trip.bookingDetails?.cartItems || [];

  // 🔥 2. DETECTA O VÍNCULO (CORREÇÃO AQUI)
  // Procura o ID do responsável na raiz OU dentro de qualquer item do carrinho
  const linkedId = trip.linkedToReservationId 
                || trip.parentTicketId 
                || itemsList.find(i => i.linkedToReservationId)?.linkedToReservationId;

  const isLinkedVoucher = !!linkedId; // Se achou ID, é dependente

  // 3. IDs de Transação
  const transactionId = trip.paymentId || trip.id; 
  
  // 4. Fallbacks de Dados
  const allowFood = fullItem.allowFood !== undefined ? fullItem.allowFood : false; 
  const openTime = fullItem.openingTime || '08:00';
  const closeTime = fullItem.closingTime || '18:00';

  const purchaseDate = trip.createdAt 
    ? new Date(trip.createdAt.seconds * 1000).toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      }) 
    : '-';

  // Endereço
  const addressQuery = [
      fullItem.street, 
      fullItem.number, 
      fullItem.district, 
      fullItem.city, 
      fullItem.state
  ].filter(Boolean).join(', ');

  const encodedAddress = encodeURIComponent(addressQuery);

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowPrint = window.open('', '', 'width=900,height=650');
    windowPrint.document.write(`
      <html>
        <head>
          <title>Ingresso - ${fullItem.name || trip.itemName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #f3f4f6; }
             @page { margin: 0; size: auto; }
             .no-print { display: none !important; }
          </style>
        </head>
        <body class="flex items-center justify-center min-h-screen p-4">
          <div class="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-none border border-gray-200">
            ${printContent.innerHTML}
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 print:p-0">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-md bg-[#F8FAFC] rounded-[2rem] overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[92vh]">
        
        <div className="absolute top-0 left-0 w-full p-4 flex justify-end z-20 pointer-events-none">
            <button 
                onClick={onClose}
                className="pointer-events-auto p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        <div ref={printRef} className="overflow-y-auto custom-scrollbar flex-1 bg-[#F8FAFC]">
          
          {/* HERO DO TICKET */}
          <div className="bg-white m-4 mb-0 rounded-t-[1.5rem] rounded-b-[1.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="bg-[#0097A8] h-3 w-full"></div>
              
              <div className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 bg-teal-50 text-[#0097A8] rounded-full flex items-center justify-center">
                          <TicketIcon size={24} />
                      </div>
                  </div>
                  
                  <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                      {fullItem.name || trip.itemName || "Day Use"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Ingresso de Acesso
                  </p>

                  {/* QR Code Highlight */}
                  <div className="my-6 flex flex-col items-center">
                      <div className="p-3 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                          <QRCode value={trip.id} size={160} fgColor="#1e293b" />
                      </div>
                      <div className="mt-3 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Código</p>
                          <p className="text-lg font-mono font-bold text-slate-800 tracking-wider">
                              {trip.id.slice(0, 8).toUpperCase()}
                          </p>
                      </div>
                  </div>

                  {/* 🔥 AVISO DE VÍNCULO (AZUL) */}
                  {isLinkedVoucher && (
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-left flex items-start gap-3 mb-2">
                          <LinkIcon className="text-blue-500 shrink-0 mt-0.5" size={16}/>
                          <div>
                              <p className="text-xs font-bold text-blue-700">Ingresso Dependente</p>
                              <p className="text-[10px] text-blue-600 leading-tight">
                                  Entrada permitida apenas com o titular da reserva <strong>#{linkedId.slice(0,6).toUpperCase()}</strong>.
                              </p>
                          </div>
                      </div>
                  )}

                  <div className="w-full border-b-2 border-dashed border-slate-100 my-4 relative">
                      <div className="absolute -left-8 -top-3 w-6 h-6 bg-[#F8FAFC] rounded-full"></div>
                      <div className="absolute -right-8 -top-3 w-6 h-6 bg-[#F8FAFC] rounded-full"></div>
                  </div>

                  {/* DADOS PRINCIPAIS */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-left">
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Data</p>
                          <p className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                              <Calendar size={14} className="text-[#0097A8]"/> {formatDate(trip.date)}
                          </p>
                      </div>
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Horário</p>
                          <p className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                              <Clock size={14} className="text-[#0097A8]"/> {openTime} - {closeTime}
                          </p>
                      </div>
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Titular</p>
                          <p className="font-bold text-slate-800 flex items-center gap-1.5 text-sm truncate">
                              <User size={14} className="text-[#0097A8]"/> {trip.holderName || trip.guestName || "Visitante"}
                          </p>
                      </div>
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Transação</p>
                          <p className="font-bold text-slate-500 flex items-center gap-1.5 text-xs font-mono">
                              #{transactionId.slice(-8)}
                          </p>
                      </div>
                      
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Compra</p>
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Receipt size={14} className="text-[#0097A8]"/> 
                              <span className="truncate">{purchaseDate}</span>
                          </p>
                      </div>
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pagamento</p>
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <CreditCard size={14} className="text-[#0097A8]"/> 
                              {trip.paymentMethod === 'pix' ? 'Pix' : 'Cartão'}
                          </p>
                      </div>
                  </div>
              </div>
          </div>

          {/* 2. LOCALIZAÇÃO E NAVEGAÇÃO */}
          <div className="mx-4 mt-4 bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                  <MapPin size={14} className="text-[#0097A8]"/> Como Chegar
              </h3>
              
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {fullItem.street ? (
                      <span>{fullItem.street}, {fullItem.number || 'S/N'} - {fullItem.district}, {fullItem.city} - {fullItem.state}</span>
                  ) : (
                      <span className="italic text-slate-400">
                          Carregando endereço...
                      </span>
                  )}
              </p>

              <div className="flex gap-2 no-print">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`} target="_blank" rel="noreferrer" className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 transition-colors">
                      <img src="https://img.icons8.com/color/48/google-maps.png" className="w-5 h-5" alt="Google"/> Google
                  </a>
                  <a href={`https://waze.com/ul?q=${encodedAddress}`} target="_blank" rel="noreferrer" className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 transition-colors">
                      <img src="https://img.icons8.com/color/48/waze.png" className="w-5 h-5" alt="Waze"/> Waze
                  </a>
                  <a href={`http://maps.apple.com/?q=${encodedAddress}`} target="_blank" rel="noreferrer" className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 transition-colors">
                      <img src="https://img.icons8.com/color/48/apple-map.png" className="w-5 h-5" alt="Apple"/> Apple
                  </a>
              </div>
          </div>

          {/* 3. RESUMO, REGRAS E CARDÁPIO */}
          <div className="mx-4 mt-4 mb-4 bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200 space-y-6">
              
              {/* Itens */}
              <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                      <FileText size={14} className="text-[#0097A8]"/> Itens do Ingresso
                  </h3>
                  <div className="space-y-3">
                      {itemsList.length > 0 ? itemsList.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                              <div>
                                  <span className="font-bold text-slate-700">{item.quantity}x {item.title}</span>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                      {item.type === 'adult' && <span>Entrada Individual (Adulto)</span>}
                                      {item.type === 'child' && <span>Entrada Dependente (Infantil)</span>}
                                      {item.description && <span className="block italic">{item.description}</span>}
                                  </div>
                              </div>
                          </div>
                      )) : (
                          <span className="text-xs text-slate-500">Detalhes indisponíveis para pedidos antigos.</span>
                      )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Total Pago</span>
                      <span className="text-sm font-bold text-[#0097A8]">{formatBRL(trip.total)}</span>
                  </div>
              </div>

              {/* Regras e Cardápio */}
              <div>
                  {allowFood !== undefined && (
                      <div className={`p-3 rounded-xl border flex items-start gap-3 ${allowFood ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                          {allowFood ? <CheckCircle className="text-green-600 mt-0.5" size={16}/> : <Ban className="text-red-600 mt-0.5" size={16}/>}
                          <div>
                              <p className={`text-xs font-bold ${allowFood ? 'text-green-800' : 'text-red-800'}`}>
                                  {allowFood ? "Pode levar comida/bebida" : "Proibido alimentos externos"}
                              </p>
                              <p className={`text-[10px] mt-0.5 ${allowFood ? 'text-green-600' : 'text-red-600'}`}>
                                  {allowFood ? "Vidros são proibidos." : "O local possui restaurante."}
                              </p>
                          </div>
                      </div>
                  )}

                  {fullItem.menuUrl && (
                      <a 
                          href={fullItem.menuUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="mt-3 w-full py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors no-print"
                      >
                          <Utensils size={14}/> Ver Cardápio Digital
                      </a>
                  )}
              </div>

              {/* Contato */}
              <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                      <MessageCircle size={14} className="text-[#0097A8]"/> Contato do Local
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                      {fullItem.localWhatsapp && (
                          <a 
                              href={`https://wa.me/55${fullItem.localWhatsapp.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-2 text-xs font-medium text-green-700 hover:underline cursor-pointer"
                          >
                              <span className="bg-green-100 text-green-700 p-1 rounded"><MessageCircle size={12}/></span> 
                              WhatsApp: {fullItem.localWhatsapp}
                          </a>
                      )}
                      {fullItem.localPhone && (
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                              <span className="bg-slate-100 text-slate-600 p-1 rounded"><Phone size={12}/></span> 
                              Tel: {fullItem.localPhone}
                          </div>
                      )}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-3 border-t border-slate-100 pt-2">
                      Dúvidas ou cancelamentos? Entre em contato direto com o local.
                  </p>
              </div>

          </div>
        </div>

        <div className="bg-white border-t border-slate-200 p-4 z-10">
            <Button 
                onClick={handlePrint}
                className="w-full py-4 shadow-xl shadow-teal-100 flex items-center justify-center gap-2 text-sm font-bold"
            >
                <Printer size={18}/> Salvar / Imprimir Ingresso
            </Button>
        </div>

      </div>
    </div>,
    document.body
  );
};

const TicketIcon = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
);

export default VoucherModal;