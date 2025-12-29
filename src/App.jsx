import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { db, auth, googleProvider } from './firebase'; 
import { collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore'; 
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { 
  MapPin, Search, User, CheckCircle, 
  X, Info, AlertCircle, PawPrint, FileText, Ban, ChevronDown, Image as ImageIcon, Map as MapIcon, CreditCard, Calendar as CalendarIcon, Ticket, Lock, Briefcase, Instagram, Star, ChevronLeft, ChevronRight, ArrowRight, LogOut, List, Link as LinkIcon, Edit, DollarSign, Copy, QrCode, ScanLine, Users, Tag, Trash2
} from 'lucide-react';

// --- CONFIGURAÇÃO ---
try {
  if (import.meta.env.VITE_MP_PUBLIC_KEY) {
    initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'pt-BR' });
  }
} catch (e) { console.log("MP não configurado"); }

const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;
const BRAND_COLOR = "#0097A8";

// --- ESTILOS GLOBAIS ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: ${BRAND_COLOR}; border-radius: 10px; }
  `}</style>
);

// --- UTILITÁRIOS ---
const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const generateSlug = (text) => {
  return text
    ?.toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'local-' + Date.now();
};

const getStateSlug = (uf) => uf ? uf.toLowerCase() : 'br';
const validateCNPJ = (cnpj) => cnpj.replace(/[^\d]+/g, '').length === 14;
const getYoutubeId = (url) => { if (!url) return null; const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/; const match = url.match(regExp); return (match && match[2].length === 11) ? match[2] : null; };

// --- HOOK DE SEO (DEFINIDO NO INÍCIO PARA EVITAR ERROS) ---
const useSEO = (title, description) => {
  useEffect(() => {
    document.title = title ? `${title} | Mapa do Day Use` : "Mapa do Day Use";
  }, [title, description]);
};

// --- COMPONENTES VISUAIS ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled, type='button' }) => {
  let baseClass = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  if (variant === 'primary') baseClass += ` bg-[#0097A8] text-white hover:bg-[#007F8F] shadow-lg shadow-[#0097A8]/20`;
  else if (variant === 'outline') baseClass += ` border-2 border-[#0097A8] text-[#0097A8] hover:bg-cyan-50`;
  else if (variant === 'ghost') baseClass += ` bg-transparent text-slate-600 hover:bg-slate-100`;
  else if (variant === 'danger') baseClass += ` bg-red-50 text-red-600 hover:bg-red-100 border border-red-200`;
  else if (variant === 'success') baseClass += ` bg-[#007F8F] text-white hover:bg-[#00606b] shadow-lg`;

  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseClass} ${className}`}>{children}</button>;
};

const Badge = ({ children, type = 'default' }) => {
  const styles = { 
    default: "bg-cyan-50 text-[#0097A8] border-cyan-100", 
    red: "bg-red-50 text-red-900 border-red-100", 
    green: "bg-green-50 text-green-800 border-green-200" 
  };
  return <span className={`${styles[type]} text-xs px-3 py-1 rounded-full font-medium border flex items-center gap-1`}>{children}</span>;
};

const ModalOverlay = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

const SuccessModal = ({ isOpen, onClose, title, message, actionLabel, onAction }) => {
  if (!isOpen) return null;
  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-8 text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={40} className="text-green-600" /></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600 mb-8">{message}</p>
        <div className="space-y-3">
          {onAction && <Button className="w-full justify-center" onClick={() => { onClose(); onAction(); }}>{actionLabel}</Button>}
          <Button variant="ghost" className="w-full justify-center" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </ModalOverlay>
  );
};

const PixModal = ({ isOpen, onClose, pixData, onConfirm }) => {
  if (!isOpen || !pixData) return null;
  const copyToClipboard = () => { navigator.clipboard.writeText(pixData.qr_code); alert("Código PIX copiado!"); };
  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4"><Ticket size={32}/></div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Pagamento via PIX</h2>
        <p className="text-sm text-slate-500 mb-6">Escaneie o QR Code ou copie o código abaixo.</p>
        {pixData.qr_code_base64 && <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="mx-auto w-48 h-48 mb-6 border-2 border-slate-100 rounded-xl" />}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-2 mb-6">
           <p className="text-xs text-slate-500 font-mono truncate flex-1">{pixData.qr_code}</p>
           <button onClick={copyToClipboard} className="text-teal-600 hover:text-teal-700 p-2"><Copy size={16}/></button>
        </div>
        <Button className="w-full mb-3" onClick={() => { onConfirm(); onClose(); }}>Já fiz o pagamento</Button>
        <Button variant="ghost" className="w-full" onClick={onClose}>Cancelar</Button>
      </div>
    </ModalOverlay>
  );
};

const VoucherModal = ({ isOpen, onClose, trip }) => {
  if (!isOpen || !trip) return null;
  
  // URL para gerar QR Code dinâmico
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${trip.id}`;
  
  // Montagem do Endereço e Link do Maps
  // (Usa os dados do item salvo na reserva ou fallbacks se for antigo)
  const placeName = trip.item?.name || trip.itemName || "Local do Passeio";
  const address = trip.item ? `${trip.item.street}, ${trip.item.number} - ${trip.item.district || ''}, ${trip.item.city} - ${trip.item.state}` : "Endereço não disponível";
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + " " + address)}`;

  // Formatação de Pagamento
  const paymentLabel = trip.paymentMethod === 'pix' ? 'Pix (À vista)' : `Cartão de Crédito ${trip.installments ? `(${trip.installments}x)` : '(À vista)'}`;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col max-h-[90vh]">
        {/* Cabeçalho Fixo */}
        <div className="bg-[#0097A8] p-6 text-white text-center relative shrink-0">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X size={20}/></button>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><Ticket size={24} /></div>
            <h2 className="text-xl font-bold">Voucher de Acesso</h2>
            <p className="text-cyan-100 text-sm">Apresente na portaria</p>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-8 text-sm text-slate-700 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* Status e QR Code */}
            <div className="text-center bg-slate-50 border-2 border-dashed border-slate-300 p-6 rounded-2xl">
                <div className="mb-4">
                    <Badge type={trip.status === 'cancelled' ? 'red' : trip.status === 'validated' ? 'green' : 'default'}>
                        {trip.status === 'cancelled' ? 'Cancelado' : trip.status === 'validated' ? 'Utilizado / Validado' : 'Confirmado'}
                    </Badge>
                </div>
                {trip.status !== 'cancelled' && (
                    <div className="flex justify-center mb-4">
                        <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 border-4 border-white shadow-sm rounded-lg" />
                    </div>
                )}
                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">CÓDIGO DE VALIDAÇÃO</p>
                <p className="text-3xl font-mono font-black text-slate-900 tracking-wider select-all">{trip.id?.slice(0,6).toUpperCase()}</p>
            </div>

            {/* Informações Principais */}
            <div className="space-y-4">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Data do Passeio</span>
                    <b className="text-slate-900 text-lg">{trip.date?.split('-').reverse().join('/')}</b>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Titular</span>
                    <b className="text-slate-900">{trip.guestName}</b>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Pagamento</span>
                    <b className="text-slate-900 capitalize">{paymentLabel}</b>
                </div>
            </div>

            {/* Endereço e Rota */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-2"><MapPin size={16} className="text-[#0097A8]"/> {placeName}</p>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{address}</p>
                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-white border border-slate-200 text-[#0097A8] font-bold py-2 rounded-lg hover:bg-cyan-50 transition-colors text-xs flex items-center justify-center gap-2">
                    <LinkIcon size={14}/> Abrir no Maps / Waze
                </a>
            </div>

            {/* Resumo Financeiro */}
            <div className="bg-cyan-50 p-4 rounded-xl">
               <p className="text-[#0097A8] text-xs uppercase font-bold mb-2 flex items-center gap-1"><Info size={12}/> Itens do Pacote</p>
               <ul className="space-y-1 text-sm text-slate-700">
                 <li className="flex justify-between"><span>Adultos:</span> <b>{trip.adults}</b></li>
                 {trip.children > 0 && <li className="flex justify-between"><span>Crianças:</span> <b>{trip.children}</b></li>}
                 <li className="flex justify-between"><span>Pets:</span> <b>{trip.pets > 0 ? `${trip.pets}` : "Não"}</b></li>
                 <li className="flex justify-between pt-2 mt-2 border-t border-cyan-100 text-[#0097A8] font-bold text-lg"><span>Total Pago</span><span>{formatBRL(trip.total)}</span></li>
               </ul>
            </div>

            <Button className="w-full" onClick={() => window.print()}>Imprimir / Salvar PDF</Button>
        </div>
      </div>
    </ModalOverlay>
  );
};
const ImageGallery = ({ images, isOpen, onClose }) => {
  const [idx, setIdx] = useState(0);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 bg-white/10 hover:bg-white/30 text-white rounded-full p-3 transition-colors z-50">
        <X size={32}/>
      </button>
      
      <div className="relative w-full h-full flex items-center justify-center px-2 md:px-20" onClick={e => e.stopPropagation()}>
         <button onClick={(e) => { e.stopPropagation(); setIdx((idx + images.length - 1) % images.length); }} className="absolute left-2 md:left-8 text-white hover:text-slate-300 transition-colors p-2 bg-black/30 rounded-full"><ChevronLeft size={40}/></button>
         
         <img src={images[idx]} className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl" alt="Galeria" />
         
         <button onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % images.length); }} className="absolute right-2 md:right-8 text-white hover:text-slate-300 transition-colors p-2 bg-black/30 rounded-full"><ChevronRight size={40}/></button>
      </div>
      <div className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm">{idx + 1} / {images.length}</div>
    </div>
  );
};

const SimpleCalendar = ({ availableDays = [], onDateSelect, selectedDate, prices = {}, blockedDates = [], basePrice = 0 }) => {
  const [curr, setCurr] = useState(new Date());
  const daysInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
  
  const isAvailable = (day) => {
     const date = new Date(curr.getFullYear(), curr.getMonth(), day);
     const dateStr = date.toISOString().split('T')[0];
     return availableDays.includes(date.getDay()) && date >= new Date().setHours(0,0,0,0) && !blockedDates.includes(dateStr);
  };
  
  const handleDayClick = (day) => {
    if (isAvailable(day)) {
      const date = new Date(curr.getFullYear(), curr.getMonth(), day);
      onDateSelect(date.toISOString().split('T')[0]); 
    } else {
      alert("Data indisponível.");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth()-1)))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20}/></button>
        <span className="font-bold text-slate-700 capitalize">{curr.toLocaleString('pt-BR',{month:'long', year:'numeric'})}</span>
        <button onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth()+1)))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={20}/></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-bold text-slate-400">{weekDays.map((d,i)=><span key={i}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({length: firstDay}).map((_,i)=><div key={`e-${i}`}/>)}
        {Array.from({length: daysInMonth}).map((_,i)=>{
          const d = i+1;
          const date = new Date(curr.getFullYear(), curr.getMonth(), d);
          const dateStr = date.toISOString().split('T')[0];
          
          const available = isAvailable(d);
          const dayPrice = prices[date.getDay()];
          // Só marca como especial se tiver preço definido E for menor que o base
          const isPromo = available && dayPrice && Number(dayPrice) < basePrice;

          return (
            <button key={d} onClick={()=>handleDayClick(d)} className={`h-9 w-9 rounded-full text-sm font-medium relative flex items-center justify-center transition-all ${dateStr===selectedDate?'bg-[#0097A8] text-white shadow-lg':available?'hover:bg-cyan-50 text-slate-700':'text-slate-300 cursor-not-allowed'}`}>
              {d}
              {isPromo && <div className="absolute -bottom-1 w-1 h-1 bg-green-500 rounded-full" title="Preço reduzido"></div>}
            </button>
          )
        })}
      </div>
    </div>
  );
};

const Accordion = ({ title, icon: Icon, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0 py-4">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left group">
        <div className="flex items-center gap-3 font-semibold text-slate-700 group-hover:text-[#0097A8] transition-colors">{Icon && <Icon size={20} className="text-[#0097A8]" />}{title}</div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="mt-3 text-slate-600 text-sm leading-relaxed pl-8 animate-fade-in">{children}</div>}
    </div>
  );
};

// --- LOGIN/CADASTRO ---
const LoginModal = ({ isOpen, onClose, onSuccess, initialRole = 'user', hideRoleSelection = false, closeOnSuccess = true, initialMode = 'login', customTitle, customSubtitle }) => {
  if (!isOpen) return null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState(initialMode); 
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { setMsg(''); setMode(initialMode); setRole(initialRole); }, [isOpen, initialMode, initialRole]);

  const ensureProfile = async (u) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    let userRole = role; 
    if (snap.exists()) { userRole = snap.data().role || 'user'; } 
    else { await setDoc(ref, { email: u.email, name: u.displayName || u.email.split('@')[0], role: role, createdAt: new Date() }); }
    return { ...u, role: userRole };
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      let res;
      if (mode === 'login') res = await signInWithEmailAndPassword(auth, email, password);
      else res = await createUserWithEmailAndPassword(auth, email, password);
      const userWithRole = await ensureProfile(res.user);
      onSuccess(userWithRole);
      if (closeOnSuccess) onClose();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') { setMsg(<span className="cursor-pointer font-bold text-[#0097A8] hover:underline" onClick={() => setMode('login')}>E-mail já cadastrado. Clique para entrar.</span>); }
      else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') setMsg("Dados incorretos.");
      else setMsg("Erro: " + err.code);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
     try {
        const res = await signInWithPopup(auth, googleProvider);
        const userWithRole = await ensureProfile(res.user);
        onSuccess(userWithRole);
        if (closeOnSuccess) onClose();
     } catch (e) { setMsg("Erro no Google Login"); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-8 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"><X size={20}/></button>
        <h2 className={`text-2xl font-bold mb-2 ${mode==='register'?'text-[#007F8F]':'text-[#0097A8]'}`}>{customTitle || (mode === 'login' ? 'Olá, novamente' : 'Criar conta')}</h2>
        <p className="text-slate-500 mb-6 text-sm">{customSubtitle || (mode === 'login' ? 'Acesse seu painel de Viajante ou Parceiro.' : 'Preencha seus dados para começar.')}</p>

        {!hideRoleSelection && mode === 'register' && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
               <button onClick={() => setRole('user')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'user' ? 'bg-white text-[#0097A8] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Viajante</button>
               <button onClick={() => setRole('partner')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'partner' ? 'bg-white text-[#0097A8] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Parceiro</button>
          </div>
        )}

        <div className="space-y-4">
          <Button variant="outline" className="w-full justify-center" onClick={handleGoogle}>Continuar com Google</Button>
          <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-200"></div><span className="mx-4 text-xs font-bold text-slate-400">OU</span><div className="flex-grow border-t border-slate-200"></div></div>
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
             <input className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-[#0097A8]" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
             <input className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-[#0097A8]" type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} required/>
             {msg && <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg flex items-center gap-2 animate-fade-in"><AlertCircle size={16} className="shrink-0"/> <span>{msg}</span></div>}
             <Button type="submit" className="w-full justify-center" variant={mode === 'register' ? 'success' : 'primary'} disabled={loading}>{loading?'Processando...':(mode === 'login' ? 'Entrar' : 'Cadastrar')}</Button>
          </form>
          <p className="text-sm text-slate-500 mt-6 cursor-pointer hover:text-[#0097A8]" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Fazer Login'}</p>
        </div>
      </div>
    </ModalOverlay>
  );
};

// --- PÁGINA PERFIL USUÁRIO ---
const UserProfile = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [data, setData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if(user) {
         const snap = await getDoc(doc(db, "users", user.uid));
         if(snap.exists()) setData({ name: snap.data().name || user.displayName || '', phone: snap.data().phone || '' });
      }
    };
    fetch();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault(); setLoading(true);
    await updateDoc(doc(db, "users", user.uid), data);
    setLoading(false); alert("Perfil atualizado!");
  };

  if(!user) return null;

  return (
    <div className="max-w-xl mx-auto py-12 px-4 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 text-slate-900">Meu Perfil</h1>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
         <form onSubmit={handleSave} className="space-y-4">
            <div><label className="text-sm font-bold text-slate-700 block mb-1">Nome Completo</label><input className="w-full border p-3 rounded-lg" value={data.name} onChange={e=>setData({...data, name: e.target.value})} /></div>
            <div><label className="text-sm font-bold text-slate-700 block mb-1">Email</label><input className="w-full border p-3 rounded-lg bg-slate-50" value={user.email} readOnly disabled /></div>
            <div><label className="text-sm font-bold text-slate-700 block mb-1">Telefone</label><input className="w-full border p-3 rounded-lg" value={data.phone} onChange={e=>setData({...data, phone: e.target.value})} placeholder="(00) 00000-0000"/></div>
            <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
         </form>
      </div>
    </div>
  );
};

// --- PÁGINAS PRINCIPAIS ---

const HomePage = () => {
  useSEO("Home", "Encontre e reserve os melhores day uses em hotéis e resorts.");
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  useEffect(() => { getDocs(collection(db, "dayuses")).then(s => setItems(s.docs.map(d=>({id:d.id,...d.data()})))) }, []);

  const filtered = items.filter(i => (i.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (i.city?.toLowerCase() || '').includes(searchTerm.toLowerCase()));

  return (
    <div className="pb-20 animate-fade-in">
      <div className="relative bg-[#0097A8] text-white py-24 text-center px-4 rounded-b-[3rem] mb-12 shadow-2xl overflow-hidden max-w-7xl mx-auto mt-6 rounded-t-[3rem]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">Relaxe perto de casa</h1>
          <p className="text-teal-100 text-lg md:text-xl font-light mb-10 max-w-2xl mx-auto">Descubra hotéis, pousadas e resorts incríveis com Day Use em Belo Horizonte e região.</p>
          <div className="bg-white p-2 pl-6 rounded-full shadow-2xl flex items-center max-w-xl mx-auto transform hover:scale-105 transition-transform duration-300">
            <Search className="text-slate-400" />
            <input 
               className="flex-1 px-4 py-3 text-slate-700 outline-none placeholder:text-slate-400 font-medium" 
               placeholder="Qual cidade ou hotel você procura?" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-[#0097A8] text-white p-3 rounded-full hover:bg-[#007F8F] shadow-lg"><ArrowRight size={20}/></button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8"><h2 className="text-2xl font-bold text-slate-900">Lugares em destaque</h2><span className="text-sm text-slate-500">{filtered.length} locais encontrados</span></div>
        <div className="grid md:grid-cols-3 gap-8">
          {filtered.map(item => (
             <div key={item.id} onClick={() => navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}})} className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden border border-slate-100 group flex flex-col h-full">
                <div className="h-64 relative overflow-hidden"><img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/><div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 text-slate-800"><Star size={12} className="text-yellow-500 fill-current"/> 5.0</div></div>
                <div className="p-6 flex flex-col flex-1">
                   <div className="mb-4"><h3 className="font-bold text-xl text-slate-900 leading-tight mb-1">{item.name}</h3><p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} className="text-[#0097A8]"/> {item.city || 'Localização'}</p></div>
                   <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">A partir de</p><p className="text-2xl font-bold text-[#0097A8]">{formatBRL(item.priceAdult)}</p></div><span className="text-sm font-semibold text-[#0097A8] bg-cyan-50 px-4 py-2 rounded-xl group-hover:bg-[#0097A8] group-hover:text-white transition-all">Reservar</span></div>
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DetailsPage = () => {
  const { state, slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);

  useEffect(() => {
    const fetchItem = async () => {
      if (location.state?.id) {
         const docSnap = await getDoc(doc(db, "dayuses", location.state.id));
         if(docSnap.exists()) setItem({id: docSnap.id, ...docSnap.data()});
      } else {
         const q = query(collection(db, "dayuses")); 
         const querySnapshot = await getDocs(q);
         const found = querySnapshot.docs.find(d => generateSlug(d.data().name) === slug);
         if (found) setItem({id: found.id, ...found.data()});
      }
    };
    fetchItem();
  }, [slug, location.state]);

  // Lógica de Preço Dinâmico (Adulto)
  useEffect(() => {
    if(item) {
        if (date) {
          const dayOfWeek = new Date(date + 'T12:00:00').getDay();
          const dayConfig = item.weeklyPrices?.[dayOfWeek];
          let price = item.priceAdult;
          
          if (dayConfig && typeof dayConfig === 'object' && dayConfig.adult) price = dayConfig.adult;
          else if (dayConfig && !isNaN(dayConfig)) price = dayConfig;
          
          setCurrentPrice(Number(price) || 0);
        } else {
          // Calcula "A partir de"
          let minPrice = Number(item.priceAdult || 0);
          if (item.weeklyPrices) {
             Object.values(item.weeklyPrices).forEach(p => {
                 let val = 0;
                 if (typeof p === 'object' && p.adult) val = Number(p.adult);
                 else if (!isNaN(p)) val = Number(p);
                 
                 if (val > 0 && val < minPrice) minPrice = val;
             });
          }
          setCurrentPrice(minPrice);
        }
    }
  }, [date, item]);

  useSEO(item ? item.name : "Detalhes", "Detalhes do day use.");

  if (!item) return <div className="text-center py-20 text-slate-400">Carregando detalhes...</div>;
  
  // Recalcula preços extras (Criança e Pet) baseados no dia
  let childPrice = Number(item.priceChild || 0);
  let petFee = Number(item.petFee || 0);
  
  if (date && item.weeklyPrices) {
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const dayConfig = item.weeklyPrices[dayOfWeek];
      if (typeof dayConfig === 'object') {
          if (dayConfig.child) childPrice = Number(dayConfig.child);
          if (dayConfig.pet) petFee = Number(dayConfig.pet);
      }
  }

  const total = (adults * currentPrice) + (children * childPrice) + (pets * petFee);
  const showPets = item.petAllowed === true || (item.petSize && item.petSize !== 'Não aceita') || petFee > 0;
  
  const handleBook = () => navigate('/checkout', { 
      state: { 
          bookingData: { 
              item, date, adults, children, pets, total, 
              priceSnapshot: { adult: currentPrice, child: childPrice, pet: petFee } 
          } 
      } 
  });

  const BookingBox = () => (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-8">
       <div className="flex justify-between items-end border-b border-slate-100 pb-6"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">A partir de</p><span className="text-3xl font-bold text-[#0097A8]">{formatBRL(currentPrice)}</span><span className="text-slate-400 text-sm"> / adulto</span></div></div>
       <div><label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2"><CalendarIcon size={16} className="text-[#0097A8]"/> Escolha uma data</label><SimpleCalendar availableDays={item.availableDays} blockedDates={item.blockedDates || []} prices={item.weeklyPrices || {}} basePrice={Number(item.priceAdult)} onDateSelect={setDate} selectedDate={date} />{date && <p className="text-xs font-bold text-[#0097A8] mt-2 text-center bg-cyan-50 py-2 rounded-lg">Data: {date.split('-').reverse().join('/')}</p>}</div>
       
       <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
         
         {/* Adultos */}
         <div className="flex justify-between items-center">
             <div>
                 <span className="text-sm font-medium text-slate-700 block">Adultos</span>
                 <span className="text-xs text-slate-400 block">{item.adultAgeStart ? `Acima de ${item.adultAgeStart} anos` : 'Ingresso padrão'}</span>
                 <span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(currentPrice)}</span>
             </div>
             <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setAdults(Math.max(1, adults-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{adults}</span><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setAdults(adults+1)}>+</button></div>
         </div>
         
         {/* Crianças */}
         <div className="flex justify-between items-center">
             <div>
                 <span className="text-sm font-medium text-slate-700 block">Crianças</span>
                 <span className="text-xs text-slate-400 block">{item.childAgeStart && item.childAgeEnd ? `${item.childAgeStart} a ${item.childAgeEnd} anos` : 'Meia entrada'}</span>
                 <span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(childPrice)}</span>
             </div>
             <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setChildren(Math.max(0, children-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{children}</span><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setChildren(children+1)}>+</button></div>
         </div>
         
         {/* Pets */}
         {showPets && (
             <div className="flex justify-between items-center">
                 <div>
                     <span className="text-sm font-medium text-slate-700 flex items-center gap-1"><PawPrint size={14}/> Pets</span>
                     <span className="text-xs text-slate-400 block">{item.petSize || 'Permitido'}</span>
                     <span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(petFee)}</span>
                 </div>
                 <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setPets(Math.max(0, pets-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{pets}</span><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setPets(pets+1)}>+</button></div>
             </div>
         )}
       </div>

       {/* Política de Gratuidade */}
       {item.gratuitousness && (
           <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-xs text-green-800">
               <span className="font-bold block mb-1">🎁 Gratuidade:</span>
               {item.gratuitousness}
           </div>
       )}

       <div className="pt-4 border-t border-dashed border-slate-200">
          <div className="flex justify-between items-center mb-6"><span className="text-slate-600 font-medium">Total</span><span className="text-2xl font-bold text-slate-900">{formatBRL(total)}</span></div>
          <Button className="w-full py-4 text-lg" disabled={!date} onClick={handleBook}>Reservar</Button>
          <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1"><Lock size={10}/> Compra segura</p>
       </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
      <ImageGallery images={[item.image, item.image2, item.image3].filter(Boolean)} isOpen={galleryOpen} onClose={()=>setGalleryOpen(false)} />
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-8 text-slate-500 hover:text-[#0097A8] font-medium transition-colors"><div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm"><ChevronLeft size={20}/></div> Voltar</button>
      
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-8">
            <div><h1 className="text-4xl font-bold text-slate-900 mb-2">{item.name}</h1><p className="flex items-center gap-2 text-slate-500 text-lg"><MapPin size={20} className="text-[#0097A8]"/> {item.city}, {item.state}</p></div>
            <div className="grid grid-cols-4 gap-3 h-[400px] rounded-[2rem] overflow-hidden shadow-lg cursor-pointer group" onClick={()=>setGalleryOpen(true)}>
               <div className="col-span-3 relative h-full"><img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/><div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div></div>
               <div className="col-span-1 grid grid-rows-2 gap-3 h-full">
                  <div className="relative overflow-hidden h-full"><img src={item.image2 || item.image} className="w-full h-full object-cover"/></div>
                  <div className="relative overflow-hidden h-full"><img src={item.image3 || item.image} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm hover:bg-black/50 transition-colors">Ver fotos</div></div>
               </div>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
               <div><h3 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><FileText className="text-[#0097A8]"/> Sobre</h3><p className="text-slate-600 leading-relaxed whitespace-pre-line text-lg">{item.description}</p></div>
               {item.videoUrl && (<div className="rounded-2xl overflow-hidden shadow-md aspect-video"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}`} title="Video" frameBorder="0" allowFullScreen></iframe></div>)}
               <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                  <div><h4 className="font-bold text-[#0097A8] mb-3 flex items-center gap-2"><CheckCircle size={18}/> Incluso</h4><ul className="space-y-2 text-slate-600 text-sm">{item.includedItems?.split('\n').map((l,i)=><li key={i} className="flex gap-2"><span>•</span>{l}</li>)}</ul></div>
                  <div><h4 className="font-bold text-red-500 mb-3 flex items-center gap-2"><Ban size={18}/> Não incluso</h4><ul className="space-y-2 text-slate-600 text-sm">{item.notIncludedItems?.split('\n').map((l,i)=><li key={i} className="flex gap-2"><span>•</span>{l}</li>)}</ul></div>
               </div>
               <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Info size={18} className="text-[#0097A8]"/> Regras de Utilização</h4>
                  <p className="text-slate-600 text-sm whitespace-pre-line bg-slate-50 p-4 rounded-xl">{item.usageRules || "Sem regras específicas."}</p>
               </div>
               <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><AlertCircle size={18} className="text-orange-500"/> Cancelamento e Reembolso</h4>
                  <p className="text-slate-600 text-sm whitespace-pre-line bg-orange-50 p-4 rounded-xl">{item.cancellationPolicy || "Consulte o estabelecimento."}</p>
               </div>
            </div>
         </div>
         <div className="lg:col-span-1 h-fit sticky top-24">
            <BookingBox />
         </div>
      </div>
    </div>
  );
};

// ... (mantenha os imports e códigos anteriores)

const CheckoutPage = () => {
  useSEO("Pagamento", "Finalize sua reserva.", false);
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData } = location.state || {};
  
  const [user, setUser] = useState(auth.currentUser);
  const [showLogin, setShowLogin] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [partnerToken, setPartnerToken] = useState(null);
  
  // Lógica de Cupom
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(bookingData?.total || 0);
  const [couponMsg, setCouponMsg] = useState(null);

  // States do Pagamento Manual
  const [paymentMethod, setPaymentMethod] = useState('card'); 
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState(''); 
  const [cardCvv, setCardCvv] = useState('');
  const [docType, setDocType] = useState('CPF');
  const [docNumber, setDocNumber] = useState('');
  const [installments, setInstallments] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState(null);

  // Helper para detectar bandeira (Essencial para Produção)
  const getPaymentMethodId = (number) => {
    const cleanNum = number.replace(/\D/g, '');
    if (/^4/.test(cleanNum)) return 'visa';
    if (/^5[1-5]/.test(cleanNum)) return 'master';
    if (/^3[47]/.test(cleanNum)) return 'amex';
    if (/^6/.test(cleanNum)) return 'elo'; // Simplificado
    if (/^3(?:0[0-5]|[68][0-9])/.test(cleanNum)) return 'diners';
    return 'visa'; // Fallback
  };

  useEffect(() => {
    if(!bookingData) { navigate('/'); return; }
    
    // Inicialização Robusta do MP
    const initMP = () => {
        if (window.MercadoPago && import.meta.env.VITE_MP_PUBLIC_KEY) {
            try {
                // Cria instância global se não existir
                if (!window.mpInstance) {
                    window.mpInstance = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY);
                }
            } catch (e) { console.error("Erro init MP:", e); }
        }
    };
    initMP();
    // Tenta novamente em 1s caso o script do index.html atrase
    setTimeout(initMP, 1000);

    const fetchOwner = async () => {
        const docRef = doc(db, "users", bookingData.item.ownerId);
        const snap = await getDoc(docRef);
        if(snap.exists() && snap.data().mp_access_token) setPartnerToken(snap.data().mp_access_token);
    };
    fetchOwner();
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  if (!bookingData) return null;

  const handleApplyCoupon = () => {
      setCouponMsg(null); 
      if (!bookingData.item.coupons || bookingData.item.coupons.length === 0) { 
          setCouponMsg({ type: 'error', text: "Este local não possui cupons ativos." });
          return; 
      }
      const found = bookingData.item.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
      if(found) {
        const discountVal = (bookingData.total * found.percentage) / 100;
        setDiscount(discountVal);
        setFinalTotal(bookingData.total - discountVal);
        setCouponMsg({ type: 'success', text: `Cupom ${found.code} aplicado: ${found.percentage}% OFF` });
      } else {
        setDiscount(0);
        setFinalTotal(bookingData.total);
        setCouponMsg({ type: 'error', text: "Cupom inválido ou expirado." });
      }
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    setCardExpiry(value);
  };

  const handleConfirm = async () => {
    await addDoc(collection(db, "reservations"), {
      ...bookingData, 
      total: finalTotal,
      discount: discount,
      couponCode: couponCode ? couponCode.toUpperCase() : null, 
      userId: user.uid, 
      ownerId: bookingData.item.ownerId,
      createdAt: new Date(), 
      status: 'confirmed', 
      guestName: user.displayName, 
      guestEmail: user.email
    });
    setProcessing(false);
    setShowSuccess(true);
  };

  const processCardPayment = async () => {
     // Validação de Token de Parceiro
     if(!partnerToken) { 
        if(confirm("MODO TESTE (MVP): O parceiro não conectou a conta MP. Deseja simular uma aprovação?")) {
            handleConfirm();
            return;
        }
        alert("Erro: O estabelecimento precisa conectar a conta para receber pagamentos.");
        return; 
     }
     
     const cleanDoc = docNumber.replace(/\D/g, ''); 
     const cleanEmail = user?.email && user.email.includes('@') ? user.email.trim() : "cliente_guest@mapadodayuse.com";
     const firstName = user?.displayName ? user.displayName.split(' ')[0] : "Viajante";
     const lastName = user?.displayName && user.displayName.includes(' ') ? user.displayName.split(' ').slice(1).join(' ') : "Sobrenome";

     setProcessing(true);

     try {
       // --- FLUXO PIX ---
       if (paymentMethod === 'pix') {
          if (cleanDoc.length < 11) { alert("CPF inválido."); setProcessing(false); return; }

          const response = await fetch("/api/process-payment", { 
             method: "POST", 
             headers: { "Content-Type":"application/json" }, 
             body: JSON.stringify({ 
                payment_method_id: 'pix', 
                transaction_amount: Number(finalTotal),
                description: `Day Use - ${bookingData.item.name}`,
                installments: 1,
                payer: { 
                    email: cleanEmail, 
                    first_name: firstName,
                    last_name: lastName,
                    identification: { type: cleanDoc.length > 11 ? 'CNPJ' : 'CPF', number: cleanDoc }
                },
                partnerAccessToken: partnerToken
             }) 
          });
          const result = await response.json();
          
          if (response.ok && result.point_of_interaction) {
             setPixData(result.point_of_interaction.transaction_data);
             setProcessing(false);
             setShowPixModal(true);
          } else {
             console.error("Erro MP:", result);
             const msg = result.message?.includes("user_allowed_only_in_test") 
                ? "Erro de Ambiente: A conta do vendedor pode não estar verificada para produção (KYC incompleto) ou o app não está 'Live'." 
                : (result.message || "Erro ao gerar Pix.");
             alert(msg);
             setProcessing(false);
          }
          return;
       }

       // --- FLUXO CARTÃO ---
       if (!window.MercadoPago) {
           alert("Sistema de pagamento carregando... Aguarde 3 segundos e tente novamente.");
           setProcessing(false);
           return;
       }

       const mp = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY);
       const [month, year] = cardExpiry.split('/');
       
       if (!month || !year || cardNumber.length < 13 || cleanDoc.length === 0) {
           alert("Preencha todos os dados do cartão corretamente.");
           setProcessing(false);
           return;
       }

       // Detecção Dinâmica da Bandeira
       const detectedMethod = getPaymentMethodId(cardNumber);

       const tokenParams = {
          cardNumber: cardNumber.replace(/\s/g, ''),
          cardholderName: cardName,
          cardExpirationMonth: month,
          cardExpirationYear: '20' + year,
          securityCode: cardCvv,
          identification: { 
              type: cleanDoc.length > 11 ? 'CNPJ' : 'CPF', 
              number: cleanDoc 
          }
       };

       console.log("Gerando token...", tokenParams);
       const tokenObj = await mp.createCardToken(tokenParams);
       console.log("Token gerado:", tokenObj.id);
       
       const response = await fetch("/api/process-payment", { 
          method: "POST", 
          headers: { "Content-Type":"application/json" }, 
          body: JSON.stringify({ 
             token: tokenObj.id,
             // Removemos issuer_id para deixar o MP decidir
             payment_method_id: detectedMethod, // Envia a bandeira correta detectada
             transaction_amount: Number(finalTotal),
             installments: Number(installments),
             description: `Day Use - ${bookingData.item.name}`,
             payer: { 
                 email: cleanEmail, 
                 first_name: firstName, 
                 last_name: lastName,
                 identification: { type: cleanDoc.length > 11 ? 'CNPJ' : 'CPF', number: cleanDoc }
             },
             partnerAccessToken: partnerToken
          }) 
       });

       const result = await response.json();
       
       if(result.status === 'approved' || result.status === 'in_process') {
           handleConfirm();
       } else { 
           console.error("Erro Pagamento:", result);
           alert("Pagamento recusado: " + (result.message || "Verifique os dados do cartão.")); 
           setProcessing(false); 
       }
     } catch (err) {
        console.error("Erro Catch:", err);
        alert("Erro técnico no pagamento. Verifique o console.");
        setProcessing(false);
     }
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-20 px-4">
      <SuccessModal isOpen={showSuccess} onClose={()=>setShowSuccess(false)} title="Pagamento Aprovado!" message="Sua reserva foi confirmada. Acesse seu voucher." onAction={()=>navigate('/minhas-viagens')} actionLabel="Meus Ingressos"/>
      <PixModal isOpen={showPixModal} onClose={()=>setShowPixModal(false)} pixData={pixData} onConfirm={handleConfirm} />
      <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={()=>{setShowLogin(false);}} />
      
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 text-slate-500 hover:text-[#0097A8] font-medium"><div className="bg-white p-2 rounded-full border shadow-sm"><ChevronLeft size={16}/></div> Voltar</button>
      
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900"><User className="text-[#0097A8]"/> Seus Dados</h3>
            {user ? (
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900">{user.displayName || "Usuário"}</p>
                  <p className="text-slate-600 text-sm">{user.email}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-100 w-fit px-3 py-1 rounded-full"><Lock size={10}/> Identidade Confirmada</div>
               </div>
            ) : (
               <div className="text-center py-8">
                  <h3 className="font-bold text-slate-900 mb-2">Para continuar, identifique-se</h3>
                  <Button onClick={()=>setShowLogin(true)} className="w-full justify-center">Entrar ou Cadastrar</Button>
               </div>
            )}
          </div>
          
          <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-8 overflow-hidden ${!user ? 'opacity-50 pointer-events-none grayscale':''}`}>
             <h3 className="font-bold text-xl mb-4 text-slate-900">Pagamento</h3>
             
             {/* Abas de Método */}
             <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                 <button onClick={()=>setPaymentMethod('card')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'card' ? 'bg-white shadow text-[#0097A8]' : 'text-slate-500 hover:text-slate-700'}`}>Cartão de Crédito</button>
                 <button onClick={()=>setPaymentMethod('pix')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'pix' ? 'bg-white shadow text-[#0097A8]' : 'text-slate-500 hover:text-slate-700'}`}>Pix</button>
             </div>

             {paymentMethod === 'card' ? (
               <div className="space-y-4 animate-fade-in">
                 <div><label className="text-xs font-bold text-slate-500 uppercase">Número do Cartão</label><input className="w-full border p-3 rounded-lg mt-1" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e=>setCardNumber(e.target.value)}/></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase">Nome do Titular</label><input className="w-full border p-3 rounded-lg mt-1" placeholder="Como no cartão" value={cardName} onChange={e=>setCardName(e.target.value)}/></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Validade (MM/AA)</label><input className="w-full border p-3 rounded-lg mt-1" placeholder="MM/AA" maxLength={5} value={cardExpiry} onChange={handleExpiryChange}/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">CVV</label><input className="w-full border p-3 rounded-lg mt-1" placeholder="123" maxLength={4} value={cardCvv} onChange={e=>setCardCvv(e.target.value)}/></div>
                 </div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase">CPF do Titular</label><input className="w-full border p-3 rounded-lg mt-1" placeholder="000.000.000-00" value={docNumber} onChange={e=>setDocNumber(e.target.value)}/></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase">Parcelas</label><select className="w-full border p-3 rounded-lg mt-1 bg-white" value={installments} onChange={e=>setInstallments(e.target.value)}><option value={1}>1x de {formatBRL(finalTotal)}</option><option value={2}>2x de {formatBRL(finalTotal/2)}</option><option value={3}>3x de {formatBRL(finalTotal/3)}</option></select></div>
               </div>
             ) : (
               <div className="text-center py-6 animate-fade-in">
                  <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#0097A8]"><QrCode size={40}/></div>
                  <p className="text-sm text-slate-600 mb-4">Ao clicar abaixo, geraremos um código QR para você pagar instantaneamente.</p>
                  <div className="flex justify-center"><Badge type="green">Aprovação Imediata</Badge></div>
                  
                  <div className="text-left mt-4">
                      <label className="text-xs font-bold text-slate-500 uppercase">CPF do Pagador (Opcional)</label>
                      <input className="w-full border p-3 rounded-lg mt-1" placeholder="000.000.000-00" value={docNumber} onChange={e=>setDocNumber(e.target.value)}/>
                  </div>
               </div>
             )}
             
             <Button className="w-full py-4 mt-6 text-lg" onClick={processCardPayment} disabled={processing}>
                 {processing ? 'Processando...' : (paymentMethod === 'pix' ? 'Gerar Código Pix' : `Pagar ${formatBRL(finalTotal)}`)}
             </Button>
             <p className="text-center text-xs text-slate-400 mt-3 flex justify-center items-center gap-1"><Lock size={10}/> Seus dados são criptografados.</p>
          </div>
        </div>

        {/* Resumo Lateral (Igual ao anterior) */}
        <div>
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl sticky top-24">
              <h3 className="font-bold text-xl text-slate-900">{bookingData.item.name}</h3>
              <p className="text-sm text-slate-500 mb-6">{bookingData.date.split('-').reverse().join('/')}</p>
              
              <div className="space-y-3 text-sm text-slate-600 border-t pt-4">
                  <div className="flex justify-between"><span>Adultos ({bookingData.adults})</span><b>{formatBRL(bookingData.adults * bookingData.priceSnapshot.adult)}</b></div>
                  {bookingData.children > 0 && <div className="flex justify-between"><span>Crianças ({bookingData.children})</span><b>{formatBRL(bookingData.children * bookingData.priceSnapshot.child)}</b></div>}
                  {bookingData.pets > 0 && <div className="flex justify-between"><span>Pets ({bookingData.pets})</span><b>{formatBRL(bookingData.pets * bookingData.priceSnapshot.pet)}</b></div>}
                  <div className="flex justify-between"><span>Taxa de Serviço</span><span className="text-green-600 font-bold">Grátis</span></div>
                  
                  {discount > 0 && (
                      <div className="flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded"><span>Desconto</span><span>- {formatBRL(discount)}</span></div>
                  )}

                  <div className="flex gap-2 pt-2">
                     <input className="border p-2 rounded-lg flex-1 text-xs uppercase" placeholder="Cupom de Desconto" value={couponCode} onChange={e=>setCouponCode(e.target.value)} />
                     <button onClick={handleApplyCoupon} className="bg-slate-200 px-4 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors">Aplicar</button>
                  </div>
                  
                  {couponMsg && (
                      <div className={`text-xs p-2 rounded text-center font-medium mt-1 ${couponMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {couponMsg.text}
                      </div>
                  )}

                  <div className="flex justify-between pt-4 border-t border-slate-100"><span className="font-bold text-lg">Total</span><span className="font-bold text-2xl text-[#0097A8]">{formatBRL(finalTotal)}</span></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const PartnerCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  const [status, setStatus] = useState('processing'); 
  
  useEffect(() => {
    // Usamos o listener do Firebase para GARANTIR que o usuário foi carregado antes de processar
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!code) { 
        setStatus('error'); 
        return; 
      }

      // Se o Firebase terminou de carregar e não tem usuário, aí sim é erro
      if (!user) {
        console.error("Usuário não autenticado no retorno do callback.");
        setStatus('error'); 
        return; 
      }

      // Se temos usuário, prossegue com a troca do token
      try {
        // Pega a URL base dinamicamente (para funcionar com ou sem www)
        const currentBaseUrl = window.location.origin;
        const redirectUri = `${currentBaseUrl}/partner/callback`;

        const res = await fetch('/api/exchange-token', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ code, redirectUri }) 
        });
        
        const data = await res.json();
        
        if (res.ok) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { 
              mp_access_token: data.access_token, 
              mp_user_id: data.user_id, 
              mp_connected_at: new Date() 
          });
          setStatus('success'); 
          setTimeout(() => navigate('/partner'), 2000);
        } else { 
            console.error("Erro na troca de token:", data);
            setStatus('error'); 
        }
      } catch (error) { 
          console.error("Erro na requisição:", error);
          setStatus('error'); 
      }
    });

    // Limpa o listener ao desmontar
    return () => unsubscribe();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
        {status === 'processing' && (
            <>
                <div className="animate-spin w-12 h-12 border-4 border-[#0097A8] border-t-transparent rounded-full mx-auto mb-4"></div>
                <h2 className="text-xl font-bold">Conectando sua conta...</h2>
                <p className="text-slate-500 text-sm mt-2">Estamos finalizando a configuração.</p>
            </>
        )}
        {status === 'success' && (
            <>
                <CheckCircle size={32} className="text-green-600 mx-auto mb-4"/>
                <h2 className="text-xl font-bold">Conta Conectada!</h2>
                <p className="text-slate-500 text-sm mt-2">Redirecionando para o painel...</p>
            </>
        )}
        {status === 'error' && (
            <>
                <X size={32} className="text-red-600 mx-auto mb-4"/>
                <h2 className="text-xl font-bold">Erro na Conexão</h2>
                <p className="text-slate-500 text-sm mt-2 mb-4">Não foi possível vincular sua conta do Mercado Pago.</p>
                <Button onClick={()=>navigate('/partner')}>Voltar ao Painel</Button>
            </>
        )}
      </div>
    </div>
  );
};

// --- USER DASHBOARD (MEUS INGRESSOS) ---
const UserDashboard = () => {
  const [trips, setTrips] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
     const unsub = onAuthStateChanged(auth, u => {
        if(u) {
           setUser(u);
           const q = query(collection(db, "reservations"), where("userId", "==", u.uid));
           getDocs(q).then(s => setTrips(s.docs.map(d => ({id: d.id, ...d.data()}))));
        }
     });
     return unsub;
  }, []);

  const handleCancel = async (id) => {
    if(confirm("Deseja realmente cancelar esta reserva?")) {
       await deleteDoc(doc(db, "reservations", id));
       setTrips(trips.filter(t => t.id !== id));
       alert("Cancelado com sucesso.");
    }
  };

  const handleLogout = async () => { await signOut(auth); window.location.href = '/'; }

  if (!user) return <div className="text-center py-20 text-slate-400">Carregando...</div>;

  return (
     <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <VoucherModal isOpen={!!selectedVoucher} trip={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Meus Ingressos</h1>
        </div>
        
        <div className="space-y-6">
           {trips.map(t => (
              <div key={t.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                 <div className="flex gap-4 items-center w-full md:w-auto">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0"><img src={t.itemImage} className="w-full h-full object-cover"/></div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{t.itemName}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><CalendarIcon size={14}/> {t.date}</p>
                      
                      {/* RESUMO COMPLETO SOLICITADO */}
                      <div className="text-xs text-slate-500 mt-2 font-medium flex gap-3 flex-wrap">
                          <span className="flex items-center gap-1"><User size={12}/> {t.adults} Adultos</span>
                          {t.children > 0 && <span>• {t.children} Crianças</span>}
                          {t.pets > 0 && <span className="flex items-center gap-1">• <PawPrint size={12}/> {t.pets}</span>}
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                          <Badge type={t.status === 'cancelled' ? 'red' : t.status === 'validated' ? 'green' : 'default'}>
                             {t.status === 'cancelled' ? 'Cancelado' : t.status === 'validated' ? 'Utilizado' : 'Confirmado'}
                          </Badge>
                          <span className="font-bold text-slate-900">{formatBRL(t.total)}</span>
                      </div>

                      {/* CÓDIGO EVIDENTE NO CARD */}
                      <div className="mt-2 text-xs font-mono bg-slate-50 p-1 px-2 rounded w-fit border border-slate-200 text-slate-500">
                         #{t.id?.slice(0,6).toUpperCase()}
                      </div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                    <Button variant="outline" className="px-4 py-2 h-auto text-xs" onClick={() => setSelectedVoucher(t)}>Ver Voucher</Button>
                    {t.status !== 'cancelled' && <Button variant="danger" className="px-4 py-2 h-auto text-xs bg-white text-red-500 hover:bg-red-50 border-red-100" onClick={() => handleCancel(t.id)}>Cancelar</Button>}
                 </div>
              </div>
           ))}
           {trips.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border border-dashed"><p className="text-slate-400">Você ainda não tem reservas.</p></div>}
        </div>
     </div>
  );
};

const PartnerDashboard = () => {
  const [items, setItems] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedRes, setSelectedRes] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [validationCode, setValidationCode] = useState("");
  const [mpConnected, setMpConnected] = useState(false);
  const [expandedStats, setExpandedStats] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
     const unsub = onAuthStateChanged(auth, async u => {
        if(u) {
           setUser(u);
           const userDoc = await getDoc(doc(db, "users", u.uid));
           if(userDoc.exists() && userDoc.data().mp_access_token) setMpConnected(true);
           const qDay = query(collection(db, "dayuses"), where("ownerId", "==", u.uid));
           const qRes = query(collection(db, "reservations"), where("ownerId", "==", u.uid));
           
           onSnapshot(qDay, s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
           onSnapshot(qRes, s => setReservations(s.docs.map(d => ({id: d.id, ...d.data()}))));
        }
     });
     return unsub;
  }, []);
  
  const handleConnect = () => {
     // Pega a URL atual do navegador (com ou sem www) para garantir que bata com o painel
     const currentBaseUrl = window.location.origin; 
     const redirect = `${currentBaseUrl}/partner/callback`;
     
     // Codifica a URL corretamente para passar como parâmetro
     const encodedRedirect = encodeURIComponent(redirect);
     const clientId = import.meta.env.VITE_MP_CLIENT_ID;

     console.log("Conectando MP com:", { clientId, redirect });

     window.location.href = `https://auth.mercadopago.com.br/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${user.uid}&redirect_uri=${encodedRedirect}`;
  };

  if (!user) return <div className="text-center py-20 text-slate-400">Carregando painel...</div>;

  // Filtragem Financeira
  const financialRes = reservations.filter(r => new Date(r.createdAt.seconds * 1000).getMonth() === filterMonth && r.status === 'confirmed');
  const totalBalance = financialRes.reduce((acc, c) => acc + (c.total || 0), 0);
  const pendingBalance = totalBalance; 

  // Filtragem Operacional (Check-in)
  const dailyGuests = reservations.filter(r => r.date === filterDate && (r.guestName || "Viajante").toLowerCase().includes(searchTerm.toLowerCase()));
  const dailyStats = dailyGuests.reduce((acc, curr) => ({
      adults: acc.adults + (curr.adults || 0),
      children: acc.children + (curr.children || 0),
      pets: acc.pets + (curr.pets || 0),
      total: acc.total + (curr.adults || 0) + (curr.children || 0)
  }), { adults: 0, children: 0, pets: 0, total: 0 });

  // Cupons Stats
  const allCouponsUsed = reservations.filter(r => r.discount > 0).length;
  const couponBreakdown = reservations.reduce((acc, r) => {
      if (r.discount > 0) {
          const code = r.couponCode || "OUTROS"; 
          acc[code] = (acc[code] || 0) + 1;
      }
      return acc;
  }, {});

  const handleValidate = async (resId, codeInput) => {
     if(codeInput.toUpperCase() === resId.slice(0,6).toUpperCase()) {
        await updateDoc(doc(db, "reservations", resId), { status: 'validated' });
        alert("Check-in realizado com sucesso!");
        setValidationCode("");
     } else {
        alert("Código inválido!");
     }
  };
  
  const handleScan = () => {
      const code = prompt("Simulação de Câmera: Digite o código do QR Code:");
      if (code) {
          const res = reservations.find(r => r.id === code);
          if (res) handleValidate(res.id, res.id.slice(0,6));
          else alert("Reserva não encontrada.");
      }
  };

  return (
     <div className="max-w-7xl mx-auto py-12 px-4 animate-fade-in space-y-12">
        <VoucherModal isOpen={!!selectedRes} trip={selectedRes} onClose={()=>setSelectedRes(null)} isPartnerView={true}/>
        <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
           <div><h1 className="text-3xl font-bold text-slate-900">Painel de Gestão</h1><p className="text-slate-500">Acompanhe seu negócio.</p></div>
           <div className="flex gap-2">
              {!mpConnected ? <Button onClick={handleConnect} className="bg-blue-500 hover:bg-blue-600">Conectar Mercado Pago</Button> : <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold flex gap-2 items-center"><CheckCircle size={18}/> Conta Conectada</div>}
              <Button onClick={()=>navigate('/partner/new')}>+ Criar Anúncio</Button>
           </div>
        </div>

        {/* Financeiro */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold flex gap-2"><DollarSign/> Financeiro</h2>
              <select className="border p-2 rounded-lg" value={filterMonth} onChange={e=>setFilterMonth(Number(e.target.value))}>
                 {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
           </div>
           <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 bg-green-50 rounded-2xl border border-green-200">
                 <p className="text-sm text-green-700 font-bold uppercase">Total Vendido</p>
                 <p className="text-4xl font-bold text-green-700">{formatBRL(totalBalance)}</p>
              </div>
              
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase">Cupons Usados</p>
                        <p className="text-4xl font-bold text-slate-900">{allCouponsUsed}</p>
                    </div>
                    <Tag className="text-slate-300" size={48}/>
                 </div>
                 <div className="mt-4 pt-4 border-t border-slate-200 space-y-1">
                    {Object.keys(couponBreakdown).length === 0 && <p className="text-xs text-slate-400">Nenhum cupom usado ainda.</p>}
                    {Object.entries(couponBreakdown).map(([code, count]) => (
                        <div key={code} className="flex justify-between text-xs text-slate-600">
                            <span className="font-bold bg-white px-1 rounded border border-slate-200">{code}</span>
                            <span>{count}x</span>
                        </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Operacional Diário */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
              <h2 className="text-xl font-bold flex gap-2"><List/> Lista de Presença</h2>
              <div className="flex gap-4">
                 <input type="date" className="border p-2 rounded-lg" value={filterDate} onChange={e=>setFilterDate(e.target.value)}/>
                 <Button variant="outline" onClick={handleScan}><ScanLine size={18}/> Validar Ingresso</Button>
              </div>
           </div>
           
           <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-100 cursor-pointer" onClick={()=>setExpandedStats(!expandedStats)}>
               <div className="flex justify-between items-center">
                   <span className="font-bold text-blue-900 flex items-center gap-2"><Users size={18}/> Total Esperado Hoje: {dailyStats.total} pessoas</span>
                   <ChevronDown size={16} className={`text-blue-900 transition-transform ${expandedStats ? 'rotate-180' : ''}`}/>
               </div>
               {expandedStats && (
                   <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-3 gap-4 text-center text-sm">
                       <div><p className="font-bold">{dailyStats.adults}</p><span>Adultos</span></div>
                       <div><p className="font-bold">{dailyStats.children}</p><span>Crianças</span></div>
                       <div><p className="font-bold">{dailyStats.pets}</p><span>Pets</span></div>
                   </div>
               )}
           </div>
           
           <div className="space-y-4">
              <input className="w-full border p-3 rounded-lg mb-4" placeholder="Buscar viajante por nome..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
              
              {dailyGuests.length === 0 ? <p className="text-center text-slate-400 py-8">Nenhum viajante para esta data.</p> : dailyGuests.map(r => (
                 <div key={r.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200 gap-4">
                    <div className="flex-1">
                       <p className="font-bold text-lg text-slate-900">{r.guestName}</p>
                       <p className="text-sm text-slate-500">Reserva #{r.id.slice(0,6).toUpperCase()} • {r.itemName}</p>
                       <div className="flex gap-2 mt-1 text-xs text-slate-600">
                          <span className="bg-white px-2 py-1 rounded border">{r.adults} Adultos</span>
                          {r.children > 0 && <span className="bg-white px-2 py-1 rounded border">{r.children} Crianças</span>}
                          {r.pets > 0 && <span className="bg-white px-2 py-1 rounded border flex items-center gap-1"><PawPrint size={10}/> Pet</span>}
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {r.status === 'validated' ? (
                          <div className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg flex items-center gap-2"><CheckCircle size={18}/> Validado</div>
                       ) : (
                          <div className="flex gap-2">
                             <input id={`code-${r.id}`} className="border p-2 rounded-lg w-32 text-center uppercase" placeholder="Cód." maxLength={6}/>
                             <Button onClick={()=>handleValidate(r.id, document.getElementById(`code-${r.id}`).value)} className="h-full py-2">Ok</Button>
                          </div>
                       )}
                       <Button variant="outline" className="h-full py-2 px-3" onClick={()=>setSelectedRes(r)}><Info size={18}/></Button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
        
        <div>
           <h2 className="text-xl font-bold mb-6">Meus Anúncios</h2>
           <div className="grid md:grid-cols-2 gap-6">
              {items.map(i => (
                 <div key={i.id} className="bg-white p-4 border rounded-2xl flex gap-4 items-center shadow-sm">
                    <img src={i.image} className="w-20 h-20 rounded-xl object-cover bg-slate-200"/>
                    <div className="flex-1">
                       <h4 className="font-bold text-slate-900">{i.name}</h4>
                       <p className="text-sm text-slate-500">{i.city}</p>
                       <p className="text-sm font-bold text-[#0097A8] mt-1">{formatBRL(i.priceAdult)}</p>
                    </div>
                    <Button variant="outline" className="px-4" onClick={()=>navigate(`/partner/edit/${i.id}`)}><Edit size={16}/> Editar</Button>
                 </div>
              ))}
           </div>
        </div>
     </div>
  );
};

const PartnerNew = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  // States Novos e Ajustados
  const [coupons, setCoupons] = useState([]); 
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPerc, setNewCouponPerc] = useState('');
  const [dailyStock, setDailyStock] = useState({ adults: 50, children: 20, pets: 5 });
  
  // Novo formato de preços semanais: { 0: { adult: 50, child: 25, pet: 10 }, ... }
  const [weeklyPrices, setWeeklyPrices] = useState({});
  const [cnpjError, setCnpjError] = useState(false);

  const [formData, setFormData] = useState({
    contactName: '', contactEmail: '', contactPhone: '', contactJob: '',
    cnpj: '', name: '', cep: '', street: '', number: '', district: '', city: '', state: '',
    // Novos campos de contato do local
    localEmail: '', localPhone: '', localWhatsapp: '',
    description: '', videoUrl: '', images: ['', '', '', '', '', ''],
    // Preços Base (usados se não houver override no dia)
    priceAdult: '', priceChild: '', petFee: '',
    // Faixas Etárias e Regras
    adultAgeStart: '12', 
    childAgeStart: '2', childAgeEnd: '11',
    gratuitousness: '',
    petAllowed: false, petSize: 'Pequeno porte',
    availableDays: [0, 6], // Dias ativos (0=Dom, 1=Seg...)
    includedItems: '', notIncludedItems: '', usageRules: '', cancellationPolicy: '', observations: ''
  });

  useEffect(() => {
     const unsub = onAuthStateChanged(auth, async u => {
        if(u) {
           setUser(u);
           if (!id) setFormData(prev => ({ ...prev, contactName: u.displayName || '', contactEmail: u.email }));
        } else navigate('/');
     });
     if (id) {
        getDoc(doc(db, "dayuses", id)).then(s => { 
            if(s.exists()) {
                const d = s.data();
                setFormData(d);
                if(d.coupons) setCoupons(d.coupons);
                if(d.dailyStock) setDailyStock(d.dailyStock);
                if(d.weeklyPrices) setWeeklyPrices(d.weeklyPrices);
            }
        });
     }
     return unsub;
  }, [id]);

  const handleCepBlur = async () => {
    if (formData.cep?.replace(/\D/g, '').length === 8) {
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

  const handleCnpjChange = (e) => {
      const val = e.target.value;
      setFormData({...formData, cnpj: val});
      // Validação visual simples de tamanho
      const nums = val.replace(/\D/g, '');
      if (nums.length > 0 && nums.length !== 14) setCnpjError(true);
      else setCnpjError(false);
  };

  const handleImageChange = (index, value) => { const newImages = [...formData.images]; newImages[index] = value; setFormData({...formData, images: newImages}); };
  
  const toggleDay = (dayIndex) => { 
      const newDays = formData.availableDays.includes(dayIndex) 
          ? formData.availableDays.filter(d => d !== dayIndex)
          : [...formData.availableDays, dayIndex];
      setFormData({...formData, availableDays: newDays});
  };

  const handleWeeklyPriceChange = (dayIndex, field, value) => {
      setWeeklyPrices(prev => ({
          ...prev,
          [dayIndex]: { ...prev[dayIndex], [field]: value }
      }));
  };
  
  const addCoupon = () => {
     if(newCouponCode && newCouponPerc) {
         setCoupons([...coupons, { code: newCouponCode.toUpperCase(), percentage: Number(newCouponPerc) }]);
         setNewCouponCode(''); setNewCouponPerc('');
     }
  };

  const removeCoupon = (idx) => {
    const newCoupons = [...coupons];
    newCoupons.splice(idx, 1);
    setCoupons(newCoupons);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!validateCNPJ(formData.cnpj)) { alert("CNPJ inválido (deve ter 14 dígitos)."); return; }
    if (!formData.localWhatsapp) { alert("O WhatsApp do local é obrigatório para suporte ao cliente."); return; }
    
    setLoading(true);
    const dataToSave = { 
        ...formData, 
        ownerId: user.uid, 
        coupons, 
        dailyStock, 
        weeklyPrices, // Salva a tabela de preços
        priceAdult: Number(formData.priceAdult), 
        slug: generateSlug(formData.name), 
        updatedAt: new Date() 
    };
    
    try { 
        if (id) await updateDoc(doc(db, "dayuses", id), dataToSave);
        else await addDoc(collection(db, "dayuses"), { ...dataToSave, createdAt: new Date() });
        navigate('/partner'); 
    } catch (err) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
     <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 text-center text-slate-900">{id ? 'Editar Anúncio' : 'Cadastrar Novo Day Use'}</h1>
        <p className="text-center text-slate-500 mb-8">Preencha as informações com atenção para atrair mais viajantes.</p>
        
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-8">
           
           {/* 1. DADOS PESSOAIS */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4">
                  <h3 className="font-bold text-lg text-[#0097A8]">1. Dados do Responsável</h3>
                  <p className="text-xs text-slate-500">Quem administrará este anúncio.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                     <label className="text-sm font-bold text-slate-700 block mb-1">Nome Completo</label>
                     <input className="w-full border p-3 rounded-xl" value={formData.contactName} onChange={e=>setFormData({...formData, contactName: e.target.value})} placeholder="Seu nome" />
                 </div>
                 <div>
                     <label className="text-sm font-bold text-slate-700 block mb-1">E-mail de Cadastro</label>
                     <input className="w-full border p-3 rounded-xl bg-slate-50 text-slate-500" value={formData.contactEmail} readOnly />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                     <label className="text-sm font-bold text-slate-700 block mb-1">Telefone Pessoal</label>
                     <input className="w-full border p-3 rounded-xl" placeholder="(00) 00000-0000" value={formData.contactPhone} onChange={e=>setFormData({...formData, contactPhone: e.target.value})} required/>
                 </div>
                 <div>
                     <label className="text-sm font-bold text-slate-700 block mb-1">Cargo na Empresa</label>
                     <select className="w-full border p-3 rounded-xl bg-white" value={formData.contactJob} onChange={e=>setFormData({...formData, contactJob: e.target.value})} required>
                        <option value="">Selecione...</option>
                        <option>Sócio/Proprietário</option>
                        <option>Gerente</option>
                        <option>Coordenador</option>
                        <option>Recepcionista</option>
                        <option>Assistente</option>
                        <option>Outros</option>
                     </select>
                 </div>
              </div>
           </div>
           
           {/* 2. DADOS DA EMPRESA E LOCAL */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4">
                  <h3 className="font-bold text-lg text-[#0097A8]">2. Dados do Local</h3>
                  <p className="text-xs text-slate-500">Informações públicas do estabelecimento.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">CNPJ</label>
                      <input className={`w-full border p-3 rounded-xl ${cnpjError ? 'border-red-300 bg-red-50' : ''}`} placeholder="Apenas números" value={formData.cnpj} onChange={handleCnpjChange} required/>
                      {cnpjError && <p className="text-xs text-red-500 mt-1">CNPJ deve ter 14 dígitos.</p>}
                      {!cnpjError && formData.cnpj.length === 14 && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={10}/> Formato válido</p>}
                  </div>
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">Nome do Local (Fantasia)</label>
                      <input className="w-full border p-3 rounded-xl" placeholder="Ex: Pousada Recanto das Águas" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required/>
                  </div>
              </div>

              {/* Contatos do Local */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-700 mb-3">Contatos de Suporte ao Cliente</p>
                  <div className="grid md:grid-cols-3 gap-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">WhatsApp (Obrigatório)</label>
                          <input className="w-full border p-2 rounded-lg" placeholder="(00) 00000-0000" value={formData.localWhatsapp} onChange={e=>setFormData({...formData, localWhatsapp: e.target.value})} required/>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">Telefone Fixo</label>
                          <input className="w-full border p-2 rounded-lg" placeholder="(00) 0000-0000" value={formData.localPhone} onChange={e=>setFormData({...formData, localPhone: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">E-mail de Suporte</label>
                          <input className="w-full border p-2 rounded-lg" placeholder="contato@local.com" value={formData.localEmail} onChange={e=>setFormData({...formData, localEmail: e.target.value})} />
                      </div>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">CEP</label>
                      <input className="w-full border p-3 rounded-xl" placeholder="00000-000" value={formData.cep} onChange={e=>setFormData({...formData, cep: e.target.value})} onBlur={handleCepBlur} required/>
                  </div>
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">Número</label>
                      <input className="w-full border p-3 rounded-xl" placeholder="Nº" value={formData.number} onChange={e=>setFormData({...formData, number: e.target.value})} required/>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">Cidade</label>
                      <input className="w-full border p-3 rounded-xl bg-slate-50" value={formData.city} readOnly/>
                  </div>
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">Estado</label>
                      <input className="w-full border p-3 rounded-xl bg-slate-50" value={formData.state} readOnly/>
                  </div>
              </div>
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Logradouro (Rua/Av)</label>
                  <input className="w-full border p-3 rounded-xl" value={formData.street} onChange={e=>setFormData({...formData, street: e.target.value})} required/>
              </div>
           </div>

           {/* 3. SOBRE O DAY USE */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4">
                  <h3 className="font-bold text-lg text-[#0097A8]">3. Sobre a Experiência</h3>
                  <p className="text-xs text-slate-500">Descrição e imagens.</p>
              </div>
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Descrição Completa</label>
                  <textarea className="w-full border p-3 rounded-xl h-32" placeholder="Fale sobre as atrações..." value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} required/>
              </div>
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Vídeo do YouTube (Opcional)</label>
                  <input className="w-full border p-3 rounded-xl" placeholder="Cole o link do vídeo aqui" value={formData.videoUrl} onChange={e=>setFormData({...formData, videoUrl: e.target.value})} />
              </div>
              
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">Galeria de Fotos (Links)</label>
                  <div className="grid gap-2">
                    {formData.images.map((img, i) => (
                        <input key={i} className="w-full border p-2 rounded-lg text-sm" placeholder={i === 0 ? `URL da Foto Principal (Capa)` : `URL da Foto ${i+1}`} value={img} onChange={e=>handleImageChange(i, e.target.value)} required={i===0}/>
                    ))}
                  </div>
              </div>
           </div>
           
           {/* 4. FUNCIONAMENTO E PREÇOS (TABELA) */}
           <div className="space-y-6">
              <div className="border-b pb-2 mb-4">
                  <h3 className="font-bold text-lg text-[#0097A8]">4. Funcionamento e Valores</h3>
                  <p className="text-xs text-slate-500">Defina os dias e preços específicos.</p>
              </div>

              {/* Tabela de Dias e Preços */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 border rounded-xl overflow-hidden">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th className="px-4 py-3">Dia</th>
                            <th className="px-4 py-3">Adulto (R$)</th>
                            <th className="px-4 py-3">Criança (R$)</th>
                            <th className="px-4 py-3">Pet (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weekDays.map((day, index) => {
                            const isActive = formData.availableDays.includes(index);
                            return (
                                <tr key={index} className={`border-b ${isActive ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
                                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                                        <input type="checkbox" checked={isActive} onChange={() => toggleDay(index)} className="accent-[#0097A8] w-4 h-4"/>
                                        {day}
                                    </td>
                                    <td className="px-4 py-2">
                                        <input 
                                            disabled={!isActive}
                                            className="border p-2 rounded w-24" 
                                            placeholder="Padrão" 
                                            type="number"
                                            value={weeklyPrices[index]?.adult || ''}
                                            onChange={(e) => handleWeeklyPriceChange(index, 'adult', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input 
                                            disabled={!isActive}
                                            className="border p-2 rounded w-24" 
                                            placeholder="Padrão" 
                                            type="number"
                                            value={weeklyPrices[index]?.child || ''}
                                            onChange={(e) => handleWeeklyPriceChange(index, 'child', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input 
                                            disabled={!isActive}
                                            className="border p-2 rounded w-24" 
                                            placeholder="Padrão" 
                                            type="number"
                                            value={weeklyPrices[index]?.pet || ''}
                                            onChange={(e) => handleWeeklyPriceChange(index, 'pet', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <p className="text-sm font-bold text-slate-700 mb-2">Preços Padrão (Base)</p>
                 <p className="text-xs text-slate-500 mb-4">Esses valores serão usados caso você deixe os campos da tabela acima vazios.</p>
                 <div className="grid grid-cols-3 gap-4">
                    <input className="border p-3 rounded-xl w-full" type="number" placeholder="Adulto Base (R$)" value={formData.priceAdult} onChange={e=>setFormData({...formData, priceAdult: e.target.value})} required/>
                    <input className="border p-3 rounded-xl w-full" type="number" placeholder="Criança Base (R$)" value={formData.priceChild} onChange={e=>setFormData({...formData, priceChild: e.target.value})}/>
                    <input className="border p-3 rounded-xl w-full" type="number" placeholder="Pet Base (R$)" value={formData.petFee} onChange={e=>setFormData({...formData, petFee: e.target.value})}/>
                 </div>
              </div>

              {/* Capacidade */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className="text-sm font-bold text-slate-700 block mb-2">Capacidade Diária (Estoque)</label>
                 <div className="flex gap-4">
                    <div className="w-full">
                        <span className="text-xs text-slate-500 block mb-1">Max. Adultos</span>
                        <input className="border p-2 rounded w-full" type="number" value={dailyStock.adults} onChange={e=>setDailyStock({...dailyStock, adults: Number(e.target.value)})}/>
                    </div>
                    <div className="w-full">
                        <span className="text-xs text-slate-500 block mb-1">Max. Crianças</span>
                        <input className="border p-2 rounded w-full" type="number" value={dailyStock.children} onChange={e=>setDailyStock({...dailyStock, children: Number(e.target.value)})}/>
                    </div>
                    <div className="w-full">
                        <span className="text-xs text-slate-500 block mb-1">Max. Pets</span>
                        <input className="border p-2 rounded w-full" type="number" value={dailyStock.pets} onChange={e=>setDailyStock({...dailyStock, pets: Number(e.target.value)})}/>
                    </div>
                 </div>
              </div>

              {/* Regras de Idade e Gratuidade */}
              <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Regras de Idade</label>
                      <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">Adulto: Acima de</span>
                          <input className="border p-2 rounded w-16 text-center" type="number" value={formData.adultAgeStart} onChange={e=>setFormData({...formData, adultAgeStart: e.target.value})} />
                          <span className="text-sm text-slate-600">anos</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">Criança: Entre</span>
                          <input className="border p-2 rounded w-16 text-center" type="number" value={formData.childAgeStart} onChange={e=>setFormData({...formData, childAgeStart: e.target.value})} />
                          <span className="text-sm text-slate-600">e</span>
                          <input className="border p-2 rounded w-16 text-center" type="number" value={formData.childAgeEnd} onChange={e=>setFormData({...formData, childAgeEnd: e.target.value})} />
                          <span className="text-sm text-slate-600">anos</span>
                      </div>
                  </div>
                  
                  <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Pets e Gratuidade</label>
                      <div>
                          <span className="text-xs text-slate-500 block mb-1">Porte de Pet Aceito</span>
                          <select className="border p-2 rounded w-full bg-white" value={formData.petSize} onChange={e=>setFormData({...formData, petSize: e.target.value})}>
                              <option>Não aceita</option>
                              <option>Pequeno</option>
                              <option>Médio</option>
                              <option>Grande</option>
                              <option>Todos os portes</option>
                          </select>
                      </div>
                      <div>
                          <span className="text-xs text-slate-500 block mb-1">Política de Gratuidade</span>
                          <input className="border p-2 rounded w-full" placeholder="Ex: Crianças até 2 anos free" value={formData.gratuitousness} onChange={e=>setFormData({...formData, gratuitousness: e.target.value})}/>
                      </div>
                  </div>
              </div>

              {/* CUPONS */}
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                 <p className="text-sm font-bold text-yellow-800 mb-2">Cupons de Desconto</p>
                 <div className="flex gap-2 mb-2">
                    <input className="border p-2 rounded-lg flex-1 text-sm uppercase" placeholder="CÓDIGO (Ex: VERAO10)" value={newCouponCode} onChange={e=>setNewCouponCode(e.target.value)} />
                    <input className="border p-2 rounded-lg w-24 text-sm" placeholder="Desconto %" type="number" value={newCouponPerc} onChange={e=>setNewCouponPerc(e.target.value)} />
                    <Button onClick={addCoupon} className="py-2 px-4 text-xs bg-yellow-600 hover:bg-yellow-700 border-none text-white">Adicionar</Button>
                 </div>
                 <div className="space-y-1">
                    {coupons.map((c, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-yellow-200 text-sm">
                            <span className="font-bold text-slate-700">{c.code} <span className="text-green-600">({c.percentage}% OFF)</span></span>
                            <button type="button" onClick={()=>removeCoupon(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* 5. UTILIZAÇÃO & REGRAS */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4">
                  <h3 className="font-bold text-lg text-[#0097A8]">5. Regras e Políticas</h3>
                  <p className="text-xs text-slate-500">Transparência evita problemas futuros.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                 <div>
                     <label className="text-sm font-bold text-green-700 block mb-1">O que está INCLUSO?</label>
                     <textarea className="w-full border p-3 rounded-xl h-24 bg-green-50/50" placeholder="Ex: Café da manhã, Piscina, Estacionamento..." value={formData.includedItems} onChange={e=>setFormData({...formData, includedItems: e.target.value})}/>
                 </div>
                 <div>
                     <label className="text-sm font-bold text-red-600 block mb-1">O que NÃO está incluso?</label>
                     <textarea className="w-full border p-3 rounded-xl h-24 bg-red-50/50" placeholder="Ex: Bebidas alcoólicas, Toalhas, Almoço..." value={formData.notIncludedItems} onChange={e=>setFormData({...formData, notIncludedItems: e.target.value})}/>
                 </div>
              </div>
              
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Regras de Utilização do Local</label>
                  <textarea className="w-full border p-3 rounded-xl h-24" placeholder="Ex: Proibido som automotivo, proibido entrada com bebidas..." value={formData.usageRules} onChange={e=>setFormData({...formData, usageRules: e.target.value})}/>
              </div>
              
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Política de Cancelamento e Reembolso</label>
                  <textarea className="w-full border p-3 rounded-xl h-24" placeholder="Ex: Cancelamento grátis até 24h antes. Após isso, multa de 50%..." value={formData.cancellationPolicy} onChange={e=>setFormData({...formData, cancellationPolicy: e.target.value})}/>
              </div>
              
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Observações Gerais (Opcional)</label>
                  <textarea className="w-full border p-3 rounded-xl h-20" placeholder="Outras informações relevantes..." value={formData.observations} onChange={e=>setFormData({...formData, observations: e.target.value})}/>
              </div>
           </div>
           
           <div className="pt-4 border-t">
               <Button type="submit" className="w-full py-4 text-lg shadow-xl" disabled={loading}>
                   {loading ? "Salvando anúncio..." : "Finalizar e Publicar"}
               </Button>
           </div>
        </form>
     </div>
  );
};

// --- PAGINAS AUXILIARES ---
const PartnerRegisterPage = () => { const navigate = useNavigate(); return <LoginModal isOpen={true} onClose={()=>navigate('/')} initialRole="partner" hideRoleSelection={true} closeOnSuccess={false} onSuccess={(u)=>navigate(u ? '/partner/new' : '/')} initialMode="register" customTitle="Criar conta" customSubtitle=" " />; };

// --- ESTRUTURA PRINCIPAL ---
const Layout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
       if(u) {
          const snap = await getDoc(doc(db, "users", u.uid));
          setUser({ ...u, role: snap.data()?.role || 'user' });
       } else setUser(null);
    });
  }, []);

  const handleLogout = async () => {
     await signOut(auth);
     navigate('/');
  };

  const handleLoginSuccess = (userWithRole) => {
     setShowLogin(false);
     if (userWithRole.role === 'partner') navigate('/partner');
     else navigate('/minhas-viagens');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <GlobalStyles />
      <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={handleLoginSuccess} />
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
           <div className="flex items-center gap-2 font-bold text-xl cursor-pointer text-slate-800" onClick={()=>navigate('/')}>
              <img src="/logo.svg" alt="Logo" className="h-10 w-auto" onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} />
              <span className="hidden sm:inline">Mapa do Day Use</span>
           </div>
           <div className="flex items-center gap-4">
              {!user ? (
                 <>
                   <button onClick={()=>{navigate('/partner-register')}} className="text-sm font-bold text-slate-500 hover:text-[#0097A8] hidden md:block">Seja um parceiro</button>
                   <Button variant="ghost" onClick={()=>setShowLogin(true)} className="font-bold">Entrar</Button>
                 </>
              ) : (
                 <div className="flex gap-4 items-center">
                    {user.role === 'partner' && <Button variant="ghost" onClick={()=>navigate('/partner')}>Painel</Button>}
                    {/* Se for parceiro, não mostra link de ingressos. Se for user, mostra. */}
                    {user.role !== 'partner' && <Button variant="ghost" onClick={()=>navigate('/minhas-viagens')}>Meus Ingressos</Button>}
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center font-bold text-[#0097A8] border-2 border-white shadow-sm" title={user.email} onClick={()=>navigate('/profile')}>{user.email[0].toUpperCase()}</div>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50" title="Sair"><LogOut size={20}/></button>
                 </div>
              )}
           </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>
      
      <footer className="bg-white border-t border-slate-100 py-12 mt-auto">
         <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left"><div className="flex items-center justify-center md:justify-start gap-2 font-bold text-slate-900 mb-2"><MapPin size={18} className="text-[#0097A8]" /> Mapa do Day Use</div><p className="text-sm text-slate-500">© 2026 Belo Horizonte, MG.</p></div>
            <div className="text-center text-sm text-slate-500">Feito com carinho por <a href="https://instagram.com/iurifrancast" target="_blank" className="font-bold text-slate-900 hover:text-[#0097A8] transition-colors">Iuri França</a> em BH.</div>
            <a href="https://instagram.com/iurifrancast" target="_blank" className="p-3 rounded-full bg-slate-50 hover:bg-pink-50 text-slate-400 hover:text-[#E1306C] transition-all hover:scale-110 shadow-sm hover:shadow-md"><Instagram size={24} /></a>
         </div>
      </footer>
    </div>
  );
};

const App = () => {
  return (
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/:state/:slug" element={<Layout><DetailsPage /></Layout>} />
        {/* Rota legado para compatibilidade com IDs antigos */}
        <Route path="/stay/:id" element={<Layout><DetailsPage /></Layout>} />
        <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
        <Route path="/minhas-viagens" element={<Layout><UserDashboard /></Layout>} />
        <Route path="/profile" element={<Layout><UserProfile /></Layout>} />
        <Route path="/partner" element={<Layout><PartnerDashboard /></Layout>} />
        <Route path="/partner/new" element={<Layout><PartnerNew /></Layout>} />
        <Route path="/partner/edit/:id" element={<Layout><PartnerNew /></Layout>} />
        <Route path="/partner-register" element={<Layout><PartnerRegisterPage /></Layout>} />
        <Route path="/partner/callback" element={<Layout><PartnerCallbackPage /></Layout>} />
      </Routes>
  );
};

export default App;