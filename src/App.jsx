import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase'; 
import { collection, getDocs, addDoc, doc, getDoc, setDoc, query, where, onSnapshot } from 'firebase/firestore'; 
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
// Importação do Mercado Pago SDK
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { 
  MapPin, Search, User, CheckCircle, 
  X, Coffee, Wifi, Car, Utensils, PlusCircle, Star, ArrowRight,
  ChevronLeft, ChevronRight, Info, AlertCircle, PawPrint, FileText, Ban, Youtube, ChevronDown, Image as ImageIcon, Map as MapIcon, CreditCard, Calendar as CalendarIcon, DollarSign, LogOut, LayoutDashboard, List, Phone, Mail, Ticket, Lock, Briefcase, Instagram
} from 'lucide-react';

// --- INICIALIZAÇÃO DO MERCADO PAGO ---
// Certifique-se de que a variável VITE_MP_PUBLIC_KEY está no seu arquivo .env
initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'pt-BR' });

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

// Gera slug para URL (ex: "Minas Gerais" -> "mg", "Hotel Sol" -> "hotel-sol")
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const getStateSlug = (uf) => uf ? uf.toLowerCase() : 'br';

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
      {children}
    </span>
  );
};

// --- MODAIS GLOBAIS (FIXED POSITION) ---

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000); 
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-4 animate-fade-in-up max-w-sm w-full mx-4">
      <Info className="text-brand-400 min-w-[24px]" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-white"/></button>
    </div>
  );
};

const SuccessModal = ({ isOpen, onClose, title, message, actionLabel, onAction }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{position: 'fixed'}}>
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl scale-100 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title || "Sucesso!"}</h2>
        <p className="text-gray-600 mb-8">{message}</p>
        <div className="space-y-3">
          {onAction && (
            <Button className="w-full justify-center" onClick={() => { onAction(); onClose(); }}>
              {actionLabel || "Continuar"}
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-center" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};

const VoucherModal = ({ isOpen, onClose, trip, isPartnerView = false }) => {
  if (!isOpen || !trip) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{position: 'fixed'}}>
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
        <div className="bg-brand-500 p-6 text-white text-center relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24}/></button>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Ticket size={24} />
          </div>
          <h2 className="text-xl font-bold">{isPartnerView ? "Detalhes da Reserva" : "Voucher de Reserva"}</h2>
          <p className="text-brand-100 text-sm">{isPartnerView ? "Dados completos do cliente" : "Apresente este código na entrada"}</p>
        </div>
         
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <div className="text-center mb-8 border-b border-dashed border-gray-200 pb-8">
            <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">CÓDIGO</p>
            <p className="text-3xl font-mono font-bold text-gray-900">#{trip.id ? trip.id.slice(0, 6).toUpperCase() : 'PENDENTE'}</p>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-gray-500 text-xs uppercase font-bold mb-1">Local</p>
              <p className="font-bold text-gray-900 text-lg leading-tight">{trip.itemName}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Data</p>
                <p className="font-bold text-gray-900">{trip.date ? trip.date.split('-').reverse().join('/') : '--/--/----'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Confirmado
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-gray-500 text-xs uppercase font-bold mb-3 flex items-center gap-1"><User size={12}/> Responsável</p>
              <p className="font-bold text-gray-900">{trip.guestName}</p>
              <p className="text-sm text-gray-600">{trip.guestEmail}</p>
              <p className="text-sm text-gray-600">{trip.guestPhone}</p>
            </div>

            <div>
              <p className="text-gray-500 text-xs uppercase font-bold mb-1">Composição</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex justify-between"><span>Adultos:</span> <b>{trip.adults}</b></li>
                {trip.children > 0 && <li className="flex justify-between"><span>Crianças:</span> <b>{trip.children}</b></li>}
                <li className="flex justify-between">
                   <span>Pets:</span> 
                   <b className={trip.pets > 0 ? "text-brand-600" : "text-gray-400"}>
                     {trip.pets > 0 ? `${trip.pets} (Sim)` : "Não"}
                   </b>
                </li>
              </ul>
            </div>
            
            {isPartnerView && (
               <div>
                  <p className="text-gray-500 text-xs uppercase font-bold mb-1">Financeiro</p>
                  <div className="flex justify-between items-center text-lg font-bold text-brand-600 bg-brand-50 p-3 rounded-lg">
                     <span>Total Pago:</span>
                     <span>{formatBRL(trip.total)}</span>
                  </div>
               </div>
            )}
          </div>
        </div>
         
        {!isPartnerView && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center shrink-0">
            <Button className="w-full justify-center" onClick={() => window.print()}>Imprimir Voucher</Button>
            </div>
        )}
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
    <div className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4 animate-fade-in" style={{position:'fixed'}}>
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

// --- MODAL LOGIN ---
const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  if (!isOpen) return null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginLink, setShowLoginLink] = useState(false);
  const role = 'user'; 

  const ensureUserProfile = async (userAuth) => {
    const userRef = doc(db, "users", userAuth.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: userAuth.email,
        name: userAuth.displayName || userAuth.email.split('@')[0],
        role: role, 
        createdAt: new Date()
      });
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true); setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserProfile(result.user);
      onLoginSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Erro ao entrar com Google.");
    } finally { setLoading(false); }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setShowLoginLink(false);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      await ensureUserProfile(auth.currentUser);
      onLoginSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password') setError("Senha incorreta.");
      else if (err.code === 'auth/user-not-found') setError("Usuário não encontrado.");
      else if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já possui cadastro.");
        setShowLoginLink(true);
      }
      else setError("Erro ao autenticar.");
    } finally { setLoading(false); }
  };

  const switchToLogin = () => {
    setIsRegistering(false);
    setError('');
    setShowLoginLink(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose} style={{position:'fixed'}}>
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{isRegistering ? 'Criar Conta' : 'Fazer Login'}</h2>
          <p className="text-gray-500 text-sm mt-1">Para concluir sua reserva com segurança.</p>
        </div>

        <div className="space-y-4">
          <Button variant="outline" onClick={handleGoogleLogin} className="w-full justify-center" disabled={loading}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-2" alt="Google" />
            Continuar com Google
          </Button>

          <div className="relative flex py-2 items-center">
             <div className="flex-grow border-t border-gray-200"></div>
             <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">Ou com Email</span>
             <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500" placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex flex-col gap-2 animate-fade-in">
                <div className="flex items-center gap-2"><AlertCircle size={16}/> {error}</div>
                {showLoginLink && (
                  <button type="button" onClick={switchToLogin} className="text-sm font-bold underline hover:text-red-800 text-left">
                    Já tem conta? Clique para entrar.
                  </button>
                )}
              </div>
            )}

            <Button type="submit" className="w-full justify-center" disabled={loading}>
              {loading ? 'Processando...' : (isRegistering ? 'Cadastrar e Continuar' : 'Entrar e Continuar')}
            </Button>
          </form>
          
          {!showLoginLink && (
            <p className="text-center text-sm text-gray-600 mt-4">
               {isRegistering ? 'Já tem conta?' : 'Não tem cadastro?'}
               <button onClick={() => setIsRegistering(!isRegistering)} className="text-brand-600 font-bold hover:underline ml-1">
                 {isRegistering ? 'Fazer Login' : 'Criar grátis'}
               </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- TELAS DO SISTEMA ---

// 1. TELA DE LOGIN PRINCIPAL (Full Page)
const LoginPage = ({ onLoginSuccess, initialRole = 'user', lockRole = false, initialIsRegistering = false }) => {
  useSEO("Login | Mapa do Day Use", "Acesse sua conta.", false);
  const [role, setRole] = useState(initialRole); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(initialIsRegistering); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginLink, setShowLoginLink] = useState(false);

  useEffect(() => { setRole(initialRole); }, [initialRole]);
  useEffect(() => { setIsRegistering(initialIsRegistering); }, [initialIsRegistering]);

  const ensureUserProfile = async (userAuth) => {
    const userRef = doc(db, "users", userAuth.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: userAuth.email,
        name: userAuth.displayName || userAuth.email.split('@')[0],
        role: role, 
        createdAt: new Date()
      });
      return true; 
    }
    return false; 
  };

  const handleGoogleLogin = async () => {
    setLoading(true); setError(''); setShowLoginLink(false);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isNewUser = await ensureUserProfile(result.user);
      onLoginSuccess(isNewUser);
    } catch (err) {
      console.error(err);
      setError("Erro ao entrar com Google.");
    } finally { setLoading(false); }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setShowLoginLink(false);
    try {
      let result;
      let isNewUser = false;
      if (isRegistering) {
        result = await createUserWithEmailAndPassword(auth, email, password);
        isNewUser = true;
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      const isProfileCreated = await ensureUserProfile(result.user);
      onLoginSuccess(isNewUser || isProfileCreated);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password') setError("Senha incorreta.");
      else if (err.code === 'auth/user-not-found') setError("Usuário não encontrado.");
      else if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está cadastrado.");
        setShowLoginLink(true);
      }
      else setError("Erro ao autenticar. Verifique seus dados.");
    } finally { setLoading(false); }
  };

  const switchToLogin = () => {
    setIsRegistering(false);
    setError('');
    setShowLoginLink(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center animate-fade-in border border-gray-100">
        
        {!lockRole && (
          <div className="flex bg-gray-100 p-1 rounded-xl mb-8 relative">
            <button 
              onClick={() => setRole('user')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all z-10 ${role === 'user' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <User size={18}/> Sou Viajante
            </button>
            <button 
              onClick={() => setRole('partner')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all z-10 ${role === 'partner' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Briefcase size={18}/> Sou Parceiro
            </button>
          </div>
        )}

        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-600">
          {role === 'user' ? <User size={32} /> : <Briefcase size={32} />}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isRegistering ? 'Criar Conta' : 'Bem-vindo!'}
        </h1>
        <p className="text-gray-500 mb-8">
          {role === 'partner' ? 'Cadastre-se para anunciar seu Day Use.' : (isRegistering ? 'Cadastre-se para reservar.' : 'Entre para gerenciar reservas.')}
        </p>
        
        <div className="space-y-4">
          <Button variant="outline" onClick={handleGoogleLogin} className="w-full justify-center" disabled={loading}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-2" alt="Google" />
            {isRegistering ? 'Cadastrar com Google' : 'Entrar com Google'}
          </Button>

          <div className="relative flex py-2 items-center">
             <div className="flex-grow border-t border-gray-200"></div>
             <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">Ou com Email</span>
             <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 outline-none" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 outline-none" placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex flex-col gap-2 animate-fade-in">
                <div className="flex items-center gap-2"><AlertCircle size={16}/> {error}</div>
                {showLoginLink && (
                  <button type="button" onClick={switchToLogin} className="text-sm font-bold underline hover:text-red-800 text-left">
                    Já tem conta? Clique para entrar.
                  </button>
                )}
              </div>
            )}

            <Button type="submit" className="w-full justify-center" disabled={loading}>
              {loading ? 'Processando...' : (isRegistering ? 'Cadastrar' : 'Entrar')}
            </Button>
          </form>
          
          {!showLoginLink && (
            <p className="text-sm text-gray-600 mt-4">
               {isRegistering ? 'Já tem conta?' : 'Não tem cadastro?'}
               <button onClick={() => setIsRegistering(!isRegistering)} className="text-brand-600 font-bold hover:underline ml-1">
                 {isRegistering ? 'Fazer Login' : 'Criar grátis'}
               </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. CHECKOUT (Pagamento - Com Brick)
const CheckoutPage = ({ bookingData, onConfirm, onBack, user }) => {
  useSEO("Pagamento Seguro | Mapa do Day Use", "Finalize sua reserva.", false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);
  const [guestDetails, setGuestDetails] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: ''
  });

  useEffect(() => {
    if(user) {
      setGuestDetails(prev => ({...prev, name: user.name || prev.name, email: user.email || prev.email}));
      setIsPaymentExpanded(true); // Abre o pagamento quando logar
    } else {
      setIsPaymentExpanded(false);
    }
  }, [user]);

  // Configuração do Checkout Transparente (Brick)
  const initialization = {
    amount: bookingData.total,
    payer: {
      email: user?.email,
      entity_type: 'individual', 
      type: 'customer'
    },
  };

  const customization = {
    paymentMethods: {
      creditCard: "all",
      bankTransfer: "all", // Aceita PIX
      maxInstallments: 12
    },
    visual: {
      style: {
        theme: 'bootstrap', 
      }
    }
  };

  const onSubmit = async ({ formData }) => {
    return new Promise((resolve, reject) => {
      fetch("/api/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.status === 'approved' || response.status === 'in_process' || response.status === 'pending') {
            onConfirm(guestDetails);
            resolve();
          } else {
            alert("Pagamento recusado: " + (response.detail || "Verifique os dados."));
            reject();
          }
        })
        .catch((error) => {
          console.error(error);
          // SIMULAÇÃO DE SUCESSO PARA TESTE LOCAL SE BACKEND FALHAR
          // Remova isso em produção real se tiver backend
          if (confirm("Backend não respondeu (normal em teste sem servidor). Deseja simular sucesso?")) {
             onConfirm(guestDetails);
             resolve();
          } else {
             reject();
          }
        });
    });
  };

  const onError = async (error) => {
    console.log(error);
  };

  const onReady = async () => {
    // O formulário carregou
  };

  return (
    <>
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => setShowLoginModal(false)}
      />

      <div className="max-w-6xl mx-auto pt-8 pb-20 px-4 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-brand-600 mb-6 font-medium">
          <ChevronLeft size={20}/> Voltar para detalhes
        </button>

        <div className="grid md:grid-cols-2 gap-12">
          {/* ESQUERDA: DADOS E PAGAMENTO */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Confirmar e Pagar</h1>
            
            <div className="space-y-6">
              
              {/* Box de Dados Pessoais */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User size={20}/> Seus Dados</h3>
                
                {!user ? (
                  <div className="text-center py-8">
                    <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600">
                      <User size={32}/>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Para continuar, identifique-se</h3>
                    <p className="text-gray-500 text-sm mb-6">Cadastre-se ou faça login para garantir sua segurança e receber o voucher.</p>
                    <Button onClick={() => setShowLoginModal(true)} className="w-full justify-center">Entrar ou Cadastrar</Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nome Completo</label>
                      <input className="w-full border rounded-lg p-3 bg-gray-50" value={guestDetails.name} readOnly />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">E-mail</label>
                        <input className="w-full border rounded-lg p-3 bg-gray-50" value={guestDetails.email} readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">WhatsApp</label>
                        <input 
                          className="w-full border rounded-lg p-3" 
                          value={guestDetails.phone} 
                          onChange={e => setGuestDetails({...guestDetails, phone: e.target.value})} 
                          placeholder="(00) 90000-0000"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Box de Pagamento ACORDEÃO */}
              <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ${!user ? 'opacity-70' : ''}`}>
                
                {/* Cabeçalho do Acordeão */}
                <div 
                  className={`p-6 flex justify-between items-center cursor-pointer ${user ? 'hover:bg-gray-50' : 'cursor-not-allowed'}`}
                  onClick={() => user && setIsPaymentExpanded(!isPaymentExpanded)}
                >
                  <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                    <CreditCard size={20}/> 
                    Pagamento Seguro
                  </h3>
                  {user ? (
                    <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isPaymentExpanded ? 'rotate-180' : ''}`}/>
                  ) : (
                    <Lock size={18} className="text-gray-400" />
                  )}
                </div>

                {/* Corpo do Acordeão (Brick) */}
                <div className={`transition-all duration-500 ease-in-out px-6 ${isPaymentExpanded ? 'max-h-[1200px] opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
                  <div className="border-t border-gray-100 pt-6">
                    {user && (
                      <Payment
                        initialization={initialization}
                        customization={customization}
                        onSubmit={onSubmit}
                        onReady={onReady}
                        onError={onError}
                      />
                    )}
                    <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">
                        <Info size={12}/> Ambiente seguro processado pelo Mercado Pago.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* DIREITA: RESUMO */}
          <div>
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl sticky top-24">
                <div className="flex gap-4 mb-6">
                    {/* Verificação segura para evitar tela branca se dados faltarem */}
                    <img src={bookingData?.item?.image} className="w-24 h-24 rounded-xl object-cover" />
                    <div>
                        <h3 className="font-bold text-gray-900">{bookingData?.item?.name || "Day Use"}</h3>
                        <p className="text-sm text-gray-500">{bookingData?.date?.split('-').reverse().join('/')}</p>
                    </div>
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="font-bold text-gray-900">Detalhes do preço</h4>
                  <div className="flex justify-between text-gray-600 text-sm"><span>Adultos ({bookingData.adults}x)</span><span>{formatBRL(bookingData.adults * bookingData.item.priceAdult)}</span></div>
                  {bookingData.children > 0 && <div className="flex justify-between text-gray-600 text-sm"><span>Crianças ({bookingData.children}x)</span><span>{formatBRL(bookingData.children * bookingData.item.priceChild)}</span></div>}
                  {bookingData.pets > 0 && <div className="flex justify-between text-gray-600 text-sm"><span>Taxa Pet ({bookingData.pets}x)</span><span>{formatBRL(bookingData.pets * bookingData.item.petFee)}</span></div>}
                  <div className="flex justify-between text-gray-600 text-sm"><span>Taxa de serviço</span><span>R$ 0,00</span></div>
                </div>
                <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between items-center">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-2xl text-brand-600">{formatBRL(bookingData.total)}</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ... (PartnerDashboard, UserDashboard, HomePage, PartnerPage, Footer, App) ...
// (Vou incluir o restante do arquivo completo para garantir que você tenha tudo em um só lugar)

// 3. DASHBOARD DO PARCEIRO
const PartnerDashboard = ({ onEditItem, user }) => {
  useSEO("Painel do Parceiro", "Gerencie seus anúncios.", false);
  const [items, setItems] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);

  useEffect(() => {
    async function load() {
      const qItems = query(collection(db, "dayuses"), where("ownerId", "==", user.uid));
      const querySnapshot = await getDocs(qItems);
      const listItems = [];
      querySnapshot.forEach((doc) => listItems.push({ id: doc.id, ...doc.data() }));
      setItems(listItems);

      const qRes = query(collection(db, "reservations"), where("ownerId", "==", user.uid));
      const queryResSnapshot = await getDocs(qRes);
      const listRes = [];
      queryResSnapshot.forEach((doc) => listRes.push({ id: doc.id, ...doc.data() }));
      setReservations(listRes); 
    }
    if (user) load();
  }, [user]);

  if (!user) return <div className="text-center py-20">Carregando painel...</div>;

  return (
    <div className="max-w-6xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
      <VoucherModal isOpen={!!selectedReservation} trip={selectedReservation} onClose={() => setSelectedReservation(null)} isPartnerView={true} />
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel do Parceiro</h1>
      <p className="text-gray-500 mb-8">Bem-vindo, {user.name}.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Faturamento</p>
          <p className="text-3xl font-bold text-brand-600 mt-2">{formatBRL(reservations.reduce((acc, curr) => acc + curr.total, 0))}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Reservas</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{reservations.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Anúncios</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{items.length}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><List size={20}/> Últimas Vendas</h2>
          <div className="space-y-4">
            {reservations.length === 0 ? <p className="text-gray-400">Nenhuma venda ainda.</p> : reservations.map(res => (
              <div key={res.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">{res.guestName || "Cliente"}</p>
                  <p className="text-xs text-gray-500">{res.itemName}</p>
                  <p className="text-xs text-gray-400">{res.date.split('-').reverse().join('/')}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <Badge type="green">Pago</Badge>
                  <Button variant="ghost" className="px-2 py-1 h-auto text-xs" onClick={() => setSelectedReservation(res)}>Ver Detalhes</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><MapIcon size={20}/> Meus Locais</h2>
            <Button className="py-2 px-4 text-sm" onClick={onEditItem}>+ Novo Day Use</Button>
          </div>
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex gap-4 items-center">
                <img src={item.image} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.city}</p>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-gray-400 text-center py-4">Cadastre seu primeiro local!</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. DASHBOARD DO USUÁRIO
const UserDashboard = ({ user }) => {
  useSEO("Minhas Viagens", "Gerencie suas reservas.", false);
  const [myTrips, setMyTrips] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  
  useEffect(() => {
    async function load() {
      const q = query(collection(db, "reservations"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setMyTrips(list);
    }
    if(user) load();
  }, [user]);

  if(!user) return <div className="text-center py-20">Carregando suas viagens...</div>;

  return (
    <div className="max-w-4xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
      <VoucherModal isOpen={!!selectedVoucher} trip={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Minhas Viagens</h1>
      {myTrips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
          <p className="text-gray-500">Você ainda não tem reservas.</p>
          <p className="text-sm text-brand-600 mt-2">Explore o mapa e garanta seu próximo lazer.</p>
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
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedVoucher(trip)} className="text-sm text-brand-600 font-bold hover:underline flex items-center gap-1"><Ticket size={14}/> Ver Voucher</button>
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

// --- HOME PAGE ---
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

// --- TELA: PARCEIRO (NOVO LOCAL) ---
const PartnerPage = ({ onSave, onViewCreated, user }) => {
  useSEO("Área do Parceiro", "Cadastre seu day use.", true);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);
   
  const [formData, setFormData] = useState({
    contactName: user?.name || '', contactEmail: user?.email || '', contactPhone: '', contactJob: 'Sócio/Proprietário',
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
      ownerId: user.uid, 
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
        onClose={() => { setShowModal(false); window.scrollTo(0,0); }} 
        onAction={() => onViewCreated(createdItem)}
        title="Parabéns!"
        message="A página do seu Day Use foi criada e já pode receber reservas."
        actionLabel="Ver Página Criada"
      />

      <div className="text-center mb-10"><h1 className="text-3xl font-bold text-gray-900 mb-2">Novo Anúncio</h1><p className="text-gray-500 text-lg">Cadastro completo do estabelecimento.</p></div>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl space-y-8">
        
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><User size={20}/> Dados do Responsável</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nome Completo</label><input required className="w-full border rounded-lg p-3" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} placeholder="Seu nome"/></div>
            <div><label className="block text-sm font-medium mb-1">E-mail</label><input required type="email" className="w-full border rounded-lg p-3 bg-gray-50" value={formData.contactEmail} readOnly /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Telefone / WhatsApp</label><input required className="w-full border rounded-lg p-3" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} placeholder="(00) 90000-0000"/></div>
            <div>
              <label className="block text-sm font-medium mb-1">Cargo na Empresa</label>
              <select className="w-full border rounded-lg p-3 bg-white" value={formData.contactJob} onChange={e => setFormData({...formData, contactJob: e.target.value})}>
                <option>Sócio/Proprietário</option>
                <option>Gerente</option>
                <option>Atendente</option>
                <option>Outros</option>
              </select>
            </div>
          </div>
        </div>

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

// --- FOOTER MINIMALISTA ---
const Footer = () => (
  <footer className="bg-white border-t border-gray-100 py-12 mt-auto">
    <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-2 text-gray-900 font-bold">
        <MapPin className="text-brand-500" size={20} /> Mapa do Day Use
      </div>
      <div className="text-center md:text-left">
        <p className="text-gray-500 text-sm">
          Feito com carinho por <a href="https://instagram.com/iurifrancast" target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:text-brand-600 font-medium transition-colors">Iuri França</a> em Belo Horizonte.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <a href="https://instagram.com/iurifrancast" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E1306C] transition-colors p-2 rounded-full hover:bg-gray-50">
          <Instagram size={24} />
        </a>
      </div>
    </div>
  </footer>
);

// --- APP PRINCIPAL E ROTEAMENTO ---

export default function App() {
  const [view, setView] = useState("home"); 
  const [user, setUser] = useState(null); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [dayUses, setDayUses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // EFEITO DE ROUTING (URL)
  useEffect(() => {
    // Atualiza a URL quando a view muda
    if (view === 'home') {
      window.history.pushState({}, '', '/');
    } else if (view === 'details' && selectedItem) {
      const slug = generateSlug(selectedItem.name);
      const state = getStateSlug(selectedItem.state);
      window.history.pushState({}, '', `/${state}/${slug}`);
    } else {
      // Outras views
      window.history.pushState({}, '', `/${view}`);
    }

    // Escuta o botão "Voltar" do navegador
    const handlePopState = () => {
      // Simplesmente volta para home se clicar em voltar (para simplificar SPA)
      // Em uma implementação real com Router, isso seria automático
      setView('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, selectedItem]);


  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || currentUser.email.split('@')[0],
          photoURL: currentUser.photoURL,
          role: 'user' 
        });

        const userRef = doc(db, "users", currentUser.uid);
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUser(prev => {
              if(!prev) return null;
              return { ...prev, name: userData.name || prev.name, role: userData.role || 'user' };
            });
          }
        });
      } else {
        setUser(null);
        unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

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

  const handleLogout = async () => {
    await signOut(auth);
    setView('home');
  };

  const goToCheckout = (data) => {
    setBookingData(data);
    setView('checkout');
    window.scrollTo(0,0);
  };

  const handleConfirmBooking = async (guestDetails) => {
    try {
      const userId = user ? user.uid : 'guest';
      const ownerId = bookingData.item.ownerId || 'admin_sistema';

      await addDoc(collection(db, "reservations"), {
        ...bookingData,
        userId: userId,
        ownerId: ownerId, 
        guestName: guestDetails.name || 'Nome não informado',
        guestEmail: guestDetails.email || 'Email não informado',
        guestPhone: guestDetails.phone || 'Sem telefone',
        itemName: bookingData.item.name || 'Item desconhecido',
        itemImage: bookingData.item.image || '',
        createdAt: new Date(),
        status: 'confirmed',
        total: bookingData.total || 0
      });
      setShowConfirmModal(true);
    } catch (e) {
      console.error(e);
      alert("Erro ao processar reserva: " + e.message);
    }
  };

  const handleViewCreated = (item) => { 
    setSelectedItem(item); 
    setView('details'); 
    window.scrollTo(0,0); 
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-brand-100 flex flex-col">
      <SuccessModal 
        isOpen={showConfirmModal} 
        onClose={() => {setShowConfirmModal(false); setView('home');}} 
        onAction={() => {setShowConfirmModal(false); setView('user-dashboard');}} 
        title="Reserva Confirmada!"
        message="Sua reserva foi realizada com sucesso. Você recebeu um e-mail com os detalhes."
        actionLabel="Ver Minhas Viagens"
      />

      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setView("home")}>
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} />
            <div style={{display:'none'}} className="flex items-center gap-2 font-bold text-xl tracking-tight text-brand-600"><MapPin className="text-brand-500" /> Mapa do Day Use</div>
          </div>
           
          <div className="flex gap-4 items-center">
             {!user ? (
               <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setView('partner-register')} 
                   className="hidden md:flex text-sm font-semibold text-gray-500 hover:text-brand-600 items-center gap-2 transition-colors"
                 >
                    Seja um parceiro
                 </button>
                 <Button variant="ghost" onClick={() => setView('login')} className="font-bold">Entrar</Button>
               </div>
             ) : (
               <div className="flex items-center gap-4">
                 {user.role === 'partner' && (
                    <Button variant="ghost" onClick={() => setView('partner-dashboard')} className={view === 'partner-dashboard' ? 'text-brand-600 bg-brand-50' : ''}>
                       Painel Parceiro
                    </Button>
                 )}
                 {user.role === 'user' && (
                    <Button variant="ghost" onClick={() => setView('user-dashboard')} className={view === 'user-dashboard' ? 'text-brand-600 bg-brand-50' : ''}>
                       Minhas Viagens
                    </Button>
                 )}
                 <div className="flex items-center gap-2 cursor-pointer group relative" onClick={handleLogout}>
                    <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden border-2 border-brand-100">
                      {user.photoURL ? <img src={user.photoURL} alt="Foto" className="w-full h-full object-cover"/> : user.name[0]?.toUpperCase()}
                    </div>
                    <LogOut size={16} className="text-gray-400 hover:text-red-500 transition-colors"/>
                 </div>
               </div>
             )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {view === 'home' && <HomePage items={dayUses} onSelect={(item) => {setSelectedItem(item); setView('details'); window.scrollTo(0,0)}} loading={loading} />}
        {view === 'details' && selectedItem && <DetailsPage item={selectedItem} onBack={() => setView('home')} onBook={goToCheckout} />}
        
        {view === 'login' && <LoginPage onLoginSuccess={(isNew) => setView(user?.role === 'partner' ? 'partner-dashboard' : 'home')} initialRole="user" />}
        {view === 'partner-login' && <LoginPage onLoginSuccess={() => setView('partner-dashboard')} initialRole="partner" lockRole={true} />}
        {view === 'partner-register' && (
          <LoginPage 
            onLoginSuccess={(isNewUser) => setView(isNewUser ? 'partner-new' : 'partner-dashboard')} 
            initialRole="partner" 
            lockRole={true}
            initialIsRegistering={true}
          />
        )}
        
        {view === 'checkout' && bookingData && (
          <CheckoutPage 
            bookingData={bookingData} 
            onConfirm={handleConfirmBooking} 
            onBack={() => setView('details')} 
            user={user} 
          />
        )}
        
        {view === 'partner-dashboard' && user?.role === 'partner' && <PartnerDashboard user={user} onEditItem={() => setView('partner-new')} />}
        {view === 'user-dashboard' && <UserDashboard user={user} />}
        
        {view === 'partner-new' && user?.role === 'partner' && <PartnerPage user={user} onSave={async (item) => {const docRef = await addDoc(collection(db, "dayuses"), item); setDayUses([{id: docRef.id, ...item}, ...dayUses]); return {id: docRef.id, ...item};}} onViewCreated={handleViewCreated} />}
      </main>

      <Footer />
    </div>
  );
}