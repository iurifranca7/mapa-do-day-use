import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, getDocs, addDoc } from 'firebase/firestore'; 
import { 
  MapPin, Search, User, CheckCircle, 
  X, Coffee, Wifi, Car, Utensils, PlusCircle, Star, ArrowRight,
  ChevronLeft, ChevronRight, Info, AlertCircle, PawPrint, FileText, Ban, Youtube, ChevronDown, Image as ImageIcon, Map as MapIcon, CreditCard, Calendar as CalendarIcon, DollarSign, LogOut, LayoutDashboard, List, Phone, Mail, Ticket
} from 'lucide-react';

// --- UTILITÁRIOS ---

const formatBRL = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- HOOK DE SEO ---
const useSEO = (title, description, shouldIndex = true) => {
  useEffect(() => {
    document.title = title;
    let metaDesc = document.querySelector("meta[name='description']");
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    let metaRobots = document.querySelector("meta[name='robots']");
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = "robots";
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute("content", shouldIndex ? "index, follow" : "noindex, nofollow");

  }, [title, description, shouldIndex]);
};

// --- COMPONENTES VISUAIS ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled, type='button' }) => {
  const baseStyle = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/20",
    outline: "border-2 border-brand-500 text-brand-600 hover:bg-brand-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ children, type = 'default' }) => {
  const styles = {
    default: "bg-brand-50 text-brand-900 border-brand-100",
    red: "bg-red-50 text-red-900 border-red-100",
    green: "bg-green-50 text-green-800 border-green-200",
  };
  
  return (
    <span className={`${styles[type] || styles.default} text-xs px-3 py-1 rounded-full font-medium border flex items-center gap-1`}>
      {type === 'default' ? <CheckCircle size={12} className="text-brand-500"/> : <Ban size={12} className="text-red-500"/>}
      {children}
    </span>
  );
};

// --- MODAIS E COMPONENTES DE SISTEMA ---

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000); 
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[99999] flex items-center gap-4 animate-fade-in-up max-w-sm w-full mx-4">
      <Info className="text-brand-400 min-w-[24px]" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-white"/></button>
    </div>
  );
};

const Accordion = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0 py-4">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left group">
        <div className="flex items-center gap-2 font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
          {Icon && <Icon size={20} className="text-brand-500" />}
          {title}
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
        <div className="text-gray-600 text-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

const ImageGallery = ({ images, isOpen, onClose, startIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  useEffect(() => { setCurrentIndex(startIndex) }, [startIndex]);
  if (!isOpen) return null;

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white p-2 z-[10000]"><X size={32}/></button>
      <button onClick={prev} className="absolute left-4 text-white/70 hover:text-white p-2 z-[10000]"><ChevronLeft size={40}/></button>
      <div className="w-full max-w-5xl h-full flex items-center justify-center relative">
        <img src={images[currentIndex]} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">{currentIndex + 1} / {images.length}</p>
      </div>
      <button onClick={next} className="absolute right-4 text-white/70 hover:text-white p-2 z-[10000]"><ChevronRight size={40}/></button>
    </div>
  );
};

const SuccessModal = ({ isOpen, onClose, title, message, actionLabel, onAction }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl scale-100 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title || "Sucesso!"}</h2>
        <p className="text-gray-600 mb-8">{message}</p>
        <div className="space-y-3">
          <Button className="w-full justify-center" onClick={onAction}>{actionLabel || "Continuar"}</Button>
        </div>
      </div>
    </div>
  );
};

const VoucherModal = ({ isOpen, onClose, trip }) => {
  if (!isOpen || !trip) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-brand-500 p-6 text-white text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24}/></button>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Ticket size={24} />
          </div>
          <h2 className="text-xl font-bold">Voucher de Reserva</h2>
          <p className="text-brand-100 text-sm">Apresente este código na entrada</p>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <div className="text-center mb-8 border-b border-dashed border-gray-200 pb-8">
            <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">CÓDIGO DA RESERVA</p>
            <p className="text-3xl font-mono font-bold text-gray-900">#{trip.id.slice(0, 6).toUpperCase()}</p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-gray-500 text-sm">Local</p>
              <p className="font-bold text-gray-900 text-lg">{trip.itemName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Data</p>
                <p className="font-bold text-gray-900">{trip.date.split('-').reverse().join('/')}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Horário</p>
                <p className="font-bold text-gray-900">09:00 - 18:00</p>
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Responsável</p>
              <p className="font-bold text-gray-900">{trip.guestName}</p>
              <p className="text-sm text-gray-600">{trip.guestEmail}</p>
              <p className="text-sm text-gray-600">{trip.guestPhone}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Ingressos</p>
              <p className="font-bold text-gray-900">{trip.adults} Adultos, {trip.children} Crianças</p>
              {trip.pets > 0 && <p className="text-sm text-gray-600">+ {trip.pets} Pets</p>}
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <Button className="w-full justify-center" onClick={() => window.print()}>Imprimir Voucher</Button>
        </div>
      </div>
    </div>
  );
};

const SimpleCalendar = ({ availableDays = [0,1,2,3,4,5,6], onDateSelect, selectedDate, setToast }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  const isAvailable = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const isPast = date < new Date().setHours(0,0,0,0);
    return availableDays.includes(date.getDay()) && !isPast;
  };

  const handleDayClick = (day) => {
    if (isAvailable(day)) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      onDateSelect(date.toISOString().split('T')[0]); 
    } else {
      if(setToast) setToast("Ops! O day use não funciona neste dia ou a data já passou.");
      else alert("Data indisponível.");
    }
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date.toISOString().split('T')[0] === selectedDate;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={20}/></button>
        <span className="font-bold text-gray-700">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20}/></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">{weekDays.map(d => <span key={d} className="text-xs text-gray-400 font-bold">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const available = isAvailable(day);
          const selected = isSelected(day);
          return (
            <button 
              key={day} 
              onClick={() => handleDayClick(day)}
              className={`
                h-8 w-8 rounded-full text-sm flex flex-col items-center justify-center transition-all relative
                ${selected ? 'bg-brand-500 text-white font-bold shadow-md' : ''}
                ${!selected && available ? 'hover:bg-brand-50 text-gray-700 font-medium' : ''}
                ${!available ? 'text-gray-300 cursor-not-allowed decoration-slice' : ''}
              `}
            >
              {day}
              {available && !selected && <span className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full"></span>}
            </button>
          )
        })}
      </div>
    </div>
  );
};

// --- TELAS DO SISTEMA ---

// 1. TELA DE LOGIN
const LoginPage = ({ onLogin }) => {
  useSEO("Login | Mapa do Day Use", "Acesse sua conta.", false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <User size={32} className="text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo de volta!</h1>
        <p className="text-gray-500 mb-8">Como você deseja acessar?</p>
        <div className="space-y-3">
          <button onClick={() => onLogin('user')} className="w-full p-4 border border-gray-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all flex items-center gap-4 group">
            <div className="bg-gray-100 p-2 rounded-full group-hover:bg-white"><User size={20}/></div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Sou Viajante</p>
              <p className="text-xs text-gray-500">Quero reservar day uses</p>
            </div>
            <ChevronRight className="ml-auto text-gray-400"/>
          </button>
          <button onClick={() => onLogin('partner')} className="w-full p-4 border border-gray-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all flex items-center gap-4 group">
            <div className="bg-gray-100 p-2 rounded-full group-hover:bg-white"><LayoutDashboard size={20}/></div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Sou Parceiro</p>
              <p className="text-xs text-gray-500">Gerenciar meu estabelecimento</p>
            </div>
            <ChevronRight className="ml-auto text-gray-400"/>
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. CHECKOUT (Pagamento)
const CheckoutPage = ({ bookingData, onConfirm, onBack, user }) => {
  useSEO("Pagamento Seguro | Mapa do Day Use", "Finalize sua reserva.", false);

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [guestDetails, setGuestDetails] = useState({
    name: user?.name || '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!guestDetails.name) newErrors.name = "Nome é obrigatório";
    if (!guestDetails.email.includes('@')) newErrors.email = "E-mail inválido";
    const phoneClean = guestDetails.phone.replace(/\D/g, '');
    if (phoneClean.length < 10) newErrors.phone = "Telefone inválido (mínimo 10 dígitos)";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePay = () => {
    if (!validate()) return;
    
    setLoading(true);
    setTimeout(() => {
      onConfirm(guestDetails);
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-20 px-4 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-brand-600 mb-6 font-medium">
        <ChevronLeft size={20}/> Voltar para detalhes
      </button>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Confirmar e Pagar</h1>
          
          <div className="space-y-6">
            
            {/* Dados do Hóspede (Se não tiver logado ou para confirmar) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User size={20}/> Seus Dados</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome Completo</label>
                  <input 
                    className={`w-full border rounded-lg p-3 ${errors.name ? 'border-red-500' : ''}`} 
                    value={guestDetails.name}
                    onChange={e => setGuestDetails({...guestDetails, name: e.target.value})}
                    placeholder="Ex: Maria Silva"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">E-mail</label>
                    <input 
                      className={`w-full border rounded-lg p-3 ${errors.email ? 'border-red-500' : ''}`} 
                      value={guestDetails.email}
                      onChange={e => setGuestDetails({...guestDetails, email: e.target.value})}
                      placeholder="seu@email.com"
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">WhatsApp</label>
                    <input 
                      className={`w-full border rounded-lg p-3 ${errors.phone ? 'border-red-500' : ''}`} 
                      value={guestDetails.phone}
                      onChange={e => setGuestDetails({...guestDetails, phone: e.target.value})}
                      placeholder="(00) 90000-0000"
                    />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CreditCard size={20}/> Pagamento</h3>
              <div className="flex gap-4 mb-6">
                <button 
                  onClick={() => setPaymentMethod('credit')}
                  className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'credit' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <CreditCard size={24}/> Cartão
                </button>
                <button 
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'pix' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <div className="font-bold text-xl">PIX</div> Pix
                </button>
              </div>

              {paymentMethod === 'credit' ? (
                <div className="space-y-4 animate-fade-in">
                  <input className="w-full border rounded-lg p-3" placeholder="Número do Cartão" />
                  <div className="grid grid-cols-2 gap-4">
                    <input className="w-full border rounded-lg p-3" placeholder="Validade (MM/AA)" />
                    <input className="w-full border rounded-lg p-3" placeholder="CVV" />
                  </div>
                  <input className="w-full border rounded-lg p-3" placeholder="Nome no Cartão" />
                </div>
              ) : (
                <div className="text-center py-8 animate-fade-in">
                  <div className="w-48 h-48 bg-gray-100 mx-auto mb-4 rounded-xl flex items-center justify-center text-gray-400">QR Code</div>
                  <p className="text-sm text-gray-500">O código será gerado após confirmar.</p>
                </div>
              )}
            </div>

            <Button onClick={handlePay} disabled={loading} className="w-full text-lg py-4 shadow-xl">
              {loading ? 'Processando...' : `Pagar ${formatBRL(bookingData.total)}`}
            </Button>
            <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1"><Info size={12}/> Ambiente seguro. Seus dados estão protegidos.</p>
          </div>
        </div>

        {/* Direita: Resumo */}
        <div>
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl sticky top-24">
            <div className="flex gap-4 mb-6">
              <img src={bookingData.item.image} className="w-24 h-24 rounded-xl object-cover" />
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Day Use em</p>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{bookingData.item.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{bookingData.item.city}</p>
                <div className="flex items-center gap-1 text-xs font-bold mt-2"><Star size={12} className="text-yellow-500 fill-yellow-500"/> 5.0</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <h4 className="font-bold text-gray-900">Detalhes do preço</h4>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Adultos ({bookingData.adults}x)</span>
                <span>{formatBRL(bookingData.adults * bookingData.item.priceAdult)}</span>
              </div>
              {bookingData.children > 0 && (
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Crianças ({bookingData.children}x)</span>
                  <span>{formatBRL(bookingData.children * bookingData.item.priceChild)}</span>
                </div>
              )}
              {bookingData.pets > 0 && (
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Taxa Pet ({bookingData.pets}x)</span>
                  <span>{formatBRL(bookingData.pets * bookingData.item.petFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Taxa de serviço</span>
                <span>R$ 0,00</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between items-center">
              <span className="font-bold text-gray-900 text-lg">Total (BRL)</span>
              <span className="font-bold text-brand-600 text-2xl">{formatBRL(bookingData.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. DASHBOARD DO PARCEIRO
const PartnerDashboard = ({ onEditItem, onViewReservations }) => {
  useSEO("Painel do Parceiro", "Gerencie seus anúncios.", false);

  const [items, setItems] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const qItems = await getDocs(collection(db, "dayuses"));
      const listItems = [];
      qItems.forEach((doc) => listItems.push({ id: doc.id, ...doc.data() }));
      setItems(listItems);

      const qRes = await getDocs(collection(db, "reservations"));
      const listRes = [];
      qRes.forEach((doc) => listRes.push({ id: doc.id, ...doc.data() }));
      setReservations(listRes); 

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel do Parceiro</h1>
      <p className="text-gray-500 mb-8">Gerencie seus anúncios e reservas.</p>

      {/* Stats Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Faturamento Total</p>
          <p className="text-3xl font-bold text-brand-600 mt-2">{formatBRL(reservations.reduce((acc, curr) => acc + curr.total, 0))}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Reservas Confirmadas</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{reservations.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Day Uses Ativos</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{items.length}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Lista de Reservas */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><List size={20}/> Últimas Reservas</h2>
          <div className="space-y-4">
            {reservations.length === 0 ? <p className="text-gray-400">Nenhuma reserva ainda.</p> : reservations.map(res => (
              <div key={res.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">{res.guestName || "Cliente"}</p>
                  <p className="text-xs text-gray-500">{res.date.split('-').reverse().join('/')} • {res.adults} Ad, {res.children} Cr</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-600">{formatBRL(res.total)}</p>
                  <Badge type="green">Confirmado</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meus Locais */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><MapIcon size={20}/> Meus Locais</h2>
            <Button className="py-2 px-4 text-sm" onClick={onEditItem}>+ Novo</Button>
          </div>
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex gap-4 items-center">
                <img src={item.image} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.city}</p>
                </div>
                <Button variant="ghost" className="mr-2" onClick={() => alert("Editar em breve!")}>Editar</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. DASHBOARD DO USUÁRIO
const UserDashboard = () => {
  useSEO("Minhas Viagens", "Gerencie suas reservas.", false);

  const [myTrips, setMyTrips] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  
  useEffect(() => {
    async function load() {
      const q = await getDocs(collection(db, "reservations"));
      const list = [];
      q.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setMyTrips(list);
    }
    load();
  }, []);

  const handleCancel = async (id) => {
    if(confirm("Deseja realmente cancelar esta reserva?")) {
      alert("Solicitação de cancelamento enviada!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
      <VoucherModal isOpen={!!selectedVoucher} trip={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
      
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Minhas Viagens</h1>
      
      {myTrips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
          <p className="text-gray-500">Você ainda não tem reservas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {myTrips.map(trip => (
            <div key={trip.id} className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
              <div className="md:w-48 h-32 md:h-auto bg-gray-100 relative">
                 <img src={trip.itemImage} className="w-full h-full object-cover" />
                 <div className="absolute top-2 left-2"><Badge type="green">Confirmada</Badge></div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900">{trip.itemName}</h3>
                    <p className="text-gray-500 flex items-center gap-1 text-sm mt-1"><CalendarIcon size={14}/> {trip.date.split('-').reverse().join('/')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-bold">Total Pago</p>
                    <p className="font-bold text-xl text-brand-600">{formatBRL(trip.total)}</p>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-4 pt-4 border-t border-gray-50">
                  <div className="flex-1 text-sm text-gray-600">
                    Reserva para <strong>{trip.adults} Adultos</strong>, <strong>{trip.children} Crianças</strong>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedVoucher(trip)} className="text-sm text-brand-600 font-bold hover:underline flex items-center gap-1"><Ticket size={14}/> Ver Voucher</button>
                    <button onClick={() => handleCancel(trip.id)} className="text-sm text-red-500 font-bold hover:underline">Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- HOME PAGE (DESIGN CORRIGIDO: TEXTO EMBAIXO DA IMAGEM) ---

const HomePage = ({ items, onSelect, loading }) => {
  useSEO("Day Use em BH e Região | Mapa do Day Use", "Encontre e reserve os melhores day uses em hotéis e resorts.", true);

  const [searchTerm, setSearchTerm] = useState("");
  const filtered = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.location.toLowerCase().includes(searchTerm.toLowerCase()));
  
  return (
    <div className="animate-fade-in pb-20">
      <div className="bg-brand-900 text-white pt-16 pb-24 px-6 rounded-3xl shadow-xl mb-12 max-w-6xl mx-4 md:mx-auto mt-6 relative overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Relaxe perto de casa.</h1>
          <p className="text-brand-100 mb-8 text-lg font-light">Os melhores Day Uses de BH selecionados para você.</p>
          <div className="bg-white p-2 pl-4 rounded-full shadow-2xl flex items-center max-w-lg mx-auto transform transition-transform focus-within:scale-105">
            <Search className="text-gray-400 ml-2" size={20} />
            <input 
              className="flex-1 px-4 py-2 text-gray-700 outline-none bg-transparent placeholder:text-gray-400 font-medium"
              placeholder="Busque por nome ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-brand-500 text-white p-3 rounded-full hover:bg-brand-600 transition-colors shadow-md"><ArrowRight size={20} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {loading ? <div className="text-center py-20 text-gray-500">Carregando...</div> : 
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(item => (
              <div key={item.id} onClick={() => onSelect(item)} className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden border border-gray-100 group transition-all duration-300">
                {/* CORREÇÃO VISUAL: Imagem em cima, texto em baixo */}
                <div className="h-56 overflow-hidden relative bg-gray-100">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                    <Star size={12} className="text-yellow-500 fill-yellow-500"/> 5.0
                  </span>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-gray-900 text-xl leading-tight mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14}/> {item.city} - {item.state}</p>
                  </div>
                  <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">A partir de</p>
                      <p className="text-brand-600 font-bold text-2xl">{formatBRL(item.priceAdult || item.price)}</p>
                    </div>
                    <span className="text-sm font-semibold text-brand-500 bg-brand-50 px-4 py-2 rounded-xl group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                      Reservar
                    </span>
                  </div>
                </div>
              </div>
            ))}
         </div>
        }
      </div>
    </div>
  );
};

// --- TELA: PARCEIRO ---
const PartnerPage = ({ onSave, onViewCreated }) => {
  useSEO("Área do Parceiro", "Cadastre seu day use.", true);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', cep: '', street: '', number: '', district: '', city: '', state: '',
    description: '', videoUrl: '',
    images: ['', '', '', '', '', '', '', '', '', ''],
    priceAdult: '', priceChild: '',
    adultAgeStart: '12', childAgeStart: '2', childAgeEnd: '11',
    availableDays: [0, 6],
    petAllowed: false, petSize: 'Pequeno porte', petFee: '',
    includedItems: '', notIncludedItems: '', usageRules: '', cancellationPolicy: '', observations: ''
  });

  const handleCepBlur = async () => {
    if (formData.cep.length >= 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${formData.cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({ ...prev, street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf }));
        }
      } catch (error) { console.error("Erro CEP:", error); } finally { setCepLoading(false); }
    }
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({...formData, images: newImages});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const mainImage = formData.images[0]; 
    const dataToSave = {
      ...formData,
      image: mainImage,
      location: `${formData.street}, ${formData.number}`, 
      priceAdult: Number(formData.priceAdult),
      priceChild: Number(formData.priceChild),
      petFee: Number(formData.petFee) || 0,
      adultAgeStart: Number(formData.adultAgeStart),
      childAgeStart: Number(formData.childAgeStart),
      childAgeEnd: Number(formData.childAgeEnd),
      image2: formData.images[1], image3: formData.images[2], image4: formData.images[3],
      image5: formData.images[4], image6: formData.images[5], image7: formData.images[6],
      image8: formData.images[7], image9: formData.images[8], image10: formData.images[9],
      createdAt: new Date()
    };
    const savedItem = await onSave(dataToSave);
    setCreatedItem(savedItem); 
    setLoading(false);
    setShowModal(true);
  };

  const toggleDay = (dayIndex) => {
    if (formData.availableDays.includes(dayIndex)) {
      setFormData({...formData, availableDays: formData.availableDays.filter(d => d !== dayIndex)});
    } else {
      setFormData({...formData, availableDays: [...formData.availableDays, dayIndex]});
    }
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="max-w-3xl mx-auto pt-12 px-4 animate-fade-in pb-20">
      <SuccessModal 
        isOpen={showModal} 
        onClose={() => {setShowModal(false); setFormData({...formData, name: ''}); window.scrollTo(0,0);}} 
        onViewPage={() => onViewCreated(createdItem)} 
        title="Parabéns!"
        message="A página do seu Day Use foi criada e já pode receber reservas."
        actionLabel="Ver Página Criada"
      />

      <div className="text-center mb-10"><h1 className="text-3xl font-bold text-gray-900 mb-2">Área do Parceiro</h1><p className="text-gray-500 text-lg">Cadastro completo do estabelecimento.</p></div>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl space-y-8">
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 border-b pb-2">1. Informações e Localização</h3>
          <div><label className="block text-sm font-medium mb-1">Nome do Local</label><input required className="w-full border rounded-lg p-3" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Pousada do Sol"/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">CEP</label><div className="relative"><input required className="w-full border rounded-lg p-3" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} onBlur={handleCepBlur} placeholder="00000-000"/>{cepLoading && <div className="absolute right-3 top-3 animate-spin rounded-full h-5 w-5 border-b-2 border-brand-500"></div>}</div></div>
            <div><label className="block text-sm font-medium mb-1">Número</label><input required className="w-full border rounded-lg p-3" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Cidade</label><input required disabled className="w-full border rounded-lg p-3 bg-gray-50" value={formData.city} /></div>
            <div><label className="block text-sm font-medium mb-1">Estado</label><input required disabled className="w-full border rounded-lg p-3 bg-gray-50" value={formData.state} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Logradouro</label><input required className="w-full border rounded-lg p-3" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Link do Vídeo (YouTube)</label><input className="w-full border rounded-lg p-3" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} placeholder="https://youtube.com/watch?v=..."/></div>
          <div><label className="block text-sm font-medium mb-1">Descrição Comercial</label><textarea required className="w-full border rounded-lg p-3 h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><ImageIcon size={20}/> 2. Galeria de Fotos (Máx 10)</h3>
          <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-4"><p className="font-bold flex items-center gap-1 mb-1"><Info size={16}/> Dicas para boas fotos:</p><ul className="list-disc list-inside"><li>Use fotos na horizontal (paisagem).</li><li>Cole o link direto da imagem (terminado em .jpg ou .png).</li></ul></div>
          <div className="space-y-3">{formData.images.map((img, index) => (<div key={index} className="flex gap-2 items-center"><span className="text-xs font-bold text-gray-400 w-6">#{index + 1}</span><input className={`w-full border rounded-lg p-2 text-sm ${index === 0 ? 'border-brand-300 ring-1 ring-brand-100' : ''}`} value={img} onChange={e => handleImageChange(index, e.target.value)} placeholder={index === 0 ? "URL da Foto de Capa (Obrigatória)" : "URL da Foto Adicional"} required={index === 0} /></div>))}</div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 border-b pb-2">3. Preços e Público</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold text-brand-600 mb-1">Preço Adulto (R$)</label><input required type="number" className="w-full border rounded-lg p-3 font-bold" value={formData.priceAdult} onChange={e => setFormData({...formData, priceAdult: e.target.value})}/></div>
            <div><label className="block text-sm font-medium text-gray-500 mb-1">Idade Mín. Adulto</label><input required type="number" className="w-full border rounded-lg p-3" value={formData.adultAgeStart} onChange={e => setFormData({...formData, adultAgeStart: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-bold text-brand-600 mb-1">Preço Criança (R$)</label><input required type="number" className="w-full border rounded-lg p-3 font-bold" value={formData.priceChild} onChange={e => setFormData({...formData, priceChild: e.target.value})}/></div>
            <div><label className="block text-sm font-medium text-gray-500 mb-1">Idade Mín.</label><input required type="number" className="w-full border rounded-lg p-3" value={formData.childAgeStart} onChange={e => setFormData({...formData, childAgeStart: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-500 mb-1">Idade Máx.</label><input required type="number" className="w-full border rounded-lg p-3" value={formData.childAgeEnd} onChange={e => setFormData({...formData, childAgeEnd: e.target.value})} /></div>
          </div>
        </div>

        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2"><input type="checkbox" id="petCheck" className="w-5 h-5 accent-brand-600" checked={formData.petAllowed} onChange={e => setFormData({...formData, petAllowed: e.target.checked})} /><label htmlFor="petCheck" className="font-bold text-gray-900 cursor-pointer select-none">Aceita Pets?</label></div>
          {formData.petAllowed && (<div className="grid grid-cols-2 gap-4 pl-7 animate-fade-in"><div><label className="block text-sm font-medium mb-1">Porte Permitido</label><select className="w-full border rounded-lg p-3 bg-white" value={formData.petSize} onChange={e => setFormData({...formData, petSize: e.target.value})}><option>Pequeno porte</option><option>Médio porte</option><option>Grande porte</option><option>Qualquer porte</option></select></div><div><label className="block text-sm font-medium mb-1">Taxa por Pet (R$)</label><input type="number" className="w-full border rounded-lg p-3" value={formData.petFee} onChange={e => setFormData({...formData, petFee: e.target.value})} /></div></div>)}
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 border-b pb-2">4. Dias de Funcionamento</h3>
          <div className="flex gap-2 flex-wrap">{weekDays.map((day, index) => (<button key={day} type="button" onClick={() => toggleDay(index)} className={`px-4 py-2 rounded-lg font-medium transition-all ${formData.availableDays.includes(index) ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>{day}</button>))}</div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 border-b pb-2">5. Detalhes e Regras</h3>
          <p className="text-xs text-gray-500">Escreva um item por linha.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-green-700 mb-1">O que está incluso</label><textarea className="w-full border rounded-lg p-3 h-24" placeholder="Ex: Almoço&#10;Piscina" value={formData.includedItems} onChange={e => setFormData({...formData, includedItems: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-red-600 mb-1">O que NÃO está incluso</label><textarea className="w-full border rounded-lg p-3 h-24" placeholder="Ex: Bebidas" value={formData.notIncludedItems} onChange={e => setFormData({...formData, notIncludedItems: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Regras de Utilização</label><textarea className="w-full border rounded-lg p-3 h-24" placeholder="Ex: Proibido som automotivo..." value={formData.usageRules} onChange={e => setFormData({...formData, usageRules: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Política de Cancelamento</label><textarea className="w-full border rounded-lg p-3 h-24" value={formData.cancellationPolicy} onChange={e => setFormData({...formData, cancellationPolicy: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Outras Observações</label><textarea className="w-full border rounded-lg p-3 h-24" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} /></div>
        </div>

        <Button type="submit" className="w-full text-lg py-4" disabled={loading}>{loading ? "Salvando..." : "Finalizar Cadastro"}</Button>
      </form>
    </div>
  );
};

// --- TELA: DETALHES ---
const DetailsPage = ({ item, onBack, onBook }) => {
  useSEO(`${item.name} - Ingressos`, `Reserva de Day Use no ${item.name}.`, true);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [toast, setToast] = useState(null);

  const adultPrice = item.priceAdult || 0;
  const childPrice = item.priceChild || 0;
  const petFee = item.petFee || 0;
  const total = (adults * adultPrice) + (children * childPrice) + (pets * petFee);

  const renderList = (text) => text ? text.split('\n').map((line, i) => <li key={i}>{line}</li>) : null;
  const youtubeId = getYoutubeId(item.videoUrl);
  const images = [item.image, item.image2, item.image3, item.image4, item.image5, item.image6, item.image7, item.image8, item.image9, item.image10].filter(Boolean);

  const openGallery = (index) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  return (
    <>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <ImageGallery images={images} isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} startIndex={galleryIndex} />

      <div className="max-w-6xl mx-auto pb-20 pt-8 px-4 animate-fade-in relative">
        <button onClick={onBack} className="mb-6 text-gray-500 hover:text-brand-600 flex items-center gap-2 font-medium transition-colors">
          <div className="bg-white p-2 rounded-full border border-gray-200 hover:border-brand-200 transition-colors"><ArrowRight size={16} className="rotate-180"/></div>
          Voltar
        </button>
        
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-4 gap-2 h-[300px] md:h-[400px] rounded-3xl overflow-hidden shadow-lg border border-gray-100 group">
              <div className={`relative ${images.length > 1 ? 'col-span-3' : 'col-span-4'} h-full cursor-pointer`} onClick={() => openGallery(0)}>
                <img src={images[0]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors"></div>
              </div>
              {images.length > 1 && (
                <div className="col-span-1 grid grid-rows-3 gap-2 h-full">
                  {images.slice(1, 4).map((img, i) => (
                    <div key={i} className="relative overflow-hidden bg-gray-100 cursor-pointer h-full" onClick={() => openGallery(i + 1)}>
                      <img src={img} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                      {i === 2 && images.length > 4 && (<div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">+{images.length - 4}</div>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{item.name}</h1>
              <p className="text-gray-500 flex items-center gap-2 text-lg"><MapPin size={20} className="text-brand-500"/> {item.city} - {item.state}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              <div>
                <h3 className="font-bold text-xl mb-4 text-brand-900 flex items-center gap-2"><FileText size={20}/> Sobre o local</h3>
                <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">{item.description}</p>
              </div>
              {youtubeId && (<div className="rounded-2xl overflow-hidden shadow-md aspect-video"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${youtubeId}`} title="Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>)}
              
              {/* Infos em Grid Desktop */}
              <div className="hidden md:grid md:grid-cols-2 gap-6">
                {item.includedItems && (<div><h4 className="font-bold text-green-700 mb-2 flex items-center gap-1"><CheckCircle size={16}/> O que está incluso</h4><ul className="list-disc list-inside text-gray-600 text-sm space-y-1">{renderList(item.includedItems)}</ul></div>)}
                {item.notIncludedItems && (<div><h4 className="font-bold text-red-600 mb-2 flex items-center gap-1"><Ban size={16}/> Não está incluso</h4><ul className="list-disc list-inside text-gray-600 text-sm space-y-1">{renderList(item.notIncludedItems)}</ul></div>)}
              </div>
              {/* Infos em Accordion Mobile */}
              <div className="md:hidden space-y-2">
                {item.includedItems && (<Accordion title="O que está incluso" icon={CheckCircle}><ul className="list-disc list-inside text-gray-600 space-y-1">{renderList(item.includedItems)}</ul></Accordion>)}
                {item.notIncludedItems && (<Accordion title="Não está incluso" icon={Ban}><ul className="list-disc list-inside text-gray-600 space-y-1">{renderList(item.notIncludedItems)}</ul></Accordion>)}
                {item.usageRules && (<Accordion title="Regras de Utilização" icon={AlertCircle}><div className="whitespace-pre-line">{item.usageRules}</div></Accordion>)}
              </div>

              {/* Pets e Cancelamento Desktop */}
              <div className="hidden md:block">
                {(item.usageRules || item.petAllowed) && (<div className="mt-4"><h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1"><AlertCircle size={16}/> Regras e Pets</h4><div className="text-gray-600 text-sm space-y-2">{item.petAllowed ? (<p className="text-green-600 font-medium flex items-center gap-1"><PawPrint size={14}/> Aceitamos Pets! - {item.petSize} - Taxa: {formatBRL(item.petFee)}</p>) : (<p className="text-red-500 font-medium flex items-center gap-1"><Ban size={14}/> Não aceitamos Pets.</p>)}{item.usageRules && <div className="whitespace-pre-line mt-2">{item.usageRules}</div>}</div></div>)}
                {item.cancellationPolicy && (<div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4"><h4 className="font-bold text-gray-800 mb-1 text-sm">Política de Cancelamento</h4><p className="text-xs text-gray-500 whitespace-pre-line">{item.cancellationPolicy}</p></div>)}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 sticky top-24">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Ingressos a partir de</span>
                <span className="text-2xl font-bold text-brand-600">{formatBRL(adultPrice)}</span>
              </div>
              <div className="space-y-6">
                <div><label className="text-sm font-bold text-gray-700 mb-2 block flex items-center gap-2">Datas disponíveis<span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Clique nos dias</span></label><SimpleCalendar availableDays={item.availableDays || [0,1,2,3,4,5,6]} onDateSelect={setDate} selectedDate={date} setToast={setToast}/>{date && <p className="text-xs text-brand-600 font-bold mt-1 text-center bg-brand-50 py-1 rounded">Selecionado: {date.split('-').reverse().join('/')}</p>}</div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200"><div className="flex justify-between items-start mb-2"><div><p className="text-sm font-bold text-gray-800">Adultos</p><p className="text-xs text-gray-500">Acima de {item.adultAgeStart || 12} anos</p></div><span className="text-sm font-bold text-brand-600">{formatBRL(adultPrice)}</span></div><div className="flex items-center justify-between bg-white p-1 rounded-lg border border-gray-200"><button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-8 h-8 rounded hover:bg-gray-100 text-brand-600 font-bold">-</button><span className="font-bold text-lg w-8 text-center">{adults}</span><button onClick={() => setAdults(Math.min(20, adults + 1))} className="w-8 h-8 rounded bg-brand-500 text-white font-bold hover:bg-brand-600">+</button></div></div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200"><div className="flex justify-between items-start mb-2"><div><p className="text-sm font-bold text-gray-800">Crianças</p><p className="text-xs text-gray-500">{item.childAgeStart || 2} a {item.childAgeEnd || 11} anos</p></div><span className="text-sm font-bold text-brand-600">{formatBRL(childPrice)}</span></div><div className="flex items-center justify-between bg-white p-1 rounded-lg border border-gray-200"><button onClick={() => setChildren(Math.max(0, children - 1))} className="w-8 h-8 rounded hover:bg-gray-100 text-brand-600 font-bold">-</button><span className="font-bold text-lg w-8 text-center">{children}</span><button onClick={() => setChildren(Math.min(10, children + 1))} className="w-8 h-8 rounded bg-brand-500 text-white font-bold hover:bg-brand-600">+</button></div></div>
                {item.petAllowed && (<div className="bg-gray-50 p-3 rounded-xl border border-gray-200"><div className="flex justify-between items-start mb-2"><div><p className="text-sm font-bold text-gray-800 flex items-center gap-1"><PawPrint size={14}/> Pets</p><p className="text-xs text-gray-500 font-medium text-brand-600">{item.petSize}</p></div><span className="text-sm font-bold text-brand-600">{formatBRL(petFee)}</span></div><div className="flex items-center justify-between bg-white p-1 rounded-lg border border-gray-200"><button onClick={() => setPets(Math.max(0, pets - 1))} className="w-8 h-8 rounded hover:bg-gray-100 text-brand-600 font-bold">-</button><span className="font-bold text-lg w-8 text-center">{pets}</span><button onClick={() => setPets(Math.min(5, pets + 1))} className="w-8 h-8 rounded bg-brand-500 text-white font-bold hover:bg-brand-600">+</button></div></div>)}
                <div className="pt-2 border-t border-dashed border-gray-200"><div className="flex justify-between items-center mb-4 mt-4"><span className="text-gray-600 font-medium">Total Geral</span><span className="text-3xl font-bold text-brand-600">{formatBRL(total)}</span></div><Button className="w-full text-lg shadow-xl shadow-brand-500/20 py-4" disabled={!date} onClick={() => onBook({ item, date, adults, children, pets, total })}>Pagar e Reservar</Button></div>
              </div>
            </div>
            {/* Cancelamento Mobile */}
            <div className="block md:hidden">
              {item.cancellationPolicy && (<div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4"><h4 className="font-bold text-gray-800 mb-1 text-sm flex items-center gap-2"><Info size={16}/> Política de Cancelamento</h4><p className="text-xs text-gray-500 whitespace-pre-line">{item.cancellationPolicy}</p></div>)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// --- APP PRINCIPAL E ROTEAMENTO ---

export default function App() {
  const [view, setView] = useState("home"); 
  const [user, setUser] = useState(null); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [dayUses, setDayUses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const q = await getDocs(collection(db, "dayuses"));
        const list = [];
        q.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setDayUses(list);
      } catch (error) { console.error("Erro:", error); } finally { setLoading(false); }
    }
    loadData();
  }, []);

  const handleLogin = (role) => {
    setUser({ role, name: role === 'partner' ? 'Pousada do Sol' : 'Viajante' });
    setView(role === 'partner' ? 'partner-dashboard' : 'home');
  };

  const handleLogout = () => { setUser(null); setView('home'); };

  // Fluxo de reserva simplificado: Não exige login antes
  const goToCheckout = (data) => {
    setBookingData(data);
    setView('checkout');
    window.scrollTo(0,0);
  };

  const handleConfirmBooking = async (guestDetails) => {
    try {
      await addDoc(collection(db, "reservations"), {
        ...bookingData,
        userId: user ? 'user_123' : 'guest',
        guestName: guestDetails.name,
        guestEmail: guestDetails.email,
        guestPhone: guestDetails.phone,
        itemName: bookingData.item.name,
        itemImage: bookingData.item.image,
        createdAt: new Date(),
        status: 'confirmed'
      });
      // Se não estiver logado, loga automaticamente como usuário
      if (!user) setUser({ role: 'user', name: guestDetails.name.split(' ')[0] });
      setShowConfirmModal(true);
    } catch (e) {
      console.error(e);
      alert("Erro ao processar reserva.");
    }
  };

  const handleViewCreated = (item) => { setSelectedItem(item); setView('details'); window.scrollTo(0,0); };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-brand-100 flex flex-col">
      <SuccessModal 
        isOpen={showConfirmModal} 
        onClose={() => {setShowConfirmModal(false); setView('home');}} 
        onViewPage={() => {setShowConfirmModal(false); setView('user-dashboard');}} 
        title="Reserva Confirmada!"
        message="Sua reserva foi realizada com sucesso. Você recebeu um e-mail com os detalhes."
        actionLabel="Ver Minhas Viagens"
      />

      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setView("home")}>
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} />
            <div style={{display:'none'}} className="flex items-center gap-2 font-bold text-xl tracking-tight text-brand-600"><MapPin className="text-brand-500" /> Mapa do Day Use</div>
          </div>
          
          <div className="flex gap-4 items-center">
             {!user ? (
               <Button variant="ghost" onClick={() => setView('login')} className="font-bold">Entrar</Button>
             ) : (
               <div className="flex items-center gap-4">
                 {user.role === 'partner' && <Button variant="ghost" onClick={() => setView('partner-dashboard')} className={view === 'partner-dashboard' ? 'text-brand-600 bg-brand-50' : ''}>Painel</Button>}
                 {user.role === 'user' && <Button variant="ghost" onClick={() => setView('user-dashboard')} className={view === 'user-dashboard' ? 'text-brand-600 bg-brand-50' : ''}>Minhas Viagens</Button>}
                 <div className="flex items-center gap-2 cursor-pointer group relative" onClick={handleLogout}>
                    <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold">{user.name[0]}</div>
                    <LogOut size={16} className="text-gray-400 hover:text-red-500"/>
                 </div>
               </div>
             )}
             {!user && (
                <button onClick={() => {setUser({role: 'partner', name: 'Parceiro'}); setView('partner-new')}} className="hidden md:flex text-sm font-semibold text-gray-500 hover:text-brand-600 items-center gap-2 transition-colors">
                  Sou Parceiro
                </button>
             )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="flex-1">
        {view === 'home' && <HomePage items={dayUses} onSelect={(item) => {setSelectedItem(item); setView('details'); window.scrollTo(0,0)}} loading={loading} />}
        {view === 'details' && selectedItem && <DetailsPage item={selectedItem} onBack={() => setView('home')} onBook={goToCheckout} />}
        {view === 'login' && <LoginPage onLogin={handleLogin} />}
        {view === 'checkout' && bookingData && <CheckoutPage bookingData={bookingData} onConfirm={handleConfirmBooking} onBack={() => setView('details')} user={user} />}
        {view === 'partner-dashboard' && <PartnerDashboard onEditItem={() => setView('partner-new')} onViewReservations={() => {}} />}
        {view === 'user-dashboard' && <UserDashboard />}
        {view === 'partner-new' && <PartnerPage onSave={async (item) => {const docRef = await addDoc(collection(db, "dayuses"), item); setDayUses([{id: docRef.id, ...item}, ...dayUses]); return {id: docRef.id, ...item};}} onViewCreated={handleViewCreated} />}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-12 mt-auto">
         <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-brand-900 font-bold text-lg mb-2">Mapa do Day Use</p>
            <p className="text-gray-400 text-sm">© 2026 Belo Horizonte - MG</p>
         </div>
      </footer>
    </div>
  );
}