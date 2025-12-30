import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { db, auth, googleProvider } from './firebase'; 
import { collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore'; 
import { initializeApp, getApp } from "firebase/app";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, RecaptchaVerifier, signInWithPhoneNumber, sendEmailVerification, getAuth } from 'firebase/auth';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  MapPin, Search, User, CheckCircle, 
  X, Info, AlertCircle, PawPrint, FileText, Ban, ChevronDown, Image as ImageIcon, Map as MapIcon, CreditCard, Calendar as CalendarIcon, Ticket, Lock, Briefcase, Instagram, Star, ChevronLeft, ChevronRight, ArrowRight, LogOut, List, Link as LinkIcon, Edit, DollarSign, Copy, QrCode, ScanLine, Users, Tag, Trash2, Mail, MessageCircle, Phone, Filter,
} from 'lucide-react';

const STATE_NAMES = {
    'MG': 'Minas Gerais', 'SP': 'São Paulo', 'RJ': 'Rio de Janeiro', 'ES': 'Espírito Santo',
    'BA': 'Bahia', 'SC': 'Santa Catarina', 'PR': 'Paraná', 'RS': 'Rio Grande do Sul',
    'GO': 'Goiás', 'DF': 'Distrito Federal'
};

const AMENITIES_LIST = [
    "Piscina", "Piscina infantil", "Piscina aquecida", "Cachoeira / Riacho", "Cachoeira artificial",
    "Acesso à represa / lago", "Bicicletas", "Quadriciclo", "Passeio a cavalo", "Caiaque / Stand up",
    "Trilha", "Pesque e solte", "Fazendinha / Animais", "Espaço Kids", "Recreação infantil",
    "Quadra de areia", "Campo de futebol", "Campo de vôlei e peteca", "Beach tennis / futvôlei",
    "Academia", "Sauna", "Hidromassagem externa", "Hidromassagem / Banheira / Ofurô", "Massagem",
    "Espaço para meditação", "Capela", "Redes e balanços", "Vista / Mirante", "Fogo de chão / Lareira",
    "Churrasqueira", "Cozinha equipada", "Bar / Restaurante", "Sala de jogos", "Música ao vivo", 
    "Estacionamento", "Wi-Fi"
];

const MEALS_LIST = ["Café da manhã", "Almoço", "Café da tarde", "Petiscos", "Sobremesas"];
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
    document.title = title ? `${title} | Mapa do Day Use` : "Mapa do Day Use";
    
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

  // Estados de Fluxo
  const [view, setView] = useState(initialMode); 
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

  // Reset de estados ao abrir
  useEffect(() => {
    if (isOpen) {
        setError(''); setInfo('');
        setView(initialMode); setRole(initialRole);
        setPhone(''); setCode('');
    }
  }, [isOpen, initialMode, initialRole]);

  // Lógica do Recaptcha (Blindada)
  useEffect(() => {
    if (!isOpen) return;

    // Se sair da tela de telefone, limpa a instância para evitar conflitos
    if (view !== 'phone_start') {
        if (window.recaptchaVerifier) {
            try { window.recaptchaVerifier.clear(); } catch(e){}
            window.recaptchaVerifier = null;
        }
        return;
    }

    const initRecaptcha = async () => {
        // Pequeno delay para garantir que o DOM está estável
        await new Promise(r => setTimeout(r, 200));
        
        const container = document.getElementById('recaptcha-container');
        
        // Só inicializa se o container existir e não houver instância ativa
        if (container && !window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => console.log("Recaptcha resolvido com sucesso"),
                    'expired-callback': () => setError("Sessão expirada. Tente novamente.")
                });
                await window.recaptchaVerifier.render();
            } catch (e) {
                console.log("Status Recaptcha:", e);
            }
        }
    };

    initRecaptcha();
    
    // Cleanup ao desmontar
    return () => {
        if (!isOpen && window.recaptchaVerifier) {
             try { window.recaptchaVerifier.clear(); } catch(e){}
             window.recaptchaVerifier = null;
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
            // Envia e-mail simples (sem configurações complexas para evitar erros de domínio)
            try { await sendEmailVerification(res.user); } catch(e){ console.error("Erro envio email:", e); }
            alert(`Conta criada! Enviamos um link de confirmação para ${email}.`);
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
          // Usa a URL atual como redirecionamento
          await sendPasswordResetEmail(auth, email, { url: window.location.href });
          setInfo("Link enviado para o seu e-mail.");
      } catch (err) { 
          console.error(err);
          setError("Erro ao enviar. Verifique o e-mail ou tente mais tarde."); 
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
          // Garante que o verificador existe antes de chamar
          if (!window.recaptchaVerifier) {
              // Tentativa de recuperação de emergência
              const container = document.getElementById('recaptcha-container');
              if(container) {
                  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
              } else {
                  throw new Error("Erro interno: Recaptcha não carregou. Recarregue a página.");
              }
          }
          
          const confirmation = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
          setConfirmObj(confirmation);
          setView('phone_verify');
      } catch (err) {
          console.error("Erro SMS:", err);
          let msg = "Erro ao enviar SMS.";
          
          if (JSON.stringify(err).includes("403") || JSON.stringify(err).includes("401") || err.message?.includes("internal-error")) {
              msg = "Erro de Permissão (401): Verifique a Chave de API no Google Cloud.";
          } else if (err.code === 'auth/quota-exceeded') {
              msg = "Limite diário de SMS atingido.";
          } else if (err.code === 'auth/invalid-phone-number') {
              msg = "Número inválido.";
          } else if (err.code === 'auth/captcha-check-failed') {
              msg = "Erro de segurança (Captcha).";
          }
          
          setError(msg);
          // Força limpeza para nova tentativa
          if(window.recaptchaVerifier) {
              try{ window.recaptchaVerifier.clear(); }catch(e){}
              window.recaptchaVerifier = null;
          }
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
            
            {/* CONTAINER RECAPTCHA SEMPRE PRESENTE (apenas oculto via CSS) */}
            {/* Isso corrige o 'Internal React error' evitando remoção do nó DOM durante renderização */}
            <div id="recaptcha-container" className={view === 'phone_start' ? 'mb-4' : 'hidden'}></div>

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
          {/* USO DO NOVO CARD REUTILIZÁVEL */}
          {filtered.map(item => (
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
  
  const handleBook = () => navigate('/checkout', { state: { bookingData: { item, date, adults, children, pets, total, priceSnapshot: { adult: currentPrice, child: childPrice, pet: petFee } } } });

  // Mensagem de Pausado
  const PausedMessage = () => (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <Ticket size={32} className="text-slate-400"/>
        </div>
        <div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Reservas Pausadas</h3>
            <p className="text-slate-500 leading-relaxed text-sm">
                Poxa! No momento, este local não está recebendo novas reservas. 
                Mas não fique triste, temos opções incríveis bem pertinho de você!
            </p>
        </div>
        <Button onClick={() => navigate('/')} className="w-full py-4 shadow-lg shadow-teal-100/50">
            Ver outros Day Uses
        </Button>
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
               
               {/* Comodidades e Pensão */}
               <div>
                   <h3 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><CheckCircle className="text-[#0097A8]"/> O que está incluso</h3>
                   {item.amenities && item.amenities.length > 0 && (
                       <div className="mb-6">
                           <p className="text-sm font-bold text-slate-700 mb-2">Comodidades:</p>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                               {item.amenities.map(a => (<div key={a} className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-[#0097A8]"></div> {a}</div>))}
                           </div>
                       </div>
                   )}
                   <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                       <div className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-orange-500"></div> Alimentação (Pensão)
                       </div>
                       {item.meals && item.meals.length > 0 ? (
                           <div className="flex flex-wrap gap-2">{item.meals.map(m => (<span key={m} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-orange-700 border border-orange-200">{m}</span>))}</div>
                       ) : (<p className="text-sm text-slate-500 italic">Este estabelecimento não oferece serviço de alimentação incluso.</p>)}
                   </div>
               </div>

               {item.videoUrl && (<div className="rounded-2xl overflow-hidden shadow-md aspect-video"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}`} title="Video" frameBorder="0" allowFullScreen></iframe></div>)}
               
               <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-red-500 mb-2 flex items-center gap-2"><Ban size={18}/> Não incluso</h4>
                  <p className="text-slate-600 text-sm whitespace-pre-line">{item.notIncludedItems || "Nenhum item específico."}</p>
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
            {item.paused ? <PausedMessage /> : (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-8">
                   <div className="flex justify-between items-end border-b border-slate-100 pb-6"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{date ? "Preço para a data" : "A partir de"}</p><span className="text-3xl font-bold text-[#0097A8]">{formatBRL(currentPrice)}</span><span className="text-slate-400 text-sm"> / adulto</span></div></div>
                   
                   <div>
                       <label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2"><CalendarIcon size={16} className="text-[#0097A8]"/> Escolha uma data</label>
                       {/* O Calendário agora está renderizado direto no componente pai, evitando o reset */}
                       <SimpleCalendar availableDays={item.availableDays} blockedDates={item.blockedDates || []} prices={item.weeklyPrices || {}} basePrice={Number(item.priceAdult)} onDateSelect={setDate} selectedDate={date} />
                       {date && <p className="text-xs font-bold text-[#0097A8] mt-2 text-center bg-cyan-50 py-2 rounded-lg">Data selecionada: {date.split('-').reverse().join('/')}</p>}
                   </div>

                   <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div className="flex justify-between items-center">
                         <div><span className="text-sm font-medium text-slate-700 block">Adultos</span><span className="text-xs text-slate-400 block">{item.adultAgeStart ? `Acima de ${item.adultAgeStart} anos` : 'Ingresso padrão'}</span><span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(currentPrice)}</span></div>
                         <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setAdults(Math.max(1, adults-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{adults}</span><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setAdults(adults+1)}>+</button></div>
                     </div>
                     <div className="flex justify-between items-center">
                         <div><span className="text-sm font-medium text-slate-700 block">Crianças</span><span className="text-xs text-slate-400 block">{item.childAgeStart && item.childAgeEnd ? `${item.childAgeStart} a ${item.childAgeEnd} anos` : 'Meia entrada'}</span><span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(childPrice)}</span></div>
                         <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setChildren(Math.max(0, children-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{children}</span><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setChildren(children+1)}>+</button></div>
                     </div>
                     {showPets && (
                         <div className="flex justify-between items-center">
                             <div><span className="text-sm font-medium text-slate-700 flex items-center gap-1"><PawPrint size={14}/> Pets</span><span className="text-xs text-slate-400 block">{item.petSize || 'Permitido'}</span><span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(petFee)}</span></div>
                             <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setPets(Math.max(0, pets-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{pets}</span><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setPets(pets+1)}>+</button></div>
                         </div>
                     )}
                   </div>

                   {item.gratuitousness && <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-xs text-green-800"><span className="font-bold block mb-1">🎁 Gratuidade:</span>{item.gratuitousness}</div>}

                   <div className="pt-4 border-t border-dashed border-slate-200">
                      <div className="flex justify-between items-center mb-6"><span className="text-slate-600 font-medium">Total</span><span className="text-2xl font-bold text-slate-900">{formatBRL(total)}</span></div>
                      <Button className="w-full py-4 text-lg" disabled={!date} onClick={handleBook}>Reservar</Button>
                      <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1"><Lock size={10}/> Compra segura</p>
                   </div>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

const CheckoutPage = () => {
  useSEO("Pagamento", "Finalize sua reserva.", false);
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData } = location.state || {};
  
  const [user, setUser] = useState(auth.currentUser);
  const [showLogin, setShowLogin] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [partnerToken, setPartnerToken] = useState(null);
  
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
  // NOVO STATE: Para guardar o ID do pagamento e verificar status
  const [createdPaymentId, setCreatedPaymentId] = useState(null);

  // Helper para detectar bandeira
  const getPaymentMethodId = (number) => {
    const cleanNum = number.replace(/\D/g, '');
    if (/^4/.test(cleanNum)) return 'visa';
    if (/^5[1-5]/.test(cleanNum)) return 'master';
    if (/^3[47]/.test(cleanNum)) return 'amex';
    if (/^6/.test(cleanNum)) return 'elo'; 
    if (/^3(?:0[0-5]|[68][0-9])/.test(cleanNum)) return 'diners'; // Diners
    if (/^3(?:60|68|8)/.test(cleanNum)) return 'diners'; // Diners
    return 'visa'; // Fallback
  };

  useEffect(() => {
    if(!bookingData) { navigate('/'); return; }
    
    // Inicialização do SDK do MP com logs para debug
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
    // Retry caso o script demore um pouco
    setTimeout(initMP, 1500); 

    const fetchOwner = async () => {
        const docRef = doc(db, "users", bookingData.item.ownerId);
        const snap = await getDoc(docRef);
        if(snap.exists() && snap.data().mp_access_token) {
            setPartnerToken(snap.data().mp_access_token);
        }
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
    try {
        // 1. Salva no Firebase e captura a referência do documento criado
        const docRef = await addDoc(collection(db, "reservations"), {
          ...bookingData, 
          total: finalTotal,
          discount: discount,
          couponCode: couponCode ? couponCode.toUpperCase() : null,
          paymentMethod: paymentMethod,
          userId: user.uid, 
          ownerId: bookingData.item.ownerId,
          createdAt: new Date(), 
          status: 'confirmed', 
          guestName: user.displayName, 
          guestEmail: user.email
        });

        // 2. Pega o ID gerado para usar no voucher
        const voucherId = docRef.id.slice(0, 6).toUpperCase();

        // 3. Monta o HTML do E-mail (Bonito e organizado)
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #0097A8; padding: 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">Reserva Confirmada! 🎉</h1>
                </div>
                <div style="padding: 20px;">
                    <p>Olá, <strong>${user.displayName}</strong>!</p>
                    <p>Sua reserva para o Day Use foi realizada com sucesso. Estamos ansiosos para te receber!</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #0097A8;">${bookingData.item.name}</h3>
                        <p style="margin: 5px 0;"><strong>📅 Data:</strong> ${bookingData.date.split('-').reverse().join('/')}</p>
                        <p style="margin: 5px 0;"><strong>📍 Código do Voucher:</strong> <span style="font-size: 18px; font-weight: bold; background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px dashed #ccc;">${voucherId}</span></p>
                    </div>

                    <p>Para ver o QR Code de acesso e o endereço completo, acesse a área "Meus Ingressos" no site.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://mapadodayuse.com/minhas-viagens" style="background-color: #0097A8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold;">Ver Meu Voucher</a>
                    </div>
                </div>
                <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                    © 2026 Mapa do Day Use. Todos os direitos reservados.
                </div>
            </div>
        `;

        // 4. Dispara o envio do e-mail (Sem await para não travar a tela de sucesso)
        sendEmail(user.email, "Sua reserva foi confirmada! 🎟️", emailHtml);

        // 5. Finaliza a UI
        setProcessing(false);
        setShowSuccess(true);

    } catch (error) {
        console.error("Erro ao confirmar reserva:", error);
        alert("Houve um erro ao salvar sua reserva. Por favor, contate o suporte.");
        setProcessing(false);
    }
  };

  const processCardPayment = async () => {
     if(!partnerToken) { 
        if(confirm("MODO TESTE (Sem Parceiro): Deseja simular uma aprovação para testar o fluxo?")) {
            handleConfirm();
            return;
        }
        alert("Erro: O estabelecimento precisa conectar a conta para receber pagamentos.");
        return; 
     }
     
     // Sanitização
     const cleanDoc = docNumber.replace(/\D/g, ''); 
     // Fallback seguro para e-mail
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
             // Salva o ID do pagamento para o modal poder consultar
             setCreatedPaymentId(result.id); 
             setProcessing(false);
             setShowPixModal(true);
          } else {
             console.error("Erro Pix:", result);
             let errorMsg = result.message || JSON.stringify(result);
             if (errorMsg.includes("user_allowed_only_in_test")) {
                 errorMsg = "Erro de Ambiente: Conta de teste usada indevidamente. Use uma conta real.";
             }
             alert(`Não foi possível gerar o Pix: ${errorMsg}`);
             setProcessing(false);
          }
          return;
       }

       // --- FLUXO CARTÃO ---
       if (!window.mpInstance) {
           alert("Sistema de pagamento indisponível (SDK não carregou). Tente recarregar a página.");
           setProcessing(false);
           return;
       }

       const [month, year] = cardExpiry.split('/');
       
       if (!month || !year || cardNumber.length < 13 || cleanDoc.length === 0) {
           alert("Preencha todos os dados do cartão corretamente.");
           setProcessing(false);
           return;
       }

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

       console.log("Gerando token...");
       const tokenObj = await window.mpInstance.createCardToken(tokenParams);
       console.log("Token gerado:", tokenObj.id);
       
       const response = await fetch("/api/process-payment", { 
          method: "POST", 
          headers: { "Content-Type":"application/json" }, 
          body: JSON.stringify({ 
             token: tokenObj.id,
             payment_method_id: getPaymentMethodId(cardNumber), 
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
       
       if (response.ok && (result.status === 'approved' || result.status === 'in_process')) {
           handleConfirm();
       } else { 
           console.error("Erro Pagamento:", result);
           const errorMsg = result.message || (result.api_response ? JSON.stringify(result.api_response) : "Erro desconhecido");
           alert(`Pagamento recusado: ${errorMsg}`); 
           setProcessing(false); 
       }
     } catch (err) {
        console.error("Erro Catch:", err);
        alert(`Erro de comunicação: ${err.message}`);
        setProcessing(false);
     }
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-20 px-4">
      <SuccessModal isOpen={showSuccess} onClose={()=>setShowSuccess(false)} title="Pagamento Aprovado!" message="Sua reserva foi confirmada. Acesse seu voucher." onAction={()=>navigate('/minhas-viagens')} actionLabel="Meus Ingressos"/>
      
      {/* MODAL PIX COM VERIFICAÇÃO AUTOMÁTICA */}
      <PixModal 
          isOpen={showPixModal} 
          onClose={()=>setShowPixModal(false)} 
          pixData={pixData} 
          onConfirm={handleConfirm}
          paymentId={createdPaymentId}
          partnerToken={partnerToken}
      />
      
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

        {/* Resumo Lateral */}
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

  // Utiliza Portal para garantir que o modal fique sobreposto corretamente (estilo 'fixed')
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

            <div className="space-y-4">
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Data</span><b className="text-slate-900 text-lg">{trip.date?.split('-').reverse().join('/')}</b></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Titular</span><b className="text-slate-900">{trip.guestName}</b></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Pagamento</span><b className="text-slate-900 capitalize">{paymentLabel}</b></div>
            </div>

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
  const [staffList, setStaffList] = useState([]); // NOVO: Lista de equipe
  
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
           
           // Queries principais
           const qDay = query(collection(db, "dayuses"), where("ownerId", "==", u.uid));
           const qRes = query(collection(db, "reservations"), where("ownerId", "==", u.uid));
           
           // NOVO: Query para buscar a equipe
           const qStaff = query(collection(db, "users"), where("ownerId", "==", u.uid));
           
           onSnapshot(qDay, s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
           onSnapshot(qRes, s => setReservations(s.docs.map(d => ({id: d.id, ...d.data()}))));
           onSnapshot(qStaff, s => setStaffList(s.docs.map(d => ({id: d.id, ...d.data()}))));
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

  // --- GESTÃO DE EQUIPE ---
  
  const handleAddStaff = async (e) => {
      e.preventDefault();
      setStaffLoading(true);
      try {
          const secondaryApp = initializeApp(getApp().options, "Secondary");
          const secondaryAuth = getAuth(secondaryApp);
          
          const createdUser = await createUserWithEmailAndPassword(secondaryAuth, staffEmail, staffPass);
          
          await setDoc(doc(db, "users", createdUser.user.uid), {
              email: staffEmail,
              role: 'staff',
              ownerId: user.uid,
              createdAt: new Date(),
              name: "Portaria"
          });
          
          await signOut(secondaryAuth);
          setFeedback({ type: 'success', title: 'Equipe Cadastrada!', msg: `Usuário ${staffEmail} criado.` });
          setStaffEmail(''); setStaffPass('');
      } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', title: 'Erro ao cadastrar', msg: err.code === 'auth/email-already-in-use' ? 'E-mail já existe.' : 'Verifique os dados.' });
      } finally {
          setStaffLoading(false);
      }
  };

  const handleDeleteStaff = async (staffId) => {
      if(confirm("Deseja realmente remover este acesso? O funcionário não conseguirá mais logar.")) {
          try {
              // Remove do banco de dados (o que bloqueia o acesso no Layout/StaffDashboard)
              await deleteDoc(doc(db, "users", staffId));
              setFeedback({ type: 'success', title: 'Removido', msg: 'Acesso revogado com sucesso.' });
          } catch (e) {
              setFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível remover.' });
          }
      }
  };

  const handleResetStaffPassword = async (email) => {
      if(confirm(`Enviar e-mail de redefinição de senha para ${email}?`)) {
          try {
              await sendPasswordResetEmail(auth, email);
              setFeedback({ type: 'success', title: 'E-mail Enviado', msg: 'O funcionário receberá um link para criar uma nova senha.' });
          } catch (e) {
              setFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível enviar o e-mail.' });
          }
      }
  };

  if (!user) return <div className="text-center py-20 text-slate-400">Carregando painel...</div>;

  // Cálculos Financeiros (Mantidos)
  const financialRes = reservations.filter(r => new Date(r.createdAt.seconds * 1000).getMonth() === filterMonth && r.status === 'confirmed');
  const totalBalance = financialRes.reduce((acc, c) => acc + (c.total || 0), 0);
  const platformFee = totalBalance * 0.20;
  const estimatedMPFees = totalBalance * 0.0499;
  const netBalance = totalBalance - platformFee - estimatedMPFees;
  const pixTotal = financialRes.filter(r => r.paymentMethod === 'pix').reduce((acc, c) => acc + (c.total || 0), 0);
  const cardTotal = totalBalance - pixTotal; 
  const dailyGuests = reservations.filter(r => r.date === filterDate && (r.guestName || "Viajante").toLowerCase().includes(searchTerm.toLowerCase()));
  const dailyStats = dailyGuests.reduce((acc, curr) => ({ adults: acc.adults + (curr.adults || 0), children: acc.children + (curr.children || 0), pets: acc.pets + (curr.pets || 0), total: acc.total + (curr.adults || 0) + (curr.children || 0) }), { adults: 0, children: 0, pets: 0, total: 0 });
  const allCouponsUsed = reservations.filter(r => r.discount > 0).length;
  const couponBreakdown = reservations.reduce((acc, r) => { if (r.discount > 0) { const code = r.couponCode || "OUTROS"; acc[code] = (acc[code] || 0) + 1; } return acc; }, {});

  return (
     <div className="max-w-7xl mx-auto py-12 px-4 animate-fade-in space-y-12">
        <VoucherModal isOpen={!!selectedRes} trip={selectedRes} onClose={()=>setSelectedRes(null)} isPartnerView={true}/>
        <QrScannerModal isOpen={showScanner} onClose={()=>setShowScanner(false)} onScan={onScanSuccess} />
        
        {feedback && createPortal(<ModalOverlay onClose={() => setFeedback(null)}><div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"><div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${feedback.type === 'success' ? 'bg-green-100 text-green-600' : feedback.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>{feedback.type === 'success' ? <CheckCircle size={32}/> : feedback.type === 'warning' ? <AlertCircle size={32}/> : <X size={32}/>}</div><h2 className="text-xl font-bold mb-2">{feedback.title}</h2><p className="mb-4 text-slate-600">{feedback.msg}</p><Button onClick={() => setFeedback(null)} className="w-full justify-center">Fechar</Button></div></ModalOverlay>, document.body)}
        
        {confirmAction && createPortal(<ModalOverlay onClose={() => setConfirmAction(null)}><div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"><h2 className="text-xl font-bold mb-4">{confirmAction.type === 'pause' ? 'Pausar Anúncio?' : 'Reativar Anúncio?'}</h2><div className="flex gap-2"><Button onClick={() => setConfirmAction(null)} variant="ghost" className="flex-1 justify-center">Cancelar</Button><Button onClick={executeAction} className={`flex-1 justify-center ${confirmAction.type === 'pause' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>{confirmAction.type === 'pause' ? 'Pausar' : 'Reativar'}</Button></div></div></ModalOverlay>, document.body)}
        
        {/* CABEÇALHO COM ALINHAMENTO CORRIGIDO */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-8 border-b border-slate-200 pb-4 gap-4">
           <div className="text-center md:text-left">
               <h1 className="text-3xl font-bold text-slate-900">Painel de Gestão</h1>
               <p className="text-slate-500">Acompanhe seu negócio.</p>
           </div>
           
           <div className="flex flex-col md:flex-row gap-2 items-center w-full md:w-auto">
              {!mpConnected ? (
                  <Button onClick={handleConnect} className="bg-blue-500 hover:bg-blue-600 w-full md:w-auto text-sm">Conectar Mercado Pago</Button>
              ) : (
                  <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                      {tokenType === 'TEST' && <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200 text-center w-full md:w-auto">⚠️ SANDBOX</div>}
                      {tokenType === 'PROD' && <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200 text-center w-full md:w-auto">✅ PRODUÇÃO</div>}
                      <div className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold flex gap-2 items-center justify-center border border-slate-200 w-full md:w-auto"><CheckCircle size={18} className="text-green-600"/> Conectado</div>
                  </div>
              )}
              <Button onClick={()=>navigate('/partner/new')} className="w-full md:w-auto">+ Criar Anúncio</Button>
           </div>
        </div>

        {/* FINANCEIRO */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold flex gap-2 text-slate-800"><DollarSign/> Financeiro</h2>
              <select className="border p-2 rounded-lg bg-slate-50 text-sm font-medium" value={filterMonth} onChange={e=>setFilterMonth(Number(e.target.value))}>{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
           </div>
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

        {/* LISTA DE PRESENÇA */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
              <h2 className="text-xl font-bold flex gap-2 text-slate-800"><List/> Lista de Presença</h2>
              <div className="flex gap-4"><input type="date" className="border p-2 rounded-lg text-slate-600 font-medium" value={filterDate} onChange={e=>setFilterDate(e.target.value)}/><Button variant="outline" onClick={() => setShowScanner(true)}><ScanLine size={18}/> Validar Ingresso</Button></div>
           </div>
           
           <div className="mb-6 bg-indigo-50 rounded-xl p-4 border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors" onClick={()=>setExpandedStats(!expandedStats)}>
               <div className="flex justify-between items-center"><span className="font-bold text-indigo-900 flex items-center gap-2"><Users size={18}/> Total Esperado Hoje: {dailyStats.total} pessoas</span><ChevronDown size={16} className={`text-indigo-900 transition-transform ${expandedStats ? 'rotate-180' : ''}`}/></div>
               {expandedStats && (<div className="mt-4 pt-4 border-t border-indigo-200 grid grid-cols-3 gap-4 text-center text-sm animate-fade-in"><div className="bg-white p-2 rounded-lg border border-indigo-100"><p className="font-bold text-xl text-indigo-700">{dailyStats.adults}</p><span className="text-indigo-400 text-xs font-bold uppercase">Adultos</span></div><div className="bg-white p-2 rounded-lg border border-indigo-100"><p className="font-bold text-xl text-indigo-700">{dailyStats.children}</p><span className="text-indigo-400 text-xs font-bold uppercase">Crianças</span></div><div className="bg-white p-2 rounded-lg border border-indigo-100"><p className="font-bold text-xl text-indigo-700">{dailyStats.pets}</p><span className="text-indigo-400 text-xs font-bold uppercase">Pets</span></div></div>)}
           </div>
           
           <div className="space-y-4">
              <div className="relative"><Search size={18} className="absolute left-3 top-3.5 text-slate-400"/><input className="w-full border p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-[#0097A8] transition-all" placeholder="Buscar viajante por nome..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
              {dailyGuests.length === 0 ? <p className="text-center text-slate-400 py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhum viajante agendado para esta data.</p> : dailyGuests.map(r => (
                 <div key={r.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-white hover:shadow-md transition-shadow rounded-xl border border-slate-200 gap-4">
                    <div className="flex-1"><p className="font-bold text-lg text-slate-900">{r.guestName}</p><p className="text-sm text-slate-500 font-mono">#{r.id.slice(0,6).toUpperCase()} • {r.itemName}</p><div className="flex gap-2 mt-2 text-xs text-slate-600">{r.adults > 0 && <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">{r.adults} Adultos</span>}{r.children > 0 && <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">{r.children} Crianças</span>}{r.pets > 0 && <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium flex items-center gap-1"><PawPrint size={10}/> {r.pets} Pet</span>}</div></div>
                    <div className="flex items-center gap-2">{r.status === 'validated' ? <div className="px-4 py-2 bg-green-50 text-green-700 font-bold rounded-xl flex items-center gap-2 border border-green-100"><CheckCircle size={18}/> Validado</div> : <div className="flex gap-2"><input id={`code-${r.id}`} className="border p-2 rounded-xl w-24 text-center uppercase font-bold text-slate-700 tracking-wider" placeholder="CÓDIGO" maxLength={6}/><Button onClick={()=>handleValidate(r.id, document.getElementById(`code-${r.id}`).value)} className="h-full py-2 shadow-none">Validar</Button></div>}<Button variant="outline" className="h-full py-2 px-3 rounded-xl" onClick={()=>setSelectedRes(r)}><Info size={18}/></Button></div>
                 </div>
              ))}
           </div>
        </div>
        
        {/* MEUS ANÚNCIOS */}
        <div>
           <h2 className="text-xl font-bold mb-6 text-slate-900">Meus Anúncios</h2>
           <div className="grid md:grid-cols-2 gap-6">
              {items.map(i => (
                 <div key={i.id} className={`bg-white p-4 border rounded-2xl flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow relative ${i.paused ? 'opacity-75 bg-slate-50 border-slate-200' : 'border-slate-100'}`}>
                    {i.paused && (<div className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200">PAUSADO</div>)}
                    <img src={i.image} className={`w-24 h-24 rounded-xl object-cover bg-slate-200 ${i.paused ? 'grayscale' : ''}`}/>
                    <div className="flex-1">
                       <h4 className="font-bold text-lg text-slate-900 leading-tight">{i.name}</h4>
                       <p className="text-sm text-slate-500 mb-2">{i.city}</p>
                       <p className="text-sm font-bold text-[#0097A8] bg-cyan-50 w-fit px-2 py-1 rounded-lg">{formatBRL(i.priceAdult)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button variant="outline" className="px-3 h-8 text-xs" onClick={()=>navigate(`/partner/edit/${i.id}`)}><Edit size={14}/> Editar</Button>
                        <button onClick={() => togglePause(i)} className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors flex items-center justify-center gap-1 ${i.paused ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>{i.paused ? <><CheckCircle size={12}/> Reativar</> : <><Ban size={12}/> Pausar</>}</button>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* GESTÃO DE EQUIPE (PORTARIA) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800"><Users/> Gerenciar Equipe</h2>
            <div className="grid md:grid-cols-2 gap-8">
                
                {/* LISTA DE FUNCIONÁRIOS */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Membros Ativos</h3>
                    {staffList.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Nenhum funcionário cadastrado.</p>
                    ) : (
                        <ul className="space-y-3">
                            {staffList.map(staff => (
                                <li key={staff.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                            {staff.email[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">{staff.email}</span>
                                            <span className="text-[10px] text-slate-400">Portaria</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleResetStaffPassword(staff.email)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Redefinir Senha">
                                            <Lock size={16}/>
                                        </button>
                                        <button onClick={() => handleDeleteStaff(staff.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remover Acesso">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* FORMULÁRIO DE CADASTRO */}
                <div>
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Cadastrar Novo</h3>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <form onSubmit={handleAddStaff} className="space-y-4">
                            <input className="w-full border p-3 rounded-xl bg-white" placeholder="E-mail do funcionário" value={staffEmail} onChange={e=>setStaffEmail(e.target.value)} required />
                            <input className="w-full border p-3 rounded-xl bg-white" placeholder="Senha de acesso" type="password" value={staffPass} onChange={e=>setStaffPass(e.target.value)} required />
                            <Button type="submit" disabled={staffLoading} className="w-full">{staffLoading ? 'Cadastrando...' : 'Criar Acesso'}</Button>
                        </form>
                        <p className="text-xs text-slate-400 mt-4 text-center">O usuário terá acesso restrito apenas à lista de presença e validação.</p>
                    </div>
                </div>
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
  const [dailyStock, setDailyStock] = useState({ adults: 50, children: 20, pets: 5 });
  const [weeklyPrices, setWeeklyPrices] = useState({});
  const [cnpjError, setCnpjError] = useState(false);

  // States para Checkboxes (Multi-select)
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

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
                if(d.amenities) setSelectedAmenities(d.amenities);
                if(d.meals) setSelectedMeals(d.meals);
                if(d.blockedDates) setBlockedDates(d.blockedDates);
            }
        });
     }
     return unsub;
  }, [id]);

  const handleCepBlur = async () => { if (formData.cep?.replace(/\D/g, '').length === 8) { setCepLoading(true); try { const response = await fetch(`https://viacep.com.br/ws/${formData.cep}/json/`); const data = await response.json(); if (!data.erro) setFormData(prev => ({ ...prev, street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf })); } catch (error) { console.error("Erro CEP:", error); } finally { setCepLoading(false); } } };
  const handleCnpjChange = (e) => { const val = e.target.value; setFormData({...formData, cnpj: val}); const nums = val.replace(/\D/g, ''); if (nums.length > 0 && nums.length !== 14) setCnpjError(true); else setCnpjError(false); };
  
  // --- NOVA LÓGICA DE UPLOAD COM COMPRESSÃO ---
  const handleFileUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      // Feedback visual simples
      const label = e.target.parentNode; 
      if(label) label.style.opacity = '0.5';

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          // Cria um canvas para redimensionar
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Define largura máxima de 800px para ficar leve
          const scaleSize = MAX_WIDTH / img.width;
          
          // Se a imagem já for pequena, mantém. Se for grande, reduz.
          if (scaleSize < 1) {
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
          } else {
              canvas.width = img.width;
              canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Converte para JPEG com 70% de qualidade (Base64 Otimizado)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

          const newImages = [...formData.images];
          newImages[index] = compressedDataUrl;
          setFormData({ ...formData, images: newImages });
          
          if(label) label.style.opacity = '1';
        };
      };
    }
  };

  const removeImage = (index) => { const newImages = [...formData.images]; newImages[index] = ''; setFormData({ ...formData, images: newImages }); };
  // --------------------------------------------

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

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!validateCNPJ(formData.cnpj)) { alert("CNPJ inválido (deve ter 14 dígitos)."); return; }
    if (!formData.localWhatsapp) { alert("O WhatsApp do local é obrigatório."); return; }
    
    setLoading(true);

    // CORREÇÃO: Mapeia o array de 'images' para campos individuais (image, image2...) 
    // para garantir compatibilidade com a Home e a Página de Detalhes
    const imageFields = {};
    formData.images.forEach((img, index) => {
        if (index === 0) imageFields.image = img; // Capa
        else imageFields[`image${index + 1}`] = img; // image2, image3...
    });

    const dataToSave = { 
        ...formData, 
        ...imageFields, // Espalha as imagens nos campos corretos
        ownerId: user.uid, 
        coupons, 
        dailyStock, 
        weeklyPrices,
        blockedDates, 
        amenities: selectedAmenities, 
        meals: selectedMeals,         
        priceAdult: Number(formData.priceAdult), 
        slug: generateSlug(formData.name), 
        updatedAt: new Date() 
    };
    
    try { 
        if (id) await updateDoc(doc(db, "dayuses", id), dataToSave);
        else await addDoc(collection(db, "dayuses"), { ...dataToSave, createdAt: new Date() });
        navigate('/partner'); 
    } catch (err) { 
        console.error("Erro ao salvar:", err);
        alert("Erro ao salvar. Se as imagens forem muito pesadas, tente reduzir a quantidade."); 
    } finally { setLoading(false); }
  };

  const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
     <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 text-center text-slate-900">{id ? 'Editar Anúncio' : 'Cadastrar Novo Day Use'}</h1>
        
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-8">
           
           {/* 1. DADOS PESSOAIS */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">1. Dados do Responsável</h3></div>
              <div className="grid grid-cols-2 gap-4">
                 <input className="w-full border p-3 rounded-xl bg-slate-50" value={formData.contactName} readOnly />
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
                  <input className="w-full border p-3 rounded-xl bg-slate-50" value={formData.city} readOnly/>
                  <input className="w-full border p-3 rounded-xl bg-slate-50" value={formData.state} readOnly/>
              </div>
              <input className="w-full border p-3 rounded-xl" placeholder="Logradouro" value={formData.street} onChange={e=>setFormData({...formData, street: e.target.value})} required/>
           </div>

           {/* 3. SOBRE (COM UPLOAD OTIMIZADO) */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">3. Sobre a Experiência</h3></div>
              <textarea className="w-full border p-3 rounded-xl h-32" placeholder="Descrição completa..." value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} required/>
              <input className="w-full border p-3 rounded-xl" placeholder="Link do YouTube (Op)" value={formData.videoUrl} onChange={e=>setFormData({...formData, videoUrl: e.target.value})} />
              
              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">Galeria de Fotos</label>
                  <p className="text-xs text-slate-500 mb-3">Carregue até 6 fotos. O sistema otimiza automaticamente para não pesar.</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((img, i) => (
                        <div key={i} className="relative aspect-video bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0097A8] transition-colors flex items-center justify-center overflow-hidden group">
                            {img ? (
                                <>
                                    <img src={img} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                    >
                                        <Trash2 size={24}/>
                                    </button>
                                </>
                            ) : (
                                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-[#0097A8]">
                                    <ImageIcon size={24} className="mb-1"/>
                                    <span className="text-xs font-bold">{i === 0 ? "Capa" : `Foto ${i+1}`}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(i, e)} />
                                </label>
                            )}
                        </div>
                    ))}
                  </div>
              </div>
           </div>
           
           {/* 4. FUNCIONAMENTO */}
           <div className="space-y-6">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">4. Funcionamento e Valores</h3></div>
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100"><tr><th className="px-4 py-3">Dia</th><th className="px-4 py-3">Adulto</th><th className="px-4 py-3">Criança</th><th className="px-4 py-3">Pet</th></tr></thead>
                    <tbody>
                        {weekDays.map((day, index) => {
                            const isActive = formData.availableDays.includes(index);
                            return (
                                <tr key={index} className={`border-b ${isActive ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
                                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={() => toggleDay(index)} className="accent-[#0097A8] w-4 h-4"/>{day}</td>
                                    <td className="px-4 py-2"><input disabled={!isActive} className="border p-2 rounded w-24" placeholder="Padrão" type="number" value={weeklyPrices[index]?.adult || ''} onChange={(e) => handleWeeklyPriceChange(index, 'adult', e.target.value)}/></td>
                                    <td className="px-4 py-2"><input disabled={!isActive} className="border p-2 rounded w-24" placeholder="Padrão" type="number" value={weeklyPrices[index]?.child || ''} onChange={(e) => handleWeeklyPriceChange(index, 'child', e.target.value)}/></td>
                                    <td className="px-4 py-2"><input disabled={!isActive} className="border p-2 rounded w-24" placeholder="Padrão" type="number" value={weeklyPrices[index]?.pet || ''} onChange={(e) => handleWeeklyPriceChange(index, 'pet', e.target.value)}/></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
              </div>

              {/* Calendário de Gestão */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4"><h4 className="font-bold text-slate-700 text-sm">Gerenciar Datas Específicas</h4><div className="flex gap-2"><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth()-1)))} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={16}/></button><span className="text-sm font-bold capitalize">{calendarMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth()+1)))} className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={16}/></button></div></div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-bold text-slate-400">{["D","S","T","Q","Q","S","S"].map(d=><span>{d}</span>)}</div>
                  <div className="grid grid-cols-7 gap-1">{renderManagementCalendar()}</div>
                  <div className="flex gap-4 mt-2 text-xs justify-center"><span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div> Aberto</span><span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div> Bloqueado</span><span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-50 border border-slate-200 rounded"></div> Fechado (Padrão)</span></div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <p className="text-sm font-bold text-slate-700 mb-2">Preços Base</p>
                 <div className="grid grid-cols-3 gap-4">
                    <input className="border p-3 rounded-xl w-full" type="number" placeholder="Adulto Base" value={formData.priceAdult} onChange={e=>setFormData({...formData, priceAdult: e.target.value})} required/>
                    <input className="border p-3 rounded-xl w-full" type="number" placeholder="Criança Base" value={formData.priceChild} onChange={e=>setFormData({...formData, priceChild: e.target.value})}/>
                    <input className="border p-3 rounded-xl w-full" type="number" placeholder="Pet Base" value={formData.petFee} onChange={e=>setFormData({...formData, petFee: e.target.value})}/>
                 </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className="text-sm font-bold text-slate-700 block mb-2">Capacidade Diária</label>
                 <div className="flex gap-4">
                    <div className="w-full"><span className="text-xs text-slate-500">Max. Adultos</span><input className="border p-2 rounded w-full" type="number" value={dailyStock.adults} onChange={e=>setDailyStock({...dailyStock, adults: Number(e.target.value)})}/></div>
                    <div className="w-full"><span className="text-xs text-slate-500">Max. Crianças</span><input className="border p-2 rounded w-full" type="number" value={dailyStock.children} onChange={e=>setDailyStock({...dailyStock, children: Number(e.target.value)})}/></div>
                    <div className="w-full"><span className="text-xs text-slate-500">Max. Pets</span><input className="border p-2 rounded w-full" type="number" value={dailyStock.pets} onChange={e=>setDailyStock({...dailyStock, pets: Number(e.target.value)})}/></div>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Regras de Idade</label>
                      <div className="flex items-center gap-2"><span className="text-sm text-slate-600">Adulto: </span><input className="border p-2 rounded w-16 text-center" type="number" value={formData.adultAgeStart} onChange={e=>setFormData({...formData, adultAgeStart: e.target.value})} /><span className="text-sm text-slate-600">anos</span></div>
                      <div className="flex items-center gap-2"><span className="text-sm text-slate-600">Criança:</span><input className="border p-2 rounded w-16 text-center" type="number" value={formData.childAgeStart} onChange={e=>setFormData({...formData, childAgeStart: e.target.value})} /><span className="text-sm text-slate-600">a</span><input className="border p-2 rounded w-16 text-center" type="number" value={formData.childAgeEnd} onChange={e=>setFormData({...formData, childAgeEnd: e.target.value})} /><span className="text-sm text-slate-600">anos</span></div>
                  </div>
                  <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Pets e Gratuidade</label>
                      <div><select className="border p-2 rounded w-full bg-white" value={formData.petSize} onChange={e=>setFormData({...formData, petSize: e.target.value})}><option>Não aceita</option><option>Pequeno</option><option>Médio</option><option>Grande</option><option>Todos os portes</option></select></div>
                      <div><input className="border p-2 rounded w-full" placeholder="Política de Gratuidade" value={formData.gratuitousness} onChange={e=>setFormData({...formData, gratuitousness: e.target.value})}/></div>
                  </div>
              </div>
              
              {/* CUPONS (Responsivo) */}
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mt-4">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-yellow-800">Criar Cupons</label>
                    <Tag size={16} className="text-yellow-600"/>
                 </div>
                 
                 <div className="flex flex-col md:flex-row gap-2 mb-2">
                    <input 
                        className="border p-2 rounded-lg flex-1 text-sm uppercase w-full" 
                        placeholder="CÓDIGO (Ex: VERAO10)" 
                        value={newCouponCode} 
                        onChange={e=>setNewCouponCode(e.target.value)} 
                    />
                    <div className="flex gap-2">
                        <input 
                            className="border p-2 rounded-lg w-24 text-sm" 
                            placeholder="Desc %" 
                            type="number" 
                            value={newCouponPerc} 
                            onChange={e=>setNewCouponPerc(e.target.value)} 
                        />
                        <Button onClick={addCoupon} className="py-2 px-4 text-xs bg-yellow-600 border-none flex-1 md:flex-none">
                            Add
                        </Button>
                    </div>
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

           {/* 5. INCLUSÕES E REGRAS (CHECKLISTS) */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">5. O que está incluso?</h3></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-2">Comodidades</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 h-60 overflow-y-auto custom-scrollbar">{AMENITIES_LIST.map(a => (<label key={a} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8]"><input type="checkbox" checked={selectedAmenities.includes(a)} onChange={()=>toggleAmenity(a)} className="accent-[#0097A8] w-4 h-4 rounded"/>{a}</label>))}</div></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-2">Alimentação</label><div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">{MEALS_LIST.map(m => (<label key={m} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8]"><input type="checkbox" checked={selectedMeals.includes(m)} onChange={()=>toggleMeal(m)} className="accent-[#0097A8] w-4 h-4 rounded"/>{m}</label>))}</div></div>
              <div><label className="text-sm font-bold text-red-600 block mb-1">O que NÃO está incluso?</label><textarea className="w-full border p-3 rounded-xl h-20 bg-red-50/30" placeholder="Ex: Bebidas..." value={formData.notIncludedItems} onChange={e=>setFormData({...formData, notIncludedItems: e.target.value})}/></div>
              
              <div><label className="text-sm font-bold text-slate-700 block mb-1">Regras de Utilização</label><textarea className="w-full border p-3 rounded-xl h-24" placeholder="Ex: Proibido som..." value={formData.usageRules} onChange={e=>setFormData({...formData, usageRules: e.target.value})}/></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-1">Política de Cancelamento</label><textarea className="w-full border p-3 rounded-xl h-24" placeholder="Ex: Até 24h antes..." value={formData.cancellationPolicy} onChange={e=>setFormData({...formData, cancellationPolicy: e.target.value})}/></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-1">Observações Gerais</label><textarea className="w-full border p-3 rounded-xl h-20" placeholder="Outras informações..." value={formData.observations} onChange={e=>setFormData({...formData, observations: e.target.value})}/></div>
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

// --- ESTRUTURA PRINCIPAL ---
// ...

const Layout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [logoError, setLogoError] = useState(false); 
  const navigate = useNavigate();
  const { pathname } = useLocation(); // Hook para saber a página atual

  // 1. CORREÇÃO DE SCROLL: Rola para o topo sempre que a rota mudar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
       if(u) {
          const snap = await getDoc(doc(db, "users", u.uid));
          setUser({ ...u, role: snap.data()?.role || 'user' });
       } else setUser(null);
    });
  }, []);

  // Efeito para definir o Favicon dinamicamente
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
           {/* LOGO NO HEADER */}
           <div className="flex items-center gap-2 cursor-pointer" onClick={()=>navigate('/')}>
              {!logoError ? (
                 <img 
                    src="/logo.png" 
                    alt="Mapa do Day Use" 
                    className="h-10 w-auto object-contain" 
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        setLogoError(true); 
                    }} 
                 />
              ) : (
                 <MapIcon className="h-8 w-8 text-[#0097A8]" />
              )}
           </div>
           
           <div className="flex items-center gap-2 md:gap-4">
              {!user ? (
                 <>
                   {/* 2. CORREÇÃO MOBILE: Removido 'hidden', ajustado tamanho da fonte */}
                   <button onClick={()=>{navigate('/partner-register')}} className="text-xs md:text-sm font-bold text-slate-500 hover:text-[#0097A8] mr-2">Seja parceiro</button>
                   <Button variant="ghost" onClick={()=>setShowLogin(true)} className="font-bold px-3 md:px-4">Entrar</Button>
                 </>
              ) : (
                 <div className="flex gap-2 md:gap-4 items-center">
                    {/* Botões do Header condicionados ao Perfil */}
                    {user.role === 'partner' && <Button variant="ghost" onClick={()=>navigate('/partner')} className="px-2 md:px-4 text-xs md:text-sm">Painel</Button>}
                    
                    {user.role === 'staff' && <Button variant="ghost" onClick={()=>navigate('/portaria')} className="px-2 md:px-4 text-xs md:text-sm">Portaria</Button>}
                    
                    {user.role !== 'partner' && user.role !== 'staff' && (
                        <Button variant="ghost" onClick={()=>navigate('/minhas-viagens')} className="hidden md:flex">Meus Ingressos</Button>
                    )}

                    {/* 3. CORREÇÃO DE CLIQUE NO AVATAR: Mudado de div para button para melhor resposta ao toque */}
                    <button 
                        className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center font-bold text-[#0097A8] border-2 border-white shadow-sm hover:scale-105 transition-transform" 
                        title={user.email}
                        onClick={()=>navigate('/profile')}
                    >
                        {user.email[0].toUpperCase()}
                    </button>
                    
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50" title="Sair"><LogOut size={20}/></button>
                 </div>
              )}
           </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>
      
      <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
         <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
               <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={()=>navigate('/')}>
                     {!logoError ? (
                        <img 
                           src="/logo.png" 
                           alt="Mapa do Day Use" 
                           className="h-8 w-auto object-contain" 
                           onError={() => setLogoError(true)} 
                        />
                     ) : (
                        <MapIcon className="h-6 w-6 text-[#0097A8]" />
                     )}
                  </div>
                  <p className="text-slate-500 text-sm mb-6 max-w-sm leading-relaxed">
                     A plataforma completa para você descobrir e reservar experiências incríveis de Day Use perto de você.
                  </p>
                  <a href="mailto:contato@mapadodayuse.com" className="flex items-center gap-2 text-slate-600 hover:text-[#0097A8] transition-colors font-medium text-sm">
                     <Mail size={16} /> contato@mapadodayuse.com
                  </a>
               </div>
               
               <div>
                  <h4 className="font-bold text-slate-900 mb-4">Institucional</h4>
                  <ul className="space-y-3 text-sm text-slate-500">
                     <li><button onClick={() => navigate('/politica-de-privacidade')} className="hover:text-[#0097A8] transition-colors">Política de Privacidade</button></li>
                     <li><button onClick={() => navigate('/termos-de-uso')} className="hover:text-[#0097A8] transition-colors">Termos de Uso</button></li>
                     <li><button onClick={() => navigate('/partner-register')} className="hover:text-[#0097A8] transition-colors">Seja um Parceiro</button></li>
                  </ul>
               </div>

               <div>
                  <h4 className="font-bold text-slate-900 mb-4">Siga-nos</h4>
                  <div className="flex gap-3">
                     <a href="https://instagram.com/mapadodayuse" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-slate-50 hover:bg-pink-50 text-slate-400 hover:text-[#E1306C] transition-all border border-slate-100 hover:border-pink-200">
                        <Instagram size={20} />
                     </a>
                     <a href="https://tiktok.com/@mapadodayuse" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-slate-50 hover:bg-gray-100 text-slate-400 hover:text-black transition-all border border-slate-100 hover:border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                     </a>
                  </div>
               </div>
            </div>
            
            <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
               <p>© 2026 Belo Horizonte, MG. Todos os direitos reservados.</p>
               <p className="flex items-center gap-1">
                  Feito com carinho por <a href="https://instagram.com/iurifrancast" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-600 hover:text-[#0097A8] transition-colors">Iuri França</a>
               </p>
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

  return (
     <div onClick={onClick} className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden border border-slate-100 group flex flex-col h-full relative">
        <div className="h-64 relative overflow-hidden">
            <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
            
            {/* ETICA DE DESCONTO (SUBSTITUIU ESTRELAS) */}
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
               <span className="text-sm font-semibold text-[#0097A8] bg-cyan-50 px-4 py-2 rounded-xl group-hover:bg-[#0097A8] group-hover:text-white transition-all">Reservar</span>
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
  const [showMobileFilters, setShowMobileFilters] = useState(false); // Novo state para mobile

  // Filtros
  const [maxPrice, setMaxPrice] = useState("");
  const [filterCity, setFilterCity] = useState(cityParam || "");
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedPets, setSelectedPets] = useState([]);

  // SEO
  const stateName = STATE_NAMES[stateParam?.toUpperCase()] || stateParam?.toUpperCase();
  const locationTitle = cityParam 
    ? `${cityParam.charAt(0).toUpperCase() + cityParam.slice(1).replace(/-/g, ' ')}, ${stateParam?.toUpperCase()}` 
    : stateName;
    
  useSEO(`Day Uses em ${locationTitle}`, `Encontre os melhores Day Uses em ${locationTitle}.`);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const q = query(collection(db, "dayuses"));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
      const stateItems = data.filter(i => getStateSlug(i.state) === stateParam?.toLowerCase());
      setItems(stateItems);
      setLoading(false);
    };
    fetchItems();
  }, [stateParam]);

  // Lógica de Filtragem (Mantida)
  useEffect(() => {
    let result = items;
    if (cityParam) result = result.filter(i => generateSlug(i.city) === cityParam);
    else if (filterCity) result = result.filter(i => generateSlug(i.city) === filterCity);
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
  }, [items, cityParam, filterCity, maxPrice, selectedAmenities, selectedMeals, selectedDays, selectedPets]);

  const toggleFilter = (list, setList, item) => {
      if (list.includes(item)) setList(list.filter(i => i !== item));
      else setList([...list, item]);
  };

  const availableCities = [...new Set(items.map(i => i.city))].sort();

  if (loading) return <div className="text-center py-20 text-slate-400">Buscando melhores opções...</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-fade-in">
        
        {/* TÍTULO PRINCIPAL (Agora fora das colunas para aparecer sempre) */}
        <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 capitalize">Day Uses em {locationTitle}</h1>
            <p className="text-slate-500">{filteredItems.length} opções encontradas</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
            
            {/* BOTÃO MOBILE PARA ABRIR FILTROS */}
            <div className="md:hidden mb-4">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => setShowMobileFilters(!showMobileFilters)}>
                    <Filter size={18}/> {showMobileFilters ? "Fechar Filtros" : "Filtrar Busca"}
                </Button>
            </div>

            {/* BARRA LATERAL (Escondida no mobile a menos que ativada) */}
            <div className={`w-full md:w-1/4 space-y-6 h-fit sticky top-24 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2"><List size={18}/> Filtros</h3>
                        <button onClick={()=>{setMaxPrice(""); setSelectedAmenities([]); setSelectedMeals([]); setSelectedDays([]); setSelectedPets([]); setFilterCity("")}} className="text-xs text-[#0097A8] font-bold hover:underline">Limpar</button>
                    </div>
                    
                    {!cityParam && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Cidade</label>
                            <select className="w-full p-2 border rounded-xl text-sm bg-slate-50" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
                                <option value="">Todas as cidades</option>
                                {availableCities.map(c => <option key={c} value={generateSlug(c)}>{c}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Preço Máximo (Adulto)</label>
                        <div className="flex items-center gap-2 border rounded-xl p-2 bg-white">
                            <span className="text-slate-400 text-sm">R$</span>
                            <input type="number" placeholder="0,00" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="w-full outline-none text-sm"/>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Dias de Funcionamento</label>
                        <div className="flex flex-wrap gap-2">
                             {WEEK_DAYS.map((d, i) => (
                                 <button key={i} onClick={()=>toggleFilter(selectedDays, setSelectedDays, i)} className={`text-xs px-2 py-1 rounded border transition-colors ${selectedDays.includes(i) ? 'bg-[#0097A8] text-white border-[#0097A8]' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>{d.slice(0,3)}</button>
                             ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Pensão / Refeições</label>
                        {MEALS_LIST.map(m => (
                            <label key={m} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8] mb-1">
                                <input type="checkbox" checked={selectedMeals.includes(m)} onChange={()=>toggleFilter(selectedMeals, setSelectedMeals, m)} className="accent-[#0097A8] rounded"/> {m}
                            </label>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Pets</label>
                        {["Aceita animais de pequeno porte", "Aceita animais de médio porte", "Aceita animais de grande porte", "Não aceita animais"].map(p => (
                            <label key={p} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8] mb-1">
                                <input type="checkbox" checked={selectedPets.includes(p)} onChange={()=>toggleFilter(selectedPets, setSelectedPets, p)} className="accent-[#0097A8] rounded"/> {p}
                            </label>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Comodidades</label>
                        <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {AMENITIES_LIST.map(a => (
                                <label key={a} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8]">
                                    <input type="checkbox" checked={selectedAmenities.includes(a)} onChange={()=>toggleFilter(selectedAmenities, setSelectedAmenities, a)} className="accent-[#0097A8] rounded"/> {a}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* LISTAGEM */}
            <div className="flex-1">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400">Nenhum local encontrado com esses filtros.</p>
                        <button onClick={()=>{setMaxPrice(""); setSelectedAmenities([]); setSelectedMeals([]); setSelectedDays([]); setSelectedPets([]); setFilterCity("")}} className="text-[#0097A8] font-bold mt-2 hover:underline">Limpar Todos Filtros</button>
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
      </Routes>
  );
};

export default App;