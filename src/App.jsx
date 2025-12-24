import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { db, auth, googleProvider } from './firebase'; 
import { collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore'; 
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { initMercadoPago } from '@mercadopago/sdk-react';
import { 
  MapPin, Search, User, CheckCircle, 
  X, Info, AlertCircle, PawPrint, FileText, Ban, ChevronDown, Image as ImageIcon, Map as MapIcon, CreditCard, Calendar as CalendarIcon, Ticket, Lock, Briefcase, Instagram, Star, ChevronLeft, ChevronRight, ArrowRight, LogOut, List, Link as LinkIcon, Loader, QrCode, Copy
} from 'lucide-react';

// --- CONFIGURAÇÃO ---
try {
  if (import.meta.env.VITE_MP_PUBLIC_KEY) {
    initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'pt-BR' });
  }
} catch (e) { console.log("Erro config MP", e); }

const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;

// --- ESTILOS GLOBAIS ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #0d9488; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #0f766e; }
  `}</style>
);

// --- UTILITÁRIOS ---
const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const generateSlug = (text) => text?.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '') || 'local';
const getStateSlug = (uf) => uf ? uf.toLowerCase() : 'br';
const getYoutubeId = (url) => { if (!url) return null; const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/; const match = url.match(regExp); return (match && match[2].length === 11) ? match[2] : null; };

// --- COMPONENTES VISUAIS ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled }) => {
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20",
    outline: "border-2 border-teal-600 text-teal-600 hover:bg-teal-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
  };
  return <button onClick={onClick} disabled={disabled} className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}>{children}</button>;
};

const Badge = ({ children, type = 'default' }) => {
  const styles = { default: "bg-teal-50 text-teal-900 border-teal-100", red: "bg-red-50 text-red-900 border-red-100", green: "bg-green-50 text-green-800 border-green-200", gray: "bg-slate-100 text-slate-600 border-slate-200" };
  return <span className={`${styles[type]} text-xs px-3 py-1 rounded-full font-medium border flex items-center gap-1`}>{children}</span>;
};

const ModalOverlay = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={onClose} style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh'}}>
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

// --- MODAL DE PIX ---
const PixModal = ({ isOpen, onClose, pixData, onConfirm }) => {
  if (!isOpen || !pixData) return null;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixData.qr_code);
    alert("Código PIX copiado!");
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4"><QrCode size={32}/></div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Pagamento via PIX</h2>
        <p className="text-sm text-slate-500 mb-6">Escaneie o QR Code ou copie o código abaixo para pagar.</p>
        
        {pixData.qr_code_base64 && (
          <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="mx-auto w-48 h-48 mb-6 border-2 border-slate-100 rounded-xl" />
        )}
        
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

const VoucherModal = ({ isOpen, onClose, trip, isPartnerView = false }) => {
  if (!isOpen || !trip) return null;
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-teal-600 p-6 text-white text-center relative shrink-0">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24}/></button>
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><Ticket size={24} /></div>
        <h2 className="text-xl font-bold">{isPartnerView ? "Detalhes da Reserva" : "Voucher de Reserva"}</h2>
        <p className="text-teal-100 text-sm">{isPartnerView ? "Dados completos do cliente" : "Apresente este código na entrada"}</p>
      </div>
      <div className="p-8 text-sm text-slate-700 space-y-4">
        <div className="text-center mb-6 border-b border-dashed border-slate-200 pb-6">
          <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">CÓDIGO</p>
          <p className="text-3xl font-mono font-bold text-slate-900">#{trip.id?.slice(0,6).toUpperCase()}</p>
          <div className="mt-2"><Badge type={trip.status === 'cancelled' ? 'red' : 'green'}>{trip.status === 'cancelled' ? 'Cancelado' : 'Confirmado'}</Badge></div>
        </div>
        <div className="flex justify-between"><span>Local:</span> <b className="text-right">{trip.itemName}</b></div>
        <div className="flex justify-between"><span>Data:</span> <b>{trip.date?.split('-').reverse().join('/')}</b></div>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
            <p className="font-bold text-xs uppercase text-slate-500 mb-2 flex items-center gap-1"><User size={12}/> Responsável</p>
            <p className="font-bold text-base text-slate-900">{trip.guestName}</p>
            <p className="text-slate-600 mt-1">{trip.guestEmail}</p>
            <p className="text-slate-600">{trip.guestPhone}</p>
        </div>

        <div className="pt-2">
           <p className="text-slate-400 text-xs uppercase font-bold mb-2">Composição</p>
           <ul className="space-y-1">
             <li className="flex justify-between"><span>Adultos:</span> <b>{trip.adults}</b></li>
             {trip.children > 0 && <li className="flex justify-between"><span>Crianças:</span> <b>{trip.children}</b></li>}
             <li className="flex justify-between"><span>Pets:</span> <b className={trip.pets > 0 ? "text-teal-600" : ""}>{trip.pets > 0 ? `${trip.pets} (Sim)` : "Não"}</b></li>
           </ul>
        </div>

        {isPartnerView && (
           <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center text-lg font-bold text-teal-700 bg-teal-50 p-3 rounded-lg">
                 <span>Total Pago:</span><span>{formatBRL(trip.total)}</span>
              </div>
              <p className="text-center text-xs text-slate-400 mt-2">Pagamento via Plataforma</p>
           </div>
        )}

        {!isPartnerView && trip.status !== 'cancelled' && <Button className="w-full mt-4" onClick={() => window.print()}>Imprimir Voucher</Button>}
      </div>
    </ModalOverlay>
  );
};

// --- COMPONENTES AUXILIARES ---
const ImageGallery = ({ images, isOpen, onClose }) => {
  const [idx, setIdx] = useState(0);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center" style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh'}} onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-50"><X size={32}/></button>
      <div className="relative w-full h-full flex items-center justify-center px-4 md:px-20" onClick={e => e.stopPropagation()}>
         <button onClick={(e) => { e.stopPropagation(); setIdx((idx + images.length - 1) % images.length); }} className="absolute left-4 md:left-8 text-white hover:text-slate-300 transition-colors p-2 bg-black/30 rounded-full hover:bg-black/50"><ChevronLeft size={40}/></button>
         <img src={images[idx]} className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl transition-all duration-300" alt={`Galeria ${idx}`} />
         <button onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % images.length); }} className="absolute right-4 md:right-8 text-white hover:text-slate-300 transition-colors p-2 bg-black/30 rounded-full hover:bg-black/50"><ChevronRight size={40}/></button>
      </div>
      <div className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm font-medium">{idx + 1} / {images.length}</div>
    </div>
  );
};

const SimpleCalendar = ({ availableDays = [], onDateSelect, selectedDate }) => {
  const [curr, setCurr] = useState(new Date());
  const daysInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
  
  const isAvailable = (day) => {
     const date = new Date(curr.getFullYear(), curr.getMonth(), day);
     return availableDays.includes(date.getDay()) && date >= new Date().setHours(0,0,0,0);
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
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-bold text-slate-400">
        {weekDays.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({length: firstDay}).map((_,i)=><div key={`e-${i}`}/>)}
        {Array.from({length: daysInMonth}).map((_,i)=>{
          const d = i+1;
          const dateStr = new Date(curr.getFullYear(), curr.getMonth(), d).toISOString().split('T')[0];
          const available = isAvailable(d);
          return <button key={d} onClick={()=>handleDayClick(d)} className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${dateStr===selectedDate?'bg-teal-600 text-white shadow-lg shadow-teal-600/30 scale-105':available?'hover:bg-teal-50 text-slate-700':'text-slate-300 cursor-not-allowed'}`}>{d}</button>
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
        <div className="flex items-center gap-3 font-semibold text-slate-700 group-hover:text-teal-600 transition-colors">{Icon && <Icon size={20} className="text-teal-500" />}{title}</div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
        <div className="text-slate-600 text-sm leading-relaxed pl-8">{children}</div>
      </div>
    </div>
  );
};

// --- LOGIN ---
const LoginModal = ({ isOpen, onClose, onSuccess, initialRole = 'user', hideRoleSelection = false, closeOnSuccess = true }) => {
  if (!isOpen) return null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(true);
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setRole(initialRole); }, [initialRole]);

  const ensureProfile = async (u) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) await setDoc(ref, { email: u.email, name: u.displayName || u.email.split('@')[0], role, createdAt: new Date() });
    return !snap.exists();
  };

  const handleAuth = async (e, type) => {
    e?.preventDefault(); setLoading(true); setError('');
    try {
      let res;
      if (type === 'google') res = await signInWithPopup(auth, googleProvider);
      else if (isRegistering) res = await createUserWithEmailAndPassword(auth, email, password);
      else res = await signInWithEmailAndPassword(auth, email, password);
      
      const isNew = await ensureProfile(res.user);
      onSuccess(isNew);
      if (closeOnSuccess) onClose();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') { setError('E-mail já cadastrado. Faça login abaixo.'); setIsRegistering(false); }
      else setError('Erro na autenticação. Verifique os dados.');
    } finally { setLoading(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-600"><Lock size={32} /></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{isRegistering ? 'Criar Conta' : 'Entrar'}</h2>
        {!hideRoleSelection && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
               <button onClick={() => setRole('user')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'user' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Viajante</button>
               <button onClick={() => setRole('partner')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'partner' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Parceiro</button>
          </div>
        )}
        <div className="space-y-4">
          <Button variant="outline" className="w-full justify-center" onClick={() => handleAuth(null,'google')}>
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-2" alt="Google" /> Continuar com Google
          </Button>
          <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-200"></div><span className="mx-4 text-xs font-bold text-slate-400">OU</span><div className="flex-grow border-t border-slate-200"></div></div>
          <form onSubmit={(e)=>handleAuth(e,'email')} className="space-y-4 text-left">
             <input className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
             <input className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all" type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)}/>
             {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-fade-in"><AlertCircle size={16} className="shrink-0"/> <span>{error}</span></div>}
             <Button className="w-full justify-center" disabled={loading}>{loading?'Processando...':(isRegistering?'Cadastrar':'Entrar')}</Button>
          </form>
          <p className="text-sm text-slate-500 mt-6 cursor-pointer hover:text-teal-600 transition-colors" onClick={()=>{setIsRegistering(!isRegistering); setError('');}}>
            {isRegistering ? 'Já tem uma conta? Faça Login' : 'Ainda não tem conta? Cadastre-se'}
          </p>
        </div>
      </div>
    </ModalOverlay>
  );
};

// --- PÁGINAS ---

const HomePage = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  useEffect(() => { getDocs(collection(db, "dayuses")).then(s => setItems(s.docs.map(d=>({id:d.id,...d.data()})))) }, []);

  const filtered = items.filter(i => (i.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (i.city?.toLowerCase() || '').includes(searchTerm.toLowerCase()));

  return (
    <div className="pb-20 animate-fade-in">
      <div className="relative bg-teal-900 text-white py-24 text-center px-4 rounded-b-[3rem] mb-12 shadow-2xl overflow-hidden max-w-7xl mx-auto mt-6 rounded-t-[3rem]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">Relaxe perto de casa</h1>
          <p className="text-teal-100 text-lg md:text-xl font-light mb-10 max-w-2xl mx-auto">Descubra hotéis, pousadas e resorts incríveis com Day Use em Belo Horizonte e região.</p>
          <div className="bg-white p-2 pl-6 rounded-full shadow-2xl flex items-center max-w-xl mx-auto transform hover:scale-105 transition-transform duration-300">
            <Search className="text-slate-400" />
            <input 
               className="flex-1 px-4 py-3 text-slate-700 outline-none bg-transparent placeholder:text-slate-400 font-medium" 
               placeholder="Qual cidade ou hotel você procura?" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-teal-600 text-white p-3 rounded-full hover:bg-teal-700 transition-colors shadow-lg"><ArrowRight size={20}/></button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8"><h2 className="text-2xl font-bold text-slate-900">Lugares em destaque</h2><span className="text-sm text-slate-500">{filtered.length} locais encontrados</span></div>
        <div className="grid md:grid-cols-3 gap-8">
          {filtered.map(item => (
             <div key={item.id} onClick={() => navigate(`/stay/${item.id}`)} className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-slate-100 group flex flex-col h-full">
                <div className="h-64 relative overflow-hidden"><img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/><div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 text-slate-800"><Star size={12} className="text-yellow-500 fill-current"/> 5.0</div></div>
                <div className="p-6 flex flex-col flex-1">
                   <div className="mb-4"><h3 className="font-bold text-xl text-slate-900 leading-tight mb-1">{item.name}</h3><p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} className="text-teal-500"/> {item.city || 'Localização'}</p></div>
                   <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">A partir de</p><p className="text-2xl font-bold text-teal-600">{formatBRL(item.priceAdult)}</p></div><span className="text-sm font-semibold text-teal-600 bg-teal-50 px-4 py-2 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-all">Reservar</span></div>
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => { getDoc(doc(db, "dayuses", id)).then(s => s.exists() && setItem({id:s.id, ...s.data()})) }, [id]);

  if (!item) return <div className="text-center py-20 text-slate-400">Carregando detalhes...</div>;
  
  const adultPrice = item.priceAdult || 0;
  const childPrice = item.priceChild || 0;
  const petFee = item.petFee || 0;
  
  const total = (adults * adultPrice) + (children * childPrice) + (pets * petFee);
  const handleBook = () => navigate('/checkout', { state: { bookingData: { item, date, adults, children, pets, total } } });

  return (
    <div className="max-w-7xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
      <ImageGallery images={[item.image, item.image2, item.image3].filter(Boolean)} isOpen={galleryOpen} onClose={()=>setGalleryOpen(false)} />
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-8 text-slate-500 hover:text-teal-600 font-medium transition-colors"><div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm"><ChevronLeft size={20}/></div> Voltar</button>
      <div className="grid lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-4 gap-3 h-[400px] rounded-[2rem] overflow-hidden shadow-lg cursor-pointer group" onClick={()=>setGalleryOpen(true)}>
               <div className="col-span-3 relative h-full"><img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/><div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div></div>
               <div className="col-span-1 grid grid-rows-2 gap-3 h-full">
                  <div className="relative overflow-hidden h-full"><img src={item.image2 || item.image} className="w-full h-full object-cover"/></div>
                  <div className="relative overflow-hidden h-full"><img src={item.image3 || item.image} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm hover:bg-black/50 transition-colors">Ver fotos</div></div>
               </div>
            </div>
            <div><h1 className="text-4xl font-bold text-slate-900 mb-2">{item.name}</h1><p className="flex items-center gap-2 text-slate-500 text-lg"><MapPin size={20} className="text-teal-500"/> {item.city}, {item.state}</p></div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
               <div><h3 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><FileText className="text-teal-500"/> Sobre o local</h3><p className="text-slate-600 leading-relaxed whitespace-pre-line text-lg">{item.description}</p></div>
               {item.videoUrl && (<div className="rounded-2xl overflow-hidden shadow-md aspect-video"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}`} title="Video" frameBorder="0" allowFullScreen></iframe></div>)}
               
               <div className="hidden md:grid md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                  <div><h4 className="font-bold text-teal-700 mb-3 flex items-center gap-2"><CheckCircle size={18}/> O que está incluso</h4><ul className="space-y-2 text-slate-600 text-sm">{item.includedItems?.split('\n').map((l,i)=><li key={i} className="flex gap-2"><span>•</span>{l}</li>)}</ul></div>
                  <div><h4 className="font-bold text-red-500 mb-3 flex items-center gap-2"><Ban size={18}/> Não está incluso</h4><ul className="space-y-2 text-slate-600 text-sm">{item.notIncludedItems?.split('\n').map((l,i)=><li key={i} className="flex gap-2"><span>•</span>{l}</li>)}</ul></div>
               </div>
               <div className="md:hidden space-y-2">
                 {item.includedItems && <Accordion title="O que está incluso" icon={CheckCircle}><ul className="list-disc list-inside">{item.includedItems.split('\n').map((l,i)=><li key={i}>{l}</li>)}</ul></Accordion>}
                 {item.notIncludedItems && <Accordion title="Não está incluso" icon={Ban}><ul className="list-disc list-inside">{item.notIncludedItems.split('\n').map((l,i)=><li key={i}>{l}</li>)}</ul></Accordion>}
                 {item.usageRules && <Accordion title="Regras de Utilização" icon={AlertCircle}><p className="whitespace-pre-line">{item.usageRules}</p></Accordion>}
               </div>
               
               <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Info size={18} className="text-teal-500"/> Regras e Pets</h4>
                  <div className="text-slate-600 text-sm space-y-3">
                     {item.petAllowed ? (<div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg w-fit"><PawPrint size={16}/> <span>Aceitamos Pets! {item.petSize} (Taxa: {formatBRL(item.petFee)})</span></div>) : (<div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg w-fit"><Ban size={16}/> <span>Não aceitamos Pets.</span></div>)}
                     <p className="whitespace-pre-line italic hidden md:block">{item.usageRules}</p>
                  </div>
               </div>
            </div>
         </div>
         <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 sticky top-24 space-y-8">
               <div className="flex justify-between items-end border-b border-slate-100 pb-6"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">A partir de</p><span className="text-3xl font-bold text-teal-600">{formatBRL(adultPrice)}</span><span className="text-slate-400 text-sm"> / adulto</span></div></div>
               <div><label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2"><CalendarIcon size={16} className="text-teal-500"/> Escolha uma data</label><SimpleCalendar availableDays={item.availableDays} onDateSelect={setDate} selectedDate={date} />{date && <p className="text-xs font-bold text-teal-600 mt-2 text-center bg-teal-50 py-2 rounded-lg">Data selecionada: {date.split('-').reverse().join('/')}</p>}</div>
               <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <div className="flex justify-between items-center"><div><span className="text-sm font-medium text-slate-700 block">Adultos</span><span className="text-xs text-slate-400">Acima de {item.adultAgeStart || 12} anos</span></div><div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-teal-600 font-bold hover:bg-teal-50 rounded" onClick={()=>setAdults(Math.max(1, adults-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{adults}</span><button className="w-6 h-6 flex items-center justify-center text-teal-600 font-bold hover:bg-teal-50 rounded" onClick={()=>setAdults(adults+1)}>+</button></div></div>
                 <div className="flex justify-between items-center"><div><span className="text-sm font-medium text-slate-700 block">Crianças</span><span className="text-xs text-slate-400">{item.childAgeStart || 2} a {item.childAgeEnd || 11} anos</span></div><div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-teal-600 font-bold hover:bg-teal-50 rounded" onClick={()=>setChildren(Math.max(0, children-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{children}</span><button className="w-6 h-6 flex items-center justify-center text-teal-600 font-bold hover:bg-teal-50 rounded" onClick={()=>setChildren(children+1)}>+</button></div></div>
                 {item.petAllowed && <div className="flex justify-between items-center"><div><span className="text-sm font-medium text-slate-700 flex items-center gap-1"><PawPrint size={14}/> Pets</span><span className="text-xs text-teal-600 font-bold">{item.petSize || 'Pequeno porte'}</span></div><div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-teal-600 font-bold hover:bg-teal-50 rounded" onClick={()=>setPets(Math.max(0, pets-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{pets}</span><button className="w-6 h-6 flex items-center justify-center text-teal-600 font-bold hover:bg-teal-50 rounded" onClick={()=>setPets(pets+1)}>+</button></div></div>}
               </div>
               <div className="pt-4 border-t border-dashed border-slate-200">
                  <div className="flex justify-between items-center mb-6"><span className="text-slate-600 font-medium">Total Previsto</span><span className="text-2xl font-bold text-slate-900">{formatBRL(total)}</span></div>
                  <Button className="w-full py-4 text-lg shadow-xl shadow-teal-600/20 hover:scale-[1.02] active:scale-95" disabled={!date} onClick={handleBook}>Ir para Pagamento</Button>
                  <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1"><Lock size={10}/> Reserva 100% Segura</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData } = location.state || {};
  const [user, setUser] = useState(auth.currentUser);
  const [showLogin, setShowLogin] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [partnerToken, setPartnerToken] = useState(null);
  
  // States para o formulário manual de cartão
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'pix'
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState(''); // Unificado
  const [cardCvv, setCardCvv] = useState('');
  const [docType, setDocType] = useState('CPF');
  const [docNumber, setDocNumber] = useState('');
  const [installments, setInstallments] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  // State para o Pix
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState(null);

  useEffect(() => {
    if(!bookingData) { navigate('/'); return; }
    const fetchOwner = async () => {
      const docRef = doc(db, "users", bookingData.item.ownerId);
      const snap = await getDoc(docRef);
      if(snap.exists() && snap.data().mp_access_token) setPartnerToken(snap.data().mp_access_token);
    };
    fetchOwner();
    const unsub = onAuthStateChanged(auth, u => { setUser(u); if(u) setExpanded(true); });
    return unsub;
  }, []);

  if (!bookingData) return null;

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    setCardExpiry(value);
  };

  const handleConfirm = async () => {
    await addDoc(collection(db, "reservations"), {
      ...bookingData, userId: user.uid, ownerId: bookingData.item.ownerId,
      createdAt: new Date(), status: 'confirmed', guestName: user.displayName, guestEmail: user.email
    });
    setProcessing(false);
    setShowSuccess(true);
  };

  const processCardPayment = async () => {
     if(!partnerToken) { 
        if(confirm("MODO TESTE: O parceiro não conectou a conta MP. Deseja simular uma aprovação?")) {
            handleConfirm();
            return;
        }
        return; 
     }
     
     setProcessing(true);
     try {
       // --- Lógica PIX ---
       if (paymentMethod === 'pix') {
          const response = await fetch("/api/process-payment", { 
             method: "POST", 
             headers: { "Content-Type":"application/json" }, 
             body: JSON.stringify({ 
                payment_method_id: 'pix', 
                transaction_amount: Number(bookingData.total),
                installments: 1,
                payer: { email: user.email, first_name: user.displayName?.split(' ')[0], identification: { type: docType, number: docNumber } },
                partnerAccessToken: partnerToken
             }) 
          });
          const result = await response.json();
          if(result.status === 'pending' && result.point_of_interaction) {
             setPixData(result.point_of_interaction.transaction_data);
             setProcessing(false);
             setShowPixModal(true);
          } else {
             alert("Erro ao gerar Pix: " + (result.message || "Tente novamente"));
             setProcessing(false);
          }
          return;
       }

       // --- Lógica Cartão ---
       const mp = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY);
       const [month, year] = cardExpiry.split('/');
       const tokenParams = {
          cardNumber: cardNumber.replace(/\s/g, ''),
          cardholderName: cardName,
          cardExpirationMonth: month,
          cardExpirationYear: '20' + year,
          securityCode: cardCvv,
          identification: { type: docType, number: docNumber }
       };
       const tokenObj = await mp.createCardToken(tokenParams);
       const response = await fetch("/api/process-payment", { 
          method: "POST", 
          headers: { "Content-Type":"application/json" }, 
          body: JSON.stringify({ 
             token: tokenObj.id,
             issuer_id: "visa", // Em produção deve ser dinâmico
             payment_method_id: "visa", 
             transaction_amount: Number(bookingData.total),
             installments: Number(installments),
             payer: { email: user.email, first_name: user.displayName?.split(' ')[0], identification: { type: docType, number: docNumber } },
             partnerAccessToken: partnerToken
          }) 
       });
       const result = await response.json();
       if(result.status === 'approved' || result.status === 'in_process') handleConfirm();
       else { alert("Pagamento recusado: " + (result.message || "Verifique os dados")); setProcessing(false); }
     } catch (err) {
        console.error(err);
        if(confirm("Erro na comunicação com MP. Simular sucesso para teste?")) handleConfirm();
        else setProcessing(false);
     }
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-20 px-4">
      <SuccessModal isOpen={showSuccess} onClose={()=>setShowSuccess(false)} title="Tudo Certo!" message="Sua reserva foi confirmada." onAction={()=>navigate('/minhas-viagens')} actionLabel="Meus Ingressos"/>
      <PixModal isOpen={showPixModal} onClose={()=>setShowPixModal(false)} pixData={pixData} onConfirm={handleConfirm} />
      <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={()=>{setShowLogin(false); setExpanded(true);}} hideRoleSelection={true} />
      
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 text-slate-500 hover:text-teal-600 font-medium"><div className="bg-white p-2 rounded-full border shadow-sm"><ChevronLeft size={16}/></div> Voltar</button>
      
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900"><User className="text-teal-500"/> Seus Dados</h3>
            {user ? (
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900">{user.displayName || "Usuário"}</p>
                  <p className="text-slate-600 text-sm">{user.email}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-100 w-fit px-3 py-1 rounded-full"><Lock size={10}/> Identidade Confirmada</div>
               </div>
            ) : (
               <div className="text-center py-8">
                  <div className="bg-teal-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600"><User size={32}/></div>
                  <h3 className="font-bold text-slate-900 mb-2">Para continuar, identifique-se</h3>
                  <Button onClick={()=>setShowLogin(true)} className="w-full justify-center">Entrar ou Cadastrar</Button>
               </div>
            )}
          </div>
          
          <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${!user ? 'opacity-50 pointer-events-none grayscale':''}`}>
             <div className="p-8 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={()=>user && setExpanded(!expanded)}>
                <h3 className="font-bold text-xl flex items-center gap-3 text-slate-900"><CreditCard className="text-teal-500"/> Pagamento Seguro</h3>
                {user ? <ChevronDown className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}/> : <Lock className="text-slate-400"/>}
             </div>
             
             <div className={`transition-all duration-500 ease-in-out px-8 ${expanded ? 'max-h-[1200px] pb-8 opacity-100' : 'max-h-0 opacity-0'}`}>
                {expanded && user && (
                   <div className="border-t border-slate-100 pt-8 space-y-6">
                      
                      {/* Abas de Método */}
                      <div className="flex p-1 bg-slate-100 rounded-xl">
                          <button onClick={()=>setPaymentMethod('card')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'card' ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>Cartão de Crédito</button>
                          <button onClick={()=>setPaymentMethod('pix')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'pix' ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>Pix</button>
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
                          <div><label className="text-xs font-bold text-slate-500 uppercase">Parcelas</label><select className="w-full border p-3 rounded-lg mt-1 bg-white" value={installments} onChange={e=>setInstallments(e.target.value)}><option value={1}>1x de {formatBRL(bookingData.total)}</option><option value={2}>2x de {formatBRL(bookingData.total/2)}</option><option value={3}>3x de {formatBRL(bookingData.total/3)}</option></select></div>
                        </div>
                      ) : (
                        <div className="text-center py-6 animate-fade-in">
                           <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600"><QrCode size={40}/></div>
                           <p className="text-sm text-slate-600 mb-4">Ao clicar abaixo, geraremos um código QR para você pagar instantaneamente.</p>
                           <div className="flex justify-center"><Badge type="green">Aprovação Imediata</Badge></div>
                        </div>
                      )}
                      
                      <Button className="w-full py-4 mt-4" onClick={processCardPayment} disabled={processing}>
                          {processing ? 'Processando...' : (paymentMethod === 'pix' ? 'Gerar Código Pix' : `Pagar ${formatBRL(bookingData.total)}`)}
                      </Button>
                      <p className="text-center text-xs text-slate-400 mt-2 flex justify-center items-center gap-1"><Lock size={10}/> Seus dados são criptografados.</p>
                   </div>
                )}
             </div>
          </div>
        </div>

        <div>
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl sticky top-24">
              <div className="flex gap-5 mb-8 pb-8 border-b border-dashed border-slate-200">
                  <img src={bookingData.item.image} className="w-24 h-24 rounded-2xl object-cover shadow-sm" />
                  <div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reserva em</p>
                     <h3 className="font-bold text-xl text-slate-900 leading-tight">{bookingData.item.name}</h3>
                     <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><CalendarIcon size={14}/> {bookingData.date.split('-').reverse().join('/')}</p>
                  </div>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex justify-between"><span>Adultos ({bookingData.adults}x)</span><span className="font-medium text-slate-900">{formatBRL(bookingData.adults * bookingData.item.priceAdult)}</span></div>
                  {bookingData.children > 0 && <div className="flex justify-between"><span>Crianças ({bookingData.children}x)</span><span className="font-medium text-slate-900">{formatBRL(bookingData.children * bookingData.item.priceChild)}</span></div>}
                  {bookingData.pets > 0 && <div className="flex justify-between"><span>Taxa Pet ({bookingData.pets}x)</span><span className="font-medium text-slate-900">{formatBRL(bookingData.pets * bookingData.item.petFee)}</span></div>}
                  <div className="flex justify-between pt-2 border-t border-slate-100"><span>Taxas</span><span className="text-green-600 font-bold">Grátis</span></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center mt-6 border border-slate-200">
                 <span className="font-bold text-slate-700">Total</span>
                 <span className="font-bold text-2xl text-teal-600">{formatBRL(bookingData.total)}</span>
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
    const exchangeToken = async () => {
      if (!code || !auth.currentUser) { setStatus('error'); return; }
      try {
        const res = await fetch('/api/exchange-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, redirectUri: `${BASE_URL}/partner/callback` }) });
        const data = await res.json();
        if (res.ok) {
          const userRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(userRef, { mp_access_token: data.access_token, mp_user_id: data.user_id, mp_connected_at: new Date() });
          setStatus('success'); setTimeout(() => navigate('/partner'), 2000);
        } else { setStatus('error'); }
      } catch (error) { setStatus('error'); }
    };
    exchangeToken();
  }, [code, navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
        {status === 'processing' && <><div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div><h2 className="text-xl font-bold">Conectando...</h2></>}
        {status === 'success' && <><CheckCircle size={32} className="text-green-600 mx-auto mb-4"/><h2 className="text-xl font-bold">Conta Conectada!</h2></>}
        {status === 'error' && <><X size={32} className="text-red-600 mx-auto mb-4"/><h2 className="text-xl font-bold">Erro na Conexão</h2><Button onClick={()=>navigate('/partner')}>Voltar</Button></>}
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
            {/* Logout agora está no Header */}
        </div>
        
        <div className="space-y-6">
           {trips.map(t => (
              <div key={t.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-center gap-6">
                 <div className="flex gap-4 items-center w-full md:w-auto">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0"><img src={t.itemImage} className="w-full h-full object-cover"/></div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{t.itemName}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><CalendarIcon size={14}/> {t.date}</p>
                      <p className="text-xs text-slate-400 mt-2 font-medium">{t.guestName} • <span className={t.status === 'cancelled' ? 'text-red-500' : 'text-green-600'}>{t.status === 'cancelled' ? 'Cancelado' : 'Confirmado'}</span></p>
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
  const [mpConnected, setMpConnected] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
     const unsub = onAuthStateChanged(auth, async u => {
        if(u) {
           setUser(u);
           const userDoc = await getDoc(doc(db, "users", u.uid));
           if(userDoc.exists() && userDoc.data().mp_access_token) setMpConnected(true);
           const qDay = query(collection(db, "dayuses"), where("ownerId", "==", u.uid));
           getDocs(qDay).then(s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
           const qRes = query(collection(db, "reservations"), where("ownerId", "==", u.uid));
           getDocs(qRes).then(s => setReservations(s.docs.map(d => ({id: d.id, ...d.data()}))));
        }
     });
     return unsub;
  }, []);
  
  const handleConnect = () => {
     const redirect = `${BASE_URL}/partner/callback`;
     window.location.href = `https://auth.mercadopago.com.br/authorization?client_id=${import.meta.env.VITE_MP_CLIENT_ID}&response_type=code&platform_id=mp&state=${user.uid}&redirect_uri=${redirect}`;
  };

  if (!user) return <div className="text-center py-20 text-slate-400">Carregando painel...</div>;

  return (
     <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
        <VoucherModal isOpen={!!selectedRes} trip={selectedRes} onClose={()=>setSelectedRes(null)} isPartnerView={true}/>
        <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
           <div><h1 className="text-3xl font-bold text-slate-900">Painel do Parceiro</h1><p className="text-slate-500">Gerencie seus resultados.</p></div>
           <div className="flex gap-2">
              {!mpConnected ? <Button onClick={handleConnect} className="bg-blue-500 hover:bg-blue-600">Conectar Mercado Pago</Button> : <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold flex gap-2 items-center"><CheckCircle size={18}/> Conta Conectada</div>}
              <Button onClick={()=>navigate('/partner/new')} className="shadow-lg shadow-teal-500/30">+ Novo Anúncio</Button>
           </div>
        </div>
        
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"><p className="text-slate-500 text-xs font-bold uppercase mb-2">Faturamento Total</p><p className="text-4xl font-bold text-teal-600">{formatBRL(reservations.reduce((acc,c)=>acc+c.total,0))}</p></div>
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"><p className="text-slate-500 text-xs font-bold uppercase mb-2">Vendas Realizadas</p><p className="text-4xl font-bold text-slate-900">{reservations.length}</p></div>
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"><p className="text-slate-500 text-xs font-bold uppercase mb-2">Anúncios Ativos</p><p className="text-4xl font-bold text-slate-900">{items.length}</p></div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2"><List className="text-teal-500"/> Últimas Reservas</h2>
              <div className="space-y-4">
                 {reservations.map(r => (
                    <div key={r.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                       <div><p className="font-bold text-slate-900">{r.guestName}</p><p className="text-xs text-slate-500">{r.itemName} • {r.date}</p></div>
                       <div className="flex flex-col items-end gap-1"><span className="font-bold text-teal-600">{formatBRL(r.total)}</span><button className="text-xs text-teal-600 hover:underline font-bold" onClick={()=>setSelectedRes(r)}>Ver detalhes</button></div>
                    </div>
                 ))}
                 {reservations.length === 0 && <p className="text-slate-400 text-center py-4">Nenhuma venda ainda.</p>}
              </div>
           </div>
           
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2"><MapIcon className="text-teal-500"/> Meus Day Uses</h2>
              <div className="space-y-4">
                 {items.map(i => (
                    <div key={i.id} className="flex gap-4 p-3 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all">
                       <img src={i.image} className="w-16 h-16 rounded-xl object-cover bg-slate-200"/>
                       <div className="flex-1 py-1"><h4 className="font-bold text-slate-900 line-clamp-1">{i.name}</h4><p className="text-xs text-slate-500">{i.city}</p></div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
     </div>
  );
};

const PartnerNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => { const unsub = onAuthStateChanged(auth, u => { if(u) setUser(u); else navigate('/'); }); return unsub; }, []);

  const [formData, setFormData] = useState({
    contactName: user?.displayName || '', contactEmail: user?.email || '', contactPhone: '', contactJob: 'Sócio/Proprietário',
    name: '', cep: '', street: '', number: '', district: '', city: '', state: '',
    description: '', videoUrl: '', images: ['', '', '', '', '', '', '', '', '', ''],
    priceAdult: '', priceChild: '', adultAgeStart: '12', childAgeStart: '2', childAgeEnd: '11',
    availableDays: [0, 6], petAllowed: false, petSize: 'Pequeno porte', petFee: '',
    includedItems: '', notIncludedItems: '', usageRules: '', cancellationPolicy: '', observations: ''
  });

  useEffect(() => { if (user) setFormData(prev => ({ ...prev, contactName: user.displayName || prev.contactName, contactEmail: user.email || prev.contactEmail })); }, [user]);

  const handleCepBlur = async () => {
    if (formData.cep.replace(/\D/g, '').length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${formData.cep}/json/`);
        const data = await response.json();
        if (!data.erro) setFormData(prev => ({ ...prev, street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf }));
      } catch (error) { console.error("Erro CEP:", error); } finally { setCepLoading(false); }
    }
  };

  const handleImageChange = (index, value) => { const newImages = [...formData.images]; newImages[index] = value; setFormData({...formData, images: newImages}); };
  const toggleDay = (dayIndex) => { if (formData.availableDays.includes(dayIndex)) setFormData({...formData, availableDays: formData.availableDays.filter(d => d !== dayIndex)}); else setFormData({...formData, availableDays: [...formData.availableDays, dayIndex]}); };
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    const mainImage = formData.images[0]; 
    const dataToSave = { ...formData, image: mainImage, location: `${formData.street}, ${formData.number}`, ownerId: user.uid, priceAdult: Number(formData.priceAdult), priceChild: Number(formData.priceChild), petFee: Number(formData.petFee) || 0, adultAgeStart: Number(formData.adultAgeStart), childAgeStart: Number(formData.childAgeStart), childAgeEnd: Number(formData.childAgeEnd), image2: formData.images[1], image3: formData.images[2], image4: formData.images[3], image5: formData.images[4], image6: formData.images[5], image7: formData.images[6], image8: formData.images[7], image9: formData.images[8], image10: formData.images[9], createdAt: new Date() };
    try { const docRef = await addDoc(collection(db, "dayuses"), dataToSave); navigate(`/stay/${docRef.id}`); } 
    catch (error) { console.error("Erro ao salvar:", error); alert("Erro ao salvar anúncio."); } finally { setLoading(false); }
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
     <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8 text-center text-slate-900">Cadastrar Novo Day Use</h1>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-8">
           
           <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2"><User size={20}/> Dados do Responsável</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Completo</label><input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50" value={formData.contactName} readOnly /></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label><input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50" value={formData.contactEmail} readOnly /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">WhatsApp</label><input className="w-full border border-slate-200 p-3 rounded-xl" placeholder="(00) 00000-0000" value={formData.contactPhone} onChange={e=>setFormData({...formData, contactPhone: e.target.value})} required/></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cargo</label><select className="w-full border border-slate-200 p-3 rounded-xl bg-white" value={formData.contactJob} onChange={e=>setFormData({...formData, contactJob: e.target.value})}><option>Sócio/Proprietário</option><option>Gerente</option><option>Atendente</option><option>Outros</option></select></div>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2"><MapPin size={20}/> Localização</h3>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Local</label><input className="w-full border border-slate-200 p-3 rounded-xl" placeholder="Ex: Hotel Fazenda Sol" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required/></div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="relative"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CEP</label><input className="w-full border border-slate-200 p-3 rounded-xl" placeholder="00000-000" value={formData.cep} onChange={e=>setFormData({...formData, cep: e.target.value})} onBlur={handleCepBlur} required/>{cepLoading && <div className="absolute right-3 top-9 animate-spin h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full"></div>}</div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Número</label><input className="w-full border border-slate-200 p-3 rounded-xl" value={formData.number} onChange={e=>setFormData({...formData, number: e.target.value})} required/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cidade</label><input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50" value={formData.city} readOnly/></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estado</label><input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50" value={formData.state} readOnly/></div>
              </div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Logradouro</label><input className="w-full border border-slate-200 p-3 rounded-xl" value={formData.street} onChange={e=>setFormData({...formData, street: e.target.value})} required/></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Vídeo YouTube (Opcional)</label><input className="w-full border border-slate-200 p-3 rounded-xl" placeholder="https://youtube.com/..." value={formData.videoUrl} onChange={e=>setFormData({...formData, videoUrl: e.target.value})}/></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição Comercial</label><textarea className="w-full border border-slate-200 p-3 rounded-xl h-32" placeholder="Descreva seu espaço..." value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} required/></div>
           </div>

           <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2"><ImageIcon size={20}/> Galeria de Fotos</h3>
              <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-4"><p className="font-bold flex items-center gap-1 mb-1"><Info size={16}/> Dica:</p>Cole o link direto das imagens (terminado em .jpg ou .png). A primeira será a capa.</div>
              <div className="space-y-3">
                 {formData.images.map((img, i) => (
                    <div key={i} className="flex gap-2 items-center">
                       <span className="text-xs font-bold text-slate-400 w-6">#{i+1}</span>
                       <input className="w-full border border-slate-200 p-2 rounded-lg text-sm" placeholder={i===0 ? "Capa (Obrigatória)" : "URL da Foto"} value={img} onChange={e=>handleImageChange(i, e.target.value)} required={i===0}/>
                    </div>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2"><Ticket size={20}/> Preços e Público</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-teal-600 uppercase mb-1 block">Preço Adulto (R$)</label><input type="number" className="w-full border border-slate-200 p-3 rounded-xl font-bold text-teal-700" value={formData.priceAdult} onChange={e=>setFormData({...formData, priceAdult: e.target.value})} required/></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Idade Mín. Adulto</label><input type="number" className="w-full border border-slate-200 p-3 rounded-xl" value={formData.adultAgeStart} onChange={e=>setFormData({...formData, adultAgeStart: e.target.value})} required/></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                 <div><label className="text-xs font-bold text-teal-600 uppercase mb-1 block">Preço Criança</label><input type="number" className="w-full border border-slate-200 p-3 rounded-xl" value={formData.priceChild} onChange={e=>setFormData({...formData, priceChild: e.target.value})}/></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Idade Mín.</label><input type="number" className="w-full border border-slate-200 p-3 rounded-xl" value={formData.childAgeStart} onChange={e=>setFormData({...formData, childAgeStart: e.target.value})}/></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Idade Máx.</label><input type="number" className="w-full border border-slate-200 p-3 rounded-xl" value={formData.childAgeEnd} onChange={e=>setFormData({...formData, childAgeEnd: e.target.value})}/></div>
              </div>
           </div>

           <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                 <input type="checkbox" id="petCheck" className="w-5 h-5 accent-teal-600" checked={formData.petAllowed} onChange={e => setFormData({...formData, petAllowed: e.target.checked})} />
                 <label htmlFor="petCheck" className="font-bold text-slate-900 cursor-pointer flex items-center gap-2"><PawPrint size={18}/> Aceita Pets?</label>
              </div>
              {formData.petAllowed && (
                 <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Porte Permitido</label><select className="w-full border border-slate-200 p-3 rounded-xl bg-white" value={formData.petSize} onChange={e=>setFormData({...formData, petSize: e.target.value})}><option>Pequeno porte</option><option>Médio porte</option><option>Grande porte</option><option>Qualquer porte</option></select></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Taxa Pet (R$)</label><input type="number" className="w-full border border-slate-200 p-3 rounded-xl" value={formData.petFee} onChange={e=>setFormData({...formData, petFee: e.target.value})}/></div>
                 </div>
              )}
           </div>

           <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2"><CalendarIcon size={20}/> Dias de Funcionamento</h3>
              <div className="flex gap-2 flex-wrap">
                 {weekDays.map((day, index) => (
                    <button key={day} type="button" onClick={() => toggleDay(index)} className={`px-4 py-2 rounded-lg font-bold transition-all ${formData.availableDays.includes(index) ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{day}</button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2"><Info size={20}/> Regras e Detalhes</h3>
              <p className="text-xs text-slate-500">Escreva um item por linha.</p>
              <div className="grid md:grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-green-600 uppercase mb-1 block">O que está incluso</label><textarea className="w-full border border-slate-200 p-3 rounded-xl h-32" placeholder="Ex: Almoço&#10;Piscina" value={formData.includedItems} onChange={e=>setFormData({...formData, includedItems: e.target.value})}/></div>
                 <div><label className="text-xs font-bold text-red-500 uppercase mb-1 block">O que NÃO está incluso</label><textarea className="w-full border border-slate-200 p-3 rounded-xl h-32" placeholder="Ex: Bebidas" value={formData.notIncludedItems} onChange={e=>setFormData({...formData, notIncludedItems: e.target.value})}/></div>
              </div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Regras de Utilização</label><textarea className="w-full border border-slate-200 p-3 rounded-xl h-24" placeholder="Ex: Proibido som automotivo..." value={formData.usageRules} onChange={e=>setFormData({...formData, usageRules: e.target.value})}/></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Política de Cancelamento</label><textarea className="w-full border border-slate-200 p-3 rounded-xl h-24" value={formData.cancellationPolicy} onChange={e=>setFormData({...formData, cancellationPolicy: e.target.value})}/></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Outras Observações</label><textarea className="w-full border border-slate-200 p-3 rounded-xl h-24" value={formData.observations} onChange={e=>setFormData({...formData, observations: e.target.value})}/></div>
           </div>

           <Button type="submit" className="w-full py-4 text-lg shadow-xl shadow-teal-600/20" disabled={loading}>{loading ? "Salvando..." : "Finalizar Cadastro"}</Button>
        </form>
     </div>
  );
};

// --- COMPONENTE AUXILIAR PARA ROTA DE PARCEIRO ---
const PartnerRegisterPage = () => {
  const navigate = useNavigate();
  return (
    <LoginModal 
      isOpen={true} 
      onClose={() => navigate('/')} 
      initialRole="partner" 
      hideRoleSelection={true} 
      closeOnSuccess={false} 
      onSuccess={(isNew) => navigate(isNew ? '/partner/new' : '/partner')} 
    />
  );
};

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

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <GlobalStyles />
      <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={()=>{setShowLogin(false);}} />
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
           <div className="flex items-center gap-2 font-bold text-xl cursor-pointer text-slate-800" onClick={()=>navigate('/')}>
              {/* LOGO SVG VETORIAL */}
              <svg className="h-10 w-auto text-teal-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span className="hidden sm:inline">Mapa do Day Use</span>
           </div>
           <div className="flex items-center gap-4">
              {!user ? (
                 <>
                   <button onClick={()=>navigate('/partner-register')} className="text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors hidden md:block">Seja um parceiro</button>
                   <Button variant="ghost" onClick={()=>setShowLogin(true)} className="font-bold">Entrar</Button>
                 </>
              ) : (
                 <div className="flex gap-4 items-center">
                    {user.role === 'partner' && <Button variant="ghost" onClick={()=>navigate('/partner')}>Painel</Button>}
                    <Button variant="ghost" onClick={()=>navigate('/minhas-viagens')}>Meus Ingressos</Button>
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center font-bold text-teal-700 cursor-pointer border-2 border-white shadow-sm hover:scale-105 transition-transform" title="Usuário">{user.email[0].toUpperCase()}</div>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50" title="Sair"><LogOut size={20}/></button>
                 </div>
              )}
           </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>
      
      <footer className="bg-white border-t border-slate-100 py-12 mt-auto">
         <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
               <div className="flex items-center justify-center md:justify-start gap-2 font-bold text-slate-900 mb-2"><MapPin size={18} className="text-teal-500" /> Mapa do Day Use</div>
               <p className="text-sm text-slate-500">© 2024 Belo Horizonte, MG.</p>
            </div>
            <div className="text-center text-sm text-slate-500">Feito com carinho por <a href="https://instagram.com/iurifrancast" target="_blank" className="font-bold text-slate-900 hover:text-teal-600 transition-colors">Iuri França</a> em BH.</div>
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
      <Route path="/stay/:id" element={<Layout><DetailsPage /></Layout>} />
      <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
      <Route path="/minhas-viagens" element={<Layout><UserDashboard /></Layout>} />
      <Route path="/partner" element={<Layout><PartnerDashboard /></Layout>} />
      <Route path="/partner/new" element={<Layout><PartnerNew /></Layout>} />
      <Route path="/partner/callback" element={<Layout><PartnerCallbackPage /></Layout>} />
      <Route path="/partner-register" element={<Layout><PartnerRegisterPage /></Layout>} />
    </Routes>
  );
};

export default App;