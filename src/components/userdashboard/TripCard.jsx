import React from 'react';
import { Calendar as CalendarIcon, CheckCircle, Clock, CreditCard, XCircle, MapPin, User, PawPrint, AlertTriangle, ArrowRight } from 'lucide-react';
import Button from './../Button';
import StockIndicator from './../StockIndicator'; 
import { formatBRL, formatDate } from '../../utils/format'; 

const TripCard = ({ 
  trip, 
  handleResumePayment, 
  handleRepurchase, 
  handleCardClick, 
  setSelectedVoucher 
}) => {
  
  const today = new Date().toISOString().split('T')[0];
  const isExpiredDate = trip.date < today;
  const isConfirmed = ['confirmed', 'approved', 'validated'].includes(trip.status);
  const isPendingPay = ['pending', 'waiting_payment', 'failed_payment'].includes(trip.status);
  const isMissed = isPendingPay && isExpiredDate;
  const isRecoverable = isPendingPay && !isExpiredDate;
  const isSoldOut = trip.status === 'cancelled_sold_out';

  // 🔥 CORREÇÃO 1: CÓDIGO ÚNICO DO VOUCHER
  // Usa o ID da Reserva (Firebase Document ID) para bater com o QR Code.
  const displayCode = (trip.id || "").toString().slice(0, 8).toUpperCase();

  // 🔥 CORREÇÃO 2: DADOS HÍBRIDOS (NOVOS E LEGADO)
  // Tenta pegar do objeto novo (bookingDetails.item), do médio (item) ou da raiz (legado)
  const itemImage = trip.bookingDetails?.item?.image || trip.item?.image || trip.itemImage || trip.image;
  const itemName = trip.bookingDetails?.item?.name || trip.item?.name || trip.itemName || "Day Use";
  const itemCity = trip.bookingDetails?.item?.city || trip.item?.city || trip.city;
  const itemId = trip.bookingDetails?.item?.id || trip.item?.id || trip.dayuseId;

  const getStatusBadge = (status, isExpired) => {
      if (isExpired && status !== 'confirmed' && status !== 'validated') {
          return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> Expirado</span>;
      }
      switch (status) {
          case 'confirmed': case 'approved': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Confirmado</span>;
          case 'validated': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Utilizado</span>;
          case 'pending': case 'waiting_payment': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> Aguardando</span>;
          case 'failed_payment': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CreditCard size={12}/> Recusado</span>;
          case 'cancelled_sold_out': return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={12}/> Esgotado</span>;
          default: return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">Cancelado</span>;
      }
  };

  return (
    <div className={`bg-white border p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 transition-all relative ${isRecoverable ? 'border-yellow-200 shadow-md ring-1 ring-yellow-100' : isMissed ? 'bg-slate-50 border-slate-200 opacity-90' : 'border-slate-200'}`}>
        
        {/* CÓDIGO DO VOUCHER NO TOPO */}
        <div className="absolute top-4 right-4 bg-slate-50 border border-slate-200 text-slate-400 px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider select-all">
            #{displayCode}
        </div>

        <div className="flex gap-4 items-center w-full md:w-auto">
          <div className={`w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative ${isConfirmed ? 'cursor-pointer group' : ''}`} onClick={() => handleCardClick(trip, isConfirmed)}>
              <img src={itemImage} className={`w-full h-full object-cover transition-transform ${isConfirmed ? 'group-hover:scale-105' : ''} ${isSoldOut || isMissed ? 'grayscale opacity-70' : ''}`} alt="Local"/>
              {isRecoverable && <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center"><Clock className="text-yellow-600 drop-shadow-md" size={24}/></div>}
              {isMissed && <div className="absolute inset-0 bg-slate-500/20 flex items-center justify-center"><CalendarIcon className="text-slate-600" size={24}/></div>}
          </div>
          
          <div>
            <h3 className={`font-bold text-lg text-slate-900 ${isConfirmed ? 'cursor-pointer hover:text-[#0097A8] transition-colors' : ''}`} onClick={() => handleCardClick(trip, isConfirmed)}>
              {itemName}
            </h3>
            
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <CalendarIcon size={14}/> {formatDate(trip.date)}
                {itemCity && <span className="flex items-center gap-1 ml-3 border-l pl-3 border-slate-300"><MapPin size={14}/> {itemCity}</span>}
            </p>
            
            <div className="text-xs text-slate-500 mt-2 font-medium flex gap-3 flex-wrap">
                <span className="flex items-center gap-1"><User size={12}/> {trip.adults}</span>
                {trip.children > 0 && <span>• {trip.children} Crianças</span>}
                {trip.pets > 0 && <span className="flex items-center gap-1">• <PawPrint size={12}/> {trip.pets}</span>}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
                {getStatusBadge(trip.status, isMissed)}
                <span className="font-bold text-slate-900">{formatBRL(trip.total)}</span>
            </div>
            
            {trip.status === 'failed_payment' && !isMissed && <p className="text-xs text-red-500 mt-2 font-medium">O último pagamento falhou.</p>}
            {isSoldOut && <p className="text-xs text-slate-400 mt-2">Cancelado automaticamente (Esgotado).</p>}
            {isMissed && <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 bg-slate-100 p-2 rounded-lg"><AlertTriangle size={12}/> Parece que você perdeu a data.</p>}
            
            {isRecoverable && itemId && (
                <div className="mt-2"><StockIndicator dayuseId={itemId} date={trip.date} currentReservationId={trip.id}/></div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 w-full md:w-auto items-end mt-4 md:mt-0">
          {isMissed ? (
              <Button className="w-full md:w-auto px-6 bg-slate-800 hover:bg-slate-700 shadow-none text-xs" onClick={() => handleRepurchase(trip)}>Ver Próximas Datas <ArrowRight size={14} className="ml-2"/></Button>
          ) : isRecoverable ? (
              <>
                  <Button className={`w-full md:w-auto px-6 ${trip.status === 'failed_payment' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200'}`} onClick={() => handleResumePayment(trip)}>{trip.status === 'failed_payment' ? 'Tentar Outro Cartão' : 'Finalizar Compra'}</Button>
                  <p className="text-[10px] text-slate-400 text-center md:text-right">Não perca sua reserva!</p>
              </>
          ) : (
              <div className="flex flex-col items-end gap-2 w-full">
                  {(isConfirmed) && (
                      <Button variant="outline" className="px-4 py-2 h-auto text-xs w-full md:w-auto justify-center" onClick={() => setSelectedVoucher(trip)}>Abrir Voucher</Button>
                  )}
              </div>
          )}
        </div>
    </div>
  );
};

export default TripCard;