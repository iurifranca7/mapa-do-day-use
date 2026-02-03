import React from 'react';
import { MapPin, FileText, CheckCircle, Ban, Info, AlertCircle } from 'lucide-react';
import Accordion from '../Detailspage/Accordion'; // Certifique-se de ter este componente

const DetailsContent = ({ item, getYoutubeId, setGalleryOpen }) => {
  if (!item) return null;

  return (
    <div className="lg:col-span-2 space-y-8 animate-fade-in">
      
      {/* 1. CABEÇALHO (Título e Cidade) */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">{item.name}</h1>
        <p className="flex items-center gap-2 text-slate-500 text-lg font-medium">
          <MapPin size={20} className="text-[#0097A8]"/> {item.city}, {item.state}
        </p>
      </div>

      {/* 2. GRID DE IMAGENS (A Correção Principal) */}
      <div 
        className="grid grid-cols-4 gap-3 h-[400px] md:h-[450px] rounded-[2rem] overflow-hidden shadow-xl cursor-pointer group" 
        onClick={() => setGalleryOpen(true)}
      >
        {/* Imagem Principal (Esquerda) */}
        <div className="col-span-3 relative h-full">
          {item.image ? (
            <img 
              src={item.image} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              alt={item.name}
            />
          ) : (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                Sem Imagem
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
        </div>

        {/* Coluna da Direita (2 Imagens Menores) */}
        <div className="col-span-1 grid grid-rows-2 gap-3 h-full">
          <div className="relative overflow-hidden h-full">
            {item.image2 ? (
                <img src={item.image2} className="w-full h-full object-cover" alt="Detalhe 1"/>
            ) : (
                <div className="w-full h-full bg-slate-100"/>
            )}
          </div>
          <div className="relative overflow-hidden h-full">
            {item.image3 ? (
                <img src={item.image3} className="w-full h-full object-cover" alt="Detalhe 2"/>
            ) : (
                <div className="w-full h-full bg-slate-100"/>
            )}
            {/* Overlay "Ver todas" */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xs md:text-sm hover:bg-black/50 transition-colors">
                Ver fotos
            </div>
          </div>
        </div>
      </div>

      {/* 3. INFORMAÇÕES DETALHADAS */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-10">
        
        {/* Descrição */}
        <section>
          <h2 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2">
            <FileText className="text-[#0097A8]"/> Sobre {item.name}
          </h2>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">
            {item.description}
          </p>
          
          {/* Vídeo do Youtube (Se houver) */}
          {item.videoUrl && getYoutubeId && (
             <div className="mt-6 rounded-2xl overflow-hidden shadow-md aspect-video">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}`} 
                    title="Video Presentation" 
                    frameBorder="0" 
                    allowFullScreen
                ></iframe>
             </div>
          )}
        </section>
        
        {/* O que está incluso (Amenities) */}
        <section>
          <h2 className="font-bold text-xl mb-4 text-slate-900 flex items-center gap-2">
            <CheckCircle className="text-[#0097A8]"/> O que está incluso?
          </h2>
          
          {item.amenities && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 mb-8">
                {item.amenities.flatMap(a => a.split(',')).map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0097A8] shrink-0"></div>
                        <span className="capitalize">{a.trim()}</span>
                    </div>
                ))}
            </div>
          )}
          
          {/* Cards de Alimentação e Permissão de Comida */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Card Alimentação */}
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
              <div className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                 Alimentação
              </div>
              {item.meals && item.meals.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {item.meals.map(m => (
                        <span key={m} className="bg-white px-3 py-1 rounded-full text-[10px] font-black uppercase text-orange-700 border border-orange-200">
                            {m}
                        </span>
                    ))}
                  </div>
              ) : (
                  <p className="text-xs text-slate-500 italic">Vendido separadamente no local.</p>
              )}
            </div>

            {/* Card Pode Levar Comida? */}
            {item.allowFood !== undefined && (
              <div className={`p-5 rounded-2xl border flex items-start gap-3 ${item.allowFood ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                {item.allowFood ? <CheckCircle size={20} className="text-green-600 mt-0.5 shrink-0"/> : <Ban size={20} className="text-red-600 mt-0.5 shrink-0"/>}
                <div>
                  <h4 className={`font-bold text-sm ${item.allowFood ? 'text-green-800' : 'text-red-800'}`}>
                    {item.allowFood ? "Permite levar comida" : "Proibido levar comida"}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    {item.allowFood ? "Consumo próprio liberado em áreas comuns." : "Consulte cardápio do restaurante local."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
        
        {/* Accordions (Regras e Cancelamento) */}
        <div>
            <Accordion title="Regras de Uso" icon={Info}>
                <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">
                    {item.usageRules || "Respeite as áreas comuns e a natureza."}
                </p>
            </Accordion>
            <Accordion title="Política de Cancelamento" icon={AlertCircle}>
                <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">
                    {item.cancellationPolicy || "Cancelamentos aceitos em até 7 dias após a compra."}
                </p>
            </Accordion>
        </div>

      </div>
    </div>
  );
};

export default DetailsContent;