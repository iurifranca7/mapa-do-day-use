import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { db, auth, googleProvider } from './firebase'; 
import { collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, query, where, onSnapshot, deleteDoc, orderBy, arrayUnion, increment  } from 'firebase/firestore'; 
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
  TrendingUp, ShieldCheck, Zap, BarChart, Globe, Target, Award, Wallet, Calendar,
  Facebook, Smartphone, Youtube, Bell, Download, UserCheck, Inbox, Utensils, ThermometerSun, Smile,
  Eye, Archive, ExternalLink, RefreshCcw, TrendingDown, CalendarX, XCircle, Clock, Flame, ChevronUp, AlertTriangle, AlertOctagon
} from 'lucide-react';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import RefundModal from './components/RefundModal';
import { notifyCustomer, notifyPartner } from './utils/notifications';
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

// NOVAS CONSTANTES DE TIPO
const ESTABLISHMENT_TYPES = [
    "Hotel", "Hotel Fazenda", "Fazenda", "Motel", "Spa", 
    "Pesqueiro", "Academia", "Futvôlei", "Beach Tennis", 
    "Clube", "Parque Aquático", "Resort"
];

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
  // Ajuste de compatibilidade para chamadas antigas
  if (typeof image === 'boolean') {
      noIndex = image;
      image = null;
  }

  const defaultImage = `${BASE_URL}/logo.png`; 
  const finalImage = image || defaultImage;
  
  // Constrói a URL canônica usando a BASE_URL fixa
  const currentPath = window.location.pathname;
  const finalCanonical = canonical || `${BASE_URL}${currentPath === '/' ? '' : currentPath}`;

  const siteTitle = (title === "Home" || !title) ? "Mapa do Day Use" : title;

  useEffect(() => {
    document.title = siteTitle;
    
    const setMeta = (attrName, attrValue, content) => {
        let element = document.querySelector(`meta[${attrName}='${attrValue}']`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attrName, attrValue);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content || "");
    };

    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? "noindex, nofollow" : "index, follow");

    // Open Graph (Social)
    setMeta('property', 'og:title', siteTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', finalImage);
    setMeta('property', 'og:url', finalCanonical);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'Mapa do Day Use');
    setMeta('property', 'og:locale', 'pt_BR');

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', siteTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', finalImage);

    // Tag Canônica (SEO Técnico)
    let linkCanonical = document.querySelector("link[rel='canonical']");
    if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", finalCanonical);

  }, [title, description, finalImage, noIndex, siteTitle, finalCanonical]);
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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
        {/* Decoração de fundo */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#0097A8]"></div>
        
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">Reserva Confirmada!</h2>
        <p className="text-slate-500 mb-8">Seu pagamento foi aprovado e o voucher já foi enviado para seu e-mail.</p>

        <button 
            onClick={onAction} // Aqui chamamos o navigate('/minhas-viagens')
            className="w-full bg-[#0097A8] hover:bg-[#007f8c] text-white font-bold py-4 rounded-xl text-lg transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-cyan-500/20"
        >
            Ver Meus Ingressos
        </button>
        
        <button onClick={onClose} className="mt-4 text-slate-400 text-sm hover:text-slate-600 font-medium">
            Fechar
        </button>
      </div>
    </div>
    </ModalOverlay>
  );
};

const PixModal = ({ isOpen, onClose, pixData, onConfirm, paymentId, ownerId }) => {
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Verificação automática a cada 5 segundos
  useEffect(() => {
    let interval;
    if (isOpen && paymentId) {
      interval = setInterval(() => {
        // Ignora verificação automática se for ID de simulação
        if (paymentId && !paymentId.toString().startsWith("PIX-") && !paymentId.toString().startsWith("FRONT_")) {
            checkStatus(false); 
        }
      }, 5000);
    }
    return () => {
        clearInterval(interval);
        setStatusMsg(null);
    };
  }, [isOpen, paymentId, ownerId]);

  const checkStatus = async (isManual = true) => {
      if (isManual) { setChecking(true); setStatusMsg(null); }
      
      // Bypass para modo de teste/simulação local
      if (paymentId && (paymentId.toString().startsWith("PIX-") || paymentId.toString().startsWith("FRONT_"))) {
          setTimeout(() => {
              setStatusMsg({ type: 'success', text: "Pagamento simulado confirmado! Finalizando..." });
              setTimeout(() => { onConfirm(); onClose(); }, 1500);
          }, 1000);
          setChecking(false);
          return;
      }

      // Lógica Real: Consulta API enviando o ID do Pagamento E o ID do Dono
      try {
          const response = await fetch('/api/check-payment-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  paymentId, 
                  ownerId // <--- IMPORTANTE: Envia o ID do parceiro para a API buscar o token correto
              })
          });
          
          if (!response.ok) throw new Error("Erro na verificação");
          
          const data = await response.json();
          
          if (data.status === 'approved') {
              setStatusMsg({ type: 'success', text: "Pagamento confirmado! Emitindo voucher..." });
              setTimeout(() => { onConfirm(); onClose(); }, 1500);
          } else {
              if (isManual) {
                  const statusMap = { pending: 'Pendente', in_process: 'Em processamento', rejected: 'Rejeitado' };
                  const statusText = statusMap[data.status] || data.status;
                  setStatusMsg({ type: 'info', text: `Status atual: ${statusText}. Aguarde a confirmação do banco.` });
              }
          }
      } catch (error) { 
          console.error(error);
          if (isManual) setStatusMsg({ type: 'error', text: "Não foi possível verificar no momento." }); 
      } finally { 
          if (isManual) setChecking(false); 
      }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixData.qr_code);
    setStatusMsg({ type: 'success', text: "Código copiado!" });
  };

  if (!isOpen || !pixData) return null;
  
  // Exibe a imagem do QR Code (Base64 se vier do MP, ou gerado externamente se for string raw)
  const qrCodeImageUrl = pixData.qr_code_base64 
      ? `data:image/png;base64,${pixData.qr_code_base64}`
      : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixData.qr_code)}`;

  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div className="p-6 text-center animate-fade-in">
        <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4"><Ticket size={32}/></div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Pagamento via PIX</h2>
        
        {/* Mostra aviso se for ID de produção aguardando banco */}
        {paymentId && !paymentId.toString().startsWith("PIX-") && !paymentId.toString().startsWith("FRONT_") && (
            <div className="flex items-center justify-center gap-2 mb-4 text-xs text-orange-500 font-bold bg-orange-50 p-2 rounded-lg animate-pulse">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Aguardando confirmação do banco...
            </div>
        )}

        <p className="text-sm text-slate-500 mb-6">Escaneie o QR Code ou copie o código abaixo.</p>
        
        <div className="flex justify-center mb-6">
            <img 
                src={qrCodeImageUrl} 
                alt="QR Code Pix" 
                className="w-48 h-48 border-4 border-slate-100 rounded-xl shadow-sm bg-white" 
            />
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-2 mb-6">
           <p className="text-xs text-slate-500 font-mono truncate flex-1 text-left">{pixData.qr_code}</p>
           <button onClick={copyToClipboard} className="text-teal-600 hover:text-teal-700 p-2 font-bold text-xs uppercase flex items-center gap-1"><Copy size={14}/> Copiar</button>
        </div>

        {statusMsg && (
            <div className={`text-xs p-3 rounded-xl mb-4 font-medium animate-fade-in ${ statusMsg.type === 'success' ? 'bg-green-100 text-green-700' : statusMsg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700' }`}>
                {statusMsg.text}
            </div>
        )}
        
        <Button className="w-full mb-3" onClick={() => checkStatus(true)} disabled={checking}>
            {checking ? 'Verificando...' : 'Já fiz o pagamento'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onClose}>Cancelar</Button>
      </div>
    </ModalOverlay>,
    document.body
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

// -----------------------------------------------------------------------------
// LOGIN MODAL (ATUALIZADO COM NOME E SOBRENOME)
// -----------------------------------------------------------------------------
const LoginModal = ({ isOpen, onClose, onSuccess, initialRole = 'user', hideRoleSelection = false, closeOnSuccess = true, initialMode = 'login', customTitle, customSubtitle }) => {
  if (!isOpen) return null;

  const [view, setView] = useState(initialMode); 
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); 

  // Dados do Formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // NOVOS CAMPOS
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [registeredUser, setRegisteredUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
        setFeedback(null);
        setView(initialMode); setRole(initialRole);
        setEmail(''); setPassword(''); 
        setFirstName(''); setLastName(''); // Limpa nomes
        setRegisteredUser(null);
    }
  }, [isOpen, initialMode, initialRole]);

  const actionCodeSettings = {
    url: 'https://mapadodayuse.com/minhas-viagens',
    handleCodeInApp: true,
  };

  // Helper para garantir que o usuário exista no Firestore
  // Agora aceita um 'specificName' para forçar o nome digitado no cadastro
  const ensureProfile = async (u, specificName = null) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    let userRole = role; 
    
    // Prioriza o nome específico (do form), depois o do Auth, depois o e-mail
    const finalName = specificName || u.displayName || u.email?.split('@')[0] || "Usuário";

    if (snap.exists()) { 
        userRole = snap.data().role || 'user'; 
    } else { 
        await setDoc(ref, { 
            email: u.email || "", 
            name: finalName,
            role: role, 
            photoURL: u.photoURL || "",
            createdAt: new Date() 
        }); 
    }
    return { ...u, role: userRole, displayName: finalName };
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
            // Validação de Nome
            if (!firstName.trim() || !lastName.trim()) {
                throw new Error("Por favor, preencha seu Nome e Sobrenome.");
            }
            const fullName = `${firstName.trim()} ${lastName.trim()}`;

            // 1. Cria Conta
            const res = await createUserWithEmailAndPassword(auth, email, password);
            
            // 2. Atualiza Nome no Auth Profile
            await updateProfile(res.user, { displayName: fullName });

            // 3. Envia E-mail
            try { await sendEmailVerification(res.user, actionCodeSettings); } catch(e){}
            
            // 4. Salva no Banco com o Nome Correto
            const userWithRole = await ensureProfile(res.user, fullName);
            
            setRegisteredUser(userWithRole);
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
        
        if (err.message === "Por favor, preencha seu Nome e Sobrenome.") {
            msg = err.message;
        }
        else if (err.code === 'auth/email-already-in-use') {
            msg = "Este e-mail já possui cadastro. Tente fazer login.";
            if (view === 'register') setView('login');
        }
        else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
            if (view === 'login') {
                title = "Conta não encontrada";
                msg = "Não encontramos uma conta. Criamos um cadastro para você?";
                setView('register');
            } else {
                msg = "E-mail ou senha incorretos.";
            }
        }
        else msg = "Erro: " + err.code;
        
        setFeedback({ type: 'error', title, msg });
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
      e.preventDefault(); setLoading(true); setFeedback(null);
      try {
          await sendPasswordResetEmail(auth, email, actionCodeSettings);
          setFeedback({ type: 'success', title: 'Link Enviado', msg: `Se o e-mail existir, você receberá um link.` });
      } catch (err) { 
          setFeedback({ type: 'error', title: 'Erro', msg: "Não foi possível enviar." });
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

            {/* SUCESSO CADASTRO */}
            {view === 'email_sent' ? (
                <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-teal-50 text-[#0097A8] rounded-full flex items-center justify-center mx-auto mb-2"><Mail size={32}/></div>
                    <div><h3 className="text-lg font-bold text-slate-800">Conta Criada!</h3><p className="text-slate-600 text-sm mt-2">Enviamos um link para <strong>{email}</strong>.</p></div>
                    <Button onClick={() => { if (registeredUser) { onSuccess(registeredUser); if (closeOnSuccess) onClose(); } else { setView('login'); } }} className="w-full mt-4">{role === 'partner' ? 'Ir para o Painel' : 'Fazer Login'}</Button>
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
                            {view === 'register' && role === 'partner' && <p className="text-sm text-slate-500 -mt-2 mb-2">Preencha seus dados para se cadastrar</p>}
                            
                            {/* CAMPOS DE NOME (SÓ NO REGISTRO) */}
                            {view === 'register' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" placeholder="Nome" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
                                    <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" placeholder="Sobrenome" value={lastName} onChange={e=>setLastName(e.target.value)} required />
                                </div>
                            )}

                            <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required />
                            <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} required />
                            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Processando...' : (view === 'login' ? 'Entrar' : 'Cadastrar')}</Button>
                        </form>
                    )}

                    {view === 'forgot' && (
                        <form onSubmit={handleForgot} className="space-y-4">
                            <p className="text-sm text-slate-600">Insira seu e-mail para recuperar.</p>
                            <input className="w-full p-3 border border-slate-300 rounded-xl outline-none" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required/>
                            <Button type="submit" className="w-full" disabled={loading}>Enviar link</Button>
                            <p className="text-center text-xs font-bold underline cursor-pointer mt-4" onClick={()=>setView('login')}>Voltar</p>
                        </form>
                    )}

                    {['login','register'].includes(view) && (
                        <>
                            <div className="flex items-center my-6"><div className="flex-grow border-t border-slate-200"></div><span className="mx-3 text-xs text-slate-400">ou entre com</span><div className="flex-grow border-t border-slate-200"></div></div>
                            <div className="space-y-3">
                                <button onClick={() => handleSocialLogin(googleProvider)} className="w-full border-2 border-slate-100 rounded-xl py-2.5 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-semibold text-slate-600 text-sm"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" /> Continuar com Google</button>
                                <button onClick={() => handleSocialLogin(facebookProvider)} className="w-full border-2 border-slate-100 rounded-xl py-2.5 flex items-center justify-center gap-3 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all font-semibold text-slate-600 text-sm group"><Facebook size={20} className="text-[#1877F2] group-hover:text-white transition-colors" fill="currentColor" /> Continuar com Facebook</button>
                            </div>
                            <div className="mt-4 text-center text-xs text-slate-500">
                                {view==='login' ? <><span onClick={()=>setView('forgot')} className="cursor-pointer hover:underline mr-4">Esqueci a senha</span> <span onClick={()=>{setView('register'); setFeedback(null)}} className="cursor-pointer font-bold text-[#0097A8]">Criar conta</span></> : <span onClick={()=>{setView('login'); setFeedback(null)}} className="cursor-pointer font-bold text-[#0097A8]">Já tenho conta</span>}
                            </div>
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
        "logo": "https://mapadodayuse.com/logo.png",
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
              const q = query(collection(db, "dayuses"));
              const snap = await getDocs(q);
              const fullData = snap.docs.map(d => ({id: d.id, ...d.data()}));
              
              const minifiedData = fullData.map(item => ({
                  id: item.id,
                  name: item.name,
                  city: item.city,
                  state: item.state,
                  image: item.image,
                  priceAdult: item.priceAdult,
                  amenities: item.amenities || [],
                  meals: item.meals || [],
                  petAllowed: item.petAllowed,
                  paused: item.paused
              }));

              setItems(fullData); 

              try {
                  localStorage.setItem('dayuses_min_cache', JSON.stringify(minifiedData));
              } catch (quotaError) {
                  console.warn("Cache cheio, limpando antigo...");
                  localStorage.clear(); 
                  try {
                    localStorage.setItem('dayuses_min_cache', JSON.stringify(minifiedData));
                  } catch (e) {}
              }

          } catch (err) {
              console.error("Erro ao carregar home:", err);
          } finally {
              setLoading(false); 
          }
      };

      loadData();
  }, []);

  // --- HELPER PARA REMOVER ACENTOS ---
  const normalizeText = (text) => {
      return text
        ? text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        : "";
  };

  // Lógica de Filtros por Categoria
  const filterByAmenity = (keywords) => items.filter(i => 
      Array.isArray(i.amenities) && i.amenities.some(a => keywords.some(k => a.toLowerCase().includes(k)))
  );
  
  const activeItems = items; 

  const familyItems = filterByAmenity(['kids', 'infantil', 'playground', 'recreação', 'tobogã', 'monitores']).slice(0, 4);
  const foodItems = activeItems.filter(i => Array.isArray(i.meals) && i.meals.some(m => ['café da manhã', 'almoço', 'jantar', 'buffet'].some(k => m.toLowerCase().includes(k)))).slice(0, 4);
  const petItems = activeItems.filter(i => i.petAllowed).slice(0, 4);
  const heatedPoolItems = filterByAmenity(['aquecida', 'climatizada', 'termal', 'ofurô', 'hidro']).slice(0, 4);

  // BUSCA GERAL (COM NORMALIZAÇÃO DE TEXTO)
  const searchResults = searchTerm 
    ? items.filter(i => {
        const term = normalizeText(searchTerm);
        const name = normalizeText(i.name);
        const city = normalizeText(i.city);
        // Busca tanto no nome do local quanto na cidade
        return name.includes(term) || city.includes(term);
    })
    : [];

  return (
    <div className="pb-20 animate-fade-in min-h-screen bg-white">
      
      {/* HERO SECTION */}
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
                
                {/* 1. FAMÍLIA */}
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

                {/* 2. ALIMENTAÇÃO INCLUSA */}
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

                {/* 3. PET FRIENDLY */}
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

                {/* 4. PISCINA AQUECIDA */}
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

  // States Claim
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [claimData, setClaimData] = useState({ name: '', email: '', phone: '', job: '' });
  
  // State Alerta Validação
  const [showWarning, setShowWarning] = useState(null);

  // State Dependência
  const [parentTicket, setParentTicket] = useState(null);
  const [user, setUser] = useState(auth.currentUser);

  // --- NOVO: State de Disponibilidade ---
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [availableSpots, setAvailableSpots] = useState(null);

  // -------------------------------------

  // 1. Auth Monitor
  useEffect(() => {
      const unsub = onAuthStateChanged(auth, u => setUser(u));
      return unsub;
  }, []);

  // 2. Fetch Item
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
          console.error("Erro detalhes:", error);
      } finally {
          setLoading(false);
      }
    };
    fetchItem();
  }, [slug, idParam, location.state]);

  // 3. Verifica Ticket Pai (Dependência)
  useEffect(() => {
      if (!user || !item || !date) {
          setParentTicket(null);
          return;
      }
      const checkParentTicket = async () => {
          try {
              const q = query(
                  collection(db, "reservations"), 
                  where("userId", "==", user.uid),
                  where("date", "==", date),
                  where("status", "in", ["confirmed", "validated"])
              );
              const snap = await getDocs(q);
              const validParent = snap.docs.find(doc => {
                  const r = doc.data();
                  const rDayUseId = r.item?.id || r.dayuseId;
                  return rDayUseId === item.id && Number(r.adults) > 0;
              });
              if (validParent) setParentTicket(validParent.data());
              else setParentTicket(null);
          } catch (error) { console.error("Erro check parent:", error); }
      };
      checkParentTicket();
  }, [user, item, date]);

  // --- 4. NOVO: VERIFICAÇÃO DE ESTOQUE (GUARDIÃO FRONTEND) ---
useEffect(() => {
      if (!item || !date) {
          setIsSoldOut(false);
          setAvailableSpots(null); // Reseta se não tiver data
          return;
      }

      setCheckingStock(true);

      // 1. Definição do Limite
      let limit = 50;
      if (item.dailyStock) {
          if (typeof item.dailyStock === 'object' && item.dailyStock.adults) {
              limit = Number(item.dailyStock.adults);
          } else if (typeof item.dailyStock === 'string' || typeof item.dailyStock === 'number') {
              limit = Number(item.dailyStock);
          }
      } else if (item.limit) {
          limit = Number(item.limit);
      }

      // 2. Query (Busca por item.id)
      const q = query(
          collection(db, "reservations"),
          where("item.id", "==", item.id), 
          where("date", "==", date),
          where("status", "in", ["confirmed", "validated", "approved", "paid"])
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
          let occupied = 0;
          
          snapshot.forEach((doc) => {
              const data = doc.data();
              const qtdAdults = parseInt(data.adults, 10) || 0;
              const qtdChildren = parseInt(data.children, 10) || 0;
              occupied += (qtdAdults + qtdChildren);
          });

          // [NOVO] Cálculos de disponibilidade
          const remaining = Math.max(0, limit - occupied);
          setAvailableSpots(remaining);

          console.log(`📊 Estoque: ${remaining} vagas restantes de ${limit}`);

          if (occupied >= limit) {
              setIsSoldOut(true);
          } else {
              setIsSoldOut(false);
          }
          
          setCheckingStock(false);
      }, (error) => {
          console.error("❌ Erro no listener:", error);
          setCheckingStock(false);
      });

      return () => unsubscribe();

  }, [date, item]);
  // -----------------------------------------------------------

  // Lógica de Preço (Mantida)
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

  // Helpers de Validação (Mantidos)
  const canAddDependent = () => adults > 0 || !!parentTicket;
  const showDependencyError = (type) => {
      if (!user) setShowWarning({ title: 'Faça Login', msg: `Para comprar ingresso apenas de ${type}, o sistema precisa identificar se você já possui um ingresso de adulto comprado para esta data.` });
      else setShowWarning({ title: 'Ingresso de Adulto Necessário', msg: `Por regras de segurança, menores e pets só podem entrar acompanhados. Selecione 1 Adulto agora OU, se já comprou o seu, certifique-se de estar logado e com a mesma data selecionada.` });
  };

  const seoTitle = item ? `${item.name} | Reserve seu Day Use em ${item.city}` : "Detalhes do Day Use";
  const seoDesc = item ? `Compre seu ingresso para o day use ${item.name} em ${item.city}.` : "Confira detalhes.";
  useSEO(seoTitle, seoDesc, item?.image);
  useSchema(item ? { "@context": "https://schema.org", "@type": "Product", "name": item.name } : null); // Schema simplificado para brevidade

  // Totais
  let childPrice = Number(item?.priceChild || 0);
  let petFee = Number(item?.petFee || 0);
  if (date && item?.weeklyPrices) {
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const dayConfig = item.weeklyPrices[dayOfWeek];
      if (typeof dayConfig === 'object') {
          if (dayConfig.child) childPrice = Number(dayConfig.child);
          if (dayConfig.pet) petFee = Number(dayConfig.pet);
      }
  }
  let specialTotal = 0;
  if (item?.specialTickets) { Object.entries(selectedSpecial).forEach(([idx, qtd]) => { specialTotal += (item.specialTickets[idx].price * qtd); }); }
  const total = (adults * currentPrice) + (children * childPrice) + (pets * petFee) + specialTotal;
  const showPets = item ? (typeof item.petAllowed === 'boolean' ? item.petAllowed : (item.petSize && item.petSize !== 'Não aceita')) : false;

  const handleUpdateSpecial = (idx, delta) => setSelectedSpecial({ ...selectedSpecial, [idx]: Math.max(0, (selectedSpecial[idx] || 0) + delta) });

  const handleBook = () => {
      navigate('/checkout', { 
          state: { 
              bookingData: { 
                  item, date, adults, children, pets, total, freeChildren, selectedSpecial,
                  priceSnapshot: { adult: currentPrice, child: childPrice, pet: petFee },
                  parentTicketId: parentTicket?.id 
              } 
          } 
      });
  };

  const handleClaimSubmit = async (e) => {
      e.preventDefault();
      setClaimLoading(true);
      // Lógica de claim (Simplificada aqui, use a sua completa)
      setClaimLoading(false);
      setShowClaimModal(false);
      setShowClaimSuccess(true);
  };

  // Componente Loading
  if (loading) return <div className="max-w-7xl mx-auto pt-8 px-4 animate-pulse"><div className="h-96 bg-slate-200 rounded-3xl"></div></div>;
  
  if (!item) return <div className="text-center py-20">Item não encontrado</div>;

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
                <div key={related.id} onClick={() => navigate(`/${getStateSlug(related.state)}/${generateSlug(related.name)}`, {state: {id: related.id}})} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-[#0097A8] cursor-pointer bg-slate-50 hover:bg-white group">
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
      
      {showClaimSuccess && createPortal(<SuccessModal isOpen={showClaimSuccess} onClose={() => setShowClaimSuccess(false)} title="Solicitação Enviada!" message="Recebemos seus dados." actionLabel="Entendi" onAction={() => setShowClaimSuccess(false)} />, document.body)}
      {showClaimModal && createPortal(<ModalOverlay onClose={() => setShowClaimModal(false)}><div className="bg-white p-8 rounded-3xl">Formulário Claim</div></ModalOverlay>, document.body)}
      {showWarning && createPortal(<ModalOverlay onClose={() => setShowWarning(null)}><div className="bg-white p-8 rounded-3xl text-center"><AlertCircle className="mx-auto mb-4 text-yellow-500" size={32}/><h2 className="font-bold mb-2">{showWarning.title}</h2><p className="text-sm text-slate-600 mb-4">{showWarning.msg}</p><Button onClick={()=>setShowWarning(null)} className="w-full">Entendi</Button></div></ModalOverlay>, document.body)}

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-8">
            <div><h1 className="text-4xl font-bold text-slate-900 mb-2">{item.name}</h1><p className="flex items-center gap-2 text-slate-500 text-lg"><MapPin size={20} className="text-[#0097A8]"/> {item.city}, {item.state}</p></div>

            <div className="grid grid-cols-4 gap-3 h-[400px] rounded-[2rem] overflow-hidden shadow-lg cursor-pointer group" onClick={()=>setGalleryOpen(true)}>
                <div className="col-span-3 relative h-full">
                    {item.image ? <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/> : <div className="w-full h-full bg-slate-200"/>}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <div className="col-span-1 grid grid-rows-2 gap-3 h-full">
                    <div className="relative overflow-hidden h-full">
                        {item.image2 ? <img src={item.image2} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-100"/>}
                    </div>
                    <div className="relative overflow-hidden h-full">
                        {item.image3 ? <img src={item.image3} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-100"/>}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm hover:bg-black/50 transition-colors">Ver fotos</div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
               <div><h2 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><FileText className="text-[#0097A8]"/> Sobre {item.name}</h2><p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">{item.description}</p></div>
               {item.videoUrl && (<div className="rounded-2xl overflow-hidden shadow-md aspect-video"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}`} title="Video" frameBorder="0" allowFullScreen></iframe></div>)}
               
               <div>
                   <h2 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><CheckCircle className="text-[#0097A8]"/> O que está incluso?</h2>
                   {item.amenities && (<div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 mb-6">{item.amenities.flatMap(a=>a.split(',')).map((a,i)=>(<div key={i} className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-[#0097A8]"></div><span className="capitalize">{a.trim()}</span></div>))}</div>)}
                   
                   <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4">
                       <div className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Alimentação</div>
                       {item.meals && item.meals.length > 0 ? (<div className="flex flex-wrap gap-2">{item.meals.map(m => (<span key={m} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-orange-700 border border-orange-200">{m}</span>))}</div>) : <p className="text-sm text-slate-500 italic">Não incluso.</p>}
                   </div>

                   {item.allowFood !== undefined && (
                       <div className={`p-4 rounded-2xl border flex items-start gap-3 ${item.allowFood ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                           {item.allowFood ? <CheckCircle size={24} className="text-green-600 mt-0.5 shrink-0"/> : <Ban size={24} className="text-red-600 mt-0.5 shrink-0"/>}
                           <div><h4 className={`font-bold text-sm mb-1 ${item.allowFood ? 'text-green-800' : 'text-red-800'}`}>{item.allowFood ? "Pode levar comida/bebida" : "Proibido levar comida/bebida"}</h4><p className={`text-xs opacity-90 ${item.allowFood ? 'text-green-700' : 'text-red-700'}`}>{item.allowFood ? "Consumo próprio liberado." : "O local possui restaurante/bar."}</p></div>
                       </div>
                   )}
               </div>

               <div className="pt-4 border-t border-slate-100">
                   <h2 className="font-bold text-red-500 mb-2 flex items-center gap-2 text-lg"><Ban size={18}/> Não incluso</h2>
                   <p className="text-slate-600 text-sm whitespace-pre-line">{item.notIncludedItems || "Nada específico."}</p>
               </div>
               
               <Accordion title="Regras" icon={Info}><p className="text-slate-600 text-sm whitespace-pre-line">{item.usageRules || "Sem regras."}</p></Accordion>
               <Accordion title="Cancelamento" icon={AlertCircle}><p className="text-slate-600 text-sm whitespace-pre-line">{item.cancellationPolicy || "Consulte."}</p></Accordion>
            </div>
         </div>
         
         <div className="lg:col-span-1 h-fit sticky top-24">
            {item.paused ? <PausedMessage /> : (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-8">
                   <div className="flex justify-between items-end border-b border-slate-100 pb-6"><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{date ? "Preço para a data" : "A partir de"}</p><span className="text-3xl font-bold text-[#0097A8]">{formatBRL(currentPrice)}</span><span className="text-slate-400 text-sm"> / adulto</span></div></div>
                   
                   {/* --- SELEÇÃO DE DATA --- */}
   <div>
       <label className="text-sm font-bold text-slate-700 mb-3 block flex items-center gap-2">
           <CalendarIcon size={16} className="text-[#0097A8]"/> Escolha uma data
       </label>
       
       <SimpleCalendar 
           availableDays={item.availableDays} 
           blockedDates={item.blockedDates || []} 
           prices={item.weeklyPrices || {}} 
           basePrice={Number(item.priceAdult)} 
           onDateSelect={setDate} 
           selectedDate={date} 
       />

       {/* --- ELEMENTO INTELIGENTE DE DATA/ESCASSEZ --- */}
       {date && (
           <div className="mt-3 transition-all duration-300 animate-fade-in">
               {checkingStock ? (
                   <div className="bg-slate-100 text-slate-500 text-xs font-bold py-3 rounded-xl text-center border border-slate-200 flex items-center justify-center gap-2">
                       <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                       Verificando disponibilidade...
                   </div>
               ) : isSoldOut ? (
                   // CARD VERMELHO: ESGOTADO
                   <div className="bg-red-50 text-red-700 text-xs font-bold py-3 px-4 rounded-xl text-center border border-red-200 shadow-sm flex flex-col items-center gap-1">
                       <span className="flex items-center gap-1 uppercase tracking-wide"><Ban size={14}/> Esgotado</span>
                       <span className="font-normal text-red-600">Não há mais ingressos para {date.split('-').reverse().join('/')}</span>
                   </div>
               ) : availableSpots !== null && availableSpots <= 20 ? (
                   // CARD AMARELO/LARANJA: URGÊNCIA (Menos de 20)
                   <div className="bg-orange-50 text-orange-800 text-xs font-bold py-3 px-4 rounded-xl text-center border border-orange-200 shadow-sm flex flex-col items-center gap-1 animate-pulse">
                       <span className="flex items-center gap-1 uppercase tracking-wide">🔥 Alta Procura!</span>
                       <span className="font-normal text-orange-700">
                           Data {date.split('-').reverse().join('/')} — <strong>Restam apenas {availableSpots} ingressos!</strong>
                       </span>
                   </div>
               ) : (
                   // CARD VERDE/AZUL: DISPONÍVEL (Normal)
                   <div className="bg-cyan-50 text-[#0097A8] text-xs font-bold py-3 px-4 rounded-xl text-center border border-cyan-100 flex flex-col items-center gap-1">
                       <span className="flex items-center gap-1 uppercase tracking-wide"><CheckCircle size={14}/> Disponível</span>
                       <span className="font-normal text-cyan-700">Data selecionada: {date.split('-').reverse().join('/')}</span>
                   </div>
               )}
           </div>
       )}
   </div>

                   <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {parentTicket && adults === 0 && (<div className="bg-green-100 border border-green-200 text-green-800 text-xs p-3 rounded-xl flex items-start gap-2 mb-2"><CheckCircle size={16} className="mt-0.5 shrink-0"/><div><strong>Vínculo Detectado:</strong> Reserva #{parentTicket.paymentId?.slice(-6) || 'ANTIGA'} encontrada.</div></div>)}
                      
                      <div className="flex justify-between items-center"><div><span className="text-sm font-medium text-slate-700 block">Adultos</span><span className="text-xs text-slate-400 block">{item.adultAgeStart ? `> ${item.adultAgeStart} anos` : 'Padrão'}</span><span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(currentPrice)}</span></div><div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>{const newVal = Math.max(0, adults-1); setAdults(newVal); if(newVal === 0 && !parentTicket) { setChildren(0); setPets(0); setFreeChildren(0); }}}>-</button><span className="font-bold text-slate-900 w-4 text-center">{adults}</span><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setAdults(adults+1)}>+</button></div></div>
                      
                      <div className="flex justify-between items-center"><div><span className="text-sm font-medium text-slate-700 block">Crianças</span><span className="text-xs text-slate-400 block">{item.childAgeStart && item.childAgeEnd ? `${item.childAgeStart}-${item.childAgeEnd} anos` : 'Meia'}</span><span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(childPrice)}</span></div><div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setChildren(Math.max(0, children-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{children}</span><button className={`w-6 h-6 flex items-center justify-center font-bold rounded ${canAddDependent() ? 'text-[#0097A8] hover:bg-cyan-50' : 'text-slate-300 cursor-not-allowed'}`} onClick={() => canAddDependent() ? setChildren(children+1) : showDependencyError('crianças')}>+</button></div></div>
                      
                      {showPets && (<div className="flex justify-between items-center"><div><span className="text-sm font-medium text-slate-700 flex items-center gap-1"><PawPrint size={14}/> Pets</span><span className="text-xs text-slate-400 block">{item.petSize || 'Permitido'}</span><span className="text-xs font-bold text-[#0097A8] block mt-0.5">{formatBRL(petFee)}</span></div><div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-[#0097A8] font-bold hover:bg-cyan-50 rounded" onClick={()=>setPets(Math.max(0, pets-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{pets}</span><button className={`w-6 h-6 flex items-center justify-center font-bold rounded ${canAddDependent() ? 'text-[#0097A8] hover:bg-cyan-50' : 'text-slate-300 cursor-not-allowed'}`} onClick={() => canAddDependent() ? setPets(pets+1) : showDependencyError('pets')}>+</button></div></div>)}
                      
                      {item.trackFreeChildren && (<div className="flex justify-between items-center pt-2 border-t border-slate-200"><div><span className="text-sm font-bold text-green-700 block">Crianças Grátis</span><span className="text-xs text-slate-400">{item.gratuitousness || "Isentas"}</span></div><div className="flex items-center gap-3 bg-green-50 px-2 py-1 rounded-lg border border-green-100 shadow-sm"><button className="w-6 h-6 flex items-center justify-center text-green-700 font-bold" onClick={()=>setFreeChildren(Math.max(0, freeChildren-1))}>-</button><span className="font-bold text-slate-900 w-4 text-center">{freeChildren}</span><button className={`w-6 h-6 flex items-center justify-center font-bold rounded ${canAddDependent() ? 'text-green-700 hover:bg-green-100' : 'text-green-300 cursor-not-allowed'}`} onClick={() => canAddDependent() ? setFreeChildren(freeChildren+1) : showDependencyError('crianças')}>+</button></div></div>)}
                   </div>

                   <div className="pt-4 border-t border-dashed border-slate-200">
                      <div className="flex justify-between items-center mb-6"><span className="text-slate-600 font-medium">Total Estimado</span><span className="text-2xl font-bold text-slate-900">{formatBRL(total)}</span></div>
                      
                      {/* BOTÃO DE RESERVA (COM TRAVA DE ESGOTADO) */}
                      {isSoldOut ? (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                              <p className="text-red-700 font-bold mb-1">Esgotado para esta data</p>
                              <p className="text-xs text-red-500">Por favor, escolha outro dia no calendário acima.</p>
                          </div>
                      ) : (
                          <Button 
                              className="w-full py-4 text-lg" 
                              disabled={!date || checkingStock || total === 0} 
                              onClick={handleBook}
                          >
                              {checkingStock ? 'Verificando vagas...' : 'Reservar'}
                          </Button>
                      )}
                      
                      <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1"><Lock size={10}/> Compra segura</p>
                   </div>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

// --- DICIONÁRIO DE ERROS AMIGÁVEIS ---
const translateError = (code) => {
    const errors = {
        'cc_rejected_call_for_authorize': {
            title: 'Autorização Necessária',
            msg: 'O banco emissor do cartão bloqueou a compra por segurança. Ligue para o banco para autorizar e tente novamente.'
        },
        'cc_rejected_insufficient_amount': {
            title: 'Saldo Insuficiente',
            msg: 'O cartão não possui limite suficiente para esta compra. Por favor, tente outro cartão.'
        },
        'cc_rejected_bad_filled_security_code': {
            title: 'Código de Segurança Inválido',
            msg: 'O CVV (3 dígitos atrás do cartão) está incorreto. Verifique e tente novamente.'
        },
        'cc_rejected_bad_filled_date': {
            title: 'Data de Validade Inválida',
            msg: 'A data de validade está incorreta ou o cartão está expirado.'
        },
        'cc_rejected_bad_filled_other': {
            title: 'Erro nos Dados',
            msg: 'Verifique se o número, nome e validade foram digitados corretamente.'
        },
        'cc_rejected_other_reason': {
            title: 'Cartão Recusado',
            msg: 'O pagamento foi recusado pelo banco emissor. Tente usar outro cartão.'
        },
        'cc_rejected_blacklist': {
            title: 'Pagamento Recusado',
            msg: 'Não foi possível processar este cartão.'
        }
    };

    return errors[code] || { 
        title: 'Pagamento não Realizado', 
        msg: 'Houve um problema ao processar o pagamento. Verifique os dados ou tente outro meio.' 
    };
};

const sanitizeForFirestore = (obj) => {
    const cleanObj = { ...obj };
    Object.keys(cleanObj).forEach(key => {
        if (cleanObj[key] === undefined) {
            cleanObj[key] = null; // Troca undefined por null
        }
    });
    return cleanObj;
};

// -----------------------------------------------------------------------------
// CHECKOUT PAGE (FRONTEND MP SDK + SAVING TO FIRESTORE)
// -----------------------------------------------------------------------------
const CheckoutPage = () => {
  try { useSEO("Pagamento", "Finalize sua reserva.", true); } catch(e) {}

  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData } = location.state || {};
  
  const [user, setUser] = useState(auth.currentUser);
  const [showLogin, setShowLogin] = useState(false);
  const [initialAuthMode, setInitialAuthMode] = useState('login'); 
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Feedback
  const [errorData, setErrorData] = useState(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [currentReservationId, setCurrentReservationId] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);

  // Valores
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(bookingData?.total || 0);
  const [couponMsg, setCouponMsg] = useState(null);

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState('card'); 
  const [cardName, setCardName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [installments, setInstallments] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  // 🌟 Qualidade MP
  const [mpPaymentMethodId, setMpPaymentMethodId] = useState('');
  const [issuerId, setIssuerId] = useState(null);
  const [isCardReady, setIsCardReady] = useState(false);
  const cardFormMounted = useRef(false);
  const changeMethod = (method) => {
      setPaymentMethod(method);
      if (method === 'pix') {
          cardFormMounted.current = false; // Reseta para poder montar o cartão de novo se o usuário voltar
      }
  };

  // ============================================================
  // SISTEMA DE NOTIFICAÇÃO (Embutido)
  // ============================================================
  
  const notifyCustomer = async (reservationData, reservationId) => {
      try {
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${reservationId}`;
          let rulesHtml = reservationData.item.allowFood === false 
             ? `<div style="background:#fef2f2;color:#991b1b;padding:15px;border-radius:8px;margin:20px 0;">🚫 <strong>Proibida entrada de alimentos/bebidas</strong></div>`
             : `<div style="background:#f0fdf4;color:#166534;padding:15px;border-radius:8px;margin:20px 0;">✅ <strong>Entrada de alimentos permitida</strong></div>`;

          const emailHtml = `
            <div style="font-family:sans-serif;background:#f3f4f6;padding:40px 0;">
                <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
                    <div style="background:#0097A8;padding:30px;text-align:center;">
                        <h1 style="color:white;margin:0;">Voucher Confirmado</h1>
                        <p style="color:#e0f2fe;margin:5px 0;">Apresente na portaria</p>
                    </div>
                    <div style="padding:30px;">
                        <h2 style="text-align:center;color:#0f172a;">${reservationData.item.name}</h2>
                        <div style="text-align:center;background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;">
                            <img src="${qrCodeUrl}" width="150" />
                            <p style="font-size:24px;font-weight:bold;margin:10px 0;">${reservationId.slice(0,6).toUpperCase()}</p>
                        </div>
                        <p><strong>Titular:</strong> ${reservationData.guestName}</p>
                        <p><strong>Pago:</strong> ${formatBRL(reservationData.total)}</p>
                        ${rulesHtml}
                        <center><a href="https://mapadodayuse.com/minhas-viagens" style="background:#0097A8;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Ver Voucher Completo</a></center>
                    </div>
                </div>
            </div>`;

          await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: reservationData.guestEmail, subject: `Voucher: ${reservationData.item.name}`, html: emailHtml })
          });
      } catch (e) { console.error("Erro email cliente:", e); }
  };

  const notifyPartner = async (reservationData, paymentId) => {
      try {
          const ownerSnap = await getDoc(doc(db, "users", reservationData.ownerId));
          if (!ownerSnap.exists()) return;
          
          const emailHtml = `
            <div style="font-family:sans-serif;padding:20px;">
                <h2 style="color:#0097A8;">Nova Venda! 🚀</h2>
                <p>Reserva para <strong>${reservationData.item.name}</strong>.</p>
                <div style="background:#e0f7fa;padding:20px;border-radius:8px;">
                    <p style="font-size:32px;font-weight:bold;color:#0097A8;margin:0;">${formatBRL(reservationData.total)}</p>
                </div>
                <ul><li>Cliente: ${reservationData.guestName}</li><li>Data: ${reservationData.date}</li></ul>
            </div>`;

          await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: ownerSnap.data().email, subject: `Nova Venda: ${formatBRL(reservationData.total)}`, html: emailHtml })
          });
      } catch (e) { console.error("Erro email parceiro:", e); }
  };

  // ============================================================
  // LOGICA MP E CHECKOUT
  // ============================================================

  const guessPaymentMethod = (number) => {
    const cleanNum = number.replace(/\D/g, '');
    if (/^4/.test(cleanNum)) return 'visa';
    if (/^5/.test(cleanNum)) return 'master'; 
    return 'visa';
  };

  useEffect(() => {
    if(!bookingData) { navigate('/'); return; }
    
    const initMP = async () => {
        // 🌟 CORREÇÃO 3: Previne erro de "Duplicate Import"
        if (cardFormMounted.current) return; 

        try {
            // Só carrega o script se ele ainda não existir na janela
            if (!window.MercadoPago) {
                await loadMercadoPago(); 
            }
            
            const mpKey = import.meta.env.VITE_MP_PUBLIC_KEY_TEST; 
            
            if (window.MercadoPago && mpKey) {
                // Cria a instância apenas se não existir
                if (!window.mpInstance) {
                    window.mpInstance = new window.MercadoPago(mpKey);
                    console.log("✅ SDK V2 Inicializado");
                }

                // Só monta os campos se o método for cartão
                if (paymentMethod === 'card') {
                    mountSecureFields(window.mpInstance);
                }
            }
        } catch (e) { console.error("Erro SDK:", e); }
    };
    
    initMP();
    
    // Limpeza ao sair da página
    return () => { 
        cardFormMounted.current = false; 
    };
  }, [bookingData, navigate, paymentMethod]);

  const mountSecureFields = (mp) => {
      try {
          if (cardFormMounted.current) return;
          
          console.log("🔒 Montando Secure Fields...");
          const style = { color: '#1e293b', fontSize: '14px', fontFamily: 'sans-serif', placeholderColor: '#94a3b8' };

          // Cria campos seguros
          const cardNumberElement = mp.fields.create('cardNumber', { placeholder: "0000 0000 0000 0000", style });
          const expirationDateElement = mp.fields.create('expirationDate', { placeholder: "MM/YY", style });
          const securityCodeElement = mp.fields.create('securityCode', { placeholder: "123", style });

          // Monta nos IDs (iframes)
          cardNumberElement.mount('form-checkout__cardNumber');
          expirationDateElement.mount('form-checkout__expirationDate');
          securityCodeElement.mount('form-checkout__securityCode');

          cardFormMounted.current = true;

          // Listener de Bin para qualidade
          cardNumberElement.on('binChange', async (data) => {
              const { bin } = data;
              if (bin) {
                  const { results } = await mp.getPaymentMethods({ bin });
                  if (results && results[0]) {
                      setMpPaymentMethodId(results[0].id);
                      setIssuerId(results[0].issuer.id);
                  }
              }
          });
      } catch (e) { console.warn("Campos já montados ou erro de mount:", e); }
  };
    

  useEffect(() => {
      return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  const handleApplyCoupon = () => {
      setCouponMsg(null); 
      if (!bookingData.item.coupons?.length) { 
          setCouponMsg({ type: 'error', text: "Sem cupons." }); return; 
      }
      const found = bookingData.item.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
      if(found) {
        const val = (bookingData.total * found.percentage) / 100;
        setDiscount(val);
        setFinalTotal(bookingData.total - val);
        setCouponMsg({ type: 'success', text: `Cupom ${found.code}: ${found.percentage}% OFF` });
      } else {
        setDiscount(0);
        setFinalTotal(bookingData.total);
        setCouponMsg({ type: 'error', text: "Cupom inválido." });
      }
  };

  const handleResendVerification = async () => {
      if (!user) return;
      setResendLoading(true);
      try {
          await sendEmailVerification(user, { url: window.location.href, handleCodeInApp: true });
          alert(`E-mail enviado!`);
      } catch (e) { alert("Erro ao enviar."); } 
      finally { setResendLoading(false); }
  };

  // 🌟 Qualidade MP: Secure Fields simulation & Issuer ID
  const handleCardNumberChange = async (e) => {
    const val = e.target.value;
    setCardNumber(val);
    const cleanVal = val.replace(/\s/g, '');

    if (cleanVal.length >= 6 && window.mpInstance) {
        try {
            const bin = cleanVal.substring(0, 6);
            const methods = await window.mpInstance.getPaymentMethods({ bin });
            if (methods?.results?.length > 0) {
                const pm = methods.results[0];
                setMpPaymentMethodId(pm.id); 
                setIssuerId(pm.issuer.id);
            }
        } catch (err) {}
    }
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length > 2) val = `${val.slice(0, 2)}/${val.slice(2)}`;
    setCardExpiry(val);
  };

  // --- PROCESSAMENTO ---
  const processPayment = async () => {
     if (!user) { setShowLogin(true); return; }
     
     const cleanDoc = (docNumber || "").replace(/\D/g, ''); 
     if (cleanDoc.length < 11) { alert("CPF Inválido"); return; }
     
     setProcessing(true);

     const email = user.email || "cliente@mapadodayuse.com";
     const firstName = user.displayName ? user.displayName.split(' ')[0] : "Cliente";
     const lastName = user.displayName ? user.displayName.split(' ').slice(1).join(' ') : "Sobrenome";

     // Variáveis para escopo de erro
     let reservationIdRef = null;

     try {
       // 1. Cria Reserva no Firestore (Status Waiting)
       const rawRes = {
         ...bookingData, 
         total: Number(finalTotal.toFixed(2)), discount, couponCode: couponCode || null, paymentMethod,
         status: 'waiting_payment', userId: user.uid, ownerId: bookingData.item.ownerId,
         createdAt: new Date(), guestName: firstName, guestEmail: email, mpStatus: 'pending',
         parentTicketId: bookingData.parentTicketId || null
       };
       
       const reservationData = sanitizeForFirestore(rawRes);
       const docRef = await addDoc(collection(db, "reservations"), reservationData);
       reservationIdRef = docRef.id;
       setCurrentReservationId(reservationIdRef); // Salva no state para uso no Pix se necessário

       // 2. Prepara Payload do MP
       const safeId = bookingData.item.id || bookingData.item.dayuseId;
       const paymentPayload = {
           token: null, transaction_amount: Number(finalTotal.toFixed(2)),
           payment_method_id: paymentMethod === 'pix' ? 'pix' : (mpPaymentMethodId || 'credit_card'),
           issuer_id: issuerId ? Number(issuerId) : null, installments: Number(installments),
           payer: { email, first_name: firstName, last_name: lastName, identification: { type: 'CPF', number: cleanDoc } },
           bookingDetails: { dayuseId: safeId, item: { id: safeId }, date: bookingData.date, total: finalTotal, adults: bookingData.adults, children: bookingData.children, pets: bookingData.pets, selectedSpecial: bookingData.selectedSpecial, couponCode },
           reservationId: reservationIdRef 
       };

       // 3. Tokenização Cartão (Se aplicável)
       if (paymentMethod === 'card') {
           if (!window.mpInstance) throw new Error("Sistema de pagamento carregando...");
           const tokenObj = await window.mpInstance.fields.createCardToken({
               cardholderName: cardName,
               identificationType: 'CPF',
               identificationNumber: cleanDoc
           });
           paymentPayload.token = tokenObj.id; 
       }

       // 4. Processa Pagamento (Backend)
       const response = await fetch("/api/process-payment", { 
         method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(paymentPayload) 
       });
       const result = await response.json();

       // 5. Trata Falha ou Rejeição
       if (!response.ok || result.status === 'rejected' || result.status === 'cancelled') {
           const status = (response.status === 409) ? 'cancelled_sold_out' : 'failed_payment';
           
           // Atualiza o doc criado para falha
           await updateDoc(doc(db, "reservations", reservationIdRef), { status });
           
           if (status === 'cancelled_sold_out') setIsSoldOut(true);
           else setErrorData({ title: "Pagamento não aprovado", msg: result.message || "Verifique os dados do cartão." });
           
           setProcessing(false);
           return; 
       }

       // 6. SUCESSO! (Pix ou Cartão Aprovado)
       if (paymentMethod === 'pix' && result.point_of_interaction) {
           setPixData(result.point_of_interaction.transaction_data);
           setShowPixModal(true); 
            setProcessing(false);
       } 
       else if (result.status === 'approved' || result.status === 'confirmed') {
           
            // A. Atualiza State Visual IMEDIATAMENTE (UX Rápida)
           setProcessing(false);
           setShowSuccess(true); 

            // B. Atualiza Firestore (opcional se seu webhook já faz isso, mas bom garantir)
            // Não usamos await aqui para não travar, ou usamos se for muito rápido.
            // O ideal é confiar no retorno do backend, mas vamos atualizar o objeto local:
           const finalData = { ...reservationData, paymentId: result.id, status: result.status };

            // C. Dispara e-mails em SEGUNDO PLANO (Sem await)
            // Isso garante que se o email falhar, o cliente ainda vê o sucesso da compra.
           notifyCustomer(finalData, reservationIdRef)
                .catch(err => console.error("⚠️ Falha silenciada envio email cliente:", err));
                
           notifyPartner(finalData, result.id)
                .catch(err => console.error("⚠️ Falha silenciada envio email parceiro:", err));
       } else {
            // Status pendente (ex: análise manual)
            setProcessing(false);
            alert("Pagamento em análise. Você receberá um e-mail em breve.");
            navigate('/minhas-viagens');
       }

     } catch (err) {
        console.error("Erro Checkout Crítico:", err);
        setErrorData({ title: "Erro de Comunicação", msg: "Não foi possível processar. Se cobrou, entre em contato." });
        setProcessing(false);
     }
  };

  // --- RENDER ---
  return (
    <div className="max-w-6xl mx-auto pt-8 pb-20 px-4 animate-fade-in relative z-0">
      
      {/* MODAIS */}
      {showSuccess && <SuccessModal isOpen={showSuccess} onClose={()=>setShowSuccess(false)} title="Reserva Confirmada!" message="Seu voucher foi enviado por e-mail." onAction={()=>navigate('/minhas-viagens')} actionLabel="Ver Ingressos" />}
      {isSoldOut && <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"><div className="bg-white p-8 rounded-3xl text-center"><h3 className="font-bold text-red-600 text-xl">Esgotado!</h3><Button onClick={handleSoldOutReturn} className="w-full mt-4">Voltar</Button></div></div>}
      {errorData && <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"><div className="bg-white p-8 rounded-3xl text-center max-w-sm"><h3 className="text-lg font-bold text-red-600 mb-2">{errorData.title}</h3><p className="mb-4">{errorData.msg}</p><button onClick={()=>setErrorData(null)} className="w-full bg-slate-100 py-2 rounded mt-4">OK</button></div></div>}
      {showPixModal && <PixModal isOpen={showPixModal} onClose={()=>setShowPixModal(false)} pixData={pixData} onConfirm={()=>navigate('/minhas-viagens')} paymentId={currentReservationId} ownerId={bookingData.item.ownerId} />}
      {showLogin && <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={()=>setShowLogin(false)} initialMode={initialAuthMode} />}
      
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 text-slate-500 hover:text-[#0097A8] font-medium"><ChevronLeft size={16}/> Voltar</button>
      
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900"><User className="text-[#0097A8]"/> Seus Dados</h3>
            {user ? (
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold">{user.displayName}</p><p className="text-sm">{user.email}</p>
                  <div className="mt-3 text-xs font-bold text-green-600 bg-green-100 w-fit px-3 py-1 rounded-full"><Lock size={10}/> Identidade Confirmada</div>
               </div>
            ) : (
               <div className="text-center py-8"><Button onClick={()=>{ setInitialAuthMode('register'); setShowLogin(true); }} className="w-full">Criar Conta</Button><button onClick={()=>{ setInitialAuthMode('login'); setShowLogin(true); }} className="mt-4 text-sm font-bold text-[#0097A8] hover:underline">Já tenho conta</button></div>
            )}
          </div>
          
          <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-8 ${!user ? 'opacity-50 pointer-events-none grayscale':''}`}>
             <h3 className="font-bold text-xl mb-4 text-slate-900">Pagamento Seguro</h3>
             <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                 <button 
                    onClick={() => changeMethod('card')} // <--- USE A FUNÇÃO changeMethod
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'card' ? 'bg-white shadow text-[#0097A8]' : 'text-slate-500'}`}
                 >
                    Cartão de Crédito
                 </button>
                 
                 <button 
                    onClick={() => changeMethod('pix')} // <--- USE A FUNÇÃO changeMethod
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'pix' ? 'bg-white shadow text-[#0097A8]' : 'text-slate-500'}`}
                 >
                    Pix
                 </button>
             </div>

             {paymentMethod === 'card' ? (
               <div className="space-y-4 animate-fade-in">
                 
                 {/* 🔒 SECURE FIELDS (IFRAMES) */}
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Número do Cartão</label>
                    <div id="form-checkout__cardNumber" className="w-full border p-3 rounded-lg mt-1 h-12 bg-white flex items-center"></div>
                    {mpPaymentMethodId && <p className="text-xs text-green-600 mt-1 font-bold">✅ Bandeira: {mpPaymentMethodId.toUpperCase()}</p>}
                 </div>

                 {/* Nome (Input Normal) */}
                 <div><label className="text-xs font-bold text-slate-500 uppercase">Nome no Cartão</label><input className="w-full border p-3 rounded-lg mt-1" value={cardName} onChange={e=>setCardName(e.target.value)} placeholder="Igual no cartão"/></div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   {/* 🔒 Validade */}
                   <div><label className="text-xs font-bold text-slate-500 uppercase">Validade</label><div id="form-checkout__expirationDate" className="w-full border p-3 rounded-lg mt-1 h-12 bg-white flex items-center"></div></div>
                   {/* 🔒 CVV */}
                   <div><label className="text-xs font-bold text-slate-500 uppercase">CVV</label><div id="form-checkout__securityCode" className="w-full border p-3 rounded-lg mt-1 h-12 bg-white flex items-center"></div></div>
                 </div>

                 <div><label className="text-xs font-bold text-slate-500 uppercase">CPF Titular</label><input className="w-full border p-3 rounded-lg mt-1" placeholder="000.000.000-00" value={docNumber} onChange={e=>setDocNumber(e.target.value)}/></div>
                 
                 <div><label className="text-xs font-bold text-slate-500 uppercase">Parcelas</label><select className="w-full border p-3 rounded-lg mt-1 bg-white" value={installments} onChange={e=>setInstallments(e.target.value)}><option value={1}>1x de {formatBRL(finalTotal)}</option><option value={2}>2x de {formatBRL(finalTotal/2)}</option><option value={3}>3x de {formatBRL(finalTotal/3)}</option></select></div>
               </div>
             ) : (
               <div className="text-center py-6 animate-fade-in"><QrCode size={40} className="mx-auto text-[#0097A8]"/><p className="text-sm mt-4 text-slate-600">Gera código Pix.</p><div className="text-left mt-4"><label className="text-xs font-bold text-slate-500 uppercase">CPF Pagador</label><input className="w-full border p-3 rounded-lg mt-1" value={docNumber} onChange={e=>setDocNumber(e.target.value)}/></div></div>
             )}
             
             <div className="mt-6"><Button className="w-full py-4 text-lg" onClick={processPayment} disabled={processing}>{processing ? 'Processando...' : `Confirmar (${formatBRL(finalTotal)})`}</Button></div>
             <p className="text-center text-xs text-slate-400 mt-3 flex justify-center items-center gap-1"><Lock size={10}/> Ambiente PCI Seguro</p>
          </div>
        </div>

        {/* Resumo */}
        <div>
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl sticky top-24">
              <h3 className="font-bold text-xl text-slate-900">{bookingData.item.name}</h3>
              <p className="text-sm text-slate-500 mb-6">{bookingData.date.split('-').reverse().join('/')}</p>
              <div className="space-y-3 text-sm text-slate-600 border-t pt-4">
                  <div className="flex justify-between"><span>Adultos ({bookingData.adults})</span><b>{formatBRL(bookingData.adults * bookingData.priceSnapshot.adult)}</b></div>
                  {bookingData.children > 0 && <div className="flex justify-between"><span>Crianças ({bookingData.children})</span><b>{formatBRL(bookingData.children * bookingData.priceSnapshot.child)}</b></div>}
                  {bookingData.pets > 0 && <div className="flex justify-between"><span>Pets ({bookingData.pets})</span><b>{formatBRL(bookingData.pets * bookingData.priceSnapshot.pet)}</b></div>}
                  {bookingData.freeChildren > 0 && (<div className="flex justify-between text-green-600 font-bold text-xs"><span>Crianças Grátis</span><span>R$ 0,00</span></div>)}
                  {bookingData.selectedSpecial && Object.entries(bookingData.selectedSpecial).map(([idx, qtd]) => { const ticket = bookingData.item?.specialTickets?.[idx]; if(qtd > 0 && ticket) { return ( <div key={idx} className="flex justify-between text-blue-600 text-xs"><span>{ticket.name} ({qtd})</span><b>{formatBRL(ticket.price * qtd)}</b></div> ) } return null; })}
                  {discount > 0 && (<div className="flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded"><span>Desconto</span><span>- {formatBRL(discount)}</span></div>)}
                  <div className="flex gap-2 pt-2"><input className="border p-2 rounded-lg flex-1 text-xs uppercase" placeholder="CUPOM" value={couponCode} onChange={e=>setCouponCode(e.target.value)} /><button onClick={handleApplyCoupon} className="bg-slate-200 px-4 rounded-lg text-xs font-bold hover:bg-slate-300">Aplicar</button></div>
                  {couponMsg && (<div className={`text-xs p-2 rounded text-center font-medium mt-1 ${couponMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{couponMsg.text}</div>)}
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
// --- FORMATADORES ---
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try { return dateStr.split('-').reverse().join('/'); } catch (e) { return dateStr; }
};

// --- COMPONENTE DE URGÊNCIA ---
const StockIndicator = ({ dayuseId, date, currentReservationId }) => {
    const [stock, setStock] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStock = async () => {
            try {
                const dayUseSnap = await getDoc(doc(db, "dayuses", dayuseId));
                if (!dayUseSnap.exists()) return;
                const item = dayUseSnap.data();

                let limit = 50;
                if (item.dailyStock) {
                    if (typeof item.dailyStock === 'object' && item.dailyStock.adults) limit = Number(item.dailyStock.adults);
                    else if (typeof item.dailyStock === 'string') limit = Number(item.dailyStock);
                } else if (item.limit) limit = Number(item.limit);

                const q = query(
                    collection(db, "reservations"),
                    where("item.id", "==", dayuseId),
                    where("date", "==", date),
                    where("status", "in", ["confirmed", "validated", "approved", "paid"])
                );
                
                const snapshot = await getDocs(q);
                let occupied = 0;
                snapshot.forEach(d => {
                    if (d.id !== currentReservationId) {
                        occupied += (Number(d.data().adults || 0) + Number(d.data().children || 0));
                    }
                });

                setStock(Math.max(0, limit - occupied));
            } catch (e) {
                console.error("Erro stock:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStock();
    }, [dayuseId, date]);

    if (loading) return <span className="text-xs text-slate-400 animate-pulse">Verificando vagas...</span>;
    if (stock === 0) return <span className="text-xs font-bold text-red-600 flex items-center gap-1"><XCircle size={12}/> Vagas Esgotadas!</span>;
    if (stock <= 5) return <span className="text-xs font-bold text-orange-600 flex items-center gap-1 animate-pulse"><Flame size={12}/> Corra! Restam só {stock} vagas</span>;
    return <span className="text-xs font-medium text-green-600 flex items-center gap-1"><CheckCircle size={12}/> Vagas disponíveis ({stock})</span>;
};

// --- COMPONENTE PRINCIPAL ---
const UserDashboard = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const clearFilters = () => {
      setSearchTerm('');
      setFilterDate('');
      setFilterStatus('all');
  };

  const hasActiveFilters = searchTerm || filterDate || filterStatus !== 'all';

  useEffect(() => {
     const unsub = onAuthStateChanged(auth, u => {
        if(u) {
           setUser(u);
           const q = query(collection(db, "reservations"), where("userId", "==", u.uid));
           
           getDocs(q)
             .then(s => {
                 const data = s.docs.map(d => ({id: d.id, ...d.data()}));
                 data.sort((a, b) => {
                     const dateA = a.createdAt?.seconds || a.date;
                     const dateB = b.createdAt?.seconds || b.date;
                     return dateA > dateB ? -1 : 1; 
                 });
                 setTrips(data);
             })
             .catch(err => console.error("Erro ao buscar ingressos:", err))
             .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
     });
     return unsub;
  }, []);

  // Navegar para Checkout (Recuperação)
  const handleResumePayment = (trip) => {
      const bookingData = {
          item: trip.item,
          date: trip.date,
          adults: trip.adults,
          children: trip.children,
          pets: trip.pets,
          selectedSpecial: trip.selectedSpecial || {},
          priceSnapshot: trip.priceSnapshot || {},
          total: trip.total,
          couponCode: trip.couponCode,
          dayuseId: trip.item?.id || trip.dayuseId
      };
      navigate('/checkout', { state: { bookingData } });
  };

  // Navegar para Detalhes (Recompra de Expirado)
  const handleRepurchase = (trip) => {
      if (trip.item) {
          const stateSlug = getStateSlug(trip.item.state);
          const nameSlug = generateSlug(trip.item.name);
          navigate(`/${stateSlug}/${nameSlug}`, { state: { id: trip.item.id } });
      } else {
          // Fallback se o item não tiver dados completos
          navigate('/');
      }
  };

  // Lógica de Clique no Card (Imagem/Nome)
  const handleCardClick = (trip, isConfirmed) => {
      if (isConfirmed) {
          setSelectedVoucher(trip);
      }
      // Se não for confirmado, não faz nada (foco no botão de ação)
  };

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

  // --- FILTRAGEM CORRIGIDA ---
  const filteredTrips = trips.filter(t => {
      // 1. Filtro de Texto
      const matchText = (t.item?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (t.item?.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Filtro de Data
      const matchDate = filterDate ? t.date === filterDate : true;
      
      // 3. Filtro de Status (Agrupamento Inteligente)
      let matchStatus = true;
      if (filterStatus !== 'all') {
          if (filterStatus === 'waiting_payment') {
              // Agrupa todos os pendentes/falhos
              matchStatus = ['pending', 'waiting_payment', 'failed_payment'].includes(t.status);
          } else if (filterStatus === 'confirmed') {
              // Agrupa confirmados e aprovados
              matchStatus = ['confirmed', 'approved'].includes(t.status);
          } else if (filterStatus === 'cancelled') {
              // Agrupa cancelados manuais e por falta de estoque
              matchStatus = ['cancelled', 'cancelled_sold_out', 'chargeback'].includes(t.status);
          } else {
              // Para 'validated' ou outros, busca exato
              matchStatus = t.status === filterStatus;
          }
      }
      
      return matchText && matchDate && matchStatus;
  });

  if (loading) return <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-slate-300 border-t-[#0097A8] rounded-full animate-spin"></div>Carregando ingressos...</div>;
  if (!user) return <div className="text-center py-20 text-slate-400">Faça login para ver seus ingressos.</div>;

  return (
     <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in min-h-[60vh]">
        <VoucherModal isOpen={!!selectedVoucher} trip={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-slate-900">Meus Ingressos</h1>
            
            {/* BOTÃO MOBILE PARA ABRIR FILTROS */}
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl w-full justify-between"
            >
                <span className="flex items-center gap-2"><Filter size={16}/> Filtros {hasActiveFilters && <span className="w-2 h-2 bg-teal-500 rounded-full"></span>}</span>
                {showFilters ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
        </div>

        {/* BARRA DE FILTROS (COLLAPSIBLE NO MOBILE) */}
        <div className={`bg-white md:p-4 rounded-2xl md:border border-slate-200 md:shadow-sm mb-8 flex flex-col md:flex-row gap-4 overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-[500px] opacity-100 p-4 border shadow-sm' : 'max-h-0 opacity-0 md:max-h-none md:opacity-100 md:overflow-visible'}`}>
            
            {/* Campo de Busca */}
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou cidade..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Campo de Data */}
            <div className="relative w-full md:w-auto">
                <input 
                    type="date" 
                    className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                />
            </div>

            {/* Campo de Status */}
            <div className="relative w-full md:w-auto">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <select 
                    className="w-full md:w-auto pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">Todos os Status</option>
                    <option value="confirmed">Confirmados</option>
                    <option value="waiting_payment">Aguardando Pagamento</option>
                    <option value="validated">Utilizados</option>
                    <option value="cancelled">Cancelados</option>
                </select>
            </div>

            {/* [NOVO] Botão Limpar Filtros (Só aparece se tiver filtro ativo) */}
            {hasActiveFilters && (
                <button 
                    onClick={clearFilters}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors md:w-auto w-full border border-transparent hover:border-red-100"
                >
                    <X size={14}/> Limpar
                </button>
            )}
        </div>
        
        <div className="space-y-6">
           {filteredTrips.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                   <Ticket size={40} className="mx-auto text-slate-300 mb-4"/>
                   <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum ingresso encontrado</h3>
                   <p className="text-slate-500 mb-6">Tente ajustar seus filtros ou busque novos destinos.</p>
                   {searchTerm || filterDate || filterStatus !== 'all' ? (
                       <Button variant="outline" onClick={() => {setSearchTerm(''); setFilterDate(''); setFilterStatus('all')}}>Limpar Filtros</Button>
                   ) : (
                       <Button onClick={()=>window.location.href='/'}>Explorar Destinos</Button>
                   )}
               </div>
           ) : (
               filteredTrips.map(t => {
                  // Lógica de Estado
                  const today = new Date().toISOString().split('T')[0];
                  const isExpiredDate = t.date < today;
                  
                  const isConfirmed = ['confirmed', 'approved', 'validated'].includes(t.status);
                  const isPendingPay = ['pending', 'waiting_payment', 'failed_payment'].includes(t.status);
                  
                  // Se passou da data e não pagou, é "Perdido/Expirado"
                  const isMissed = isPendingPay && isExpiredDate;
                  
                  // Se não passou da data e não pagou, é "Recuperável"
                  const isRecoverable = isPendingPay && !isExpiredDate;
                  
                  const isSoldOut = t.status === 'cancelled_sold_out';

                  return (
                     <div key={t.id} className={`bg-white border p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${isRecoverable ? 'border-yellow-200 shadow-md ring-1 ring-yellow-100' : isMissed ? 'bg-slate-50 border-slate-200 opacity-90' : 'border-slate-200'}`}>
                         
                         <div className="flex gap-4 items-center w-full md:w-auto">
                            {/* IMAGEM CLICÁVEL SE CONFIRMADO */}
                            <div 
                                className={`w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative ${isConfirmed ? 'cursor-pointer group' : ''}`}
                                onClick={() => handleCardClick(t, isConfirmed)}
                            >
                                <img src={t.item?.image || t.itemImage} className={`w-full h-full object-cover transition-transform ${isConfirmed ? 'group-hover:scale-105' : ''} ${isSoldOut || isMissed ? 'grayscale opacity-70' : ''}`} alt="Local"/>
                                {isRecoverable && <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center"><Clock className="text-yellow-600 drop-shadow-md" size={24}/></div>}
                                {isMissed && <div className="absolute inset-0 bg-slate-500/20 flex items-center justify-center"><CalendarIcon className="text-slate-600" size={24}/></div>}
                            </div>
                            
                            <div>
                              {/* NOME CLICÁVEL SE CONFIRMADO */}
                              <h3 
                                className={`font-bold text-lg text-slate-900 ${isConfirmed ? 'cursor-pointer hover:text-[#0097A8] transition-colors' : ''}`}
                                onClick={() => handleCardClick(t, isConfirmed)}
                              >
                                {t.item?.name || t.itemName}
                              </h3>
                              
                              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                  <CalendarIcon size={14}/> {formatDate(t.date)}
                                  {t.item?.city && <span className="flex items-center gap-1 ml-3 border-l pl-3 border-slate-300"><MapPin size={14}/> {t.item.city}</span>}
                              </p>
                              
                              <div className="text-xs text-slate-500 mt-2 font-medium flex gap-3 flex-wrap">
                                  <span className="flex items-center gap-1"><User size={12}/> {t.adults}</span>
                                  {t.children > 0 && <span>• {t.children} Crianças</span>}
                                  {t.pets > 0 && <span className="flex items-center gap-1">• <PawPrint size={12}/> {t.pets}</span>}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                  {getStatusBadge(t.status, isMissed)}
                                  <span className="font-bold text-slate-900">{formatBRL(t.total)}</span>
                              </div>
                              
                              {/* MENSAGENS DE ESTADO */}
                              {t.status === 'failed_payment' && !isMissed && (
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
                              {isRecoverable && t.item?.id && (
                                  <div className="mt-2">
                                      <StockIndicator dayuseId={t.item.id} date={t.date} currentReservationId={t.id}/>
                                  </div>
                              )}
                            </div>
                         </div>
                         
                         <div className="flex flex-col gap-2 w-full md:w-auto items-end">
                            {isMissed ? (
                                // BOTÃO PARA RECOMPRAR (MISSING DATE)
                                <Button 
                                    className="w-full md:w-auto px-6 bg-slate-800 hover:bg-slate-700 shadow-none text-xs" 
                                    onClick={() => handleRepurchase(t)}
                                >
                                    Ver Próximas Datas <ArrowRight size={14} className="ml-2"/>
                                </Button>
                            ) : isRecoverable ? (
                                // BOTÃO DE RECUPERAÇÃO (COM URGÊNCIA)
                                <>
                                    <Button 
                                        className={`w-full md:w-auto px-6 ${t.status === 'failed_payment' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200'}`} 
                                        onClick={() => handleResumePayment(t)}
                                    >
                                        {t.status === 'failed_payment' ? 'Tentar Outro Cartão' : 'Finalizar Compra'}
                                    </Button>
                                    <p className="text-[10px] text-slate-400 text-center md:text-right">Não perca sua reserva!</p>
                                </>
                            ) : (
                                // BOTÃO PADRÃO (VER VOUCHER)
                                <div className="flex flex-col items-end gap-2 w-full">
                                    <div className="text-xs font-mono bg-slate-50 p-1 px-2 rounded w-fit border border-slate-200 text-slate-500 mb-2 md:mb-0">
                                        #{t.id?.slice(0,6).toUpperCase()}
                                    </div>
                                    {(isConfirmed) && (
                                        <Button variant="outline" className="px-4 py-2 h-auto text-xs w-full md:w-auto justify-center" onClick={() => setSelectedVoucher(t)}>
                                            Abrir Voucher
                                        </Button>
                                    )}
                                </div>
                            )}
                         </div>
                     </div>
                  );
               })
           )}
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

const VoucherModal = ({ isOpen, onClose, trip, isPartnerView = false }) => {
  const [liveItem, setLiveItem] = useState(null);

  useEffect(() => {
      if (isOpen && trip?.dayuseId) {
          getDoc(doc(db, "dayuses", trip.dayuseId))
            .then(snap => { if (snap.exists()) setLiveItem(snap.data()); })
            .catch(err => console.error("Erro ao atualizar voucher:", err));
      }
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;
  
  // Mescla dados: Snapshot (Reserva) + Live (Atualizações)
  const displayItem = { ...(trip.item || {}), ...(liveItem || {}) };
  
  // Verificação de Legado
  const hasRulesSnapshot = trip.item && typeof trip.item.allowFood === 'boolean';
  const allowFood = hasRulesSnapshot ? trip.item.allowFood : (displayItem.allowFood !== undefined ? displayItem.allowFood : null);

  // Horário
  let openingHours = "08:00 às 18:00"; 
  if (trip.date && displayItem.weeklyPrices) {
      try {
          const [ano, mes, dia] = trip.date.split('-');
          const dateObj = new Date(ano, mes - 1, dia, 12); 
          const dayConfig = displayItem.weeklyPrices[dateObj.getDay()];
          if (dayConfig?.hours) openingHours = dayConfig.hours;
      } catch (e) {}
  }

  const purchaseDate = trip.createdAt?.seconds 
      ? new Date(trip.createdAt.seconds * 1000).toLocaleString('pt-BR') 
      : "N/A";

  const rawPaymentId = String(trip.paymentId || "LEGADO");
  const transactionId = rawPaymentId.replace(/^(FRONT_|PIX-)/, '');

  const paymentLabel = trip.paymentMethod === 'pix' ? 'Pix (À vista)' : 'Cartão de Crédito';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${trip.id}`;
  const placeName = displayItem.name || trip.itemName || "Local do Passeio";
  const address = displayItem.street ? `${displayItem.street}, ${displayItem.number} - ${displayItem.district || ''}, ${displayItem.city} - ${displayItem.state}` : "Endereço não disponível";
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + " " + address)}`;

  // GERAÇÃO DO HTML DE IMPRESSÃO
  const handlePrint = () => {
      const printWindow = window.open('', '_blank', 'width=900,height=800');
      if (!printWindow) { alert("Permita popups para imprimir."); return; }

      // HTML Condicional das Regras (Impressão)
      let rulesHtml = '';
      if (allowFood !== null) {
          if (allowFood === false) {
              rulesHtml = `
                <div class="rules-box box-red">
                    <div class="icon">🚫</div>
                    <div class="text">
                        <strong>Proibida a entrada de alimentos e bebidas</strong><br/>
                        <span>Sujeito a revista de bolsas e mochilas.</span>
                        <span>Temos restaurante no local com preços compatíveis.</span>
                    </div>
                </div>`;
          } else {
              rulesHtml = `
                <div class="rules-box box-green">
                    <div class="icon">✅</div>
                    <div class="text"><strong>Entrada de alimentos e bebidas permitida</strong></div>
                </div>`;
          }
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Voucher - ${placeName}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; padding: 20px; margin: 0; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .paper { max-width: 600px; margin: 0 auto; border: 2px solid #eee; border-radius: 12px; overflow: hidden; }
              .header { background-color: #0097A8; color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
              .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
              .content { padding: 40px; }
              .title { font-size: 24px; color: #1e293b; margin: 0 0 5px; font-weight: 800; text-align: center; }
              .address { font-size: 14px; color: #64748b; margin: 0 0 30px; text-align: center; }
              .qr-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px; }
              .qr-img { width: 160px; height: 160px; mix-blend-mode: multiply; }
              .code-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: bold; margin-top: 10px; display: block; }
              .code-val { font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: 4px; font-family: monospace; display: block; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; border-top: 1px solid #eee; padding-top: 20px; }
              .field { margin-bottom: 5px; }
              .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 2px; }
              .value { font-size: 15px; color: #1e293b; font-weight: 600; display: block; }
              .items-box { background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .items-title { color: #0284c7; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; display: block; }
              .items-list { margin: 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.6; }
              .total-row { display: flex; justify-content: space-between; border-top: 1px solid #bae6fd; margin-top: 15px; padding-top: 10px; color: #075985; font-weight: bold; font-size: 18px; }
              .rules-box { padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px; text-align: left; }
              .box-red { background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
              .box-green { background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
              .rules-box .icon { font-size: 24px; }
              .rules-box .text { font-size: 13px; line-height: 1.4; }
              .contact { background: #f9fafb; padding: 15px; border-radius: 8px; font-size: 12px; color: #4b5563; text-align: center; border: 1px solid #e5e7eb; }
              .meta { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 30px; }
              .no-print { text-align: center; margin-bottom: 20px; }
              .btn { background: #0097A8; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold; }
              @media print { .no-print { display: none; } body { background: white; padding: 0; } .paper { border: none; } }
            </style>
          </head>
          <body>
            <div class="no-print">
                <button onclick="window.print()" class="btn">🖨️ Clique para imprimir ou salvar em PDF</button>
            </div>
            <div class="paper">
                <div class="header">
                    <h1>Voucher de Acesso</h1>
                    <p>Apresente na portaria • Válido apenas para a data agendada</p>
                </div>
                <div class="content">
                    <div class="title">${placeName}</div>
                    <div class="address">${address}</div>
                    <div class="qr-box">
                        <img class="qr-img" src="${qrCodeUrl}" />
                        <span class="code-label">Código de Validação</span>
                        <span class="code-val">${trip.id.slice(0,6).toUpperCase()}</span>
                    </div>
                    <div class="grid">
                        <div class="field"><span class="label">Data do Passeio</span> <span class="value">${trip.date?.split('-').reverse().join('/')}</span></div>
                        <div class="field"><span class="label">Horário de funcionamento</span> <span class="value">${openingHours}</span></div>
                        <div class="field"><span class="label">Titular</span> <span class="value">${trip.guestName}</span></div>
                        <div class="field"><span class="label">Pagamento</span> <span class="value">${paymentLabel}</span></div>
                        <div class="field"><span class="label">ID Transação</span> <span class="value" style="font-family:monospace; font-size:12px;">${transactionId}</span></div>
                        <div class="field"><span class="label">Data Compra</span> <span class="value" style="font-size:12px;">${purchaseDate}</span></div>
                    </div>
                    <div class="items-box">
                        <span class="items-title">Itens do Pacote</span>
                        <ul class="items-list">
                            <li>${trip.adults} Adultos</li>
                            ${trip.children > 0 ? `<li>${trip.children} Crianças</li>` : ''}
                            ${trip.pets > 0 ? `<li>${trip.pets} Pets</li>` : ''}
                            ${trip.freeChildren > 0 ? `<li>${trip.freeChildren} Crianças Grátis</li>` : ''}
                            ${trip.selectedSpecial ? Object.entries(trip.selectedSpecial).map(([idx, qtd]) => qtd > 0 ? `<li>${qtd}x ${trip.item?.specialTickets?.[idx]?.name || "Extra"}</li>` : '').join('') : ''}
                        </ul>
                        <div class="total-row"><span>TOTAL PAGO</span><span>${formatBRL(trip.total)}</span></div>
                    </div>
                    ${rulesHtml}
                    <div class="contact">
                        <strong>Fale com o estabelecimento:</strong><br/>
                        ${displayItem.localWhatsapp ? `WhatsApp: ${displayItem.localWhatsapp} • ` : ''}
                        ${displayItem.localPhone ? `Tel: ${displayItem.localPhone}` : ''}
                        <br/><br/>
                        <em>* Remarcações, cancelamentos e reembolsos devem ser tratados diretamente com o local.</em>
                    </div>
                    <div class="meta">Emitido por <strong>Mapa do Day Use</strong> em ${new Date().toLocaleString()}</div>
                </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col w-full bg-white max-h-[90vh] overflow-hidden rounded-3xl md:max-w-md mx-auto">
        
        {/* CABEÇALHO VISUAL TELA */}
        <div className="bg-[#0097A8] p-6 text-white text-center shadow-sm shrink-0 relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-1 transition-colors"><X size={20}/></button>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><Ticket size={24} /></div>
            <h2 className="text-xl font-bold">Voucher de Acesso</h2>
            <p className="text-cyan-100 text-sm">Apresente na portaria</p>
        </div>
        
        <div className="p-8 text-sm text-slate-700 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* INFORMAÇÕES DO LOCAL (TELA) */}
            <div className="text-center mb-2">
                <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-1">{placeName}</h2>
                <p className="text-xs text-slate-500">{address}</p>
                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-[#0097A8] text-xs font-bold hover:underline flex items-center justify-center gap-1 mt-2">
                     <MapPin size={12}/> Abrir no Google Maps
                </a>
            </div>

            {/* QR CODE (TELA) */}
            <div className="text-center bg-slate-50 border-2 border-dashed border-slate-300 p-6 rounded-2xl relative">
                <div className="flex justify-center mb-4"><img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 border-4 border-white shadow-sm rounded-lg" /></div>
                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">CÓDIGO DE VALIDAÇÃO</p>
                <p className="text-3xl font-mono font-black text-slate-900 tracking-wider select-all">{trip.id?.slice(0,6).toUpperCase()}</p>
            </div>

            {/* DADOS PRINCIPAIS (TELA) */}
            <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-4">
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Data do Passeio</p>
                    <p className="text-base font-bold text-slate-800">{trip.date?.split('-').reverse().join('/')}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Horário de funcionamento</p>
                    <p className="text-base font-bold text-slate-800">{openingHours}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Titular</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{trip.guestName}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Transação</p>
                    <p className="text-xs font-mono font-bold text-slate-600 truncate">{transactionId}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Data da Compra</p>
                    <p className="text-xs font-bold text-slate-600">{purchaseDate}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Método</p>
                    <p className="text-xs font-bold text-slate-600 capitalize">{paymentLabel}</p>
                </div>
            </div>

            {/* ITENS INCLUSOS (TELA) */}
            <div className="bg-cyan-50 p-5 rounded-2xl border border-cyan-100">
               <div className="flex justify-between items-center mb-3 border-b border-cyan-200 pb-2">
                   <p className="text-[#007F8F] text-xs font-bold uppercase flex items-center gap-1"><Info size={12}/> Resumo do Pedido</p>
               </div>
               <ul className="space-y-2 text-sm text-slate-700">
                 <li className="flex justify-between"><span>Adultos</span> <b>{trip.adults}</b></li>
                 {trip.children > 0 && <li className="flex justify-between"><span>Crianças</span> <b>{trip.children}</b></li>}
                 {trip.pets > 0 && <li className="flex justify-between"><span>Pets</span> <b>{trip.pets}</b></li>}
                 {trip.freeChildren > 0 && <li className="flex justify-between text-green-700"><span>Crianças Grátis</span> <b>{trip.freeChildren}</b></li>}
                 {trip.selectedSpecial && Object.entries(trip.selectedSpecial).map(([idx, qtd]) => {
                     const name = trip.item?.specialTickets?.[idx]?.name || "Extra";
                     return qtd > 0 ? <li key={idx} className="flex justify-between text-blue-700"><span>{name}</span> <b>{qtd}</b></li> : null;
                 })}
               </ul>
               <div className="border-t border-cyan-200 pt-3 mt-3 flex justify-between items-center text-[#006064]">
                   <span className="font-bold text-xs uppercase">Total Pago</span>
                   <span className="text-xl font-extrabold">{formatBRL(trip.total)}</span>
               </div>
            </div>

            {/* REGRAS DE ACESSO (TELA) */}
            {allowFood !== null && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${allowFood === false ? 'bg-red-50 border-red-100 text-red-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                    <div className="text-2xl">{allowFood === false ? '🚫' : '✅'}</div>
                    <div>
                        <p className="font-bold text-sm">{allowFood === false ? 'Proibida entrada de alimentos' : 'Entrada de alimentos permitida'}</p>
                        {allowFood === false && <p className="text-xs opacity-80 mt-0.5"><span>Sujeito a revista de bolsas e mochilas.</span>
                        <span>Temos restaurante no local com preços compatíveis.</span></p>}
                    </div>
                </div>
            )}

            {/* CONTATO (TELA) */}
            {(displayItem.localWhatsapp || displayItem.localPhone) && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500">
                    <p className="font-bold uppercase text-slate-400 mb-2">Fale com o local</p>
                    <div className="space-y-1 mb-3 font-medium text-slate-700">
                        {displayItem.localWhatsapp && <a href={`https://wa.me/55${displayItem.localWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 font-bold hover:underline"><MessageCircle size={14}/> WhatsApp: {displayItem.localWhatsapp}</a>}
                        {displayItem.localPhone && <a href={`tel:${displayItem.localPhone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-slate-600 hover:underline"><Phone size={14}/> Tel: {displayItem.localPhone}</a>}
                    </div>
                    <p className="italic text-[10px]">* Remarcações, cancelamentos e reembolsos devem ser tratados diretamente com o local.</p>
                </div>
            )}

            <Button className="w-full shadow-lg" onClick={handlePrint}>Imprimir ou salvar em PDF</Button>
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

// Componente Modal Financeiro Detalhado
const FinancialStatementModal = ({ isOpen, onClose, reservations, monthIndex, items = [] }) => {
    if (!isOpen) return null;

    // 1. FILTRO: Adicionado refunded, chargeback e overbooking_refund
    const monthRes = reservations.filter(r => 
        r.createdAt && 
        new Date(r.createdAt.seconds * 1000).getMonth() === monthIndex && 
        ['confirmed', 'approved', 'validated', 'refunded', 'chargeback', 'overbooking_refund'].includes(r.status)
    ).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

    // Helper de formatação BRL
    const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    // --- LÓGICA DE CÁLCULO POR LINHA ---
    const calculateRow = (res) => {
        const item = items.find(i => i.id === res.dayuseId) || {}; // Fallback para objeto vazio
        
        // --- NOVO: Detecta se é negativo ---
        const isNegative = ['refunded', 'chargeback', 'overbooking_refund'].includes(res.status);
        const multiplier = isNegative ? -1 : 1;

        // 1. Identificar Cupom e Valores
        let couponPercent = 0;
        let couponCode = "-";
        
        if (res.couponCode && item?.coupons) {
             const c = item.coupons.find(cp => cp.code === res.couponCode);
             if (c) {
                 couponPercent = c.percentage;
                 couponCode = c.code;
             }
        } else if (res.discount > 0 && res.total > 0) {
             const impliedGross = res.total + res.discount;
             couponPercent = (res.discount / impliedGross) * 100;
             couponCode = res.couponCode || "DESCONTO";
        }

        // Valores Absolutos (Sem sinal negativo ainda)
        const paidAbs = res.total || 0; 
        const grossAbs = couponPercent > 0 ? paidAbs / (1 - (couponPercent/100)) : paidAbs;
        const discountValAbs = grossAbs - paidAbs;

        // 2. Definir Taxa da Plataforma
        let refDate = new Date();
        const resDate = res.createdAt.toDate ? res.createdAt.toDate() : new Date(res.createdAt);
        
        if (item) {
            if (item.firstActivationDate) {
                refDate = item.firstActivationDate.toDate ? item.firstActivationDate.toDate() : new Date(item.firstActivationDate);
            } else if (item.createdAt) {
                refDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
            }
        }
        
        const diffDays = Math.ceil(Math.abs(resDate - refDate) / (1000 * 60 * 60 * 24));
        const isPromo = diffDays <= 30;
        const rate = isPromo ? 0.10 : 0.12;

        // 3. Calcular Taxa Adm
        const feeAbs = grossAbs * rate;

        // 4. Líquido Absoluto
        const netAbs = paidAbs - feeAbs;

        // --- APLICA O SINAL (Se for estorno, tudo fica negativo) ---
        return { 
            gross: grossAbs * multiplier, 
            paid: paidAbs * multiplier, 
            discountVal: discountValAbs, // Desconto geralmente não se negativa visualmente, mas matematicamente ok
            fee: feeAbs * multiplier, 
            net: netAbs * multiplier, 
            isPromo, 
            rate, 
            couponCode, 
            couponPercent,
            isNegative // Flag para pintar de vermelho
        };
    };

    // Totais para o Rodapé
    const totals = monthRes.reduce((acc, curr) => {
        const calc = calculateRow(curr);
        return { 
            gross: acc.gross + calc.gross,
            paid: acc.paid + calc.paid,
            fee: acc.fee + calc.fee,
            net: acc.net + calc.net
        };
    }, { gross: 0, paid: 0, fee: 0, net: 0 });

    // --- FUNÇÃO EXPORTAR CSV ---
    const handleExportCSV = () => {
        const header = "Data da compra;Hora da compra;ID da transação;Nome e sobrenome;Status;Valor original;Cupom;% do cupom;Valor cupom;Valor pago;Taxa admin %;Valor taxa;Valor liquido\n";
        
        let csvContent = header;

        monthRes.forEach(res => {
            const calc = calculateRow(res);
            const dateObj = new Date(res.createdAt.seconds * 1000);
            
            // Formatadores
            const fmtNum = (n) => n.toFixed(2).replace('.', ',');
            const transactionId = res.paymentId ? res.paymentId.replace(/^(FRONT_|PIX-|CARD_)/, '') : res.id; 

            const row = [
                dateObj.toLocaleDateString('pt-BR'),
                dateObj.toLocaleTimeString('pt-BR'),
                `"${transactionId}"`,
                `"${res.guestName}"`,
                res.status, // Adicionado Status
                fmtNum(calc.gross),
                calc.couponCode,
                calc.couponPercent > 0 ? fmtNum(calc.couponPercent) + '%' : '-',
                calc.couponPercent > 0 ? fmtNum(calc.discountVal) : '0,00',
                fmtNum(calc.paid),
                (calc.rate * 100).toFixed(0) + '%',
                fmtNum(calc.fee),
                fmtNum(calc.net)
            ].join(';');

            csvContent += row + "\n";
        });

        // NOME DO ARQUIVO PERSONALIZADO
        const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const nomeMes = meses[monthIndex];
        const ano = new Date().getFullYear();
        
        const nomeLocalRaw = items.length > 0 ? items[0].name : "estabelecimento";
        const nomeLocal = nomeLocalRaw
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
            .replace(/[^a-z0-9]/g, "_");

        const fileName = `extrato_detalhado_${nomeLocal}_mapadodayuse_${nomeMes}_${ano}.csv`;

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white md:rounded-3xl rounded-t-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* Cabeçalho */}
                <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-[#0097A8]"/> Extrato Financeiro
                        </h2>
                        <p className="text-xs md:text-sm text-slate-500">
                            Conciliação de vendas • {monthRes.length} transações
                        </p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleExportCSV} 
                            disabled={monthRes.length === 0}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={16}/> Baixar Planilha
                        </button>
                        <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                            <X size={20} className="text-slate-500"/>
                        </button>
                    </div>
                </div>

                {/* Conteúdo (Tabela/Cards) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-slate-50 md:bg-white">
                    {monthRes.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                            <p>Nenhuma venda confirmada neste mês.</p>
                        </div>
                    ) : (
                        <>
                            {/* --- TABELA DESKTOP --- */}
                            <table className="hidden md:table w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                        <th className="pb-3 pl-2">Data/ID</th>
                                        <th className="pb-3">Cliente</th>
                                        <th className="pb-3 text-right">Original</th>
                                        <th className="pb-3 text-right">Cupom</th>
                                        <th className="pb-3 text-right">Pago</th>
                                        <th className="pb-3 text-right">Taxa</th>
                                        <th className="pb-3 text-right pr-2">Líquido</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-600">
                                    {monthRes.map((res) => {
                                        const calc = calculateRow(res);
                                        const displayId = res.paymentId ? res.paymentId.replace(/^(FRONT_|PIX-)/, '') : res.id.slice(0,6).toUpperCase();

                                        return (
                                            <tr key={res.id} className={`hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${calc.isNegative ? 'bg-red-50/40' : ''}`}>
                                                <td className="px-2 py-4">
                                                    <div className="font-mono text-xs bg-slate-100 px-2 py-1 rounded w-fit mb-1">#{displayId.slice(0,8)}</div>
                                                    <div className="flex items-center gap-1 font-bold text-slate-700">
                                                        <Calendar size={12}/> {new Date(res.createdAt.seconds * 1000).toLocaleDateString('pt-BR')}
                                                    </div>
                                                    {/* TAG VISUAL DE ESTORNO */}
                                                    {res.status === 'refunded' && <span className="text-[10px] font-bold text-red-500 block mt-1">ESTORNADO</span>}
                                                    {res.status === 'chargeback' && <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 mt-1"><AlertOctagon size={10}/> CHARGEBACK</span>}
                                                </td>
                                                <td className="px-2 py-4">
                                                    <div className="font-bold text-slate-900">{res.guestName}</div>
                                                    <div className="text-xs text-slate-400">{res.guestEmail}</div>
                                                </td>
                                                <td className={`px-2 py-4 text-right ${calc.isNegative ? 'text-red-400' : ''}`}>
                                                    {formatBRL(calc.gross)}
                                                </td>
                                                <td className="px-2 py-4 text-right">
                                                    {calc.couponPercent > 0 ? (
                                                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                                                            {calc.couponCode}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className={`px-2 py-4 text-right font-bold ${calc.isNegative ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {formatBRL(calc.paid)}
                                                </td>
                                                <td className={`px-2 py-4 text-right text-xs ${calc.isNegative ? 'text-red-400' : 'text-red-500'}`}>
                                                    {formatBRL(calc.fee)}
                                                </td>
                                                <td className={`px-2 py-4 text-right font-bold ${calc.isNegative ? 'text-red-700' : 'text-green-700'}`}>
                                                    {formatBRL(calc.net)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* --- MOBILE CARDS --- */}
                            <div className="md:hidden space-y-3">
                                {monthRes.map((res) => {
                                    const calc = calculateRow(res);
                                    const displayId = res.paymentId ? res.paymentId.replace(/^(FRONT_|PIX-)/, '') : res.id.slice(0,6).toUpperCase();

                                    return (
                                        <div key={res.id} className={`bg-white p-4 rounded-xl shadow-sm border ${calc.isNegative ? 'border-red-200 bg-red-50/20' : 'border-slate-100'}`}>
                                            <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-2">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{res.guestName}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">
                                                        {new Date(res.createdAt.seconds * 1000).toLocaleDateString('pt-BR')} • #{displayId}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                        res.paymentMethod === 'pix' ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                                    }`}>
                                                        {res.paymentMethod}
                                                    </span>
                                                    {calc.isNegative && <span className="block text-[10px] font-bold text-red-600 mt-1 uppercase">{res.status}</span>}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>Valor Original:</span>
                                                    <span className={calc.isNegative ? 'text-red-400' : ''}>{formatBRL(calc.gross)}</span>
                                                </div>
                                                {calc.discountVal > 0 && (
                                                    <div className="flex justify-between text-xs text-purple-600 font-medium">
                                                        <span className="flex items-center gap-1"><Tag size={10}/> Cupom ({calc.couponCode}):</span>
                                                        <span>- {formatBRL(Math.abs(calc.discountVal))}</span>
                                                    </div>
                                                )}
                                                
                                                <div className="border-t border-slate-50 my-1"></div>

                                                <div className={`flex justify-between text-sm font-bold ${calc.isNegative ? 'text-red-600' : 'text-slate-700'}`}>
                                                    <span>Valor Pago:</span>
                                                    <span>{formatBRL(calc.paid)}</span>
                                                </div>
                                                <div className={`flex justify-between text-xs font-medium px-2 py-1 rounded ${calc.isNegative ? 'bg-red-100 text-red-600' : 'bg-red-50 text-red-500'}`}>
                                                    <span>Taxa ({calc.rate*100}%):</span>
                                                    <span>{formatBRL(calc.fee)}</span>
                                                </div>

                                                <div className={`flex justify-between text-sm font-bold px-2 py-2 rounded mt-1 border ${
                                                    calc.isNegative ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-50 text-green-700 border-green-100'
                                                }`}>
                                                    <span>Líquido:</span>
                                                    <span>{formatBRL(calc.net)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Rodapé com Totais */}
                <div className="p-4 md:p-6 bg-white md:bg-slate-50 border-t border-slate-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-right">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Bruto</p>
                            <p className={`text-sm md:text-lg font-bold ${totals.gross < 0 ? 'text-red-500' : 'text-slate-500'}`}>{formatBRL(totals.gross)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Pago</p>
                            <p className={`text-sm md:text-lg font-bold ${totals.paid < 0 ? 'text-red-500' : 'text-slate-800'}`}>{formatBRL(totals.paid)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-red-400 font-bold uppercase">Taxas</p>
                            <p className={`text-sm md:text-lg font-bold ${totals.fee < 0 ? 'text-red-600' : 'text-red-500'}`}>- {formatBRL(Math.abs(totals.fee))}</p>
                        </div>
                        <div className={`rounded-lg p-1 md:bg-transparent md:p-0 ${totals.net < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                            <p className={`text-[10px] font-bold uppercase ${totals.net < 0 ? 'text-red-600' : 'text-green-600'}`}>Líquido</p>
                            <p className={`text-sm md:text-2xl font-bold ${totals.net < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatBRL(totals.net)}</p>
                        </div>
                    </div>
                </div>
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
  const [showFinancialModal, setShowFinancialModal] = useState(false);
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
  const [scannedRes, setScannedRes] = useState(null);
  

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showCelebration, setShowCelebration] = useState(true); // Controla o banner final

  const [newMemberRole, setNewMemberRole] = useState('staff');
  const [mainOwnerId, setMainOwnerId] = useState(null);

  // [NOVO] State para o Modal de Estorno
  const [hasChargeback, setHasChargeback] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedForRefund, setSelectedForRefund] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);

  // --- NOVA LÓGICA DE CÁLCULO (Substitua ou ajuste sua calculateStats atual) ---
  const calculateStats = (data) => {
      let revenue = 0;
      let lost = 0; // Dinheiro perdido
      let guests = 0;
      let active = 0;
      let chargebackFound = false;

      data.forEach(r => {
          const total = Number(r.total || 0);

          // Soma Receita (Vendas Confirmadas)
          if (['confirmed', 'validated', 'approved'].includes(r.status)) {
              revenue += total;
              guests += (Number(r.adults) + Number(r.children));
              active++;
          }
          // Soma Perdas (Estornos e Chargebacks)
          else if (['refunded', 'chargeback', 'overbooking_refund'].includes(r.status)) {
              lost += total;
              if (r.status === 'chargeback') chargebackFound = true;
          }
      });

      // Atualiza os stats (Adicione lostRevenue e netRevenue ao seu state de stats se não tiver)
      setStats({
          totalRevenue: revenue,
          netRevenue: (revenue * 0.90), // Ex: Receita - 10%
          lostRevenue: lost,
          activeBookings: active,
          totalGuests: guests
      });

      setHasChargeback(chargebackFound);
  };

  // --- FUNÇÕES DE AÇÃO DO ESTORNO ---
  const handleOpenRefund = (reservation) => {
      setSelectedForRefund(reservation);
      setRefundModalOpen(true);
  };

  const processRefund = async (reservation) => {
      if (!user || !user.mp_access_token) {
          alert("Erro: Token do Mercado Pago não encontrado. Conecte sua conta nas configurações.");
          return;
      }

      setRefundLoading(true);

      try {
          // 2. Chamada da API (Com os dados novos para o e-mail)
          const response = await fetch('/api/refund', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  paymentId: reservation.paymentId,
                  partnerAccessToken: user.mp_access_token,
                  
                  // DADOS EXTRAS PARA O EMAIL DE ESTORNO
                  guestEmail: reservation.guestEmail,
                  guestName: reservation.guestName,
                  itemName: reservation.item?.name || reservation.itemName || "Day Use",
                  amount: reservation.total
              })
          });

          const result = await response.json();

          if (!response.ok) {
              throw new Error(result.message || "Erro ao processar estorno no Mercado Pago");
          }

          // 3. Atualiza Firebase para 'refunded'
          await updateDoc(doc(db, "reservations", reservation.id), {
              status: 'refunded',
              refundedAt: new Date(),
              refundId: result.id
          });

          // 4. Atualiza UI localmente
          const updatedList = reservations.map(r => 
              r.id === reservation.id ? { ...r, status: 'refunded' } : r
          );
          setReservations(updatedList);
          
          // Recalcula os cards financeiros se a função existir
          if (typeof calculateStats === 'function') {
              calculateStats(updatedList);
          }

          alert("✅ Estorno realizado com sucesso e cliente notificado!");
          setRefundModalOpen(false);

      } catch (error) {
          // 5. Bloco de Erro (O que estava faltando)
          console.error(error);
          alert(`Erro: ${error.message}`);
      } finally {
          // 6. Finalização (Onde para o loading)
          setRefundLoading(false);
      }
  };

  // 1. CARREGAMENTO INICIAL E LISTENERS
    useEffect(() => {
     const unsub = onAuthStateChanged(auth, async u => {
        if(u) {
           // 1. Busca dados do usuário logado
           const userDocRef = doc(db, "users", u.uid);
           const userDocSnap = await getDoc(userDocRef);
           
           // Padrão: Eu sou o dono dos dados
           let effectiveOwnerId = u.uid; 

           if(userDocSnap.exists()) {
               const d = userDocSnap.data();
               
               // LÓGICA DE SÓCIO: Se tiver um ownerId salvo, os dados pertencem ao chefe
               if (d.ownerId) {
                   effectiveOwnerId = d.ownerId;
               }

               // Carrega status da empresa do DONO REAL (para liberar o painel)
               const ownerDocSnap = await getDoc(doc(db, "users", effectiveOwnerId));
               if(ownerDocSnap.exists()) {
                   const ownerData = ownerDocSnap.data();
                   setDocStatus(ownerData.docStatus || 'none');
                   if(ownerData.mp_access_token) {
                       setMpConnected(true);
                       setTokenType(ownerData.mp_access_token.startsWith('TEST') ? 'TEST' : 'PROD');
                   }
               }
           }
           
           setUser({ ...u, role: userDocSnap.data()?.role || 'partner' });
           setMainOwnerId(effectiveOwnerId); // Salva quem é o dono para travas de segurança
           
           // CORREÇÃO CRÍTICA: Os listeners agora buscam pelo 'effectiveOwnerId'
           // Assim o sócio vê os dados do dono, e o dono vê os seus próprios
           const qDay = query(collection(db, "dayuses"), where("ownerId", "==", effectiveOwnerId));
           const qRes = query(collection(db, "reservations"), where("ownerId", "==", effectiveOwnerId));
           const qStaff = query(collection(db, "users"), where("ownerId", "==", effectiveOwnerId));
           const qReq = query(collection(db, "requests"), where("ownerId", "==", effectiveOwnerId), where("status", "==", "pending"));

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
     // Segurança: Só o dono principal (cujo ID bate com o ID logado) pode mexer no banco
     if (user.uid !== mainOwnerId) {
         setFeedback({ 
             type: 'warning', 
             title: 'Acesso Restrito', 
             msg: 'Por segurança, apenas o titular da conta principal pode conectar ou alterar a conta do Mercado Pago.' 
         });
         return;
     }

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
    if (type === "pause_ad" || type === "resume_ad") {
      const isResuming = type === "resume_ad";

      // Prepara a atualização
      const updates = { paused: !isResuming };

      // A MÁGICA ESTÁ AQUI:
      // Se estou reativando (resume_ad) E o item NÃO tem 'firstActivationDate' ainda...
      // ...eu gravo a data de AGORA. Isso vale para itens novos E itens velhos que estavam pausados.
      if (isResuming && !payload.firstActivationDate) {
        updates.firstActivationDate = new Date();
      }

      await updateDoc(doc(db, "dayuses", payload.id), updates);

      setFeedback({
        type: "success",
        title: "Sucesso",
        msg: `Anúncio ${type === "pause_ad" ? "pausado" : "reativado"}.`,
      });
    } // ... (resto do código igual: delete_staff, reset_staff_pass) ...
    else if (type === "delete_staff") {
      await deleteDoc(doc(db, "users", payload));
      setFeedback({
        type: "success",
        title: "Removido",
        msg: "Acesso revogado.",
      });
    } else if (type === "reset_staff_pass") {
      await sendPasswordResetEmail(auth, payload.email);
      if (payload.requestId)
        await updateDoc(doc(db, "requests", payload.requestId), {
          status: "completed",
        });
      setFeedback({
        type: "success",
        title: "E-mail Enviado",
        msg: "Link enviado.",
      });
    }
  } catch (error) {
    console.error(error);
    setFeedback({
      type: "error",
      title: "Erro",
      msg: "Não foi possível completar a ação.",
    });
  } finally {
    setConfirmAction(null);
  }
};

  // --- GESTÃO DE RESERVAS (ESTORNO/REAGENDAMENTO) ---
  const handleManageSubmit = async () => {
      if (!manageRes) return;
      setManageLoading(true);

      try {
          // 1. REAGENDAMENTO (Atualiza Firestore + Notifica Cliente)
          if (manageAction === 'reschedule') {
              await updateDoc(doc(db, "reservations", manageRes.id), {
                  date: rescheduleDate,
                  updatedAt: new Date()
              });

              // Dispara e-mail de aviso para o cliente
              const dayUseName = manageRes.item?.name || manageRes.itemName || "Day Use";
              const emailHtml = `
                <div style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 40px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #eee; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <div style="background-color: #0097A8; padding: 25px; text-align: center;">
                            <h2 style="color: white; margin: 0; font-size: 24px;">Sua reserva foi reagendada 🗓️</h2>
                        </div>
                        <div style="padding: 35px;">
                            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                                Olá, <strong>${manageRes.guestName}</strong>!
                            </p>
                            <p style="font-size: 16px; color: #333; line-height: 1.5;">
                                Informamos que a data da sua reserva no <strong>${dayUseName}</strong> foi alterada pelo estabelecimento.
                            </p>
                            
                            <div style="background-color: #e0f7fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #0097A8;">
                                <p style="margin: 0; font-size: 13px; color: #006064; font-weight: bold; text-transform: uppercase;">Nova Data</p>
                                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #0097A8;">
                                    ${rescheduleDate.split('-').reverse().join('/')}
                                </p>
                            </div>

                            <p style="font-size: 14px; color: #555; margin-bottom: 30px;">
                                Se você tiver dúvidas ou não solicitou essa alteração, entre em contato diretamente com o local.
                            </p>

                            <div style="text-align: center;">
                                <a href="https://mapadodayuse.com/minhas-viagens" style="background-color: #0097A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">
                                    Acessar Meu Voucher Atualizado
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
              `;

              fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      to: manageRes.guestEmail, 
                      subject: `Reserva Reagendada: ${dayUseName}`, 
                      html: emailHtml 
                  })
              }).catch(console.error);

              setFeedback({ type: 'success', title: 'Sucesso', msg: 'Data alterada e cliente notificado por e-mail.' });
          } 
          
          // 2. CANCELAMENTO / REEMBOLSO
          else {
              // Verifica se é um pagamento real que pode ser estornado via API
              const shouldRefundMoney = manageRes.paymentId && !manageRes.paymentId.startsWith('FRONT_') && !manageRes.paymentId.startsWith('PIX-');
              
              if (shouldRefundMoney) {
                  // Busca o token do parceiro atual para autorizar o estorno na API
                  const userSnap = await getDoc(doc(db, "users", user.uid));
                  const partnerToken = userSnap.data()?.mp_access_token;
                  
                  if (!partnerToken) throw new Error("Seu token do Mercado Pago não foi encontrado. Tente reconectar sua conta.");

                  const refundAmount = refundPercent === 100 ? undefined : Number((manageRes.total * (refundPercent / 100)).toFixed(2));

                  // Chama a API apenas para devolver o dinheiro
                  const response = await fetch('/api/refund', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                          paymentId: manageRes.paymentId, 
                          amount: refundAmount,
                          partnerAccessToken: partnerToken
                      })
                  });

                  const apiData = await response.json();
                  if (!response.ok) throw new Error(apiData.message || "Erro no estorno financeiro.");
              }

              // Atualiza o status da reserva no banco de dados
              await updateDoc(doc(db, "reservations", manageRes.id), {
                  status: 'cancelled',
                  refundStatus: refundPercent === 100 ? 'full' : 'partial',
                  refundedAmount: refundPercent === 100 ? manageRes.total : (manageRes.total * (refundPercent / 100)),
                  cancelledAt: new Date(),
                  note: shouldRefundMoney ? 'Estornado via MP' : 'Cancelamento manual (sem estorno financeiro automático)'
              });

              setFeedback({ 
                  type: 'success', 
                  title: 'Cancelado', 
                  msg: shouldRefundMoney ? 'Reserva cancelada e estorno processado.' : 'Reserva cancelada no sistema.' 
              });
          }
          
          setManageRes(null);

      } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', title: 'Erro', msg: err.message });
      } finally {
          setManageLoading(false);
      }
  };

  // --- OPERACIONAL ---
  const handleValidate = async (resId, codeInput) => { if(codeInput.toUpperCase() === resId.slice(0,6).toUpperCase() || resId === codeInput) { try { await updateDoc(doc(db, "reservations", resId), { status: 'validated' }); setFeedback({ type: 'success', title: 'Check-in Realizado!', msg: 'Acesso liberado.' }); setValidationCode(""); } catch (e) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao validar.' }); } } else { setFeedback({ type: 'error', title: 'Código Inválido', msg: 'Verifique o código.' }); } };
  const onScanSuccess = (decodedText) => {
      setShowScanner(false);
      const res = reservations.find(r => r.id === decodedText);
      
      if (res) {
          // Abre o modal de conferência em vez de validar direto
          setScannedRes(res);
      } else {
          setFeedback({ type: 'error', title: 'Não Encontrado', msg: 'QR Code não pertence a este local ou não foi encontrado.' });
      }
  };

  const handleConfirmValidation = async () => {
      if (!scannedRes) return;
      
      if (scannedRes.status === 'validated') {
          setFeedback({ type: 'warning', title: 'Já Validado', msg: 'Este ingresso já foi utilizado anteriormente.' });
      } else if (scannedRes.status === 'cancelled') {
          setFeedback({ type: 'error', title: 'Cancelado', msg: 'Impossível validar: Ingresso cancelado.' });
      } else {
          // Chama a função de validação existente passando o ID
          await handleValidate(scannedRes.id, scannedRes.id);
      }
      setScannedRes(null);
  };

  // --- GESTÃO DE EQUIPE (API + FIREBASE) ---
  const handleUpdateStaffEmail = async (staffId, newEmail, requestId = null) => { setStaffLoading(true); try { const response = await fetch('/api/admin-update-staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId, newEmail, ownerId: user.uid }) }); if (response.ok) { await fetch('/api/send-auth-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newEmail, type: 'verify_email', name: 'Colaborador' }) }); if (requestId) await updateDoc(doc(db, "requests", requestId), { status: 'completed' }); setFeedback({ type: 'success', title: 'Atualizado!', msg: `E-mail alterado para ${newEmail}. Link de confirmação enviado.` }); setEditStaffModal(null); setNewStaffEmailInput(''); } else throw new Error(); } catch (err) { setFeedback({ type: 'error', title: 'Erro', msg: 'Falha ao atualizar.' }); } finally { setStaffLoading(false); } };
  const handleDeleteStaff = async (staffId) => { setConfirmAction({ type: 'delete_staff', payload: staffId }); };
  const handleAddStaff = async (e) => {
      e.preventDefault();
      if (docStatus !== 'verified') return setFeedback({ type: 'warning', title: 'Restrito', msg: 'Valide sua empresa primeiro.' });
      
      setStaffLoading(true);
      try {
          const secondaryApp = initializeApp(getApp().options, "Secondary");
          const secondaryAuth = getAuth(secondaryApp);
          
          const createdUser = await createUserWithEmailAndPassword(secondaryAuth, staffEmail, staffPass);
          await sendEmailVerification(createdUser.user);
          
          await setDoc(doc(db, "users", createdUser.user.uid), {
              email: staffEmail,
              role: newMemberRole, // Salva o cargo escolhido (staff ou partner)
              ownerId: user.uid,   // Vincula ao dono atual
              createdAt: new Date(),
              name: newMemberRole === 'partner' ? "Sócio" : "Portaria"
          });
          
          await signOut(secondaryAuth);
          setFeedback({ type: 'success', title: 'Cadastrado!', msg: `Novo ${newMemberRole === 'partner' ? 'Sócio' : 'Membro'} criado. Link de confirmação enviado.` });
          setStaffEmail(''); setStaffPass('');
      } catch (err) {
          setFeedback({ type: 'error', title: 'Erro', msg: err.code === 'auth/email-already-in-use' ? 'E-mail já existe.' : 'Verifique os dados.' });
      } finally {
          setStaffLoading(false);
      }
  };

// --- CÁLCULOS FINANCEIROS INTELIGENTES ---
  
  // 1. Determina datas da Promoção (Baseado no primeiro item ativado)
  // Assume que a "entrada" do parceiro conta a partir da primeira ativação de qualquer day use
  const firstActiveItem = items.find(i => i.firstActivationDate) || items[0];
  let promoStartDate = null;
  let promoEndDate = null;

  if (firstActiveItem) {
      // Pega data de ativação ou criação como fallback
      const rawDate = firstActiveItem.firstActivationDate || firstActiveItem.createdAt;
      promoStartDate = rawDate && rawDate.toDate ? rawDate.toDate() : new Date(rawDate || Date.now());
      
      // Calcula data final (Data + 30 dias)
      promoEndDate = new Date(promoStartDate);
      promoEndDate.setDate(promoEndDate.getDate() + 30);
  }

  // 2. Filtra reservas do mês selecionado
  const financialRes = reservations.filter(r => 
      r.createdAt && 
      new Date(r.createdAt.seconds * 1000).getMonth() === filterMonth && 
      r.status === 'confirmed'
  );

  // 3. Calcula Totais e Taxas por Item
  const financialSummary = financialRes.reduce((acc, r) => {
      // 1. Descobrir porcentagem do Cupom (se houver)
      let couponPercent = 0;
      if (r.couponCode) {
          const item = items.find(i => i.id === r.dayuseId);
          const coupon = item?.coupons?.find(c => c.code === r.couponCode);
          if (coupon) couponPercent = coupon.percentage;
      }

      // 2. Engenharia Reversa: Descobrir o Valor Bruto Original
      // Ex: Se pagou 95 e o cupom era 5% -> Bruto = 95 / 0.95 = 100
      const valorPago = r.total || 0;
      const valorBruto = couponPercent > 0 ? valorPago / (1 - (couponPercent/100)) : valorPago;
      const valorDescontoCupom = valorBruto - valorPago;

      // 3. Calcular Taxa da Plataforma sobre o BRUTO
      let taxaPercentual = 0.12; // Padrão
      if (promoStartDate) {
          const resDate = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
          const diffDays = Math.ceil(Math.abs(resDate - promoStartDate) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) taxaPercentual = 0.10;
      }

      const valorTaxa = valorBruto * taxaPercentual;

      // 4. Líquido Final = Bruto - Taxa - Cupom
      // (Matematicamente igual a: ValorPago - ValorTaxa)
      const valorLiquido = valorBruto - valorTaxa - valorDescontoCupom;

      return {
          paid: acc.paid + valorPago,          // O que entrou no caixa (MP)
          gross: acc.gross + valorBruto,       // Valor dos produtos sem desconto
          fees: acc.fees + valorTaxa,          // Taxa sobre o bruto
          coupons: acc.coupons + valorDescontoCupom, // Custo dos cupons
          net: acc.net + valorLiquido,         // O que sobra pro parceiro
          
          pixTotal: r.paymentMethod === 'pix' ? acc.pixTotal + valorPago : acc.pixTotal,
          cardTotal: r.paymentMethod !== 'pix' ? acc.cardTotal + valorPago : acc.cardTotal,
          hasPromo: acc.hasPromo || taxaPercentual === 0.10,
          hasStandard: acc.hasStandard || taxaPercentual === 0.12
      };
  }, { paid: 0, gross: 0, fees: 0, coupons: 0, net: 0, pixTotal: 0, cardTotal: 0, hasPromo: false, hasStandard: false });

  // Definição do Rótulo
  let taxLabel = "12%";
  let showPromoBanner = false;
  if (financialSummary.hasPromo && financialSummary.hasStandard) { taxLabel = "Mista (10%/12%)"; showPromoBanner = true; }
  else if (financialSummary.hasPromo) { taxLabel = "Promo 10%"; showPromoBanner = true; }
  else { taxLabel = "Padrão 12%"; showPromoBanner = false; }

  // Variáveis para o JSX
  const totalBalance = financialSummary.paid; // Exibimos o Valor Pago como entrada principal
  const totalGross = financialSummary.gross;  // Novo: Valor Bruto (para referência)
  const totalFees = financialSummary.fees;
  const totalCoupons = financialSummary.coupons;
  const netBalance = financialSummary.net;

  const pixTotal = financialSummary.pixTotal;
  const cardTotal = financialSummary.cardTotal;

  // Formatação de data simples (DD/MM)
  const formatDateSimple = (d) => d ? d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}) : '';

  // Cupons (Lógica mantida)
  const couponRes = financialRes.filter(r => r.couponCode);
  const totalCouponRevenue = couponRes.reduce((acc, r) => acc + (r.total || 0), 0);
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
        {/* 1. Modal Financeiro */}
        {showFinancialModal && createPortal(
            <FinancialStatementModal 
                isOpen={showFinancialModal} 
                onClose={() => setShowFinancialModal(false)}
                reservations={reservations}
                monthIndex={filterMonth}
            />, 
            document.body // <--- ISSO GARANTE QUE ELE VÁ PARA O BODY
        )}
        
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
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex flex-col md:flex-row justify-between mb-6 gap-4 items-center">
               <div className="flex items-center gap-2">
                   <h2 className="text-xl font-bold flex gap-2 text-slate-800"><DollarSign/> Financeiro</h2>
                   <button 
                       onClick={() => setShowFinancialModal(true)}
                       className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
                   >
                       <FileText size={14}/> Ver Extrato Detalhado
                   </button>
               </div>
               <select className="border p-2 rounded-lg bg-slate-50 text-sm font-medium" value={filterMonth} onChange={e=>setFilterMonth(Number(e.target.value))}>
                   {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=><option key={i} value={i}>{m}</option>)}
               </select>
           </div>
           
           <div className="grid md:grid-cols-3 gap-6">

              {/* CARD 1: Financeiro Detalhado (Cupom + Taxa) */}
<div className="bg-white rounded-2xl border border-slate-200 flex flex-col justify-between overflow-hidden shadow-sm">
   
   <div className="p-6 pb-2">
       <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Resumo do Mês</p>
       
       {/* Valor Pago (Entrada Real) */}
       <div className="flex justify-between items-end mb-4">
          <div>
              <span className="text-sm text-slate-600 block">Vendas (Faturamento)</span>
              {totalCoupons > 0 && <span className="text-[10px] text-slate-400">Bruto Original: {formatBRL(totalGross)}</span>}
          </div>
          <span className="font-bold text-slate-800 text-lg">{formatBRL(totalBalance)}</span>
       </div>
       
       <div className="space-y-2">
           {/* Linha Vermelha: TAXAS (Sobre o Bruto) */}
           <div className="flex justify-between items-center text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100">
              <span className="flex items-center gap-1 font-medium">
                 Taxa {taxLabel} (S/ Bruto)
                 <div className="group relative">
                     <Info size={12} className="text-red-400 cursor-help"/>
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                         A taxa é calculada sobre o valor original da venda (R$ {formatBRL(totalGross)}), antes dos descontos.
                     </div>
                 </div>
              </span>
              <span className="font-bold">- {formatBRL(totalFees)}</span>
           </div>

           {/* Linha Roxa: CUPONS (Se houver) */}
           {totalCoupons > 0 && (
               <div className="flex justify-between items-center text-xs text-purple-600 bg-purple-50 px-2 py-1.5 rounded-lg border border-purple-100">
                  <span className="flex items-center gap-1 font-medium">
                     <Tag size={12}/> Descontos Concedidos
                  </span>
                  <span className="font-bold">- {formatBRL(totalCoupons)}</span>
               </div>
           )}
       </div>
   </div>

   {/* Banner Promocional (Mantido igual) */}
   {showPromoBanner && promoStartDate && (
       <div className="bg-amber-50 border-y border-amber-100 px-6 py-3 mt-2">
           <p className="text-[11px] text-amber-700 leading-tight">
               <span className="font-bold">⚡ Oferta Ativa:</span> Taxa de 10% aplicada sobre vendas até {formatDateSimple(promoEndDate)}.
           </p>
       </div>
   )}

   {/* Footer Líquido */}
   <div className="p-6 pt-4 bg-slate-50/50 mt-auto border-t border-slate-100">
       <div className="flex justify-between items-baseline">
           <p className="text-xs text-green-700 font-bold uppercase">Líquido Estimado</p>
           <p className="text-3xl font-bold text-green-700 tracking-tight">{formatBRL(netBalance)}</p>
       </div>
   </div>
</div>
              
              {/* CARD 2: Métodos (Mantido) */}
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
                 <p className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-4">Por Método</p>
                 <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1"><span className="text-sm text-blue-900 font-medium flex items-center gap-2"><CreditCard size={16}/> Cartão de Crédito</span><span className="font-bold text-blue-900">{formatBRL(cardTotal)}</span></div>
                        <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-600 h-full" style={{ width: totalBalance > 0 ? `${(cardTotal/totalBalance)*100}%` : '0%' }}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1"><span className="text-sm text-blue-900 font-medium flex items-center gap-2"><QrCode size={16}/> Pix</span><span className="font-bold text-blue-900">{formatBRL(pixTotal)}</span></div>
                        <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden"><div className="bg-teal-500 h-full" style={{ width: totalBalance > 0 ? `${(pixTotal/totalBalance)*100}%` : '0%' }}></div></div>
                    </div>
                 </div>
              </div>

              {/* CARD 3: Cupons (Mantido) */}
              <div className="p-6 bg-yellow-50 rounded-2xl border border-yellow-200 flex flex-col h-full">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs text-yellow-800 font-bold uppercase">Performance de Cupons</p>
                        <p className="text-2xl font-bold text-slate-900">{formatBRL(totalCouponRevenue)}</p>
                        <p className="text-[10px] text-slate-500">Faturamento bruto via cupons</p>
                    </div>
                    <Tag className="text-yellow-600" size={32}/>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto max-h-32 pr-2 custom-scrollbar bg-white rounded-xl p-2 border border-yellow-100">
                    {Object.keys(couponBreakdown).length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">Nenhum cupom usado neste mês.</p>
                    ) : (
                        Object.entries(couponBreakdown).map(([code, stats]) => (
                            <div key={code} className="flex justify-between items-center text-xs text-slate-600 mb-2 border-b border-slate-100 pb-2 last:border-0 last:mb-0">
                                <span className="font-bold bg-yellow-100 px-1.5 py-0.5 rounded text-yellow-900 uppercase">{code}</span>
                                <div className="text-right">
                                    <span className="block font-bold">{stats.count} usos</span>
                                    <span className="block text-[10px] text-green-600">{formatBRL(stats.revenue)}</span>
                                </div>
                            </div>
                        ))
                    )}
                 </div>
              </div>
           </div>
        </div>
             
             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-12">
               <div className="flex flex-col md:flex-row justify-between mb-8 gap-4"><h2 className="text-xl font-bold flex gap-2 text-slate-800"><List/> Lista de Presença</h2><div className="flex gap-4"><input type="date" className="border p-2 rounded-lg text-slate-600 font-medium" value={filterDate} onChange={e=>setFilterDate(e.target.value)}/><Button variant="outline" onClick={() => setShowScanner(true)}><ScanLine size={18}/> Validar Ingresso</Button></div></div>
               
               <OccupancyCalendar reservations={reservations} selectedDate={filterDate} onDateSelect={setFilterDate} />

<div className="space-y-4">
  {dailyGuests.length === 0 ? (
    <p className="text-center text-slate-400 py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
      Nenhum viajante agendado.
    </p>
  ) : (
    dailyGuests.map((r) => (
      <div
        key={r.id}
        className="flex flex-col md:flex-row justify-between items-center p-4 bg-white hover:shadow-md transition-shadow rounded-xl border border-slate-200 gap-4"
      >
        <div className="flex-1">
          <p className="font-bold text-lg text-slate-900">{r.guestName}</p>
          <p className="text-sm text-slate-500 font-mono">
            #{r.id.slice(0, 6).toUpperCase()} • {r.itemName}
          </p>
          <div className="flex gap-2 mt-2 text-xs text-slate-600 flex-wrap">
            {r.adults > 0 && (
              <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">
                {r.adults} Adultos
              </span>
            )}
            {r.children > 0 && (
              <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">
                {r.children} Crianças
              </span>
            )}
            {r.status === "cancelled" && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold">
                CANCELADO
              </span>
            )}
            {/* NOVO: STATUS DE CHARGEBACK (DISPUTA) */}
    {(r.status === 'chargeback') && 
        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200 font-bold flex items-center gap-1">
            <AlertTriangle size={10}/> CONTESTADO
        </span>
    }

    {/* NOVO: STATUS DE PENDENTE (PIX AGUARDANDO) */}
    {(r.status === 'pending' || r.status === 'waiting_payment') && 
        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded border border-yellow-200 font-bold">AGUARDANDO PAGTO</span>
    }
    
    {/* NOVO: STATUS ESTORNADO */}
    {(r.status === 'refunded') && 
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-bold">REEMBOLSADO</span>
    }
          </div>
        </div>
        <div className="flex items-center gap-2">
          {r.status === "confirmed" && (
            <Button
              variant="outline"
              className="h-full py-2 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => {
                setManageRes(r);
                setRescheduleDate(r.date);
              }}
            >
              <Edit size={16} />
            </Button>
          )}
          {r.status === "validated" ? (
            <div className="px-4 py-2 bg-green-50 text-green-700 font-bold rounded-xl flex items-center gap-2 border border-green-100">
              <CheckCircle size={18} /> Validado
            </div>
          ) : (
            r.status === "confirmed" && (
              <div className="flex gap-2">
                <input
                  id={`code-${r.id}`}
                  className="border p-2 rounded-xl w-24 text-center uppercase font-bold text-slate-700 tracking-wider"
                  placeholder="CÓDIGO"
                  maxLength={6}
                />
                <Button
                  onClick={() =>
                    handleValidate(
                      r.id,
                      document.getElementById(`code-${r.id}`).value
                    )
                  }
                  className="h-full py-2 shadow-none"
                >
                  Validar
                </Button>
              </div>
            )
          )}
          <Button
            variant="outline"
            className="h-full py-2 px-3 rounded-xl"
            onClick={() => setSelectedRes(r)}
          >
            <Info size={18} />
          </Button>
        </div>
      </div>
    ))
  )}
</div>;
             </div>
             
             <div><h2 className="text-xl font-bold mb-6 text-slate-900">Meus Anúncios</h2><div className="grid md:grid-cols-2 gap-6">{items.map(i => (<div key={i.id} className={`bg-white p-4 border rounded-2xl flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow relative ${i.paused ? 'opacity-75 bg-slate-50 border-slate-200' : 'border-slate-100'}`}>{i.paused && (<div className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200">PAUSADO</div>)}<img src={i.image} className={`w-24 h-24 rounded-xl object-cover bg-slate-200 ${i.paused ? 'grayscale' : ''}`}/><div className="flex-1"><h4 className="font-bold text-lg text-slate-900 leading-tight">{i.name}</h4><p className="text-sm text-slate-500 mb-2">{i.city}</p><p className="text-sm font-bold text-[#0097A8] bg-cyan-50 w-fit px-2 py-1 rounded-lg">{formatBRL(i.priceAdult)}</p></div><div className="flex flex-col gap-2"><Button variant="outline" className="px-3 h-8 text-xs" onClick={()=>navigate(`/partner/edit/${i.id}`)}><Edit size={14}/> Editar</Button><button onClick={() => confirmTogglePause(i)} className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors flex items-center justify-center gap-1 ${i.paused ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>{i.paused ? <><CheckCircle size={12}/> Reativar</> : <><Ban size={12}/> Pausar</>}</button></div></div>))}</div></div>

             {/* Gestão de Equipe (Mantido) */}
             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mt-12"><h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800"><Users/> Gerenciar Equipe</h2><div className="grid md:grid-cols-2 gap-8"><div className="space-y-4"><h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Membros Ativos</h3>{staffList.length === 0 ? <p className="text-sm text-slate-400 italic">Nenhum funcionário cadastrado.</p> : (<ul className="space-y-3">{staffList.map(staff => (<li key={staff.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group hover:border-[#0097A8] transition-colors"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">{staff.email[0].toUpperCase()}</div><div className="flex flex-col"><span className="text-sm font-bold text-slate-700">{staff.email}</span><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded w-fit ${staff.role === 'partner' ? 'bg-purple-100 text-purple-700' : 'text-slate-400 bg-slate-100'}`}>{staff.role === 'partner' ? 'Sócio / Admin' : 'Portaria'}</span></div></div><div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditStaffModal({ id: staff.id, currentEmail: staff.email }); setNewStaffEmailInput(''); }} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg" title="Editar Email"><Edit size={16}/></button><button onClick={() => confirmResetStaffPass(staff.email)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Redefinir Senha"><Lock size={16}/></button><button onClick={() => confirmDeleteStaff(staff.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Remover"><Trash2 size={16}/></button></div></li>))}</ul>)}</div><div><h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Cadastrar Novo</h3><div className={`bg-slate-50 p-6 rounded-2xl border border-slate-200 ${docStatus !== 'verified' ? 'opacity-50 pointer-events-none' : ''}`}>
                <form onSubmit={handleAddStaff} className="space-y-4">
                            <input className="w-full border p-3 rounded-xl bg-white" placeholder="E-mail do novo membro" value={staffEmail} onChange={e=>setStaffEmail(e.target.value)} required />
                            
                            <div className="flex gap-2">
                                <input className="w-full border p-3 rounded-xl bg-white" placeholder="Senha de acesso" type="password" value={staffPass} onChange={e=>setStaffPass(e.target.value)} required />
                                
                                {/* SELETOR DE CARGO (NOVO) */}
                                <select 
                                    className="border p-3 rounded-xl bg-white text-sm font-bold text-slate-700 outline-none cursor-pointer"
                                    value={newMemberRole}
                                    onChange={e => setNewMemberRole(e.target.value)}
                                >
                                    <option value="staff">Portaria (Limitado)</option>
                                    <option value="partner">Sócio (Total)</option>
                                </select>
                            </div>

                            <Button type="submit" disabled={staffLoading} className="w-full">{staffLoading ? 'Cadastrando...' : 'Criar Acesso'}</Button>
                        </form>
                        </div></div></div></div>
        </div>
        
        <div className="bg-slate-900 rounded-3xl p-8 text-center text-white mt-12 mb-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-2">Precisa de ajuda?</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">Fale diretamente com nosso suporte técnico exclusivo para parceiros.</p>
            <div className="flex justify-center gap-4">
                <a href="https://wa.me/5531920058081" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#20bd5a] transition-all transform hover:scale-105 shadow-lg"><MessageCircle size={22} /> WhatsApp</a>
                <a href="https://mapadodayuse.notion.site/Central-de-Ajuda-Mapa-do-Day-Use-2dc9dd27aaf88071b399cdb623b66b77" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-slate-800 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all shadow-lg"><Info size={22} /> Central de Ajuda</a>
            </div>
        </div>

{showFinancialModal && createPortal(
    <FinancialStatementModal 
        isOpen={showFinancialModal} 
        onClose={() => setShowFinancialModal(false)}
        reservations={reservations}
        monthIndex={filterMonth}
        items={items} // <--- ADICIONE ESTA LINHA (Importante!)
    />, 
    document.body
)}
        {/* --- MODAL DE CONFERÊNCIA DE VOUCHER (NOVO) --- */}
        {scannedRes && createPortal(
            <ModalOverlay onClose={() => setScannedRes(null)}>
                <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md animate-fade-in">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                            <ScanLine className="text-[#0097A8]"/> Conferir Ingresso
                        </h3>
                        <button onClick={() => setScannedRes(null)}><X size={20}/></button>
                    </div>

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">{scannedRes.guestName}</h2>
                        <p className="text-sm text-slate-500 font-mono mt-1">Voucher #{scannedRes.id.slice(0,6).toUpperCase()}</p>
                    </div>

                    {/* ALERTA DE DATA DIFERENTE */}
                    {scannedRes.date !== new Date().toISOString().split('T')[0] && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl text-left shadow-sm">
                            <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
                                <AlertCircle size={20}/> 
                                <span>ATENÇÃO: DATA ERRADA!</span>
                            </div>
                            <p className="text-sm text-red-700">
                                Este ingresso é válido para <strong>{scannedRes.date.split('-').reverse().join('/')}</strong>.
                                <br/>Hoje é {new Date().toLocaleDateString('pt-BR')}.
                            </p>
                        </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 text-sm space-y-2">
                        <div className="flex justify-between"><span>Adultos:</span> <b>{scannedRes.adults}</b></div>
                        {scannedRes.children > 0 && <div className="flex justify-between"><span>Crianças:</span> <b>{scannedRes.children}</b></div>}
                        {scannedRes.pets > 0 && <div className="flex justify-between"><span>Pets:</span> <b>{scannedRes.pets}</b></div>}
                        {scannedRes.freeChildren > 0 && <div className="flex justify-between text-green-600"><span>Crianças Grátis:</span> <b>{scannedRes.freeChildren}</b></div>}
                        
                        <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                            <span>Status Atual:</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                scannedRes.status === 'validated' ? 'bg-green-100 text-green-700' :
                                scannedRes.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {scannedRes.status === 'validated' ? 'JÁ USADO' :
                                 scannedRes.status === 'cancelled' ? 'CANCELADO' : 'VÁLIDO'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setScannedRes(null)} className="flex-1 justify-center">Cancelar</Button>
                        
                        {scannedRes.status === 'confirmed' ? (
                            <Button onClick={handleConfirmValidation} className="flex-1 justify-center bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200">
                                Confirmar Entrada
                            </Button>
                        ) : (
                            <Button disabled className="flex-1 justify-center opacity-50 cursor-not-allowed bg-slate-200 text-slate-500">
                                Ação Indisponível
                            </Button>
                        )}
                    </div>
                </div>
            </ModalOverlay>, 
            document.body
        )}

        {/* MODAL DE CONFIRMAÇÃO */}
      <RefundModal 
          isOpen={refundModalOpen}
          onClose={() => setRefundModalOpen(false)}
          onConfirm={processRefund}
          reservation={selectedForRefund}
          loading={refundLoading}
      />
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
           
           if (!id) {
               // Novo Cadastro: Preenche com dados do usuário logado
               setFormData(prev => ({ ...prev, contactName: u.displayName || '', contactEmail: u.email }));
           } else {
               // Edição: Busca dados do Day Use
               const s = await getDoc(doc(db, "dayuses", id));
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

                   // CORREÇÃO: Se o usuário logado for o dono (mesmo após transferência),
                   // atualiza o e-mail de contato visualmente para o dele.
                   if (d.ownerId === u.uid) {
                       safeData.contactEmail = u.email;
                   }

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
           }
        } else {
            navigate('/');
        }
     });
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
    
    // Trava de e-mail (Mantida para parceiros, liberada para admin)
    if (user && !user.emailVerified && user.role !== 'admin') {
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
        // CORREÇÃO CRÍTICA PARA CMS: 
        // Se já existe um ownerId no formulário (edição), mantém ele. Se for novo, usa o usuário atual.
        ownerId: (id && formData.ownerId) ? formData.ownerId : (user?.uid || "admin"), 
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
        
        // Redirecionamento Inteligente: Admin volta pro CMS, Parceiro volta pro Painel
        if (user.role === 'admin') navigate('/admin');
        else navigate('/partner');

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
              <div className="border-b pb-2 mb-4"><h3 className="font-bold text-lg text-[#0097A8]">5. Regras e Inclusões</h3></div>
              
              {/* CHECKBOXES DE SEGURANÇA JURÍDICA (NOVO) */}
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-6">
                  <p className="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2"><ShieldCheck size={16}/> Regras de Acesso (Segurança)</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                      {/* Permite Alimentos? */}
                      <label className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-100 cursor-pointer hover:border-yellow-300 transition-colors">
                          <span className="text-sm text-slate-700 font-medium">Permite entrar com alimentos/bebidas?</span>
                          <div className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={formData.allowFood} onChange={e => setFormData({...formData, allowFood: e.target.checked})} />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0097A8]"></div>
                          </div>
                      </label>

                      {/* Realiza Revista? */}
                      <label className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-100 cursor-pointer hover:border-yellow-300 transition-colors">
                          <span className="text-sm text-slate-700 font-medium">Realiza revista na entrada?</span>
                          <div className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={formData.hasSearch} onChange={e => setFormData({...formData, hasSearch: e.target.checked})} />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0097A8]"></div>
                          </div>
                      </label>
                  </div>
                  <p className="text-[10px] text-yellow-700 mt-2">* Essas informações aparecerão no voucher do cliente para evitar conflitos na portaria.</p>
              </div>              
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
  const [showDetails, setShowDetails] = useState(false);
  
  const [preferences, setPreferences] = useState({
      necessary: true,
      marketing: false, 
      analytics: false 
  });

  // Função para enviar o sinal ao GTM (Google Tag Manager)
  const updateGtmConsent = (prefs) => {
      if (window.gtag) {
          window.gtag('consent', 'update', {
              'analytics_storage': prefs.analytics ? 'granted' : 'denied',
              'ad_storage': prefs.marketing ? 'granted' : 'denied',
              'ad_user_data': prefs.marketing ? 'granted' : 'denied',
              'ad_personalization': prefs.marketing ? 'granted' : 'denied'
          });
          
          // Dispara evento para tags que não são do Google (ex: Meta Pixel configurado no GTM)
          if (prefs.marketing || prefs.analytics) {
              window.dataLayer.push({ event: 'cookie_consent_update' });
          }
      }
  };

  useEffect(() => {
    const savedConsent = localStorage.getItem('mapadodayuse_consent_v2');
    
    if (savedConsent) {
        const parsed = JSON.parse(savedConsent);
        setPreferences(parsed);
        updateGtmConsent(parsed); // Aplica o consentimento salvo ao carregar
    } else {
        setIsVisible(true);
    }
  }, []);

  const saveConsent = async (finalPrefs) => {
      localStorage.setItem('mapadodayuse_consent_v2', JSON.stringify(finalPrefs));
      
      // Atualiza o GTM imediatamente
      updateGtmConsent(finalPrefs);
      
      setIsVisible(false);

      try {
          await addDoc(collection(db, "cookie_consents"), {
              acceptedAt: new Date(),
              preferences: finalPrefs,
              userAgent: navigator.userAgent,
              screenSize: `${window.screen.width}x${window.screen.height}`,
              type: 'consent_update'
          });
      } catch (e) { console.warn("Log LGPD não salvo."); }
  };

  const handleAcceptAll = () => saveConsent({ necessary: true, marketing: true, analytics: true });
  const handleRejectAll = () => saveConsent({ necessary: true, marketing: false, analytics: false });
  const handleSavePreferences = () => saveConsent(preferences);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[95%] md:w-[400px] bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 z-[10000] animate-fade-in flex flex-col gap-4">
       
       {!showDetails ? (
           <>
               <div className="flex items-start gap-3">
                  <div className="bg-cyan-50 p-2 rounded-full text-[#0097A8]"><Lock size={20} /></div>
                  <div>
                      <h4 className="font-bold text-slate-800 text-sm mb-1">Sua privacidade importa</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Usamos cookies para melhorar sua experiência. Você pode aceitar todos ou ajustar suas preferências conforme a <span className="text-[#0097A8] font-bold cursor-pointer hover:underline" onClick={()=>window.location.href='/politica-de-privacidade'}>Política de Privacidade</span>.
                      </p>
                  </div>
               </div>
               <div className="flex flex-col gap-2 mt-2">
                  <Button className="w-full py-2 text-xs h-9 shadow-md" onClick={handleAcceptAll}>Aceitar Tudo</Button>
                  <div className="flex gap-2">
                      <button onClick={handleRejectAll} className="flex-1 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors">Recusar</button>
                      <button onClick={() => setShowDetails(true)} className="flex-1 py-2 rounded-lg text-xs font-bold text-[#0097A8] hover:bg-cyan-50 border border-cyan-100 transition-colors">Gerenciar</button>
                  </div>
               </div>
           </>
       ) : (
           <>
               <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                   <h4 className="font-bold text-slate-800 text-sm">Preferências de Cookies</h4>
                   <button onClick={() => setShowDetails(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
               </div>
               
               <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                   <div className="flex justify-between items-center">
                       <div><p className="text-xs font-bold text-slate-700">Essenciais</p><p className="text-[10px] text-slate-400">Login, Carrinho (Sempre Ativo).</p></div>
                       <div className="w-10 h-5 bg-slate-300 rounded-full relative opacity-50 cursor-not-allowed"><div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 border border-slate-300"></div></div>
                   </div>
                   <div className="flex justify-between items-center">
                       <div><p className="text-xs font-bold text-slate-700">Marketing</p><p className="text-[10px] text-slate-400">Meta Pixel, TikTok, Ads.</p></div>
                       <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={preferences.marketing} onChange={e => setPreferences({...preferences, marketing: e.target.checked})} /><div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0097A8]"></div></label>
                   </div>
                   <div className="flex justify-between items-center">
                       <div><p className="text-xs font-bold text-slate-700">Analíticos</p><p className="text-[10px] text-slate-400">Google Analytics, Clarity.</p></div>
                       <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={preferences.analytics} onChange={e => setPreferences({...preferences, analytics: e.target.checked})} /><div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0097A8]"></div></label>
                   </div>
               </div>
               <Button className="w-full py-2 text-xs h-9 mt-2" onClick={handleSavePreferences}>Salvar Preferências</Button>
           </>
       )}
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

  const [hasChargeback, setHasChargeback] = useState(false);

  useEffect(() => {
    const checkChargeback = async () => {
      if (user && user.role === 'partner') {
         try {
           // Verifica se existe alguma reserva com status 'chargeback' para este parceiro
           const q = query(
             collection(db, "reservations"), 
             where("ownerId", "==", user.uid), 
             where("status", "==", "chargeback")
           );
           const snapshot = await getDocs(q);
           setHasChargeback(!snapshot.empty);
         } catch (e) {
           console.error("Erro ao verificar chargeback:", e);
         }
      }
    };
    checkChargeback();
  }, [user]);

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

        {hasChargeback && (
            <div className="bg-red-600 text-white px-4 py-3 sticky top-0 z-50 shadow-md flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertOctagon className="animate-pulse" size={20}/>
                    <span>Atenção: Você tem contestações de pagamento (Chargeback).</span>
                </div>
                <a href="https://www.mercadopago.com.br/developers/pt/docs/chargebacks" target="_blank" rel="noreferrer" className="bg-white text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                    Resolver no MP <ExternalLink size={12} className="inline ml-1"/>
                </a>
            </div>
        )}
        
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
           {/* Logo */}
           <div className="flex items-center gap-2 cursor-pointer" onClick={()=>navigate('/')}>
              {!logoError ? (
                 <img 
                    src="/logo.png?v=2" // Removido ?v=2 para manter simples, adicione se precisar de cache bust
                    alt="Mapa do Day Use" 
                    className="h-8 md:h-10 w-auto object-contain" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; setLogoError(true); }} 
                 />
              ) : (
                 <MapIcon className="h-6 w-6 md:h-8 md:w-8 text-[#0097A8]" />
              )}
           </div>
           
           <div className="flex items-center gap-2 md:gap-4">
              {!user ? (
                 <>
                   <button onClick={()=>{navigate('/partner-register')}} className="text-xs md:text-sm font-bold text-slate-500 hover:text-[#0097A8] mr-1 md:mr-2">Seja parceiro</button>
                   <Button variant="ghost" onClick={()=>setShowLogin(true)} className="font-bold px-3 md:px-4 text-xs md:text-sm">Entrar</Button>
                 </>
              ) : (
                 <div className="flex gap-2 md:gap-4 items-center">
                    {/* Botões de Acesso Rápido - AGORA VISÍVEIS NO MOBILE */}
                    {user.role === 'partner' && (
                        <Button variant="ghost" onClick={()=>navigate('/partner')} className="px-2 md:px-4 text-xs md:text-sm whitespace-nowrap">
                            Painel
                        </Button>
                    )}
                    
                    {user.role === 'staff' && (
                        <Button variant="ghost" onClick={()=>navigate('/portaria')} className="px-2 md:px-4 text-xs md:text-sm whitespace-nowrap">
                            Portaria
                        </Button>
                    )}
                    
                    {user.role === 'admin' && (
                        <Button variant="ghost" onClick={()=>navigate('/admin')} className="px-2 md:px-4 text-xs md:text-sm whitespace-nowrap">
                            Admin
                        </Button>
                    )}
                    
                    {user.role === 'user' && (
                        <Button variant="ghost" onClick={()=>navigate('/minhas-viagens')} className="px-2 md:px-4 text-[10px] md:text-sm font-bold whitespace-nowrap flex items-center gap-1">
                            <Ticket size={14} className="md:hidden"/> {/* Ícone no mobile para chamar atenção */}
                            <span className="hidden xs:inline">Meus Ingressos</span> {/* Texto visível em telas > 320px */}
                            <span className="xs:hidden">Meus Ingressos</span> {/* Texto curto para telas muito pequenas */}
                        </Button>
                    )}
                    
                    {/* Avatar */}
                    <div 
                        className="w-8 h-8 md:w-10 md:h-10 bg-cyan-100 rounded-full flex items-center justify-center font-bold text-[#0097A8] border-2 border-white shadow-sm hover:scale-105 transition-transform cursor-pointer overflow-hidden shrink-0" 
                        title={user.email}
                        onClick={()=>navigate('/profile')}
                    >
                        {user.photoURL ? (
                            <img src={user.photoURL} className="w-full h-full object-cover" alt="Perfil" />
                        ) : (
                            user.email ? user.email[0].toUpperCase() : <User size={18} className="md:w-5 md:h-5"/>
                        )}
                    </div>
                    
                    {/* Logout */}
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-1 md:p-2 rounded-full hover:bg-red-50 shrink-0" title="Sair">
                        <LogOut size={18} className="md:w-5 md:h-5"/>
                    </button>
                 </div>
              )}
           </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>
      
      <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
         <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
               
               {/* Coluna 1: Marca e Contato */}
               <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={()=>navigate('/')}>
                     {!logoError ? (
                        <img 
                           src="/logo.png" 
                           alt="Mapa do Day Use" 
                           className="h-8 w-auto object-contain" 
                           onError={(e) => { e.currentTarget.style.display = 'none'; setLogoError(true); }} 
                        />
                     ) : (
                        <MapIcon className="h-6 w-6 text-[#0097A8]" />
                     )}
                  </div>
                  <p className="text-slate-500 text-sm mb-6 max-w-sm leading-relaxed">
                     A plataforma completa para descobrir e reservar experiências incríveis de Day Use perto de você.
                  </p>
                  <a href="mailto:contato@mapadodayuse.com" className="flex items-center gap-2 text-slate-600 hover:text-[#0097A8] transition-colors font-medium text-sm">
                     <Mail size={16} /> contato@mapadodayuse.com
                  </a>
               </div>
               
               {/* Coluna 2: Institucional */}
               <div>
                  <h4 className="font-bold text-slate-900 mb-4">Institucional</h4>
                  <ul className="space-y-3 text-sm text-slate-500">
                     <li><button onClick={() => navigate('/')} className="hover:text-[#0097A8] transition-colors">Início</button></li>
                     <li><button onClick={() => navigate('/sobre-nos')} className="hover:text-[#0097A8] transition-colors">Sobre Nós</button></li>
                     <li><button onClick={() => navigate('/contato')} className="hover:text-[#0097A8] transition-colors">Fale Conosco</button></li>
                     <li><button onClick={() => navigate('/mapa-do-site')} className="hover:text-[#0097A8] transition-colors">Mapa do Site</button></li>
                  </ul>
               </div>

               {/* Coluna 3: Explore e Social */}
               <div>
                  <h4 className="font-bold text-slate-900 mb-4">Explore</h4>
                  <ul className="space-y-3 text-sm text-slate-500 mb-6">
                     <li><button onClick={() => navigate('/day-use')} className="hover:text-[#0097A8] transition-colors">Blog / Dicas</button></li>
                     <li><button onClick={() => navigate('/quiz')} className="hover:text-[#0097A8] transition-colors">Quiz Ideal 🤖</button></li>
                     <li><button onClick={() => navigate('/comparativo')} className="hover:text-[#0097A8] transition-colors">Comparador</button></li>
                  </ul>
                  
                  <div className="flex gap-3 mb-4">
                     <a href="https://instagram.com/mapadodayuse" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-50 hover:bg-pink-50 text-slate-400 hover:text-[#E1306C] transition-all border border-slate-100 hover:border-pink-200">
                        <Instagram size={18} />
                     </a>
                     <a href="https://tiktok.com/@mapadodayuse" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-slate-50 hover:bg-gray-100 text-slate-400 hover:text-black transition-all border border-slate-100 hover:border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                     </a>
                     <a href="https://www.youtube.com/@mapadodayuse" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all border border-slate-100 hover:border-red-200">
                        <Youtube size={18} />
                     </a>
                  </div>

                  <button onClick={() => navigate('/seja-parceiro')} className="bg-[#0097A8] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#007F8F] transition-colors shadow-lg shadow-teal-100 transform hover:scale-105 w-full md:w-auto">
                      Seja um Parceiro
                  </button>
               </div>
            </div>
            
            {/* Rodapé Inferior */}
            <div className="border-t border-slate-100 pt-8 mt-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-slate-500 mb-4">
                   <div className="flex flex-col md:flex-row gap-2 md:gap-6">
                       <p>© 2026 Mapa do Day Use LTDA. Todos os direitos reservados.</p>
                       <div className="hidden md:block w-1 h-1 bg-slate-300 rounded-full my-auto"></div>
                       <div className="flex gap-4">
                           <button onClick={() => navigate('/politica-de-privacidade')} className="hover:text-[#0097A8] transition-colors">Política de Privacidade</button>
                           <button onClick={() => navigate('/termos-de-uso')} className="hover:text-[#0097A8] transition-colors">Termos de Uso</button>
                       </div>
                   </div>
                   <p className="flex items-center gap-1">
                      Feito com carinho por <a href="https://instagram.com/iurifrancast" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-600 hover:text-[#0097A8] transition-colors">Iuri França</a>
                   </p>
               </div>
               
               {/* Dados da Empresa - Horizontal */}
               <div className="text-[10px] text-slate-400 flex flex-col md:flex-row gap-1 md:gap-3 flex-wrap border-t border-slate-50 pt-4">
                   <span>CNPJ: 64.186.316/0001-00</span>
                   <span className="hidden md:inline">•</span>
                   <span>Rua Pais Leme, 215, Conj 1713, Pinheiros, São Paulo - SP, 05424-150</span>
                   <span className="hidden md:inline">•</span>
                   <span>contato@mapadodayuse.com</span>
               </div>
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
    const [decision, setDecision] = useState(null); // 'listing', 'type_listing', 'details', '404'
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

            // 3. Verifica se é um TIPO DE ESTABELECIMENTO (Ex: /mg/hotel-fazenda)
            const isType = ESTABLISHMENT_TYPES.some(t => generateSlug(t) === cityOrSlug);
            if (isType) {
                setDecision('type_listing');
                setLoading(false);
                return;
            }

            try {
                // 4. Verifica se é um Local (Slug exato)
                const qSlug = query(collection(db, "dayuses"), where("slug", "==", cityOrSlug));
                const snapSlug = await getDocs(qSlug);

                if (!snapSlug.empty) {
                    setDecision('details');
                } else {
                    // 5. Verifica se é uma Cidade Válida
                    const qState = query(collection(db, "dayuses"), where("state", "==", state.toUpperCase()));
                    const snapState = await getDocs(qState);
                    
                    const cityExists = snapState.docs.some(doc => {
                        const data = doc.data();
                        return data.city && generateSlug(data.city) === cityOrSlug;
                    });

                    if (cityExists) {
                        setDecision('listing');
                    } else {
                        setDecision('404');
                    }
                }
            } catch (error) {
                console.error("Erro na validação de rota:", error);
                setDecision('404'); 
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
    
    // Rota de Tipo (ex: /mg/hotel-fazenda)
    if (decision === 'type_listing') return <TypeListingPage typeParam={cityOrSlug} stateParam={state} />;
    
    // Rota de Cidade (ex: /mg/belo-horizonte) ou Estado Puro
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('partners'); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // States - Listas
  const [pendingUsers, setPendingUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [claims, setClaims] = useState([]);
  const [cmsItems, setCmsItems] = useState([]);
  
  // States - Controles
  const [viewDoc, setViewDoc] = useState(null);
  const [viewClaim, setViewClaim] = useState(null);
  
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [claimFilter, setClaimFilter] = useState('pending');
  const [cmsSearch, setCmsSearch] = useState("");

  useEffect(() => {
    let unsubs = []; 

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
        if(u) {
            try {
                const snap = await getDoc(doc(db, "users", u.uid));
                if (snap.exists() && snap.data().role === 'admin') {
                    setUser(u);
                    
                    unsubs.push(onSnapshot(query(collection(db, "users"), where("docStatus", "==", "pending")), (s) => setPendingUsers(s.docs.map(d => ({id: d.id, ...d.data()})))));
                    unsubs.push(onSnapshot(query(collection(db, "leads"), orderBy("createdAt", "desc")), (s) => setLeads(s.docs.map(d => ({id: d.id, ...d.data()})))));
                    unsubs.push(onSnapshot(query(collection(db, "property_claims"), orderBy("createdAt", "desc")), (s) => setClaims(s.docs.map(d => ({id: d.id, ...d.data()})))));
                    unsubs.push(onSnapshot(collection(db, "dayuses"), (s) => setCmsItems(s.docs.map(d => ({id: d.id, ...d.data()})))));

                    setLoading(false);
                } else {
                    navigate('/');
                }
            } catch (err) { console.error(err); }
        } else { navigate('/'); }
    });

    return () => { unsubAuth(); unsubs.forEach(u => u()); };
  }, []);

  // --- AÇÕES PARCEIROS ---
  const handlePartnerAction = async (uid, status) => {
      const confirmText = status === 'verified' ? "Aprovar empresa?" : "Rejeitar documento?";
      if (confirm(confirmText)) {
          await updateDoc(doc(db, "users", uid), { docStatus: status });
          
          let subject = "";
          let html = "";
          if (status === 'verified') {
              subject = "Conta APROVADA! 🎉";
              html = `<p>Parabéns! Documentação aprovada. <a href="https://mapadodayuse.com/partner">Acesse seu painel</a>.</p>`;
          } else {
              subject = "Pendência na sua conta";
              html = `<p>Documento recusado. Envie uma foto legível do CCMEI/Contrato.</p>`;
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

  // --- AÇÃO: TRANSFERÊNCIA DE PROPRIEDADE ---
const handleTransferProperty = async (claim) => {
      if (!confirm(`ATENÇÃO: Isso vai transferir a administração do local "${claim.propertyName}" para "${claim.userEmail}".\n\nTem certeza?`)) return;

      try {
          // 1. Busca o usuário pelo e-mail para pegar o UID correto
          const usersRef = collection(db, "users");
          const emailToSearch = claim.userEmail.toLowerCase().trim();
          const q = query(usersRef, where("email", "==", claim.userEmail));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
              alert("ERRO: Este e-mail não possui uma conta cadastrada no site. O usuário precisa criar uma conta primeiro.");
              return;
          }

          const targetUserId = querySnapshot.docs[0].id;

          // 2. Atualiza o Day Use com o novo Dono
          await updateDoc(doc(db, "dayuses", claim.propertyId), {
              ownerId: targetUserId,
              updatedAt: new Date()
          });

          // 3. Atualiza o status da solicitação
          await updateDoc(doc(db, "property_claims", claim.id), { status: 'done' });
          
          // 4. Envia E-mail de Aviso (TEMPLATE ATUALIZADO)
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 40px 0;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #eee; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <div style="background-color: #0097A8; padding: 25px; text-align: center;">
                        <h2 style="color: white; margin: 0; font-size: 24px;">Solicitação Aprovada! 🎉</h2>
                    </div>
                    <div style="padding: 35px;">
                        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                            Olá, <strong>${claim.userName}</strong>!
                        </p>
                        <p style="font-size: 16px; color: #333; line-height: 1.5; margin-bottom: 20px;">
                            Temos ótimas notícias! Sua solicitação para administrar o <strong>${claim.propertyName}</strong> foi aprovada pela nossa equipe.
                        </p>
                        
                        <div style="background-color: #e0f7fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 5px solid #0097A8;">
                            <p style="margin: 0; font-size: 14px; color: #006064; font-weight: bold;">🚀 Acesso Liberado</p>
                            <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">
                                Você já pode acessar seu painel, configurar seus preços e começar a vender ingressos de Day Use agora mesmo.
                            </p>
                        </div>

                        <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Próximos Passos</h3>
                        <ul style="list-style: none; padding: 0; color: #555; font-size: 14px; line-height: 1.8;">
                            <li>1. Acesse a plataforma com o e-mail: <strong>${claim.userEmail}</strong></li>
                            <li>2. Crie sua senha (caso ainda não tenha) ou faça login.</li>
                            <li>3. Conecte sua conta financeira e revise seu anúncio.</li>
                        </ul>

                        <div style="text-align: center; margin-top: 35px;">
                            <a href="https://mapadodayuse.com/partner" style="background-color: #0097A8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">
                                Acessar Painel do Parceiro
                            </a>
                        </div>
                    </div>
                </div>
            </div>
          `;

          fetch('/api/send-email', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  to: claim.userEmail, 
                  subject: "Acesso Liberado! 🔑 - Mapa do Day Use", 
                  html: emailHtml 
              })
          });

          alert("Transferência realizada com sucesso!");
          setViewClaim(null);

      } catch (error) {
          console.error("Erro na transferência:", error);
          alert("Erro ao transferir propriedade.");
      }
  };

  const handleArchiveClaim = async (id) => {
      if(confirm("Arquivar esta solicitação?")) {
          await updateDoc(doc(db, "property_claims", id), { status: 'archived' });
          setViewClaim(null);
      }
  };

  // --- AÇÕES CMS E EXPORT ---
  const handleToggleStatus = async (item) => { if(confirm(`Alterar status de ${item.name}?`)) await updateDoc(doc(db, "dayuses", item.id), { paused: !item.paused }); };
  const handleDeletePage = async (id) => { if(confirm("Excluir permanentemente?")) await deleteDoc(doc(db, "dayuses", id)); };
  
  const exportLeadsCSV = () => {
      const headers = ["Data Hora", "Nome", "Email", "Cidade", "Newsletter", "Companhia", "Pet", "Alimentação", "Exigência"];
      const rows = filteredLeads.map(l => [
          l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString('pt-BR') : '-',
          l.name, l.email, l.city, l.newsletter ? "Sim" : "Não",
          l.preferences?.company || "-", 
          l.preferences?.pet ? "Sim" : "Não", 
          l.preferences?.food || "-",
          l.preferences?.must_have || "-"
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `leads_dayuse_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Filtros
  const filteredLeads = leads.filter(l => { if (!dateStart && !dateEnd) return true; const d = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(); const s = dateStart ? new Date(dateStart) : new Date('2000-01-01'); const e = dateEnd ? new Date(dateEnd) : new Date(); e.setHours(23,59,59); return d >= s && d <= e; });
  const filteredClaims = claims.filter(c => claimFilter === 'all' || c.status === claimFilter);
  const filteredCmsItems = cmsItems.filter(i => (i.name || "").toLowerCase().includes(cmsSearch.toLowerCase()) || (i.city || "").toLowerCase().includes(cmsSearch.toLowerCase()));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-[#0097A8] border-t-transparent rounded-full"></div></div>;
  if (!user) return <div className="text-center py-20 text-red-500">Acesso restrito.</div>;

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-2"><ShieldCheck className="text-[#0097A8]"/> Painel Administrativo</h1>

        {/* NAVEGAÇÃO */}
        <div className="flex gap-4 mb-8 border-b border-slate-200 pb-1 overflow-x-auto">
            <button onClick={() => setActiveTab('partners')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap ${activeTab === 'partners' ? 'text-[#0097A8] border-b-2 border-[#0097A8]' : 'text-slate-500 hover:text-slate-700'}`}>Moderação {pendingUsers.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingUsers.length}</span>}</button>
            <button onClick={() => setActiveTab('cms')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap ${activeTab === 'cms' ? 'text-[#0097A8] border-b-2 border-[#0097A8]' : 'text-slate-500 hover:text-slate-700'}`}>CMS ({cmsItems.length})</button>
            <button onClick={() => setActiveTab('leads')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap ${activeTab === 'leads' ? 'text-[#0097A8] border-b-2 border-[#0097A8]' : 'text-slate-500 hover:text-slate-700'}`}>Leads ({leads.length})</button>
            <button onClick={() => setActiveTab('claims')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap ${activeTab === 'claims' ? 'text-[#0097A8] border-b-2 border-[#0097A8]' : 'text-slate-500 hover:text-slate-700'}`}>Solicitações {claims.filter(c=>c.status==='pending').length > 0 && <span className="ml-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">{claims.filter(c=>c.status==='pending').length}</span>}</button>
        </div>

        {/* TAB PARCEIROS */}
        {activeTab === 'partners' && (
            <div className="grid gap-4">{pendingUsers.length === 0 ? <p className="text-slate-400 text-center py-8">Tudo limpo!</p> : pendingUsers.map(p => (<div key={p.id} className="bg-white p-6 rounded-2xl border flex justify-between items-center"><div><p className="font-bold">{p.name}</p><p className="text-sm text-slate-500">{p.email}</p><p className="text-xs text-slate-400">Enviado: {p.submittedAt?.toDate().toLocaleString()}</p></div><Button onClick={() => setViewDoc(p)}>Analisar</Button></div>))}</div>
        )}

        {/* TAB CMS */}
        {activeTab === 'cms' && (
             <div className="space-y-6">
                <div className="relative max-w-md"><Search size={18} className="absolute left-3 top-3.5 text-slate-400"/><input className="w-full border p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-[#0097A8]" placeholder="Buscar página..." value={cmsSearch} onChange={e=>setCmsSearch(e.target.value)}/></div>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs"><tr><th className="p-4">Capa</th><th className="p-4">Nome</th><th className="p-4">Local</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredCmsItems.map(item => (<tr key={item.id} className="hover:bg-slate-50 transition-colors"><td className="p-4"><img src={item.image} className="w-12 h-12 rounded-lg object-cover bg-slate-200" alt="Capa"/></td><td className="p-4"><p className="font-bold text-slate-800">{item.name}</p><a href={`/${getStateSlug(item.state)}/${item.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0097A8] hover:underline flex items-center gap-1">Ver online <ExternalLink size={10}/></a></td><td className="p-4 text-slate-600">{item.city}, {item.state}</td><td className="p-4">{item.paused ? <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit"><Archive size={12}/> Arquivado</span> : <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12}/> Ativo</span>}</td><td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => navigate(`/partner/edit/${item.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><Edit size={16}/></button><button onClick={() => handleToggleStatus(item)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title={item.paused ? "Publicar" : "Arquivar"}><Archive size={16}/></button><button onClick={() => handleDeletePage(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir"><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div></div>
            </div>
        )}
        
        {/* TAB LEADS */}
        {activeTab === 'leads' && (
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-2xl border flex justify-between items-center">
                    <div className="flex gap-4"><input type="date" className="border p-2 rounded" value={dateStart} onChange={e=>setDateStart(e.target.value)} /><input type="date" className="border p-2 rounded" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} /></div>
                    <div className="text-right"><p className="text-xs text-slate-400 mb-1">Total: <strong>{filteredLeads.length}</strong></p><Button onClick={exportLeadsCSV} variant="outline" className="text-xs h-9"><Download size={14}/> CSV</Button></div>
                </div>
                <div className="bg-white rounded-3xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">Data/Hora</th>
                                    <th className="p-4 whitespace-nowrap">Nome</th>
                                    <th className="p-4 whitespace-nowrap">Email</th>
                                    <th className="p-4 whitespace-nowrap">Cidade</th>
                                    <th className="p-4 whitespace-nowrap">Preferências</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500 whitespace-nowrap">
                                            {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleString('pt-BR') : '-'}
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">{lead.name}</td>
                                        <td className="p-4 text-slate-600">{lead.email}</td>
                                        <td className="p-4 text-slate-600">{lead.city}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1 text-xs">
                                                {lead.preferences?.company && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded w-fit">Perfil: {lead.preferences.company}</span>}
                                                {lead.preferences?.pet !== undefined && <span className={`px-2 py-0.5 rounded w-fit ${lead.preferences.pet ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>Pet: {lead.preferences.pet ? 'Sim' : 'Não'}</span>}
                                                {lead.preferences?.food && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded w-fit">Comida: {lead.preferences.food}</span>}
                                                {lead.preferences?.must_have && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded w-fit">Exigência: {lead.preferences.must_have}</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredLeads.length === 0 && <p className="text-center py-8 text-slate-400">Nenhum lead encontrado.</p>}
                </div>
            </div>
        )}
        
        {/* TAB CLAIMS (SOLICITAÇÕES) */}
        {activeTab === 'claims' && (
            <div className="space-y-6">
                <div className="flex gap-2">
                    <button onClick={()=>setClaimFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${claimFilter==='pending' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>Pendentes</button>
                    <button onClick={()=>setClaimFilter('done')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${claimFilter==='done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>Concluídas</button>
                    <button onClick={()=>setClaimFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${claimFilter==='all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>Todas</button>
                </div>

                <div className="grid gap-4">
                    {filteredClaims.map(claim => (
                        <div key={claim.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-bold text-lg text-slate-800">{claim.propertyName}</h3>
                                    {claim.status === 'done' 
                                        ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-green-200">Transferido</span>
                                        : <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-orange-200">Pendente</span>
                                    }
                                </div>
                                <p className="text-sm text-slate-500 mb-1"><strong>Solicitante:</strong> {claim.userName} ({claim.userEmail})</p>
                                <p className="text-xs text-slate-400">Solicitado em: {claim.createdAt?.toDate ? claim.createdAt.toDate().toLocaleString() : 'Data inválida'}</p>
                            </div>
                            
                            {claim.status !== 'done' && (
                                <Button onClick={() => setViewClaim(claim)} className="px-6 shadow-sm bg-slate-800 hover:bg-slate-900">
                                    Analisar Pedido
                                </Button>
                            )}
                        </div>
                    ))}
                    {filteredClaims.length === 0 && <p className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Nenhuma solicitação encontrada.</p>}
                </div>
            </div>
        )}

        {/* MODAL DE ANÁLISE DE DOCUMENTO */}
        {viewDoc && createPortal(<ModalOverlay onClose={() => setViewDoc(null)}><div className="bg-white p-6 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"><button onClick={() => setViewDoc(null)} className="absolute top-4 right-4"><X/></button><h2 className="text-2xl font-bold mb-4">Análise</h2><div className="bg-slate-100 h-[500px] flex items-center justify-center rounded-xl mb-4">{viewDoc.docFile ? <iframe src={viewDoc.docFile} className="w-full h-full"></iframe> : <p>Sem arquivo</p>}</div><div className="grid grid-cols-2 gap-4"><button onClick={()=>handlePartnerAction(viewDoc.id, 'rejected')} className="bg-red-50 text-red-600 py-3 rounded-xl font-bold">Rejeitar</button><button onClick={()=>handlePartnerAction(viewDoc.id, 'verified')} className="bg-green-600 text-white py-3 rounded-xl font-bold">Aprovar Parceiro</button></div></div></ModalOverlay>, document.body)}

        {/* MODAL DE ANÁLISE DE SOLICITAÇÃO (CLAIM) - RESTAURADO COM TODOS OS DETALHES */}
        {viewClaim && createPortal(
            <ModalOverlay onClose={() => setViewClaim(null)}>
                <div className="bg-white p-8 rounded-3xl w-full max-w-md animate-fade-in relative shadow-2xl">
                    <button onClick={() => setViewClaim(null)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100"><X/></button>
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Briefcase className="text-[#0097A8]"/> Transferência</h2>
                    <div className="space-y-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Propriedade Alvo</p>
                            <p className="font-bold text-slate-800 text-lg">{viewClaim.propertyName}</p>
                            <p className="text-xs text-slate-400 font-mono select-all">ID: {viewClaim.propertyId}</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados do Solicitante</p>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <User size={16} className="text-slate-400 shrink-0"/> 
                                    <span className="font-bold text-slate-700">{viewClaim.userName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Briefcase size={16} className="text-slate-400 shrink-0"/> 
                                    <span className="text-slate-600">{viewClaim.userJob || 'Não informado'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail size={16} className="text-slate-400 shrink-0"/> 
                                    <span className="text-slate-600 break-all">{viewClaim.userEmail}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone size={16} className="text-slate-400 shrink-0"/> 
                                    <span className="text-slate-600">{viewClaim.userPhone || 'Não informado'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="ghost" onClick={() => handleArchiveClaim(viewClaim.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            Arquivar
                        </Button>
                        <Button onClick={() => handleTransferProperty(viewClaim)} className="bg-[#0097A8] hover:bg-[#007F8F]">
                            Aprovar Transferência
                        </Button>
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

// -----------------------------------------------------------------------------
// PÁGINA DE LISTAGEM POR TIPO (SEO OTIMIZADO)
// -----------------------------------------------------------------------------
const TypeListingPage = ({ typeParam, stateParam, cityParam }) => {
  const params = useParams();
  const navigate = useNavigate();
  
  // Prioriza props (RouteResolver) ou URL
  const typeSlug = typeParam || params.type;
  const stateSlug = stateParam || params.state;
  const citySlug = cityParam || params.city;

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Estados dos Filtros (Igual ListingPage)
  const [maxPrice, setMaxPrice] = useState("");
  const [filterCity, setFilterCity] = useState(citySlug || "");
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedPets, setSelectedPets] = useState([]);

  // Dados Auxiliares
  const typeName = ESTABLISHMENT_TYPES.find(t => generateSlug(t) === typeSlug) || typeSlug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const stateName = STATE_NAMES[stateSlug?.toUpperCase()] || stateSlug?.toUpperCase();
  const cityName = citySlug 
      ? citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
      : null;
  // REMOVIDO: "Estado de" para deixar mais natural
  const locationTitle = cityName ? `${cityName}, ${stateName}` : stateName;

  // --- 1. SEO DINÂMICO ---
  const seoTitle = cityName 
    ? `Day Use ${typeName}: Veja ${filteredItems.length} Opções Em ${cityName}!`
    : `Day Use ${typeName}: ${filteredItems.length} Locais em ${stateName}!`;

  const seoDesc = `Procurando ${typeName} em ${locationTitle}? Encontre as melhores opções com piscina, almoço e lazer completo. Compare preços e reserve agora no Mapa do Day Use.`;

  useSEO(seoTitle, seoDesc);

  // --- 2. SCHEMA MARKUP ---
  useSchema({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": seoTitle,
      "description": seoDesc,
      "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mapadodayuse.com" },
              { "@type": "ListItem", "position": 2, "name": stateName, "item": `https://mapadodayuse.com/${stateSlug}` },
              ...(cityName ? [{ "@type": "ListItem", "position": 3, "name": cityName, "item": `https://mapadodayuse.com/${stateSlug}/${citySlug}` }] : []),
              { "@type": "ListItem", "position": cityName ? 4 : 3, "name": typeName }
          ]
      },
      "mainEntity": {
          "@type": "ItemList",
          "itemListElement": filteredItems.map((item, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "url": `https://mapadodayuse.com/${getStateSlug(item.state)}/${generateSlug(item.name)}`,
              "name": item.name
          }))
      }
  });

  // Fetch Inicial (Carrega base de dados do tipo/estado)
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "dayuses"));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        const baseFiltered = data.filter(item => {
            // Filtro Localização
            const matchState = getStateSlug(item.state) === stateSlug?.toLowerCase();
            // Se tiver cidade na URL, filtra aqui. Se não, deixa para o filtro lateral.
            const matchCity = citySlug ? generateSlug(item.city) === citySlug : true;
            
            // Filtro Tipo
            const itemTypeSlug = item.type ? generateSlug(item.type) : null;
            // Fallback para busca textual se o campo type estiver vazio em registros antigos
            const matchType = itemTypeSlug === typeSlug || (!item.type && (item.name + " " + item.description).toLowerCase().includes(typeName.toLowerCase()));

            return matchState && matchCity && matchType;
        });
        
        setItems(baseFiltered);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchItems();
  }, [typeSlug, stateSlug, citySlug]);

  // Lógica de Filtros (Refinamento local)
  useEffect(() => {
    let result = items;
    
    // Filtro de Cidade (Se não veio na URL)
    if (!citySlug && filterCity) result = result.filter(i => generateSlug(i.city) === filterCity);
    
    // Filtros Comuns
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
  }, [items, filterCity, maxPrice, selectedAmenities, selectedMeals, selectedDays, selectedPets, citySlug]);

  const toggleFilter = (list, setList, item) => {
      if (list.includes(item)) setList(list.filter(i => i !== item));
      else setList([...list, item]);
  };
  
  const clearFilters = () => { setMaxPrice(""); setSelectedAmenities([]); setSelectedMeals([]); setSelectedDays([]); setSelectedPets([]); setFilterCity(""); };
  const availableCities = [...new Set(items.map(i => i.city))].sort();

  // Componente Visual de Filtros (Reutilizável Desktop/Mobile)
  const FiltersContent = () => (
      <div className="space-y-6">
          <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-lg"><Filter size={18}/> Filtros</h2>
              <button onClick={clearFilters} className="text-xs text-[#0097A8] font-bold hover:underline">Limpar</button>
          </div>
          
          {/* Se estiver na página do Estado, mostra filtro de cidade. Se estiver na página da Cidade, esconde. */}
          {!citySlug && (
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Cidade</label>
                  <select className="w-full p-2 border rounded-xl text-sm bg-slate-50" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
                      <option value="">Todas as cidades</option>
                      {availableCities.map(c => <option key={c} value={generateSlug(c)}>{c}</option>)}
                  </select>
              </div>
          )}

          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Preço Máximo (Adulto)</label><div className="flex items-center gap-2 border rounded-xl p-2 bg-white"><span className="text-slate-400 text-sm">R$</span><input type="number" placeholder="0,00" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="w-full outline-none text-sm"/></div></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Dias de Funcionamento</label><div className="flex flex-wrap gap-2">{WEEK_DAYS.map((d, i) => (<button key={i} onClick={()=>toggleFilter(selectedDays, setSelectedDays, i)} className={`text-xs px-2 py-1 rounded border transition-colors ${selectedDays.includes(i) ? 'bg-[#0097A8] text-white border-[#0097A8]' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>{d.slice(0,3)}</button>))}</div></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Pensão / Refeições</label>{MEALS_LIST.map(m => (<label key={m} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8] mb-1"><input type="checkbox" checked={selectedMeals.includes(m)} onChange={()=>toggleFilter(selectedMeals, setSelectedMeals, m)} className="accent-[#0097A8] rounded"/> {m}</label>))}</div>
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Pets</label>{["Aceita animais de pequeno porte", "Aceita animais de médio porte", "Aceita animais de grande porte", "Não aceita animais"].map(p => (<label key={p} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8] mb-1"><input type="checkbox" checked={selectedPets.includes(p)} onChange={()=>toggleFilter(selectedPets, setSelectedPets, p)} className="accent-[#0097A8] rounded"/> {p}</label>))}</div>
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Comodidades</label><div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">{AMENITIES_LIST.map(a => (<label key={a} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8]"><input type="checkbox" checked={selectedAmenities.includes(a)} onChange={()=>toggleFilter(selectedAmenities, setSelectedAmenities, a)} className="accent-[#0097A8] rounded"/> {a}</label>))}</div></div>
      </div>
  );

  if (loading) return (
      <div className="max-w-7xl mx-auto py-12 px-4">
          <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse mb-6"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-fade-in">
        
        {/* TÍTULO */}
        <div className="mb-8">
            <span className="text-xs font-bold text-[#0097A8] uppercase tracking-wider bg-cyan-50 px-3 py-1 rounded-full mb-3 inline-block">Categoria</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 capitalize">
                Day Use em <span className="text-[#0097A8]">{typeName}</span>
            </h1>
            <p className="text-slate-500 text-lg">
                {filteredItems.length} opções encontradas em {locationTitle}
            </p>
        </div>

        {/* FILTRO MOBILE */}
        <div className="md:hidden mb-8">
            <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-slate-800 font-bold active:bg-slate-50 transition-colors">
                <span className="flex items-center gap-2"><Filter size={20} className="text-[#0097A8]"/> Filtrar</span>
                <ChevronDown size={20} className={`transition-transform duration-300 ${showMobileFilters ? 'rotate-180' : ''}`}/>
            </button>
            {showMobileFilters && <div className="bg-white p-6 rounded-2xl border border-slate-200 mt-3 shadow-lg animate-fade-in"><FiltersContent /></div>}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
            
            {/* SIDEBAR DESKTOP */}
            <div className="hidden md:block w-1/4 space-y-6 h-fit sticky top-24">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <FiltersContent />
                </div>
            </div>

            {/* LISTA DE CARDS */}
            <div className="flex-1">
                {filteredItems.length === 0 ? (
                    <div className="bg-slate-50 p-12 rounded-[2.5rem] border border-dashed border-slate-300 text-center">
                        <Search size={32} className="mx-auto text-slate-400 mb-4"/>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum local encontrado.</h3>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto">
                            Tente ajustar os filtros ou veja outras opções na região.
                        </p>
                        <Button onClick={clearFilters}>Limpar Filtros</Button>
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
        <Route path="/:state/:type/:city" element={<Layout><TypeListingPage /></Layout>} />
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
                <ProtectedRoute allowedRoles={['partner','admin']}>
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