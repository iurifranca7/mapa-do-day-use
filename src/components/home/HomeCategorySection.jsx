import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DayUseCard from '../DayUseCard';
import SkeletonCard from '../SkeletonCard';
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'; // Adicionei os Chevrons

const HomeCategorySection = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    iconColorClass = "text-cyan-600", 
    bgColorClass = "bg-cyan-100", 
    items, 
    loading, 
    onItemClick 
}) => {
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    // Lógica para controlar a visibilidade das setas
    const checkScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Tolerância de 1px para erros de arredondamento
        const isAtStart = container.scrollLeft <= 0;
        const isAtEnd = Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth;

        setShowLeftArrow(!isAtStart);
        setShowRightArrow(!isAtEnd);
    };

    // Função de Rolagem ao clicar na seta
    const scroll = (direction) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollAmount = 300; // Tamanho aproximado de um card + gap
        const targetScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    };

    // Verifica o scroll inicial e adiciona listener
    useEffect(() => {
        checkScroll();
        // Opcional: Se a lista for pequena e couber tudo na tela, esconde a direita também
        const container = scrollContainerRef.current;
        if(container && container.scrollWidth <= container.clientWidth) {
            setShowRightArrow(false);
        }
    }, [items, loading]);

    if (!loading && items.length === 0) return null;

    return (
        <section className="py-4 relative group/section">
            <div className="flex items-center justify-between mb-2 px-2 md:px-0">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bgColorClass} ${iconColorClass}`}>
                        <Icon size={20}/>
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-none">{title}</h2>
                        <p className="text-slate-500 text-xs md:text-sm mt-1 leading-snug pr-4">{subtitle}</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => navigate('/mapa-do-site')}
                    className="hidden md:flex items-center gap-1 text-sm font-bold text-[#0097A8] hover:bg-cyan-50 px-3 py-1 rounded-lg transition-colors shrink-0"
                >
                    Ver tudo <ArrowRight size={16}/>
                </button>
            </div>

            {/* --- ÁREA DO CARROSSEL --- */}
            <div className="relative">
                
                {/* BOTÃO ESQUERDA (Só Desktop) */}
                {showLeftArrow && (
                    <button 
                        onClick={() => scroll('left')}
                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-100 items-center justify-center text-slate-700 hover:scale-110 transition-all hover:border-[#0097A8] hover:text-[#0097A8]"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                {/* CONTAINER DOS CARDS */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    className="flex gap-4 overflow-x-auto flex-nowrap snap-x snap-mandatory pb-6 pt-2 px-2 md:px-0 -mx-4 md:mx-0 scroll-smooth no-scrollbar"
                >
                    <div className="w-2 shrink-0 md:hidden"></div>

                    {loading 
                        ? Array.from({length:4}).map((_,i) => (
                            <div key={i} className="min-w-[240px] w-[240px] md:min-w-[280px] md:w-[280px] snap-center shrink-0">
                                <SkeletonCard />
                            </div>
                        )) 
                        : items.map(item => (
                            <div key={item.id} className="min-w-[240px] w-[240px] md:min-w-[280px] md:w-[280px] snap-center shrink-0 h-full">
                                <DayUseCard 
                                    item={item} 
                                    onClick={() => onItemClick(item)} 
                                />
                            </div>
                        ))
                    }

                    {!loading && (
                        <div className="min-w-[160px] w-[160px] md:min-w-[200px] md:w-[200px] snap-center shrink-0 flex items-center h-auto">
                            <div 
                                onClick={() => navigate('/quiz')}
                                className="w-full h-[280px] md:h-[300px] border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all group p-4"
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-white group-hover:shadow-md flex items-center justify-center transition-all">
                                    <Sparkles size={24} className="text-slate-400 group-hover:text-[#0097A8]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-700 group-hover:text-[#0097A8] transition-colors">Descobrir o Ideal</h3>
                                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">Faça o Quiz e ache o day use perfeito.</p>
                                </div>
                                <span className="text-xs font-bold text-slate-900 border-b-2 border-slate-200 pb-0.5 group-hover:border-[#0097A8] transition-all">
                                    Iniciar Quiz
                                </span>
                            </div>
                        </div>
                    )}
                    
                    <div className="w-2 shrink-0 md:hidden"></div>
                </div>

                {/* BOTÃO DIREITA (Só Desktop) */}
                {showRightArrow && (
                    <button 
                        onClick={() => scroll('right')}
                        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-100 items-center justify-center text-slate-700 hover:scale-110 transition-all hover:border-[#0097A8] hover:text-[#0097A8]"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>
        </section>
    );
};

export default HomeCategorySection;