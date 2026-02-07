import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { collection, query, getDocs, where } from 'firebase/firestore'; 
import { db } from '../../firebase'; 
import { Search, Edit, X, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react';

// Hooks personalizados
import useSEO from '../../hooks/useSEO'; 
import useSchema from '../../hooks/useSchema'; 

// Componentes
import Button from '../Button';
import FeedbackModal from '../FeedbackModal'; 
import ModalOverlay from '../ModalOverlay';   
import ComparisonTable from './ComparisonTable'; // 🔥 Import da Tabela

// Constantes Padronizadas
import { STATE_NAMES, AMENITIES_LIST } from '../../utils/constants'; // 🔥 Import das Constantes

// Helper local (ou pode vir do utils/format.js)
const getStateSlug = (state) => state ? state.toLowerCase() : 'mg'; 

const getImage = (item) => {
    if (!item) return "";
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        return item.images[0]; 
    }
    return item.image || ""; 
};

const ComparisonPage = () => {
  const { slugs } = useParams(); 
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Busca
  const [allSearchItems, setAllSearchItems] = useState([]);
  const [searchSlot, setSearchSlot] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Modais
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
         // 1. Busca os Day Uses pelos Slugs
         const q = query(collection(db, "dayuses"), where("slug", "in", [slug1, slug2]));
         const snap = await getDocs(q);
         const basicItems = snap.docs.map(d => ({id: d.id, ...d.data()}));

         // 2. 🔥 BUSCA OS PRODUTOS DE CADA UM (Correção de Preço)
         const fullItems = await Promise.all(basicItems.map(async (dayUse) => {
             let products = [];
             try {
                 // A) Busca na Raiz (Novo Padrão)
                 const qRoot = query(collection(db, "products"), where("dayUseId", "==", dayUse.id));
                 const snapRoot = await getDocs(qRoot);
                 if (!snapRoot.empty) {
                     products = snapRoot.docs.map(p => p.data());
                 } else {
                     // B) Fallback Subcoleção
                     const qSub = collection(db, "dayuses", dayUse.id, "products");
                     const snapSub = await getDocs(qSub);
                     products = snapSub.docs.map(p => p.data());
                 }
             } catch (err) {
                 console.warn("Erro ao buscar produtos compare:", err);
             }
             return { ...dayUse, products };
         }));

         setItems(fullItems);

         // Carrega lista para troca
         const qAll = query(collection(db, "dayuses")); 
         const snapAll = await getDocs(qAll);
         setAllSearchItems(snapAll.docs.map(d => ({ 
             name: d.data().name, 
             slug: d.data().slug, 
             city: d.data().city, 
             state: d.data().state,
             image: d.data().image,
             images: d.data().images 
         })));

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

  let seoTitle = "Comparativo";
  if (item1 && item2) seoTitle = `${item1.name} vs ${item2.name}`;
  useSEO(seoTitle, "Compare preços e comodidades.");

  useSchema(item1 && item2 ? {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `Comparativo: ${item1.name} vs ${item2.name}`,
      "itemListElement": [
          { "@type": "ListItem", "position": 1, "item": { "@type": "LodgingBusiness", "name": item1.name } },
          { "@type": "ListItem", "position": 2, "item": { "@type": "LodgingBusiness", "name": item2.name } }
      ]
  } : null);

  const handleSelectCompetitor = (newSlug) => { 
      if (searchSlot === 'slot1') navigate(`/comparativo/${newSlug}-vs-${slug2}`); 
      else navigate(`/comparativo/${slug1}-vs-${newSlug}`); 
      setSearchSlot(null); setSearchTerm(""); 
  };
  
  const renderSearchModal = () => (
      <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col pt-20 px-4 animate-fade-in">
          <div className="max-w-md mx-auto w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-800">Trocar {searchSlot === 'slot1' ? 'Opção 1' : 'Opção 2'}</h3>
                <button onClick={() => setSearchSlot(null)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="bg-white border-2 border-[#0097A8] rounded-2xl p-2 flex items-center shadow-lg">
                <Search className="text-[#0097A8] ml-2" size={20}/>
                <input 
                    autoFocus 
                    className="w-full p-2 outline-none font-bold text-slate-700" 
                    placeholder="Digite o nome..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
            <div className="mt-4 space-y-2">
                {searchResults.map(res => (
                    <div key={res.slug} onClick={() => handleSelectCompetitor(res.slug)} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-[#0097A8] cursor-pointer">
                        <img src={getImage(res)} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                        <div>
                            <p className="font-bold text-sm text-slate-800">{res.name}</p>
                            <p className="text-xs text-slate-500">{res.city}</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Carregando...</div>;
  if (items.length < 2) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-500"><p>Ops! Local não encontrado.</p><Button onClick={() => navigate('/')}>Voltar ao Início</Button></div>;

  return (
    <div className="min-h-screen bg-white pb-20 animate-fade-in">
       {feedback && createPortal(<FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback.type} title={feedback.title} msg={feedback.msg} />, document.body)}
       {searchSlot && createPortal(renderSearchModal(), document.body)}

       {/* HEADER NAV */}
       <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
           <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ArrowLeft size={20}/></button>
           <span className="font-bold text-sm text-slate-500 uppercase tracking-widest">Comparativo</span>
           <div className="w-9"></div> 
       </div>

       <div className="max-w-3xl mx-auto px-4 pt-6">
           {/* ÁREA DE DUELO */}
           <div className="flex items-stretch gap-2 mb-8 relative">
               <div className="flex-1 flex flex-col gap-3 group">
                   <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 shadow-sm border border-slate-100">
                       <img src={getImage(item1)} className="w-full h-full object-cover" alt={item1.name} />
                       <button 
                           onClick={() => setSearchSlot('slot1')}
                           className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-lg text-slate-600 shadow-sm hover:text-[#0097A8] hover:scale-105 transition-all backdrop-blur-sm"
                       >
                           <ArrowLeftRight size={16} />
                       </button>
                   </div>
                   <div className="text-center">
                       <h2 className="font-bold text-slate-900 leading-tight text-sm md:text-lg mb-2">{item1.name}</h2>
                       <Button onClick={() => navigate(`/${getStateSlug(item1.state)}/${item1.slug}`)} className="w-full py-2 text-xs h-8 bg-[#0097A8]">Ver Detalhes</Button>
                   </div>
               </div>

               <div className="flex flex-col justify-center items-center relative z-10 -mx-2">
                   <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shadow-lg border-2 border-white">VS</div>
               </div>

               <div className="flex-1 flex flex-col gap-3 group">
                   <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 shadow-sm border border-slate-100">
                       <img src={getImage(item2)} className="w-full h-full object-cover" alt={item2.name} />
                       <button 
                           onClick={() => setSearchSlot('slot2')}
                           className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-lg text-slate-600 shadow-sm hover:text-[#0097A8] hover:scale-105 transition-all backdrop-blur-sm"
                       >
                           <ArrowLeftRight size={16} />
                       </button>
                   </div>
                   <div className="text-center">
                       <h2 className="font-bold text-slate-900 leading-tight text-sm md:text-lg mb-2">{item2.name}</h2>
                       <Button onClick={() => navigate(`/${getStateSlug(item2.state)}/${item2.slug}`)} className="w-full py-2 text-xs h-8 bg-[#0097A8]">Ver Detalhes</Button>
                   </div>
               </div>
           </div>

           {/* TABELA DE DADOS (Passando os produtos buscados) */}
           <ComparisonTable 
              item1={item1} 
              item2={item2} 
              getStateSlug={getStateSlug} 
              stateNames={STATE_NAMES}       
              amenitiesList={AMENITIES_LIST} 
           />

           <div onClick={() => navigate('/quiz')} className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-center text-white shadow-xl relative overflow-hidden cursor-pointer">
               <h2 className="font-bold text-xl mb-2 relative z-10">Ainda na dúvida?</h2>
               <p className="text-sm text-indigo-100 mb-4 relative z-10">Nossa IA escolhe pra você.</p>
               <span className="inline-block bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm relative z-10">Fazer Quiz Rápido</span>
           </div>
       </div>
    </div>
  );
};

export default ComparisonPage;