import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden h-full flex flex-col">
      {/* 1. Imagem (Altura ajustada para o novo padrão) */}
      <div className="h-40 md:h-48 bg-slate-200 animate-pulse shrink-0" />
      
      {/* 2. Conteúdo (Padding reduzido para p-3) */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        
        {/* Título e Cidade */}
        <div className="flex flex-col gap-2">
            {/* Título (barra mais grossa) */}
            <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
            {/* Cidade (barra mais fina) */}
            <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
        </div>

        {/* Espaço flexível para empurrar o preço para baixo (se necessário) */}
        <div className="mt-auto pt-2 flex items-end justify-between">
            <div className="flex flex-col gap-1">
                {/* Texto "A partir de" */}
                <div className="h-2 bg-slate-100 rounded w-16 animate-pulse" />
                {/* Preço (barra grossa azulada/cinza) */}
                <div className="h-6 bg-slate-200 rounded w-24 animate-pulse" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;