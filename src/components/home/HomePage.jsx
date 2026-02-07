import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, where } from 'firebase/firestore'; 
import { db } from '../../firebase'; // Ajuste o caminho
import { Smile, Utensils, PawPrint, ThermometerSun, Flame } from 'lucide-react';

// Hooks
import useSEO from '../../hooks/useSEO'; // Ajuste o caminho
import useSchema from '../../hooks/useSchema'; // Ajuste o caminho

// Componentes
import DayUseCard from '../DayUseCard';
import Button from '../Button';
import HomeHero from './HomeHero';
import HomeSearchBar from './HomeSearchBar';
import HomeCategorySection from './HomeCategorySection';
import HomeQuizBanner from './HomeQuizBanner';
import HomeHeader from './HomeHeader';

// Helpers (Pode mover para utils/stringUtils.js depois)
// Helper simples de texto
const normalizeText = (text) => {
    return text
      ? text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "")
      : "";
};

const getStateSlug = (state) => state ? state.toLowerCase() : 'mg'; 
const generateSlug = (name) => name ? normalizeText(name).replace(/\s+/g, '-') : '';

const HomePage = () => {
  useSEO("Home", "Encontre e reserve os melhores day uses em hotéis e resorts.");
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useSchema({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "Mapa do Day Use",
        "url": "https://mapadodayuse.com"
      }
    ]
  });

  useEffect(() => { 
      const loadData = async () => {
          // Versão do cache (mude se alterar estrutura de dados)
          const currentVersion = 'v1.2'; 
          const cached = localStorage.getItem('dayuses_min_cache');
          const cachedVer = localStorage.getItem('dayuses_cache_ver');

          if (cached && cachedVer === currentVersion) {
              try {
                  const parsedCache = JSON.parse(cached);
                  if (parsedCache.length > 0 && Array.isArray(parsedCache[0].products)) {
                      setItems(parsedCache);
                      setLoading(false);
                  }
              } catch (e) {
                  localStorage.removeItem('dayuses_min_cache');
              }
          }

          try {
              const q = query(collection(db, "dayuses"));
              const snap = await getDocs(q);
              const basicDayUses = snap.docs.map(d => ({id: d.id, ...d.data()}));
              
              const fullData = await Promise.all(basicDayUses.map(async (dayUse) => {
                  try {
                      let products = [];
                      const qRoot = query(collection(db, "products"), where("dayUseId", "==", dayUse.id));
                      const snapRoot = await getDocs(qRoot);
                      
                      if (!snapRoot.empty) {
                          products = snapRoot.docs.map(p => ({ id: p.id, ...p.data() }));
                      } else {
                          const subRef = collection(db, "dayuses", dayUse.id, "products");
                          const snapSub = await getDocs(subRef);
                          if (!snapSub.empty) {
                              products = snapSub.docs.map(p => ({ id: p.id, ...p.data() }));
                          }
                      }

                      return { ...dayUse, products: products };
                  } catch (err) {
                      return { ...dayUse, products: [] };
                  }
              }));
              
              const minifiedData = fullData.map(item => {
                  const displayImage = (item.images && item.images.length > 0) ? item.images[0] : item.image;

                  return {
                      id: item.id,
                      name: item.name,
                      city: item.city,
                      state: item.state,
                      image: displayImage, 
                      priceAdult: item.priceAdult, 
                      products: item.products || [], 
                      amenities: item.amenities || [],
                      meals: item.meals || [], // Importante para o filtro de comida
                      petAllowed: item.petAllowed,
                      paused: item.paused,
                      coupons: item.coupons || [],
                      adsExpiry: item.adsExpiry || null 
                  };
              });

              setItems(minifiedData); 

              try {
                  localStorage.setItem('dayuses_min_cache', JSON.stringify(minifiedData));
                  localStorage.setItem('dayuses_cache_ver', currentVersion);
              } catch (e) {}

          } catch (err) {
              console.error("Erro home:", err);
          } finally {
              setLoading(false); 
          }
      };

      loadData();
  }, []);

  // --- LÓGICA DE FILTROS E ORDENAÇÃO ---

  // Filtra itens ativos (Vendas Abertas)
  const activeItems = items.filter(i => !i.paused); 

 // --- LÓGICA DE FILTROS E ORDENAÇÃO ---

  // Helper de Ordenação Inteligente:
  // 1. Prioridade: Vendas Abertas (!paused)
  // 2. Prioridade: Score de Relevância (se houver)
  const smartSort = (list) => {
      return list.sort((a, b) => {
          if (!!a.paused !== !!b.paused) return a.paused ? 1 : -1;
          if (a._sortScore !== b._sortScore) return (b._sortScore || 0) - (a._sortScore || 0);
          return 0;
      });
  };

  const getItemsWithScore = (list, field, keywords) => {
      return list.map(item => {
          const itemValues = Array.isArray(item[field]) ? item[field] : [];
          const matchCount = itemValues.filter(val => 
              keywords.some(k => val.toLowerCase().includes(k))
          ).length;
          return matchCount > 0 ? { ...item, _sortScore: matchCount } : null;
      }).filter(Boolean);
  };

  // 1. MAIS VISITADOS (Vitrine com Ads)
  const activeOnlyItems = items.filter(i => !i.paused);
  
  // 🔥 AQUI ESTÁ A MÁGICA DO "AD":
  // Filtramos os Ads e injetamos a propriedade isSponsored: true
  const adItems = activeOnlyItems
      .filter(i => i.adsExpiry && new Date(i.adsExpiry) > new Date())
      .map(i => ({ ...i, isSponsored: true })); 

  // Itens normais (não ads ou ads vencidos) -> isSponsored undefined (falso)
  const regularItems = activeOnlyItems.filter(i => !i.adsExpiry || new Date(i.adsExpiry) <= new Date());
  
  // Junta tudo: Ads primeiro (com tag), Normais depois (sem tag)
  const mostVisitedItems = [...adItems, ...regularItems].slice(0, 8);


  // 2. COMER À VONTADE (Aqui NÃO injetamos isSponsored, então nunca aparecerá a tag)
  const foodKeywords = ['café da manhã', 'almoço', 'jantar', 'buffet', 'café da tarde', 'sobremesa', 'bebida'];
  const foodScored = getItemsWithScore(items, 'meals', foodKeywords); 
  const foodItems = smartSort(foodScored).slice(0, 8);

  // 3. FAMÍLIA 
  const familyKeywords = [
      'piscina infantil', 'playground', 'espaço kids', 'fazendinha', 'animais', 
      'recreação', 'tirolesa', 'cama elástica', 'monitor', 'vale jurássico', 'kids'
  ];
  const familyScored = getItemsWithScore(items, 'amenities', familyKeywords);
  const familyItems = smartSort(familyScored).slice(0, 8);

  // 4. ÁGUAS QUENTINHAS
  const heatedKeywords = ['aquecida', 'climatizada', 'termal', 'ofurô', 'hidro'];
  const heatedRaw = items.filter(i => 
      Array.isArray(i.amenities) && i.amenities.some(a => heatedKeywords.some(k => a.toLowerCase().includes(k)))
  );
  const heatedPoolItems = smartSort(heatedRaw).slice(0, 8);

  // 5. PET FRIENDLY
  const petRaw = items.filter(i => i.petAllowed);
  const petItems = smartSort(petRaw).slice(0, 8);


  // Lógica de Busca Textual
  const searchResults = searchTerm 
    ? items.filter(i => {
        const term = normalizeText(searchTerm);
        const name = normalizeText(i.name);
        const city = normalizeText(i.city);
        return name.includes(term) || city.includes(term);
    })
    : [];

  const handleCardClick = (item) => {
      navigate(`/${getStateSlug(item.state)}/${generateSlug(item.name)}`, {state: {id: item.id}});
  };

  return (
    <div className="pb-24 animate-fade-in min-h-screen bg-white">
      
      {/* HEADER FIXO */}
      <HomeHeader searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {/* Espaçamento reduzido entre header e conteúdo (pt-4) e entre categorias (space-y-6) */}
      <div className="max-w-7xl mx-auto px-4 pt-4 space-y-6">
        
        {searchTerm ? (
            <div className="mb-12">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Resultados para "{searchTerm}"</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {searchResults.map(item => (
                        <DayUseCard key={item.id} item={item} onClick={() => handleCardClick(item)} />
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
            <>
                {/* 1. MAIS VISITADOS */}
                <HomeCategorySection 
                    title="Mais Visitados"
                    subtitle="Os destinos favoritos dos nossos viajantes."
                    icon={Flame}
                    bgColorClass="bg-red-100"
                    iconColorClass="text-red-600"
                    items={mostVisitedItems}
                    loading={loading}
                    onItemClick={handleCardClick}
                />

                {/* 2. COMER À VONTADE */}
                <HomeCategorySection 
                    title="Day uses para comer à vontade"
                    subtitle="Opções com café da manhã, almoço ou buffet inclusos."
                    icon={Utensils}
                    bgColorClass="bg-green-100"
                    iconColorClass="text-green-600"
                    items={foodItems}
                    loading={loading}
                    onItemClick={handleCardClick}
                />

                {/* 3. FAMÍLIA */}
                <HomeCategorySection 
                    title="Pra ir com a família inteira"
                    subtitle="Diversão garantida: Fazendinha, Recreação e muito mais."
                    icon={Smile}
                    bgColorClass="bg-orange-100"
                    iconColorClass="text-orange-600"
                    items={familyItems}
                    loading={loading}
                    onItemClick={handleCardClick}
                />

                {/* 4. ÁGUAS QUENTINHAS */}
                <HomeCategorySection 
                    title="Águas Quentinhas"
                    subtitle="Piscinas aquecidas ou climatizadas para relaxar."
                    icon={ThermometerSun}
                    bgColorClass="bg-blue-100" // Mudei pra azul claro pois lembra água
                    iconColorClass="text-blue-600"
                    items={heatedPoolItems}
                    loading={loading}
                    onItemClick={handleCardClick}
                />

                {/* 5. PET FRIENDLY */}
                <HomeCategorySection 
                    title="Pra levar seu pet"
                    subtitle="Seu melhor amigo é bem-vindo nestes locais."
                    icon={PawPrint}
                    bgColorClass="bg-rose-100" // Cor diferente para destacar
                    iconColorClass="text-rose-600"
                    items={petItems}
                    loading={loading}
                    onItemClick={handleCardClick}
                />
                
                <HomeQuizBanner />
            </>
        )}
      </div>
    </div>
  );
};

export default HomePage;