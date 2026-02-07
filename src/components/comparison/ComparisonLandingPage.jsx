import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore'; 
import { db } from '../../firebase'; 
import useSEO from '../../hooks/useSEO'; 
import useSchema from '../../hooks/useSchema'; 

import ComparisonSearchTool from './ComparisonSearchTool';
import PopularComparisonsGrid from './PopularComparisonsGrid';

const ComparisonLandingPage = () => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca dados iniciais e normaliza imagens
  useEffect(() => {
    const fetchData = async () => {
      try {
         const q = query(collection(db, "dayuses")); 
         const snap = await getDocs(q);
         
         const data = snap.docs.map(d => {
             const raw = d.data();
             // 🔥 Lógica Híbrida: Prioriza array novo, fallback para string antiga
             const displayImage = (raw.images && Array.isArray(raw.images) && raw.images.length > 0) 
                ? raw.images[0] 
                : raw.image;

             return { 
                 name: raw.name, 
                 slug: raw.slug, 
                 city: raw.city, 
                 image: displayImage || "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80" // Fallback seguro
             };
         });
         
         setAllItems(data);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Gera pares de comparação automáticos para a vitrine
  const popularComparisons = [];
  if (!loading && allItems.length > 1) {
      // Embaralha levemente para não mostrar sempre os mesmos
      const shuffled = [...allItems].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < shuffled.length - 1; i += 2) {
          if (popularComparisons.length >= 9) break; // Mostra 9 (grid 3x3)
          popularComparisons.push({
              itemA: shuffled[i],
              itemB: shuffled[i+1],
              url: `/comparativo/${shuffled[i].slug}-vs-${shuffled[i+1].slug}`
          });
      }
  }

  useSEO(
    "Comparador de Day Use | Batalha de Hotéis", 
    "Compare preços e piscinas lado a lado."
  );

  useSchema({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Comparador de Day Use",
    "description": "Ferramenta para comparar preços.",
    "url": "https://mapadodayuse.com/comparativo"
  });

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-20 px-4 animate-fade-in text-center min-h-[80vh] flex flex-col">
        
        {/* HERO HEADER MINIMALISTA */}
        <div className="mb-10 max-w-2xl mx-auto">
            <span className="text-[10px] font-bold text-[#0097A8] uppercase tracking-widest bg-cyan-50 px-3 py-1 rounded-full mb-4 inline-block">
                Ferramenta Gratuita
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                Batalha de Day Uses
            </h1>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
                Coloque dois locais lado a lado e decida qual vale mais a pena para o seu bolso e diversão.
            </p>
        </div>

        {/* FERRAMENTA DE BUSCA */}
        <ComparisonSearchTool allItems={allItems} />

        {/* VITRINE */}
        {!loading && <PopularComparisonsGrid comparisons={popularComparisons} />}
    </div>
  );
};

export default ComparisonLandingPage;