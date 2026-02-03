import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, GripVertical } from 'lucide-react';
import ModalOverlay from './ModalOverlay';
import Button from './Button';

const ReorderProductsModal = ({ isOpen, onClose, products, onSave }) => {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  
  // Refs para controle do touch mobile
  const listRef = useRef(null);
  const touchItem = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Cria cópia local e garante ordenação inicial
      setItems([...products].sort((a, b) => (a.order || 999) - (b.order || 999)));
    }
  }, [isOpen, products]);

  // --- LÓGICA DESKTOP (HTML5 DRAG) ---
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    // Efeito fantasma necessário para Firefox
    e.dataTransfer.effectAllowed = "move"; 
    // Hack para esconder a imagem padrão do drag se quiser, mas nativo é ok
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); // Necessário para permitir o drop
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    // Troca de posição em tempo real
    const newItems = [...items];
    const draggedItem = newItems[draggedItemIndex];
    
    // Remove do index antigo e coloca no novo
    newItems.splice(draggedItemIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setDraggedItemIndex(index);
    setItems(newItems);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  // --- LÓGICA MOBILE (TOUCH EVENTS) ---
  const handleTouchStart = (index) => {
    setDraggedItemIndex(index);
    // Vibração tátil para feedback (se o navegador permitir)
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleTouchMove = (e) => {
    // Impede o scroll da tela enquanto arrasta
    if (e.cancelable) e.preventDefault();

    if (draggedItemIndex === null) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Procura o item da lista (li) mais próximo de onde o dedo está
    const listItem = element?.closest('[data-index]');
    
    if (listItem) {
      const newIndex = parseInt(listItem.getAttribute('data-index'), 10);
      
      if (newIndex !== draggedItemIndex && !isNaN(newIndex)) {
        const newItems = [...items];
        const draggedItem = newItems[draggedItemIndex];
        
        newItems.splice(draggedItemIndex, 1);
        newItems.splice(newIndex, 0, draggedItem);
        
        setDraggedItemIndex(newIndex);
        setItems(newItems);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedItemIndex(null);
  };

  const handleConfirm = async () => {
    setSaving(true);
    await onSave(items);
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Organizar Vitrine</h3>
            <p className="text-xs text-slate-500">Arraste para mudar a ordem.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Lista Arrastável */}
        <div 
            className="flex-1 overflow-y-auto p-2 bg-slate-50/50" 
            ref={listRef}
        >
          <ul className="space-y-2">
            {items.map((item, index) => {
                const isDragging = draggedItemIndex === index;
                
                return (
                    <li
                        key={item.id}
                        data-index={index}
                        draggable
                        
                        // Eventos Desktop
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        
                        // Eventos Mobile (No container inteiro para facilitar)
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}

                        className={`
                            relative flex items-center gap-3 p-3 rounded-xl border transition-all select-none
                            ${isDragging 
                                ? 'bg-white border-[#0097A8] shadow-lg scale-[1.02] z-10 opacity-90' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }
                        `}
                    >
                        {/* Handle (Alça) - Área de Toque Principal */}
                        <div 
                            className="p-2 text-slate-400 cursor-grab active:cursor-grabbing touch-none"
                            onTouchStart={() => handleTouchStart(index)} // Touch começa aqui
                        >
                            <GripVertical size={20} />
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0 pointer-events-none"> {/* pointer-events-none ajuda o touch a passar direto pro li */}
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    #{index + 1}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-2 rounded ${item.status === 'active' ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                                    {item.status === 'active' ? 'Ativo' : 'Pausado'}
                                </span>
                            </div>
                            <p className="font-bold text-sm text-slate-700 truncate mt-1">
                                {item.title}
                            </p>
                            <p className="text-xs text-slate-500">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                            </p>
                        </div>
                    </li>
                );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white z-20">
          <Button onClick={handleConfirm} disabled={saving} className="w-full py-3 flex items-center justify-center gap-2 shadow-lg shadow-teal-100">
            {saving ? 'Salvando...' : <><Check size={18} /> Confirmar Nova Ordem</>}
          </Button>
        </div>
      </div>
    </ModalOverlay>,
    document.body
  );
};

export default ReorderProductsModal;