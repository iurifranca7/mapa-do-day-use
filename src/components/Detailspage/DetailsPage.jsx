import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

// Firebase
import { collection, query, where, getDocs, doc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from "../../firebase";
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Ícones e Componentes
import { 
  MapPin, FileText, CheckCircle, Ban, PawPrint, Info, 
  AlertCircle, Briefcase, ArrowRight, Lock, Ticket
} from 'lucide-react';
import { formatBRL, getYoutubeId, getStateSlug, generateSlug } from '../../utils/format';
import Button from './../Button';
import ModalOverlay from './../ModalOverlay';
import SuccessModal from './../SuccessModal';
import ImageGallery from '../Detailspage/ImageGallery';
import Accordion from '../Detailspage/Accordion';
import BookingCard from '../Detailspage/BookingCard';
import DetailsContent from '../Detailspage/DetailsContent';
import { useSEO, useSchema } from '../../hooks/useSEO';
import { notifyAdminNewClaim } from '../../utils/notifications';

const DetailsPage = () => {
  const { state: stateParam, slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const idParam = location.state?.id;

  // States de Dados
  const [item, setItem] = useState(null);
  const [products, setProducts] = useState([]);
  const [relatedItems, setRelatedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // States de Autenticação (CORREÇÃO: Estado local em vez de Contexto)
  const [user, setUser] = useState(null);

  // States de UI
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(null);

  // States do Formulário de Claim
  const [claimForm, setClaimForm] = useState({ name: '', email: '', phone: '', role: '' });
  const [isClaiming, setIsClaiming] = useState(false);

  // States de Seleção (BookingCard)
  const [date, setDate] = useState("");

  try { useSEO(item ? item.name : "Carregando...", item ? item.description : ""); } catch(e) {}

  // 1. MONITORAR AUTENTICAÇÃO (CORREÇÃO)
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. FETCH DATA
  useEffect(() => {
    setLoading(true);
    let unsubDayUse = () => {};
    let unsubProducts = () => {};

    const fetchData = async () => {
      try {
        let docId = idParam;
        if (!docId && slug) {
          const q = query(collection(db, "dayuses"), where("slug", "==", slug)); 
          const snap = await getDocs(q);
          if (!snap.empty) docId = snap.docs[0].id;
        }

        if (docId) {
          unsubDayUse = onSnapshot(doc(db, "dayuses", docId), (docSnap) => {
              if (docSnap.exists()) {
                  const data = { id: docSnap.id, ...docSnap.data() };
                  setItem(data);
                  
                  if (data.city && relatedItems.length === 0) {
                      const qRel = query(collection(db, "dayuses"), where("city", "==", data.city));
                      getDocs(qRel).then(snapRel => {
                          setRelatedItems(snapRel.docs.map(d => ({id: d.id, ...d.data()})).filter(i => i.id !== data.id).slice(0, 3));
                      });
                  }

                  if (data.ownerId) {
                      const qProd = query(collection(db, "products"), where("ownerId", "==", data.ownerId));
                      unsubProducts = onSnapshot(qProd, (snapProd) => {
                          const prodsList = snapProd.docs.map(d => ({id: d.id, ...d.data()})).filter(p => p.dayUseId === data.id);
                          setProducts(prodsList);
                      });
                  }
              }
              setLoading(false);
          });
        } else { setLoading(false); }
      } catch (error) { console.error(error); setLoading(false); }
    };
    fetchData();
    return () => { unsubDayUse(); unsubProducts(); };
  }, [slug, idParam]);

  // 3. ENVIO DA SOLICITAÇÃO (CLAIM)
  const handleClaimSubmit = async (e) => {
      e.preventDefault();
      
      if (!claimForm.name || !claimForm.email || !claimForm.phone || !claimForm.role) {
          alert("Por favor, preencha todos os campos para continuar.");
          return;
      }

      setIsClaiming(true);
      try {
          const claimData = {
              dayUseId: item.id,
              dayUseName: item.name,
              dayUseCity: item.city,
              claimantName: claimForm.name,
              claimantEmail: claimForm.email,
              claimantPhone: claimForm.phone,
              claimantRole: claimForm.role,
              status: 'pending',
              createdAt: new Date()
          };

          await addDoc(collection(db, "property_claims"), claimData);
          notifyAdminNewClaim(claimData); // Envia E-mail

          setShowClaimModal(false);
          setShowClaimSuccess(true);
          setClaimForm({ name: '', email: '', phone: '', role: '' }); 
      } catch (error) {
          console.error("Erro ao solicitar administração:", error);
          alert("Ocorreu um erro ao enviar sua solicitação.");
      } finally {
          setIsClaiming(false);
      }
  };

  const handleBook = (bookingPayload) => {
    if (bookingPayload && bookingPayload.cartItems) {
        navigate('/checkout', { 
            state: { 
                bookingData: { 
                    ...item, date: bookingPayload.date, total: bookingPayload.total, cartItems: bookingPayload.cartItems,
                    dayuseId: item.id, ownerId: item.ownerId, adults: bookingPayload.cartItems.length, priceSnapshot: { adult: 0 }
                } 
            } 
        });
    }
  };

  const PausedMessage = () => (
    <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6 sticky top-24">
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
                <div key={related.id} onClick={() => navigate(`/${getStateSlug(related.state)}/${generateSlug(related.name)}`, {state: {id: related.id}})} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-[#0097A8] cursor-pointer bg-slate-50 hover:bg-white group transition-all">
                    <img src={related.image} className="w-16 h-16 rounded-lg object-cover bg-gray-200 shrink-0"/>
                    <div className="flex-1 min-w-0 text-left"><h4 className="font-bold text-slate-800 text-sm truncate">{related.name}</h4><p className="text-xs text-[#0097A8] font-bold mt-1">A partir de {formatBRL(related.priceAdult)}</p></div>
                    <div className="text-[#0097A8] opacity-0 group-hover:opacity-100 transition-opacity pr-2"><ArrowRight size={16}/></div>
                </div>
            )) : <Button onClick={() => navigate('/')} className="w-full py-3 text-sm shadow-lg shadow-teal-100/50">Ver todos os Day Uses</Button>}
        </div>
    </div>
  );

  if (loading || !item) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#0097A8] border-t-transparent rounded-full animate-spin"/></div>;

  const allProductsPaused = products.length > 0 && products.every(p => p.status === 'paused');
  const isLocallyPaused = item.paused || allProductsPaused;
  const activeProducts = products.filter(p => p.status === 'active');

  return (
    <div className="max-w-7xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
      <ImageGallery images={[item.image, item.image2, item.image3].filter(Boolean)} isOpen={galleryOpen} onClose={()=>setGalleryOpen(false)} /> 
      
      {showClaimSuccess && createPortal(<SuccessModal isOpen={showClaimSuccess} onClose={() => setShowClaimSuccess(false)} title="Solicitação Enviada!" message="Recebemos seus dados. Entraremos em contato em breve." actionLabel="Entendi" onAction={() => setShowClaimSuccess(false)} />, document.body)}
      
      {/* MODAL DE SOLICITAÇÃO */}
      {showClaimModal && createPortal(
        <ModalOverlay onClose={() => setShowClaimModal(false)}>
            <div className="bg-white p-8 rounded-3xl w-full max-w-md animate-fade-in">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-teal-50 text-[#0097A8] rounded-full flex items-center justify-center mx-auto mb-3"><Briefcase size={24}/></div>
                    <h3 className="font-bold text-xl text-slate-900">Solicitar Administração</h3>
                    <p className="text-sm text-slate-500 mt-2">Preencha abaixo para comprovar que é o responsável pelo <strong>{item.name}</strong>.</p>
                </div>
                <form onSubmit={handleClaimSubmit} className="space-y-3">
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Seu Nome Completo</label><input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8] bg-slate-50 focus:bg-white transition-colors" placeholder="Ex: João da Silva" value={claimForm.name} onChange={e => setClaimForm({...claimForm, name: e.target.value})} required /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Cargo / Função</label><select className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8] bg-slate-50 focus:bg-white transition-colors appearance-none" value={claimForm.role} onChange={e => setClaimForm({...claimForm, role: e.target.value})} required><option value="">Selecione...</option><option value="Proprietário">Proprietário(a)</option><option value="Gerente">Gerente Geral</option><option value="Financeiro">Financeiro</option><option value="Marketing">Marketing</option><option value="Outro">Outro</option></select></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Telefone</label><input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8] bg-slate-50 focus:bg-white transition-colors" placeholder="(00) 00000-0000" value={claimForm.phone} onChange={e => setClaimForm({...claimForm, phone: e.target.value})} required /></div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mail Corporativo</label><input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8] bg-slate-50 focus:bg-white transition-colors" placeholder="seu@email.com" type="email" value={claimForm.email} onChange={e => setClaimForm({...claimForm, email: e.target.value})} required /></div>
                    <Button type="submit" className="w-full py-3 mt-2 shadow-lg shadow-teal-100" disabled={isClaiming}>{isClaiming ? 'Enviando...' : 'Enviar Solicitação'}</Button>
                    <button type="button" onClick={() => setShowClaimModal(false)} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2 font-medium">Cancelar</button>
                </form>
            </div>
        </ModalOverlay>, document.body
      )}

      {showWarning && createPortal(<ModalOverlay onClose={() => setShowWarning(null)}><div className="bg-white p-8 rounded-3xl text-center"><AlertCircle className="mx-auto mb-4 text-yellow-500" size={32}/><h2 className="font-bold mb-2">{showWarning.title}</h2><p className="text-sm text-slate-600 mb-4">{showWarning.msg}</p><Button onClick={()=>setShowWarning(null)} className="w-full">Entendi</Button></div></ModalOverlay>, document.body)}

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-8">
            <div><h1 className="text-4xl font-bold text-slate-900 mb-2">{item.name}</h1><p className="flex items-center gap-2 text-slate-500 text-lg"><MapPin size={20} className="text-[#0097A8]"/> {item.city}, {item.state}</p></div>
            <div className="grid grid-cols-4 gap-3 h-[400px] rounded-[2rem] overflow-hidden shadow-lg cursor-pointer group" onClick={()=>setGalleryOpen(true)}>
                <div className="col-span-3 relative h-full">{item.image ? <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/> : <div className="w-full h-full bg-slate-200"/>}<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div></div>
                <div className="col-span-1 grid grid-rows-2 gap-3 h-full"><div className="relative overflow-hidden h-full">{item.image2 ? <img src={item.image2} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-100"/>}</div><div className="relative overflow-hidden h-full">{item.image3 ? <img src={item.image3} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-slate-100"/>}<div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm hover:bg-black/50 transition-colors">Ver fotos</div></div></div>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
               <div><h2 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><FileText className="text-[#0097A8]"/> Sobre {item.name}</h2><p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">{item.description}</p></div>
               {item.videoUrl && (<div className="rounded-2xl overflow-hidden shadow-md aspect-video"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}`} title="Video" frameBorder="0" allowFullScreen></iframe></div>)}
               <div><h2 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2"><CheckCircle className="text-[#0097A8]"/> O que está incluso?</h2>{item.amenities && (<div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 mb-6">{item.amenities.flatMap(a=>a.split(',')).map((a,i)=>(<div key={i} className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-[#0097A8]"></div><span className="capitalize">{a.trim()}</span></div>))}</div>)}<div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4"><div className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Alimentação</div>{item.meals && item.meals.length > 0 ? (<div className="flex flex-wrap gap-2">{item.meals.map(m => (<span key={m} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-orange-700 border border-orange-200">{m}</span>))}</div>) : <p className="text-sm text-slate-500 italic">Não incluso.</p>}</div>{item.allowFood !== undefined && (<div className={`p-4 rounded-2xl border flex items-start gap-3 ${item.allowFood ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>{item.allowFood ? <CheckCircle size={24} className="text-green-600 mt-0.5 shrink-0"/> : <Ban size={24} className="text-red-600 mt-0.5 shrink-0"/>}<div><h4 className={`font-bold text-sm mb-1 ${item.allowFood ? 'text-green-800' : 'text-red-800'}`}>{item.allowFood ? "Pode levar comida/bebida" : "Proibido levar comida/bebida"}</h4><p className={`text-xs opacity-90 ${item.allowFood ? 'text-green-700' : 'text-red-700'}`}>{item.allowFood ? "Consumo próprio liberado." : "O local possui restaurante/bar."}</p></div></div>)}</div>
               <div className="pt-4 border-t border-slate-100"><h2 className="font-bold text-red-500 mb-2 flex items-center gap-2 text-lg"><Ban size={18}/> Não incluso</h2><p className="text-slate-600 text-sm whitespace-pre-line">{item.notIncludedItems || "Nada específico."}</p></div>
               <Accordion title="Regras" icon={Info}><p className="text-slate-600 text-sm whitespace-pre-line">{item.usageRules || "Sem regras."}</p></Accordion>
               <Accordion title="Cancelamento" icon={AlertCircle}><p className="text-slate-600 text-sm whitespace-pre-line">{item.cancellationPolicy || "Consulte."}</p></Accordion>
            </div>
         </div>
         <div className="lg:col-span-1 h-fit sticky top-24">
            {/* CORREÇÃO: Passando o usuário autenticado para o BookingCard */}
            {isLocallyPaused ? <PausedMessage /> : <BookingCard item={item} products={activeProducts} date={date} setDate={setDate} handleBook={handleBook} availableSpots={Number(item.capacityAdults || 999)} isSoldOut={false} isTimeBlocked={false} checkingStock={false} user={user} />}
         </div>
      </div>
    </div>
  );
};

export default DetailsPage;