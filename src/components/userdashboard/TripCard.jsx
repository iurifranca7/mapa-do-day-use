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
  
  // Lógica de Estado Local do Card
  const today = new Date().toISOString().split('T')[0];
  const isExpiredDate = trip.date < today;
  
  const isConfirmed = ['confirmed', 'approved', 'validated'].includes(trip.status);
  const isPendingPay = ['pending', 'waiting_payment', 'failed_payment'].includes(trip.status);
  
  // Se passou da data e não pagou, é "Perdido/Expirado"
  const isMissed = isPendingPay && isExpiredDate;
  
  // Se não passou da data e não pagou, é "Recuperável"
  const isRecoverable = isPendingPay && !isExpiredDate;
  
  const isSoldOut = trip.status === 'cancelled_sold_out';

  // Helper de Badge interno
  const getStatusBadge = (status, isExpired) => {
      if (isExpired && status !== 'confirmed' && status !== 'validated') {
          return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> Expirado</span>;
      }

      switch (status) {
          case 'confirmed':
          case 'approved':
              return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Confirmado</span>;
          case 'validated':
              return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Utilizado</span>;
          case 'pending':
          case 'waiting_payment':
              return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> Aguardando</span>;
          case 'failed_payment':
              return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CreditCard size={12}/> Recusado</span>;
          case 'cancelled_sold_out':
              return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={12}/> Esgotado</span>;
          default:
              return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">Cancelado</span>;
      }
  };

  return (
    <div className={`bg-white border p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${isRecoverable ? 'border-yellow-200 shadow-md ring-1 ring-yellow-100' : isMissed ? 'bg-slate-50 border-slate-200 opacity-90' : 'border-slate-200'}`}>
        
        <div className="flex gap-4 items-center w-full md:w-auto">
          {/* IMAGEM CLICÁVEL SE CONFIRMADO */}
          <div 
              className={`w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative ${isConfirmed ? 'cursor-pointer group' : ''}`}
              onClick={() => handleCardClick(trip, isConfirmed)}
          >
              <img src={trip.item?.image || trip.itemImage} className={`w-full h-full object-cover transition-transform ${isConfirmed ? 'group-hover:scale-105' : ''} ${isSoldOut || isMissed ? 'grayscale opacity-70' : ''}`} alt="Local"/>
              {isRecoverable && <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center"><Clock className="text-yellow-600 drop-shadow-md" size={24}/></div>}
              {isMissed && <div className="absolute inset-0 bg-slate-500/20 flex items-center justify-center"><CalendarIcon className="text-slate-600" size={24}/></div>}
          </div>
          
          <div>
            {/* NOME CLICÁVEL SE CONFIRMADO */}
            <h3 
              className={`font-bold text-lg text-slate-900 ${isConfirmed ? 'cursor-pointer hover:text-[#0097A8] transition-colors' : ''}`}
              onClick={() => handleCardClick(trip, isConfirmed)}
            >
              {trip.item?.name || trip.itemName}
            </h3>
            
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <CalendarIcon size={14}/> {formatDate(trip.date)}
                {trip.item?.city && <span className="flex items-center gap-1 ml-3 border-l pl-3 border-slate-300"><MapPin size={14}/> {trip.item.city}</span>}
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
            
            {/* MENSAGENS DE ESTADO */}
            {trip.status === 'failed_payment' && !isMissed && (
                <p className="text-xs text-red-500 mt-2 font-medium">O último pagamento falhou.</p>
            )}
            {isSoldOut && (
                <p className="text-xs text-slate-400 mt-2">Cancelado automaticamente (Esgotado).</p>
            )}
            {isMissed && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 bg-slate-100 p-2 rounded-lg">
                    <AlertTriangle size={12}/> Parece que você perdeu a data.
                </p>
            )}
            
            {/* INDICADOR DE URGÊNCIA (SÓ SE RECUPERÁVEL) */}
            {isRecoverable && trip.item?.id && (
                <div className="mt-2">
                    <StockIndicator dayuseId={trip.item.id} date={trip.date} currentReservationId={trip.id}/>
                </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 w-full md:w-auto items-end">
          {isMissed ? (
              // BOTÃO PARA RECOMPRAR (MISSING DATE)
              <Button 
                  className="w-full md:w-auto px-6 bg-slate-800 hover:bg-slate-700 shadow-none text-xs" 
                  onClick={() => handleRepurchase(trip)}
              >
                  Ver Próximas Datas <ArrowRight size={14} className="ml-2"/>
              </Button>
          ) : isRecoverable ? (
              // BOTÃO DE RECUPERAÇÃO (COM URGÊNCIA)
              <>
                  <Button 
                      className={`w-full md:w-auto px-6 ${trip.status === 'failed_payment' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200'}`} 
                      onClick={() => handleResumePayment(trip)}
                  >
                      {trip.status === 'failed_payment' ? 'Tentar Outro Cartão' : 'Finalizar Compra'}
                  </Button>
                  <p className="text-[10px] text-slate-400 text-center md:text-right">Não perca sua reserva!</p>
              </>
          ) : (
              // BOTÃO PADRÃO (VER VOUCHER)
              <div className="flex flex-col items-end gap-2 w-full">
                  <div className="text-xs font-mono bg-slate-50 p-1 px-2 rounded w-fit border border-slate-200 text-slate-500 mb-2 md:mb-0">
                      #{trip.id?.slice(0,6).toUpperCase()}
                  </div>
                  {(isConfirmed) && (
                      <Button variant="outline" className="px-4 py-2 h-auto text-xs w-full md:w-auto justify-center" onClick={() => setSelectedVoucher(trip)}>
                          Abrir Voucher
                      </Button>
                  )}
              </div>
          )}
        </div>
    </div>
  );
};

export default TripCard;