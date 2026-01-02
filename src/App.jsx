import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { db, auth, googleProvider } from './firebase'; 
import { collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore'; 
import { initializeApp, getApp } from "firebase/app";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  sendEmailVerification, 
  getAuth,
  updateProfile, 
  updateEmail, 
  updatePassword 
} from 'firebase/auth';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { Html5Qrcode } from 'html5-qrcode';
import { MapPin, Search, User, CheckCircle, X, Info, AlertCircle, PawPrint, FileText, Ban, ChevronDown, Image as ImageIcon, Map as MapIcon, CreditCard, Calendar as CalendarIcon, Ticket, Lock, Briefcase, Instagram, Star, ChevronLeft, ChevronRight, ArrowRight, LogOut, List, Link as LinkIcon, Edit, DollarSign, Copy, QrCode, ScanLine, Users, Tag, Trash2, Mail, MessageCircle, Phone, Filter, TrendingUp, ShieldCheck, Zap, BarChart, Globe, Target, Award,} from 'lucide-react';

const STATE_NAMES = {
    'MG': 'Minas Gerais', 'SP': 'São Paulo', 'RJ': 'Rio de Janeiro', 'ES': 'Espírito Santo',
    'BA': 'Bahia', 'SC': 'Santa Catarina', 'PR': 'Paraná', 'RS': 'Rio Grande do Sul',
    'GO': 'Goiás', 'DF': 'Distrito Federal'
};

const AMENITIES_LIST = [
    "Piscina adulto", "Piscina infantil", "Piscina aquecida", "Cachoeira / Riacho", "Cascata/Cachoeira artificial",
    "Acesso à represa / lago", "Bicicletas", "Quadriciclo", "Passeio a cavalo", "Caiaque / Stand up",
    "Trilha", "Pesque e solte", "Fazendinha / Animais", "Espaço kids", "Recreação infantil",
    "Quadra de areia", "Campo de futebol", "Campo de vôlei e peteca", "Beach tennis / futvôlei",
    "Academia", "Sauna mista a vapor", "Hidromassagem / Banheira / Ofurô", "Massagem",
    "Espaço para meditação", "Capela", "Redes", "Vista / Mirante", "Fogo de chão / Lareira",
    "Churrasqueira", "Cozinha equipada", "Bar / Restaurante / Quiosque", "Sala de jogos", "Música ao vivo", 
    "Estacionamento", "Wi-Fi", "Piscina climatizada", "Playground", "Área verde", "Lagoa com água da nascente", 
    "Piscina com água da nascente", "Pratos e talheres", "Tomadas disponíveis", "Pia com torneira", "Tirolesa infantil",
    "Tirolesa Adulto", "Gangorra", "Cachoeira com túnel",  "Parque aquático adulto", "Piscina coberta", "Sauna masculina a vapor",
    "Sauna feminina a vapor", "Vara de pesca", "Iscas para pesca", "Banheiro com ducha quente","Lago", "Pesque e pague", "Balanço",
    "Ducha fria", "Banheiros com ducha", "Sinuca", "Espaço de leitura", "Quadra poliesportiva", "Piscina semiolímpica", 
    "Quadra de peteca e vôlei", "Barco a remo", "Pedalinho", "Bike park", "Escorrega de sabão", "Cama elástica infantil",
    "Vale jurássico", "Piscina de borda infinita", "Solarium", "Toboágua", "Acesso a acomodação", "Monitor infantil", "Passeio de charrete"
];

const MEALS_LIST = ["Café da manhã", "Almoço", "Café da tarde", "Petiscos", "Sobremesas", "Bebidas NÃO Alcoólicas", "Bebidas Alcoólicas", "Buffet Livre"];
const WEEK_DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];


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

// Função para enviar e-mail (mailtrap)
const sendEmail = async (to, subject, htmlContent) => {
    try {
        await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: to,
                subject: subject,
                html: htmlContent
            })
        });
        console.log(`E-mail enviado para ${to}`);
    } catch (error) {
        console.error("Falha ao enviar e-mail:", error);
    }
};
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
const useSEO = (title, description, noIndex = false) => {
  useEffect(() => {
    // 1. Título
    document.title = (title === "Home" || !title) ? "Mapa do Day Use" : title;
    
    // 2. Meta Description
    let metaDesc = document.querySelector("meta[name='description']");
    if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = description || "Encontre e reserve os melhores day uses perto de você.";

    // 3. Meta Robots (Controle de Indexação)
    let metaRobots = document.querySelector("meta[name='robots']");
    if (!metaRobots) {
        metaRobots = document.createElement("meta");
        metaRobots.name = "robots";
        document.head.appendChild(metaRobots);
    }
    
    if (noIndex) {
        metaRobots.content = "noindex, nofollow"; // BLOQUEIA GOOGLE
    } else {
        metaRobots.content = "index, follow"; // PERMITE GOOGLE
    }

    // Limpeza ao desmontar (volta ao padrão index para não afetar a próxima página)
    return () => {
        metaRobots.content = "index, follow";
    };

  }, [title, description, noIndex]);
};

const useSchema = (schemaData) => {
  useEffect(() => {
    // Se não houver dados (null/undefined), não faz nada
    if (!schemaData) return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    // Limpeza: remove o script quando o componente desmonta ou os dados mudam
    return () => {
      document.head.removeChild(script);
    };
  }, [schemaData]);
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

const PixModal = ({ isOpen, onClose, pixData, onConfirm, paymentId, partnerToken }) => {
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // Novo estado para mensagens visuais

  // Robô de Verificação Automática (Polling)
  useEffect(() => {
    let interval;
    if (isOpen && paymentId && partnerToken) {
      // Verifica a cada 5 segundos
      interval = setInterval(() => {
        checkStatus(false); 
      }, 5000);
    }
    // Limpa estados ao fechar
    return () => {
        clearInterval(interval);
        setStatusMsg(null);
    };
  }, [isOpen, paymentId, partnerToken]);

  const checkStatus = async (isManual = true) => {
      if (isManual) {
          setChecking(true);
          setStatusMsg(null); // Limpa msg anterior ao tentar de novo
      }
      
      try {
          const response = await fetch('/api/check-payment-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, partnerAccessToken: partnerToken })
          });
          const data = await response.json();
          
          if (data.status === 'approved') {
              setStatusMsg({ type: 'success', text: "Pagamento confirmado! Finalizando..." });
              // Pequeno delay para o usuário ler a mensagem de sucesso antes de fechar
              setTimeout(() => {
                  onConfirm(); 
                  onClose();
              }, 1500);
          } else {
              if (isManual) {
                  const statusText = data.status === 'pending' ? 'Pendente' : data.status;
                  setStatusMsg({ 
                      type: 'info', 
                      text: `O banco ainda está processando (Status: ${statusText}). Aguarde mais alguns segundos e tente novamente.` 
                  });
              }
          }
      } catch (error) {
          console.error("Erro ao verificar:", error);
          if (isManual) setStatusMsg({ type: 'error', text: "Não foi possível verificar o status agora. Tente novamente." });
      } finally {
          if (isManual) setChecking(false);
      }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixData.qr_code);
    setStatusMsg({ type: 'success', text: "Código copia e cola copiado com sucesso!" });
  };

  if (!isOpen || !pixData) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4"><Ticket size={32}/></div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Pagamento via PIX</h2>
        
        {/* Indicador Visual de Verificação Automática */}
        <div className="flex items-center justify-center gap-2 mb-4 text-xs text-orange-500 font-bold bg-orange-50 p-2 rounded-lg animate-pulse">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            Aguardando confirmação do banco...
        </div>

        <p className="text-sm text-slate-500 mb-6">Escaneie o QR Code ou copie o código abaixo.</p>
        
        {pixData.qr_code_base64 && (
          <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="mx-auto w-48 h-48 mb-6 border-2 border-slate-100 rounded-xl" />
        )}
        
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-2 mb-6">
           <p className="text-xs text-slate-500 font-mono truncate flex-1">{pixData.qr_code}</p>
           <button onClick={copyToClipboard} className="text-teal-600 hover:text-teal-700 p-2"><Copy size={16}/></button>
        </div>

        {/* ÁREA DE FEEDBACK VISUAL (Substitui o Alert) */}
        {statusMsg && (
            <div className={`text-xs p-3 rounded-xl mb-4 font-medium animate-fade-in ${
                statusMsg.type === 'success' ? 'bg-green-100 text-green-700' :
                statusMsg.type === 'error' ? 'bg-red-100 text-red-700' :
                'bg-blue-50 text-blue-700'
            }`}>
                {statusMsg.text}
            </div>
        )}

        <Button className="w-full mb-3" onClick={() => checkStatus(true)} disabled={checking}>
            {checking ? 'Verificando...' : 'Já fiz o pagamento'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onClose}>Cancelar</Button>
      </div>
    </ModalOverlay>
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
     // Verifica dia da semana, se é futuro/hoje e se não está bloqueado
     return availableDays.includes(date.getDay()) && 
            date >= new Date().setHours(0,0,0,0) && 
            !blockedDates.includes(dateStr);
  };
  
  // Função auxiliar para calcular o preço de um dia específico
  const getDayPrice = (day) => {
      const date = new Date(curr.getFullYear(), curr.getMonth(), day);
      const dayIndex = date.getDay();
      const dayConfig = prices[dayIndex];
      let price = Number(basePrice);

      if (dayConfig) {
          if (typeof dayConfig === 'object' && dayConfig.adult) {
              price = Number(dayConfig.adult);
          } else if (!isNaN(dayConfig)) {
              price = Number(dayConfig);
          }
      }
      return price > 0 ? price : basePrice;
  };

  // 1. Calcula qual é o MENOR PREÇO do mês atual (para destacar em verde)
  let minPriceInView = Infinity;
  for (let d = 1; d <= daysInMonth; d++) {
      if (isAvailable(d)) {
          const p = getDayPrice(d);
          if (p < minPriceInView) minPriceInView = p;
      }
  }

  const handleDayClick = (day) => {
    if (isAvailable(day)) {
      const date = new Date(curr.getFullYear(), curr.getMonth(), day);
      onDateSelect(date.toISOString().split('T')[0]); 
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <button type="button" onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth()-1)))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20}/></button>
        <span className="font-bold text-slate-700 capitalize">{curr.toLocaleString('pt-BR',{month:'long', year:'numeric'})}</span>
        <button type="button" onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth()+1)))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={20}/></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-bold text-slate-400">{weekDays.map((d,i)=><span key={i}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({length: firstDay}).map((_,i)=><div key={`e-${i}`}/>)}
        {Array.from({length: daysInMonth}).map((_,i)=>{
          const d = i+1;
          const date = new Date(curr.getFullYear(), curr.getMonth(), d);
          const dateStr = date.toISOString().split('T')[0];
          
          const available = isAvailable(d);
          const price = getDayPrice(d);
          
          // Lógica estilo Google Flights: Se for o menor preço do mês, fica verde
          const isCheapest = available && price === minPriceInView;

          return (
            <button 
                key={d} 
                type="button" 
                onClick={()=>handleDayClick(d)} 
                className={`h-14 w-full rounded-lg text-sm font-medium relative flex flex-col items-center justify-center transition-all border ${
                    dateStr===selectedDate
                        ? 'bg-[#0097A8] text-white border-[#0097A8] shadow-lg'
                        : available
                            ? 'hover:bg-cyan-50 text-slate-700 border-transparent'
                            : 'text-slate-300 border-transparent cursor-not-allowed'
                }`}
            >
              <span>{d}</span>
              {available && (
                  <span className={`text-[9px] font-normal mt-0.5 ${
                      dateStr===selectedDate 
                        ? 'text-cyan-100' 
                        : isCheapest 
                            ? 'text-green-600 font-bold' // Verdinho se for o mais barato
                            : 'text-slate-400'
                  }`}>
                      R${price}
                  </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-2 text-xs text-slate-400 flex gap-2 justify-center">
         <span className="flex items-center gap-1 text-green-600 font-bold">Melhor Preço</span>
      </div>
    </div>
  );
};

// --- LOGIN/CADASTRO ---
const LoginModal = ({ isOpen, onClose, onSuccess, initialRole = 'user', hideRoleSelection = false, closeOnSuccess = true, initialMode = 'login', customTitle, customSubtitle }) => {
  if (!isOpen) return null;

  // Estados de Fluxo
  const [view, setView] = useState(initialMode); // 'login', 'register', 'forgot', 'phone_start', 'phone_verify', 'email_sent'
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Dados do Formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmObj, setConfirmObj] = useState(null);

  // Referência para o Recaptcha (Melhor que window global em alguns casos)
  const recaptchaRef = React.useRef(null);

  // Helper para chamar API de e-mail (Mailtrap)
  // Isso substitui o envio nativo do Firebase que estava falhando
  const sendAuthEmail = async (type, userEmail, userName = '') => {
      try {
          await fetch('/api/send-auth-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userEmail, type, name: userName })
          });
          return true;
      } catch (e) {
          console.error("Erro ao enviar email via API:", e);
          return false;
      }
  };

  // Reset de estados ao abrir
  useEffect(() => {
    if (isOpen) {
        setError(''); setInfo('');
        setView(initialMode); setRole(initialRole);
        setEmail(''); setPassword(''); setPhone(''); setCode('');
    }
  }, [isOpen, initialMode, initialRole]);

  // Lógica do Recaptcha (Telefone)
  useEffect(() => {
    if (!isOpen || view !== 'phone_start') {
        // Limpeza
        if (recaptchaRef.current) {
             try { recaptchaRef.current.clear(); } catch(e){}
             recaptchaRef.current = null;
        }
        return;
    }

    const initRecaptcha = async () => {
        // Delay para garantir DOM
        await new Promise(r => setTimeout(r, 500));
        
        const container = document.getElementById('recaptcha-container');
        if (container && !recaptchaRef.current) {
            try {
                const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => console.log("Recaptcha resolvido"),
                    'expired-callback': () => setError("Sessão expirada. Tente novamente.")
                });
                recaptchaRef.current = verifier;
                await verifier.render();
            } catch (e) { console.log("Status Recaptcha:", e); }
        }
    };

    initRecaptcha();

    return () => {
        if (recaptchaRef.current) {
             try { recaptchaRef.current.clear(); } catch(e){}
             recaptchaRef.current = null;
        }
    };
  }, [view, isOpen]);

  const ensureProfile = async (u) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    let userRole = role; 
    if (snap.exists()) { userRole = snap.data().role || 'user'; } 
    else { 
        await setDoc(ref, { 
            email: u.email || "", 
            phone: u.phoneNumber || "",
            name: u.displayName || (u.phoneNumber ? "Usuário Móvel" : u.email?.split('@')[0] || "Usuário"), 
            role: role, 
            createdAt: new Date() 
        }); 
    }
    return { ...u, role: userRole };
  };

  const handleGoogle = async () => {
    try {
       const res = await signInWithPopup(auth, googleProvider);
       const userWithRole = await ensureProfile(res.user);
       onSuccess(userWithRole);
       if (closeOnSuccess) onClose();
    } catch (e) { setError("Erro ao conectar com Google."); }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
        let res;
        if (view === 'register') {
            res = await createUserWithEmailAndPassword(auth, email, password);
            
            // 1. Envia E-mail de Confirmação via API Mailtrap
            sendAuthEmail('verify_email', email, email.split('@')[0]);
            
            // 2. Cria Perfil
            await ensureProfile(res.user);
            
            // 3. Muda para tela de sucesso (Email Sent)
            setView('email_sent');
            setLoading(false);
            return;
        } else {
            res = await signInWithEmailAndPassword(auth, email, password);
        }
        const userWithRole = await ensureProfile(res.user);
        onSuccess(userWithRole);
        if (closeOnSuccess) onClose();
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') setError("E-mail já cadastrado.");
        else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') setError("Dados incorretos.");
        else setError("Erro: " + err.code);
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
      e.preventDefault(); setLoading(true); setError(''); setInfo('');
      try {
          // Usa API Mailtrap para reset de senha
          const sent = await sendAuthEmail('reset_password', email);
          
          if(sent) {
            setInfo("Link enviado! Verifique sua caixa de entrada e Spam.");
          } else {
            setError("Erro ao enviar. Tente novamente mais tarde.");
          }
      } catch (err) { 
          setError("Erro ao enviar. Verifique se o e-mail está correto."); 
      } finally { setLoading(false); }
  };

  const handlePhoneStart = async (e) => {
      e.preventDefault(); 
      setLoading(true); setError('');
      
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) { 
          setError("Número inválido."); setLoading(false); return; 
      }
      
      const formatted = "+55" + cleanPhone;
      
      try {
          if (!recaptchaRef.current) {
               // Fallback: Tenta criar se não existir
               const container = document.getElementById('recaptcha-container');
               if(container) recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
               else throw new Error("Erro interno: Recaptcha não carregou.");
          }
          
          const confirmation = await signInWithPhoneNumber(auth, formatted, recaptchaRef.current);
          setConfirmObj(confirmation);
          setView('phone_verify');
      } catch (err) {
          console.error("Erro SMS:", err);
          let msg = "Erro ao enviar SMS.";
          
          if (JSON.stringify(err).includes("403") || JSON.stringify(err).includes("401")) {
              msg = "Bloqueio de API: Domínio não autorizado no Google Cloud.";
          } else if (err.code === 'auth/quota-exceeded') {
              msg = "Limite diário de SMS atingido.";
          } else if (err.code === 'auth/invalid-phone-number') {
              msg = "Número inválido.";
          }
          
          setError(msg);
          if(recaptchaRef.current) { try{ recaptchaRef.current.clear(); }catch(e){} recaptchaRef.current = null; }
      } finally { setLoading(false); }
  };

  const handlePhoneVerify = async (e) => {
      e.preventDefault(); setLoading(true); setError('');
      try {
          const res = await confirmObj.confirm(code);
          const userWithRole = await ensureProfile(res.user);
          onSuccess(userWithRole);
          if (closeOnSuccess) onClose();
      } catch (err) { setError("Código inválido."); }
      finally { setLoading(false); }
  };

  const getTitle = () => {
      if (view === 'forgot') return 'Recuperar Senha';
      if (view === 'phone_start') return 'Entrar com Celular';
      if (view === 'phone_verify') return 'Confirmar Código';
      if (view === 'email_sent') return 'Verifique seu E-mail';
      return customTitle || (view === 'login' ? 'Olá, novamente' : 'Criar conta');
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full rounded-2xl shadow-xl overflow-hidden relative animate-fade-in">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors"><X size={18} className="text-slate-800"/></button>
            <h2 className="font-bold text-slate-800 text-base">{getTitle()}</h2>
            <div className="w-6"></div>
        </div>

        <div className="p-6">
            
            {/* CONTAINER RECAPTCHA */}
            <div id="recaptcha-container" className={view === 'phone_start' ? 'mb-4' : 'hidden'}></div>

            {/* TELA DE SUCESSO DE EMAIL */}
            {view === 'email_sent' ? (
                <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-teal-50 text-[#0097A8] rounded-full flex items-center justify-center mx-auto mb-2">
                        <Mail size={32}/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Conta Criada com Sucesso!</h3>
                        <p className="text-slate-500 text-sm mt-2">
                            Enviamos um link de confirmação para <strong>{email}</strong>.
                            <br/>Por favor, confirme seu e-mail para ativar todos os recursos.
                        </p>
                    </div>
                    <Button onClick={() => { setView('login'); }} className="w-full mt-4">
                        Fazer Login
                    </Button>
                </div>
            ) : (
                <>
                    {!hideRoleSelection && (view === 'register' || view === 'login') && (
                       <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                           <button onClick={()=>setRole('user')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${role==='user'?'bg-white text-[#0097A8] shadow-sm':'text-slate-500'}`}>Viajante</button>
                           <button onClick={()=>setRole('partner')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${role==='partner'?'bg-white text-[#0097A8] shadow-sm':'text-slate-500'}`}>Parceiro</button>
                       </div>
                    )}

                    {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
                    {info && <div className="mb-4 p-3 bg-green-50 text-green-700 text-xs rounded-lg flex items-center gap-2"><CheckCircle size={16}/> {info}</div>}

                    {/* LOGIN / CADASTRO EMAIL */}
                    {(view === 'login' || view === 'register') && (
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            <div className="border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-transparent">
                                <input type="email" className="w-full p-4 outline-none text-slate-800 placeholder:text-slate-500 border-b border-slate-200" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required />
                                <input type="password" className="w-full p-4 outline-none text-slate-800 placeholder:text-slate-500" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} required />
                            </div>
                            
                            {view === 'register' && (
                                <p className="text-[11px] text-slate-500 leading-tight">Ao continuar, concordo com os <span className="underline cursor-pointer" onClick={()=>window.open('/termos-de-uso')}>Termos</span> e <span className="underline cursor-pointer" onClick={()=>window.open('/politica-de-privacidade')}>Política de Privacidade</span>.</p>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Processando...' : (view === 'login' ? 'Continuar' : 'Concordar e continuar')}</Button>
                        </form>
                    )}

                    {/* RECUPERAR SENHA */}
                    {view === 'forgot' && (
                        <form onSubmit={handleForgot} className="space-y-4">
                            <p className="text-sm text-slate-600">Insira seu e-mail para receber o link de redefinição.</p>
                            <input className="w-full p-3 border border-slate-300 rounded-xl outline-none" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required/>
                            <Button type="submit" className="w-full" disabled={loading}>Enviar link</Button>
                            <p className="text-center text-xs font-bold underline cursor-pointer mt-4" onClick={()=>setView('login')}>Voltar</p>
                        </form>
                    )}

                    {/* CELULAR (INÍCIO) */}
                    {view === 'phone_start' && (
                        <form onSubmit={handlePhoneStart} className="space-y-4">
                            <div className="border border-slate-300 rounded-xl p-3 flex items-center focus-within:ring-2 focus-within:ring-black">
                                <span className="text-slate-500 mr-2 border-r pr-2">+55</span>
                                <input className="w-full outline-none" placeholder="(11) 99999-9999" value={phone} onChange={e=>setPhone(e.target.value)} type="tel" required autoFocus/>
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Enviando...' : 'Enviar Código'}</Button>
                        </form>
                    )}

                    {/* CELULAR (VERIFICAÇÃO) */}
                    {view === 'phone_verify' && (
                        <form onSubmit={handlePhoneVerify} className="space-y-4">
                            <p className="text-sm text-slate-600">Digite o código enviado para <strong>+55 {phone}</strong></p>
                            <input className="w-full border border-slate-300 p-3 rounded-xl text-center text-2xl tracking-[0.5em] font-mono outline-none" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} required autoFocus/>
                            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Validando...' : 'Confirmar'}</Button>
                            <p className="text-center text-xs text-slate-400 mt-4 cursor-pointer hover:underline" onClick={()=>setView('phone_start')}>Corrigir número</p>
                        </form>
                    )}

                    {/* BOTÕES SOCIAIS E TROCA DE MODO */}
                    {(view === 'login' || view === 'register') && (
                        <>
                            <div className="flex items-center my-6"><div className="flex-grow border-t border-slate-200"></div><span className="mx-3 text-xs text-slate-400">ou</span><div className="flex-grow border-t border-slate-200"></div></div>
                            <div className="space-y-3">
                                <button type="button" onClick={handleGoogle} className="w-full border-2 border-slate-200 rounded-xl py-3 flex items-center justify-between px-4 hover:bg-slate-50 transition-all"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" /><span className="text-sm font-semibold text-slate-700">Google</span><div className="w-5"></div></button>
                                <button type="button" onClick={()=>setView('phone_start')} className="w-full border-2 border-slate-200 rounded-xl py-3 flex items-center justify-between px-4 hover:bg-slate-50 transition-all"><Phone size={20} className="text-slate-700"/><span className="text-sm font-semibold text-slate-700">Celular</span><div className="w-5"></div></button>
                            </div>
                            {view === 'login' ? (
                                <div className="mt-4 text-center">
                                    <span className="text-xs text-slate-500 hover:underline cursor-pointer mr-4" onClick={()=>setView('forgot')}>Esqueceu a senha?</span>
                                    <span className="text-xs font-bold text-slate-800 hover:underline cursor-pointer" onClick={()=>{setView('register'); setError('');}}>Cadastre-se</span>
                                </div>
                            ) : (
                                <div className="mt-4 text-center">
                                    <span className="text-xs text-slate-500">Já tem conta? </span>
                                    <span className="text-xs font-bold text-slate-800 hover:underline cursor-pointer" onClick={()=>{setView('login'); setError('');}}>Entrar</span>
                                </div>
                            )}
                        </>
                    )}
                    
                    {(view === 'phone_start' || view === 'phone_verify' || view === 'forgot') && (
                        <p className="text-center text-xs font-bold underline cursor-pointer mt-6" onClick={()=>setView('login')}>Voltar</p>
                    )}
                </>
            )}
        </div>
      </div>
    </ModalOverlay>
  );
};

// --- PÁGINA PERFIL USUÁRIO ---
const UserProfile = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [data, setData] = useState({ name: '', phone: '', photoURL: '' });
  const [loading, setLoading] = useState(false);
  
  // Novos States
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');

  useEffect(() => {
    const fetch = async () => {
      if(user) {
         const snap = await getDoc(doc(db, "users", user.uid));
         if(snap.exists()) {
             const d = snap.data();
             setData({ 
                 name: d.name || user.displayName || '', 
                 phone: d.phone || '',
                 photoURL: d.photoURL || user.photoURL || ''
             });
         }
      }
    };
    fetch();
  }, [user]);

  const handlePhotoUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          if (file.size > 500 * 1024) { alert("Imagem muito grande. Max 500KB."); return; }
          const reader = new FileReader();
          reader.onloadend = () => setData({ ...data, photoURL: reader.result });
          reader.readAsDataURL(file);
      }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
        // 1. Atualiza Perfil no Auth (SOMENTE NOME, SEM FOTO BASE64)
        // O Base64 é muito grande para o Auth, salvamos apenas no Firestore
        await updateProfile(user, { displayName: data.name });

        // 2. Salva Tudo no Firestore (Incluindo a Foto Base64)
        await updateDoc(doc(db, "users", user.uid), { 
            name: data.name, 
            phone: data.phone,
            photoURL: data.photoURL // Aqui pode salvar strings grandes
        });

        // 3. Atualiza E-mail
        if (newEmail && newEmail !== user.email) {
            // Manda e-mail de verificação para o NOVO endereço via API
            await fetch('/api/send-auth-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, type: 'update_email', name: data.name })
            });
            // O updateEmail real só deve ser feito após verificação em sistemas ideais, 
            // mas aqui atualizamos direto e pedimos verificação.
            await updateEmail(user, newEmail);
            alert("E-mail atualizado! Um link de confirmação foi enviado para o novo endereço.");
        }

        // 4. Atualiza Senha
        if (newPass) {
            await updatePassword(user, newPass);
            alert("Senha alterada com sucesso!");
        }

        alert("Perfil salvo com sucesso!");
        setNewPass(''); setNewEmail('');
        
    } catch (err) {
        console.error(err);
        if (err.code === 'auth/requires-recent-login') {
            alert("Para mudar e-mail ou senha, por favor faça logout e login novamente por segurança.");
        } else {
            alert("Erro ao atualizar: " + err.message);
        }
    } finally { setLoading(false); }
  };

  const resendVerify = async () => {
      try {
        const res = await fetch('/api/send-auth-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, type: 'verify_email', name: data.name })
        });
        if (res.ok) alert("Link enviado! Verifique sua caixa de entrada.");
        else alert("Erro ao enviar e-mail. Tente mais tarde.");
      } catch(e) {
          console.error(e);
          alert("Erro de conexão.");
      }
  };

  if(!user) return null;

  return (
    <div className="max-w-xl mx-auto py-12 px-4 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 text-slate-900">Meu Perfil</h1>
      
      <form onSubmit={handleSave} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
         
         <div className="flex flex-col items-center gap-4 mb-6">
             <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 flex items-center justify-center relative group">
                 {data.photoURL ? (
                     <img src={data.photoURL} className="w-full h-full object-cover" />
                 ) : (
                     <User size={40} className="text-slate-400"/>
                 )}
                 <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-bold">
                     Alterar
                     <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                 </label>
             </div>
             <p className="text-xs text-slate-400">Clique na foto para alterar. {user.role === 'partner' ? '(Logo da Empresa)' : ''}</p>
         </div>

         <div><label className="text-sm font-bold text-slate-700 block mb-1">Nome Completo</label><input className="w-full border p-3 rounded-lg" value={data.name} onChange={e=>setData({...data, name: e.target.value})} /></div>
         <div><label className="text-sm font-bold text-slate-700 block mb-1">Telefone</label><input className="w-full border p-3 rounded-lg" value={data.phone} onChange={e=>setData({...data, phone: e.target.value})} placeholder="(00) 00000-0000"/></div>
         
         <div className="pt-4 border-t border-slate-100">
             <h3 className="font-bold text-slate-900 mb-4">Segurança</h3>
             
             <div className="mb-4">
                 <label className="text-sm font-bold text-slate-700 block mb-1">E-mail</label>
                 <input className="w-full border p-3 rounded-lg" placeholder={user.email} value={newEmail} onChange={e=>setNewEmail(e.target.value)} />
                 <p className="text-[10px] text-slate-400 mt-1">Deixe vazio para manter o atual.</p>
                 
                 {!user.emailVerified && (
                     <div className="mt-2 flex items-center gap-2 text-xs text-red-500 font-bold">
                         <AlertCircle size={12}/> E-mail não verificado. 
                         <span onClick={resendVerify} className="underline cursor-pointer text-[#0097A8]">Reenviar link</span>
                     </div>
                 )}
             </div>

             <div>
                 <label className="text-sm font-bold text-slate-700 block mb-1">Nova Senha</label>
                 <input className="w-full border p-3 rounded-lg" type="password" placeholder="********" value={newPass} onChange={e=>setNewPass(e.target.value)} />
                 <p className="text-[10px] text-slate-400 mt-1">Deixe vazio para manter a atual.</p>
             </div>
         </div>

         <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
      </form>
    </div>
  );
};

// COMPONENTE DE LOADING (SKELETON)
const SkeletonCard = () => (
  <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 h-full">
    <div className="h-64 bg-slate-200 animate-pulse" />
    <div className="p-6 space-y-4">
      <div className="h-6 bg-slate-200 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
         <div className="h-8 bg-slate-200 rounded animate-pulse w-1/3" />
         <div className="h-10 bg-slate-200 rounded-xl animate-pulse w-1/3" />
      </div>
    </div>
  </div>
);

// --- PÁGINAS PRINCIPAIS ---

const HomePage = () => {
  useSEO("Home", "Encontre e reserve os melhores day uses em hotéis e resorts.");
  
  // SCHEMA: Organization & WebSite
  useSchema({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "Mapa do Day Use",
        "url": "https://mapadodayuse.com",
        "logo": "https://mapadodayuse.com/logo.svg",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "contato@mapadodayuse.com",
          "contactType": "customer support"
        },
        "sameAs": [
          "https://instagram.com/mapadodayuse",
          "https://tiktok.com/@mapadodayuse"
        ]
      },
      {
        "@type": "WebSite",
        "url": "https://mapadodayuse.com",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://mapadodayuse.com/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    ]
  });

  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true); // NOVO STATE
  
  const navigate = useNavigate();

  useEffect(() => { 
      // Adicionado setLoading(false) ao final
      getDocs(collection(db, "dayuses"))
        .then(s => setItems(s.docs.map(d=>({id:d.id,...d.data()}))))
        .finally(() => setLoading(false)); 
  }, []);

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
        <div className="flex items-center justify-between mb-8"><h2 className="text-2xl font-bold text-slate-900">Lugares em destaque</h2><span className="text-sm text-slate-500">{loading ? 'Buscando...' : `${filtered.length} locais encontrados`}</span></div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* LÓGICA DE LOADING: Mostra 6 esqueletos ou os cards reais */}
          {loading 
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map(item => (
                <DayUseCard 
                    key={item.id} 
                    item={item} 
                    onClick={() => navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}})} 
                />
          ))}
        </div>
      </div>
    </div>
  );
};

const ImageGallery = ({ images, isOpen, onClose }) => {
  const [idx, setIdx] = useState(0);

  // Bloqueia o scroll da página enquanto a galeria está aberta
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Usa Portal para renderizar direto no body (evita problemas de z-index/layout)
  return createPortal(
    <div 
      className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Botão Fechar (Canto Superior Direito) */}
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all z-50 border border-white/10"
        title="Fechar Galeria"
      >
        <X size={24}/>
      </button>
      
      {/* Área Principal */}
      <div 
        className="relative w-full h-full flex items-center justify-center p-4 md:p-12" 
        onClick={e => e.stopPropagation()}
      >
         {/* Botão Anterior */}
         {images.length > 1 && (
             <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setIdx((idx + images.length - 1) % images.length); 
                }} 
                className="absolute left-4 md:left-8 text-white hover:text-[#0097A8] bg-black/50 hover:bg-white p-3 rounded-full transition-all z-50 backdrop-blur-md border border-white/10 shadow-lg"
             >
                <ChevronLeft size={32}/>
             </button>
         )}
         
         {/* Imagem Central */}
         <img 
            src={images[idx]} 
            className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl select-none" 
            alt={`Foto ${idx + 1}`} 
         />
         
         {/* Botão Próximo */}
         {images.length > 1 && (
             <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setIdx((idx + 1) % images.length); 
                }} 
                className="absolute right-4 md:right-8 text-white hover:text-[#0097A8] bg-black/50 hover:bg-white p-3 rounded-full transition-all z-50 backdrop-blur-md border border-white/10 shadow-lg"
             >
                <ChevronRight size={32}/>
             </button>
         )}
      </div>

      {/* Contador no Rodapé */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 px-6 py-2 rounded-full border border-white/20 text-white text-sm font-bold backdrop-blur-md shadow-lg">
         {idx + 1} / {images.length}
      </div>
    </div>,
    document.body
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

const DetailsPage = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(null);
  
  // 1. CORREÇÃO DE ROTAS: Captura parâmetros de qualquer tipo de rota
  const slug = params.slug || params.cityOrSlug;
  const idParam = params.id; 

  const [item, setItem] = useState(null);
  const [relatedItems, setRelatedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [freeChildren, setFreeChildren] = useState(0); 
  const [selectedSpecial, setSelectedSpecial] = useState({}); 

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);

  // States para Solicitação de Propriedade
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [claimData, setClaimData] = useState({ name: '', email: '', phone: '', job: '' });

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      try {
          let foundData = null;
          
          // Prioridade: ID no state > ID na URL > Slug
          if (location.state?.id) {
             const docSnap = await getDoc(doc(db, "dayuses", location.state.id));
             if(docSnap.exists()) foundData = {id: docSnap.id, ...docSnap.data()};
          } else if (idParam) {
             const docSnap = await getDoc(doc(db, "dayuses", idParam));
             if(docSnap.exists()) foundData = {id: docSnap.id, ...docSnap.data()};
          } else if (slug) {
             const q = query(collection(db, "dayuses"), where("slug", "==", slug)); 
             const querySnapshot = await getDocs(q);
             if (!querySnapshot.empty) {
                 const docData = querySnapshot.docs[0];
                 foundData = { id: docData.id, ...docData.data() };
             }
          }
    
          if (foundData) {
              setItem(foundData);
              if (foundData.city) {
                  const qRelated = query(collection(db, "dayuses"), where("city", "==", foundData.city));
                  const snapRelated = await getDocs(qRelated);
                  const related = snapRelated.docs
                      .map(d => ({id: d.id, ...d.data()}))
                      .filter(i => i.id !== foundData.id)
                      .slice(0, 3);
                  setRelatedItems(related);
              }
          }
      } catch (error) {
          console.error("Erro ao carregar detalhes:", error);
      } finally {
          setLoading(false);
      }
    };
    fetchItem();
  }, [slug, idParam, location.state]);

  // Lógica de Preço
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
          let minPrice = Number(item.priceAdult || 0);
          if (item.weeklyPrices) {
             Object.values(item.weeklyPrices).forEach(p => {
                 let val = typeof p === 'object' ? Number(p.adult) : Number(p);
                 if (val > 0 && val < minPrice) minPrice = val;
             });
          }
          setCurrentPrice(minPrice);
        }
    }
  }, [date, item]);

  // 2. SEO DINÂMICO
  const seoTitle = item 
    ? `${item.name} | Reserve seu Day Use em ${item.city}` 
    : "Detalhes do Day Use";

  const seoDesc = item 
    ? `Compre seu ingresso para o day use ${item.name} em ${item.city}. Day Use com ${item.amenities?.[0] || 'Piscina'}, ${item.meals?.[0] || 'Almoço'} e muito mais!`
    : "Confira detalhes, preços e fotos deste Day Use incrível. Reserve agora!";

  useSEO(seoTitle, seoDesc);

  // 3. SCHEMA MARKUP
  useSchema(item ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LodgingBusiness",
        "@id": `https://mapadodayuse.com/${getStateSlug(item.state)}/${generateSlug(item.name)}#place`,
        "name": item.name,
        "description": item.description,
        "image": [item.image, item.image2, item.image3].filter(Boolean),
        "address": {
          "@type": "PostalAddress",
          "streetAddress": `${item.street}, ${item.number}`,
          "addressLocality": item.city,
          "addressRegion": item.state,
          "addressCountry": "BR",
          "postalCode": item.cep
        },
        "telephone": item.localPhone || item.localWhatsapp,
        "amenityFeature": item.amenities?.map(a => ({ "@type": "LocationFeatureSpecification", "name": a, "value": "true" }))
      },
      {
        "@type": "Product",
        "name": `Day Use em ${item.name}`,
        "description": `Ingresso para passar o dia em ${item.name}.`,
        "image": item.image,
        "sku": item.id,
        "brand": { "@type": "Brand", "name": "Mapa do Day Use" },
        "offers": {
          "@type": "Offer",
          "url": window.location.href,
          "priceCurrency": "BRL",
          "price": currentPrice || item.priceAdult,
          "availability": item.paused ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          "seller": { "@type": "Organization", "name": item.name }
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mapadodayuse.com" },
            { "@type": "ListItem", "position": 2, "name": item.state, "item": `https://mapadodayuse.com/${getStateSlug(item.state)}` },
            { "@type": "ListItem", "position": 3, "name": item.name, "item": window.location.href }
        ]
      }
    ]
  } : null);

  // --- SKELETON LOADING ---
  if (loading) return (
    <div className="max-w-7xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
        <div className="flex items-center gap-2 mb-8"><div className="w-20 h-10 bg-slate-200 rounded-full animate-pulse"></div></div>
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
                <div className="space-y-2"><div className="h-10 w-3/4 bg-slate-200 rounded-lg animate-pulse"></div><div className="h-6 w-1/2 bg-slate-200 rounded-lg animate-pulse"></div></div>
                <div className="grid grid-cols-4 gap-3 h-[400px] rounded-[2rem] overflow-hidden"><div className="col-span-3 bg-slate-200 animate-pulse"></div><div className="col-span-1 grid grid-rows-2 gap-3 h-full"><div className="bg-slate-200 animate-pulse"></div><div className="bg-slate-200 animate-pulse"></div></div></div>
            </div>
            <div className="lg:col-span-1"><div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 h-96 animate-pulse bg-slate-50"></div></div>
        </div>
    </div>
  );

  if (!item) return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center animate-fade-in">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400"><MapIcon size={48}/></div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Local não encontrado</h2>
          <p className="text-slate-500 mb-8">O link que você acessou pode estar quebrado ou indisponível.</p>
          <Button onClick={() => navigate('/')} className="mx-auto">Voltar para o Mapa</Button>
      </div>
  );
  
  // Cálculos
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

  let specialTotal = 0;
  if (item.specialTickets) {
      Object.entries(selectedSpecial).forEach(([idx, qtd]) => {
          specialTotal += (item.specialTickets[idx].price * qtd);
      });
  }
  const total = (adults * currentPrice) + (children * childPrice) + (pets * petFee) + specialTotal;
  const showPets = (item.petAllowed === true || (item.petSize && item.petSize !== 'Não aceita'));

  const handleUpdateSpecial = (idx, delta) => {
      const current = selectedSpecial[idx] || 0;
      const newVal = Math.max(0, current + delta);
      setSelectedSpecial({ ...selectedSpecial, [idx]: newVal });
  };

  const handleBook = () => {
      navigate('/checkout', { state: { bookingData: { item, date, adults, children, pets, total, freeChildren, selectedSpecial, priceSnapshot: { adult: currentPrice, child: childPrice, pet: petFee } } } });
  };

  // ... (handleClaimSubmit e PausedMessage iguais)
  const handleClaimSubmit = async(e) => { e.preventDefault(); setClaimLoading(true); const emailHtml = `...`; try { await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: 'contato@mapadodayuse.com', subject: `🔥 Solicitação: ${item.name}`, html: 'Solicitação de Claim' }) }); setShowClaimModal(false); setShowClaimSuccess(true); setClaimData({ name: '', email: '', phone: '', job: '' }); } catch(error){console.error(error); alert("Erro ao enviar.");} finally{setClaimLoading(false);} };
  const PausedMessage = () => (<div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6"><div className="pb-4 border-b border-slate-100 text-center"><p className="text-xs text-slate-400 mb-2">Você é o dono ou gerente deste local?</p><button onClick={() => setShowClaimModal(true)} className="text-sm font-bold text-[#0097A8] hover:underline flex items-center justify-center gap-1 mx-auto"><Briefcase size={14}/> Solicitar administração</button></div><div className="text-center"><div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400"><Ticket size={24}/></div><h3 className="text-lg font-bold text-slate-800 mb-2">Reservas Indisponíveis</h3><p className="text-slate-500 leading-relaxed text-xs">No momento, este local não está recebendo novas reservas.<br/><strong className="text-slate-700">Confira outras opções em {item.city}:</strong></p></div><div className="space-y-3">{relatedItems.length > 0 ? relatedItems.map(related => (<div key={related.id} onClick={() => navigate(`/${getStateSlug(related.state)}/${generateSlug(related.name)}`, {state: {id: related.id}})} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-[#0097A8] hover:shadow-md transition-all cursor-pointer bg-slate-50 hover:bg-white group"><img src={related.image} className="w-16 h-16 rounded-lg object-cover bg-gray-200 shrink-0"/><div className="flex-1 min-w-0"><h4 className="font-bold text-slate-800 text-sm truncate">{related.name}</h4><p className="text-xs text-[#0097A8] font-bold mt-1">A partir de {formatBRL(related.priceAdult)}</p></div><div className="text-[#0097A8] opacity-0 group-hover:opacity-100 transition-opacity pr-2"><ArrowRight size={16}/></div></div>)) : <Button onClick={() => navigate('/')} className="w-full py-3 text-sm shadow-lg shadow-teal-100/50">Ver todos os Day Uses</Button>}</div></div>);

  return (
    <div className="max-w-7xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
      <ImageGallery images={[item.image, item.image2, item.image3].filter(Boolean)} isOpen={galleryOpen} onClose={()=>setGalleryOpen(false)} />
      
      {showClaimSuccess && createPortal(<SuccessModal isOpen={showClaimSuccess} onClose={() => setShowClaimSuccess(false)} title="Solicitação Enviada!" message="Recebemos seus dados..." actionLabel="Entendi" onAction={() => setShowClaimSuccess(false)} />, document.body)}
      {showClaimModal && createPortal(<ModalOverlay onClose={() => setShowClaimModal(false)}><div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full animate-fade-in"><div className="w-16 h-16 bg-cyan-100 text-[#0097A8] rounded-full flex items-center justify-center mx-auto mb-4"><Briefcase size={32}/></div><h2 className="text-xl font-bold text-slate-900 mb-2">Assumir este Perfil</h2><p className="text-slate-600 mb-6 text-sm">Preencha seus dados para solicitar o controle administrativo.</p><form onSubmit={handleClaimSubmit} className="space-y-3 text-left"><div><label className="text-xs font-bold text-slate-500 ml-1">Seu Nome</label><input className="w-full border p-3 rounded-xl" required value={claimData.name} onChange={e=>setClaimData({...claimData, name: e.target.value})}/></div><div><label className="text-xs font-bold text-slate-500 ml-1">E-mail Corporativo</label><input className="w-full border p-3 rounded-xl" type="email" required value={claimData.email} onChange={e=>setClaimData({...claimData, email: e.target.value})}/></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-500 ml-1">Telefone</label><input className="w-full border p-3 rounded-xl" required value={claimData.phone} onChange={e=>setClaimData({...claimData, phone: e.target.value})}/></div><div><label className="text-xs font-bold text-slate-500 ml-1">Cargo</label><select className="w-full border p-3 rounded-xl bg-white" required value={claimData.job} onChange={e=>setClaimData({...claimData, job: e.target.value})}><option value="">Selecione...</option><option>Proprietário</option><option>Gerente</option><option>Marketing</option><option>Comercial</option></select></div></div><Button type="submit" disabled={claimLoading} className="w-full mt-4">{claimLoading ? 'Enviando...' : 'Enviar Solicitação'}</Button></form><button onClick={() => setShowClaimModal(false)} className="text-xs text-slate-400 hover:text-slate-600 mt-4 underline">Cancelar</button></div></ModalOverlay>, document.body)}

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-8">
            <div><h1 className="text-4xl font-bold text-slate-900 mb-2">{item.name}</h1><p className="flex items-center gap-2 text-slate-500 text-lg"><MapPin size={20} className="text-[#0097A8]"/> {item.city}, {item.state}</p></div>

            <div className="grid grid-cols-4 gap-3 h-[400px] rounded-[2rem] overflow-hidden shadow-lg cursor-pointer group" onClick={()=>setGalleryOpen(true)}><div className="col-span-3 relative h-full"><img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/><div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div></div><div className="col-span-1 grid grid-rows-2 gap-3 h-full"><div className="relative overflow-hidden h-full"><img src={item.image2} className="w-full h-full object-cover"/></div><div className="relative overflow-hidden h-full"><img src={item.image3} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm hover:bg-black/50 transition-colors">Ver fotos</div></div></div></div>
            
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
               <div>
                   <h3 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2">
                       <FileText className="text-[#0097A8]"/> Sobre
                   </h3>
                   <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                       {item.description}
                   </p>
               </div>

               <div>
                   <h3 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><CheckCircle className="text-[#0097A8]"/> O que está incluso</h3>
                   
                   {/* 4. CORREÇÃO DE COMODIDADES (Split string se necessário) */}
                   {item.amenities && item.amenities.length > 0 && (
                       <div className="mb-6">
                           <p className="text-sm font-bold text-slate-700 mb-2">Comodidades:</p>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                               {item.amenities
                                   .flatMap(a => a.includes(',') ? a.split(',') : a) // Quebra strings longas
                                   .map(a => a.trim())
                                   .filter(a => a !== "")
                                   .map((a, idx) => (
                                       <div key={`${a}-${idx}`} className="flex items-center gap-2 text-sm text-slate-600">
                                           <div className="w-1.5 h-1.5 rounded-full bg-[#0097A8] shrink-0"></div> 
                                           <span className="capitalize">{a}</span>
                                       </div>
                                   ))
                               }
                           </div>
                       </div>
                   )}
                   <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4"><div className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Alimentação (Pensão)</div>{item.meals && item.meals.length > 0 ? (<div className="flex flex-wrap gap-2">{item.meals.map(m => (<span key={m} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-orange-700 border border-orange-200">{m}</span>))}</div>) : (<p className="text-sm text-slate-500 italic">Este estabelecimento não oferece serviço de alimentação incluso.</p>)}</div>
                   {item.includedItems && (<div><p className="text-sm font-bold text-slate-700 mb-2">Outros itens inclusos:</p><p className="text-slate-600 text-sm whitespace-pre-line bg-green-50 p-4 rounded-xl border border-green-100">{item.includedItems}</p></div>)}
               </div>

               {item.videoUrl && (<div className="rounded-2xl overflow-hidden shadow-md aspect-video"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}`} title="Video" frameBorder="0" allowFullScreen></iframe></div>)}
               
               <div className="pt-4 border-t border-slate-100"><h4 className="font-bold text-red-500 mb-2 flex items-center gap-2"><Ban size={18}/> Não incluso</h4><p className="text-slate-600 text-sm whitespace-pre-line">{item.notIncludedItems || "Nenhum item específico."}</p></div>
               
               <Accordion title="Regras de Utilização" icon={Info}>
                   <p className="text-slate-600 text-sm whitespace-pre-line">{item.usageRules || "Sem regras específicas."}</p>
               </Accordion>
               <Accordion title="Cancelamento e Reembolso" icon={AlertCircle}>
                   <p className="text-slate-600 text-sm whitespace-pre-line">{item.cancellationPolicy || "Consulte o estabelecimento."}</p>
               </Accordion>
            </div>
         </div>
         
         <div className="lg:col-span-1 h-fit sticky top-24">
            {item.paused ? <PausedMessage /> : (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-8">
                   <div className="flex justify-between items-end border-b border-slate-100 pb-6"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{date ? "Preço para a data" : "A partir de"}</p><span className="text-3xl font-bold text-[#0097A8]">{formatBRL(currentPrice)}</span><span className="text-slate-400 text-sm"> / adulto</span></div></div>
                   <div><label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2"><CalendarIcon size={16} className="text-[#0097A8]"/> Escolha uma data</label><SimpleCalendar availableDays={item.availableDays} blockedDates={item.blockedDates || []} prices={item.weeklyPrices || {}} basePrice={Number(item.priceAdult)} onDateSelect={setDate} selectedDate={date} />{date && <p className="text-xs font-bold text-[#0097A8] mt-2 text-center bg-cyan-50 py-2 rounded-lg">Data selecionada: {date.split('-').reverse().join('/')}</p>}</div>
                   
                   {/* SEÇÃO DE QUANTIDADES COM TRAVA (NOVO COMPORTAMENTO) */}
                   <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div className="flex justify-between items-center"><div><span className="text-sm font-medium text-slate-700 block">Adultos</span><span className="text-xs text-slate-400 block">{item.adultAgeStart ? `Acima de ${item.adultAgeStart} anos` : 'Ingresso padrão'}</span><span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(currentPrice)}</span></div><div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>{const newVal = Math.max(0, adults-1); setAdults(newVal); if(newVal === 0) { setChildren(0); setPets(0); setFreeChildren(0); }}}>-</button><span className="font-bold text-slate-900 w-4 text-center">{adults}</span><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setAdults(adults+1)}>+</button></div></div>
                     
                     <div className="flex justify-between items-center">
                         <div><span className="text-sm font-medium text-slate-700 block">Crianças</span><span className="text-xs text-slate-400 block">{item.childAgeStart && item.childAgeEnd ? `${item.childAgeStart} a ${item.childAgeEnd} anos` : 'Meia entrada'}</span><span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(childPrice)}</span></div>
                         <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                             <button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setChildren(Math.max(0, children-1))}>-</button>
                             <span className="font-bold text-slate-900 w-4 text-center">{children}</span>
                             <button className={`w-6 h-6 flex items-center justify-center font-bold rounded ${adults > 0 ? 'text-[#0097A8] hover:bg-cyan-50' : 'text-slate-300 cursor-not-allowed'}`} onClick={() => adults > 0 ? setChildren(children+1) : setShowWarning({ title: 'Adicione um Adulto', msg: 'Para selecionar crianças, é necessário ter pelo menos 1 adulto responsável na reserva.' })}>+</button>
                         </div>
                     </div>
                     
                     {showPets && (
                         <div className="flex justify-between items-center">
                             <div><span className="text-sm font-medium text-slate-700 flex items-center gap-1"><PawPrint size={14}/> Pets</span><span className="text-xs text-slate-400 block">{item.petSize || 'Permitido'}</span><span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(petFee)}</span></div>
                             <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                                 <button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setPets(Math.max(0, pets-1))}>-</button>
                                 <span className="font-bold text-slate-900 w-4 text-center">{pets}</span>
                                 <button className={`w-6 h-6 flex items-center justify-center font-bold rounded ${adults > 0 ? 'text-[#0097A8] hover:bg-cyan-50' : 'text-slate-300 cursor-not-allowed'}`} onClick={() => adults > 0 ? setPets(pets+1) : setShowWarning({ title: 'Adicione um Adulto', msg: 'Para levar pets, é necessário ter pelo menos 1 adulto responsável na reserva.' })}>+</button>
                             </div>
                         </div>
                     )}
                     
                     {item.trackFreeChildren && (
                         <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                             <div><span className="text-sm font-bold text-green-700 block">Crianças Grátis</span><span className="text-xs text-slate-400">{item.gratuitousness || "Isentas"}</span></div>
                             <div className="flex items-center gap-3 bg-green-50 px-2 py-1 rounded-lg border border-green-100 shadow-sm">
                                 <button className="w-6 h-6 flex items-center justify-center text-green-700 font-bold" onClick={()=>setFreeChildren(Math.max(0, freeChildren-1))}>-</button>
                                 <span className="font-bold text-slate-900 w-4 text-center">{freeChildren}</span>
                                 <button className={`w-6 h-6 flex items-center justify-center font-bold rounded ${adults > 0 ? 'text-green-700 hover:bg-green-100' : 'text-green-300 cursor-not-allowed'}`} onClick={() => adults > 0 ? setFreeChildren(freeChildren+1) : setShowWarning({ title: 'Adicione um Adulto', msg: 'Para selecionar crianças gratuitas, é necessário ter pelo menos 1 adulto responsável.' })}>+</button>
                             </div>
                         </div>
                     )}
                   </div>

                   {item.specialTickets && item.specialTickets.length > 0 && (
                       <div className="space-y-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                           <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Adicionais & Especiais</p>
                           {item.specialTickets.map((ticket, idx) => (
                               <div key={idx} className="flex justify-between items-center">
                                   <div><span className="text-sm font-medium text-slate-700 block">{ticket.name}</span><span className="text-xs font-bold text-[#0097A8]">{formatBRL(ticket.price)}</span></div>
                                   <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-blue-100 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold" onClick={()=>handleUpdateSpecial(idx, -1)}>-</button><span className="font-bold text-slate-900 w-4 text-center">{selectedSpecial[idx] || 0}</span><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold" onClick={()=>handleUpdateSpecial(idx, 1)}>+</button></div>
                               </div>
                           ))}
                       </div>
                   )}

                   <div className="pt-4 border-t border-dashed border-slate-200">
                      <div className="flex justify-between items-center mb-6"><span className="text-slate-600 font-medium">Total Estimado</span><span className="text-2xl font-bold text-slate-900">{formatBRL(total)}</span></div>
                      <Button className="w-full py-4 text-lg" disabled={!date} onClick={handleBook}>Reservar</Button>
                      <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1"><Lock size={10}/> Compra segura</p>
                   </div>
                </div>
            )}
         </div>
      </div>
      
      {/* Modal de Aviso de Dependência (Exibido se showWarning tiver dados) */}
      {showWarning && createPortal(
          <ModalOverlay onClose={() => setShowWarning(null)}>
              <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
                  <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32}/></div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">{showWarning.title}</h2>
                  <p className="text-slate-600 mb-6 text-sm">{showWarning.msg}</p>
                  <Button onClick={() => setShowWarning(null)} className="w-full justify-center">Entendi</Button>
              </div>
          </ModalOverlay>,
          document.body
      )}

    </div>
  );
};

const CheckoutPage = () => {
  useSEO("Pagamento", "Finalize sua reserva.", true);
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData } = location.state || {};
  
  const [user, setUser] = useState(auth.currentUser);
  const [showLogin, setShowLogin] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Lógica de Cupom e Totais
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
  const [createdPaymentId, setCreatedPaymentId] = useState(null);

  // Helper para detectar bandeira
  const getPaymentMethodId = (number) => {
    const cleanNum = number.replace(/\D/g, '');
    if (/^4/.test(cleanNum)) return 'visa';
    if (/^5[1-5]/.test(cleanNum)) return 'master';
    if (/^3[47]/.test(cleanNum)) return 'amex';
    if (/^6/.test(cleanNum)) return 'elo'; 
    if (/^3(?:0[0-5]|[68][0-9])/.test(cleanNum)) return 'diners';
    return 'visa'; // Fallback
  };

  useEffect(() => {
    if(!bookingData) { navigate('/'); return; }
    
    // Inicialização segura do SDK
    const initMP = () => {
        if (window.MercadoPago && import.meta.env.VITE_MP_PUBLIC_KEY) {
            try {
                if (!window.mpInstance) {
                    window.mpInstance = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY);
                    console.log("✅ SDK MercadoPago pronto.");
                }
            } catch (e) { console.error("Erro init MP:", e); }
        }
    };
    initMP();
    setTimeout(initMP, 1000); 

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
    try {
        await addDoc(collection(db, "reservations"), {
          ...bookingData, 
          total: finalTotal,
          discount: discount,
          couponCode: couponCode ? couponCode.toUpperCase() : null,
          paymentMethod: paymentMethod,
          userId: user.uid, 
          ownerId: bookingData.item.ownerId,
          createdAt: new Date(), 
          status: 'confirmed', 
          guestName: user.displayName || "Usuário", 
          guestEmail: user.email
        });
        setProcessing(false);
        setShowSuccess(true);
    } catch (e) {
        console.error("Erro ao salvar reserva:", e);
        alert("Erro ao confirmar reserva. Tente novamente.");
        setProcessing(false);
    }
  };

  const processCardPayment = async () => {

     // Sanitização
     const cleanDoc = (docNumber || "").replace(/\D/g, ''); 
     const cleanEmail = user?.email && user.email.includes('@') ? user.email.trim() : "cliente_guest@mapadodayuse.com";
     const firstName = user?.displayName ? user.displayName.split(' ')[0] : "Viajante";
     const lastName = user?.displayName && user.displayName.includes(' ') ? user.displayName.split(' ').slice(1).join(' ') : "Sobrenome";

     // Prepara dados para o backend (que fará o cálculo seguro)
     // ATUALIZADO: Inclui selectedSpecial no payload
     const bookingDetailsPayload = {
         dayuseId: bookingData.item.id,
         date: bookingData.date,
         adults: Number(bookingData.adults),
         children: Number(bookingData.children),
         pets: Number(bookingData.pets),
         selectedSpecial: bookingData.selectedSpecial, // <--- Enviando dados dos especiais
         couponCode: couponCode ? couponCode.toUpperCase() : null
     };

     setProcessing(true);

     try {
       // --- FLUXO PIX ---
       if (paymentMethod === 'pix') {
          if (cleanDoc.length < 11) { alert("Por favor, digite um CPF válido."); setProcessing(false); return; }

          const response = await fetch("/api/process-payment", { 
             method: "POST", 
             headers: { "Content-Type":"application/json" }, 
             body: JSON.stringify({ 
                payment_method_id: 'pix', 
                bookingDetails: bookingDetailsPayload, // Backend calcula tudo
                installments: 1,
                description: `Reserva - ${bookingData.item.name}`,
                payer: { 
                    email: cleanEmail, 
                    first_name: firstName,
                    last_name: lastName,
                    identification: { type: cleanDoc.length > 11 ? 'CNPJ' : 'CPF', number: cleanDoc }
                }
             }) 
          });
          
          // Leitura Segura da Resposta
          const textResponse = await response.text();
          let result;
          try { result = JSON.parse(textResponse); } catch(e) {
             console.error("Erro Crítico API:", textResponse);
             alert("Erro interno no servidor (500).");
             setProcessing(false);
             return;
          }
          
          if (response.ok && result.point_of_interaction) {
             setPixData(result.point_of_interaction.transaction_data);
             setCreatedPaymentId(result.id);
             if (result.charged_amount) setFinalTotal(result.charged_amount);
             
             setProcessing(false);
             setShowPixModal(true);
          } else {
             console.error("Erro Pix:", result);
             let msg = result.message || "Não foi possível gerar o Pix.";
             if (msg.includes("not configured") || msg.includes("Token do parceiro")) {
                 msg = "Erro: Este local ainda não conectou a conta bancária para receber.";
             } else if (msg.includes("user_allowed_only_in_test")) {
                 msg = "Erro de Ambiente: Conta de teste usada indevidamente.";
             }
             alert(msg);
             setProcessing(false);
          }
          return;
       }

       // --- FLUXO CARTÃO ---
       if (!window.mpInstance) { 
           alert("Aguarde o carregamento do sistema de pagamento."); 
           setProcessing(false); 
           return; 
       }

       const [month, year] = cardExpiry.split('/');
       if (!month || !year || cardNumber.length < 13 || cleanDoc.length === 0) {
           alert("Verifique os dados do cartão."); setProcessing(false); return;
       }

       const tokenObj = await window.mpInstance.createCardToken({
          cardNumber: cardNumber.replace(/\s/g, ''),
          cardholderName: cardName,
          cardExpirationMonth: month,
          cardExpirationYear: '20' + year,
          securityCode: cardCvv,
          identification: { type: cleanDoc.length > 11 ? 'CNPJ' : 'CPF', number: cleanDoc }
       });
       
       const response = await fetch("/api/process-payment", { 
          method: "POST", 
          headers: { "Content-Type":"application/json" }, 
          body: JSON.stringify({ 
             token: tokenObj.id,
             payment_method_id: getPaymentMethodId(cardNumber), 
             installments: Number(installments),
             bookingDetails: bookingDetailsPayload, // Backend calcula
             payer: { 
                 email: cleanEmail, 
                 first_name: firstName, 
                 last_name: lastName,
                 identification: { type: cleanDoc.length > 11 ? 'CNPJ' : 'CPF', number: cleanDoc }
             }
          }) 
       });

       const textResponse = await response.text();
       let result;
       try { result = JSON.parse(textResponse); } catch(e) {
           console.error("Erro Crítico API:", textResponse);
           alert("Erro interno no servidor.");
           setProcessing(false);
           return;
       }
       
       if (response.ok && (result.status === 'approved' || result.status === 'in_process')) {
           if (result.charged_amount) setFinalTotal(result.charged_amount);
           handleConfirm();
       } else { 
           console.error("Erro Pagamento:", result);
           let errorMsg = result.message || "Pagamento recusado.";
           if (errorMsg.includes("not configured")) errorMsg = "Erro: Este local ainda não conectou a conta bancária.";
           alert(errorMsg); 
           setProcessing(false); 
       }
     } catch (err) {
        console.error("Erro Crítico:", err);
        alert("Ocorreu um erro de comunicação. Tente novamente.");
        setProcessing(false);
     }
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-20 px-4">
      <SuccessModal isOpen={showSuccess} onClose={()=>setShowSuccess(false)} title="Pagamento Aprovado!" message="Sua reserva foi confirmada. Acesse seu voucher." onAction={()=>navigate('/minhas-viagens')} actionLabel="Meus Ingressos"/>
      
      <PixModal 
          isOpen={showPixModal} 
          onClose={()=>setShowPixModal(false)} 
          pixData={pixData} 
          onConfirm={handleConfirm}
          paymentId={createdPaymentId} 
      />
      
      <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={()=>{setShowLogin(false);}} />
            
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900"><User className="text-[#0097A8]"/> Seus Dados</h3>
            {user ? (
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900">{user.displayName || "Usuário"}</p>
                  <p className="text-slate-600 text-sm">{user.email}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-100 w-fit px-3 py-1 rounded-full"><Lock size={10}/> Identidade Confirmada</div>
                  
                  {!user.emailVerified && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                          <p className="text-xs text-yellow-800 font-bold flex items-center gap-1 mb-1"><AlertCircle size={12}/> E-mail não verificado</p>
                          <p className="text-[10px] text-yellow-700 mb-2">Recomendamos verificar seu e-mail, mas você pode prosseguir.</p>
                          <button 
                             className="text-xs text-[#0097A8] font-bold hover:underline"
                             onClick={async () => {
                                try { await sendEmailVerification(user); alert("E-mail enviado!"); }
                                catch(e) { alert("Erro ao enviar. Tente mais tarde."); }
                             }}
                          >
                             Reenviar confirmação
                          </button>
                      </div>
                  )}
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

        {/* Resumo Lateral (Atualizado com Novos Campos) */}
        <div>
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl sticky top-24">
              <h3 className="font-bold text-xl text-slate-900">{bookingData.item.name}</h3>
              <p className="text-sm text-slate-500 mb-6">{bookingData.date.split('-').reverse().join('/')}</p>
              
              <div className="space-y-3 text-sm text-slate-600 border-t pt-4">
                  <div className="flex justify-between"><span>Adultos ({bookingData.adults})</span><b>{formatBRL(bookingData.adults * bookingData.priceSnapshot.adult)}</b></div>
                  {bookingData.children > 0 && <div className="flex justify-between"><span>Crianças ({bookingData.children})</span><b>{formatBRL(bookingData.children * bookingData.priceSnapshot.child)}</b></div>}
                  {bookingData.pets > 0 && <div className="flex justify-between"><span>Pets ({bookingData.pets})</span><b>{formatBRL(bookingData.pets * bookingData.priceSnapshot.pet)}</b></div>}
                  
                  {/* NOVOS ITENS: Grátis e Especiais */}
                  {bookingData.freeChildren > 0 && (
                      <div className="flex justify-between text-green-600 font-bold text-xs">
                          <span>Crianças Grátis ({bookingData.freeChildren})</span>
                          <span>R$ 0,00</span>
                      </div>
                  )}
                  
                  {bookingData.selectedSpecial && Object.entries(bookingData.selectedSpecial).map(([idx, qtd]) => {
                     const ticket = bookingData.item?.specialTickets?.[idx];
                     if(qtd > 0 && ticket) {
                         return (
                             <div key={idx} className="flex justify-between text-blue-600 text-xs">
                                 <span>{ticket.name} ({qtd})</span>
                                 <b>{formatBRL(ticket.price * qtd)}</b>
                             </div>
                         )
                     }
                     return null;
                  })}

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
                <p className="text-slate-500 text-sm mt-2 mb-4">Não foi possível vincular sua conta do Mercado Pago.</p>            </>
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
  
  // NOVOS ESTADOS PARA MODAIS
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', title: '', msg: '' }
  const [confirmAction, setConfirmAction] = useState(null); // { id: string } para guardar o ID a cancelar

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

  // 1. Solicita confirmação (Abre Modal)
  const requestCancel = (id) => {
      setConfirmAction({ id });
  };

  // 2. Executa o cancelamento (Ação do Modal)
  const executeCancel = async () => {
    if (!confirmAction) return;
    const { id } = confirmAction;
    
    // Captura os dados da reserva para o e-mail antes de excluir da lista visual
    const tripToCancel = trips.find(t => t.id === id);

    try {
        await deleteDoc(doc(db, "reservations", id));
        setTrips(trips.filter(t => t.id !== id));
        
        // Envia E-mail de Cancelamento
        if (tripToCancel) {
            const emailHtml = `
             <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                 <div style="background-color: #ef4444; padding: 20px; text-align: center; color: white;">
                     <h1 style="margin: 0; font-size: 24px;">Reserva Cancelada</h1>
                 </div>
                 <div style="padding: 20px;">
                     <p>Olá, <strong>${tripToCancel.guestName || 'Viajante'}</strong>.</p>
                     <p>Sua reserva foi cancelada conforme solicitado através da plataforma.</p>
                     
                     <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                         <h3 style="margin-top: 0; color: #333;">${tripToCancel.itemName}</h3>
                         <p style="margin: 5px 0;"><strong>📅 Data original:</strong> ${tripToCancel.date?.split('-').reverse().join('/')}</p>
                         <p style="margin: 5px 0;"><strong>📍 Código:</strong> ${tripToCancel.id?.slice(0, 6).toUpperCase()}</p>
                     </div>

                     <p style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
                        <strong>Importante sobre Reembolso:</strong> O estorno de valores pagos depende da política de cancelamento específica deste estabelecimento. Entre em contato diretamente com o local para mais detalhes.
                     </p>
                 </div>
             </div>
            `;
            sendEmail(tripToCancel.guestEmail, "Reserva Cancelada - Mapa do Day Use", emailHtml);
        }

        setFeedback({ 
            type: 'success', 
            title: 'Cancelado', 
            msg: 'Sua reserva foi cancelada. Enviamos um comprovante para seu e-mail.' 
        });

    } catch (error) {
        console.error("Erro ao cancelar:", error);
        setFeedback({ 
            type: 'error', 
            title: 'Erro', 
            msg: 'Não foi possível cancelar a reserva. Tente novamente ou contate o suporte.' 
        });
    } finally {
        setConfirmAction(null); // Fecha o modal de confirmação
    }
  };

  const handleLogout = async () => { await signOut(auth); window.location.href = '/'; }

  if (!user) return <div className="text-center py-20 text-slate-400">Carregando...</div>;

  return (
     <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <VoucherModal isOpen={!!selectedVoucher} trip={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
        
        {/* MODAL DE FEEDBACK (Sucesso/Erro) */}
        {feedback && createPortal(
            <ModalOverlay onClose={() => setFeedback(null)}>
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        feedback.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                        {feedback.type === 'success' ? <CheckCircle size={32}/> : <AlertCircle size={32}/>}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">{feedback.title}</h2>
                    <p className="text-slate-600 mb-6 text-sm">{feedback.msg}</p>
                    <Button onClick={() => setFeedback(null)} className="w-full justify-center">Fechar</Button>
                </div>
            </ModalOverlay>,
            document.body
        )}

        {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
        {confirmAction && createPortal(
            <ModalOverlay onClose={() => setConfirmAction(null)}>
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={32}/>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Cancelar Reserva?</h2>
                    <p className="text-slate-600 mb-6 text-sm">
                        Tem certeza que deseja cancelar? Essa ação não pode ser desfeita e está sujeita às regras de reembolso do local.
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={() => setConfirmAction(null)} variant="ghost" className="flex-1 justify-center">
                            Voltar
                        </Button>
                        <Button onClick={executeCancel} className="flex-1 justify-center bg-red-500 hover:bg-red-600 text-white border-none shadow-red-200">
                            Sim, Cancelar
                        </Button>
                    </div>
                </div>
            </ModalOverlay>,
            document.body
        )}

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

                      <div className="mt-2 text-xs font-mono bg-slate-50 p-1 px-2 rounded w-fit border border-slate-200 text-slate-500">
                         #{t.id?.slice(0,6).toUpperCase()}
                      </div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                    <Button variant="outline" className="px-4 py-2 h-auto text-xs" onClick={() => setSelectedVoucher(t)}>Ver Voucher</Button>
                    {t.status !== 'cancelled' && <Button variant="danger" className="px-4 py-2 h-auto text-xs bg-white text-red-500 hover:bg-red-50 border-red-100" onClick={() => requestCancel(t.id)}>Cancelar</Button>}
                 </div>
              </div>
           ))}
           {trips.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border border-dashed"><p className="text-slate-400">Você ainda não tem reservas.</p></div>}
        </div>
     </div>
  );
};

// ... (outros componentes)
const QrScannerModal = ({ isOpen, onClose, onScan }) => {
  useEffect(() => {
    let html5QrCode;
    
    if (isOpen) {
      const startScanner = async () => {
        // Pequeno delay para garantir que o modal abriu e a div "reader" existe
        await new Promise(r => setTimeout(r, 300));
        
        const element = document.getElementById("reader");
        if (!element) return;

        try {
            html5QrCode = new Html5Qrcode("reader");
            await html5QrCode.start(
                { facingMode: "environment" }, // Usa câmera traseira
                { fps: 10, qrbox: 250 },
                (decodedText) => {
                    // Sucesso
                    onScan(decodedText);
                    // Opcional: pausar ou fechar é controlado pelo pai (onClose)
                },
                (errorMessage) => {
                    // Erro de leitura (ignoramos para não poluir console)
                }
            );
        } catch (err) {
            console.error("Erro ao iniciar câmera:", err);
            // Se der erro de permissão ou suporte
            const readerDiv = document.getElementById("reader");
            if(readerDiv) readerDiv.innerHTML = `<p class="text-red-500 text-center p-4">Erro: Não foi possível acessar a câmera. Verifique as permissões do navegador.</p>`;
        }
      };

      startScanner();

      // Cleanup: Para a câmera ao fechar o modal
      return () => {
         if (html5QrCode && html5QrCode.isScanning) {
             html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
         }
      };
    }
  }, [isOpen]); // Removido onScan das dependências para evitar reinicialização

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md mx-auto relative">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><ScanLine size={20} className="text-[#0097A8]"/> Validar Ingresso</h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
        </div>
        
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-square border-4 border-slate-100 shadow-inner flex items-center justify-center">
            <div id="reader" className="w-full h-full"></div>
            {/* Overlay visual para guiar o usuário */}
            <div className="absolute inset-0 border-[40px] border-black/30 pointer-events-none"></div>
            <div className="absolute w-64 h-64 border-2 border-white/50 rounded-lg pointer-events-none"></div>
            <div className="absolute top-4 text-white/80 text-xs font-bold bg-black/50 px-3 py-1 rounded-full pointer-events-none">Aponte para o QR Code</div>
        </div>

        <p className="text-xs text-center text-slate-400 mt-4">
            A câmera será ativada automaticamente.
        </p>
      </div>
    </ModalOverlay>,
    document.body
  );
};

const VoucherModal = ({ isOpen, onClose, trip }) => {
  if (!isOpen || !trip) return null;
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${trip.id}`;
  const itemData = trip.item || {};
  const placeName = itemData.name || trip.itemName || "Local do Passeio";
  const address = itemData.street ? `${itemData.street}, ${itemData.number} - ${itemData.district || ''}, ${itemData.city} - ${itemData.state}` : "Endereço não disponível";
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + " " + address)}`;
  const paymentLabel = trip.paymentMethod === 'pix' ? 'Pix (À vista)' : `Cartão de Crédito ${trip.installments ? `(${trip.installments}x)` : '(À vista)'}`;

  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col w-full bg-white">
        
        {/* Cabeçalho Fixo */}
        <div className="sticky top-0 z-10 bg-[#0097A8] p-6 text-white text-center shadow-sm">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-1 transition-colors"><X size={20}/></button>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><Ticket size={24} /></div>
            <h2 className="text-xl font-bold">Voucher de Acesso</h2>
            <p className="text-cyan-100 text-sm">Apresente na portaria</p>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-8 text-sm text-slate-700 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* QR Code e Status */}
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
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Data</span><b className="text-slate-900 text-lg">{trip.date?.split('-').reverse().join('/')}</b></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Titular</span><b className="text-slate-900">{trip.guestName}</b></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Pagamento</span><b className="text-slate-900 capitalize">{paymentLabel}</b></div>
            </div>

            {/* Endereço e Contato */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div>
                    <p className="font-bold text-slate-900 mb-1 flex items-center gap-2"><MapPin size={16} className="text-[#0097A8]"/> {placeName}</p>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">{address}</p>
                    <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-white border border-slate-200 text-[#0097A8] font-bold py-2 rounded-lg hover:bg-cyan-50 transition-colors text-xs flex items-center justify-center gap-2">
                        <LinkIcon size={14}/> Abrir no Maps / Waze
                    </a>
                </div>

                {(itemData.localWhatsapp || itemData.localPhone || itemData.localEmail) && (
                    <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fale com o local</p>
                        <div className="space-y-2">
                            {itemData.localWhatsapp && (
                                <a href={`https://wa.me/55${itemData.localWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline font-medium">
                                    <MessageCircle size={16} /> WhatsApp: {itemData.localWhatsapp}
                                </a>
                            )}
                            {itemData.localPhone && (
                                <a href={`tel:${itemData.localPhone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-slate-600 hover:underline">
                                    <Phone size={16} /> Tel: {itemData.localPhone}
                                </a>
                            )}
                            {itemData.localEmail && (
                                <a href={`mailto:${itemData.localEmail}`} className="flex items-center gap-2 text-slate-600 hover:underline">
                                    <Mail size={16} /> {itemData.localEmail}
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Resumo Financeiro e Itens */}
            <div className="bg-cyan-50 p-4 rounded-xl">
               <p className="text-[#0097A8] text-xs uppercase font-bold mb-2 flex items-center gap-1"><Info size={12}/> Itens do Pacote</p>
               <ul className="space-y-1 text-sm text-slate-700">
                 <li className="flex justify-between"><span>Adultos:</span> <b>{trip.adults}</b></li>
                 {trip.children > 0 && <li className="flex justify-between"><span>Crianças:</span> <b>{trip.children}</b></li>}
                 {trip.pets > 0 && <li className="flex justify-between"><span>Pets:</span> <b>{trip.pets}</b></li>}
                 
                 {/* NOVO: Crianças Gratuitas */}
                 {trip.freeChildren > 0 && (
                     <li className="flex justify-between text-green-700 font-bold"><span>Crianças Grátis:</span> <b>{trip.freeChildren}</b></li>
                 )}

                 {/* NOVO: Itens Especiais */}
                 {trip.selectedSpecial && Object.entries(trip.selectedSpecial).map(([idx, qtd]) => {
                     const ticketName = trip.item?.specialTickets?.[idx]?.name || "Item Extra";
                     if(qtd > 0) return <li key={idx} className="flex justify-between text-blue-700"><span>{ticketName}:</span> <b>{qtd}</b></li>
                     return null;
                 })}
                 
                 <li className="flex justify-between pt-2 mt-2 border-t border-cyan-100 text-[#0097A8] font-bold text-lg"><span>Total Pago</span><span>{formatBRL(trip.total)}</span></li>
               </ul>
            </div>

            <Button className="w-full" onClick={() => window.print()}>Imprimir / Salvar PDF</Button>
        </div>
      </div>
    </ModalOverlay>,
    document.body
  );
};

const StaffDashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [selectedRes, setSelectedRes] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [user, setUser] = useState(null);
  const [ownerId, setOwnerId] = useState(null);

  useEffect(() => {
     const unsub = onAuthStateChanged(auth, async u => {
        if(u) {
           setUser(u);
           // 1. Busca quem é o 'chefe' (Partner) desse Staff
           const userDoc = await getDoc(doc(db, "users", u.uid));
           if(userDoc.exists() && userDoc.data().ownerId) {
               setOwnerId(userDoc.data().ownerId);
               
               // 2. Carrega apenas as reservas daquele parceiro
               const qRes = query(collection(db, "reservations"), where("ownerId", "==", userDoc.data().ownerId));
               onSnapshot(qRes, s => setReservations(s.docs.map(d => ({id: d.id, ...d.data()}))));
           }
        }
     });
     return unsub;
  }, []);

  const dailyGuests = reservations.filter(r => r.date === filterDate && (r.guestName || "Viajante").toLowerCase().includes(searchTerm.toLowerCase()));
  
  const dailyStats = dailyGuests.reduce((acc, curr) => ({
      adults: acc.adults + (curr.adults || 0),
      children: acc.children + (curr.children || 0),
      pets: acc.pets + (curr.pets || 0),
      total: acc.total + (curr.adults || 0) + (curr.children || 0)
  }), { adults: 0, children: 0, pets: 0, total: 0 });

  const handleValidate = async (resId, codeInput) => {
     if(codeInput.toUpperCase() === resId.slice(0,6).toUpperCase() || resId === codeInput) {
        try {
            await updateDoc(doc(db, "reservations", resId), { status: 'validated' });
            const res = reservations.find(r => r.id === resId);
            setFeedback({ type: 'success', title: 'Acesso Liberado! 🎉', msg: `Bem-vindo(a), ${res?.guestName || 'Visitante'}.` });
        } catch (e) {
            setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao validar.' });
        }
     } else {
        setFeedback({ type: 'error', title: 'Inválido', msg: 'Código incorreto.' });
     }
  };

  const onScanSuccess = (decodedText) => {
      setShowScanner(false);
      const res = reservations.find(r => r.id === decodedText);
      if (res) {
          if (res.status === 'validated') setFeedback({ type: 'warning', title: 'Atenção', msg: 'Ingresso JÁ UTILIZADO.' });
          else if (res.status === 'cancelled') setFeedback({ type: 'error', title: 'Cancelado', msg: 'Ingresso cancelado.' });
          else handleValidate(res.id, res.id);
      } else {
          setFeedback({ type: 'error', title: 'Não Encontrado', msg: 'QR Code não pertence a este local.' });
      }
  };

  if (!user) return <div className="text-center py-20 text-slate-400">Carregando acesso...</div>;
  if (!ownerId) return <div className="text-center py-20 text-red-400">Erro: Conta não vinculada a um parceiro. Peça ao administrador para recadastrar.</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in space-y-6">
       <VoucherModal isOpen={!!selectedRes} trip={selectedRes} onClose={()=>setSelectedRes(null)} isPartnerView={true}/>
       <QrScannerModal isOpen={showScanner} onClose={()=>setShowScanner(false)} onScan={onScanSuccess} />
       
       {feedback && createPortal(
            <ModalOverlay onClose={() => setFeedback(null)}>
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${feedback.type === 'success' ? 'bg-green-100 text-green-600' : feedback.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                        {feedback.type === 'success' ? <CheckCircle size={32}/> : <AlertCircle size={32}/>}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">{feedback.title}</h2>
                    <p className="text-slate-600 mb-6 text-sm">{feedback.msg}</p>
                    <Button onClick={() => setFeedback(null)} className="w-full justify-center">Fechar</Button>
                </div>
            </ModalOverlay>, document.body
       )}

       <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
              <h1 className="text-2xl font-bold text-slate-900">Portaria</h1>
              <p className="text-slate-500 text-sm">Controle de Acesso Diário</p>
          </div>
          <div className="text-right">
              <p className="text-xs text-slate-400 font-bold uppercase">Hoje</p>
              <p className="text-2xl font-bold text-[#0097A8]">{dailyStats.total} <span className="text-sm font-normal text-slate-400">pessoas</span></p>
          </div>
       </div>

       <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex gap-4 mb-6">
              <input type="date" className="border p-3 rounded-xl text-slate-600 font-medium" value={filterDate} onChange={e=>setFilterDate(e.target.value)}/>
              <Button className="flex-1" onClick={() => setShowScanner(true)}><ScanLine size={20}/> Ler QR Code</Button>
           </div>
           
           <div className="relative mb-6">
               <Search size={18} className="absolute left-3 top-3.5 text-slate-400"/>
               <input className="w-full border p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-[#0097A8]" placeholder="Buscar visitante por nome..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
           </div>

           <div className="space-y-3">
              {dailyGuests.length === 0 ? <p className="text-center text-slate-400 py-8">Nenhum ingresso para hoje.</p> : dailyGuests.map(r => (
                 <div key={r.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                       <p className="font-bold text-slate-900">{r.guestName}</p>
                       <div className="flex gap-2 text-xs text-slate-500 mt-1">
                          <span className="bg-slate-50 px-1 rounded">{r.adults} Adt</span> <span className="bg-slate-50 px-1 rounded">{r.children} Cri</span>
                       </div>
                    </div>
                    {r.status === 'validated' ? (
                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> OK</div>
                    ) : (
                        <Button className="px-4 py-1.5 h-auto text-xs" onClick={()=>handleValidate(r.id, r.id.slice(0,6))}>Validar</Button>
                    )}
                 </div>
              ))}
           </div>
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
  const [tokenType, setTokenType] = useState(null); 
  const [expandedStats, setExpandedStats] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [feedback, setFeedback] = useState(null); 
  const [confirmAction, setConfirmAction] = useState(null);

  // States para cadastro de equipe
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
     const unsub = onAuthStateChanged(auth, async u => {
        if(u) {
           setUser(u);
           const userDoc = await getDoc(doc(db, "users", u.uid));
           if(userDoc.exists() && userDoc.data().mp_access_token) {
               setMpConnected(true);
               const token = userDoc.data().mp_access_token;
               setTokenType(token.startsWith('TEST-') ? 'TEST' : 'PROD');
           }
           
           const qDay = query(collection(db, "dayuses"), where("ownerId", "==", u.uid));
           const qRes = query(collection(db, "reservations"), where("ownerId", "==", u.uid));
           
           // Novo: Busca Staff também para listar (opcional, mantendo lógica anterior)
           const qStaff = query(collection(db, "users"), where("ownerId", "==", u.uid));
           
           onSnapshot(qDay, s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
           onSnapshot(qRes, s => setReservations(s.docs.map(d => ({id: d.id, ...d.data()}))));
        }
     });
     return unsub;
  }, []);
  
  const handleConnect = () => {
     const currentBaseUrl = window.location.origin; 
     const redirect = `${currentBaseUrl}/partner/callback`;
     const encodedRedirect = encodeURIComponent(redirect);
     const clientId = import.meta.env.VITE_MP_CLIENT_ID;
     window.location.href = `https://auth.mercadopago.com.br/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${user.uid}&redirect_uri=${encodedRedirect}`;
  };

  const togglePause = (item) => { setConfirmAction({ type: item.paused ? 'resume' : 'pause', item: item }); };
  
  const executeAction = async () => {
      if (!confirmAction) return;
      const { item, type } = confirmAction;
      try {
          await updateDoc(doc(db, "dayuses", item.id), { paused: type === 'pause' });
          setFeedback({ type: 'success', title: 'Sucesso', msg: `Anúncio ${type === 'pause' ? 'pausado' : 'reativado'}.` });
      } catch (error) {
          setFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível atualizar.' });
      } finally { setConfirmAction(null); }
  };

  const handleValidate = async (resId, codeInput) => {
     if(codeInput.toUpperCase() === resId.slice(0,6).toUpperCase() || resId === codeInput) {
        try {
            await updateDoc(doc(db, "reservations", resId), { status: 'validated' });
            const res = reservations.find(r => r.id === resId);
            setFeedback({ type: 'success', title: 'Check-in Realizado!', msg: `Acesso liberado para ${res?.guestName}.` });
            setValidationCode("");
        } catch (e) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao validar.' }); }
     } else { setFeedback({ type: 'error', title: 'Código Inválido', msg: 'Verifique o código.' }); }
  };
  
  const onScanSuccess = (decodedText) => {
      setShowScanner(false);
      const res = reservations.find(r => r.id === decodedText);
      if (res) {
          if (res.status === 'validated') setFeedback({ type: 'warning', title: 'Atenção', msg: 'Ingresso JÁ UTILIZADO.' });
          else if (res.status === 'cancelled') setFeedback({ type: 'error', title: 'Cancelado', msg: 'Ingresso cancelado.' });
          else handleValidate(res.id, res.id);
      } else setFeedback({ type: 'error', title: 'Não Encontrado', msg: 'QR Code inválido.' });
  };

  const handleAddStaff = async (e) => {
      e.preventDefault();
      setStaffLoading(true);
      try {
          const secondaryApp = initializeApp(getApp().options, "Secondary");
          const secondaryAuth = getAuth(secondaryApp);
          const createdUser = await createUserWithEmailAndPassword(secondaryAuth, staffEmail, staffPass);
          
          await setDoc(doc(db, "users", createdUser.user.uid), {
              email: staffEmail, role: 'staff', ownerId: user.uid, createdAt: new Date(), name: "Portaria"
          });
          
          await signOut(secondaryAuth);
          setFeedback({ type: 'success', title: 'Equipe Cadastrada!', msg: `Usuário ${staffEmail} criado.` });
          setStaffEmail(''); setStaffPass('');
      } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', title: 'Erro ao cadastrar', msg: err.code === 'auth/email-already-in-use' ? 'E-mail já existe.' : 'Verifique os dados.' });
      } finally { setStaffLoading(false); }
  };

  if (!user) return <div className="text-center py-20 text-slate-400">Carregando painel...</div>;

  // Lógica Financeira (Mantida)
  const financialRes = reservations.filter(r => new Date(r.createdAt.seconds * 1000).getMonth() === filterMonth && r.status === 'confirmed');
  const totalBalance = financialRes.reduce((acc, c) => acc + (c.total || 0), 0);
  const platformFee = totalBalance * 0.20;
  const estimatedMPFees = totalBalance * 0.0499;
  const netBalance = totalBalance - platformFee - estimatedMPFees;
  const pixTotal = financialRes.filter(r => r.paymentMethod === 'pix').reduce((acc, c) => acc + (c.total || 0), 0);
  const cardTotal = totalBalance - pixTotal; 
  const allCouponsUsed = reservations.filter(r => r.discount > 0).length;
  const couponBreakdown = reservations.reduce((acc, r) => { if (r.discount > 0) { const code = r.couponCode || "OUTROS"; acc[code] = (acc[code] || 0) + 1; } return acc; }, {});

  // --- LÓGICA OPERACIONAL ROBUSTA (Atualizada) ---
  const dailyGuests = reservations.filter(r => 
      r.date === filterDate && 
      (r.guestName || "Viajante").toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const dailyStats = dailyGuests.reduce((acc, curr) => {
      const adt = Number(curr.adults || 0);
      const chd = Number(curr.children || 0);
      const free = Number(curr.freeChildren || 0);
      const pet = Number(curr.pets || 0);
      
      // Conta itens especiais (estacionamento, combos, etc)
      let specials = 0;
      if (curr.selectedSpecial) {
          Object.values(curr.selectedSpecial).forEach(q => specials += Number(q));
      }

      return {
          adults: acc.adults + adt,
          children: acc.children + chd,
          freeChildren: acc.freeChildren + free,
          pets: acc.pets + pet,
          specials: acc.specials + specials,
          // Total de pessoas (Adultos + Crianças pagas + Crianças Grátis)
          total: acc.total + adt + chd + free 
      };
  }, { adults: 0, children: 0, freeChildren: 0, pets: 0, specials: 0, total: 0 });


  return (
     <div className="max-w-7xl mx-auto py-12 px-4 animate-fade-in space-y-12">
        <VoucherModal isOpen={!!selectedRes} trip={selectedRes} onClose={()=>setSelectedRes(null)} isPartnerView={true}/>
        <QrScannerModal isOpen={showScanner} onClose={()=>setShowScanner(false)} onScan={onScanSuccess} />
        
        {feedback && createPortal(<ModalOverlay onClose={() => setFeedback(null)}><div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"><div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${feedback.type === 'success' ? 'bg-green-100 text-green-600' : feedback.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>{feedback.type === 'success' ? <CheckCircle size={32}/> : feedback.type === 'warning' ? <AlertCircle size={32}/> : <X size={32}/>}</div><h2 className="text-xl font-bold mb-2">{feedback.title}</h2><p className="mb-4 text-slate-600">{feedback.msg}</p><Button onClick={() => setFeedback(null)} className="w-full justify-center">Fechar</Button></div></ModalOverlay>, document.body)}
        
        {confirmAction && createPortal(<ModalOverlay onClose={() => setConfirmAction(null)}><div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"><h2 className="text-xl font-bold mb-4">{confirmAction.type === 'pause' ? 'Pausar Anúncio?' : 'Reativar Anúncio?'}</h2><div className="flex gap-2"><Button onClick={() => setConfirmAction(null)} variant="ghost" className="flex-1 justify-center">Cancelar</Button><Button onClick={executeAction} className={`flex-1 justify-center ${confirmAction.type === 'pause' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>{confirmAction.type === 'pause' ? 'Pausar' : 'Reativar'}</Button></div></div></ModalOverlay>, document.body)}
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-slate-200 pb-4 gap-4">
           <div><h1 className="text-3xl font-bold text-slate-900">Painel de Gestão</h1><p className="text-slate-500">Acompanhe seu negócio.</p></div>
           <div className="flex gap-2 items-center">
              {!mpConnected ? (<Button onClick={handleConnect} className="bg-blue-500 hover:bg-blue-600">Conectar Mercado Pago</Button>) : (<div className="flex items-center gap-2">{tokenType === 'TEST' && <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">⚠️ SANDBOX</div>}{tokenType === 'PROD' && <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">✅ PRODUÇÃO</div>}<div className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold flex gap-2 items-center border border-slate-200"><CheckCircle size={18} className="text-green-600"/> Conectado</div></div>)}
              <Button onClick={()=>navigate('/partner/new')}>+ Criar Anúncio</Button>
           </div>
        </div>

        {/* FINANCEIRO */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex justify-between mb-6"><h2 className="text-xl font-bold flex gap-2 text-slate-800"><DollarSign/> Financeiro</h2><select className="border p-2 rounded-lg bg-slate-50 text-sm font-medium" value={filterMonth} onChange={e=>setFilterMonth(Number(e.target.value))}>{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=><option key={i} value={i}>{m}</option>)}</select></div>
           <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                 <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Resumo do Mês</p><div className="space-y-1 mb-4"><div className="flex justify-between text-sm text-slate-600"><span>Vendas Brutas:</span><span className="font-bold">{formatBRL(totalBalance)}</span></div><div className="flex justify-between text-xs text-red-400"><span>Taxa Plataforma (20%):</span><span>- {formatBRL(platformFee)}</span></div><div className="flex justify-between text-xs text-red-400"><span>Taxas MP (Est.*):</span><span>- {formatBRL(estimatedMPFees)}</span></div></div></div>
                 <div className="pt-3 border-t border-slate-200"><p className="text-xs text-green-700 font-bold uppercase mb-1">Líquido Estimado</p><p className="text-3xl font-bold text-green-700">{formatBRL(netBalance)}</p></div>
              </div>
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
                 <p className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-4">Por Método</p>
                 <div className="space-y-4">
                    <div><div className="flex justify-between items-center mb-1"><span className="text-sm text-blue-900 font-medium flex items-center gap-2"><CreditCard size={16}/> Cartão</span><span className="font-bold text-blue-900">{formatBRL(cardTotal)}</span></div><div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-600 h-full" style={{ width: totalBalance > 0 ? `${(cardTotal/totalBalance)*100}%` : '0%' }}></div></div></div>
                    <div><div className="flex justify-between items-center mb-1"><span className="text-sm text-blue-900 font-medium flex items-center gap-2"><QrCode size={16}/> Pix</span><span className="font-bold text-blue-900">{formatBRL(pixTotal)}</span></div><div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden"><div className="bg-teal-500 h-full" style={{ width: totalBalance > 0 ? `${(pixTotal/totalBalance)*100}%` : '0%' }}></div></div></div>
                 </div>
              </div>
              <div className="p-6 bg-yellow-50 rounded-2xl border border-yellow-200 flex flex-col">
                 <div className="flex justify-between items-start mb-4"><div><p className="text-xs text-yellow-800 font-bold uppercase">Cupons Usados</p><p className="text-3xl font-bold text-slate-900">{allCouponsUsed}</p></div><Tag className="text-yellow-600" size={32}/></div>
                 <div className="flex-1 overflow-y-auto max-h-32 pr-2 custom-scrollbar">{Object.keys(couponBreakdown).length === 0 && <p className="text-xs text-slate-400 italic">Nenhum cupom usado.</p>}{Object.entries(couponBreakdown).map(([code, count]) => (<div key={code} className="flex justify-between text-xs text-slate-600 mb-1 border-b border-yellow-100 pb-1 last:border-0"><span className="font-bold bg-white px-1.5 py-0.5 rounded border border-yellow-200 text-yellow-900">{code}</span><span>{count}x</span></div>))}</div>
              </div>
           </div>
        </div>

        {/* LISTA DE PRESENÇA (ATUALIZADA COM NOVOS TIPOS) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
              <h2 className="text-xl font-bold flex gap-2 text-slate-800"><List/> Lista de Presença</h2>
              <div className="flex gap-4"><input type="date" className="border p-2 rounded-lg text-slate-600 font-medium" value={filterDate} onChange={e=>setFilterDate(e.target.value)}/><Button variant="outline" onClick={() => setShowScanner(true)}><ScanLine size={18}/> Validar Ingresso</Button></div>
           </div>
           
           {/* Card Expansível ROBUSTO */}
           <div className="mb-6 bg-indigo-50 rounded-xl p-4 border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors" onClick={()=>setExpandedStats(!expandedStats)}>
               <div className="flex justify-between items-center">
                   <span className="font-bold text-indigo-900 flex items-center gap-2"><Users size={18}/> Total Esperado Hoje: {dailyStats.total} pessoas</span>
                   <ChevronDown size={16} className={`text-indigo-900 transition-transform ${expandedStats ? 'rotate-180' : ''}`}/>
               </div>
               {expandedStats && (
                   <div className="mt-4 pt-4 border-t border-indigo-200 grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-sm animate-fade-in">
                       <div className="bg-white p-2 rounded-lg border border-indigo-100"><p className="font-bold text-xl text-indigo-700">{dailyStats.adults}</p><span className="text-indigo-400 text-[10px] font-bold uppercase">Adultos</span></div>
                       <div className="bg-white p-2 rounded-lg border border-indigo-100"><p className="font-bold text-xl text-indigo-700">{dailyStats.children}</p><span className="text-indigo-400 text-[10px] font-bold uppercase">Crianças</span></div>
                       {/* Novos Contadores */}
                       <div className="bg-white p-2 rounded-lg border border-indigo-100"><p className="font-bold text-xl text-green-600">{dailyStats.freeChildren}</p><span className="text-green-500 text-[10px] font-bold uppercase">Grátis</span></div>
                       <div className="bg-white p-2 rounded-lg border border-indigo-100"><p className="font-bold text-xl text-indigo-700">{dailyStats.pets}</p><span className="text-indigo-400 text-[10px] font-bold uppercase">Pets</span></div>
                       <div className="bg-white p-2 rounded-lg border border-indigo-100"><p className="font-bold text-xl text-blue-600">{dailyStats.specials}</p><span className="text-blue-500 text-[10px] font-bold uppercase">Extras</span></div>
                   </div>
               )}
           </div>
           
           <div className="space-y-4">
              <div className="relative"><Search size={18} className="absolute left-3 top-3.5 text-slate-400"/><input className="w-full border p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-[#0097A8] transition-all" placeholder="Buscar viajante por nome..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
              {dailyGuests.length === 0 ? <p className="text-center text-slate-400 py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhum viajante agendado para esta data.</p> : dailyGuests.map(r => (
                 <div key={r.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-white hover:shadow-md transition-shadow rounded-xl border border-slate-200 gap-4">
                    <div className="flex-1">
                       <p className="font-bold text-lg text-slate-900">{r.guestName}</p>
                       <p className="text-sm text-slate-500 font-mono">#{r.id.slice(0,6).toUpperCase()} • {r.itemName}</p>
                       <div className="flex gap-2 mt-2 text-xs text-slate-600 flex-wrap">
                          {r.adults > 0 && <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">{r.adults} Adultos</span>}
                          {r.children > 0 && <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">{r.children} Crianças</span>}
                          {r.freeChildren > 0 && <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 font-bold">{r.freeChildren} Grátis</span>}
                          {r.pets > 0 && <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium flex items-center gap-1"><PawPrint size={10}/> {r.pets} Pet</span>}
                          
                          {/* Exibir Extras */}
                          {r.selectedSpecial && Object.values(r.selectedSpecial).some(q => q > 0) && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-bold">
                                  + Extras
                              </span>
                          )}
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {r.status === 'validated' ? <div className="px-4 py-2 bg-green-50 text-green-700 font-bold rounded-xl flex items-center gap-2 border border-green-100"><CheckCircle size={18}/> Validado</div> : <div className="flex gap-2"><input id={`code-${r.id}`} className="border p-2 rounded-xl w-24 text-center uppercase font-bold text-slate-700 tracking-wider" placeholder="CÓDIGO" maxLength={6}/><Button onClick={()=>handleValidate(r.id, document.getElementById(`code-${r.id}`).value)} className="h-full py-2 shadow-none">Validar</Button></div>}
                       <Button variant="outline" className="h-full py-2 px-3 rounded-xl" onClick={()=>setSelectedRes(r)}><Info size={18}/></Button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
        
        {/* Meus Anúncios */}
        <div>
           <h2 className="text-xl font-bold mb-6 text-slate-900">Meus Anúncios</h2>
           <div className="grid md:grid-cols-2 gap-6">
              {items.map(i => (
                 <div key={i.id} className={`bg-white p-4 border rounded-2xl flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow relative ${i.paused ? 'opacity-75 bg-slate-50 border-slate-200' : 'border-slate-100'}`}>
                    {i.paused && (<div className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200">PAUSADO</div>)}
                    <img src={i.image} className={`w-24 h-24 rounded-xl object-cover bg-slate-200 ${i.paused ? 'grayscale' : ''}`}/>
                    <div className="flex-1"><h4 className="font-bold text-lg text-slate-900 leading-tight">{i.name}</h4><p className="text-sm text-slate-500 mb-2">{i.city}</p><p className="text-sm font-bold text-[#0097A8] bg-cyan-50 w-fit px-2 py-1 rounded-lg">{formatBRL(i.priceAdult)}</p></div>
                    <div className="flex flex-col gap-2"><Button variant="outline" className="px-3 h-8 text-xs" onClick={()=>navigate(`/partner/edit/${i.id}`)}><Edit size={14}/> Editar</Button><button onClick={() => togglePause(i)} className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors flex items-center justify-center gap-1 ${i.paused ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>{i.paused ? <><CheckCircle size={12}/> Reativar</> : <><Ban size={12}/> Pausar</>}</button></div>
                 </div>
              ))}
           </div>
        </div>

        {/* CADASTRO DE EQUIPE */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800"><Users/> Gerenciar Equipe</h2>
            <div className="grid md:grid-cols-2 gap-8">
                <div><h3 className="font-bold text-slate-700 mb-2">Cadastrar Novo Acesso de Portaria</h3><p className="text-sm text-slate-500 mb-4">Crie um usuário exclusivo para validar ingressos.</p><form onSubmit={handleAddStaff} className="space-y-4"><input className="w-full border p-3 rounded-xl bg-slate-50" placeholder="E-mail do funcionário" value={staffEmail} onChange={e=>setStaffEmail(e.target.value)} required /><input className="w-full border p-3 rounded-xl bg-slate-50" placeholder="Senha de acesso" type="password" value={staffPass} onChange={e=>setStaffPass(e.target.value)} required /><Button type="submit" disabled={staffLoading} className="w-full">{staffLoading ? 'Cadastrando...' : 'Criar Acesso'}</Button></form></div>
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col justify-center text-center"><div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600"><Lock size={24}/></div><h4 className="font-bold text-blue-900 mb-2">Segurança Garantida</h4><p className="text-sm text-blue-700">O usuário de portaria só acessa a lista de presença e o leitor de QR Code.</p></div>
            </div>
        </div>

        {/* SUPORTE */}
        <div className="bg-slate-900 rounded-3xl p-8 text-center text-white mt-12 mb-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-2">Precisa de ajuda?</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">Fale diretamente com nosso suporte técnico.</p>
            <a href="https://wa.me/5531920058081" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#20bd5a] transition-all transform hover:scale-105 shadow-lg"><MessageCircle size={22} /> Falar no WhatsApp</a>
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

  // States Avançados
  const [coupons, setCoupons] = useState([]); 
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPerc, setNewCouponPerc] = useState('');
  
  // CORREÇÃO: Estoque inicia vazio/zerado para obrigar preenchimento
  const [dailyStock, setDailyStock] = useState({ adults: '', children: '', pets: '' });
  const [weeklyPrices, setWeeklyPrices] = useState({});
  const [cnpjError, setCnpjError] = useState(false);

  // States Novos (Ingressos Especiais e Controle)
  const [specialTickets, setSpecialTickets] = useState([]); // [{ name: 'Estacionamento', price: 20 }]
  const [newTicketName, setNewTicketName] = useState('');
  const [newTicketPrice, setNewTicketPrice] = useState('');
  
  const [trackFreeChildren, setTrackFreeChildren] = useState(false); // Controle de gratuidade

  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [amenitySearch, setAmenitySearch] = useState("");
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [feedback, setFeedback] = useState(null); 

  const [formData, setFormData] = useState({
    contactName: '', contactEmail: '', contactPhone: '', contactJob: '',
    cnpj: '', name: '', cep: '', street: '', number: '', district: '', city: '', state: '',
    localEmail: '', localPhone: '', localWhatsapp: '',
    description: '', videoUrl: '', images: ['', '', '', '', '', ''],
    priceAdult: '', priceChild: '', petFee: '',
    adultAgeStart: '12', childAgeStart: '2', childAgeEnd: '11',
    gratuitousness: '',
    petAllowed: false, petSize: 'Pequeno porte',
    availableDays: [0, 6], 
    notIncludedItems: '', usageRules: '', cancellationPolicy: '', observations: ''
  });

  useEffect(() => {
     const unsub = onAuthStateChanged(auth, async u => {
        if(u) {
           setUser(u);
           // Se for novo cadastro, preenche dados do usuário
           if (!id) setFormData(prev => ({ ...prev, contactName: u.displayName || '', contactEmail: u.email }));
        } else navigate('/');
     });

     if (id) {
        getDoc(doc(db, "dayuses", id)).then(s => { 
            if(s.exists()) {
                const d = s.data();
                
                // CORREÇÃO: Garante que arrays essenciais existam, mesmo se faltarem no banco (importação)
                const safeData = {
                    ...d,
                    availableDays: d.availableDays || [0, 6], // Padrão: Dom e Sab se vazio
                    images: d.images || ['', '', '', '', '', ''], // Garante array de imagens
                    priceAdult: d.priceAdult || '',
                    priceChild: d.priceChild || '',
                    petFee: d.petFee || ''
                };

                setFormData(safeData);

                // Carrega states auxiliares com segurança
                if(d.coupons) setCoupons(d.coupons);
                if(d.dailyStock) setDailyStock(d.dailyStock || { adults: 50, children: 20, pets: 5 });
                if(d.weeklyPrices) setWeeklyPrices(d.weeklyPrices);
                
                // Garante array vazio se não existir
                setSelectedAmenities(d.amenities || []);
                setSelectedMeals(d.meals || []);
                setBlockedDates(d.blockedDates || []);
                
                if(d.specialTickets) setSpecialTickets(d.specialTickets);
                if(d.trackFreeChildren) setTrackFreeChildren(d.trackFreeChildren);
            }
        });
     }
     return unsub;
  }, [id]);

  // CORREÇÃO CEP: Campos destravados (removido readOnly lógico se falhar)
  const handleCepBlur = async () => { 
      if (formData.cep?.replace(/\D/g, '').length === 8) { 
          setCepLoading(true); 
          try { 
              const response = await fetch(`https://viacep.com.br/ws/${formData.cep}/json/`); 
              const data = await response.json(); 
              if (!data.erro) setFormData(prev => ({ ...prev, street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf })); 
          } catch (error) { 
              console.error("Erro CEP:", error); 
          } finally { 
              setCepLoading(false); 
          } 
      } 
  };
  
  const handleCnpjChange = (e) => { const val = e.target.value; setFormData({...formData, cnpj: val}); const nums = val.replace(/\D/g, ''); if (nums.length > 0 && nums.length !== 14) setCnpjError(true); else setCnpjError(false); };
  
  const handleImageChange = (index, value) => { const newImages = [...formData.images]; newImages[index] = value; setFormData({...formData, images: newImages}); };
  
  const handleFileUpload = (index, e) => { 
      const file = e.target.files[0]; 
      if (file) { 
          if (file.size > 800 * 1024) { setFeedback({type: 'error', title: 'Imagem Grande', msg: 'Máximo 800KB.'}); return; } 
          const reader = new FileReader(); 
          reader.readAsDataURL(file); 
          reader.onload = (event) => { 
              const img = new Image(); 
              img.src = event.target.result; 
              img.onload = () => { 
                  const canvas = document.createElement('canvas'); 
                  const MAX_WIDTH = 800; 
                  const scaleSize = MAX_WIDTH / img.width; 
                  if (scaleSize < 1) { canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; } 
                  else { canvas.width = img.width; canvas.height = img.height; } 
                  const ctx = canvas.getContext('2d'); 
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
                  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); 
                  const newImages = [...formData.images]; 
                  newImages[index] = compressedDataUrl; 
                  setFormData({ ...formData, images: newImages }); 
              }; 
          }; 
      } 
  };
  const removeImage = (index) => { const newImages = [...formData.images]; newImages[index] = ''; setFormData({ ...formData, images: newImages }); };

  const toggleDay = (dayIndex) => { const newDays = formData.availableDays.includes(dayIndex) ? formData.availableDays.filter(d => d !== dayIndex) : [...formData.availableDays, dayIndex]; setFormData({...formData, availableDays: newDays}); };
  const toggleBlockedDate = (dateStr) => { if (blockedDates.includes(dateStr)) setBlockedDates(blockedDates.filter(d => d !== dateStr)); else setBlockedDates([...blockedDates, dateStr]); };
  
  const renderManagementCalendar = () => {
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-10"></div>);
      for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          const dateStr = date.toISOString().split('T')[0];
          const isBlocked = blockedDates.includes(dateStr);
          const dayOfWeek = date.getDay();
          const isStandardOpen = formData.availableDays.includes(dayOfWeek);
          const isOpen = isStandardOpen && !isBlocked;
          days.push(<div key={d} onClick={() => toggleBlockedDate(dateStr)} className={`h-10 w-full rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer transition-all border ${isBlocked ? 'bg-red-100 text-red-600 border-red-200' : isOpen ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-50 text-slate-300'}`} title={isBlocked ? "Bloqueado" : isOpen ? "Aberto" : "Fechado"}>{d}</div>);
      }
      return days;
  };

  const handleWeeklyPriceChange = (dayIndex, field, value) => { setWeeklyPrices(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], [field]: value } })); };
  
  const toggleAmenity = (item) => { if (selectedAmenities.includes(item)) setSelectedAmenities(selectedAmenities.filter(i => i !== item)); else setSelectedAmenities([...selectedAmenities, item]); };
  const toggleMeal = (item) => { if (selectedMeals.includes(item)) setSelectedMeals(selectedMeals.filter(i => i !== item)); else setSelectedMeals([...selectedMeals, item]); };

  const addCoupon = () => { if(newCouponCode && newCouponPerc) { setCoupons([...coupons, { code: newCouponCode.toUpperCase(), percentage: Number(newCouponPerc) }]); setNewCouponCode(''); setNewCouponPerc(''); } };
  const removeCoupon = (idx) => { const newC = [...coupons]; newC.splice(idx, 1); setCoupons(newC); };

  // Funções para Ingressos Especiais
  const addSpecialTicket = () => {
      if (newTicketName && newTicketPrice) {
          setSpecialTickets([...specialTickets, { name: newTicketName, price: Number(newTicketPrice) }]);
          setNewTicketName(''); setNewTicketPrice('');
      }
  };
  const removeSpecialTicket = (idx) => { const newT = [...specialTickets]; newT.splice(idx, 1); setSpecialTickets(newT); };

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    if (!validateCNPJ(formData.cnpj)) { alert("CNPJ inválido."); return; }
    if (!formData.localWhatsapp) { alert("O WhatsApp do local é obrigatório."); return; }
    
    setLoading(true);

    const imageFields = {};
    formData.images.forEach((img, index) => {
        if (index === 0) imageFields.image = img; 
        else imageFields[`image${index + 1}`] = img; 
    });

    const dataToSave = { 
        ...formData, ...imageFields, ownerId: user.uid, 
        coupons, dailyStock, weeklyPrices, blockedDates, 
        amenities: selectedAmenities, meals: selectedMeals,         
        specialTickets, // Salva os itens extras
        trackFreeChildren, // Salva config de gratuidade
        priceAdult: Number(formData.priceAdult), 
        slug: generateSlug(formData.name), 
        updatedAt: new Date() 
    };
    
    try { 
        if (id) await updateDoc(doc(db, "dayuses", id), dataToSave);
        else await addDoc(collection(db, "dayuses"), { ...dataToSave, createdAt: new Date() });
        navigate('/partner'); 
    } catch (err) { console.error(err); alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
     <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 text-center text-slate-900">{id ? 'Editar Anúncio' : 'Cadastrar Novo Day Use'}</h1>
        
        {/* Modal de Feedback */}
        {feedback && createPortal(<ModalOverlay onClose={() => setFeedback(null)}><div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"><h2 className="text-2xl font-bold mb-2">{feedback.title}</h2><p className="mb-4">{feedback.msg}</p><Button onClick={() => setFeedback(null)} className="w-full justify-center">OK</Button></div></ModalOverlay>, document.body)}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-8">
           
           {/* 1. DADOS PESSOAIS */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">1. Dados do Responsável</h3></div>
              <div className="grid grid-cols-2 gap-4">
                 <input 
                    className="w-full border p-3 rounded-xl" 
                    value={formData.contactName} 
                    onChange={e=>setFormData({...formData, contactName: e.target.value})} 
                    placeholder="Nome Completo" 
                 />
                 <input className="w-full border p-3 rounded-xl bg-slate-50" value={formData.contactEmail} readOnly />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <input className="w-full border p-3 rounded-xl" placeholder="Telefone Pessoal" value={formData.contactPhone} onChange={e=>setFormData({...formData, contactPhone: e.target.value})} required/>
                 <select className="w-full border p-3 rounded-xl bg-white" value={formData.contactJob} onChange={e=>setFormData({...formData, contactJob: e.target.value})} required><option value="">Cargo...</option><option>Sócio/Proprietário</option><option>Gerente</option><option>Outros</option></select>
              </div>
           </div>
           
           {/* 2. DADOS DA EMPRESA */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">2. Dados do Local</h3></div>
              <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-500">CNPJ</label><input className={`w-full border p-3 rounded-xl ${cnpjError ? 'bg-red-50' : ''}`} value={formData.cnpj} onChange={handleCnpjChange} required/></div>
                  <div><label className="text-xs font-bold text-slate-500">Nome Fantasia</label><input className="w-full border p-3 rounded-xl" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required/></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="grid md:grid-cols-3 gap-4">
                      <input className="w-full border p-2 rounded-lg" placeholder="WhatsApp (Obrigatório)" value={formData.localWhatsapp} onChange={e=>setFormData({...formData, localWhatsapp: e.target.value})} required/>
                      <input className="w-full border p-2 rounded-lg" placeholder="Telefone Fixo" value={formData.localPhone} onChange={e=>setFormData({...formData, localPhone: e.target.value})} />
                      <input className="w-full border p-2 rounded-lg" placeholder="E-mail de Suporte" value={formData.localEmail} onChange={e=>setFormData({...formData, localEmail: e.target.value})} />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <input className="w-full border p-3 rounded-xl" placeholder="CEP" value={formData.cep} onChange={e=>setFormData({...formData, cep: e.target.value})} onBlur={handleCepBlur} required/>
                  <input className="w-full border p-3 rounded-xl" placeholder="Número" value={formData.number} onChange={e=>setFormData({...formData, number: e.target.value})} required/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <input className="w-full border p-3 rounded-xl" value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} placeholder="Cidade"/>
                  <input className="w-full border p-3 rounded-xl" value={formData.state} onChange={e=>setFormData({...formData, state: e.target.value})} placeholder="UF"/>
              </div>
              <input className="w-full border p-3 rounded-xl" placeholder="Logradouro" value={formData.street} onChange={e=>setFormData({...formData, street: e.target.value})} required/>
           </div>

           {/* 3. SOBRE */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">3. Sobre a Experiência</h3></div>
              <textarea className="w-full border p-3 rounded-xl h-32" placeholder="Descrição completa..." value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} required/>
              <input className="w-full border p-3 rounded-xl" placeholder="Link do YouTube (Op)" value={formData.videoUrl} onChange={e=>setFormData({...formData, videoUrl: e.target.value})} />
              
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">Galeria de Fotos</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((img, i) => (
                        <div key={i} className="relative aspect-video bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0097A8] flex items-center justify-center overflow-hidden group">
                            {img ? (
                                <><img src={img} className="w-full h-full object-cover" /><button type="button" onClick={() => removeImage(i)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center"><Trash2/></button></>
                            ) : (
                                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-[#0097A8]"><ImageIcon size={24}/><input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(i, e)} /></label>
                            )}
                        </div>
                    ))}
                  </div>
              </div>
           </div>
           
           {/* 4. FUNCIONAMENTO E PREÇOS (ATUALIZADO) */}
           <div className="space-y-6">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">4. Funcionamento e Valores</h3></div>

              {/* Tabela de Preços por Dia + HORÁRIOS */}
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100"><tr><th className="px-4 py-3">Dia</th><th className="px-4 py-3">Horário</th><th className="px-4 py-3">Adulto (R$)</th><th className="px-4 py-3">Criança (R$)</th><th className="px-4 py-3">Pet (R$)</th></tr></thead>
                    <tbody>
                        {weekDays.map((day, index) => {
                            const isActive = formData.availableDays.includes(index);
                            return (
                                <tr key={index} className={`border-b ${isActive ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
                                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={() => toggleDay(index)} className="accent-[#0097A8] w-4 h-4"/>{day}</td>
                                    {/* NOVO CAMPO: Horário */}
                                    <td className="px-4 py-2"><input disabled={!isActive} className="border p-2 rounded w-24 text-xs" placeholder="09:00 - 18:00" value={weeklyPrices[index]?.hours || ''} onChange={(e) => handleWeeklyPriceChange(index, 'hours', e.target.value)}/></td>
                                    <td className="px-4 py-2"><input disabled={!isActive} className="border p-2 rounded w-20" placeholder="Padrão" type="number" value={weeklyPrices[index]?.adult || ''} onChange={(e) => handleWeeklyPriceChange(index, 'adult', e.target.value)}/></td>
                                    <td className="px-4 py-2"><input disabled={!isActive} className="border p-2 rounded w-20" placeholder="Padrão" type="number" value={weeklyPrices[index]?.child || ''} onChange={(e) => handleWeeklyPriceChange(index, 'child', e.target.value)}/></td>
                                    <td className="px-4 py-2"><input disabled={!isActive} className="border p-2 rounded w-20" placeholder="Padrão" type="number" value={weeklyPrices[index]?.pet || ''} onChange={(e) => handleWeeklyPriceChange(index, 'pet', e.target.value)}/></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
              </div>

              {/* Calendário de Gestão (Mantido) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4"><h4 className="font-bold text-slate-700 text-sm">Gerenciar Datas Específicas</h4><div className="flex gap-2"><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth()-1)))} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={16}/></button><span className="text-sm font-bold capitalize">{calendarMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth()+1)))} className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={16}/></button></div></div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-bold text-slate-400">{["D","S","T","Q","Q","S","S"].map(d=><span>{d}</span>)}</div>
                  <div className="grid grid-cols-7 gap-1">{renderManagementCalendar()}</div>
                  <div className="flex gap-4 mt-2 text-xs justify-center"><span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div> Aberto</span><span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div> Bloqueado</span><span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-50 border border-slate-200 rounded"></div> Fechado (Padrão)</span></div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <p className="text-sm font-bold text-slate-700 mb-2">Preços Base</p>
                 <div className="grid grid-cols-3 gap-4">
                    <input className="border p-3 rounded-xl w-full" type="number" placeholder="Adulto Base (R$)" value={formData.priceAdult} onChange={e=>setFormData({...formData, priceAdult: e.target.value})} required/>
                    <input className="border p-3 rounded-xl w-full" type="number" placeholder="Criança Base (R$)" value={formData.priceChild} onChange={e=>setFormData({...formData, priceChild: e.target.value})}/>
                    <input className="border p-3 rounded-xl w-full" type="number" placeholder="Pet Base (R$)" value={formData.petFee} onChange={e=>setFormData({...formData, petFee: e.target.value})}/>
                 </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className="text-sm font-bold text-slate-700 block mb-2">Capacidade Diária (Preenchimento Obrigatório)</label>
                 <div className="flex gap-4">
                    <div className="w-full"><span className="text-xs text-slate-500">Max. Adultos</span><input className="border p-2 rounded w-full" type="number" value={dailyStock.adults} onChange={e=>setDailyStock({...dailyStock, adults: e.target.value})}/></div>
                    <div className="w-full"><span className="text-xs text-slate-500">Max. Crianças</span><input className="border p-2 rounded w-full" type="number" value={dailyStock.children} onChange={e=>setDailyStock({...dailyStock, children: e.target.value})}/></div>
                    <div className="w-full"><span className="text-xs text-slate-500">Max. Pets</span><input className="border p-2 rounded w-full" type="number" value={dailyStock.pets} onChange={e=>setDailyStock({...dailyStock, pets: e.target.value})}/></div>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Regras de Idade</label>
                      <div className="flex items-center gap-2"><span className="text-sm text-slate-600">Adulto:</span><input className="border p-2 rounded w-16 text-center" type="number" value={formData.adultAgeStart} onChange={e=>setFormData({...formData, adultAgeStart: e.target.value})} /><span className="text-sm text-slate-600">anos</span></div>
                      <div className="flex items-center gap-2"><span className="text-sm text-slate-600">Criança:</span><input className="border p-2 rounded w-16 text-center" type="number" value={formData.childAgeStart} onChange={e=>setFormData({...formData, childAgeStart: e.target.value})} /><span className="text-sm text-slate-600">a</span><input className="border p-2 rounded w-16 text-center" type="number" value={formData.childAgeEnd} onChange={e=>setFormData({...formData, childAgeEnd: e.target.value})} /><span className="text-sm text-slate-600">anos</span></div>
                  </div>
                  <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Pets e Gratuidade</label>
                      <div><select className="border p-2 rounded w-full bg-white" value={formData.petSize} onChange={e=>setFormData({...formData, petSize: e.target.value})}><option>Não aceita</option><option>Pequeno</option><option>Médio</option><option>Grande</option><option>Todos os portes</option></select></div>
                      <div><input className="border p-2 rounded w-full" placeholder="Política de Gratuidade" value={formData.gratuitousness} onChange={e=>setFormData({...formData, gratuitousness: e.target.value})}/></div>
                      
                      {/* NOVO CHECKBOX: CONTROLE DE GRATUIDADE */}
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer border p-2 rounded bg-white">
                          <input type="checkbox" checked={trackFreeChildren} onChange={e=>setTrackFreeChildren(e.target.checked)} className="accent-[#0097A8]"/>
                          Contabilizar crianças gratuitas no estoque?
                      </label>
                  </div>
              </div>
              
              {/* NOVA SEÇÃO: PRODUTOS E INGRESSOS ESPECIAIS */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                 <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-blue-900">Ingressos Especiais & Produtos (Lotes, Estacionamento, Combos)</label><Ticket size={16} className="text-blue-600"/></div>
                 <div className="flex gap-2 mb-2 flex-wrap">
                    <input className="border p-2 rounded-lg flex-1 text-sm min-w-[120px]" placeholder="Nome (Ex: Estacionamento)" value={newTicketName} onChange={e=>setNewTicketName(e.target.value)} />
                    <input className="border p-2 rounded-lg w-24 text-sm" placeholder="R$" type="number" value={newTicketPrice} onChange={e=>setNewTicketPrice(e.target.value)} />
                    <Button onClick={addSpecialTicket} className="py-2 px-4 text-xs bg-blue-600 border-none">Add</Button>
                 </div>
                 <div className="space-y-1">
                    {specialTickets.map((t, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-blue-200 text-sm">
                            <span className="font-bold text-slate-700">{t.name} <span className="text-blue-600">({formatBRL(t.price)})</span></span>
                            <button type="button" onClick={()=>removeSpecialTicket(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    ))}
                 </div>
              </div>

              {/* CUPONS (Mantido) */}
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mt-4">
                 <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-yellow-800">Criar Cupons</label><Tag size={16} className="text-yellow-600"/></div>
                 <div className="flex gap-2 mb-2"><input className="border p-2 rounded-lg flex-1 text-sm uppercase" placeholder="CÓDIGO" value={newCouponCode} onChange={e=>setNewCouponCode(e.target.value)} /><input className="border p-2 rounded-lg w-24 text-sm" placeholder="%" type="number" value={newCouponPerc} onChange={e=>setNewCouponPerc(e.target.value)} /><Button onClick={addCoupon} className="py-2 px-4 text-xs bg-yellow-600 border-none">Add</Button></div>
                 <div className="space-y-1">{coupons.map((c, i) => (<div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-yellow-200 text-sm"><span className="font-bold text-slate-700">{c.code} <span className="text-green-600">({c.percentage}% OFF)</span></span><button type="button" onClick={()=>removeCoupon(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div>))}</div>
              </div>
           </div>

           {/* 5. INCLUSÕES E REGRAS (CHECKLISTS COM BUSCA) */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">5. O que está incluso?</h3></div>

              {/* COMODIDADES COM BUSCA */}
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">Comodidades e Lazer</label>
                  
                  <div className="relative mb-2">
                     <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                     <input className="w-full border p-2 pl-9 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors" placeholder="Buscar comodidade..." value={amenitySearch} onChange={e=>setAmenitySearch(e.target.value)}/>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 h-60 overflow-y-auto custom-scrollbar">
                      {AMENITIES_LIST
                        .filter(a => a.toLowerCase().includes(amenitySearch.toLowerCase()))
                        .map(a => (
                          <label key={a} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8]">
                              <input type="checkbox" checked={selectedAmenities.includes(a)} onChange={()=>toggleAmenity(a)} className="accent-[#0097A8] w-4 h-4 rounded"/>{a}
                          </label>
                      ))}
                      {AMENITIES_LIST.filter(a => a.toLowerCase().includes(amenitySearch.toLowerCase())).length === 0 && (
                          <p className="text-xs text-slate-400 col-span-full text-center py-4">Nenhuma comodidade encontrada.</p>
                      )}
                  </div>
              </div>

              {/* PENSÃO */}
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">Alimentação (Pensão)</label>
                  <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {MEALS_LIST.map(m => (
                          <label key={m} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8]">
                              <input type="checkbox" checked={selectedMeals.includes(m)} onChange={()=>toggleMeal(m)} className="accent-[#0097A8] w-4 h-4 rounded"/>{m}
                          </label>
                      ))}
                  </div>
              </div>

              <div>
                  <label className="text-sm font-bold text-red-600 block mb-1">O que NÃO está incluso?</label>
                  <textarea className="w-full border p-3 rounded-xl h-20 bg-red-50/30" placeholder="Ex: Bebidas alcoólicas, Toalhas..." value={formData.notIncludedItems} onChange={e=>setFormData({...formData, notIncludedItems: e.target.value})}/>
              </div>

              {/* CAMPOS SEPARADOS */}
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Regras de Utilização</label>
                  <textarea className="w-full border p-3 rounded-xl h-24" placeholder="Ex: Proibido som automotivo, horário de silêncio..." value={formData.usageRules} onChange={e=>setFormData({...formData, usageRules: e.target.value})}/>
              </div>
              
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Política de Cancelamento</label>
                  <textarea className="w-full border p-3 rounded-xl h-24" placeholder="Ex: Cancelamento grátis até 24h antes. Após isso, multa de 50%..." value={formData.cancellationPolicy} onChange={e=>setFormData({...formData, cancellationPolicy: e.target.value})}/>
              </div>
              
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Observações Gerais</label>
                  <textarea className="w-full border p-3 rounded-xl h-20" placeholder="Outras informações importantes..." value={formData.observations} onChange={e=>setFormData({...formData, observations: e.target.value})}/>
              </div>
           </div>
           
           <div className="pt-4 border-t">
               <Button type="submit" className="w-full py-4 text-lg shadow-xl" disabled={loading}>{loading ? "Salvando..." : "Finalizar e Publicar"}</Button>
           </div>
        </form>
     </div>
  );
};

// --- PAGINAS AUXILIARES ---
const PartnerRegisterPage = () => { const navigate = useNavigate(); return <LoginModal isOpen={true} onClose={()=>navigate('/')} initialRole="partner" hideRoleSelection={true} closeOnSuccess={false} onSuccess={(u)=>navigate(u ? '/partner/new' : '/')} initialMode="register" customTitle="Criar conta" customSubtitle=" " />; };

// ... (cookie consent)

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verifica se já aceitou anteriormente
    const consent = localStorage.getItem('mapadodayuse_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = async () => {
    setIsVisible(false);
    localStorage.setItem('mapadodayuse_consent', 'true'); // Salva no navegador para não mostrar de novo
    
    // REGISTRO DE AUDITORIA: Salva o aceite no Firebase para segurança jurídica
    try {
      await addDoc(collection(db, "consents"), {
        acceptedAt: new Date(),
        userAgent: navigator.userAgent, // Identifica o dispositivo/navegador
        screenSize: `${window.screen.width}x${window.screen.height}`,
        type: 'cookie_policy_accepted'
      });
    } catch (e) {
      console.error("Erro ao registrar consentimento:", e);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[90%] md:w-96 bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 z-[10000] animate-fade-in flex flex-col gap-4">
       <div className="flex items-start gap-3">
          <Info className="text-[#0097A8] shrink-0 mt-1" size={20} />
          <p className="text-xs text-slate-600 leading-relaxed">
            Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa <span className="text-[#0097A8] font-bold cursor-pointer hover:underline" onClick={()=>window.location.href='/politica-de-privacidade'}>Política de Privacidade</span> e <span className="text-[#0097A8] font-bold cursor-pointer hover:underline" onClick={()=>window.location.href='/termos-de-uso'}>Termos de Uso</span>.
          </p>
       </div>
       <div className="flex gap-2">
          <Button className="w-full py-2 text-xs h-9" onClick={handleAccept}>Concordar e Continuar</Button>
       </div>
    </div>
  );
};

const PrivacyPage = () => (
  <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in text-slate-700">
    <h1 className="text-3xl font-bold mb-6 text-slate-900">Política de Privacidade</h1>
    <div className="space-y-4 text-sm leading-relaxed bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <p><strong>Última atualização: Dezembro de 2025</strong></p>
      <p>A sua privacidade é importante para o <strong>Mapa do Day Use</strong>. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais ao utilizar nossa plataforma de marketplace para reservas de Day Use.</p>
      
      <h2 className="text-xl font-bold text-slate-900 mt-6">1. Coleta de Dados</h2>
      <p>Coletamos informações que você nos fornece diretamente, como:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Dados de Identificação: Nome completo, CPF, e-mail e telefone/WhatsApp.</li>
        <li>Dados de Pagamento: Informações transacionais processadas de forma segura via Mercado Pago (não armazenamos dados completos de cartão de crédito em nossos servidores).</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 mt-6">2. Uso das Informações</h2>
      <p>Utilizamos seus dados para:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Processar e confirmar suas reservas de Day Use.</li>
        <li>Enviar vouchers e notificações sobre o status do seu pedido.</li>
        <li>Facilitar a comunicação entre você e o estabelecimento parceiro.</li>
        <li>Melhorar nossos serviços, suporte ao cliente e prevenir fraudes.</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 mt-6">3. Compartilhamento de Dados</h2>
      <p>Seus dados pessoais (Nome, CPF e detalhes da reserva) são compartilhados com o <strong>Estabelecimento Parceiro</strong> onde você efetuou a reserva, exclusivamente para fins de identificação e liberação de acesso na portaria.</p>

      <h2 className="text-xl font-bold text-slate-900 mt-6">4. Segurança</h2>
      <p>Adotamos medidas de segurança técnicas e administrativas para proteger seus dados. Os pagamentos são processados em ambiente criptografado pelo Mercado Pago.</p>

      <h2 className="text-xl font-bold text-slate-900 mt-6">5. Contato</h2>
      <p>Para dúvidas sobre seus dados ou para exercer seus direitos de privacidade, entre em contato pelo e-mail: <strong>contato@mapadodayuse.com</strong>.</p>
    </div>
  </div>
);

const TermsPage = () => (
  <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in text-slate-700">
    <h1 className="text-3xl font-bold mb-6 text-slate-900">Termos de Uso</h1>
    <div className="space-y-4 text-sm leading-relaxed bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <p><strong>Bem-vindo ao Mapa do Day Use!</strong> Ao utilizar nossa plataforma, você concorda com os seguintes termos e condições.</p>
      
      <h2 className="text-xl font-bold text-slate-900 mt-6">1. Natureza do Serviço</h2>
      <p>O Mapa do Day Use é uma plataforma de <strong>intermediação</strong> que conecta viajantes a hotéis, pousadas e resorts que oferecem serviços de Day Use. Nós não somos proprietários, nem administramos os estabelecimentos listados.</p>

      <h2 className="text-xl font-bold text-slate-900 mt-6">2. Responsabilidades</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Da Plataforma:</strong> Garantir o funcionamento do sistema de reservas, processamento seguro de pagamentos e emissão de vouchers.</li>
        <li><strong>Do Parceiro (Estabelecimento):</strong> Prestar o serviço de Day Use conforme descrito no anúncio, garantir a disponibilidade, segurança e a qualidade das instalações.</li>
        <li><strong>Do Usuário:</strong> Fornecer dados verdadeiros, respeitar as regras internas de cada estabelecimento e comparecer na data agendada.</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 mt-6">3. Pagamentos e Tarifas</h2>
      <p>Os pagamentos são realizados via Mercado Pago (Pix ou Cartão). O valor total pago inclui o serviço do parceiro e a taxa de serviço da plataforma. A confirmação da reserva está sujeita à aprovação do pagamento.</p>

      <h2 className="text-xl font-bold text-slate-900 mt-6">4. Cancelamento e Reembolso</h2>
      <p>Cada estabelecimento possui sua própria política de cancelamento, descrita na página do anúncio. Em geral:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Solicitações dentro do prazo legal de 7 dias (CDC) e com antecedência mínima da data de utilização podem ser reembolsadas.</li>
        <li>Cancelamentos fora do prazo ou não comparecimento (No-Show) estão sujeitos às regras definidas pelo Parceiro, podendo não haver reembolso.</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 mt-6">5. Alterações nos Termos</h2>
      <p>Reservamo-nos o direito de alterar estes termos a qualquer momento para refletir mudanças na legislação ou em nossos serviços. O uso contínuo da plataforma implica na aceitação das novas condições.</p>
    </div>
  </div>
);

// --- ESTRUTURA PRINCIPAL ---// ...

const Layout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [logoError, setLogoError] = useState(false); 
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Listener em Tempo Real (Atualizado para pegar a Foto do Firestore)
  useEffect(() => {
    let unsubscribeDoc = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
       if(u) {
          // Ouve mudanças no perfil em tempo real
          unsubscribeDoc = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
             if (docSnap.exists()) {
                 const userData = docSnap.data();
                 setUser({ 
                     ...u, 
                     role: userData.role || 'user',
                     // Prioriza a foto salva no Banco (Base64), senão usa a do Auth Google
                     photoURL: userData.photoURL || u.photoURL
                 });
             } else {
                 // Fallback se o documento não existir ainda
                 setUser({ ...u, role: 'user' });
             }
          });
       } else {
          setUser(null);
          if(unsubscribeDoc) unsubscribeDoc();
       }
    });

    return () => {
       unsubscribeAuth();
       if(unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  // Efeito do Favicon
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) {
        link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%230097A8%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polygon points=%223 6 9 3 15 6 21 3 21 21 15 18 9 21 3 18 3 6%22/><line x1=%229%22 x2=%229%22 y1=%223%22 y2=%2221%22/><line x1=%2215%22 x2=%2215%22 y1=%226%22 y2=%2224%22/></svg>';
    }
  }, []);

  const handleLogout = async () => {
     await signOut(auth);
     navigate('/');
  };

  const handleLoginSuccess = (userWithRole) => {
     setShowLogin(false);
     if (userWithRole.role === 'partner') navigate('/partner');
     else if (userWithRole.role === 'staff') navigate('/portaria');
     else navigate('/minhas-viagens');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <GlobalStyles />
      <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={handleLoginSuccess} />
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
           {/* LOGO */}
           <div className="flex items-center gap-2 cursor-pointer" onClick={()=>navigate('/')}>
              {!logoError ? (
                 <img 
                    src="/logo.svg?v=2" 
                    alt="Mapa do Day Use" 
                    className="h-10 w-auto object-contain" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; setLogoError(true); }} 
                 />
              ) : (
                 <MapIcon className="h-8 w-8 text-[#0097A8]" />
              )}
           </div>
           
           <div className="flex items-center gap-2 md:gap-4">
              {!user ? (
                 <>
                   <button onClick={()=>{navigate('/partner-register')}} className="text-xs md:text-sm font-bold text-slate-500 hover:text-[#0097A8] mr-2">Seja parceiro</button>
                   <Button variant="ghost" onClick={()=>setShowLogin(true)} className="font-bold px-3 md:px-4">Entrar</Button>
                 </>
              ) : (
                 <div className="flex gap-2 md:gap-4 items-center">
                    {/* Botões de Navegação */}
                    {user.role === 'partner' && <Button variant="ghost" onClick={()=>navigate('/partner')} className="px-2 md:px-4 text-xs md:text-sm">Painel</Button>}
                    {user.role === 'staff' && <Button variant="ghost" onClick={()=>navigate('/portaria')} className="px-2 md:px-4 text-xs md:text-sm">Portaria</Button>}
                    {user.role !== 'partner' && user.role !== 'staff' && (
                        <Button variant="ghost" onClick={()=>navigate('/minhas-viagens')} className="hidden md:flex">Meus Ingressos</Button>
                    )}

                    {/* FOTO DO USUÁRIO NO HEADER */}
                    <div 
                        className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center font-bold text-[#0097A8] border-2 border-white shadow-sm hover:scale-105 transition-transform cursor-pointer overflow-hidden" 
                        title={user.email}
                        onClick={()=>navigate('/profile')}
                    >
                        {user.photoURL ? (
                            <img src={user.photoURL} className="w-full h-full object-cover" alt="Perfil" />
                        ) : (
                            user.email ? user.email[0].toUpperCase() : <User size={20}/>
                        )}
                    </div>
                    
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50" title="Sair"><LogOut size={20}/></button>
                 </div>
              )}
           </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>
      
      {/* Footer Atualizado */}
      <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
         <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
               <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={()=>navigate('/')}>
                     {!logoError ? (<img src="/logo.svg?v=2" alt="Mapa" className="h-8 w-auto object-contain" onError={() => setLogoError(true)} />) : (<MapIcon className="h-6 w-6 text-[#0097A8]" />)}
                  </div>
                  <p className="text-slate-500 text-sm mb-6 max-w-sm leading-relaxed">A plataforma completa para descobrir e reservar experiências incríveis.</p>
                  <a href="mailto:contato@mapadodayuse.com" className="flex items-center gap-2 text-slate-600 hover:text-[#0097A8] transition-colors font-medium text-sm"><Mail size={16} /> contato@mapadodayuse.com</a>
               </div>
               
               <div>
                  <h4 className="font-bold text-slate-900 mb-4">Institucional</h4>
                  <ul className="space-y-3 text-sm text-slate-500">
                     <li><button onClick={() => navigate('/')} className="hover:text-[#0097A8] transition-colors">Início</button></li>
                     <li><button onClick={() => navigate('/sobre-nos')} className="hover:text-[#0097A8] transition-colors">Sobre Nós</button></li>
                     <li><button onClick={() => navigate('/contato')} className="hover:text-[#0097A8] transition-colors">Fale Conosco</button></li>
                     <li><button onClick={() => navigate('/mapa-do-site')} className="hover:text-[#0097A8] transition-colors">Mapa do Site</button></li>
                  </ul>
               </div>

               <div>
                   <h4 className="font-bold text-slate-900 mb-4">Explore</h4>
                   <ul className="space-y-3 text-sm text-slate-500 mb-6">
                      <li><button onClick={() => navigate('/day-use')} className="hover:text-[#0097A8] transition-colors">Blog / Dicas</button></li>
                      <li><button onClick={() => navigate('/politica-de-privacidade')} className="hover:text-[#0097A8] transition-colors">Política de Privacidade</button></li>
                      <li><button onClick={() => navigate('/termos-de-uso')} className="hover:text-[#0097A8] transition-colors">Termos de Uso</button></li>
                   </ul>
                   <button onClick={() => navigate('/seja-parceiro')} className="bg-[#0097A8] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#007F8F] transition-colors shadow-lg shadow-teal-100 transform hover:scale-105">
                       Seja um Parceiro
                   </button>
               </div>
            </div>
            <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
               <p>© 2026 Belo Horizonte, MG. Todos os direitos reservados.</p>
               <p className="flex items-center gap-1">Feito com carinho por <a href="https://instagram.com/iurifrancast" target="_blank" className="font-bold text-slate-600 hover:text-[#0097A8]">Iuri França</a></p>
            </div>
         </div>
      </footer>
      <CookieConsent />
    </div>
  );
};

const DayUseCard = ({ item, onClick }) => {
  const hasDiscount = item.coupons && item.coupons.length > 0;
  const maxDiscount = hasDiscount ? Math.max(...item.coupons.map(c => c.percentage)) : 0;

  // Função para substituir imagem quebrada por um placeholder bonito
  const handleImageError = (e) => {
      e.target.src = "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80"; 
  };

  return (
     <div 
        onClick={onClick} 
        className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden border border-slate-100 group flex flex-col h-full relative"
     >
        <div className="h-64 relative overflow-hidden">
            <img 
                src={item.image} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                onError={handleImageError} // <--- Proteção contra erro de imagem
                alt={item.name}
            />
            
            {hasDiscount && (
              <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                 <Tag size={12} className="fill-current"/> {maxDiscount}% OFF
              </div>
            )}
        </div>
        <div className="p-6 flex flex-col flex-1">
           <div className="mb-4">
               <h3 className="font-bold text-xl text-slate-900 leading-tight mb-1">{item.name}</h3>
               <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14} className="text-[#0097A8]"/> {item.city || 'Localização'}, {item.state}</p>
           </div>
           <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
               <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">A partir de</p>
                   <p className="text-2xl font-bold text-[#0097A8]">{formatBRL(item.priceAdult)}</p>
               </div>
               <span className="text-sm font-semibold text-[#0097A8] bg-cyan-50 px-4 py-2 rounded-xl group-hover:bg-[#0097A8] group-hover:text-white transition-all">
                   Reservar
               </span>
           </div>
        </div>
     </div>
  );
};

const ListingPage = ({ stateParam, cityParam }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filtros
  const [maxPrice, setMaxPrice] = useState("");
  const [filterCity, setFilterCity] = useState(cityParam || "");
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedPets, setSelectedPets] = useState([]);

  // SEO
  const stateName = STATE_NAMES[stateParam?.toUpperCase()] || stateParam?.toUpperCase();
  const cityNameFormatted = cityParam 
    ? cityParam.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
    : null;
  
  const locationTitle = cityNameFormatted ? cityNameFormatted : `${stateName}`;

  const seoTitle = `Os Melhores Day Uses de ${locationTitle} | ${filteredItems.length} Locais Disponíveis!`;

  const seoDesc = `Encontre os melhores day uses em ${locationTitle}. Day Uses com ${AMENITIES_LIST[0]}, ${MEALS_LIST[0]}, ${MEALS_LIST[1]} e ${AMENITIES_LIST[5]}. Compre seu ingresso aqui!`;

  useSEO(seoTitle, seoDesc);

  // Fetch com tratamento de erro e Finally para garantir fim do loading
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        // Busca todos os anúncios do banco
        const q = query(collection(db, "dayuses"));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        // Filtra apenas os itens do estado atual (stateParam)
        // Usa o helper getStateSlug para garantir compatibilidade (ex: "Minas Gerais" -> "mg")
        const stateItems = data.filter(i => getStateSlug(i.state) === stateParam?.toLowerCase());
        
        setItems(stateItems);
      } catch (error) {
        console.error("Erro ao carregar listagem:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [stateParam]);

  // Atualiza filtro de cidade se a URL mudar (sem refetch)
  useEffect(() => {
      if(cityParam) setFilterCity(cityParam);
      else setFilterCity("");
  }, [cityParam]);

  // Lógica de Filtragem (Mantida)
  useEffect(() => {
    let result = items;
    if (filterCity) result = result.filter(i => generateSlug(i.city) === filterCity);
    if (maxPrice) result = result.filter(i => Number(i.priceAdult) <= Number(maxPrice));
    if (selectedAmenities.length > 0) result = result.filter(i => selectedAmenities.every(a => (i.amenities || []).includes(a)));
    if (selectedMeals.length > 0) result = result.filter(i => selectedMeals.some(m => (i.meals || []).includes(m)));
    if (selectedDays.length > 0) result = result.filter(i => selectedDays.some(dayIdx => (i.availableDays || []).includes(dayIdx)));
    if (selectedPets.length > 0) {
        result = result.filter(i => {
            if (selectedPets.includes("Não aceita animais")) return !i.petAllowed;
            if (!i.petAllowed) return false;
            return selectedPets.some(p => {
                const size = p.split(' ')[3];
                if (!size) return true;
                const localPetSize = (i.petSize || "").toLowerCase();
                return localPetSize.includes(size) || localPetSize.includes("qualquer") || localPetSize.includes("todos");
            });
        });
    }
    setFilteredItems(result);
  }, [items, filterCity, maxPrice, selectedAmenities, selectedMeals, selectedDays, selectedPets]);

  const toggleFilter = (list, setList, item) => {
      if (list.includes(item)) setList(list.filter(i => i !== item));
      else setList([...list, item]);
  };
  
  const clearFilters = () => { setMaxPrice(""); setSelectedAmenities([]); setSelectedMeals([]); setSelectedDays([]); setSelectedPets([]); setFilterCity(""); };
  const availableCities = [...new Set(items.map(i => i.city))].sort();
  const nearbyCities = availableCities.filter(c => !cityParam || generateSlug(c) !== cityParam).slice(0, 20);

  const FiltersContent = () => (
      <div className="space-y-6">
          <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-lg"><Filter size={18}/> Filtros</h2>
              <button onClick={clearFilters} className="text-xs text-[#0097A8] font-bold hover:underline">Limpar</button>
          </div>
          {!cityParam && (<div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Cidade</label><select className="w-full p-2 border rounded-xl text-sm bg-slate-50" value={filterCity} onChange={e => setFilterCity(e.target.value)}><option value="">Todas as cidades</option>{availableCities.map(c => <option key={c} value={generateSlug(c)}>{c}</option>)}</select></div>)}
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Preço Máximo (Adulto)</label><div className="flex items-center gap-2 border rounded-xl p-2 bg-white"><span className="text-slate-400 text-sm">R$</span><input type="number" placeholder="0,00" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="w-full outline-none text-sm"/></div></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Dias de Funcionamento</label><div className="flex flex-wrap gap-2">{WEEK_DAYS.map((d, i) => (<button key={i} onClick={()=>toggleFilter(selectedDays, setSelectedDays, i)} className={`text-xs px-2 py-1 rounded border transition-colors ${selectedDays.includes(i) ? 'bg-[#0097A8] text-white border-[#0097A8]' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>{d.slice(0,3)}</button>))}</div></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Pensão / Refeições</label>{MEALS_LIST.map(m => (<label key={m} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8] mb-1"><input type="checkbox" checked={selectedMeals.includes(m)} onChange={()=>toggleFilter(selectedMeals, setSelectedMeals, m)} className="accent-[#0097A8] rounded"/> {m}</label>))}</div>
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Pets</label>{["Aceita animais de pequeno porte", "Aceita animais de médio porte", "Aceita animais de grande porte", "Não aceita animais"].map(p => (<label key={p} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8] mb-1"><input type="checkbox" checked={selectedPets.includes(p)} onChange={()=>toggleFilter(selectedPets, setSelectedPets, p)} className="accent-[#0097A8] rounded"/> {p}</label>))}</div>
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Comodidades</label><div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">{AMENITIES_LIST.map(a => (<label key={a} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8]"><input type="checkbox" checked={selectedAmenities.includes(a)} onChange={()=>toggleFilter(selectedAmenities, setSelectedAmenities, a)} className="accent-[#0097A8] rounded"/> {a}</label>))}</div></div>
      </div>
  );

  if (loading) return (
    <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse mb-6"></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
    </div>
  );

 return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-fade-in">
        
        {/* 1. TÍTULO (Sempre no topo, fora das colunas) */}
        <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 capitalize">Day Uses em {locationTitle}</h1>
            <p className="text-slate-500">{filteredItems.length} opções encontradas</p>
        </div>

        {/* 2. FILTRO MOBILE (Acordeão abaixo do título) */}
        <div className="md:hidden mb-8">
            <button 
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-slate-800 font-bold active:bg-slate-50 transition-colors"
            >
                <span className="flex items-center gap-2"><Filter size={20} className="text-[#0097A8]"/> Filtrar Resultados</span>
                <ChevronDown size={20} className={`transition-transform duration-300 text-slate-400 ${showMobileFilters ? 'rotate-180' : ''}`}/>
            </button>
            
            {showMobileFilters && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 mt-3 shadow-lg animate-fade-in">
                    <FiltersContent />
                </div>
            )}
        </div>

        {/* 3. CONTEÚDO PRINCIPAL (Sidebar Desktop + Lista) */}
        <div className="flex flex-col md:flex-row gap-8">
            
            {/* Sidebar Desktop (Escondida no mobile) */}
            <div className="hidden md:block w-1/4 space-y-6 h-fit sticky top-24">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <FiltersContent />
                </div>
            </div>

            {/* Lista de Cards */}
            <div className="flex-1">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400">Nenhum local encontrado com esses filtros.</p>
                        <button onClick={clearFilters} className="text-[#0097A8] font-bold mt-2 hover:underline">Limpar Todos Filtros</button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map(item => (
                            <DayUseCard 
                                key={item.id} 
                                item={item} 
                                onClick={() => navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}})} 
                            />
                        ))}
                    </div>
                )}
                
                {/* 4. LINKAGEM DE CIDADES PRÓXIMAS (No final da lista) */}
                {nearbyCities.length > 0 && (
                    <div className="mt-16 pt-8 border-t border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">Confira os day uses disponíveis em cidades próximas</h2>
                        {/* Grid ajustado: 2 colunas no mobile, 5 no desktop */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-3 gap-x-6">
                            {nearbyCities.map(city => (
                                <button
                                    key={city}
                                    onClick={() => navigate(`/${getStateSlug(stateParam)}/${generateSlug(city)}`)}
                                    className="text-sm text-slate-600 hover:text-[#0097A8] hover:underline text-left truncate py-1 transition-colors"
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

const RouteResolver = () => {
    const { state, cityOrSlug } = useParams();
    const [decision, setDecision] = useState(null); // 'listing', 'details', 'loading'
    
    // CORREÇÃO: O useEffect agora roda SEMPRE, independentemente dos parâmetros.
    // A lógica condicional fica DENTRO dele, respeitando as regras do React.
    useEffect(() => {
        const checkRoute = async () => {
            // Caso 1: Se não tem o segundo parâmetro (ex: /mg), é listagem de estado
            if (!cityOrSlug) {
                setDecision('listing');
                return;
            }

            // Caso 2: Tem segundo parâmetro, verifica se é um Local (Detalhes) ou Cidade (Listagem)
            const q = query(collection(db, "dayuses"));
            const snap = await getDocs(q);
            const foundItem = snap.docs.find(d => generateSlug(d.data().name) === cityOrSlug);

            if (foundItem) {
                setDecision('details');
            } else {
                setDecision('listing');
            }
        };
        checkRoute();
    }, [state, cityOrSlug]);

    // Exibe loading enquanto decide
    if (!decision) return <div className="text-center py-20 text-slate-400 animate-pulse">Carregando...</div>;

    // Renderiza com base na decisão
    if (decision === 'details') return <DetailsPage />;
    
    return <ListingPage stateParam={state} cityParam={cityOrSlug} />;
};

const SiteMapPage = () => {
  const navigate = useNavigate();
  const [allLinks, setAllLinks] = useState([]);
  const [filteredLinks, setFilteredLinks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeLetter, setActiveLetter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const alphabet = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Busca apenas day uses ativos para o mapa do site público
      const q = query(collection(db, "dayuses"), where("paused", "!=", false)); 
      const snap = await getDocs(q);
      
      const statesSet = new Set();
      const citiesSet = new Set();
      const places = [];

      snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.state && data.slug) {
              // 1. Locais (Day Uses)
              places.push({
                  name: data.name,
                  url: `/${getStateSlug(data.state)}/${data.slug}`,
                  type: 'local'
              });

              // 2. Estados
              statesSet.add(data.state.toUpperCase());

              // 3. Cidades
              if (data.city) {
                  // Usamos JSON.stringify para garantir unicidade no Set de objetos
                  citiesSet.add(JSON.stringify({ 
                      name: data.city, 
                      state: data.state, 
                      slug: generateSlug(data.city) 
                  }));
              }
          }
      });

      // Formata Estados para a lista
      const states = Array.from(statesSet).map(s => ({
          name: STATE_NAMES[s] || s,
          url: `/${s.toLowerCase()}`,
          type: 'estado'
      }));

      // Formata Cidades para a lista
      const cities = Array.from(citiesSet).map(c => {
          const cityObj = JSON.parse(c);
          return {
              name: `${cityObj.name} - ${cityObj.state}`,
              url: `/${cityObj.state.toLowerCase()}/${cityObj.slug}`,
              type: 'cidade'
          };
      });

      // Junta tudo e ordena alfabeticamente
      const combined = [...states, ...cities, ...places].sort((a, b) => a.name.localeCompare(b.name));
      setAllLinks(combined);
      setFilteredLinks(combined);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Lógica de Filtro (Busca e Letra)
  useEffect(() => {
      let result = allLinks;

      // Filtro por Texto
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          result = result.filter(item => item.name.toLowerCase().includes(lowerTerm));
      }

      // Filtro por Letra Inicial
      if (activeLetter !== "ALL") {
          result = result.filter(item => 
              item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().startsWith(activeLetter)
          );
      }

      setFilteredLinks(result);
  }, [searchTerm, activeLetter, allLinks]);

  // Agrupa os links filtrados por letra para exibição
  const grouped = filteredLinks.reduce((acc, item) => {
      const firstChar = item.name.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Garante que é uma letra, senão agrupa em '#'
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(item);
      return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Mapa do Site</h1>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                Explore todos os destinos, cidades e day uses disponíveis em nossa plataforma de forma organizada.
            </p>
        </div>

        {/* Barra de Busca */}
        <div className="relative max-w-xl mx-auto mb-10">
            <Search className="absolute left-5 top-4 text-slate-400" size={20}/>
            <input 
                className="w-full border border-slate-200 p-4 pl-14 rounded-full shadow-sm focus:ring-2 focus:ring-[#0097A8] outline-none text-slate-700 transition-all"
                placeholder="Busque por cidade, estado ou nome do local..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Navegador A-Z */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
            {alphabet.map(letter => (
                <button 
                    key={letter}
                    onClick={() => setActiveLetter(letter)}
                    className={`text-xs font-bold w-9 h-9 rounded-full transition-all border ${
                        activeLetter === letter 
                            ? 'bg-[#0097A8] text-white border-[#0097A8] shadow-md scale-110' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-[#0097A8] hover:text-[#0097A8]'
                    }`}
                >
                    {letter}
                </button>
            ))}
        </div>

        {loading ? (
            <div className="text-center py-32">
                <div className="animate-spin w-12 h-12 border-4 border-[#0097A8] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-400">Carregando índice...</p>
            </div>
        ) : (
            <div className="space-y-12">
                {Object.keys(grouped).sort().map(letter => (
                    <div key={letter} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <h2 className="text-3xl font-bold text-[#0097A8] mb-6 border-b border-slate-100 pb-4">{letter}</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                            {grouped[letter].map((link, i) => (
                                <button 
                                    key={i}
                                    onClick={() => navigate(link.url)}
                                    className="text-sm text-slate-600 hover:text-[#0097A8] hover:translate-x-1 transition-all text-left w-full truncate flex items-center group py-1"
                                >
                                    <span className="truncate flex-1">{link.name}</span>
                                    
                                    {/* Badges de Tipo */}
                                    {link.type === 'estado' && <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-100 uppercase tracking-wider group-hover:bg-blue-100">Estado</span>}
                                    {link.type === 'cidade' && <span className="ml-2 text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold border border-orange-100 uppercase tracking-wider group-hover:bg-orange-100">Cidade</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredLinks.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-lg">Nenhum resultado encontrado para "{searchTerm}".</p>
                        <button onClick={()=>{setSearchTerm(""); setActiveLetter("ALL")}} className="text-[#0097A8] font-bold mt-4 hover:underline">Limpar Filtros</button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

const BlogHubPage = () => {
  const navigate = useNavigate();
  useSEO("Dicas e Guia de Day Use | Mapa do Day Use", "Explore nosso guia completo sobre day use. Dicas, roteiros e tudo o que você precisa saber para aproveitar o dia em hotéis e resorts.");
  
  // Schema do Hub (CollectionPage)
  useSchema({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Guia de Day Use",
    "description": "Artigos e dicas sobre como aproveitar day uses.",
    "url": "https://mapadodayuse.com/day-use",
    "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mapadodayuse.com" },
            { "@type": "ListItem", "position": 2, "name": "Dicas de Day Use", "item": "https://mapadodayuse.com/day-use" }
        ]
    }
  });

  return (
    <div className="max-w-5xl mx-auto py-16 px-4 animate-fade-in">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Guia do Day Use 🌿</h1>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Dicas, explicações e tudo o que você precisa saber para transformar seu dia livre em uma mini-férias.
            </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card do Artigo 1 */}
            <div 
                onClick={() => navigate('/day-use/o-que-e-day-use')}
                className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
            >
                <div className="h-48 bg-teal-50 flex items-center justify-center overflow-hidden">
                    {/* Placeholder visual ou imagem real se tiver */}
                    <Ticket size={64} className="text-[#0097A8] opacity-50 group-hover:scale-110 transition-transform duration-700"/>
                </div>
                <div className="p-6">
                    <span className="text-xs font-bold text-[#0097A8] uppercase tracking-wider">Guia Básico</span>
                    <h2 className="text-xl font-bold text-slate-900 mt-2 mb-3 leading-tight group-hover:text-[#0097A8] transition-colors">
                        O que é Day Use? Como funciona e quando vale a pena
                    </h2>
                    <p className="text-slate-500 text-sm line-clamp-3">
                        Entenda como funciona essa modalidade de lazer, o que geralmente está incluso e descubra se é a escolha ideal para o seu descanso.
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-sm font-bold text-slate-700">
                        Ler artigo completo <ArrowRight size={16} className="ml-2"/>
                    </div>
                </div>
            </div>

            {/* Futuros artigos aparecerão aqui... */}
        </div>
    </div>
  );
};

const WhatIsDayUsePage = () => {
  const navigate = useNavigate();
  
  // SEO
  useSEO(
    "Day Use: o que é, como funciona e quando vale a pena", 
    "Saiba o que é day use, como funciona, quem pode usar e as vantagens. Encontre experiências de day use para curtir o dia."
  );

  // SCHEMAS (WebPage, Article, Breadcrumb)
  useSchema({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://mapadodayuse.com/day-use/o-que-e-day-use",
        "url": "https://mapadodayuse.com/day-use/o-que-e-day-use",
        "name": "Day Use: o que é, como funciona e quando vale a pena"
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mapadodayuse.com" },
            { "@type": "ListItem", "position": 2, "name": "Dicas", "item": "https://mapadodayuse.com/day-use" },
            { "@type": "ListItem", "position": 3, "name": "O que é Day Use", "item": "https://mapadodayuse.com/day-use/o-que-e-day-use" }
        ]
      },
      {
        "@type": "Article",
        "headline": "Day Use: o que é, como funciona e quando vale a pena",
        "description": "Saiba o que é day use, como funciona, quem pode usar e as vantagens. Encontre experiências de day use para curtir o dia.",
        "image": "https://mapadodayuse.com/logo.svg", // Idealmente uma imagem de capa do artigo
        "author": {
            "@type": "Person",
            "name": "Iuri França"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Mapa do Day Use",
            "logo": {
                "@type": "ImageObject",
                "url": "https://mapadodayuse.com/logo.svg"
            }
        },
        "datePublished": "2026-01-01",
        "dateModified": new Date().toISOString().split('T')[0]
      }
    ]
  });

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in text-slate-800 leading-relaxed">
        {/* Breadcrumb Visual */}
        <nav className="text-xs text-slate-500 mb-8 flex gap-2">
            <span className="cursor-pointer hover:text-[#0097A8]" onClick={()=>navigate('/')}>Home</span> / 
            <span className="cursor-pointer hover:text-[#0097A8]" onClick={()=>navigate('/day-use')}>Dicas</span> / 
            <span className="text-slate-800 font-bold">O que é Day Use</span>
        </nav>

        <article>
            <header className="mb-10">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">O que é Day Use?</h1>
                <p className="text-xl text-slate-500 font-light">Entenda como funciona, quais os benefícios e descubra se essa é a opção ideal para o seu dia de folga.</p>
            </header>

            <div className="space-y-8">
                <section>
                    <p className="mb-4">
                        <strong>Day use</strong> é a possibilidade de usar a estrutura de um hotel, pousada, clube ou espaço de lazer por um dia, sem precisar se hospedar à noite.
                    </p>
                    <p className="mb-4">Na prática, você paga para aproveitar áreas como:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-4 text-slate-600">
                        <li>Piscinas</li>
                        <li>Spa e áreas de relaxamento</li>
                        <li>Restaurantes e bares</li>
                        <li>Áreas verdes</li>
                        <li>Espaços infantis</li>
                        <li>Quadras, trilhas ou experiências exclusivas</li>
                    </ul>
                    <p>Tudo isso dentro de um horário definido, geralmente durante o dia.</p>
                    <div className="bg-cyan-50 border-l-4 border-[#0097A8] p-4 my-6 rounded-r-lg text-sm text-cyan-900">
                        👉 <strong>Resumo:</strong> É uma forma prática de curtir um lugar especial, descansar ou viver uma experiência diferente sem o custo de uma diária completa.
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Como funciona o day use?</h2>
                    <p className="mb-4">O funcionamento do day use é simples e transparente. Veja como normalmente acontece:</p>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-[#0097A8] mb-2">Reserva</h3>
                            <ul className="list-disc pl-6 text-slate-600">
                                <li>Você escolhe a experiência de day use no site</li>
                                <li>Confere o que está incluso, valores e regras</li>
                                <li>Faz a reserva online, de forma segura</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#0097A8] mb-2">Horários</h3>
                            <ul className="list-disc pl-6 text-slate-600">
                                <li>O horário varia conforme o local</li>
                                <li>Em geral, o acesso acontece pela manhã e vai até o fim da tarde</li>
                                <li>Alguns espaços oferecem períodos específicos (ex: manhã, tarde ou dia inteiro)</li>
                            </ul>
                            <p className="text-sm mt-2 text-slate-500 italic">Sempre vale conferir os horários informados na página da experiência.</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#0097A8] mb-2">O que está incluso</h3>
                            <p className="mb-2">Cada day use tem regras próprias, mas normalmente pode incluir:</p>
                            <ul className="list-disc pl-6 text-slate-600">
                                <li>Acesso às áreas comuns</li>
                                <li>Piscina e espaços de lazer</li>
                                <li>Consumo mínimo em restaurante (em alguns casos)</li>
                                <li>Uso de vestiários, duchas e áreas de descanso</li>
                            </ul>
                            <p className="text-sm mt-2 text-slate-500">📌 Serviços extras, como massagens, bebidas ou refeições especiais, podem ser cobrados à parte.</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#0097A8] mb-2">Cancelamento e alterações</h3>
                            <ul className="list-disc pl-6 text-slate-600">
                                <li>As políticas variam conforme o parceiro</li>
                                <li>Algumas experiências permitem cancelamento gratuito até um certo prazo</li>
                                <li>Outras podem ter taxas ou não permitir cancelamento</li>
                            </ul>
                            <div className="bg-slate-50 p-3 rounded-lg mt-3 text-sm border border-slate-200">
                                👉 Sempre confira a política de cancelamento antes de finalizar a reserva.
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Quem pode usar o day use?</h2>
                    <p className="mb-4">O day use é super democrático e atende diferentes perfis de pessoas:</p>
                    <ul className="grid md:grid-cols-2 gap-4">
                        <li className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start gap-3">
                            <span className="text-2xl">👨‍👩‍👧</span>
                            <span className="text-sm"><strong>Famílias</strong> que querem um dia de lazer fora da rotina</span>
                        </li>
                        <li className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start gap-3">
                            <span className="text-2xl">💑</span>
                            <span className="text-sm"><strong>Casais</strong> em busca de descanso ou um programa diferente</span>
                        </li>
                        <li className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start gap-3">
                            <span className="text-2xl">🧳</span>
                            <span className="text-sm"><strong>Viajantes</strong> de fim de semana</span>
                        </li>
                        <li className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start gap-3">
                            <span className="text-2xl">🏡</span>
                            <span className="text-sm"><strong>Pessoas da região</strong> que querem turismo local</span>
                        </li>
                    </ul>
                    <p className="mt-4">Existem opções para adultos, crianças, grupos e até experiências exclusivas para maiores de idade.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Benefícios e Diferenças</h2>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-200">
                            <h3 className="font-bold text-slate-800">Principais Benefícios</h3>
                        </div>
                        <div className="p-4 space-y-2">
                            <p>💰 <strong>Custo menor</strong> que uma diária completa</p>
                            <p>⏰ <strong>Flexibilidade:</strong> aproveite só o tempo que faz sentido para você</p>
                            <p>🌿 <strong>Experiência completa</strong>, sem precisar dormir fora</p>
                            <p>📍 <strong>Ótimo</strong> para quem mora perto ou está de passagem</p>
                        </div>
                    </div>
                    
                    <div className="mt-6">
                        <h3 className="font-bold text-lg mb-2">Day use x Hospedagem tradicional</h3>
                        <ul className="list-disc pl-6 text-slate-600">
                            <li><strong>Day use:</strong> uso diurno, sem pernoite.</li>
                            <li><strong>Hospedagem:</strong> inclui quarto e estadia noturna.</li>
                        </ul>
                        <p className="mt-2 text-sm italic">👉 Se a ideia é relaxar, curtir a piscina, comer bem e voltar pra casa no mesmo dia, o day use costuma ser a escolha ideal.</p>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Dicas para aproveitar ao máximo</h2>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold text-slate-700">Antes de ir</h4>
                            <p className="text-sm text-slate-600">Leia com atenção o que está incluso, confira horários de entrada e saída e veja se o local exige reserva antecipada.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-700">O que levar</h4>
                            <p className="text-sm text-slate-600">Roupa de banho, toalha (se não inclusa), protetor solar, chinelo e documento de identificação.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-700">Durante o day use</h4>
                            <p className="text-sm text-slate-600">Chegue no horário para aproveitar melhor, respeite as regras do espaço e pergunte sobre serviços extras.</p>
                        </div>
                    </div>
                </section>

                <section className="bg-[#0097A8] text-white p-8 rounded-3xl text-center mt-12 shadow-xl">
                    <h2 className="text-2xl font-bold mb-4">Encontre seu próximo day use</h2>
                    <p className="mb-8 opacity-90">
                        No Mapa do Day Use, você encontra diferentes opções de experiências para curtir o dia do seu jeito — seja para relaxar, se divertir ou simplesmente sair da rotina.
                    </p>
                    <Button 
                        onClick={() => navigate('/')} 
                        className="!bg-white !text-[#0097A8] hover:bg-cyan-50 px-8 py-4 text-lg shadow-xl hover:scale-105 transition-transform border-none"
                    >
                        Explorar Experiências
                    </Button>
                </section>
            </div>
        </article>
    </div>
  );
};

const AboutUsPage = () => {
  useSEO("Sobre Nós | Mapa do Day Use", "Conheça a história, missão e os valores por trás do Mapa do Day Use. Estamos democratizando o lazer e o turismo local.");
  
  return (
    <div className="max-w-4xl mx-auto py-16 px-4 animate-fade-in text-slate-800">
        <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Não vendemos diárias,<br/>vendemos <span className="text-[#0097A8]">liberdade</span>.</h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Acreditamos que você não precisa esperar as férias de janeiro para ser feliz. O paraíso pode ser logo ali, na sua cidade, numa terça-feira à tarde.
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-2 md:order-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Quem somos?</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                    Somos um time de sonhadores inquietos que cansou de ver hotéis incríveis vazios durante o dia e pessoas estressadas precisando de uma pausa.
                </p>
                <p className="text-slate-600 leading-relaxed">
                    O <strong>Mapa do Day Use</strong> nasceu para conectar essas duas pontas. Somos a ponte entre a sua vontade de escapar da rotina e as piscinas, spas e naturezas que estão a poucos quilômetros de você. Somos tecnologia com alma de viajante.
                </p>
            </div>
            <div className="order-1 md:order-2 bg-slate-100 rounded-3xl h-64 md:h-80 flex items-center justify-center overflow-hidden relative group">
                 <div className="absolute inset-0 bg-gradient-to-tr from-[#0097A8] to-cyan-400 opacity-20"></div>
                 <MapPin size={64} className="text-[#0097A8] drop-shadow-lg transform group-hover:scale-110 transition-transform duration-700"/>
            </div>
        </div>

        <div className="bg-slate-50 rounded-3xl p-8 md:p-12 mb-20 border border-slate-100">
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="space-y-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-[#0097A8]"><Star size={24}/></div>
                    <h3 className="font-bold text-lg text-slate-900">Missão</h3>
                    <p className="text-sm text-slate-600">Democratizar o acesso ao lazer de alto padrão. Quebrar os muros dos hotéis e permitir que todos possam viver experiências 5 estrelas.</p>
                </div>
                <div className="space-y-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-[#0097A8]"><Briefcase size={24}/></div>
                    <h3 className="font-bold text-lg text-slate-900">Visão</h3>
                    <p className="text-sm text-slate-600">Transformar o "micro-turismo" em hábito. Queremos um mundo onde descansar não seja um luxo anual, mas uma escolha semanal.</p>
                </div>
                <div className="space-y-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-[#0097A8]"><User size={24}/></div>
                    <h3 className="font-bold text-lg text-slate-900">Valores</h3>
                    <p className="text-sm text-slate-600">Liberdade geográfica, conexão real com a natureza, transparência radical e valorização da economia local.</p>
                </div>
            </div>
        </div>

        <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Vamos transformar o mundo, um mergulho de cada vez?</h2>
            <p className="text-slate-500 mb-8">Junte-se a milhares de viajantes que descobriram que a vida acontece agora.</p>
        </div>
    </div>
  );
};

const ContactPage = () => {
  const navigate = useNavigate();
  useSEO("Fale Conosco | Mapa do Day Use", "Entre em contato com a equipe do Mapa do Day Use. Suporte, parcerias e dúvidas.");

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 animate-fade-in">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Fale Conosco</h1>
            <p className="text-slate-500 text-lg">
                Dúvidas, sugestões, parcerias ou apenas para dar um "olá".<br/>Nossa equipe está pronta para te ouvir.
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <a 
                href="https://wa.me/5531920058081" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center cursor-pointer"
            >
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                    <MessageCircle size={32}/>
                </div>
                <h3 className="font-bold text-xl text-slate-900 mb-2">WhatsApp</h3>
                <p className="text-slate-500 text-sm mb-4">Resposta rápida para dúvidas urgentes e suporte em tempo real.</p>
                <span className="text-[#0097A8] font-bold text-sm">Chamar agora &rarr;</span>
            </a>

            <a 
                href="mailto:contato@mapadodayuse.com"
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center cursor-pointer"
            >
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <Mail size={32}/>
                </div>
                <h3 className="font-bold text-xl text-slate-900 mb-2">E-mail</h3>
                <p className="text-slate-500 text-sm mb-4">Para parcerias, imprensa ou assuntos que exigem mais detalhes.</p>
                <span className="text-[#0097A8] font-bold text-sm">Enviar mensagem &rarr;</span>
            </a>
        </div>

        <div className="mt-12 bg-slate-50 rounded-3xl p-8 text-center border border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 mb-2">Quer ser um parceiro?</h3>
            <p className="text-slate-500 text-sm mb-6">Se você tem um hotel ou pousada e quer aumentar seu faturamento, venha com a gente.</p>
            <button onClick={() => navigate('/partner-register')} className="bg-[#0097A8] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#007F8F] transition-colors shadow-lg shadow-teal-200">
                Cadastrar meu espaço
            </button>
        </div>
    </div>
  );
};

const PartnerLandingPage = () => {
  const navigate = useNavigate();
  useSEO("Seja um Parceiro | Mapa do Day Use", "Aumente o faturamento do seu hotel ou pousada vendendo Day Use. Plataforma completa de gestão, marketing e pagamentos seguros.");
  
  // Estado para controlar o modal de cadastro na própria página
  const [showRegister, setShowRegister] = useState(false);

  const scrollToTop = () => window.scrollTo(0,0);

  const handleRegisterSuccess = (user) => {
      // Redireciona para o fluxo de criação de anúncio após cadastro
      navigate('/partner/new');
  };

  return (
    <div className="animate-fade-in bg-white">
        
        {/* MODAL DE CADASTRO INTEGRADO (Usando Portal para cobrir a tela) */}
        {showRegister && createPortal(
            <LoginModal 
                isOpen={showRegister} 
                onClose={() => setShowRegister(false)} 
                initialRole="partner" 
                hideRoleSelection={true} 
                initialMode="register"
                customTitle="Comece Agora"
                customSubtitle="Crie sua conta de parceiro gratuitamente."
                onSuccess={handleRegisterSuccess}
                closeOnSuccess={true}
            />,
            document.body
        )}

        {/* HERO SECTION */}
        <div className="relative bg-slate-900 text-white pt-24 pb-20 px-4 rounded-b-[3rem] overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 to-[#0097A8]/90 opacity-90"></div>
            
            <div className="relative z-10 max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-white/10 text-cyan-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-white/20">
                    <Star size={14} className="fill-current"/> Revolução na Hotelaria
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                    Transforme áreas ociosas em <br/><span className="text-cyan-300">Lucro Líquido</span>.
                </h1>
                <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-3xl mx-auto leading-relaxed">
                    A plataforma definitiva para hotéis, pousadas e resorts venderem Day Use com segurança, previsibilidade e zero dor de cabeça operacional.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {/* Botão corrigido com !text-[#0097A8] para garantir legibilidade e onClick abrindo o modal */}
                    <Button onClick={() => setShowRegister(true)} className="!bg-white !text-[#0097A8] hover:bg-cyan-50 px-8 py-4 text-lg shadow-xl hover:scale-105 transition-transform border-none">
                        Quero ser Parceiro
                    </Button>
                    <a href="https://wa.me/5531920058081" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white border border-white/30 hover:bg-white/10 transition-colors">
                        <MessageCircle size={20}/> Falar com Especialista
                    </a>
                </div>
            </div>
        </div>

        {/* A DOR DO MERCADO */}
        <div className="max-w-7xl mx-auto py-20 px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Por que o modelo tradicional de hospedagem limita seu lucro?</h2>
                <p className="text-slate-500 max-w-2xl mx-auto">Você tem uma estrutura incrível — piscina, restaurante, lazer — mas ela passa boa parte do tempo vazia ou gerando custos fixos altos.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center hover:shadow-lg transition-shadow">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><TrendingUp size={32}/></div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Margem Apertada</h3>
                    <p className="text-sm text-slate-600">Hospedagem envolve custos altos: enxoval, limpeza pesada, café da manhã incluso, energia noturna. O Day Use é quase 100% margem.</p>
                </div>
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center hover:shadow-lg transition-shadow">
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6"><Zap size={32}/></div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Ociosidade</h3>
                    <p className="text-sm text-slate-600">Entre o check-out e o check-in, ou em dias de semana, sua estrutura fica parada. O Day Use monetiza esses intervalos.</p>
                </div>
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center hover:shadow-lg transition-shadow">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><Globe size={32}/></div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Marketing Caro</h3>
                    <p className="text-sm text-slate-600">Atrair clientes sozinho custa caro. Nós trazemos o tráfego qualificado de quem já procura lazer na sua região.</p>
                </div>
            </div>
        </div>

        {/* NOSSOS DIFERENCIAIS */}
        <div className="bg-slate-900 text-white py-24 px-4 rounded-[3rem] my-8 mx-2 shadow-2xl">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Tecnologia de Ponta para Gestão Simples</h2>
                    <p className="text-slate-400">Desenvolvemos o que há de mais moderno para você focar no hóspede, não na planilha.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-[#0097A8] font-bold"><CalendarIcon/> Calendário Inteligente</div>
                        <p className="text-sm text-slate-400">Controle total de disponibilidade. Feche datas específicas, abra exceções e defina estoques diários de forma simples.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-[#0097A8] font-bold"><DollarSign/> Preço Dinâmico</div>
                        <p className="text-sm text-slate-400">Defina preços diferentes para dias de semana e fins de semana. Crie promoções relâmpago em segundos.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-[#0097A8] font-bold"><Ticket/> Ingressos Especiais</div>
                        <p className="text-sm text-slate-400">Aumente o ticket médio vendendo combos, estacionamento, gazebos ou produtos exclusivos junto com a reserva.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-[#0097A8] font-bold"><Users/> Gestão de Portaria</div>
                        <p className="text-sm text-slate-400">Painel exclusivo para sua equipe validar QR Codes na entrada, sem acesso aos seus dados financeiros.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-[#0097A8] font-bold"><Tag/> Cupons Inteligentes</div>
                        <p className="text-sm text-slate-400">Crie campanhas com cupons de desconto rastreáveis para medir o retorno de influencers e parceiros.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-[#0097A8] font-bold"><BarChart/> Dashboard Completo</div>
                        <p className="text-sm text-slate-400">Visão financeira clara: Total vendido, líquido a receber, divisão por método de pagamento e lista de presença.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* SEGURANÇA FINANCEIRA */}
        <div className="max-w-7xl mx-auto py-20 px-4">
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 shadow-lg">
                <div className="flex-1 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                        <ShieldCheck size={14}/> Segurança Financeira
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">Seu dinheiro direto na sua conta. Sem intermediários.</h2>
                    <p className="text-slate-600 leading-relaxed">
                        Utilizamos a tecnologia de <strong>Split de Pagamento</strong> do Mercado Pago.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex gap-3 text-sm text-slate-700"><CheckCircle className="text-green-500 shrink-0" size={20}/> O cliente paga (Pix ou Cartão).</li>
                        <li className="flex gap-3 text-sm text-slate-700"><CheckCircle className="text-green-500 shrink-0" size={20}/> O Mercado Pago separa automaticamente sua parte.</li>
                        <li className="flex gap-3 text-sm text-slate-700"><CheckCircle className="text-green-500 shrink-0" size={20}/> O dinheiro cai direto na sua conta MP, nós nunca tocamos nele.</li>
                    </ul>
                    <p className="text-xs text-slate-400 mt-4">*Transações criptografadas e protegidas contra fraude.</p>
                </div>
                <div className="w-full md:w-1/3 flex justify-center">
                    <div className="bg-white p-6 rounded-3xl shadow-xl rotate-3 border border-slate-100 text-center">
                        <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white"><Lock size={40}/></div>
                        <p className="font-bold text-slate-800">Pagamento Aprovado</p>
                        <p className="text-xs text-slate-500">Valor transferido para o parceiro</p>
                    </div>
                </div>
            </div>
        </div>

        {/* MARKETING */}
        <div className="max-w-7xl mx-auto py-12 px-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Mais que um software, uma máquina de vendas.</h2>
            <p className="text-slate-600 mb-10 max-w-2xl mx-auto">
                Não entregamos apenas a tecnologia. Entregamos o público. O Mapa do Day Use é impulsionado por uma estratégia de marketing agressiva.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-pink-50 border border-pink-100">
                    <p className="text-2xl font-bold text-pink-600">+200k</p>
                    <p className="text-xs text-pink-800 font-bold uppercase">Seguidores</p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                    <p className="text-2xl font-bold text-purple-600">Tráfego</p>
                    <p className="text-xs text-purple-800 font-bold uppercase">Pago & Orgânico</p>
                </div>
                <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                    <p className="text-2xl font-bold text-green-600">SEO</p>
                    <p className="text-xs text-green-800 font-bold uppercase">Google Otimizado</p>
                </div>
                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                    <p className="text-2xl font-bold text-orange-600">IA</p>
                    <p className="text-xs text-orange-800 font-bold uppercase">Integrado com GPT</p>
                </div>
            </div>
        </div>

        {/* CTA FINAL */}
        <div className="bg-[#0097A8] py-20 px-4 text-center mt-12">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Pronto para lotar seu Day Use?</h2>
                <p className="text-cyan-100 mb-10 text-lg">O cadastro é gratuito. Você só paga uma comissão sobre o que vender. Risco zero, lucro real.</p>
                <Button onClick={() => setShowRegister(true)} className="!bg-white !text-[#0097A8] hover:bg-slate-100 px-10 py-5 text-xl shadow-2xl mx-auto border-none transform hover:scale-105 transition-transform">
                    Começar Agora
                </Button>
                <p className="text-white/60 text-xs mt-6">Junte-se à revolução do turismo local.</p>
            </div>
        </div>
    </div>
  );
};

const App = () => {
  return (
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        
        {/* ROTAS DINÂMICAS INTELIGENTES */}
        {/* 1. Estado apenas (ex: /mg) -> Lista estado */}
        <Route path="/:state" element={<Layout><RouteResolver /></Layout>} />
        
        {/* 2. Estado + Cidade OU Local (ex: /mg/belo-horizonte ou /mg/hotel-fazenda) -> Resolve auto */}
        <Route path="/:state/:cityOrSlug" element={<Layout><RouteResolver /></Layout>} />

        {/* Rotas legadas/específicas */}
        <Route path="/stay/:id" element={<Layout><DetailsPage /></Layout>} />
        <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
        <Route path="/minhas-viagens" element={<Layout><UserDashboard /></Layout>} />
        <Route path="/profile" element={<Layout><UserProfile /></Layout>} />
        <Route path="/partner" element={<Layout><PartnerDashboard /></Layout>} />
        <Route path="/partner/new" element={<Layout><PartnerNew /></Layout>} />
        <Route path="/partner/edit/:id" element={<Layout><PartnerNew /></Layout>} />
        <Route path="/partner-register" element={<Layout><PartnerRegisterPage /></Layout>} />
        <Route path="/partner/callback" element={<Layout><PartnerCallbackPage /></Layout>} />
        <Route path="/portaria" element={<Layout><StaffDashboard /></Layout>} />
        <Route path="/politica-de-privacidade" element={<Layout><PrivacyPage /></Layout>} />
        <Route path="/termos-de-uso" element={<Layout><TermsPage /></Layout>} />
        <Route path="/sobre-nos" element={<Layout><AboutUsPage /></Layout>} />
        <Route path="/contato" element={<Layout><ContactPage /></Layout>} />
        <Route path="/day-use" element={<Layout><BlogHubPage /></Layout>} />
        <Route path="/day-use/o-que-e-day-use" element={<Layout><WhatIsDayUsePage /></Layout>} />
        <Route path="/mapa-do-site" element={<Layout><SiteMapPage /></Layout>} />
        <Route path="/seja-parceiro" element={<Layout><PartnerLandingPage /></Layout>} />
        <Route path="/stay/:id" element={<Layout><DetailsPage /></Layout>} />

      </Routes>
  );
};

export default App;