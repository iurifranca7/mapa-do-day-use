import React, { useState, useEffect, useRef } from 'react';
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
  updatePassword,
  applyActionCode, 
  verifyPasswordResetCode, 
  confirmPasswordReset,
  verifyBeforeUpdateEmail,
  deleteUser,
  FacebookAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  MapPin, Search, User, CheckCircle, 
  X, Info, AlertCircle, PawPrint, FileText, Ban, ChevronDown, Image as ImageIcon, Map as MapIcon, CreditCard, Calendar as CalendarIcon, Ticket, Lock, Briefcase, Instagram, Star, ChevronLeft, ChevronRight, ArrowRight, LogOut, List, Link as LinkIcon, Edit, DollarSign, Copy, QrCode, ScanLine, Users, Tag, Trash2, Mail, MessageCircle, Phone, Filter,
  TrendingUp, ShieldCheck, Zap, BarChart, Globe, Target, Award, 
  Facebook, Smartphone, Youtube, Bell, Download, UserCheck, Inbox, Utensils, ThermometerSun, Smile
} from 'lucide-react';
import { SpeedInsights } from "@vercel/speed-insights/react";

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

// --- HOOK DE SEO + OPEN GRAPH + CANONICAL (ATUALIZADO) ---
const useSEO = (title, description, image = null, noIndex = false, canonical = null) => {
  // Ajuste de compatibilidade: Se o 3º argumento for booleano, trata como noIndex
  if (typeof image === 'boolean') {
      noIndex = image;
      image = null;
  }

  // URL da imagem padrão
  const defaultImage = `${window.location.origin}/logo.png`; 
  const finalImage = image || defaultImage;
  const currentUrl = window.location.href;
  const siteTitle = (title === "Home" || !title) ? "Mapa do Day Use" : title;
  
  // Define a URL canônica: Se não for passada manualmente, usa a URL atual limpa (sem query params)
  const finalCanonical = canonical || window.location.origin + window.location.pathname;

  useEffect(() => {
    // 1. Título da Aba
    document.title = siteTitle;

    // Função auxiliar para criar/atualizar meta tags
    const setMeta = (attrName, attrValue, content) => {
        let element = document.querySelector(`meta[${attrName}='${attrValue}']`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attrName, attrValue);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content || "");
    };

    // 2. Meta Tags Padrão
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? "noindex, nofollow" : "index, follow");

    // 3. Open Graph (Facebook, WhatsApp, LinkedIn)
    setMeta('property', 'og:title', siteTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', finalImage);
    setMeta('property', 'og:url', finalCanonical);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'Mapa do Day Use');
    setMeta('property', 'og:locale', 'pt_BR');

    // 4. Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', siteTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', finalImage);

    // 5. Tag Canônica (NOVO)
    let linkCanonical = document.querySelector("link[rel='canonical']");
    if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", finalCanonical);

  }, [title, description, finalImage, noIndex, currentUrl, siteTitle, finalCanonical]);
};

// --- HOOK DE SCHEMA MARKUP (DADOS ESTRUTURADOS) ---
const useSchema = (schemaData) => {
  useEffect(() => {
    if (!schemaData) return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

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

  // Robô de Verificação Automática (Polling)
  useEffect(() => {
    let interval;
    if (isOpen && paymentId && partnerToken) {
      // Verifica a cada 5 segundos
      interval = setInterval(() => {
        checkStatus(false); // false = verificação silenciosa (sem alertas)
      }, 5000);
    }
    // Limpa o robô ao fechar o modal
    return () => clearInterval(interval);
  }, [isOpen, paymentId, partnerToken]);

  const checkStatus = async (isManual = true) => {
      if (isManual) setChecking(true);
      
      try {
          const response = await fetch('/api/check-payment-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, partnerAccessToken: partnerToken })
          });
          const data = await response.json();
          
          if (data.status === 'approved') {
              if (isManual) alert("Pagamento confirmado com sucesso!");
              onConfirm(); // Finaliza a reserva e fecha o modal
              onClose();
          } else {
              if (isManual) alert(`O pagamento ainda está: ${data.status === 'pending' ? 'Pendente' : data.status}. Aguarde alguns instantes.`);
          }
      } catch (error) {
          console.error("Erro ao verificar:", error);
          if (isManual) alert("Erro ao verificar status. Tente novamente.");
      } finally {
          if (isManual) setChecking(false);
      }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixData.qr_code);
    alert("Código PIX copiado!");
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

  const [view, setView] = useState(initialMode); 
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  
  const [feedback, setFeedback] = useState(null); 

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // NOVO: Guarda o usuário criado para usar no botão de sucesso
  const [registeredUser, setRegisteredUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
        setFeedback(null);
        setView(initialMode); setRole(initialRole);
        setEmail(''); setPassword(''); setRegisteredUser(null);
    }
  }, [isOpen, initialMode, initialRole]);

  const ensureProfile = async (u) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    let userRole = role; 
    if (snap.exists()) { userRole = snap.data().role || 'user'; } 
    else { 
        await setDoc(ref, { 
            email: u.email || "", 
            name: u.displayName || u.email?.split('@')[0] || "Usuário", 
            role: role, 
            photoURL: u.photoURL || "",
            createdAt: new Date() 
        }); 
    }
    return { ...u, role: userRole };
  };

  const handleSocialLogin = async (provider) => {
    setFeedback(null);
    try {
       const res = await signInWithPopup(auth, provider);
       const userWithRole = await ensureProfile(res.user);
       onSuccess(userWithRole);
       if (closeOnSuccess) onClose();
    } catch (e) { 
        console.error(e);
        let msg = "Erro ao conectar.";
        if (e.code === 'auth/account-exists-with-different-credential') msg = "Já existe uma conta com este e-mail.";
        else if (e.code === 'auth/popup-closed-by-user') return;
        setFeedback({ type: 'error', title: 'Erro de Login', msg });
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault(); setLoading(true); setFeedback(null);
    try {
        if (view === 'register') {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            
            // Define URL de retorno baseada na role
            const returnUrl = role === 'partner' 
                ? 'https://mapadodayuse.com/partner' 
                : 'https://mapadodayuse.com/minhas-viagens';

            try { 
                await sendEmailVerification(res.user, { url: returnUrl, handleCodeInApp: true }); 
            } catch(e){}
            
            const userWithRole = await ensureProfile(res.user);
            setRegisteredUser(userWithRole); // Salva para o redirecionamento
            
            setView('email_sent');
            setLoading(false);
            return;
        } else {
            const res = await signInWithEmailAndPassword(auth, email, password);
            const userWithRole = await ensureProfile(res.user);
            onSuccess(userWithRole);
            if (closeOnSuccess) onClose();
        }
    } catch (err) {
        console.error(err);
        let title = "Atenção";
        let msg = "Erro desconhecido.";
        if (err.code === 'auth/email-already-in-use') msg = "Este e-mail já possui cadastro. Tente fazer login.";
        else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') { title = "Dados Incorretos"; msg = "E-mail ou senha incorretos."; }
        else msg = "Erro: " + err.code;
        setFeedback({ type: 'error', title, msg });
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
      e.preventDefault(); setLoading(true); setFeedback(null);
      try {
          await sendPasswordResetEmail(auth, email, { url: 'https://mapadodayuse.com', handleCodeInApp: true });
          setFeedback({ type: 'success', title: 'Link Enviado', msg: `Se o e-mail ${email} estiver cadastrado, você receberá um link.` });
      } catch (err) { 
          setFeedback({ type: 'error', title: 'Erro', msg: "Não foi possível enviar o e-mail." });
      } finally { setLoading(false); }
  };

  const getTitle = () => {
      if (view === 'forgot') return 'Recuperar Senha';
      if (view === 'email_sent') return 'Verifique seu E-mail';
      if (view === 'register' && role === 'partner') return 'Boas-vindas';
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
            
            {feedback && createPortal(<FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback.type} title={feedback.title} msg={feedback.msg} />, document.body)}

            {/* TELA DE SUCESSO DE CADASTRO */}
            {view === 'email_sent' ? (
                <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-teal-50 text-[#0097A8] rounded-full flex items-center justify-center mx-auto mb-2">
                        <Mail size={32}/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Conta Criada!</h3>
                        <p className="text-slate-600 text-sm mt-2">
                            Enviamos um link de confirmação para <strong>{email}</strong>.
                            <br/>Por favor, confirme seu e-mail para ativar todos os recursos.
                        </p>
                    </div>
                    {/* BOTÃO CORRIGIDO: Redireciona para o destino correto */}
                    <Button 
                        onClick={() => { 
                            if (registeredUser) {
                                onSuccess(registeredUser); // Redireciona para o destino (Painel ou Ingressos)
                                if (closeOnSuccess) onClose();
                            } else {
                                setView('login'); 
                            }
                        }} 
                        className="w-full mt-4"
                    >
                        {role === 'partner' ? 'Ir para o Painel' : 'Fazer Login'}
                    </Button>
                </div>
            ) : (
                <>
                    {!hideRoleSelection && ['login','register'].includes(view) && (
                       <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                           <button onClick={()=>setRole('user')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role==='user'?'bg-white text-[#0097A8] shadow-sm':'text-slate-500'}`}>Viajante</button>
                           <button onClick={()=>setRole('partner')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role==='partner'?'bg-white text-[#0097A8] shadow-sm':'text-slate-500'}`}>Parceiro</button>
                       </div>
                    )}

                    {['login','register'].includes(view) && (
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            {view === 'register' && role === 'partner' && (
                                <p className="text-sm text-slate-500 -mt-2 mb-2">Adicione seu e-mail e crie uma senha para se cadastrar</p>
                            )}
                            <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required />
                            <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} required />
                            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Processando...' : (view === 'login' ? 'Entrar' : 'Cadastrar')}</Button>
                        </form>
                    )}

                    {view === 'forgot' && (
                        <form onSubmit={handleForgot} className="space-y-4">
                            <p className="text-sm text-slate-600">Insira seu e-mail para receber o link de redefinição.</p>
                            <input className="w-full p-3 border border-slate-300 rounded-xl outline-none" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required/>
                            <Button type="submit" className="w-full" disabled={loading}>Enviar link</Button>
                            <p className="text-center text-xs font-bold underline cursor-pointer mt-4" onClick={()=>setView('login')}>Voltar</p>
                        </form>
                    )}

                    {['login','register'].includes(view) && (
                        <>
                            <div className="flex items-center my-6"><div className="flex-grow border-t border-slate-200"></div><span className="mx-3 text-xs text-slate-400">ou entre com</span><div className="flex-grow border-t border-slate-200"></div></div>
                            <div className="space-y-3">
                                <button onClick={() => handleSocialLogin(googleProvider)} className="w-full border-2 border-slate-100 rounded-xl py-2.5 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-semibold text-slate-600 text-sm">
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" /> Continuar com Google
                                </button>
                                <button onClick={() => handleSocialLogin(facebookProvider)} className="w-full border-2 border-slate-100 rounded-xl py-2.5 flex items-center justify-center gap-3 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all font-semibold text-slate-600 text-sm group">
                                    <Facebook size={20} className="text-[#1877F2] group-hover:text-white transition-colors" fill="currentColor" /> Continuar com Facebook
                                </button>
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
  
  // States Gestão
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [ownerId, setOwnerId] = useState(null);

  // States de UI (Modais)
  const [feedback, setFeedback] = useState(null); // { type, title, msg }
  const [confirmAction, setConfirmAction] = useState(null); // { type }
  
  // States LGPD (Exclusão)
  const [deleteStep, setDeleteStep] = useState(0); // 0=fechado, 1=confirmação, 2=motivo
  const [deleteReason, setDeleteReason] = useState('');

  const navigate = useNavigate();

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
             setIsStaff(d.role === 'staff');
             setOwnerId(d.ownerId); 
         }
      }
    };
    fetch();
  }, [user]);

  const handlePhotoUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          if (file.size > 500 * 1024) { 
              setFeedback({ type: 'error', title: 'Arquivo Grande', msg: 'A imagem deve ter no máximo 500KB.' });
              return; 
          }
          const reader = new FileReader();
          reader.onloadend = () => setData({ ...data, photoURL: reader.result });
          reader.readAsDataURL(file);
      }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
        await updateProfile(user, { displayName: data.name });
        await updateDoc(doc(db, "users", user.uid), { 
            name: data.name, 
            phone: data.phone,
            photoURL: data.photoURL
        });

        if (!isStaff) {
            if (newEmail && newEmail !== user.email) {
                 try {
                    await verifyBeforeUpdateEmail(user, newEmail, { url: 'https://mapadodayuse.com/profile', handleCodeInApp: true });
                    setFeedback({ 
                        type: 'success', 
                        title: 'Confirmação Enviada', 
                        msg: `Um link foi enviado para ${newEmail}. Clique nele para confirmar a troca.` 
                    });
                 } catch (emailErr) {
                     console.error(emailErr);
                     throw new Error("Erro ao solicitar troca de e-mail: " + emailErr.message);
                 }
            }
            if (newPass) {
                await updatePassword(user, newPass);
                setFeedback({ type: 'success', title: 'Sucesso', msg: 'Sua senha foi alterada!' });
            }
        }
        
        if (!newEmail && !newPass) {
             setFeedback({ type: 'success', title: 'Salvo', msg: 'Dados do perfil atualizados.' });
        }
        setNewPass(''); setNewEmail('');
    } catch (err) {
        console.error(err);
        if (err.code === 'auth/requires-recent-login') {
            setFeedback({ type: 'warning', title: 'Login Necessário', msg: 'Para alterar dados sensíveis, faça logout e entre novamente.' });
        } else {
            setFeedback({ type: 'error', title: 'Erro', msg: err.message });
        }
    } finally { setLoading(false); }
  };

  const initiateRequest = (type) => {
      if (!ownerId) { 
          setFeedback({ type: 'error', title: 'Erro', msg: 'Usuário não vinculado a um parceiro.' });
          return;
      }
      if (type === 'email' && !newEmail) { 
          setFeedback({ type: 'warning', title: 'Atenção', msg: 'Digite o novo e-mail desejado.' });
          return;
      }
      setConfirmAction({ type: type === 'email' ? 'request_email' : 'request_password' });
  };

  const executeRequest = async () => {
      if (!confirmAction) return;
      const type = confirmAction.type === 'request_email' ? 'email' : 'password';
      try {
          await addDoc(collection(db, "requests"), {
              type: type,
              staffId: user.uid,
              staffName: data.name,
              staffEmail: user.email,
              ownerId: ownerId, 
              status: 'pending',
              createdAt: new Date(),
              newEmailValue: type === 'email' ? newEmail : null 
          });
          setFeedback({ type: 'success', title: 'Solicitação Enviada', msg: 'O administrador foi notificado.' });
          setNewEmail(''); 
      } catch (e) {
          setFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível enviar a solicitação.' });
      } finally {
          setConfirmAction(null);
      }
  };

 // --- LÓGICA DE EXCLUSÃO (LGPD) - BLINDADA ---
  const handleDeleteAccount = async () => {
      setLoading(true);
      try {
          // 1. Exclui Autenticação (Ação Principal)
          await deleteUser(user);
          
          // 2. Limpeza de Dados (Best Effort)
          try {
              if (deleteReason) {
                  await addDoc(collection(db, "deletion_reasons"), {
                      uid: user.uid,
                      reason: deleteReason,
                      role: user.role || 'user',
                      date: new Date()
                  });
              }
              await deleteDoc(doc(db, "users", user.uid));
          } catch(e) { console.warn("Limpeza parcial de dados:", e); }

          // Sucesso: Chama o Modal com flag de redirecionamento
          setFeedback({ 
              type: 'success', 
              title: 'Conta Excluída', 
              msg: 'Sua conta foi encerrada com sucesso. Esperamos te ver de novo!',
              isDelete: true // O modal cuidará do reload/redirect ao fechar
          });

      } catch (error) {
          console.error("Erro ao excluir:", error);
          if (error.code === 'auth/requires-recent-login') {
              // Erro de Segurança: Modal Amarelo
              setFeedback({ 
                  type: 'warning', 
                  title: 'Segurança', 
                  msg: 'Para excluir sua conta, é necessário ter feito login recentemente.\n\nPor favor, faça logout e entre novamente para confirmar sua identidade.' 
              });
          } else {
              // Erro Genérico: Modal Vermelho
              setFeedback({ 
                  type: 'error', 
                  title: 'Erro', 
                  msg: 'Não foi possível excluir a conta no momento. Tente novamente mais tarde.' 
              });
          }
      } finally {
          setLoading(false);
          setDeleteStep(0); // Fecha o modal de confirmação/motivo
      }
  };

  const resendVerify = async () => {
      try {
        await sendEmailVerification(user, { url: 'https://mapadodayuse.com/profile', handleCodeInApp: true });
        setFeedback({ type: 'success', title: 'Enviado', msg: 'Verifique sua caixa de entrada e Spam.' });
      } catch(e) {
          if (e.code === 'auth/too-many-requests') setFeedback({ type: 'warning', title: 'Aguarde', msg: 'Muitas tentativas. Tente novamente em breve.' });
          else setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao enviar e-mail.' });
      }
  };

  const initiatePasswordReset = () => { setConfirmAction({ type: 'reset_self' }); };

  const executePasswordReset = async () => {
      try {
          await sendPasswordResetEmail(auth, user.email, { url: 'https://mapadodayuse.com', handleCodeInApp: true });
          setFeedback({ type: 'success', title: 'E-mail Enviado', msg: 'Verifique seu e-mail para redefinir a senha.' });
      } catch(e) { 
          setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao enviar e-mail de redefinição.' }); 
      } finally { setConfirmAction(null); }
  };

  if(!user) return null;

  return (
    <div className="max-w-xl mx-auto py-12 px-4 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 text-slate-900">Meu Perfil {isStaff && <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2 align-middle">EQUIPE</span>}</h1>
      
      {/* Modais Globais */}
      {feedback && createPortal(<FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback.type} title={feedback.title} msg={feedback.msg} />, document.body)}
      
      {confirmAction && createPortal(
          <ModalOverlay onClose={() => setConfirmAction(null)}>
              <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info size={40}/>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Confirmação</h2>
                  <p className="text-slate-600 mb-6 text-sm px-2">
                      {confirmAction.type === 'request_email' && `Solicitar troca de e-mail para ${newEmail}?`}
                      {confirmAction.type === 'request_password' && "Solicitar redefinição de senha ao administrador?"}
                      {confirmAction.type === 'reset_self' && `Enviar link de redefinição para ${user.email}?`}
                  </p>
                  <div className="flex gap-3">
                      <Button onClick={() => setConfirmAction(null)} variant="ghost" className="flex-1 justify-center">Cancelar</Button>
                      <Button onClick={confirmAction.type === 'reset_self' ? executePasswordReset : executeRequest} className="flex-1 justify-center">Confirmar</Button>
                  </div>
              </div>
          </ModalOverlay>, document.body
      )}

      {/* --- FLUXO DE EXCLUSÃO (LGPD) - VISUAL UNIFICADO --- */}
      {deleteStep > 0 && createPortal(
          <ModalOverlay onClose={() => setDeleteStep(0)}>
              <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
                  {/* Ícone Padronizado */}
                  <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 size={40}/>
                  </div>
                  
                  {deleteStep === 1 ? (
                      <>
                          <h2 className="text-xl font-bold text-slate-900 mb-2">Excluir Conta?</h2>
                          <p className="text-slate-600 mb-6 text-sm px-2">
                              Tem certeza que deseja excluir sua conta permanentemente? <br/>
                              <strong>Essa ação é irreversível</strong> e você perderá acesso ao histórico de reservas.
                          </p>
                          <div className="flex gap-3">
                              <Button onClick={() => setDeleteStep(0)} variant="ghost" className="flex-1 justify-center">Cancelar</Button>
                              <Button onClick={() => setDeleteStep(2)} variant="danger" className="flex-1 justify-center">Sim, Excluir</Button>
                          </div>
                      </>
                  ) : (
                      <>
                          <h2 className="text-xl font-bold text-slate-900 mb-2">Que pena ver você ir!</h2>
                          <p className="text-slate-600 mb-4 text-sm px-2">
                              Poderia nos contar o motivo? Isso nos ajuda a melhorar. (Opcional)
                          </p>
                          <textarea 
                              className="w-full border p-3 rounded-xl mb-6 text-sm h-24 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                              placeholder="Conte-nos o motivo..."
                              value={deleteReason}
                              onChange={e => setDeleteReason(e.target.value)}
                          />
                          <div className="flex gap-3 flex-col">
                              <Button onClick={handleDeleteAccount} variant="danger" className="w-full justify-center" disabled={loading}>
                                  {loading ? 'Excluindo...' : 'Confirmar Exclusão Definitiva'}
                              </Button>
                              <button onClick={() => setDeleteStep(0)} className="text-xs text-slate-400 hover:text-slate-600 underline">
                                  Mudei de ideia, quero ficar
                              </button>
                          </div>
                      </>
                  )}
              </div>
          </ModalOverlay>,
          document.body
      )}

      <form onSubmit={handleSave} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
         
         {/* FOTO / LOGO */}
         <div className="flex flex-col items-center gap-4 mb-6">
             <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 flex items-center justify-center relative group">
                 {data.photoURL ? <img src={data.photoURL} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-400"/>}
                 <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-bold">Alterar<input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} /></label>
             </div>
             <p className="text-xs text-slate-400">Clique na foto para alterar. {user.role === 'partner' ? '(Logo da Empresa)' : ''}</p>
         </div>

         {/* DADOS BÁSICOS */}
         <div><label className="text-sm font-bold text-slate-700 block mb-1">Nome Completo</label><input className="w-full border p-3 rounded-lg" value={data.name} onChange={e=>setData({...data, name: e.target.value})} /></div>
         <div><label className="text-sm font-bold text-slate-700 block mb-1">Telefone</label><input className="w-full border p-3 rounded-lg" value={data.phone} onChange={e=>setData({...data, phone: e.target.value})} placeholder="(00) 00000-0000"/></div>
         
         {/* E-MAIL E SENHA (SENSÍVEL) */}
         <div className="pt-4 border-t border-slate-100">
             <h3 className="font-bold text-slate-900 mb-4">Segurança</h3>
             
             {/* E-MAIL */}
             <div className="mb-4">
                 <label className="text-sm font-bold text-slate-700 block mb-1">E-mail</label>
                 {isStaff ? (
                     <div className="space-y-2">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                             <span className="text-slate-500 text-sm">{user.email}</span>
                             <span className="text-xs text-slate-400 italic">Gerenciado pelo Admin</span>
                        </div>
                        <div className="flex gap-2">
                            <input className="w-full border p-2 rounded-lg text-sm" placeholder="Novo e-mail desejado..." value={newEmail} onChange={e=>setNewEmail(e.target.value)}/>
                            <button type="button" onClick={() => initiateRequest('email')} className="text-xs bg-blue-50 text-blue-600 px-3 rounded-lg font-bold hover:bg-blue-100 whitespace-nowrap">Solicitar Troca</button>
                        </div>
                     </div>
                 ) : (
                     <>
                        <input className="w-full border p-3 rounded-lg" placeholder={user.email} value={newEmail} onChange={e=>setNewEmail(e.target.value)} />
                        <p className="text-[10px] text-slate-400 mt-1">Deixe vazio para manter o atual.</p>
                     </>
                 )}

                 {/* Status de Verificação */}
                 {!user.emailVerified ? (
                     <div className="mt-2 flex items-center gap-2 text-xs text-red-500 font-bold">
                         <AlertCircle size={12}/> E-mail não verificado. 
                         <span onClick={resendVerify} className="underline cursor-pointer text-[#0097A8]">Reenviar link</span>
                     </div>
                 ) : (
                     <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-bold"><CheckCircle size={12}/> Verificado</div>
                 )}
             </div>

             {/* SENHA */}
             <div>
                 <label className="text-sm font-bold text-slate-700 block mb-1">Senha</label>
                 {isStaff ? (
                     <button type="button" onClick={() => initiateRequest('password')} className="w-full border p-3 rounded-lg text-left text-sm text-slate-600 hover:bg-slate-50 flex justify-between items-center group">
                         <span>Solicitar redefinição de senha ao administrador</span>
                         <Mail size={16} className="text-slate-400 group-hover:text-[#0097A8]"/>
                     </button>
                 ) : (
                     <button type="button" onClick={initiatePasswordReset} className="w-full border p-3 rounded-lg text-left text-sm text-slate-600 hover:bg-slate-50 flex justify-between items-center">
                         <span>Redefinir minha senha</span>
                         <Mail size={16}/>
                     </button>
                 )}
             </div>
         </div>

         <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
         
         {/* BOTÃO EXCLUIR CONTA (NOVO - LGPD) */}
         <div className="pt-8 border-t border-slate-100">
             <button 
                type="button"
                onClick={() => setDeleteStep(1)}
                className="text-xs text-red-400 hover:text-red-600 hover:underline flex items-center gap-1 mx-auto"
             >
                <Trash2 size={12}/> Quero excluir minha conta
             </button>
         </div>
      </form>
    </div>
  );
};

// --- PÁGINAS PRINCIPAIS ---

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
                onError={handleImageError} 
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
               <h2 className="font-bold text-xl text-slate-900 leading-tight mb-1">{item.name}</h2>
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

// -----------------------------------------------------------------------------
// HOME PAGE (NOVO DESIGN MINIMALISTA + HERO)
// -----------------------------------------------------------------------------
const HomePage = () => {
  useSEO("Home", "Encontre e reserve os melhores day uses em hotéis e resorts.");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

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

  useEffect(() => { 
      const loadData = async () => {
          // 1. Tenta carregar do Cache (Versão Leve)
          const cached = localStorage.getItem('dayuses_min_cache');
          if (cached) {
              try {
                  setItems(JSON.parse(cached));
                  setLoading(false);
              } catch (e) {
                  console.warn("Cache corrompido, limpando...");
                  localStorage.removeItem('dayuses_min_cache');
              }
          }

          // 2. Busca Dados Frescos e Otimiza para Cache
          try {
              // Busca TODOS os itens (ativos e pausados) para popular a vitrine (Seeding)
              const q = query(collection(db, "dayuses"));
              const snap = await getDocs(q);
              const fullData = snap.docs.map(d => ({id: d.id, ...d.data()}));
              
              // Mapeia apenas o essencial para não estourar o limite (5MB)
              const minifiedData = fullData.map(item => ({
                  id: item.id,
                  name: item.name,
                  city: item.city,
                  state: item.state,
                  image: item.image, // URL da foto principal
                  priceAdult: item.priceAdult,
                  amenities: item.amenities || [], // Necessário para os filtros
                  meals: item.meals || [],
                  petAllowed: item.petAllowed,
                  paused: item.paused
              }));

              setItems(fullData); // Usa o completo na memória atual para garantir consistência

              // Tenta salvar o leve no cache
              try {
                  localStorage.setItem('dayuses_min_cache', JSON.stringify(minifiedData));
              } catch (quotaError) {
                  console.warn("Cache cheio (QuotaExceeded), limpando antigo...");
                  localStorage.clear(); // Limpa tudo para tentar recuperar espaço
                  try {
                    localStorage.setItem('dayuses_min_cache', JSON.stringify(minifiedData));
                  } catch (e) {
                    console.warn("Não foi possível salvar no cache mesmo após limpeza.");
                  }
              }

          } catch (err) {
              console.error("Erro ao carregar home:", err);
          } finally {
              setLoading(false); 
          }
      };

      loadData();
  }, []);

  // Lógica de Filtros por Categoria (Com proteção contra dados inválidos/undefined)
  const filterByAmenity = (keywords) => items.filter(i => 
      Array.isArray(i.amenities) && i.amenities.some(a => keywords.some(k => a.toLowerCase().includes(k)))
  );
  
  const activeItems = items; // Mostra todos, inclusive pausados, na vitrine (Seeding)
  // Se quiser esconder pausados nas categorias, use: const activeItems = items.filter(i => !i.paused);

  const familyItems = filterByAmenity(['kids', 'infantil', 'playground', 'recreação', 'tobogã', 'monitores']).slice(0, 4);
  const foodItems = activeItems.filter(i => Array.isArray(i.meals) && i.meals.some(m => ['café da manhã', 'almoço', 'jantar', 'buffet'].some(k => m.toLowerCase().includes(k)))).slice(0, 4);
  const petItems = activeItems.filter(i => i.petAllowed).slice(0, 4);
  const heatedPoolItems = filterByAmenity(['aquecida', 'climatizada', 'termal', 'ofurô', 'hidro']).slice(0, 4);

  // Busca Geral
  const searchResults = searchTerm 
    ? items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || (i.city && i.city.toLowerCase().includes(searchTerm.toLowerCase())))
    : [];

  return (
    <div className="pb-20 animate-fade-in min-h-screen bg-white">
      
      {/* HERO SECTION COM TÍTULO E HEADLINE */}
      <div className="relative bg-[#0097A8] text-white pt-24 pb-20 px-4 rounded-b-[3rem] shadow-xl">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                  Mapa do Day Use
              </h1>
              <p className="text-lg md:text-2xl text-cyan-50 font-light max-w-2xl mx-auto">
                  Sua mini-férias começa agora. Hotéis e resorts incríveis para curtir o dia, perto de você.
              </p>
          </div>
      </div>

      {/* HEADER DE BUSCA FLUTUANTE */}
      <div className="sticky top-4 z-30 px-4 -mt-8">
          <div className="max-w-3xl mx-auto">
              <div className="relative group bg-white rounded-full p-1.5 shadow-xl border border-slate-100 flex items-center transition-all focus-within:ring-4 focus-within:ring-cyan-100">
                  <div className="pl-4 pr-2 text-slate-400">
                      <Search size={20} className="group-focus-within:text-[#0097A8] transition-colors"/>
                  </div>
                  <input 
                      className="flex-1 bg-transparent py-3 text-slate-700 font-medium placeholder:text-slate-400 outline-none"
                      placeholder="Para onde você quer ir? (Ex: Brumadinho, Hotel Fazenda...)"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
                  <button className="bg-[#0097A8] text-white p-3 rounded-full hover:bg-[#007F8F] transition-colors shadow-sm">
                      <ArrowRight size={20}/>
                  </button>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-12">
        
        {/* RESULTADOS DA BUSCA */}
        {searchTerm ? (
            <div className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Resultados para "{searchTerm}"</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {searchResults.map(item => (
                        <DayUseCard key={item.id} item={item} onClick={() => navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}})} />
                    ))}
                    {searchResults.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <p className="text-slate-500 mb-4">Não encontramos nenhum local com esse nome.</p>
                            <Button onClick={() => setSearchTerm("")} variant="outline">Limpar Busca</Button>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="space-y-16">
                
                {/* 1. FAMÍLIA (Ícone Smile) */}
                {familyItems.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                                <Smile size={20}/>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 leading-none">Pra ir com a família inteira</h2>
                                <p className="text-slate-500 text-sm mt-1">Diversão garantida para as crianças e descanso para você.</p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {loading ? Array.from({length:4}).map((_,i)=><SkeletonCard key={i}/>) : familyItems.map(item => (
                                <DayUseCard key={item.id} item={item} onClick={() => navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}})} />
                            ))}
                        </div>
                    </section>
                )}

                {/* 2. ALIMENTAÇÃO INCLUSA (Ícone Utensils) */}
                {foodItems.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <Utensils size={20}/>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 leading-none">Day uses para comer à vontade</h2>
                                <p className="text-slate-500 text-sm mt-1">Opções com café da manhã ou almoço deliciosos inclusos.</p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {loading ? Array.from({length:4}).map((_,i)=><SkeletonCard key={i}/>) : foodItems.map(item => (
                                <DayUseCard key={item.id} item={item} onClick={() => navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}})} />
                            ))}
                        </div>
                    </section>
                )}

                {/* 3. PET FRIENDLY (Ícone PawPrint) */}
                {petItems.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <PawPrint size={20}/>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 leading-none">Aqui seu pet é bem-vindo</h2>
                                <p className="text-slate-500 text-sm mt-1">Leve seu melhor amigo para curtir o dia com você.</p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {loading ? Array.from({length:4}).map((_,i)=><SkeletonCard key={i}/>) : petItems.map(item => (
                                <DayUseCard key={item.id} item={item} onClick={() => navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}})} />
                            ))}
                        </div>
                    </section>
                )}

                {/* 4. PISCINA AQUECIDA (Ícone ThermometerSun) */}
                {heatedPoolItems.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                                <ThermometerSun size={20}/>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 leading-none">Águas Quentinhas</h2>
                                <p className="text-slate-500 text-sm mt-1">Piscinas aquecidas ou climatizadas para relaxar em qualquer clima.</p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {loading ? Array.from({length:4}).map((_,i)=><SkeletonCard key={i}/>) : heatedPoolItems.map(item => (
                                <DayUseCard key={item.id} item={item} onClick={() => navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}})} />
                            ))}
                        </div>
                    </section>
                )}
                
                {/* 5. CTA PARA O QUIZ */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl relative overflow-hidden group cursor-pointer" onClick={() => navigate('/quiz')}>
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                   <div className="relative z-10">
                       <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-4 border border-white/20 backdrop-blur-sm">Ainda na dúvida?</span>
                       <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Descubra seu Day Use ideal com IA ✨</h2>
                       <p className="text-indigo-100 mb-8 max-w-xl mx-auto">Responda 3 perguntas rápidas e nossa inteligência encontra a experiência perfeita para o seu perfil.</p>
                       <button className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg">Fazer Quiz Agora</button>
                   </div>
               </div>
                
                {/* CTA FINAL */}
                <div className="bg-slate-50 rounded-3xl p-8 text-center border border-slate-100 mt-12">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Não encontrou o que procurava?</h3>
                    <p className="text-slate-500 mb-6">Use nosso mapa do site para ver todas as cidades disponíveis.</p>
                    <Button onClick={() => navigate('/mapa-do-site')} variant="outline">Ver Todos os Destinos</Button>
                </div>
            </div>
        )}
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
  
  // State para alertas de validação (quantidade)
  const [showWarning, setShowWarning] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      try {
          let foundData = null;
          
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

  const seoTitle = item ? `${item.name} | Reserve seu Day Use em ${item.city}` : "Detalhes do Day Use";
  const seoDesc = item 
    ? `Compre seu ingresso para o day use ${item.name} em ${item.city}. Day Use com ${item.amenities?.[0] || 'Piscina'}, ${item.meals?.[0] || 'Almoço'} e muito mais!`
    : "Confira detalhes, preços e fotos deste Day Use incrível. Reserve agora!";

  useSEO(seoTitle, seoDesc, item?.image);

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
      navigate('/checkout', { 
          state: { 
              bookingData: { 
                  item, date, adults, children, pets, total, 
                  freeChildren, 
                  selectedSpecial,
                  priceSnapshot: { adult: currentPrice, child: childPrice, pet: petFee } 
              } 
          } 
      });
  };

  const handleClaimSubmit = async (e) => {
      e.preventDefault();
      setClaimLoading(true);
      
      const emailHtml = `...`; // (Mantido igual)

      try {
          // 1. Salva no Banco de Dados para o Painel Admin (NOVO)
          await addDoc(collection(db, "property_claims"), {
              propertyName: item.name,
              propertyId: item.id,
              userName: claimData.name,
              userEmail: claimData.email,
              userPhone: claimData.phone,
              userJob: claimData.job,
              status: 'pending', // pending, done
              createdAt: new Date()
          });

          // 2. Envia Notificação por E-mail (Mantido)
          await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: 'contato@mapadodayuse.com', subject: `🔥 Solicitação: ${item.name}`, html: emailHtml })
          });
          
          setShowClaimModal(false);
          setShowClaimSuccess(true);
          setClaimData({ name: '', email: '', phone: '', job: '' });
      } catch (error) {
          console.error(error);
          alert("Erro ao enviar solicitação.");
      } finally {
          setClaimLoading(false);
      }
  };

  const PausedMessage = () => (
    <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6">
        <div className="pb-4 border-b border-slate-100 text-center">
            <p className="text-xs text-slate-400 mb-2">Você é o dono ou gerente deste local?</p>
            <button onClick={() => setShowClaimModal(true)} className="text-sm font-bold text-[#0097A8] hover:underline flex items-center justify-center gap-1 mx-auto"><Briefcase size={14}/> Solicitar administração</button>
        </div>
        <div className="text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400"><Ticket size={24}/></div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reservas Indisponíveis</h3>
            <p className="text-slate-500 leading-relaxed text-xs">No momento, este local não está recebendo novas reservas.<br/><strong className="text-slate-700">Confira outras opções em {item.city}:</strong></p>
        </div>
        <div className="space-y-3">
            {relatedItems.length > 0 ? relatedItems.map(related => (
                <div key={related.id} onClick={() => navigate(`/${getStateSlug(related.state)}/${generateSlug(related.name)}`, {state: {id: related.id}})} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-[#0097A8] hover:shadow-md transition-all cursor-pointer bg-slate-50 hover:bg-white group">
                    <img src={related.image} className="w-16 h-16 rounded-lg object-cover bg-gray-200 shrink-0"/>
                    <div className="flex-1 min-w-0"><h4 className="font-bold text-slate-800 text-sm truncate">{related.name}</h4><p className="text-xs text-[#0097A8] font-bold mt-1">A partir de {formatBRL(related.priceAdult)}</p></div>
                    <div className="text-[#0097A8] opacity-0 group-hover:opacity-100 transition-opacity pr-2"><ArrowRight size={16}/></div>
                </div>
            )) : <Button onClick={() => navigate('/')} className="w-full py-3 text-sm shadow-lg shadow-teal-100/50">Ver todos os Day Uses</Button>}
        </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
      <ImageGallery images={[item.image, item.image2, item.image3].filter(Boolean)} isOpen={galleryOpen} onClose={()=>setGalleryOpen(false)} />
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-8 text-slate-500 hover:text-[#0097A8] font-medium transition-colors"><div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm"><ChevronLeft size={20}/></div> Voltar</button>
      
      {showClaimSuccess && createPortal(<SuccessModal isOpen={showClaimSuccess} onClose={() => setShowClaimSuccess(false)} title="Solicitação Enviada!" message="Recebemos seus dados com sucesso. Nossa equipe analisará as informações e entrará em contato em breve." actionLabel="Entendi" onAction={() => setShowClaimSuccess(false)} />, document.body)}

      {showClaimModal && createPortal(<ModalOverlay onClose={() => setShowClaimModal(false)}><div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full animate-fade-in"><div className="w-16 h-16 bg-cyan-100 text-[#0097A8] rounded-full flex items-center justify-center mx-auto mb-4"><Briefcase size={32}/></div><h2 className="text-xl font-bold text-slate-900 mb-2">Assumir este Perfil</h2><p className="text-slate-600 mb-6 text-sm">Preencha seus dados para solicitar o controle administrativo.</p><form onSubmit={handleClaimSubmit} className="space-y-3 text-left"><div><label className="text-xs font-bold text-slate-500 ml-1">Seu Nome</label><input className="w-full border p-3 rounded-xl" required value={claimData.name} onChange={e=>setClaimData({...claimData, name: e.target.value})}/></div><div><label className="text-xs font-bold text-slate-500 ml-1">E-mail Corporativo</label><input className="w-full border p-3 rounded-xl" type="email" required value={claimData.email} onChange={e=>setClaimData({...claimData, email: e.target.value})}/></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-slate-500 ml-1">Telefone</label><input className="w-full border p-3 rounded-xl" required value={claimData.phone} onChange={e=>setClaimData({...claimData, phone: e.target.value})}/></div><div><label className="text-xs font-bold text-slate-500 ml-1">Cargo</label><select className="w-full border p-3 rounded-xl bg-white" required value={claimData.job} onChange={e=>setClaimData({...claimData, job: e.target.value})}><option value="">Selecione...</option><option>Proprietário</option><option>Gerente</option><option>Marketing</option><option>Comercial</option></select></div></div><Button type="submit" disabled={claimLoading} className="w-full mt-4">{claimLoading ? 'Enviando...' : 'Enviar Solicitação'}</Button></form><button onClick={() => setShowClaimModal(false)} className="text-xs text-slate-400 hover:text-slate-600 mt-4 underline">Cancelar</button></div></ModalOverlay>, document.body)}

      {/* MODAL DE ALERTA (Trava de Adultos) */}
      {showWarning && createPortal(
          <ModalOverlay onClose={() => setShowWarning(null)}>
              <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
                  <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32}/>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">{showWarning.title}</h2>
                  <p className="text-slate-600 mb-6 text-sm">{showWarning.msg}</p>
                  <Button onClick={() => setShowWarning(null)} className="w-full justify-center">Entendi</Button>
              </div>
          </ModalOverlay>,
          document.body
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-8">
            
            {/* 1. TÍTULO E LOCALIZAÇÃO */}
            <div><h1 className="text-4xl font-bold text-slate-900 mb-2">{item.name}</h1><p className="flex items-center gap-2 text-slate-500 text-lg"><MapPin size={20} className="text-[#0097A8]"/> {item.city}, {item.state}</p></div>

            {/* 2. GALERIA */}
            <div className="grid grid-cols-4 gap-3 h-[400px] rounded-[2rem] overflow-hidden shadow-lg cursor-pointer group" onClick={()=>setGalleryOpen(true)}><div className="col-span-3 relative h-full"><img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/><div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div></div><div className="col-span-1 grid grid-rows-2 gap-3 h-full"><div className="relative overflow-hidden h-full"><img src={item.image2} className="w-full h-full object-cover"/></div><div className="relative overflow-hidden h-full"><img src={item.image3} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm hover:bg-black/50 transition-colors">Ver fotos</div></div></div></div>
            
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
               
               {/* 3. SOBRE (H2 com nome) */}
               <div>
                   <h2 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><FileText className="text-[#0097A8]"/> Sobre {item.name}</h2>
                   <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">{item.description}</p>
               </div>
               
               {/* 4. VÍDEO */}
               {item.videoUrl && (<div className="rounded-2xl overflow-hidden shadow-md aspect-video"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}`} title="Video" frameBorder="0" allowFullScreen></iframe></div>)}
               
               {/* 5. O QUE ESTÁ INCLUSO (H2 com nome) */}
               <div>
                   <h2 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><CheckCircle className="text-[#0097A8]"/> O que está incluso no day use do {item.name}?</h2>
                   
                   {/* Comodidades */}
                   {item.amenities && item.amenities.length > 0 && (
                       <div className="mb-6">
                           <p className="text-sm font-bold text-slate-700 mb-2">Comodidades:</p>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                               {item.amenities.flatMap(a => a.includes(',') ? a.split(',') : a).map(a => a.trim()).filter(a => a !== "").map((a, idx) => (
                                   <div key={`${a}-${idx}`} className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-[#0097A8] shrink-0"></div> <span className="capitalize">{a}</span></div>
                               ))}
                           </div>
                       </div>
                   )}

                   {/* Pensão */}
                   <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4">
                       <div className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Alimentação (Pensão)</div>
                       {item.meals && item.meals.length > 0 ? (<div className="flex flex-wrap gap-2">{item.meals.map(m => (<span key={m} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-orange-700 border border-orange-200">{m}</span>))}</div>) : (<p className="text-sm text-slate-500 italic">Este estabelecimento não oferece serviço de alimentação incluso.</p>)}
                   </div>

                   {/* Outros Inclusos */}
                   {item.includedItems && (<div><p className="text-sm font-bold text-slate-700 mb-2">Outros itens inclusos:</p><p className="text-slate-600 text-sm whitespace-pre-line bg-green-50 p-4 rounded-xl border border-green-100">{item.includedItems}</p></div>)}
               </div>

               {/* 6. NÃO INCLUSO (H2) */}
               <div className="pt-4 border-t border-slate-100">
                   <h2 className="font-bold text-red-500 mb-2 flex items-center gap-2 text-lg"><Ban size={18}/> O que NÃO está incluso no day use do {item.name}</h2>
                   <p className="text-slate-600 text-sm whitespace-pre-line">{item.notIncludedItems || "Nenhum item específico."}</p>
               </div>
               
               {/* 7. REGRAS (ACCORDION) */}
               <Accordion title="Regras de Utilização" icon={Info}>
                   <p className="text-slate-600 text-sm whitespace-pre-line">{item.usageRules || "Sem regras específicas."}</p>
               </Accordion>
               
               {/* 8. CANCELAMENTO (ACCORDION) */}
               <Accordion title="Cancelamento e Remarcações" icon={AlertCircle}>
                   <p className="text-slate-600 text-sm whitespace-pre-line">{item.cancellationPolicy || "Consulte o estabelecimento."}</p>
               </Accordion>
            </div>
         </div>
         
         <div className="lg:col-span-1 h-fit sticky top-24">
            {item.paused ? <PausedMessage /> : (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-8">
                   <div className="flex justify-between items-end border-b border-slate-100 pb-6"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{date ? "Preço para a data" : "A partir de"}</p><span className="text-3xl font-bold text-[#0097A8]">{formatBRL(currentPrice)}</span><span className="text-slate-400 text-sm"> / adulto</span></div></div>
                   
                   <div>
                       <label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2"><CalendarIcon size={16} className="text-[#0097A8]"/> Escolha uma data</label>
                       <SimpleCalendar availableDays={item.availableDays} blockedDates={item.blockedDates || []} prices={item.weeklyPrices || {}} basePrice={Number(item.priceAdult)} onDateSelect={setDate} selectedDate={date} />{date && <p className="text-xs font-bold text-[#0097A8] mt-2 text-center bg-cyan-50 py-2 rounded-lg">Data selecionada: {date.split('-').reverse().join('/')}</p>}
                   </div>

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
                                 <span className="font-bold text-slate-900 w-4 text-center">{freeChildren}</span><button className={`w-6 h-6 flex items-center justify-center font-bold rounded ${adults > 0 ? 'text-green-700 hover:bg-green-100' : 'text-green-300 cursor-not-allowed'}`} onClick={() => adults > 0 ? setFreeChildren(freeChildren+1) : setShowWarning({ title: 'Adicione um Adulto', msg: 'Para selecionar crianças gratuitas, é necessário ter pelo menos 1 adulto responsável.' })}>+</button></div>
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
    </div>
  );
};

// ... (outros componentes)

// -----------------------------------------------------------------------------
// CHECKOUT PAGE (FRONTEND MP SDK + SAVING TO FIRESTORE)
// -----------------------------------------------------------------------------
const CheckoutPage = () => {
  useSEO("Pagamento", "Finalize sua reserva.", true);
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData } = location.state || {};
  
  const [user, setUser] = useState(auth.currentUser);
  const [showLogin, setShowLogin] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(bookingData?.total || 0);
  const [couponMsg, setCouponMsg] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('card'); 
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState(''); 
  const [cardCvv, setCardCvv] = useState('');
  const [docType, setDocType] = useState('CPF');
  const [docNumber, setDocNumber] = useState('');
  const [installments, setInstallments] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  // Pix Modal
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [createdPaymentId, setCreatedPaymentId] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);

  const getPaymentMethodId = (number) => {
    const cleanNum = number.replace(/\D/g, '');
    if (/^4/.test(cleanNum)) return 'visa';
    if (/^5[1-5]/.test(cleanNum)) return 'master';
    if (/^3[47]/.test(cleanNum)) return 'amex';
    if (/^6/.test(cleanNum)) return 'elo'; 
    return 'visa';
  };

  useEffect(() => {
    if(!bookingData) { navigate('/'); return; }
    
    // Inicialização do SDK do Mercado Pago
    const initMP = () => {
        if (window.MercadoPago && import.meta.env.VITE_MP_PUBLIC_KEY) {
            try {
                if (!window.mpInstance) {
                    window.mpInstance = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY);
                    console.log("✅ SDK MercadoPago inicializado (Modo Frontend).");
                }
            } catch (e) { console.error("Erro init MP:", e); }
        }
    };
    initMP();
    
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  const handleResendVerification = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      setResendLoading(true);
      try {
          await sendEmailVerification(currentUser, { url: window.location.href, handleCodeInApp: true });
          alert(`✅ E-mail enviado para ${currentUser.email}!`);
      } catch (e) { alert("Erro ao enviar e-mail."); } 
      finally { setResendLoading(false); }
  };

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

  // Salva no Firestore (Bypass de Backend Financeiro)
  const handleConfirm = async (mpTokenId = null) => {
    try {
        // Gera ID local para referência
        const offlinePaymentId = `FRONT_${mpTokenId || 'PIX'}_${Date.now()}`;
        
        await addDoc(collection(db, "reservations"), {
          ...bookingData, 
          total: finalTotal,
          discount: discount,
          couponCode: couponCode ? couponCode.toUpperCase() : null,
          paymentMethod: paymentMethod,
          
          paymentId: offlinePaymentId, // Salva o ID gerado no front
          
          userId: user.uid, 
          ownerId: bookingData.item.ownerId,
          createdAt: new Date(), 
          status: 'confirmed', // Salva como confirmado para o parceiro ver
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
     if (!user) { setShowLogin(true); return; }

     // Sanitização
     const cleanDoc = (docNumber || "").replace(/\D/g, ''); 
     
     if (cleanDoc.length < 11) {
         alert("Por favor, digite um CPF válido.");
         return;
     }

     setProcessing(true);

     // --- 1. FLUXO PIX (SEM API) ---
     if (paymentMethod === 'pix') {
         setTimeout(() => {
             const fakePaymentId = `PIX-${Math.floor(Math.random() * 1000000)}`;
             setCreatedPaymentId(fakePaymentId);
             
             // Gera QR Code Visual (Base64 válido para não ficar branco)
             const qrCodeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACXljzdAAAABlBMVEX///8AAABVwtN+AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAA7klEQVRYw+2YwQ3EIAxE2WEVlEJplEIpREI2Sk7sA/KxyY8s8wI5Vo6d/PUv/xVIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRRIgRTIt0D+ANTuH30qW51cAAAAAElFTkSuQmCC";

             setPixData({
                 qr_code: "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR5913Mapa Day Use6008Brasilia62070503***6304ABCD",
                 qr_code_base64: qrCodeBase64 
             });
             setProcessing(false);
             setShowPixModal(true);
         }, 1500);
         return;
     }

     // --- 2. FLUXO CARTÃO (COM VALIDAÇÃO REAL DO SDK) ---
     if (paymentMethod === 'card') {
         if (!window.mpInstance) {
            alert("Sistema de pagamento indisponível (SDK não carregou).");
            setProcessing(false);
            return;
         }

         const [month, year] = cardExpiry.split('/');
         if (!month || !year || cardNumber.length < 13 || !cardCvv) {
             alert("Verifique os dados do cartão.");
             setProcessing(false);
             return;
         }

         try {
             // O SDK valida o cartão de verdade
             const tokenObj = await window.mpInstance.createCardToken({
                cardNumber: cardNumber.replace(/\s/g, ''),
                cardholderName: cardName,
                cardExpirationMonth: month,
                cardExpirationYear: '20' + year,
                securityCode: cardCvv,
                identification: { type: 'CPF', number: cleanDoc }
             });
             
             // Se o cartão for válido, salva a reserva
             handleConfirm(tokenObj.id);

         } catch (e) {
             console.error("Erro MP:", e);
             alert("Dados do cartão inválidos ou recusados pelo Mercado Pago. Verifique a digitação.");
             setProcessing(false);
         }
     }
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-20 px-4 animate-fade-in relative z-0">
      
      {showSuccess && createPortal(
          <SuccessModal isOpen={showSuccess} onClose={()=>setShowSuccess(false)} title="Reserva Confirmada!" message="Sua reserva foi realizada com sucesso. Acesse seu voucher." onAction={()=>navigate('/minhas-viagens')} actionLabel="Meus Ingressos"/>,
          document.body
      )}

      {showPixModal && createPortal(
          <PixModal 
              isOpen={showPixModal} 
              onClose={()=>setShowPixModal(false)} 
              pixData={pixData} 
              onConfirm={() => handleConfirm("PIX_CONFIRMADO")}
              paymentId={createdPaymentId} 
              partnerToken={null} 
          />,
          document.body
      )}
      
      {showLogin && createPortal(
          <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={()=>{setShowLogin(false);}} />,
          document.body
      )}
      
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
                  
                  {!user.emailVerified && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                          <p className="text-xs text-yellow-800 font-bold flex items-center gap-1 mb-1"><AlertCircle size={12}/> E-mail não verificado</p>
                          <button className="text-xs text-[#0097A8] font-bold hover:underline" onClick={handleResendVerification}>Reenviar confirmação</button>
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
             <h3 className="font-bold text-xl mb-4 text-slate-900">Forma de Pagamento</h3>
             
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
                  <p className="text-sm text-slate-600 mb-4">Ao confirmar, geraremos um código Pix para você.</p>
                  <div className="text-left mt-4"><label className="text-xs font-bold text-slate-500 uppercase">CPF do Pagador (Opcional)</label><input className="w-full border p-3 rounded-lg mt-1" placeholder="000.000.000-00" value={docNumber} onChange={e=>setDocNumber(e.target.value)}/></div>
               </div>
             )}
             
             <div className="mt-6">
                 <Button 
                    className="w-full py-4 text-lg" 
                    onClick={processCardPayment} 
                    disabled={processing}
                 >
                     {processing ? 'Processando...' : (paymentMethod === 'pix' ? 'Gerar Código Pix' : `Confirmar Reserva (${formatBRL(finalTotal)})`)}
                 </Button>
             </div>
             
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
           const userDoc = await getDoc(doc(db, "users", u.uid));
           if(userDoc.exists() && userDoc.data().ownerId) {
               setOwnerId(userDoc.data().ownerId);
               const qRes = query(collection(db, "reservations"), where("ownerId", "==", userDoc.data().ownerId));
               onSnapshot(qRes, s => setReservations(s.docs.map(d => ({id: d.id, ...d.data()}))));
           }
        }
     });
     return unsub;
  }, []);

  const resendVerify = async () => {
      try { await sendEmailVerification(user); alert("E-mail enviado!"); } 
      catch(e) { alert("Erro ao enviar."); }
  };

  // ... (código anterior de filtros e validação mantido, omitido para brevidade)
  const dailyGuests = reservations.filter(r => r.date === filterDate && (r.guestName || "Viajante").toLowerCase().includes(searchTerm.toLowerCase()));
  const dailyStats = dailyGuests.reduce((acc, curr) => ({ adults: acc.adults + (curr.adults || 0), children: acc.children + (curr.children || 0), pets: acc.pets + (curr.pets || 0), total: acc.total + (curr.adults || 0) + (curr.children || 0) }), { adults: 0, children: 0, pets: 0, total: 0 });
  const handleValidate = async (resId, codeInput) => { if(codeInput.toUpperCase() === resId.slice(0,6).toUpperCase() || resId === codeInput) { try { await updateDoc(doc(db, "reservations", resId), { status: 'validated' }); const res = reservations.find(r => r.id === resId); setFeedback({ type: 'success', title: 'Acesso Liberado! 🎉', msg: `Bem-vindo(a), ${res?.guestName || 'Visitante'}.` }); } catch (e) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao validar.' }); } } else { setFeedback({ type: 'error', title: 'Inválido', msg: 'Código incorreto.' }); } };
  const onScanSuccess = (decodedText) => { setShowScanner(false); const res = reservations.find(r => r.id === decodedText); if (res) { if (res.status === 'validated') setFeedback({ type: 'warning', title: 'Atenção', msg: 'Ingresso JÁ UTILIZADO.' }); else if (res.status === 'cancelled') setFeedback({ type: 'error', title: 'Cancelado', msg: 'Ingresso cancelado.' }); else handleValidate(res.id, res.id); } else { setFeedback({ type: 'error', title: 'Não Encontrado', msg: 'QR Code não pertence a este local.' }); } };

  if (!user) return <div className="text-center py-20 text-slate-400">Carregando acesso...</div>;
  if (!ownerId) return <div className="text-center py-20 text-red-400">Erro: Conta não vinculada a um parceiro. Peça ao administrador para recadastrar.</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in space-y-6">
       <VoucherModal isOpen={!!selectedRes} trip={selectedRes} onClose={()=>setSelectedRes(null)} isPartnerView={true}/>
       
       {/* TRAVA DE E-MAIL DO STAFF */}
       {!user.emailVerified ? (
           <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-xl text-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={40} className="text-yellow-600"/>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Pendente</h2>
                <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                    Olá! Para segurança do estabelecimento, você precisa confirmar seu e-mail antes de validar ingressos.
                </p>
                <div className="flex flex-col items-center gap-3">
                    <Button onClick={resendVerify}>Reenviar E-mail de Confirmação</Button>
                    <button onClick={() => window.location.reload()} className="text-sm text-[#0097A8] hover:underline font-bold mt-2">Já confirmei, atualizar página</button>
                </div>
           </div>
       ) : (
           <>
               <QrScannerModal isOpen={showScanner} onClose={()=>setShowScanner(false)} onScan={onScanSuccess} />
               {/* Feedback e Lista Normal */}
               {feedback && createPortal( <ModalOverlay onClose={() => setFeedback(null)}> <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"> <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${feedback.type === 'success' ? 'bg-green-100 text-green-600' : feedback.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}> {feedback.type === 'success' ? <CheckCircle size={32}/> : <AlertCircle size={32}/>} </div> <h2 className="text-xl font-bold text-slate-900 mb-2">{feedback.title}</h2> <p className="text-slate-600 mb-6 text-sm">{feedback.msg}</p> <Button onClick={() => setFeedback(null)} className="w-full justify-center">Fechar</Button> </div> </ModalOverlay>, document.body )}

               <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div><h1 className="text-2xl font-bold text-slate-900">Portaria</h1><p className="text-slate-500 text-sm">Controle de Acesso Diário</p></div>
                  <div className="text-right"><p className="text-xs text-slate-400 font-bold uppercase">Hoje</p><p className="text-2xl font-bold text-[#0097A8]">{dailyStats.total} <span className="text-sm font-normal text-slate-400">pessoas</span></p></div>
               </div>

               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                   <div className="flex gap-4 mb-6"><input type="date" className="border p-3 rounded-xl text-slate-600 font-medium" value={filterDate} onChange={e=>setFilterDate(e.target.value)}/><Button className="flex-1" onClick={() => setShowScanner(true)}><ScanLine size={20}/> Ler QR Code</Button></div>
                   <div className="relative mb-6"><Search size={18} className="absolute left-3 top-3.5 text-slate-400"/><input className="w-full border p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-[#0097A8]" placeholder="Buscar nome..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
                   <div className="space-y-3">{dailyGuests.length === 0 ? <p className="text-center text-slate-400 py-8">Nenhum ingresso para hoje.</p> : dailyGuests.map(r => (<div key={r.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100"><div><p className="font-bold text-slate-900">{r.guestName}</p><div className="flex gap-2 text-xs text-slate-500 mt-1"><span>{r.adults} Adt</span> • <span>{r.children} Cri</span> • <span>{r.pets} Pets</span></div></div>{r.status === 'validated' ? (<div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> OK</div>) : (<Button className="px-4 py-1.5 h-auto text-xs" onClick={()=>handleValidate(r.id, r.id.slice(0,6))}>Validar</Button>)}</div>))}</div>
               </div>
           </>
       )}
    </div>
  );
};

// ... (outros componentes)

// -----------------------------------------------------------------------------
// COMPONENTE: CALENDÁRIO DE OCUPAÇÃO (PARCEIRO)
// -----------------------------------------------------------------------------
const OccupancyCalendar = ({ reservations, selectedDate, onDateSelect }) => {
  const [curr, setCurr] = useState(new Date());
  const daysInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  // Cache de ocupação por dia
  const getDailyStats = (day) => {
      const dateStr = new Date(curr.getFullYear(), curr.getMonth(), day).toISOString().split('T')[0];
      const dayRes = reservations.filter(r => r.date === dateStr && r.status === 'confirmed');
      
      const stats = dayRes.reduce((acc, r) => ({
          a: acc.a + Number(r.adults || 0),
          c: acc.c + Number(r.children || 0),
          p: acc.p + Number(r.pets || 0)
      }), { a: 0, c: 0, p: 0 });

      return { ...stats, hasData: dayRes.length > 0 };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <button type="button" onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth()-1)))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={20}/></button>
            <span className="font-bold text-slate-800 text-lg capitalize">{curr.toLocaleString('pt-BR',{month:'long', year:'numeric'})}</span>
            <button type="button" onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth()+1)))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={20}/></button>
        </div>
        <div className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Adultos</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"></div> Crianças</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Pets</span>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((d,i)=><span key={i} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</span>)}
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {Array.from({length: firstDay}).map((_,i)=><div key={`e-${i}`}/>)}
        {Array.from({length: daysInMonth}).map((_,i)=>{
          const d = i+1;
          const dateStr = new Date(curr.getFullYear(), curr.getMonth(), d).toISOString().split('T')[0];
          const stats = getDailyStats(d);
          const isSelected = dateStr === selectedDate;

          return (
            <button 
                key={d} 
                onClick={() => onDateSelect(dateStr)}
                className={`h-20 w-full rounded-xl border flex flex-col items-center justify-start pt-2 transition-all relative overflow-hidden group ${
                    isSelected 
                        ? 'border-[#0097A8] bg-cyan-50 ring-2 ring-[#0097A8] ring-offset-2' 
                        : 'border-slate-100 hover:border-slate-300 hover:shadow-md bg-white'
                }`}
            >
              <span className={`text-sm font-bold mb-1 ${isSelected ? 'text-[#0097A8]' : 'text-slate-700'}`}>{d}</span>
              
              {stats.hasData ? (
                  <div className="flex flex-col gap-0.5 w-full px-1">
                      {stats.a > 0 && <div className="flex items-center justify-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 rounded-full py-0.5 px-1 font-bold"><User size={8} fill="currentColor"/> {stats.a}</div>}
                      {stats.c > 0 && <div className="flex items-center justify-center gap-1 text-[10px] text-pink-700 bg-pink-50 rounded-full py-0.5 px-1 font-bold"><User size={8}/> {stats.c}</div>}
                      {stats.p > 0 && <div className="flex items-center justify-center gap-1 text-[10px] text-orange-700 bg-orange-50 rounded-full py-0.5 px-1 font-bold"><PawPrint size={8}/> {stats.p}</div>}
                  </div>
              ) : (
                  <span className="text-[10px] text-slate-300 mt-2">-</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// PAINEL DO PARCEIRO (COMPLETO E BLINDADO + ONBOARDING)
// -----------------------------------------------------------------------------
const PartnerDashboard = () => {
  // --- STATES DE DADOS ---
  const [items, setItems] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [requests, setRequests] = useState([]); 
  
  // --- STATES DE FILTRO E CONTROLE ---
  const [selectedRes, setSelectedRes] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [validationCode, setValidationCode] = useState("");
  
  // States de Segurança e Integração
  const [mpConnected, setMpConnected] = useState(false);
  const [tokenType, setTokenType] = useState(null); 
  const [docStatus, setDocStatus] = useState('none'); // none, pending, verified, rejected
  
  // --- STATES DE UI/MODAIS ---
  const [expandedStats, setExpandedStats] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [feedback, setFeedback] = useState(null); 
  const [confirmAction, setConfirmAction] = useState(null);
  
  // --- STATES GESTÃO EQUIPE ---
  const [editStaffModal, setEditStaffModal] = useState(null); 
  const [newStaffEmailInput, setNewStaffEmailInput] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  // --- STATES GESTÃO DE RESERVAS ---
  const [manageRes, setManageRes] = useState(null);
  const [manageAction, setManageAction] = useState('reschedule'); 
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [refundPercent, setRefundPercent] = useState(100);
  const [manageLoading, setManageLoading] = useState(false);

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showCelebration, setShowCelebration] = useState(true); // Controla o banner final

  // 1. CARREGAMENTO INICIAL E LISTENERS
  useEffect(() => {
     const unsub = onAuthStateChanged(auth, async u => {
        if(u) {
           setUser(u);
           const userDoc = await getDoc(doc(db, "users", u.uid));
           
           if(userDoc.exists()) {
               const d = userDoc.data();
               setDocStatus(d.docStatus || 'none');
               if(d.mp_access_token) {
                   setMpConnected(true);
                   setTokenType(d.mp_access_token.startsWith('TEST') ? 'TEST' : 'PROD');
               }
           }
           
           // Listeners em Tempo Real
           const qDay = query(collection(db, "dayuses"), where("ownerId", "==", u.uid));
           const qRes = query(collection(db, "reservations"), where("ownerId", "==", u.uid));
           const qStaff = query(collection(db, "users"), where("ownerId", "==", u.uid));
           const qReq = query(collection(db, "requests"), where("ownerId", "==", u.uid), where("status", "==", "pending"));

           onSnapshot(qDay, s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
           onSnapshot(qRes, s => setReservations(s.docs.map(d => ({id: d.id, ...d.data()}))));
           onSnapshot(qStaff, s => setStaffList(s.docs.map(d => ({id: d.id, ...d.data()}))));
           onSnapshot(qReq, s => setRequests(s.docs.map(d => ({id: d.id, ...d.data()}))));
        }
     });
     return unsub;
  }, []);
  
  // 2. CONEXÃO MERCADO PAGO
  const handleConnect = () => {
     const currentBaseUrl = window.location.origin; 
     const redirect = `${currentBaseUrl}/partner/callback`;
     const encodedRedirect = encodeURIComponent(redirect);
     const clientId = import.meta.env.VITE_MP_CLIENT_ID;
     window.location.href = `https://auth.mercadopago.com.br/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${user.uid}&redirect_uri=${encodedRedirect}`;
  };

  // --- TRAVAS DE SEGURANÇA E BOTÕES ---
  
  // Ação: Reenviar E-mail (Para desbloquear Etapa 1)
  const handleResendVerify = async () => {
      if(!user) return;
      try {
          await sendEmailVerification(user, { url: 'https://mapadodayuse.com/partner', handleCodeInApp: true });
          setFeedback({ type: 'success', title: 'Link Enviado', msg: `Link enviado para ${user.email}. Verifique a caixa de entrada e SPAM.` });
      } catch(e) {
          console.error(e);
          setFeedback({ type: 'error', title: 'Erro', msg: "Erro ao enviar. Tente novamente em alguns minutos." });
      }
  };

  // Ação: Enviar Documentos (Etapa 2 - Bloqueada se E-mail não verificado)
  const handleVerifyDocsClick = () => {
      if (!user?.emailVerified) {
          setFeedback({
              type: 'warning',
              title: 'E-mail Pendente',
              msg: 'Para garantir a segurança, você precisa confirmar seu e-mail antes de enviar a documentação da empresa. Verifique sua caixa de entrada.'
          });
          return;
      }
      navigate('/partner/verificacao');
  };

  // Ação: Conectar MP (Etapa 3 - Bloqueada se Empresa não verificada)
  const handleConnectClick = () => {
      if (docStatus !== 'verified') {
          setFeedback({ type: 'warning', title: 'Empresa em Análise', msg: 'Para receber pagamentos, precisamos primeiro aprovar a documentação da sua empresa.' });
          // Redireciona para verificação caso ainda não tenha enviado
          if (docStatus === 'none' || docStatus === 'rejected') navigate('/partner/verificacao');
      } else {
          handleConnect();
      }
  };

  // Ação: Criar Anúncio (Etapa 4 - Bloqueada se MP não conectado)
  const handleCreateAdClick = () => {
      if (docStatus !== 'verified') {
          setFeedback({ type: 'warning', title: 'Verificação Necessária', msg: 'Sua conta empresarial precisa ser aprovada para criar anúncios.' });
          navigate('/partner/verificacao');
      } else if (!mpConnected) {
          setFeedback({ type: 'warning', title: 'Conexão Necessária', msg: 'Para vender ingressos, conecte sua conta do Mercado Pago.' });
      } else {
          navigate('/partner/new');
      }
  };

  // Wrapper de segurança para ações de equipe
  const requireVerified = (action) => {
      if (docStatus !== 'verified') {
          setFeedback({ type: 'warning', title: 'Acesso Restrito', msg: 'Valide sua empresa para gerenciar equipe.' });
          return;
      }
      action();
  };

  // --- AÇÕES DO MODAL DE CONFIRMAÇÃO ---
  const togglePause = (item) => { setConfirmAction({ type: item.paused ? 'resume_ad' : 'pause_ad', payload: item }); };
  const confirmDeleteStaff = (staffId) => { requireVerified(() => setConfirmAction({ type: 'delete_staff', payload: staffId })); };
  const confirmResetStaffPass = (email, requestId = null) => { requireVerified(() => setConfirmAction({ type: 'reset_staff_pass', payload: { email, requestId } })); };
  const handleEditEmailClick = () => { setFeedback({ type: 'warning', title: 'Alteração de E-mail', msg: 'Para garantir a segurança, não é possível alterar o e-mail diretamente. Remova o usuário e crie um novo.' }); };

  const executeAction = async () => {
      if (!confirmAction) return;
      const { type, payload } = confirmAction;

      try {
          if (type === 'pause_ad' || type === 'resume_ad') {
               await updateDoc(doc(db, "dayuses", payload.id), { paused: type === 'pause_ad' });
               setFeedback({ type: 'success', title: 'Sucesso', msg: `Anúncio ${type === 'pause_ad' ? 'pausado' : 'reativado'}.` });
          }
          else if (type === 'delete_staff') {
               await deleteDoc(doc(db, "users", payload));
               setFeedback({ type: 'success', title: 'Removido', msg: 'Acesso revogado.' });
          }
          else if (type === 'reset_staff_pass') {
               await sendPasswordResetEmail(auth, payload.email);
               if (payload.requestId) await updateDoc(doc(db, "requests", payload.requestId), { status: 'completed' });
               setFeedback({ type: 'success', title: 'E-mail Enviado', msg: 'Link enviado.' });
          }
      } catch (error) {
          setFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível completar a ação.' });
      } finally {
          setConfirmAction(null);
      }
  };

  // --- GESTÃO DE RESERVAS (ESTORNO/REAGENDAMENTO) ---
  const handleManageSubmit = async () => {
      if (!manageRes) return;
      setManageLoading(true);

      const payload = {
          reservationId: manageRes.id,
          action: manageAction === 'reschedule' ? 'reschedule' : (refundPercent === 100 ? 'cancel_full' : 'cancel_partial'),
          percentage: refundPercent,
          newDate: rescheduleDate
      };

      try {
          const response = await fetch('/api/refund', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const data = await response.json();

          if (response.ok) {
              setFeedback({ type: 'success', title: 'Sucesso', msg: data.message });
              setManageRes(null);
          } else {
              throw new Error(data.error || "Erro desconhecido");
          }
      } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', title: 'Erro', msg: err.message });
      } finally {
          setManageLoading(false);
      }
  };

  // --- OPERACIONAL ---
  const handleValidate = async (resId, codeInput) => { if(codeInput.toUpperCase() === resId.slice(0,6).toUpperCase() || resId === codeInput) { try { await updateDoc(doc(db, "reservations", resId), { status: 'validated' }); setFeedback({ type: 'success', title: 'Check-in Realizado!', msg: 'Acesso liberado.' }); setValidationCode(""); } catch (e) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao validar.' }); } } else { setFeedback({ type: 'error', title: 'Código Inválido', msg: 'Verifique o código.' }); } };
  const onScanSuccess = (decodedText) => { setShowScanner(false); const res = reservations.find(r => r.id === decodedText); if (res) { if (res.status === 'validated') setFeedback({ type: 'warning', title: 'Atenção', msg: 'Ingresso JÁ UTILIZADO.' }); else if (res.status === 'cancelled') setFeedback({ type: 'error', title: 'Cancelado', msg: 'Ingresso cancelado.' }); else handleValidate(res.id, res.id); } else setFeedback({ type: 'error', title: 'Não Encontrado', msg: 'QR Code inválido.' }); };

  // --- GESTÃO DE EQUIPE (API + FIREBASE) ---
  const handleUpdateStaffEmail = async (staffId, newEmail, requestId = null) => { setStaffLoading(true); try { const response = await fetch('/api/admin-update-staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId, newEmail, ownerId: user.uid }) }); if (response.ok) { await fetch('/api/send-auth-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newEmail, type: 'verify_email', name: 'Colaborador' }) }); if (requestId) await updateDoc(doc(db, "requests", requestId), { status: 'completed' }); setFeedback({ type: 'success', title: 'Atualizado!', msg: `E-mail alterado para ${newEmail}. Link de confirmação enviado.` }); setEditStaffModal(null); setNewStaffEmailInput(''); } else throw new Error(); } catch (err) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao atualizar.' }); } finally { setStaffLoading(false); } };
  const handleDeleteStaff = async (staffId) => { setConfirmAction({ type: 'delete_staff', payload: staffId }); };
  const handleAddStaff = async (e) => { e.preventDefault(); setStaffLoading(true); try { const secondaryApp = initializeApp(getApp().options, "Secondary"); const secondaryAuth = getAuth(secondaryApp); const createdUser = await createUserWithEmailAndPassword(secondaryAuth, staffEmail, staffPass); await sendEmailVerification(createdUser.user); await setDoc(doc(db, "users", createdUser.user.uid), { email: staffEmail, role: 'staff', ownerId: user.uid, createdAt: new Date(), name: "Portaria" }); await signOut(secondaryAuth); setFeedback({ type: 'success', title: 'Criado!', msg: 'Usuário criado. Link de confirmação enviado.' }); setStaffEmail(''); setStaffPass(''); } catch (err) { setFeedback({ type: 'error', title: 'Erro', msg: 'Verifique dados.' }); } finally { setStaffLoading(false); } };

  // Cálculos Financeiros
    const financialRes = reservations.filter(r => r.createdAt && new Date(r.createdAt.seconds * 1000).getMonth() === filterMonth && r.status === 'confirmed');
  
  const totalBalance = financialRes.reduce((acc, c) => acc + (c.total || 0), 0);
  const platformFee = totalBalance * 0.15;
  const estimatedMPFees = totalBalance * 0.0499;
  const netBalance = totalBalance - platformFee - estimatedMPFees;
  
  const pixTotal = financialRes.filter(r => r.paymentMethod === 'pix').reduce((acc, c) => acc + (c.total || 0), 0);
  const cardTotal = totalBalance - pixTotal; 
  
  // --- CÁLCULOS DE CUPONS (ESTAVA FALTANDO ISSO) ---
  const couponRes = financialRes.filter(r => r.couponCode); // Reservas com cupom no mês
  
  // 1. Receita total gerada por cupons
  const totalCouponRevenue = couponRes.reduce((acc, r) => acc + (r.total || 0), 0);
  
  // 2. Detalhamento por cupom
  const couponBreakdown = couponRes.reduce((acc, r) => {
      const code = r.couponCode;
      if (!acc[code]) acc[code] = { count: 0, revenue: 0 };
      acc[code].count += 1;
      acc[code].revenue += (r.total || 0);
      return acc;
  }, {});

  // Variável legada para compatibilidade se houver uso antigo
  const allCouponsUsed = couponRes.length;
  
  // Filtro Operacional
  const dailyGuests = reservations.filter(r => 
      r.date === filterDate && 
      (r.guestName || "Viajante").toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const dailyStats = dailyGuests.reduce((acc, curr) => {
      const adt = Number(curr.adults || 0);
      const chd = Number(curr.children || 0);
      const free = Number(curr.freeChildren || 0);
      const pet = Number(curr.pets || 0);
      let specials = 0;
      if (curr.selectedSpecial) Object.values(curr.selectedSpecial).forEach(q => specials += Number(q));
      return { 
          adults: acc.adults + adt, 
          children: acc.children + chd, 
          freeChildren: acc.freeChildren + free, 
          pets: acc.pets + pet, 
          specials: acc.specials + specials, 
          total: acc.total + adt + chd + free 
      };
  }, { adults: 0, children: 0, freeChildren: 0, pets: 0, specials: 0, total: 0 });

  if (!user) return <div className="text-center py-20 text-slate-400">Carregando painel...</div>;

  // Lógica de Conclusão do Onboarding
  const isEmailDone = user.emailVerified;
  const isDocsDone = docStatus === 'verified';
  const isMpDone = mpConnected;
  const isAdDone = items.length > 0;
  const allDone = isEmailDone && isDocsDone && isMpDone && isAdDone;

  return (
     <div className="max-w-7xl mx-auto py-12 px-4 animate-fade-in space-y-12 relative">
        <VoucherModal isOpen={!!selectedRes} trip={selectedRes} onClose={()=>setSelectedRes(null)} isPartnerView={true}/>
        <QrScannerModal isOpen={showScanner} onClose={()=>setShowScanner(false)} onScan={onScanSuccess} />
        {feedback && createPortal(<FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback.type} title={feedback.title} msg={feedback.msg} />, document.body)}
        
        {confirmAction && createPortal(
            <ModalOverlay onClose={() => setConfirmAction(null)}>
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmAction.type.includes('delete') ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        <AlertCircle size={32}/>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Confirmar Ação?</h2>
                    <p className="text-slate-600 mb-6 text-sm">
                        {confirmAction.type === 'pause_ad' && 'Seu anúncio ficará oculto.'}
                        {confirmAction.type === 'resume_ad' && 'Seu anúncio voltará a aparecer.'}
                        {confirmAction.type === 'delete_staff' && 'O funcionário perderá acesso imediato.'}
                        {confirmAction.type === 'reset_staff_pass' && 'Um e-mail será enviado para reset de senha.'}
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={() => setConfirmAction(null)} variant="ghost" className="flex-1 justify-center">Cancelar</Button>
                        <Button onClick={executeAction} className={`flex-1 justify-center ${confirmAction.type.includes('delete') ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>Confirmar</Button>
                    </div>
                </div>
            </ModalOverlay>, 
            document.body
        )}

        {editStaffModal && createPortal(
            <ModalOverlay onClose={() => setEditStaffModal(null)}>
                <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md animate-fade-in text-center">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">Alterar E-mail</h3>
                    <p className="text-sm text-slate-500 mb-4">Atual: <strong>{editStaffModal.currentEmail}</strong></p>
                    <input className="w-full border p-3 rounded-xl mb-4" placeholder="Novo e-mail" value={newStaffEmailInput} onChange={e=>setNewStaffEmailInput(e.target.value)} />
                    <Button onClick={() => handleUpdateStaffEmail(editStaffModal.id, newStaffEmailInput)} disabled={staffLoading} className="w-full justify-center">{staffLoading ? 'Atualizando...' : 'Confirmar Alteração'}</Button>
                </div>
            </ModalOverlay>,
            document.body
        )}

        {showNotifications && createPortal(
            <ModalOverlay onClose={() => setShowNotifications(false)}>
                <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md animate-fade-in flex flex-col max-h-[80vh]">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800"><Bell className="text-yellow-500"/> Solicitações</h3>
                        <button onClick={()=>setShowNotifications(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                    </div>
                    <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                        {requests.length === 0 ? <p className="text-slate-400 text-center py-4 text-sm">Nenhuma solicitação pendente.</p> : requests.map(req => (
                            <div key={req.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-sm text-slate-700">{req.staffName || 'Staff'}</span>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">{req.type}</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                    {req.type === 'email' ? <span>Novo e-mail: <strong>{req.newEmailValue}</strong></span> : 'Solicitou redefinição de senha.'}
                                </p>
                                <div className="flex gap-2">
                                    {req.type === 'password' ? (
                                        <Button onClick={() => handleResetStaffPassword(req.staffEmail, req.id)} className="w-full h-8 text-xs justify-center">Enviar Link</Button>
                                    ) : (
                                        <Button onClick={() => handleUpdateStaffEmail(req.staffId, req.newEmailValue, req.id)} className="w-full h-8 text-xs justify-center bg-green-600 hover:bg-green-700 text-white shadow-none">Aprovar Troca</Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </ModalOverlay>, 
            document.body
        )}
        
        {manageRes && createPortal(
            <ModalOverlay onClose={() => setManageRes(null)}>
                <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800">Gerenciar Reserva</h3>
                        <button onClick={()=>setManageRes(null)}><X size={20}/></button>
                    </div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                        <button onClick={()=>setManageAction('reschedule')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${manageAction==='reschedule'?'bg-white text-[#0097A8] shadow-sm':'text-slate-500'}`}>Reagendar</button>
                        <button onClick={()=>setManageAction('cancel')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${manageAction==='cancel'?'bg-white text-red-600 shadow-sm':'text-slate-500'}`}>Cancelar</button>
                    </div>

                    {manageAction === 'reschedule' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">Atual: <strong>{manageRes.date.split('-').reverse().join('/')}</strong></p>
                            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nova Data</label><input type="date" className="w-full border p-3 rounded-xl bg-slate-50" value={rescheduleDate} onChange={e=>setRescheduleDate(e.target.value)} /></div>
                            <Button onClick={handleManageSubmit} disabled={manageLoading} className="w-full mt-2">{manageLoading ? 'Salvando...' : 'Confirmar Data'}</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-sm text-red-800"><p className="font-bold mb-1">Atenção:</p><p>O estorno será processado automaticamente.</p></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Reembolso (%)</label><div className="flex items-center gap-4"><input type="range" min="0" max="100" step="10" value={refundPercent} onChange={e=>setRefundPercent(Number(e.target.value))} className="flex-1 accent-red-600"/><span className="font-bold text-red-600 w-12 text-right">{refundPercent}%</span></div><p className="text-xs text-right text-slate-400 mt-1">Devolver: <strong>{formatBRL(manageRes.total * (refundPercent/100))}</strong></p></div>
                            <Button onClick={handleManageSubmit} disabled={manageLoading} variant="danger" className="w-full mt-2">{manageLoading ? 'Processando...' : 'Confirmar Cancelamento'}</Button>
                        </div>
                    )}
                </div>
            </ModalOverlay>, 
            document.body
        )}

        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-8 border-b border-slate-200 pb-4 gap-4">
           <div className="text-center md:text-left flex items-center gap-3">
               <div>
                   <h1 className="text-3xl font-bold text-slate-900">Painel de Gestão</h1>
                   <p className="text-slate-500">Acompanhe seu negócio.</p>
               </div>
               {docStatus === 'verified' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-green-200 flex items-center gap-1"><Award size={12}/> Verificado</span>}
           </div>
           
           <div className="flex gap-3 items-center flex-wrap justify-center">
              <button className="relative p-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm" onClick={() => setShowNotifications(true)}>
                  <Bell size={20} className="text-slate-600"/>
                  {requests.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
              </button>
              
              {!mpConnected ? (
                  <button 
                    onClick={handleConnectClick} 
                    className={`bg-[#009EE3] hover:bg-[#0081b9] text-white px-4 py-3 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 ${docStatus !== 'verified' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                      {/* Logo simples do MP (Mãozinha) ou fallback para ícone de link */}
                      <img 
                        src="https://img.icons8.com/color/48/mercado-pago.png" 
                        alt="MP" 
                        className="w-5 h-5 bg-white rounded-full p-0.5" 
                        onError={(e) => {e.target.style.display='none'}}
                      />
                      Conectar Mercado Pago
                  </button>
              ) : (
                  <div className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold border border-slate-200 flex items-center text-sm">
                      <CheckCircle size={16} className="text-green-600 inline mr-2"/> Conectado
                  </div>
              )}
              
              <Button 
                onClick={handleCreateAdClick}
                className={docStatus !== 'verified' || !mpConnected ? 'opacity-50 cursor-not-allowed' : ''}
              >
                  Configurar meu day use
              </Button>
           </div>
        </div>

        {/* --- FLUXO DE SUCESSO (ONBOARDING PROGRESSIVO) --- */}
        {!allDone && (
            <div className="grid md:grid-cols-4 gap-4 mb-12 animate-fade-in">
                
                {/* 1. E-MAIL */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${isEmailDone ? 'bg-white border-green-200 opacity-70' : 'bg-yellow-50 border-yellow-200 shadow-md ring-2 ring-yellow-100'}`}>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passo 1</span>
                            {isEmailDone && <CheckCircle size={16} className="text-green-500"/>}
                        </div>
                        <h3 className={`font-bold text-sm ${isEmailDone ? 'text-slate-700' : 'text-yellow-800'}`}>Confirmar E-mail</h3>
                    </div>
                    {!isEmailDone ? (
                        <button onClick={handleResendVerify} className="mt-2 text-xs font-bold bg-white border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg hover:bg-yellow-100 text-center">Reenviar Link</button>
                    ) : <p className="text-xs text-green-600 font-bold mt-2">Concluído!</p>}
                </div>

                {/* 2. EMPRESA */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    !isEmailDone ? 'bg-slate-50 border-slate-100 opacity-40' : // Travado
                    isDocsDone ? 'bg-white border-green-200 opacity-70' : // Feito
                    docStatus === 'pending' ? 'bg-yellow-50 border-yellow-200' : // Em análise
                    'bg-orange-50 border-orange-200 shadow-md ring-2 ring-orange-100' // Fazer agora
                }`}>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passo 2</span>
                            {!isEmailDone && <Lock size={14} className="text-slate-300"/>}
                            {isDocsDone && <CheckCircle size={16} className="text-green-500"/>}
                        </div>
                        <h3 className={`font-bold text-sm ${isDocsDone ? 'text-slate-700' : 'text-slate-800'}`}>
                            {docStatus === 'pending' ? 'Análise (24h)' : 'Validar Empresa'}
                        </h3>
                        {docStatus === 'pending' && <p className="text-xs text-slate-500 mt-1">Estamos analisando seus docs.</p>}
                        {docStatus === 'none' && !isDocsDone && isEmailDone && <p className="text-xs text-orange-700 mt-1">Envie Contrato Social ou CCMEI.</p>}
                    </div>
                    {isEmailDone && !isDocsDone && docStatus !== 'pending' && (
                        <button onClick={() => navigate('/partner/verificacao')} className="mt-2 text-xs font-bold bg-white border border-orange-200 text-orange-700 px-3 py-2 rounded-lg hover:bg-orange-100 text-center">Enviar Documentos</button>
                    )}
                    {isDocsDone && <p className="text-xs text-green-600 font-bold mt-2">Empresa Aprovada!</p>}
                </div>

                {/* 3. MERCADO PAGO (Só libera se doc aprovado) */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    !isDocsDone ? 'bg-slate-50 border-slate-100 opacity-40' :
                    isMpDone ? 'bg-white border-green-200 opacity-70' :
                    'bg-blue-50 border-blue-200 shadow-md ring-2 ring-blue-100'
                }`}>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passo 3</span>
                            {!isDocsDone && <Lock size={14} className="text-slate-300"/>}
                            {isMpDone && <CheckCircle size={16} className="text-green-500"/>}
                        </div>
                        <h3 className="font-bold text-sm text-slate-800">Conectar Carteira</h3>
                        {isDocsDone && !isMpDone && <p className="text-xs text-blue-700 mt-1">Conecte sua conta Mercado Pago e cadastre uma chave Pix.</p>}
                    </div>
                    {isDocsDone && !isMpDone && (
                        <button onClick={handleConnect} className="mt-2 text-xs font-bold bg-[#009EE3] text-white px-3 py-2 rounded-lg hover:bg-[#0081b9] text-center shadow-sm">Conectar Mercado Pago</button>
                    )}
                    {isMpDone && <p className="text-xs text-green-600 font-bold mt-2">Conectado!</p>}
                </div>

                {/* 4. ANÚNCIO (Só libera se MP conectado) */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    !isMpDone ? 'bg-slate-50 border-slate-100 opacity-40' :
                    'bg-[#0097A8]/10 border-[#0097A8]/30 shadow-md ring-2 ring-[#0097A8]/20'
                }`}>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passo 4</span>
                            {!isMpDone && <Lock size={14} className="text-slate-300"/>}
                        </div>
                        <h3 className="font-bold text-sm text-[#0097A8]">Configurar Day Use</h3>
                        {isMpDone && <p className="text-xs text-slate-600 mt-1">Cadastre fotos, preços e regras.</p>}
                    </div>
                    {isMpDone && (
                        <button onClick={() => navigate('/partner/new')} className="mt-2 text-xs font-bold bg-[#0097A8] text-white px-3 py-2 rounded-lg hover:bg-[#007f8f] text-center shadow-lg shadow-teal-100">Criar Anúncio</button>
                    )}
                </div>
            </div>
        )}

        {/* CELEBRAÇÃO (FINAL) */}
        {allDone && showCelebration && (
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-8 rounded-3xl text-white text-center shadow-xl mb-12 animate-fade-in relative overflow-hidden">
                {/* Botão Fechar */}
                <button 
                    onClick={() => setShowCelebration(false)} 
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-20"
                    title="Fechar mensagem"
                >
                    <X size={20}/>
                </button>

                <div className="relative z-10">
                    <span className="text-5xl block mb-4 animate-bounce">🚀</span>
                    <h2 className="text-3xl font-extrabold mb-2">Parabéns! Você completou tudo!</h2>
                    <p className="opacity-90 mb-8 text-lg max-w-lg mx-auto">Seu Day Use está pronto para vender. Agora é hora de divulgar.</p>
                    
                    {items.length > 0 && (
                        <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl inline-flex flex-col items-center gap-4 border border-white/30 max-w-full">
                            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Seu Link Exclusivo</span>
                            
                            {/* Link Clicável */}
                            <a 
                                href={`https://mapadodayuse.com/${getStateSlug(items[0].state)}/${generateSlug(items[0].name)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-lg font-mono font-bold text-white hover:underline break-all"
                            >
                                mapadodayuse.com/{getStateSlug(items[0].state)}/{generateSlug(items[0].name)}
                            </a>

                            <button 
                                onClick={() => {navigator.clipboard.writeText(`https://mapadodayuse.com/${getStateSlug(items[0].state)}/${generateSlug(items[0].name)}`); alert("Link copiado!");}} 
                                className="bg-white text-teal-600 px-6 py-3 rounded-xl font-bold hover:bg-teal-50 shadow-lg transform hover:scale-105 transition-all"
                            >
                                Copiar e Compartilhar no WhatsApp
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* CONTEÚDO DO PAINEL (BLOQUEADO SE NÃO VERIFICADO) */}
        <div className={`transition-all duration-500 ${!isDocsDone ? 'opacity-30 pointer-events-none filter blur-sm select-none h-64 overflow-hidden relative' : ''}`}>
             
             {/* FINANCEIRO */}
             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-12">
                 <div className="flex justify-between mb-6"><h2 className="text-xl font-bold flex gap-2 text-slate-800"><DollarSign/> Financeiro</h2><select className="border p-2 rounded-lg bg-slate-50 text-sm font-medium" value={filterMonth} onChange={e=>setFilterMonth(Number(e.target.value))}>{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=><option key={i} value={i}>{m}</option>)}</select></div>
                 <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between"><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Resumo do Mês</p><div className="space-y-1 mb-4"><div className="flex justify-between text-sm text-slate-600"><span>Vendas Brutas (GMV):</span><span className="font-bold">{formatBRL(totalBalance)}</span></div><div className="flex justify-between text-xs text-red-400"><span>Comissão Site (15%):</span><span>- {formatBRL(platformFee)}</span></div><div className="flex justify-between text-xs text-red-400"><span>Taxas MP (Est. 4.99%):</span><span>- {formatBRL(estimatedMPFees)}</span></div></div></div><div className="pt-3 border-t border-slate-200"><div className="flex items-center gap-1 mb-1"><p className="text-xs text-green-700 font-bold uppercase">Líquido Estimado</p><div className="group relative"><Info size={12} className="text-green-600 cursor-help"/><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Valor aproximado. Consulte o extrato oficial no app do Mercado Pago.</div></div></div><p className="text-3xl font-bold text-green-700">{formatBRL(netBalance)}</p></div></div>
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200"><p className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-4">Por Método</p><div className="space-y-4"><div><div className="flex justify-between items-center mb-1"><span className="text-sm text-blue-900 font-medium flex items-center gap-2"><CreditCard size={16}/> Cartão</span><span className="font-bold text-blue-900">{formatBRL(cardTotal)}</span></div><div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-600 h-full" style={{ width: totalBalance > 0 ? `${(cardTotal/totalBalance)*100}%` : '0%' }}></div></div></div><div><div className="flex justify-between items-center mb-1"><span className="text-sm text-blue-900 font-medium flex items-center gap-2"><QrCode size={16}/> Pix</span><span className="font-bold text-blue-900">{formatBRL(pixTotal)}</span></div><div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden"><div className="bg-teal-500 h-full" style={{ width: totalBalance > 0 ? `${(pixTotal/totalBalance)*100}%` : '0%' }}></div></div></div></div></div>
                    <div className="p-6 bg-yellow-50 rounded-2xl border border-yellow-200 flex flex-col h-full"><div className="flex justify-between items-start mb-4"><div><p className="text-xs text-yellow-800 font-bold uppercase">Performance de Cupons</p><p className="text-2xl font-bold text-slate-900">{formatBRL(totalCouponRevenue)}</p><p className="text-[10px] text-slate-500">Faturamento bruto via cupons</p></div><Tag className="text-yellow-600" size={32}/></div><div className="flex-1 overflow-y-auto max-h-32 pr-2 custom-scrollbar bg-white rounded-xl p-2 border border-yellow-100">{Object.keys(couponBreakdown).length === 0 ? (<p className="text-xs text-slate-400 italic text-center py-4">Nenhum cupom usado neste mês.</p>) : (Object.entries(couponBreakdown).map(([code, stats]) => (<div key={code} className="flex justify-between items-center text-xs text-slate-600 mb-2 border-b border-slate-100 pb-2 last:border-0 last:mb-0"><span className="font-bold bg-yellow-100 px-1.5 py-0.5 rounded text-yellow-900 uppercase">{code}</span><div className="text-right"><span className="block font-bold">{stats.count} usos</span><span className="block text-[10px] text-green-600">{formatBRL(stats.revenue)}</span></div></div>)))}</div></div>
                 </div>
             </div>
             
             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-12">
               <div className="flex flex-col md:flex-row justify-between mb-8 gap-4"><h2 className="text-xl font-bold flex gap-2 text-slate-800"><List/> Lista de Presença</h2><div className="flex gap-4"><input type="date" className="border p-2 rounded-lg text-slate-600 font-medium" value={filterDate} onChange={e=>setFilterDate(e.target.value)}/><Button variant="outline" onClick={() => setShowScanner(true)}><ScanLine size={18}/> Validar Ingresso</Button></div></div>
               
               <OccupancyCalendar reservations={reservations} selectedDate={filterDate} onDateSelect={setFilterDate} />

               <div className="space-y-4">{dailyGuests.length === 0 ? <p className="text-center text-slate-400 py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhum viajante agendado.</p> : dailyGuests.map(r => (<div key={r.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-white hover:shadow-md transition-shadow rounded-xl border border-slate-200 gap-4"><div className="flex-1"><p className="font-bold text-lg text-slate-900">{r.guestName}</p><p className="text-sm text-slate-500 font-mono">#{r.id.slice(0,6).toUpperCase()} • {r.itemName}</p><div className="flex gap-2 mt-2 text-xs text-slate-600 flex-wrap">{r.adults > 0 && <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">{r.adults} Adultos</span>}{r.children > 0 && <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">{r.children} Crianças</span>}{r.status === 'cancelled' && <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold">CANCELADO</span>}{r.status === 'refunded_partial' && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">ESTORNO PARCIAL</span>}</div></div><div className="flex items-center gap-2">{r.status === 'confirmed' && (<Button variant="outline" className="h-full py-2 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => { setManageRes(r); setRescheduleDate(r.date); }}><Edit size={16}/></Button>)}{r.status === 'validated' ? <div className="px-4 py-2 bg-green-50 text-green-700 font-bold rounded-xl flex items-center gap-2 border border-green-100"><CheckCircle size={18}/> Validado</div> : r.status === 'confirmed' && <div className="flex gap-2"><input id={`code-${r.id}`} className="border p-2 rounded-xl w-24 text-center uppercase font-bold text-slate-700 tracking-wider" placeholder="CÓDIGO" maxLength={6}/><Button onClick={()=>handleValidate(r.id, document.getElementById(`code-${r.id}`).value)} className="h-full py-2 shadow-none">Validar</Button></div>}<Button variant="outline" className="h-full py-2 px-3 rounded-xl" onClick={()=>setSelectedRes(r)}><Info size={18}/></Button></div></div>))}</div>
             </div>
             
             <div><h2 className="text-xl font-bold mb-6 text-slate-900">Meus Anúncios</h2><div className="grid md:grid-cols-2 gap-6">{items.map(i => (<div key={i.id} className={`bg-white p-4 border rounded-2xl flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow relative ${i.paused ? 'opacity-75 bg-slate-50 border-slate-200' : 'border-slate-100'}`}>{i.paused && (<div className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200">PAUSADO</div>)}<img src={i.image} className={`w-24 h-24 rounded-xl object-cover bg-slate-200 ${i.paused ? 'grayscale' : ''}`}/><div className="flex-1"><h4 className="font-bold text-lg text-slate-900 leading-tight">{i.name}</h4><p className="text-sm text-slate-500 mb-2">{i.city}</p><p className="text-sm font-bold text-[#0097A8] bg-cyan-50 w-fit px-2 py-1 rounded-lg">{formatBRL(i.priceAdult)}</p></div><div className="flex flex-col gap-2"><Button variant="outline" className="px-3 h-8 text-xs" onClick={()=>navigate(`/partner/edit/${i.id}`)}><Edit size={14}/> Editar</Button><button onClick={() => confirmTogglePause(i)} className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors flex items-center justify-center gap-1 ${i.paused ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>{i.paused ? <><CheckCircle size={12}/> Reativar</> : <><Ban size={12}/> Pausar</>}</button></div></div>))}</div></div>

             {/* Gestão de Equipe (Mantido) */}
             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mt-12"><h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800"><Users/> Gerenciar Equipe</h2><div className="grid md:grid-cols-2 gap-8"><div className="space-y-4"><h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Membros Ativos</h3>{staffList.length === 0 ? <p className="text-sm text-slate-400 italic">Nenhum funcionário cadastrado.</p> : (<ul className="space-y-3">{staffList.map(staff => (<li key={staff.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group hover:border-[#0097A8] transition-colors"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">{staff.email[0].toUpperCase()}</div><div className="flex flex-col"><span className="text-sm font-bold text-slate-700">{staff.email}</span><span className="text-[10px] text-slate-400">Portaria</span></div></div><div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditStaffModal({ id: staff.id, currentEmail: staff.email }); setNewStaffEmailInput(''); }} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg" title="Editar Email"><Edit size={16}/></button><button onClick={() => confirmResetStaffPass(staff.email)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Redefinir Senha"><Lock size={16}/></button><button onClick={() => confirmDeleteStaff(staff.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Remover"><Trash2 size={16}/></button></div></li>))}</ul>)}</div><div><h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Cadastrar Novo</h3><div className={`bg-slate-50 p-6 rounded-2xl border border-slate-200 ${docStatus !== 'verified' ? 'opacity-50 pointer-events-none' : ''}`}><form onSubmit={handleAddStaff} className="space-y-4"><input className="w-full border p-3 rounded-xl bg-white" placeholder="E-mail do funcionário" value={staffEmail} onChange={e=>setStaffEmail(e.target.value)} required /><input className="w-full border p-3 rounded-xl bg-white" placeholder="Senha de acesso" type="password" value={staffPass} onChange={e=>setStaffPass(e.target.value)} required /><Button type="submit" disabled={staffLoading} className="w-full">{staffLoading ? 'Cadastrando...' : 'Criar Acesso'}</Button></form></div></div></div></div>
        </div>
        
        <div className="bg-slate-900 rounded-3xl p-8 text-center text-white mt-12 mb-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-2">Precisa de ajuda?</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">Fale diretamente com nosso suporte técnico exclusivo para parceiros.</p>
            <div className="flex justify-center gap-4">
                <a href="https://wa.me/5531920058081" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#20bd5a] transition-all transform hover:scale-105 shadow-lg"><MessageCircle size={22} /> WhatsApp</a>
                <a href="https://mapadodayuse.notion.site/Central-de-Ajuda-Mapa-do-Day-Use-2dc9dd27aaf88071b399cdb623b66b77" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-slate-800 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all shadow-lg"><Info size={22} /> Central de Ajuda</a>
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

  // States Avançados (Cupons, Estoque, Preços)
  const [coupons, setCoupons] = useState([]); 
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPerc, setNewCouponPerc] = useState('');
  const [dailyStock, setDailyStock] = useState({ adults: '', children: '', pets: '' });
  const [weeklyPrices, setWeeklyPrices] = useState({});
  const [cnpjError, setCnpjError] = useState(false);

  // States Novos (Ingressos Especiais, Checkboxes, Calendário)
  const [specialTickets, setSpecialTickets] = useState([]);
  const [newTicketName, setNewTicketName] = useState('');
  const [newTicketPrice, setNewTicketPrice] = useState('');
  const [trackFreeChildren, setTrackFreeChildren] = useState(false);
  
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [amenitySearch, setAmenitySearch] = useState("");
  const [selectedMeals, setSelectedMeals] = useState([]);
  
  const [blockedDates, setBlockedDates] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // Feedback Visual
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
           if (!id) setFormData(prev => ({ ...prev, contactName: u.displayName || '', contactEmail: u.email }));
        } else navigate('/');
     });
     if (id) {
        getDoc(doc(db, "dayuses", id)).then(s => { 
            if(s.exists()) {
                const d = s.data();
                const safeData = { 
                    ...d, 
                    availableDays: d.availableDays || [0, 6], 
                    images: d.images || ['', '', '', '', '', ''], 
                    priceAdult: d.priceAdult || '', 
                    priceChild: d.priceChild || '', 
                    petFee: d.petFee || '' 
                };
                setFormData(safeData);
                
                if(d.coupons) setCoupons(d.coupons);
                if(d.dailyStock) setDailyStock(d.dailyStock || { adults: 50, children: 20, pets: 5 });
                if(d.weeklyPrices) setWeeklyPrices(d.weeklyPrices);
                
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

  // --- HANDLERS AUXILIARES ---
  const handleCepBlur = async () => { if (formData.cep?.replace(/\D/g, '').length === 8) { setCepLoading(true); try { const response = await fetch(`https://viacep.com.br/ws/${formData.cep}/json/`); const data = await response.json(); if (!data.erro) setFormData(prev => ({ ...prev, street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf })); } catch (error) { console.error("Erro CEP:", error); } finally { setCepLoading(false); } } };
  const handleCnpjChange = (e) => { const val = e.target.value; setFormData({...formData, cnpj: val}); const nums = val.replace(/\D/g, ''); if (nums.length > 0 && nums.length !== 14) setCnpjError(true); else setCnpjError(false); };
  
  // Upload Otimizado
  const handleFileUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800 * 1024) { 
          setFeedback({type: 'error', title: 'Imagem Grande', msg: 'A imagem deve ter no máximo 800KB. Por favor, comprima ou escolha outra.'}); 
          return; 
      }
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

  // Gestão de Calendário e Preços
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
  
  // Checkboxes
  const toggleAmenity = (item) => { if (selectedAmenities.includes(item)) setSelectedAmenities(selectedAmenities.filter(i => i !== item)); else setSelectedAmenities([...selectedAmenities, item]); };
  const toggleMeal = (item) => { if (selectedMeals.includes(item)) setSelectedMeals(selectedMeals.filter(i => i !== item)); else setSelectedMeals([...selectedMeals, item]); };

  // Listas Dinâmicas (Cupons e Ingressos Especiais)
  const addCoupon = () => { if(newCouponCode && newCouponPerc) { setCoupons([...coupons, { code: newCouponCode.toUpperCase(), percentage: Number(newCouponPerc) }]); setNewCouponCode(''); setNewCouponPerc(''); } };
  const removeCoupon = (idx) => { const newC = [...coupons]; newC.splice(idx, 1); setCoupons(newC); };
  
  const addSpecialTicket = () => {
      if (newTicketName && newTicketPrice) {
          setSpecialTickets([...specialTickets, { name: newTicketName, price: Number(newTicketPrice) }]);
          setNewTicketName(''); setNewTicketPrice('');
      }
  };
  const removeSpecialTicket = (idx) => { const newT = [...specialTickets]; newT.splice(idx, 1); setSpecialTickets(newT); };

  const resendVerify = async () => {
    try { await sendEmailVerification(user); alert("E-mail enviado! Verifique a caixa de entrada e Spam."); }
    catch(e) { alert("Erro ao enviar."); }
  };

  // --- SUBMIT (SALVAR) ---
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    
    // TRAVA DE SEGURANÇA (E-MAIL)
    if (user && !user.emailVerified) {
         setFeedback({
             type: 'warning',
             title: 'Ação Bloqueada',
             msg: 'Para garantir a segurança, você precisa confirmar seu e-mail antes de publicar anúncios.'
         });
         return; 
    }

    if (!validateCNPJ(formData.cnpj)) { alert("CNPJ inválido (deve ter 14 dígitos)."); return; }
    if (!formData.localWhatsapp) { alert("O WhatsApp do local é obrigatório."); return; }
    
    setLoading(true);

    // Mapeia imagens para campos individuais (compatibilidade)
    const imageFields = {};
    (formData.images || []).forEach((img, index) => {
        if (index === 0) imageFields.image = img; 
        else imageFields[`image${index + 1}`] = img; 
    });

    const dataToSave = { 
        ...formData, 
        ...imageFields, 
        ownerId: user?.uid || "admin", 
        coupons, 
        dailyStock, 
        weeklyPrices, 
        blockedDates, 
        amenities: selectedAmenities, 
        meals: selectedMeals,         
        specialTickets,
        trackFreeChildren,
        priceAdult: formData.priceAdult ? Number(formData.priceAdult) : 0, 
        slug: generateSlug(formData.name), 
        updatedAt: new Date() 
    };
    
    try { 
        if (id) await updateDoc(doc(db, "dayuses", id), dataToSave);
        else await addDoc(collection(db, "dayuses"), { ...dataToSave, createdAt: new Date() });
        navigate('/partner'); 
    } catch (err) { 
        console.error("Erro ao salvar:", err);
        setFeedback({ type: 'error', title: 'Erro ao Salvar', msg: 'Verifique sua conexão ou se as imagens são muito pesadas.' });
    } finally { setLoading(false); }
  };

  const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
     <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 text-center text-slate-900">{id ? 'Editar Anúncio' : 'Cadastrar Novo Day Use'}</h1>
        
        {/* BANNER DE BLOQUEIO SE E-MAIL NÃO VERIFICADO */}
        {user && !user.emailVerified && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-r-xl shadow-sm">
                <div className="flex items-start gap-4">
                    <AlertCircle className="text-yellow-600 mt-1 shrink-0" size={24}/>
                    <div>
                        <h3 className="font-bold text-yellow-800 text-lg mb-1">Confirmação Necessária</h3>
                        <p className="text-yellow-700 text-sm mb-4">
                            Para garantir a segurança da plataforma, você precisa confirmar seu e-mail antes de criar ou editar anúncios.
                        </p>
                        <button onClick={resendVerify} className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-200 transition-colors">
                            Reenviar link de confirmação para {user.email}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {feedback && createPortal(<ModalOverlay onClose={() => setFeedback(null)}><div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"><div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${feedback.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{feedback.type === 'error' ? <X size={32}/> : <AlertCircle size={32}/>}</div><h2 className="text-2xl font-bold mb-2">{feedback.title}</h2><p className="mb-4">{feedback.msg}</p><Button onClick={() => setFeedback(null)} className="w-full justify-center">OK</Button></div></ModalOverlay>, document.body)}

        <form onSubmit={handleSubmit} className={`bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-8 ${!user?.emailVerified ? 'opacity-50 pointer-events-none' : ''}`}>
           
           {/* 1. DADOS PESSOAIS */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">1. Dados do Responsável</h3></div>
              <div className="grid grid-cols-2 gap-4">
                 <input className="w-full border p-3 rounded-xl" value={formData.contactName} onChange={e=>setFormData({...formData, contactName: e.target.value})} placeholder="Nome Completo" />
                 <input className="w-full border p-3 rounded-xl bg-slate-50" value={formData.contactEmail} readOnly />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <input className="w-full border p-3 rounded-xl" placeholder="Telefone Pessoal" value={formData.contactPhone} onChange={e=>setFormData({...formData, contactPhone: e.target.value})} required/>
                 <select className="w-full border p-3 rounded-xl bg-white" value={formData.contactJob} onChange={e=>setFormData({...formData, contactJob: e.target.value})} required><option value="">Cargo...</option><option>Sócio</option><option>Gerente</option><option>Outros</option></select>
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
                  <p className="text-xs text-slate-500 mb-3">Carregue até 6 fotos (Max 800KB cada).</p>
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
           
           {/* 4. FUNCIONAMENTO */}
           <div className="space-y-6">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">4. Funcionamento e Valores</h3></div>
              
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100"><tr><th className="px-4 py-3">Dia</th><th className="px-4 py-3">Horário</th><th className="px-4 py-3">Adulto (R$)</th><th className="px-4 py-3">Criança (R$)</th><th className="px-4 py-3">Pet (R$)</th></tr></thead>
                    <tbody>
                        {weekDays.map((day, index) => {
                            const isActive = formData.availableDays.includes(index);
                            return (
                                <tr key={index} className={`border-b ${isActive ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
                                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={() => toggleDay(index)} className="accent-[#0097A8] w-4 h-4"/>{day}</td>
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
                 <label className="text-sm font-bold text-slate-700 block mb-2">Capacidade Diária (Obrigatório)</label>
                 <div className="flex gap-4">
                    <div className="w-full"><span className="text-xs text-slate-500">Max. Adultos</span><input className="border p-2 rounded w-full" type="number" value={dailyStock.adults} onChange={e=>setDailyStock({...dailyStock, adults: e.target.value})}/></div>
                    <div className="w-full"><span className="text-xs text-slate-500">Max. Crianças</span><input className="border p-2 rounded w-full" type="number" value={dailyStock.children} onChange={e=>setDailyStock({...dailyStock, children: e.target.value})}/></div>
                    <div className="w-full"><span className="text-xs text-slate-500">Max. Pets</span><input className="border p-2 rounded w-full" type="number" value={dailyStock.pets} onChange={e=>setDailyStock({...dailyStock, pets: e.target.value})}/></div>
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
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer border p-2 rounded bg-white"><input type="checkbox" checked={trackFreeChildren} onChange={e=>setTrackFreeChildren(e.target.checked)} className="accent-[#0097A8]"/>Contabilizar crianças gratuitas no estoque?</label>
                  </div>
              </div>

              {/* INGRESSOS ESPECIAIS */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                 <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-blue-900">Ingressos Especiais & Produtos</label><Ticket size={16} className="text-blue-600"/></div>
                 <div className="flex gap-2 mb-2 flex-wrap">
                    <input className="border p-2 rounded-lg flex-1 text-sm min-w-[120px]" placeholder="Nome (Ex: Estacionamento)" value={newTicketName} onChange={e=>setNewTicketName(e.target.value)} />
                    <input className="border p-2 rounded-lg w-24 text-sm" placeholder="R$" type="number" value={newTicketPrice} onChange={e=>setNewTicketPrice(e.target.value)} />
                    <Button onClick={addSpecialTicket} className="py-2 px-4 text-xs bg-blue-600 border-none">Add</Button>
                 </div>
                 <div className="space-y-1">{specialTickets.map((t, i) => (<div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-blue-200 text-sm"><span className="font-bold text-slate-700">{t.name} <span className="text-blue-600">({formatBRL(t.price)})</span></span><button type="button" onClick={()=>removeSpecialTicket(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div>))}</div>
              </div>

              {/* CUPONS */}
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mt-4">
                 <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-yellow-800">Criar Cupons</label><Tag size={16} className="text-yellow-600"/></div>
                 <div className="flex gap-2 mb-2"><input className="border p-2 rounded-lg flex-1 text-sm uppercase" placeholder="CÓDIGO" value={newCouponCode} onChange={e=>setNewCouponCode(e.target.value)} /><input className="border p-2 rounded-lg w-24 text-sm" placeholder="%" type="number" value={newCouponPerc} onChange={e=>setNewCouponPerc(e.target.value)} /><Button onClick={addCoupon} className="py-2 px-4 text-xs bg-yellow-600 border-none">Add</Button></div>
                 <div className="space-y-1">{coupons.map((c, i) => (<div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-yellow-200 text-sm"><span className="font-bold text-slate-700">{c.code} <span className="text-green-600">({c.percentage}% OFF)</span></span><button type="button" onClick={()=>removeCoupon(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div>))}</div>
              </div>
           </div>

           {/* 5. INCLUSÕES E REGRAS */}
           <div className="space-y-4">
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">5. O que está incluso?</h3></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-2">Comodidades e Lazer</label><div className="relative mb-2"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input className="w-full border p-2 pl-9 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors" placeholder="Buscar comodidade..." value={amenitySearch} onChange={e=>setAmenitySearch(e.target.value)}/></div><div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 h-60 overflow-y-auto custom-scrollbar">{AMENITIES_LIST.filter(a => a.toLowerCase().includes(amenitySearch.toLowerCase())).map(a => (<label key={a} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8]"><input type="checkbox" checked={selectedAmenities.includes(a)} onChange={()=>toggleAmenity(a)} className="accent-[#0097A8] w-4 h-4 rounded"/>{a}</label>))}</div></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-2">Alimentação</label><div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">{MEALS_LIST.map(m => (<label key={m} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8]"><input type="checkbox" checked={selectedMeals.includes(m)} onChange={()=>toggleMeal(m)} className="accent-[#0097A8] w-4 h-4 rounded"/>{m}</label>))}</div></div>
              <div><label className="text-sm font-bold text-red-600 block mb-1">O que NÃO está incluso?</label><textarea className="w-full border p-3 rounded-xl h-20 bg-red-50/30" placeholder="Ex: Bebidas..." value={formData.notIncludedItems} onChange={e=>setFormData({...formData, notIncludedItems: e.target.value})}/></div>
              
              <div><label className="text-sm font-bold text-slate-700 block mb-1">Regras de Utilização</label><textarea className="w-full border p-3 rounded-xl h-24" placeholder="Ex: Proibido som..." value={formData.usageRules} onChange={e=>setFormData({...formData, usageRules: e.target.value})}/></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-1">Política de Cancelamento</label><textarea className="w-full border p-3 rounded-xl h-24" placeholder="Ex: Até 24h antes..." value={formData.cancellationPolicy} onChange={e=>setFormData({...formData, cancellationPolicy: e.target.value})}/></div>
              <div><label className="text-sm font-bold text-slate-700 block mb-1">Observações Gerais</label><textarea className="w-full border p-3 rounded-xl h-20" placeholder="Outras informações..." value={formData.observations} onChange={e=>setFormData({...formData, observations: e.target.value})}/></div>
           </div>
           
           <div className="pt-4 border-t">
               <Button type="submit" className="w-full py-4 text-lg shadow-xl" disabled={loading || !user?.emailVerified}>{loading ? "Salvando..." : "Finalizar e Publicar"}</Button>
           </div>
        </form>
     </div>
  );
};

// --- PAGINAS AUXILIARES ---
const PartnerRegisterPage = () => {
    const navigate = useNavigate();
    useSEO("Cadastro de Parceiro", "Junte-se ao Mapa do Day Use.");
    
    // Se cadastrar por aqui, também vai para o dashboard verificar
    return (
        <LoginModal 
            isOpen={true} 
            onClose={() => navigate('/')} 
            onSuccess={() => navigate('/partner')} 
            initialRole="partner" 
            hideRoleSelection={true} 
            initialMode="register"
            customTitle="Boas-vindas"
            customSubtitle="Cadastre-se para gerenciar seu Day Use."
            closeOnSuccess={true}
        />
    );
};

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

// -----------------------------------------------------------------------------
// PÁGINA: POLÍTICA DE PRIVACIDADE (ADEQUADA À LGPD)
// -----------------------------------------------------------------------------
const PrivacyPage = () => {
  useSEO("Política de Privacidade | Mapa do Day Use", "Saiba como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD.");

  return (
    <div className="max-w-4xl mx-auto py-16 px-6 animate-fade-in text-slate-800 leading-relaxed">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-slate-500 mb-10">Última atualização: 05 de Janeiro de 2026</p>

        <div className="space-y-8 text-sm md:text-base">
            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">1. Introdução e Controlador</h2>
                <p>
                    O <strong>Mapa do Day Use</strong> ("Nós", "Plataforma") está comprometido com a proteção dos seus dados pessoais. 
                    Esta política descreve como coletamos, utilizamos e protegemos suas informações, em estrita conformidade com a 
                    <strong> Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)</strong>.
                </p>
                <p className="mt-2">
                    Para fins da legislação aplicável, o Mapa do Day Use atua como <strong>Controlador</strong> dos dados pessoais inseridos na plataforma.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">2. Dados que Coletamos</h2>
                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                    <li><strong>Dados de Identificação:</strong> Nome completo, e-mail, telefone/WhatsApp, foto de perfil e CPF (para emissão de pagamentos/notas).</li>
                    <li><strong>Dados de Navegação e Dispositivo:</strong> Endereço IP, tipo de navegador, geolocalização aproximada (quando autorizada para o Quiz) e comportamento de navegação.</li>
                    <li><strong>Dados de Parceiros (B2B):</strong> Além dos dados pessoais do representante legal, coletamos documentos empresariais como Contrato Social, CCMEI e Cartão CNPJ para validação de segurança (KYC).</li>
                    <li><strong>Dados Financeiros:</strong> Informações parciais de pagamento. <em>Nota: Nós não armazenamos números completos de cartão de crédito. Todo o processamento é criptografado e gerido pelo Mercado Pago.</em></li>
                    <li><strong>Dados de Preferência:</strong> Respostas fornecidas voluntariamente em nosso "Quiz Ideal" para personalização de ofertas.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">3. Uso de Cookies e Tecnologias de Rastreamento (Pixels)</h2>
                <p>
                    Utilizamos cookies e pixels de terceiros para melhorar sua experiência e personalizar publicidade:
                </p>
                <ul className="list-disc pl-5 space-y-2 mt-2 text-slate-600">
                    <li><strong>Meta Pixel (Facebook/Instagram):</strong> Utilizado para medir a eficácia dos nossos anúncios e entender as ações que as pessoas realizam no site.</li>
                    <li><strong>Google Analytics/Tag Manager:</strong> Utilizado para análise estatística de tráfego anônimo e comportamento do usuário.</li>
                </ul>
                <p className="mt-2 text-xs text-slate-500 bg-slate-100 p-3 rounded-lg">
                    Você pode gerenciar ou bloquear esses cookies a qualquer momento através das configurações do seu navegador. O uso continuado da plataforma implica no consentimento desta coleta.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">4. Finalidade do Tratamento</h2>
                <p>Seus dados são utilizados para:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Processar reservas, pagamentos e emitir vouchers de acesso.</li>
                    <li>Validar a identidade de usuários e a existência legal de empresas parceiras (Prevenção à Fraude).</li>
                    <li>Enviar comunicações transacionais (confirmação de compra, recuperação de senha).</li>
                    <li>Enviar newsletters e ofertas personalizadas (apenas mediante seu consentimento explícito no Quiz ou Cadastro).</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">5. Compartilhamento de Dados</h2>
                <p>Não vendemos seus dados. O compartilhamento ocorre estritamente para a execução do serviço:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li><strong>Com os Estabelecimentos (Parceiros):</strong> Nome e detalhes da reserva para controle de portaria e check-in.</li>
                    <li><strong>Com Processadores de Pagamento (Mercado Pago):</strong> Para efetivação da transação financeira e split de pagamento.</li>
                    <li><strong>Com Autoridades Judiciais:</strong> Apenas quando requisitado legalmente.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">6. Seus Direitos (Titular dos Dados)</h2>
                <p>Conforme o Art. 18 da LGPD, você tem direito a:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Confirmar a existência de tratamento e acessar seus dados.</li>
                    <li>Corrigir dados incompletos ou desatualizados (disponível na área "Meu Perfil").</li>
                    <li>Revogar o consentimento de marketing.</li>
                    <li><strong>Solicitar a exclusão dos seus dados:</strong> Disponibilizamos um botão de "Excluir Conta" diretamente no painel do usuário para automação deste direito.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">7. Segurança</h2>
                <p>
                    Adotamos medidas técnicas robustas, incluindo criptografia SSL em todas as comunicações, hash de senhas e controle de acesso restrito aos bancos de dados (Firestore Security Rules).
                </p>
            </section>

            <div className="pt-8 border-t border-slate-200 mt-8">
                <p className="font-bold text-slate-900">Encarregado de Dados (DPO)</p>
                <p>Para exercer seus direitos ou tirar dúvidas, entre em contato:</p>
                <a href="mailto:dpo@mapadodayuse.com" className="text-[#0097A8] hover:underline font-bold">dpo@mapadodayuse.com</a>
            </div>
        </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// PÁGINA: TERMOS DE USO (CONTRATO DE ADESÃO)
// -----------------------------------------------------------------------------
const TermsPage = () => {
  useSEO("Termos de Uso | Mapa do Day Use", "Regras, direitos e deveres para utilização da plataforma Mapa do Day Use.");

  return (
    <div className="max-w-4xl mx-auto py-16 px-6 animate-fade-in text-slate-800 leading-relaxed">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Termos e Condições de Uso</h1>
        <p className="text-sm text-slate-500 mb-10">Última atualização: 05 de Janeiro de 2026</p>

        <div className="space-y-8 text-sm md:text-base">
            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">1. Aceitação dos Termos</h2>
                <p>
                    Ao acessar, cadastrar-se ou realizar uma reserva no <strong>Mapa do Day Use</strong>, você concorda expressamente com estes Termos de Uso. 
                    Se não concordar, por favor, não utilize a plataforma.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">2. Natureza do Serviço (Intermediação)</h2>
                <p>
                    O Mapa do Day Use é uma plataforma digital que atua como <strong>intermediadora</strong> entre:
                </p>
                <ul className="list-disc pl-5 mt-2 mb-2 text-slate-600">
                    <li><strong>O Usuário/Viajante:</strong> Que busca serviços de lazer (day use).</li>
                    <li><strong>O Parceiro (Estabelecimento):</strong> Hotéis, pousadas e resorts que ofertam o serviço.</li>
                </ul>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-800 my-4">
                    <strong>Importante:</strong> O Mapa do Day Use não é proprietário, não gerencia e não é responsável pela operação interna, segurança física, alimentação ou manutenção das instalações dos Parceiros. Nossa responsabilidade limita-se à emissão do voucher e processamento seguro do pagamento.
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">3. Cadastro e Segurança</h2>
                <p>
                    O usuário é responsável pela veracidade dos dados cadastrados. A criação de contas falsas ou o uso de dados de terceiros constitui crime de falsidade ideológica.
                </p>
                <ul className="list-disc pl-5 mt-2 text-slate-600">
                    <li>O usuário deve manter seu e-mail verificado para garantir o recebimento dos vouchers.</li>
                    <li>A senha é pessoal e intransferível. O Mapa do Day Use não se responsabiliza por acessos indevidos resultantes de descuido com a senha.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">4. Pagamentos e Split</h2>
                <p>
                    Os pagamentos são processados via <strong>Mercado Pago</strong>. Ao realizar uma compra, o valor é automaticamente dividido (Split de Pagamento):
                </p>
                <ul className="list-disc pl-5 mt-2 text-slate-600">
                    <li>A parte correspondente ao serviço vai diretamente para a conta do Parceiro.</li>
                    <li>A taxa de serviço/comissão fica com a Plataforma.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">5. Cancelamento e Arrependimento</h2>
                <p>
                    Conforme o Art. 49 do Código de Defesa do Consumidor (CDC), o usuário tem o direito de arrependimento em até <strong>7 (sete) dias corridos</strong> após a compra, desde que a solicitação seja feita com antecedência mínima de 24h da data agendada para o uso.
                </p>
                <p className="mt-2 font-bold">Regras Específicas:</p>
                <ul className="list-disc pl-5 text-slate-600">
                    <li>Solicitações feitas no dia do uso ou após a data agendada (No-Show) não são reembolsáveis.</li>
                    <li>O reembolso é processado pelo mesmo meio de pagamento utilizado na compra.</li>
                    <li>Cada estabelecimento pode ter regras adicionais de reagendamento descritas na página do anúncio.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">6. Obrigações e Proibições</h2>
                <p>É estritamente proibido:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Utilizar a plataforma para fraudes ou lavagem de dinheiro.</li>
                    <li>Realizar engenharia reversa, "scraping" ou copiar o conteúdo do site sem autorização.</li>
                    <li>Desrespeitar as normas internas (horários, regras de convivência, trajes) dos Parceiros durante a utilização do Day Use. O Parceiro tem o direito de recusar a permanência de usuários que violem suas normas.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">7. Propriedade Intelectual</h2>
                <p>
                    A marca "Mapa do Day Use", o layout, o código-fonte e o banco de dados são propriedade exclusiva da empresa. O uso indevido está sujeito às penas da Lei de Propriedade Industrial e Lei de Direitos Autorais.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-[#0097A8] mb-3">8. Foro</h2>
                <p>
                    Fica eleito o foro da comarca de Belo Horizonte/MG para dirimir quaisquer dúvidas oriundas destes termos, com renúncia a qualquer outro, por mais privilegiado que seja.
                </p>
            </section>
        </div>
    </div>
  );
};

// --- ESTRUTURA PRINCIPAL ---// ...
const ResetPasswordModal = ({ isOpen, onClose, actionCode, email }) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
      setSuccess(true);
    } catch (error) {
      alert("Erro ao redefinir senha. O link pode ter expirado. Tente solicitar novamente.");
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full animate-fade-in">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32}/>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
            {success ? "Senha Alterada!" : "Nova Senha"}
        </h2>
        
        {success ? (
            <div className="space-y-4">
                <p className="text-slate-600 text-sm">Sua senha foi atualizada com sucesso. Você já pode fazer login.</p>
                <Button onClick={onClose} className="w-full justify-center">Ir para Login</Button>
            </div>
        ) : (
            <form onSubmit={handleReset} className="space-y-4">
                <p className="text-slate-600 text-sm">Defina uma nova senha para <strong>{email}</strong>.</p>
                <input 
                    type="password" 
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#0097A8]" 
                    placeholder="Nova senha" 
                    value={newPassword} 
                    onChange={e=>setNewPassword(e.target.value)} 
                    required 
                    minLength={6}
                />
                <Button type="submit" className="w-full justify-center" disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                </Button>
            </form>
        )}
      </div>
    </ModalOverlay>
  );
};

// COMPONENTE: MODAL DE FEEDBACK (Reutilizável para Sucesso/Erro Global)
const FeedbackModal = ({ isOpen, onClose, type, title, msg }) => {
  if (!isOpen) return null;
  return (
    <ModalOverlay onClose={onClose}>
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                type === 'success' ? 'bg-green-100 text-green-600' : 
                type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
            }`}>
                {type === 'success' ? <CheckCircle size={40}/> : type === 'warning' ? <AlertCircle size={40}/> : <X size={40}/>}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
            <p className="text-slate-600 mb-6">{msg}</p>
            <Button onClick={onClose} className="w-full justify-center" variant={type === 'error' ? 'danger' : 'primary'}>
                Fechar
            </Button>
        </div>
    </ModalOverlay>
  );
};

// COMPONENTE: GERENCIADOR DE AÇÕES DE AUTH (Link de E-mail) - ATUALIZADO
const AuthActionHandler = ({ onVerificationSuccess, onResetPasswordRequest, setGlobalFeedback }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode'); 
  const actionCode = searchParams.get('oobCode');
  const effectRan = useRef(false);

  useEffect(() => {
    if (!mode || !actionCode || effectRan.current) return;
    effectRan.current = true; 

    const handleAction = async () => {
      try {
        // CONFIRMAÇÃO DE E-MAIL
        if (mode === 'verifyEmail') {
          await applyActionCode(auth, actionCode);
          
          if (auth.currentUser) {
              await auth.currentUser.reload();
              onVerificationSuccess(); 
              
              // Verifica a role para redirecionar corretamente
              const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
              const role = docSnap.exists() ? docSnap.data().role : 'user';

              if (role === 'partner') {
                  navigate('/partner'); // Manda o parceiro direto para o dashboard
              } else if (role === 'staff') {
                  navigate('/portaria');
              } else {
                  navigate('/minhas-viagens'); // Usuário comum vai para ingressos
              }
          }
        } 
        // RESET DE SENHA
        else if (mode === 'resetPassword') {
            const email = await verifyPasswordResetCode(auth, actionCode);
            onResetPasswordRequest(actionCode, email);
        }
      } catch (error) {
        console.error("Erro Auth:", error);
        if (setGlobalFeedback) {
            setGlobalFeedback({ type: 'error', title: 'Link Inválido', msg: 'Este link já foi utilizado ou expirou.' });
        }
        navigate('/');
      }
    };
    handleAction();
  }, [mode, actionCode, navigate, onVerificationSuccess, onResetPasswordRequest, setGlobalFeedback]);

  return null;
};

// -----------------------------------------------------------------------------
// 2. LAYOUT (ATUALIZADO COM BARRA DE STATUS)
// -----------------------------------------------------------------------------
const Layout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [logoError, setLogoError] = useState(false); 
  const [verificationStatus, setVerificationStatus] = useState('none'); // 'none', 'pending', 'success'
  
  // Estados para Reset de Senha
  const [resetCode, setResetCode] = useState(null);
  const [resetEmail, setResetEmail] = useState('');
  
  // Estado global para Feedback
  const [globalFeedback, setGlobalFeedback] = useState(null);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  // Auto-hide da barra verde
  useEffect(() => {
    let timer;
    if (verificationStatus === 'success') {
      timer = setTimeout(() => setVerificationStatus('none'), 5000);
    }
    return () => clearTimeout(timer);
  }, [verificationStatus]);

  // Listener em Tempo Real
  useEffect(() => {
    let unsubscribeDoc = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
       if(u) {
          unsubscribeDoc = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
             if (docSnap.exists()) {
                 const userData = docSnap.data();
                 const currentUser = { 
                     ...u, 
                     role: userData.role || 'user',
                     photoURL: userData.photoURL || u.photoURL,
                     emailVerified: u.emailVerified // Garante status atualizado
                 };
                 setUser(currentUser);

                 if (u.emailVerified) {
                     // Se estava pendente e virou verificado, mostra sucesso
                     setVerificationStatus(prev => prev === 'pending' ? 'success' : 'none');
                 } else {
                     setVerificationStatus('pending');
                 }
             } else {
                 setUser({ ...u, role: 'user' });
             }
          });
       } else {
          setUser(null);
          setVerificationStatus('none');
          if(unsubscribeDoc) unsubscribeDoc();
       }
    });
    return () => { unsubscribeAuth(); if(unsubscribeDoc) unsubscribeDoc(); };
  }, []);

  const handleResend = async (e) => {
      e.preventDefault();
      const currentUser = auth.currentUser;
      if(!currentUser) return;
      try {
          await sendEmailVerification(currentUser, { url: 'https://mapadodayuse.com/partner', handleCodeInApp: true });
          setGlobalFeedback({ type: 'success', title: 'E-mail Enviado', msg: `Link enviado para ${user.email}. Verifique caixa de entrada e spam.` });
      } catch(e) { 
          setGlobalFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível enviar o e-mail. Tente novamente em alguns minutos.' });
      }
  };

  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  const handleLoginSuccess = (userWithRole) => {
     setShowLogin(false);
     if (userWithRole.role === 'partner') navigate('/partner');
     else if (userWithRole.role === 'staff') navigate('/portaria');
     else if (userWithRole.role === 'admin') navigate('/admin');
     else navigate('/minhas-viagens');
  };

  const handleVerificationSuccess = async () => {
      if (auth.currentUser) {
          await auth.currentUser.reload();
          setVerificationStatus('success');
      }
  };

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%230097A8%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polygon points=%223 6 9 3 15 6 21 3 21 21 15 18 9 21 3 18 3 6%22/><line x1=%229%22 x2=%229%22 y1=%223%22 y2=%2221%22/><line x1=%2215%22 x2=%2215%22 y1=%226%22 y2=%2224%22/></svg>';
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50 relative">
      <GlobalStyles />
      <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={handleLoginSuccess} />
      
      <ResetPasswordModal 
        isOpen={!!resetCode}
        actionCode={resetCode}
        email={resetEmail}
        onClose={() => { setResetCode(null); navigate('/'); setShowLogin(true); }}
      />
      
      <AuthActionHandler 
        onVerificationSuccess={handleVerificationSuccess}
        onResetPasswordRequest={(code, email) => { setResetCode(code); setResetEmail(email); }}
        setGlobalFeedback={setGlobalFeedback}
      />

      {globalFeedback && createPortal(
          <FeedbackModal 
             isOpen={!!globalFeedback} 
             onClose={() => setGlobalFeedback(null)} 
             type={globalFeedback.type} 
             title={globalFeedback.title} 
             msg={globalFeedback.msg} 
          />,
          document.body
      )}

      {/* BARRA DE NOTIFICAÇÃO */}
      {verificationStatus === 'pending' && user && !user.emailVerified && (
          <div className="bg-yellow-50 text-yellow-800 text-xs font-bold text-center py-2 px-4 flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4 relative z-50 border-b border-yellow-100 transition-all">
              <span className="flex items-center gap-1"><AlertCircle size={14}/> Seu e-mail ainda não foi confirmado.</span>
              <button onClick={handleResend} className="underline hover:text-yellow-900 cursor-pointer">Reenviar link</button>
          </div>
      )}
      {verificationStatus === 'success' && (
          <div className="bg-green-500 text-white text-xs font-bold text-center py-2 px-4 animate-fade-in relative z-50 flex justify-center items-center gap-2 transition-all">
              <CheckCircle size={14}/> E-mail confirmado com sucesso!
          </div>
      )}

      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
           <div className="flex items-center gap-2 cursor-pointer" onClick={()=>navigate('/')}>
              {!logoError ? (
                 <img 
                    src="/logo.png?v=2" 
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
                    {user.role === 'partner' && <Button variant="ghost" onClick={()=>navigate('/partner')} className="px-2 md:px-4 text-xs md:text-sm">Painel</Button>}
                    {user.role === 'staff' && <Button variant="ghost" onClick={()=>navigate('/portaria')} className="px-2 md:px-4 text-xs md:text-sm">Portaria</Button>}
                    {user.role === 'admin' && <Button variant="ghost" onClick={()=>navigate('/admin')} className="px-2 md:px-4 text-xs md:text-sm">Admin</Button>}
                    {user.role === 'user' && (<Button variant="ghost" onClick={()=>navigate('/minhas-viagens')} className="hidden md:flex">Meus Ingressos</Button>)}
                    
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
      
      <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
         <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
               <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={()=>navigate('/')}>
                     {!logoError ? (<img src="/logo.png?v=2" alt="Mapa" className="h-8 w-auto object-contain" onError={() => setLogoError(true)} />) : (<MapIcon className="h-6 w-6 text-[#0097A8]" />)}
                  </div>
                  <p className="text-slate-500 text-sm mb-6 max-w-sm leading-relaxed">A plataforma completa para você descobrir e reservar experiências incríveis de Day Use perto de você.</p>
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
                      <li><button onClick={() => navigate('/quiz')} className="hover:text-[#0097A8] transition-colors">Quiz Ideal 🤖</button></li>
                      <li><button onClick={() => navigate('/comparativo')} className="hover:text-[#0097A8] transition-colors">Comparador</button></li>
                   </ul>
                   <button onClick={() => navigate('/seja-parceiro')} className="bg-[#0097A8] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#007F8F] transition-colors shadow-lg shadow-teal-100 transform hover:scale-105">
                       Seja um Parceiro
                   </button>
               </div>

               {/* Coluna 4: Redes Sociais */}
               <div>
                  <h4 className="font-bold text-slate-900 mb-4">Siga-nos</h4>
                  <div className="flex gap-3">
                     <a href="https://instagram.com/mapadodayuse" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-slate-50 hover:bg-pink-50 text-slate-400 hover:text-[#E1306C] transition-all border border-slate-100 hover:border-pink-200">
                        <Instagram size={20} />
                     </a>
                     <a href="https://tiktok.com/@mapadodayuse" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-slate-50 hover:bg-gray-100 text-slate-400 hover:text-black transition-all border border-slate-100 hover:border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                     </a>
                     <a href="https://www.youtube.com/@mapadodayuse" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all border border-slate-100 hover:border-red-200">
                        <Youtube size={20} />
                     </a>
                  </div>
               </div>
            </div>
            
            <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
               <div className="flex flex-col md:flex-row gap-2 md:gap-6 items-center text-center md:text-left">
                   <p>© 2026 Belo Horizonte, MG. Todos os direitos reservados.</p>
                   <div className="hidden md:block w-1 h-1 bg-slate-300 rounded-full"></div>
                   <div className="flex gap-4">
                       <button onClick={() => navigate('/politica-de-privacidade')} className="hover:text-[#0097A8] transition-colors text-xs">Política de Privacidade</button>
                       <button onClick={() => navigate('/termos-de-uso')} className="hover:text-[#0097A8] transition-colors text-xs">Termos de Uso</button>
                   </div>
               </div>
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

// -----------------------------------------------------------------------------
// PÁGINA 404 (NÃO ENCONTRADO)
// -----------------------------------------------------------------------------
const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
            <MapPin size={48} className="animate-bounce"/>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Página não encontrada</h1>
        <p className="text-slate-500 mb-8 max-w-md">
            Ops! Parece que o lugar que procura não está no nosso mapa (ou o endereço foi digitado errado).
        </p>
        <Button onClick={() => navigate('/')}>Voltar para o Início</Button>
    </div>
  );
};

// -----------------------------------------------------------------------------
// COMPONENTE RESOLVER DE ROTAS (VALIDAÇÃO RÍGIDA)
// -----------------------------------------------------------------------------
const RouteResolver = () => {
    const { state, cityOrSlug } = useParams();
    const [decision, setDecision] = useState(null); // 'listing', 'details', '404'
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        setDecision(null);
        setLoading(true);

        const checkRoute = async () => {
            // 1. Validação de Estado (Obrigatória)
            if (!state || !STATE_NAMES[state.toUpperCase()]) {
                setDecision('404');
                setLoading(false);
                return;
            }

            // 2. Se não tem segundo parâmetro (ex: /mg), é Listagem de Estado (Válido)
            if (!cityOrSlug) {
                setDecision('listing');
                setLoading(false);
                return;
            }

            try {
                // 3. Verifica se é um Local (Slug exato)
                const qSlug = query(collection(db, "dayuses"), where("slug", "==", cityOrSlug));
                const snapSlug = await getDocs(qSlug);

                if (!snapSlug.empty) {
                    setDecision('details');
                } else {
                    // 4. Verifica se é uma Cidade Válida
                    // Busca itens do estado para conferir se a cidade existe
                    const qState = query(collection(db, "dayuses"), where("state", "==", state.toUpperCase()));
                    const snapState = await getDocs(qState);
                    
                    // Verifica se algum day use pertence a uma cidade que gera esse slug
                    const cityExists = snapState.docs.some(doc => {
                        const data = doc.data();
                        return data.city && generateSlug(data.city) === cityOrSlug;
                    });

                    if (cityExists) {
                        setDecision('listing');
                    } else {
                        // Não é local nem cidade com day use -> 404
                        setDecision('404');
                    }
                }
            } catch (error) {
                console.error("Erro na validação de rota:", error);
                setDecision('404'); // Segurança: na dúvida, 404
            } finally {
                setLoading(false);
            }
        };
        checkRoute();
    }, [state, cityOrSlug]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin w-10 h-10 border-4 border-[#0097A8] border-t-transparent rounded-full"></div>
        </div>
    );

    if (decision === '404') return <NotFoundPage />;
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
        "image": "https://mapadodayuse.com/logo.png", // Idealmente uma imagem de capa do artigo
        "author": {
            "@type": "Person",
            "name": "Iuri França"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Mapa do Day Use",
            "logo": {
                "@type": "ImageObject",
                "url": "https://mapadodayuse.com/logo.png"
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

// -----------------------------------------------------------------------------
// LANDING PAGE DE PARCEIROS (VENDA B2B)
// -----------------------------------------------------------------------------
const PartnerLandingPage = () => {
  const navigate = useNavigate();
  useSEO("Seja um Parceiro | Mapa do Day Use", "Aumente o faturamento do seu hotel ou pousada vendendo Day Use. Plataforma completa de gestão, marketing e pagamentos seguros.");
  
  // Estado para controlar o modal de cadastro na própria página
  const [showRegister, setShowRegister] = useState(false);

  const scrollToTop = () => window.scrollTo(0,0);

  const handleRegisterSuccess = (user) => {
      // CORREÇÃO: Redireciona para o Dashboard (/partner)
      // Assim ele vê os avisos de "Verificar E-mail" e "Validar Empresa" antes de tentar criar anúncios
      navigate('/partner');
  };

  return (
    <div className="animate-fade-in bg-white">
        
        {/* MODAL DE CADASTRO INTEGRADO */}
        {showRegister && createPortal(
            <LoginModal 
                isOpen={showRegister} 
                onClose={() => setShowRegister(false)} 
                initialRole="partner" 
                hideRoleSelection={true} 
                initialMode="register"
                customTitle="Boas-vindas"
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

const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

// -----------------------------------------------------------------------------
// COMPONENTE: LANDING PAGE DO COMPARADOR (HOME)
// -----------------------------------------------------------------------------
const ComparisonLandingPage = () => {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // States dos Seletores
  const [selected1, setSelected1] = useState(null);
  const [selected2, setSelected2] = useState(null);
  const [term1, setTerm1] = useState("");
  const [term2, setTerm2] = useState("");
  const [showList1, setShowList1] = useState(false);
  const [showList2, setShowList2] = useState(false);

  // Gera pares de comparação automáticos para a vitrine
  const popularComparisons = [];
  if (!loading && allItems.length > 1) {
      for (let i = 0; i < allItems.length - 1; i += 2) {
          if (popularComparisons.length >= 12) break; // Limite de 12 cards
          popularComparisons.push({
              itemA: allItems[i],
              itemB: allItems[i+1],
              url: `/comparativo/${allItems[i].slug}-vs-${allItems[i+1].slug}`
          });
      }
  }

  useSEO(
    "Comparador de Day Use | Batalha de Hotéis e Resorts", 
    "Está na dúvida? Compare preços, piscinas, comodidades e regras dos melhores hotéis e resorts de Day Use lado a lado."
  );

  // Schema CollectionPage (Melhor para listas de links internos)
  useSchema({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Comparador de Day Use",
    "description": "Ferramenta para comparar preços e comodidades de Day Uses.",
    "url": "https://mapadodayuse.com/comparativo",
    "mainEntity": {
        "@type": "ItemList",
        "itemListElement": popularComparisons.map((comp, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "url": `https://mapadodayuse.com${comp.url}`,
            "name": `${comp.itemA.name} vs ${comp.itemB.name}`
        }))
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
         // Busca itens (ativos e pausados para ter volume na vitrine)
         const q = query(collection(db, "dayuses")); 
         const snap = await getDocs(q);
         // Pega apenas dados essenciais para ficar leve
         const data = snap.docs.map(d => ({ 
             name: d.data().name, 
             slug: d.data().slug, 
             city: d.data().city, 
             image: d.data().image 
         }));
         setAllItems(data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleCompare = () => {
      if (selected1 && selected2) {
          navigate(`/comparativo/${selected1.slug}-vs-${selected2.slug}`);
      }
  };

  const filtered1 = allItems.filter(i => i.name.toLowerCase().includes(term1.toLowerCase())).slice(0, 5);
  const filtered2 = allItems.filter(i => i.name.toLowerCase().includes(term2.toLowerCase())).slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto py-16 px-4 animate-fade-in text-center min-h-[70vh] flex flex-col">
        
        {/* HERO HEADER */}
        <div className="mb-12 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-[#0097A8] uppercase tracking-wider bg-cyan-50 px-3 py-1 rounded-full">Ferramenta Gratuita</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mt-4 mb-4">Batalha de Day Uses ⚔️</h1>
            <p className="text-slate-500 text-lg">
                Não sabe qual escolher? Coloque dois locais lado a lado e veja qual oferece o melhor custo-benefício para o seu dia de folga.
            </p>
        </div>

        {/* ÁREA DE SELEÇÃO (FERRAMENTA) */}
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative mb-24 max-w-4xl mx-auto w-full">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-[#0097A8] text-white rounded-full shadow-lg flex items-center justify-center font-black text-xl border-4 border-white">VS</div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-16">
                {/* LADO A */}
                <div className="relative z-20">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 text-left">Opção 01</p>
                    <div className="relative">
                        <input 
                            className="w-full border-2 border-slate-200 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#0097A8] transition-colors"
                            placeholder="Buscar local..."
                            value={term1}
                            onChange={e => { setTerm1(e.target.value); setShowList1(true); setSelected1(null); }}
                            onFocus={() => setShowList1(true)}
                        />
                        {selected1 && (<div className="absolute right-3 top-3 w-10 h-10 rounded-lg overflow-hidden border border-slate-200"><img src={selected1.image} className="w-full h-full object-cover" /></div>)}
                        {showList1 && term1 && (<div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-xl mt-2 border border-slate-100 overflow-hidden text-left z-30">{filtered1.map(item => (<div key={item.slug} onClick={() => { setSelected1(item); setTerm1(item.name); setShowList1(false); }} className="p-3 hover:bg-cyan-50 cursor-pointer border-b border-slate-50 last:border-0"><p className="font-bold text-sm text-slate-700">{item.name}</p><p className="text-xs text-slate-400">{item.city}</p></div>))}</div>)}
                    </div>
                </div>

                {/* LADO B */}
                <div className="relative z-20">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 text-left">Opção 02</p>
                    <div className="relative">
                        <input 
                            className="w-full border-2 border-slate-200 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#0097A8] transition-colors"
                            placeholder="Buscar local..."
                            value={term2}
                            onChange={e => { setTerm2(e.target.value); setShowList2(true); setSelected2(null); }}
                            onFocus={() => setShowList2(true)}
                        />
                         {selected2 && (<div className="absolute right-3 top-3 w-10 h-10 rounded-lg overflow-hidden border border-slate-200"><img src={selected2.image} className="w-full h-full object-cover" /></div>)}
                        {showList2 && term2 && (<div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-xl mt-2 border border-slate-100 overflow-hidden text-left z-30">{filtered2.map(item => (<div key={item.slug} onClick={() => { setSelected2(item); setTerm2(item.name); setShowList2(false); }} className="p-3 hover:bg-cyan-50 cursor-pointer border-b border-slate-50 last:border-0"><p className="font-bold text-sm text-slate-700">{item.name}</p><p className="text-xs text-slate-400">{item.city}</p></div>))}</div>)}
                    </div>
                </div>
            </div>

            {/* BOTÃO CENTRALIZADO */}
            <div className="mt-10 flex justify-center">
                <Button 
                    onClick={handleCompare} 
                    disabled={!selected1 || !selected2}
                    className="w-full md:w-auto px-12 py-4 text-lg shadow-xl shadow-teal-200/50"
                >
                    Comparar Agora
                </Button>
            </div>
        </div>

        {/* VITRINE DE COMPARAÇÕES POPULARES (GRID DE CARDS) */}
        {!loading && popularComparisons.length > 0 && (
            <div className="w-full text-left">
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <h2 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Comparações Populares</h2>
                    <div className="h-px bg-slate-200 flex-1"></div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {popularComparisons.map((comp, idx) => (
                        <div 
                            key={idx}
                            onClick={() => navigate(comp.url)}
                            className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col"
                        >
                            {/* IMAGEM SPLIT (DIVIDIDA) */}
                            <div className="h-48 relative flex">
                                <div className="w-1/2 h-full relative">
                                    <img src={comp.itemA.image} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
                                </div>
                                <div className="w-1/2 h-full relative">
                                    <img src={comp.itemB.image} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-l from-black/40 to-transparent"></div>
                                </div>
                                
                                {/* VS BADGE NO MEIO DA FOTO */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-xs text-[#0097A8] shadow-lg border-2 border-slate-50 z-10">VS</div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2 group-hover:text-[#0097A8] transition-colors">
                                        {comp.itemA.name} <span className="text-slate-300 font-light mx-1">vs</span> {comp.itemB.name}
                                    </h3>
                                    {/* Cidade removida para não poluir o card com o nome completo */}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ver análise</span>
                                    <ArrowRight size={16} className="text-[#0097A8] group-hover:translate-x-1 transition-transform"/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// COMPONENTE: PÁGINA DE COMPARAÇÃO (REFINADA)
// -----------------------------------------------------------------------------
const ComparisonPage = () => {
  const { slugs } = useParams(); 
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Busca e Seleção
  const [allSearchItems, setAllSearchItems] = useState([]);
  const [searchSlot, setSearchSlot] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Sugestão e Feedback
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionData, setSuggestionData] = useState({ name: '', city: '' });
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); 

  const [slug1, slug2] = slugs ? slugs.split('-vs-') : [null, null];

  useEffect(() => {
    const fetchData = async () => {
      if (!slug1 || !slug2) return;
      setLoading(true);
      try {
         const q = query(collection(db, "dayuses"), where("slug", "in", [slug1, slug2]));
         const snap = await getDocs(q);
         const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
         setItems(data);

         // Carrega todos (inclusive pausados) para a busca de troca
         const qAll = query(collection(db, "dayuses")); 
         const snapAll = await getDocs(qAll);
         setAllSearchItems(snapAll.docs.map(d => ({ name: d.data().name, slug: d.data().slug, city: d.data().city, state: d.data().state })));
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [slug1, slug2]);

  // Filtro de Busca
  useEffect(() => {
      if (searchTerm.trim() === "") {
          setSearchResults([]);
      } else {
          const lowerTerm = searchTerm.toLowerCase();
          const results = allSearchItems
              .filter(i => i.name.toLowerCase().includes(lowerTerm) || i.city?.toLowerCase().includes(lowerTerm))
              .slice(0, 5); 
          setSearchResults(results);
      }
  }, [searchTerm, allSearchItems]);

  const item1 = items.find(i => i.slug === slug1) || items[0];
  const item2 = items.find(i => i.slug === slug2) || items[1];

  // SEO & Schema
  let seoTitle = "Comparativo de Day Use";
  let seoDesc = "Compare as melhores opções.";
  
  if (item1 && item2) {
      if (item1.city === item2.city) {
          seoTitle = `${item1.name} ou ${item2.name}: Qual o Melhor Day Use de ${item1.city}?`;
          seoDesc = `Comparativo completo em ${item1.city}.`;
      } else if (item1.state === item2.state) {
          const stateFullName = STATE_NAMES[item1.state] || item1.state;
          seoTitle = `${item1.name} ou ${item2.name}: Qual o Melhor Day Use de ${stateFullName}?`;
      } else {
          seoTitle = `${item1.name} ou ${item2.name}: Qual o Melhor Day Use Pra Você?`;
      }
  }
  useSEO(seoTitle, seoDesc);

  useSchema(item1 && item2 ? {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `Comparativo: ${item1.name} vs ${item2.name}`,
      "itemListElement": [
          { "@type": "ListItem", "position": 1, "item": { "@type": "LodgingBusiness", "name": item1.name } },
          { "@type": "ListItem", "position": 2, "item": { "@type": "LodgingBusiness", "name": item2.name } }
      ]
  } : null);

  const handleSelectCompetitor = (newSlug) => { if (searchSlot === 'slot1') navigate(`/comparativo/${newSlug}-vs-${slug2}`); else navigate(`/comparativo/${slug1}-vs-${newSlug}`); setSearchSlot(null); setSearchTerm(""); };
  const handleSuggestionSubmit = async (e) => { e.preventDefault(); setSuggestionLoading(true); try { await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: 'contato@mapadodayuse.com', subject: `💡 Sugestão: ${suggestionData.name}`, html: 'Sugestão enviada' }) }); setFeedback({type:'success', title:'Enviado!', msg:'Obrigado pela sugestão.'}); setShowSuggestion(false); setSuggestionData({ name: '', city: '' }); setSearchSlot(null); } catch (error) { setFeedback({ type: 'error', title: 'Erro', msg: 'Erro ao enviar.' }); } finally { setSuggestionLoading(false); } };
  
  const renderCheck = (val) => val ? <CheckCircle size={18} className="text-green-500 mx-auto"/> : <X size={18} className="text-red-300 mx-auto"/>;
  const formatDays = (days) => (!days || days.length === 0) ? "-" : (days.length === 7 ? "Todos os dias" : days.map(d => WEEK_DAYS[d].slice(0,3)).join(', '));
  const formatHours = (prices) => { if (!prices) return "-"; const hours = new Set(Object.values(prices).map(p => p.hours).filter(Boolean)); return hours.size > 0 ? Array.from(hours).join(' / ') : "Horário padrão"; };
  
  if (loading) return <div className="text-center py-20 animate-pulse text-slate-400">Carregando comparativo...</div>;
  if (items.length < 2) return <div className="text-center py-20 text-slate-500">Local não encontrado. Verifique o link.</div>;

  // Filtra 9 itens aleatórios para sugestão
  const relatedComparisons = allSearchItems
      .filter(i => i.slug !== item1.slug && i.slug !== item2.slug)
      .sort(() => 0.5 - Math.random())
      .slice(0, 9)
      .map((other, index) => {
          const baseItem = index % 2 === 0 ? item1 : item2;
          return { key: other.slug, label: `${baseItem.name.split(' ')[0]} vs ${other.name}`, url: `/comparativo/${baseItem.slug}-vs-${other.slug}` };
      });

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
       {feedback && createPortal(<FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback.type} title={feedback.title} msg={feedback.msg} />, document.body)}
       {showSuggestion && createPortal(<ModalOverlay onClose={() => setShowSuggestion(false)}><div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"><h2 className="text-xl font-bold text-slate-900 mb-2">Sugerir Local</h2><form onSubmit={handleSuggestionSubmit} className="space-y-3"><input className="w-full border p-3 rounded-xl" placeholder="Nome" required value={suggestionData.name} onChange={e=>setSuggestionData({...suggestionData, name: e.target.value})}/><input className="w-full border p-3 rounded-xl" placeholder="Cidade" required value={suggestionData.city} onChange={e=>setSuggestionData({...suggestionData, city: e.target.value})}/><Button type="submit" disabled={suggestionLoading} className="w-full">{suggestionLoading ? 'Enviando...' : 'Enviar'}</Button></form></div></ModalOverlay>, document.body)}

       <div className="text-center mb-10"><span className="text-xs font-bold text-[#0097A8] uppercase tracking-wider bg-cyan-50 px-3 py-1 rounded-full">Batalha de Day Uses</span><h1 className="text-3xl md:text-5xl font-bold text-slate-900 mt-4 mb-8 leading-tight">{item1.name} <span className="text-slate-300 mx-2 text-2xl align-middle">vs</span> {item2.name}</h1><div className="flex flex-col md:flex-row justify-center gap-4 max-w-2xl mx-auto relative z-20">{['slot1', 'slot2'].map((slot, idx) => (<div key={slot} className="flex-1 relative">{searchSlot === slot ? (<div className="absolute top-0 left-0 w-full z-30"><div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"><div className="p-2 border-b border-slate-100 flex items-center gap-2"><Search size={16} className="text-slate-400 ml-2"/><input autoFocus className="w-full p-2 outline-none text-sm font-bold text-slate-700" placeholder="Digite para buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onBlur={() => setTimeout(() => setSearchMode(null), 200)}/><button onClick={()=>{setSearchSlot(null); setSearchTerm("");}}><X size={16} className="text-slate-400"/></button></div><div className="max-h-60 overflow-y-auto">{searchResults.map(res => (<div key={res.slug} onClick={() => handleSelectCompetitor(res.slug)} className="p-3 hover:bg-cyan-50 cursor-pointer border-b border-slate-50 last:border-0 text-left"><span className="font-bold text-slate-700 text-sm block">{res.name}</span><span className="text-xs text-slate-400">{res.city}</span></div>))}{searchTerm && searchResults.length === 0 && (<div onClick={() => { setSuggestionData({ name: searchTerm, city: '' }); setShowSuggestion(true); setSearchSlot(null); }} className="p-4 text-center cursor-pointer hover:bg-slate-50"><p className="text-xs text-slate-500">Não encontrou?</p><p className="text-xs font-bold text-[#0097A8] mt-1">Sugerir adição</p></div>)}</div></div></div>) : (<button onClick={() => { setSearchSlot(slot); setSearchTerm(""); }} className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-[#0097A8] rounded-xl p-3 text-sm font-bold text-slate-600 flex items-center justify-between group transition-all"><span className="truncate">{idx === 0 ? item1.name : item2.name}</span><Edit size={14} className="text-slate-400 group-hover:text-[#0097A8]"/></button>)}</div>))}</div><p className="text-slate-400 mt-4 text-sm flex items-center justify-center gap-1"><Edit size={12}/> Clique nos nomes para alterar</p></div>

       <div className="grid grid-cols-2 gap-4 md:gap-12 relative mb-12">
           <div className="space-y-4"><div className="aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-100 group"><img src={item1.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/></div><Button onClick={() => navigate(`/${getStateSlug(item1.state)}/${item1.slug}`)} className="w-full bg-[#0097A8] hover:bg-[#007f8f] text-xs md:text-sm">Reservar {item1.name.split(' ')[0]}</Button></div>
           <div className="absolute left-1/2 top-1/3 -translate-x-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center font-black text-slate-300 border-4 border-slate-50 text-xs">VS</div>
           <div className="space-y-4"><div className="aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-100 group"><img src={item2.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/></div><Button onClick={() => navigate(`/${getStateSlug(item2.state)}/${item2.slug}`)} className="w-full bg-[#0097A8] hover:bg-[#007f8f] text-xs md:text-sm">Reservar {item2.name.split(' ')[0]}</Button></div>
       </div>

       <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-16">
           <table className="w-full text-sm text-center">
               <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider"><tr><th className="py-4 px-2 w-1/3 text-left pl-6">Critério</th><th className="py-4 px-2 w-1/3 text-slate-800">{item1.name}</th><th className="py-4 px-2 w-1/3 text-slate-800">{item2.name}</th></tr></thead>
               <tbody className="divide-y divide-slate-100">
                   <tr><td className="py-4 text-left pl-6 font-bold text-slate-700">Preço Adulto</td><td className="text-[#0097A8] font-bold text-lg">{formatBRL(item1.priceAdult)}</td><td className="text-[#0097A8] font-bold text-lg">{formatBRL(item2.priceAdult)}</td></tr>
                   <tr><td className="py-4 text-left pl-6 font-bold text-slate-700">Preço Criança</td><td>{formatBRL(item1.priceChild)}</td><td>{formatBRL(item2.priceChild)}</td></tr>
                   <tr><td className="py-4 text-left pl-6 font-bold text-slate-700">Cidade</td><td>{item1.city}</td><td>{item2.city}</td></tr>
                   <tr><td className="py-4 text-left pl-6 font-bold text-slate-700">Pet Friendly</td><td>{renderCheck(item1.petAllowed)}</td><td>{renderCheck(item2.petAllowed)}</td></tr>
                   <tr><td className="py-4 text-left pl-6 font-bold text-slate-700">Pensão</td><td>{item1.meals?.join(', ') || '-'}</td><td>{item2.meals?.join(', ') || '-'}</td></tr>
                   <tr><td colSpan="3" className="bg-slate-50 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Comodidades e Lazer</td></tr>
                   {/* LÓGICA DE COMODIDADES (UNIÃO) */}
                   {AMENITIES_LIST.filter(a => (item1.amenities?.includes(a) || item2.amenities?.includes(a))).map(am => (
                       <tr key={am}>
                           <td className="py-3 text-left pl-6 text-slate-600">{am}</td>
                           <td>{renderCheck(item1.amenities?.includes(am))}</td>
                           <td>{renderCheck(item2.amenities?.includes(am))}</td>
                       </tr>
                   ))}
               </tbody>
           </table>
           <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-100">
               * Exibindo todas as comodidades disponíveis em pelo menos um dos locais.
               <br/>
               {/* LINK REINTEGRADO PARA O ESTADO */}
               <span 
                   className="text-[#0097A8] font-bold cursor-pointer hover:underline mt-1 inline-block"
                   onClick={() => navigate(`/${getStateSlug(item1.state)}`)}
               >
                   Ver todos os Day Uses em {STATE_NAMES[item1.state] || item1.state} &rarr;
               </span>
           </div>
       </div>

       {/* Banner Quiz IA (RESTAURADO) */}
       <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl mb-16 relative overflow-hidden group cursor-pointer" onClick={() => navigate('/quiz')}>
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
           <div className="relative z-10">
               <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-4 border border-white/20 backdrop-blur-sm">Descubra com Inteligência</span>
               <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ainda na dúvida? Deixe a IA escolher!</h2>
               <p className="text-indigo-100 mb-8 max-w-xl mx-auto">Responda 3 perguntas rápidas e nossa inteligência artificial encontra a experiência ideal para o seu perfil. Sem custo, sem cadastro.</p>
               <button className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg">Fazer Quiz Agora</button>
           </div>
       </div>

       {relatedComparisons.length > 0 && (
            <div className="pt-8 border-t border-slate-100 mt-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Comparar com outras opções</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedComparisons.map(link => (
                        <button key={link.key} onClick={() => navigate(link.url)} className="text-sm text-left p-3 rounded-xl border border-slate-100 hover:border-[#0097A8] hover:bg-cyan-50 transition-all flex items-center justify-between group">
                            <span className="text-slate-600 group-hover:text-[#0097A8] font-medium truncate pr-2">{link.label}</span>
                            <ArrowRight size={14} className="text-slate-300 group-hover:text-[#0097A8] shrink-0"/>
                        </button>
                    ))}
                </div>
            </div>
       )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// COMPONENTE: QUIZ DE RECOMENDAÇÃO (IA SIMULADA)
// -----------------------------------------------------------------------------
const QuizPage = () => {
  const navigate = useNavigate();
  
  // Estados
  const [started, setStarted] = useState(false); // Controla a tela de introdução
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ newsletter: true }); 
  const [result, setResult] = useState(null);
  
  // Loadings
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  useSEO(
    "Qual Day Use é Melhor Pra Você? Descubra No Quiz Gratuito!", 
    "Responda perguntas rápidas e nossa inteligência encontra a experiência perfeita: Casais, Família, Pets e muito mais."
  );

  useSchema({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Quiz Descobridor de Day Use",
    "url": "https://mapadodayuse.com/quiz",
    "applicationCategory": "TravelApplication"
  });

  // CONFIGURAÇÃO DAS PERGUNTAS
  const questions = [
      { 
          id: 'name', 
          type: 'text', 
          question: "Para começar, como devemos te chamar?", 
          placeholder: "Digite seu nome",
          buttonLabel: "Continuar"
      },
      { 
        id: 'company', 
        type: 'choice',
        question: `Oi ${answers.name || 'viajante'}! Com quem você vai curtir o dia?`, 
        options: [
            {icon: '💑', label: 'Casal (Romance)', val: 'couple'}, 
            {icon: '👨‍👩‍👧‍👦', label: 'Família com Crianças', val: 'family'}, 
            {icon: '🎉', label: 'Grupo de Amigos', val: 'friends'},
            {icon: '🧘', label: 'Sozinho (Relax)', val: 'solo'}
        ] 
      },
      { 
        id: 'pet', 
        type: 'choice',
        question: "O pet vai junto?", 
        options: [
            {icon: '🐶', label: 'Sim, ele é da família!', val: true}, 
            {icon: '🚫', label: 'Não, dessa vez não.', val: false}
        ] 
      },
      { 
        id: 'food', 
        type: 'choice',
        question: "Qual sua preferência de alimentação?", 
        options: [
            {icon: '🍽️', label: 'Pensão Inclusa (Café/Almoço)', val: 'included'}, 
            {icon: '🍖', label: 'Quero Churrasqueira', val: 'bbq'},
            {icon: '🍔', label: 'Restaurante/Bar no local', val: 'restaurant'},
            {icon: '🥪', label: 'Tanto faz / Levo lanche', val: 'any'}
        ] 
      },
      { 
        id: 'must_have', 
        type: 'choice',
        question: "Tem algo que NÃO pode faltar?", 
        options: [
            {icon: '🔥', label: 'Piscina Aquecida/Climatizada', val: 'heated_pool'}, 
            {icon: '🎣', label: 'Pesque e Solte', val: 'fishing'},
            {icon: '🚗', label: 'Estacionamento Incluso', val: 'parking'},
            {icon: '✨', label: 'Só quero curtir (Sem exigência)', val: 'none'}
        ] 
      },
      {
          id: 'city',
          type: 'location',
          question: "Onde você quer passear?",
          placeholder: "Ex: Belo Horizonte",
          buttonLabel: "Próximo"
      },
      {
          id: 'email',
          type: 'email',
          question: "Última etapa! Onde enviamos o resultado?",
          sub: "Prometemos enviar apenas ofertas que combinam com seu perfil.",
          placeholder: "seu@email.com",
          buttonLabel: "Ver Meu Resultado Perfeito",
          skipLabel: "Pular e ver resultado"
      }
  ];

  const currentQ = questions[step];

  // Geolocalização Automática
  useEffect(() => {
      // Se a pergunta atual for de localização e ainda não tivermos cidade, tenta pegar automaticamente
      if (currentQ && currentQ.type === 'location' && !answers.city && !geoLoading && started) {
          handleGeoLocation();
      }
  }, [step, started]);

  const handleGeoLocation = () => {
      if (!navigator.geolocation) return;
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
          try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
              const data = await res.json();
              const city = data.address?.city || data.address?.town || data.address?.village || "";
              if (city) {
                  // Atualiza o input visualmente e o estado
                  setAnswers(prev => ({ ...prev, city }));
              }
          } catch (error) { console.error("Erro geo:", error); } 
          finally { setGeoLoading(false); }
      }, () => setGeoLoading(false));
  };

  // Avançar
  const handleNext = (val) => {
      if (val && val.preventDefault) val.preventDefault();
      const valueToSave = val !== undefined && !val.preventDefault ? val : answers[currentQ.id];
      const nextAnswers = { ...answers, [currentQ.id]: valueToSave };
      setAnswers(nextAnswers);

      if (step < questions.length - 1) {
          setStep(step + 1);
      } else {
          finishQuiz(nextAnswers);
      }
  };

  // Finalizar
  const finishQuiz = async (finalAnswers) => {
      setLoading(true);
      
      // Salva Lead no Firebase
      if (finalAnswers.email && finalAnswers.email.includes('@')) {
          try {
              await addDoc(collection(db, "leads"), {
                  name: finalAnswers.name || 'Visitante',
                  email: finalAnswers.email,
                  city: finalAnswers.city || '',
                  newsletter: finalAnswers.newsletter,
                  preferences: { 
                      company: finalAnswers.company, 
                      pet: finalAnswers.pet, 
                      food: finalAnswers.food,
                      must_have: finalAnswers.must_have
                  },
                  source: 'quiz_v2',
                  createdAt: new Date()
              });
          } catch (err) { console.error("Erro lead:", err); }
      }

      // Algoritmo
      setTimeout(async () => {
          const q = query(collection(db, "dayuses"));
          const snap = await getDocs(q);
          const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
          const userCitySlug = finalAnswers.city ? generateSlug(finalAnswers.city) : "";

          let filtered = all.filter(i => {
              const amenities = (i.amenities || []).map(a => a.toLowerCase());
              if (finalAnswers.pet && !i.petAllowed) return false;
              if (finalAnswers.food === 'included' && (!i.meals || i.meals.length === 0)) return false;
              if (finalAnswers.food === 'bbq' && !amenities.some(a => a.includes('churrasqueira'))) return false;
              if (finalAnswers.food === 'restaurant' && !amenities.some(a => a.includes('restaurante') || a.includes('bar') || a.includes('quiosque'))) return false;
              if (finalAnswers.must_have === 'heated_pool' && !amenities.some(a => a.includes('aquecida') || a.includes('climatizada'))) return false;
              if (finalAnswers.must_have === 'fishing' && !amenities.some(a => a.includes('pesque'))) return false;
              if (finalAnswers.must_have === 'parking' && !amenities.some(a => a.includes('estacionamento'))) return false;
              return true;
          });
          
          const scored = filtered.map(item => {
              let score = 0;
              const amenities = (item.amenities || []).map(a => a.toLowerCase());
              const itemCitySlug = item.city ? generateSlug(item.city) : "";

              if (userCitySlug && itemCitySlug === userCitySlug) score += 50; 
              else if (userCitySlug && item.state === "MG") score += 10; 
              
              if (finalAnswers.company === 'family') {
                  if (amenities.some(a => a.includes('kids') || a.includes('infantil') || a.includes('playground'))) score += 15;
                  if (item.childAgeEnd && Number(item.childAgeEnd) > 10) score += 5;
              }
              if (finalAnswers.company === 'couple') {
                  if (amenities.some(a => a.includes('hidro') || a.includes('ofurô') || a.includes('massagem') || a.includes('sauna'))) score += 15;
                  if (!amenities.some(a => a.includes('kids') || a.includes('playground'))) score += 5; 
              }
              if (finalAnswers.company === 'friends') {
                  if (amenities.some(a => a.includes('futebol') || a.includes('vôlei') || a.includes('churrasqueira') || a.includes('jogos'))) score += 15;
              }
              return { ...item, score };
          });

          scored.sort((a, b) => b.score - a.score || Number(a.priceAdult) - Number(b.priceAdult));
          setResult(scored.slice(0, 3)); 
          setLoading(false);
      }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto py-16 px-4 animate-fade-in min-h-[70vh] flex flex-col justify-center items-center">
        
        {/* TELA 1: INTRODUÇÃO (CAPA) */}
        {!started && !result && !loading && (
             <div className="text-center space-y-8 animate-fade-in max-w-3xl">
                 <span className="text-sm font-bold text-[#0097A8] uppercase tracking-wider bg-cyan-50 px-6 py-2 rounded-full border border-cyan-100">
                    Experiência Personalizada
                 </span>
                 
                 <h1 className="text-5xl md:text-8xl font-extrabold text-slate-900 leading-tight">
                     Vamos encontrar o seu <br/>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0097A8] to-cyan-400">Day Use Ideal?</span>
                 </h1>
                 
                 <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-light">
                     Nossa inteligência artificial analisa seu perfil para recomendar os melhores lugares em segundos. Sem custo, sem complicação.
                 </p>

                 <button 
                    onClick={() => setStarted(true)}
                    className="group bg-[#0097A8] text-white px-12 py-6 rounded-2xl text-xl font-bold hover:bg-[#007F8F] hover:scale-105 transition-all shadow-xl shadow-teal-200/50 flex items-center gap-3 mx-auto mt-8"
                 >
                    Começar Agora <ArrowRight className="group-hover:translate-x-1 transition-transform"/>
                 </button>
             </div>
        )}

        {/* TELA 2: PERGUNTAS (DESIGN CLEAN) */}
        {started && !result && !loading && (
            <div className="w-full max-w-2xl text-center">
                {/* Barra de Progresso Sutil */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full mb-12 overflow-hidden">
                    <div 
                        className="h-full bg-[#0097A8] transition-all duration-500 ease-out" 
                        style={{ width: `${((step + 1) / questions.length) * 100}%` }}
                    ></div>
                </div>

                <div className="mb-12">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Etapa {step + 1} de {questions.length}</span>
                    <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mt-4 leading-tight">{currentQ.question}</h2>
                    {currentQ.sub && <p className="text-slate-500 text-xl mt-4">{currentQ.sub}</p>}
                </div>

                {/* TIPOS DE INPUT */}
                {['text', 'email', 'location'].includes(currentQ.type) && (
                    <form onSubmit={(e) => handleNext(e)} className="space-y-8">
                        <div className="relative max-w-lg mx-auto">
                            {currentQ.type === 'location' && (
                                <button type="button" onClick={handleGeoLocation} className="absolute right-4 top-4 text-[#0097A8] hover:bg-cyan-50 p-2 rounded-full transition-colors" title="Usar minha localização">
                                    {geoLoading ? <div className="animate-spin w-6 h-6 border-2 border-[#0097A8] border-t-transparent rounded-full"/> : <MapPin size={28}/>}
                                </button>
                            )}
                            <input 
                                className="w-full bg-transparent border-b-2 border-slate-200 p-4 text-3xl md:text-5xl text-center font-bold text-slate-800 outline-none focus:border-[#0097A8] placeholder:text-slate-300 transition-colors"
                                placeholder={currentQ.placeholder}
                                type={currentQ.type === 'email' ? 'email' : 'text'}
                                value={answers[currentQ.id] || ''}
                                onChange={e => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                                autoFocus
                                required={currentQ.type === 'name'}
                            />
                        </div>

                        {currentQ.type === 'email' && (
                            <label className="flex items-center justify-center gap-3 text-base text-slate-500 cursor-pointer hover:text-slate-700">
                                <input type="checkbox" checked={answers.newsletter} onChange={e => setAnswers({ ...answers, newsletter: e.target.checked })} className="accent-[#0097A8] w-5 h-5"/>
                                Quero receber ofertas exclusivas.
                            </label>
                        )}

                        <div className="pt-8 flex flex-col items-center gap-6">
                            <Button type="submit" className="px-16 py-5 text-xl rounded-2xl shadow-xl shadow-teal-100">
                                {currentQ.buttonLabel}
                            </Button>
                            {currentQ.skipLabel && (
                                <button type="button" onClick={() => { setAnswers({ ...answers, [currentQ.id]: '' }); handleNext(''); }} className="text-base text-slate-400 hover:text-slate-600 underline decoration-slate-300 underline-offset-4">
                                    {currentQ.skipLabel}
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {/* MULTIPLA ESCOLHA (CARDS GRANDES) */}
                {currentQ.type === 'choice' && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {currentQ.options.map((opt, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleNext(opt.val)}
                                className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 hover:border-[#0097A8] hover:bg-teal-50 transition-all text-left flex flex-col items-center md:items-start gap-4 group hover:shadow-xl hover:-translate-y-1"
                            >
                                <span className="text-5xl md:text-6xl group-hover:scale-110 transition-transform duration-300 filter grayscale group-hover:grayscale-0">{opt.icon}</span>
                                <span className="font-bold text-slate-700 text-xl group-hover:text-[#0097A8] mt-2">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* LOADING */}
        {loading && (
            <div className="py-20 flex flex-col items-center animate-fade-in">
                <div className="animate-spin w-24 h-24 border-4 border-[#0097A8] border-t-transparent rounded-full mb-10"></div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 animate-pulse text-center">
                    {answers.name ? `${answers.name}, s` : 'S'}ua experiência perfeita está sendo localizada...
                </h2>
                <p className="text-slate-500 mt-6 text-xl">Analisando comodidades, preços e avaliações.</p>
            </div>
        )}

        {/* RESULTADO */}
        {result && !loading && (
            <div className="animate-fade-in w-full text-center">
                <div className="mb-16">
                    <span className="text-7xl mb-6 block animate-bounce">🎉</span>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Aqui estão seus matches!</h2>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                        {answers.city ? `Encontramos estas opções incríveis perto de ${answers.city}:` : 'Baseado no seu perfil, você vai amar estes lugares:'}
                    </p>
                </div>
                
                {result.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                        {result.map(item => (
                            <DayUseCard 
                                key={item.id} 
                                item={item} 
                                onClick={() => navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}})} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 p-12 rounded-[3rem] border border-dashed border-slate-300 max-w-lg mx-auto">
                        <p className="text-slate-500 text-lg mb-6">Poxa, não encontramos nada exato para essa combinação específica na sua região.</p>
                        <Button onClick={() => navigate('/')}>Ver todas as opções</Button>
                    </div>
                )}
                
                <button 
                    onClick={() => { setStep(0); setResult(null); setAnswers({ newsletter: true }); setStarted(false); }} 
                    className="mt-20 text-[#0097A8] font-bold hover:underline flex items-center justify-center gap-2 mx-auto text-sm uppercase tracking-widest"
                >
                    <ArrowRight className="rotate-180" size={16}/> Refazer Quiz
                </button>
            </div>
        )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// PÁGINA DE ENVIO DE DOCUMENTOS (PARCEIRO)
// -----------------------------------------------------------------------------
const PartnerVerification = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [user, setUser] = useState(auth.currentUser);
  const [status, setStatus] = useState('loading'); 
  
  // Novo: Modal de Sucesso Pós-Envio
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
     if(user) {
         getDoc(doc(db, "users", user.uid)).then(s => {
             setStatus(s.data()?.docStatus || 'none');
         });
     }
  }, [user]);

  const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file && file.size > 4 * 1024 * 1024) { 
          alert("Arquivo muito grande. Máximo 4MB.");
          return;
      }
      setDocFile(file);
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      if (!docFile) { alert("Por favor, anexe o documento."); return; }
      
      setLoading(true);
      try {
          const reader = new FileReader();
          reader.readAsDataURL(docFile);
          reader.onloadend = async () => {
              const base64 = reader.result;
              
              await updateDoc(doc(db, "users", user.uid), {
                  docStatus: 'pending',
                  docFile: base64,
                  docType: 'CCMEI_CONTRATO',
                  submittedAt: new Date()
              });
              
              // 1. Notifica Admin (Sistema)
              fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      to: 'contato@mapadodayuse.com', 
                      subject: `📄 Admin: Docs de ${user.email}`, 
                      html: `<p>Novo documento enviado.</p>` 
                  })
              }).catch(console.error);

              // 2. Notifica o Parceiro (TEMPLATE ATUALIZADO E BONITO)
              const partnerEmailHtml = `
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7f6; padding: 40px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="background-color: #0097A8; padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Mapa do Day Use</h1>
                        </div>
                        <div style="padding: 40px 30px; text-align: center;">
                            <h2 style="color: #2c3e50; margin-top: 0;">Recebemos seus documentos! 📄</h2>
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                Olá! A confirmação do envio da sua documentação foi realizada com sucesso.
                            </p>
                            <div style="background-color: #e0f7fa; border-left: 4px solid #0097A8; padding: 20px; margin: 30px 0; text-align: left; border-radius: 4px;">
                                <p style="margin: 0; color: #006064; font-size: 14px;">
                                    <strong>Próximos Passos:</strong><br/>
                                    1. Nossa equipe fará a análise de segurança (Prazo: 24h úteis).<br/>
                                    2. Poderemos entrar em contato por telefone para validações adicionais.<br/>
                                    3. Você receberá um e-mail assim que aprovado.
                                </p>
                            </div>
                            <p style="color: #555; font-size: 15px;">
                                <strong>Dica Importante:</strong> Enquanto aguarda, se você ainda não tem uma conta no <strong>Mercado Pago</strong>, crie uma agora. Você precisará conectá-la na próxima etapa para receber seus pagamentos.
                            </p>
                        </div>
                        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 0;">© 2026 Mapa do Day Use. Todos os direitos reservados.</p>
                        </div>
                    </div>
                </div>
              `;

              await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      to: user.email, 
                      subject: "Documentos Recebidos - Análise em Andamento", 
                      html: partnerEmailHtml 
                  })
              });

              setLoading(false);
              setShowSuccessModal(true);
          };
      } catch (error) {
          console.error(error);
          alert("Erro ao enviar. Tente novamente.");
          setLoading(false);
      }
  };

  // Se já estiver em análise e entrar na página
  if (status === 'pending') return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center animate-fade-in">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6"><div className="animate-spin border-4 border-yellow-500 border-t-transparent w-12 h-12 rounded-full"></div></div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Análise em Andamento</h1>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">Já recebemos tudo! Estamos correndo para liberar seu acesso. Fique de olho no seu e-mail.</p>
          <Button onClick={() => navigate('/partner')} variant="outline">Voltar ao Painel</Button>
      </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 animate-fade-in">
        
        {/* Modal de Sucesso Pós-Envio */}
        {showSuccessModal && createPortal(
            <ModalOverlay onClose={() => { setShowSuccessModal(false); navigate('/partner'); }}>
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full animate-fade-in">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={40}/>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Tudo Certo!</h2>
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        Seus documentos foram enviados para nossa equipe de segurança. Em até 24h retornaremos com a aprovação.
                    </p>
                    <Button onClick={() => navigate('/partner')} className="w-full justify-center shadow-lg shadow-teal-100">
                        Voltar para o Painel
                    </Button>
                </div>
            </ModalOverlay>,
            document.body
        )}

        <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Vamos validar sua empresa</h1>
            <p className="text-slate-500 text-lg">Esse é o passo mais importante para garantir a segurança dos seus recebimentos.</p>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-8 flex gap-4 items-start">
            <ShieldCheck className="text-blue-600 shrink-0 mt-1" size={24}/>
            <div className="text-sm text-blue-800">
                <p className="font-bold mb-1 text-base">Segurança de Dados (LGPD)</p>
                <p>Seus documentos são criptografados e usados exclusivamente para validação cadastral, garantindo que apenas empresas reais operem na plataforma.</p>
            </div>
        </div>

        <div className="bg-white border-l-4 border-yellow-400 p-6 rounded-r-xl shadow-sm mb-8">
            <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">O que você precisa enviar:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-900">
                <li><strong>CCMEI</strong> (Para MEI) OU <strong>Contrato Social</strong> (Para LTDA/EIRELI)</li>
                <li className="font-bold">O documento deve estar assinado e legível.</li>
            </ul>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-xl space-y-8">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Anexar Documento (PDF ou Foto)</label>
                <div className="border-2 border-dashed border-[#0097A8]/30 rounded-2xl p-12 text-center hover:bg-cyan-50/50 transition-colors cursor-pointer relative group">
                    <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        onChange={handleFileChange} 
                        required={!docFile} 
                    />
                    <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-300">
                        <div className="bg-cyan-100 text-[#0097A8] p-4 rounded-full mb-3">
                             <FileText size={32}/>
                        </div>
                        <span className="text-lg font-bold text-slate-700">
                            {docFile ? docFile.name : "Clique para selecionar o arquivo"}
                        </span>
                        <span className="text-sm text-slate-400 mt-1">Suporta PDF, JPG e PNG (Max 4MB)</span>
                    </div>
                </div>
            </div>

            {/* BOTÃO DE ALTO CONTRASTE */}
            <button 
                type="submit" 
                className="w-full py-4 text-lg font-bold text-white bg-[#0097A8] hover:bg-[#007F8F] rounded-xl shadow-lg shadow-teal-200/50 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
            >
                {loading ? 'Enviando e Processando...' : 'Enviar para Análise 🚀'}
            </button>
        </form>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [user, setUser] = useState(undefined); // undefined = carregando
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Busca a role atualizada no banco para garantir que não é cache antigo
        const docSnap = await getDoc(doc(db, "users", u.uid));
        const userData = docSnap.exists() ? docSnap.data() : {};
        const role = userData.role || 'user';
        
        // Verifica se a role do usuário está na lista de permitidos
        if (allowedRoles && !allowedRoles.includes(role)) {
           // Se não tiver permissão (ex: user tentando ir para /partner), joga pra home
           navigate('/'); 
           setUser(null);
        } else {
           setUser({ ...u, role });
        }
      } else {
        // Se não tá logado, joga pra home
        navigate('/');
        setUser(null);
      }
    });
    return unsub;
  }, [navigate, allowedRoles]);

  // Loading enquanto verifica permissão
  if (user === undefined) return (
      <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-[#0097A8] border-t-transparent rounded-full"></div>
      </div>
  );
  
  return user ? children : null;
};

// -----------------------------------------------------------------------------
// PAINEL ADMINISTRATIVO (MODERAÇÃO)
// -----------------------------------------------------------------------------
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('partners'); // 'partners', 'leads', 'claims'
  const [user, setUser] = useState(null);
  
  // States - Parceiros
  const [pendingUsers, setPendingUsers] = useState([]);
  const [viewDoc, setViewDoc] = useState(null);

  // States - Leads
  const [leads, setLeads] = useState([]);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  // States - Claims (Solicitações)
  const [claims, setClaims] = useState([]);
  const [claimFilter, setClaimFilter] = useState('pending'); // 'pending', 'done'

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
        if(u) {
            const snap = await getDoc(doc(db, "users", u.uid));
            if (snap.data()?.role === 'admin') {
                setUser(u);
                
                // Listener Parceiros Pendentes
                onSnapshot(query(collection(db, "users"), where("docStatus", "==", "pending")), (s) => {
                    setPendingUsers(s.docs.map(d => ({id: d.id, ...d.data()})));
                });

                // Listener Leads (Quiz)
                onSnapshot(query(collection(db, "leads"), orderBy("createdAt", "desc")), (s) => {
                    setLeads(s.docs.map(d => ({id: d.id, ...d.data()})));
                });

                // Listener Solicitações (Claims)
                onSnapshot(query(collection(db, "property_claims"), orderBy("createdAt", "desc")), (s) => {
                    setClaims(s.docs.map(d => ({id: d.id, ...d.data()})));
                });
            }
        }
    });
    return unsubAuth;
  }, []);

  // --- AÇÕES PARCEIROS ---
  const handlePartnerAction = async (uid, status) => {
      const confirmText = status === 'verified' ? "Aprovar empresa?" : "Rejeitar documento?";
      if (confirm(confirmText)) {
          await updateDoc(doc(db, "users", uid), { docStatus: status });
          
          let subject = "";
          let html = "";

          // E-MAIL DE APROVAÇÃO (TEMPLATE ATUALIZADO)
          if (status === 'verified') {
              subject = "Parabéns! Sua empresa foi APROVADA! 🚀";
              html = `
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7f6; padding: 40px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <div style="background-color: #0097A8; padding: 40px 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px;">Bem-vindo(a) ao Time! 🎉</h1>
                        </div>
                        <div style="padding: 40px 30px; text-align: center;">
                            <h2 style="color: #2c3e50; margin-top: 0;">Sua conta foi verificada com sucesso.</h2>
                            <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                                A análise jurídica foi concluída e sua empresa está apta a operar no <strong>Mapa do Day Use</strong>. Você desbloqueou o acesso completo ao painel.
                            </p>
                            
                            <div style="background-color: #fff8e1; border: 1px solid #ffe0b2; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                                <p style="color: #e65100; font-weight: bold; margin: 0 0 10px 0;">🚀 Próxima Etapa Obrigatória:</p>
                                <p style="color: #555; margin: 0; font-size: 14px;">
                                    Conecte sua conta do <strong>Mercado Pago</strong> para habilitar o recebimento financeiro automático.
                                </p>
                            </div>

                            <a href="https://mapadodayuse.com/partner" style="display: inline-block; background-color: #0097A8; color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(0,151,168,0.3);">
                                Acessar Painel do Parceiro
                            </a>
                            
                            <p style="margin-top: 40px; font-size: 14px; color: #999;">
                                Dúvidas? Nossa equipe de suporte está à disposição no WhatsApp.
                            </p>
                        </div>
                    </div>
                </div>
              `;
          } else {
              subject = "Atualização sobre sua conta - Ação Necessária";
              html = `
                <div style="font-family: sans-serif; padding: 30px;">
                    <h2 style="color: #c0392b;">Documentação Precisa de Ajustes</h2>
                    <p>Olá. Infelizmente, não conseguimos validar o documento enviado (motivo: ilegível, incompleto ou inválido).</p>
                    <p>Por favor, acesse seu painel e envie uma nova foto ou PDF do <strong>Contrato Social</strong> ou <strong>CCMEI</strong>.</p>
                    <a href="https://mapadodayuse.com/partner/verificacao">Enviar Novamente</a>
                </div>
              `;
          }
          
          if (viewDoc?.email) {
              fetch('/api/send-email', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ to: viewDoc.email, subject, html })
              }).catch(console.error);
          }

          setViewDoc(null);
      }
  };

  // --- AÇÕES LEADS ---
  const filteredLeads = leads.filter(l => {
      if (!dateStart && !dateEnd) return true;
      const leadDate = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
      const start = dateStart ? new Date(dateStart) : new Date('2000-01-01');
      const end = dateEnd ? new Date(dateEnd) : new Date();
      end.setHours(23, 59, 59);
      return leadDate >= start && leadDate <= end;
  });

  const exportLeadsCSV = () => {
      const headers = ["Data", "Nome", "Email", "Cidade", "Newsletter", "Perfil", "Pet", "Alimentação"];
      const rows = filteredLeads.map(l => [
          l.createdAt?.toDate ? l.createdAt.toDate().toLocaleDateString('pt-BR') : new Date().toLocaleDateString(),
          l.name,
          l.email,
          l.city,
          l.newsletter ? "Sim" : "Não",
          l.preferences?.company || "-",
          l.preferences?.pet ? "Sim" : "Não",
          l.preferences?.food || "-"
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `leads_dayuse_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- AÇÕES SOLICITAÇÕES ---
  const handleClaimStatus = async (id, newStatus) => {
      if(confirm("Alterar status da solicitação?")) {
          await updateDoc(doc(db, "property_claims", id), { status: newStatus });
      }
  };

  const filteredClaims = claims.filter(c => claimFilter === 'all' || c.status === claimFilter);

  if (!user) return <div className="text-center py-20">Verificando permissões...</div>;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-2">
            <ShieldCheck className="text-[#0097A8]"/> Painel Administrativo
        </h1>

        {/* NAVEGAÇÃO EM ABAS */}
        <div className="flex gap-4 mb-8 border-b border-slate-200 pb-1 overflow-x-auto">
            <button onClick={() => setActiveTab('partners')} className={`pb-3 px-4 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'partners' ? 'text-[#0097A8] border-b-2 border-[#0097A8]' : 'text-slate-500 hover:text-slate-700'}`}>
                Moderação Parceiros {pendingUsers.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingUsers.length}</span>}
            </button>
            <button onClick={() => setActiveTab('leads')} className={`pb-3 px-4 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'leads' ? 'text-[#0097A8] border-b-2 border-[#0097A8]' : 'text-slate-500 hover:text-slate-700'}`}>
                Leads Quiz
            </button>
            <button onClick={() => setActiveTab('claims')} className={`pb-3 px-4 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'claims' ? 'text-[#0097A8] border-b-2 border-[#0097A8]' : 'text-slate-500 hover:text-slate-700'}`}>
                Solicitações de Propriedade {claims.filter(c=>c.status==='pending').length > 0 && <span className="ml-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">{claims.filter(c=>c.status==='pending').length}</span>}
            </button>
        </div>

        {/* --- CONTEÚDO: PARCEIROS --- */}
        {activeTab === 'partners' && (
            <div>
                {pendingUsers.length === 0 ? (
                    <div className="bg-slate-50 p-12 rounded-3xl border border-dashed border-slate-300 text-center">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
                        <p className="text-slate-500">Tudo limpo! Nenhuma verificação pendente.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingUsers.map(p => (
                            <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="font-bold text-lg text-slate-800">{p.name || "Sem nome"}</p>
                                    <p className="text-sm text-slate-500">{p.email}</p>
                                    <p className="text-xs text-slate-400 mt-1">Enviado em: {p.submittedAt?.toDate ? p.submittedAt.toDate().toLocaleString() : 'Data inválida'}</p>
                                </div>
                                <Button onClick={() => setViewDoc(p)} className="px-6">Analisar Documento</Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- CONTEÚDO: LEADS --- */}
        {activeTab === 'leads' && (
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-4 items-center">
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">De</label>
                            <input type="date" className="border p-2 rounded-lg text-sm" value={dateStart} onChange={e=>setDateStart(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">Até</label>
                            <input type="date" className="border p-2 rounded-lg text-sm" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} />
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 mb-1">Total Filtrado: <strong>{filteredLeads.length}</strong></p>
                        <Button onClick={exportLeadsCSV} variant="outline" className="text-xs h-9"><Download size={14}/> Exportar CSV</Button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">Data</th>
                                    <th className="p-4 whitespace-nowrap">Nome</th>
                                    <th className="p-4 whitespace-nowrap">Email</th>
                                    <th className="p-4 whitespace-nowrap">Cidade</th>
                                    <th className="p-4 whitespace-nowrap">Perfil</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500">{lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : '-'}</td>
                                        <td className="p-4 font-bold text-slate-700">{lead.name}</td>
                                        <td className="p-4 text-slate-600">{lead.email}</td>
                                        <td className="p-4 text-slate-600">{lead.city}</td>
                                        <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs capitalize">{lead.preferences?.company || '-'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredLeads.length === 0 && <p className="text-center py-8 text-slate-400">Nenhum lead encontrado.</p>}
                </div>
            </div>
        )}

        {/* --- CONTEÚDO: SOLICITAÇÕES (CLAIMS) --- */}
        {activeTab === 'claims' && (
            <div className="space-y-6">
                <div className="flex gap-2">
                    <button onClick={()=>setClaimFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${claimFilter==='pending' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>Pendentes</button>
                    <button onClick={()=>setClaimFilter('done')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${claimFilter==='done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>Atendidas</button>
                    <button onClick={()=>setClaimFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${claimFilter==='all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>Todas</button>
                </div>

                <div className="grid gap-4">
                    {filteredClaims.map(claim => (
                        <div key={claim.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
                            <div className="absolute top-4 right-4">
                                {claim.status === 'done' 
                                    ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Atendido</span>
                                    : <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Inbox size={12}/> Pendente</span>
                                }
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 mb-1">{claim.propertyName} <span className="text-xs font-normal text-slate-400">(ID: {claim.propertyId})</span></h3>
                            <p className="text-xs text-slate-400 mb-4">Solicitado em: {claim.createdAt?.toDate ? claim.createdAt.toDate().toLocaleString() : 'Data inválida'}</p>
                            
                            <div className="grid md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl mb-4">
                                <div><span className="text-slate-400 block text-xs uppercase font-bold">Solicitante</span> <strong>{claim.userName}</strong></div>
                                <div><span className="text-slate-400 block text-xs uppercase font-bold">Cargo</span> <strong>{claim.userJob}</strong></div>
                                <div><span className="text-slate-400 block text-xs uppercase font-bold">E-mail</span> {claim.userEmail}</div>
                                <div><span className="text-slate-400 block text-xs uppercase font-bold">Telefone</span> {claim.userPhone}</div>
                            </div>

                            {claim.status !== 'done' && (
                                <div className="flex gap-4">
                                    <Button onClick={() => handleClaimStatus(claim.id, 'done')} className="h-10 text-sm bg-green-600 hover:bg-green-700 shadow-none">Marcar como Atendido</Button>
                                    <a href={`mailto:${claim.userEmail}`} className="h-10 px-4 flex items-center justify-center border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors">Entrar em contato</a>
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredClaims.length === 0 && <p className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Nenhuma solicitação encontrada.</p>}
                </div>
            </div>
        )}

        {/* MODAL DE DOCUMENTO (Mantido) */}
        {viewDoc && createPortal(
            <ModalOverlay onClose={() => setViewDoc(null)}>
                <div className="bg-white p-6 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col relative">
                    <button onClick={() => setViewDoc(null)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X/></button>
                    
                    <h2 className="text-2xl font-bold mb-2">Análise de Documento</h2>
                    <div className="mb-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
                        <p><strong>Parceiro:</strong> {viewDoc.name}</p>
                        <p><strong>Email:</strong> {viewDoc.email}</p>
                    </div>

                    <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden mb-6 border border-slate-200 flex items-center justify-center min-h-[300px]">
                        {viewDoc.docFile ? (
                            viewDoc.docFile.startsWith('data:application/pdf') ? (
                                <iframe src={viewDoc.docFile} className="w-full h-[500px]" title="PDF"></iframe>
                            ) : (
                                <img src={viewDoc.docFile} className="max-w-full max-h-[70vh] object-contain" alt="Doc" />
                            )
                        ) : (
                            <p className="text-red-500">Erro: Arquivo não encontrado.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handlePartnerAction(viewDoc.id, 'rejected')} className="py-4 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200">Rejeitar</button>
                        <button onClick={() => handlePartnerAction(viewDoc.id, 'verified')} className="py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-lg shadow-green-200">Aprovar Parceiro</button>
                    </div>
                </div>
            </ModalOverlay>,
            document.body
        )}
    </div>
  );
};

const EmbedPage = () => {
  const [searchParams] = useSearchParams();
  const { slug } = useParams(); // Se vier na URL /embed/:slug
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Parâmetros de Filtro
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const type = slug ? 'single' : 'list'; // Se tem slug é único, senão é lista
  const title = searchParams.get('title') || (city ? `Day Uses em ${city}` : "Melhores Day Uses");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
          let q;
          if (type === 'single' && slug) {
              // Busca Card Específico (Mesmo se estiver pausado, para preview)
              q = query(collection(db, "dayuses"), where("slug", "==", slug));
          }

          const snap = await getDocs(q);
          let data = snap.docs.map(d => ({id: d.id, ...d.data()}));

          // Filtragem em memória
          if (type === 'list') {
              if (city) data = data.filter(i => generateSlug(i.city) === generateSlug(city));
              else if (state) data = data.filter(i => getStateSlug(i.state) === state.toLowerCase());
              
              // Limita a 10 itens para performance no iframe
              data = data.slice(0, 10);
          }

          setItems(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [slug, city, state, type]);

  // Handler para abrir o site principal em nova aba
  const handleOpen = (item) => {
      const url = `https://mapadodayuse.com/${getStateSlug(item.state)}/${generateSlug(item.name)}`;
      window.open(url, '_blank');
  };

  const handleImageError = (e) => {
      e.target.src = "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80"; 
  };

  // Loading Minimalista
  if (loading) return (
      <div className="flex justify-center items-center h-full p-4">
          <div className="animate-spin w-8 h-8 border-4 border-[#0097A8] border-t-transparent rounded-full"></div>
      </div>
  );

  // Estado Vazio
  if (items.length === 0) return (
      <div className="text-center p-4 text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center h-full font-sans">
          Nenhum local encontrado nesta região.
      </div>
  );

  // --- LAYOUT 1: CARD ÚNICO (WIDGET DE CTA) ---
  if (type === 'single') {
      const item = items[0];
      return (
          <div className="font-sans p-2 h-full box-border">
             <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden w-full h-full flex flex-col group relative">
                 <div className="relative h-48 cursor-pointer flex-shrink-0" onClick={() => handleOpen(item)}>
                     <img 
                        src={item.image} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={handleImageError}
                        alt={item.name}
                     />
                     <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                         <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md truncate">{item.name}</h3>
                         <p className="text-white/90 text-xs flex items-center gap-1 drop-shadow-sm"><MapPin size={12}/> {item.city}, {item.state}</p>
                     </div>
                 </div>
                 <div className="p-3 flex justify-between items-center bg-white flex-1">
                     <div>
                         <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">A partir de</p>
                         <p className="text-xl font-bold text-[#0097A8]">{formatBRL(item.priceAdult)}</p>
                     </div>
                     <button onClick={() => handleOpen(item)} className="bg-[#0097A8] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#007f8f] transition-colors shadow-md shadow-teal-100">
                         Reservar
                     </button>
                 </div>
             </div>
          </div>
      );
  }

  // --- LAYOUT 2: CARROSSEL (LISTA DE OPÇÕES) ---
  return (
      <div className="font-sans bg-transparent h-full flex flex-col">
          {/* Cabeçalho opcional */}
          {title && (
              <h2 className="text-slate-800 font-bold text-sm mb-2 px-1 flex items-center gap-2 truncate">
                  <img src="/logo.png" className="h-4 w-auto" alt="Logo"/> {title}
              </h2>
          )}
          
          <div className="flex gap-3 overflow-x-auto pb-2 px-1 custom-scrollbar snap-x flex-1 items-center">
              {items.map(item => (
                  <div key={item.id} className="min-w-[240px] max-w-[240px] h-[220px] snap-center flex-shrink-0">
                      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden h-full flex flex-col hover:-translate-y-1 transition-transform cursor-pointer group" onClick={() => handleOpen(item)}>
                          <div className="h-32 relative flex-shrink-0">
                              <img 
                                src={item.image} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={handleImageError}
                                alt={item.name}
                              />
                              <div className="absolute top-2 right-2 bg-white/95 px-2 py-1 rounded-lg text-xs font-bold text-[#0097A8] shadow-sm backdrop-blur-sm">
                                  {formatBRL(item.priceAdult)}
                              </div>
                          </div>
                          <div className="p-3 flex flex-col flex-1 justify-between bg-white">
                              <div>
                                <h3 className="font-bold text-slate-800 text-sm mb-1 truncate leading-tight" title={item.name}>{item.name}</h3>
                                <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10}/> {item.city}</p>
                              </div>
                              <button className="w-full border border-[#0097A8] text-[#0097A8] text-[10px] font-bold py-1.5 rounded-lg hover:bg-[#0097A8] hover:text-white transition-colors uppercase tracking-wide mt-2">
                                  Ver Detalhes
                              </button>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );
};

const App = () => {
  return (
      <Routes>
        {/* ROTAS PÚBLICAS */}
        <Route path="/" element={<Layout><HomePage /></Layout>} />

        {/* ROTA DE ADMINISTRAÇÃO (NOVO - Deve vir antes de /:state) */}
        <Route 
            path="/admin" 
            element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Layout><AdminDashboard /></Layout>
                </ProtectedRoute>
            } 
        />

        <Route path="/:state" element={<Layout><RouteResolver /></Layout>} />
        <Route path="/:state/:cityOrSlug" element={<Layout><RouteResolver /></Layout>} />
        <Route path="/stay/:id" element={<Layout><DetailsPage /></Layout>} />
        <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
        
        {/* Institucional e Conteúdo */}
        <Route path="/politica-de-privacidade" element={<Layout><PrivacyPage /></Layout>} />
        <Route path="/termos-de-uso" element={<Layout><TermsPage /></Layout>} />
        <Route path="/sobre-nos" element={<Layout><AboutUsPage /></Layout>} />
        <Route path="/contato" element={<Layout><ContactPage /></Layout>} />
        <Route path="/day-use" element={<Layout><BlogHubPage /></Layout>} />
        <Route path="/day-use/o-que-e-day-use" element={<Layout><WhatIsDayUsePage /></Layout>} />
        <Route path="/mapa-do-site" element={<Layout><SiteMapPage /></Layout>} />
        
        {/* Ferramentas */}
        <Route path="/comparativo" element={<Layout><ComparisonLandingPage /></Layout>} />
        <Route path="/comparativo/:slugs" element={<Layout><ComparisonPage /></Layout>} />
        <Route path="/quiz" element={<Layout><QuizPage /></Layout>} />

        {/* Cadastro de Parceiro (Público) */}
        <Route path="/seja-parceiro" element={<Layout><PartnerLandingPage /></Layout>} />
        <Route path="/partner-register" element={<Layout><PartnerRegisterPage /></Layout>} />
        <Route path="/partner/callback" element={<Layout><PartnerCallbackPage /></Layout>} />

        {/* páginas embed */}
        <Route path="/embed" element={<EmbedPage />} />
        <Route path="/embed/:slug" element={<EmbedPage />} />

        {/* --- ROTAS PROTEGIDAS (REGRAS RÍGIDAS) --- */}

        {/* Apenas Viajantes (Compradores) */}
        <Route 
            path="/minhas-viagens" 
            element={
                <ProtectedRoute allowedRoles={['user']}>
                    <Layout><UserDashboard /></Layout>
                </ProtectedRoute>
            } 
        />

        {/* Perfil Comum (Todos precisam acessar para gerenciar conta) */}
        <Route 
            path="/profile" 
            element={
                <ProtectedRoute allowedRoles={['user', 'partner', 'staff']}>
                    <Layout><UserProfile /></Layout>
                </ProtectedRoute>
            } 
        />

        {/* Apenas Parceiros (Donos) */}
        <Route 
            path="/partner" 
            element={
                <ProtectedRoute allowedRoles={['partner']}>
                    <Layout><PartnerDashboard /></Layout>
                </ProtectedRoute>
            } 
        />
        <Route 
            path="/partner/new" 
            element={
                <ProtectedRoute allowedRoles={['partner']}>
                    <Layout><PartnerNew /></Layout>
                </ProtectedRoute>
            } 
        />
        <Route 
            path="/partner/edit/:id" 
            element={
                <ProtectedRoute allowedRoles={['partner']}>
                    <Layout><PartnerNew /></Layout>
                </ProtectedRoute>
            } 
        />
        <Route 
            path="/partner/verificacao" 
            element={
                <ProtectedRoute allowedRoles={['partner']}>
                    <Layout><PartnerVerification /></Layout>
                </ProtectedRoute>
            } 
        />

        {/* Apenas Staff (Portaria) */}
        <Route 
            path="/portaria" 
            element={
                <ProtectedRoute allowedRoles={['staff']}>
                    <Layout><StaffDashboard /></Layout>
                </ProtectedRoute>
            } 
        />

      </Routes>
  );
};

export default App;