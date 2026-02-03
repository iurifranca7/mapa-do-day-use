import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ImageGallery = ({ images = [], isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Bloqueia scroll do body quando o modal está aberto
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const next = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1 === images.length ? 0 : prev + 1));
  };

  const prev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Botão Fechar */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 z-[110]"
      >
        <X size={32} />
      </button>

      {/* Contador */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-white/50 text-sm font-medium">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Imagem Principal */}
      <div className="relative max-w-5xl w-full h-[80vh] flex items-center justify-center p-4">
        {images.length > 1 && (
          <>
            <button 
              onClick={prev}
              className="absolute left-4 md:-left-16 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
            >
              <ChevronLeft size={30} />
            </button>
            <button 
              onClick={next}
              className="absolute right-4 md:-right-16 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
            >
              <ChevronRight size={30} />
            </button>
          </>
        )}

        <img 
          src={images[currentIndex]} 
          alt={`Visualização ${currentIndex}`}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Miniaturas (Desktop) */}
      <div className="absolute bottom-10 flex gap-2 overflow-x-auto px-4 max-w-full">
        {images.map((img, idx) => (
          <button 
            key={idx}
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
            className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
              currentIndex === idx ? 'border-[#0097A8] scale-110 shadow-lg' : 'border-transparent opacity-50'
            }`}
          >
            <img src={img} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default ImageGallery;