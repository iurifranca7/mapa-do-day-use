import React from 'react';
import { Tag, MapPin } from 'lucide-react'; 
import { formatBRL } from '../utils/format';
import { GUARDIAN_TYPES } from '../utils/constants';

const DayUseCard = ({ item, onClick }) => {
  
  // Lógica de Cupons
  const getBestAdminCoupon = () => {
      if (!item.coupons || !Array.isArray(item.coupons)) return 0;
      const validCoupons = item.coupons.filter(c => {
          if (c.createdBy !== 'admin') return false;
          if (c.active === false) return false;
          if (c.validUntil && new Date(c.validUntil) < new Date()) return false;
          return true;
      });
      if (validCoupons.length === 0) return 0;
      return Math.max(...validCoupons.map(c => Number(c.percentage)));
  };

  const maxDiscount = getBestAdminCoupon();
  const hasDiscount = maxDiscount > 0;

  // 🔥 LÓGICA DE ADS ALTERADA:
  // Agora ele obedece a uma propriedade explícita 'isSponsored' vinda da Home.
  // Se a Home não mandar 'isSponsored: true', a tag não aparece.
  const isAd = !!item.isSponsored; 

  const getDisplayPrice = () => {
      let minAdult = Infinity;
      let minOther = Infinity;
      if (item.products && Array.isArray(item.products)) {
          item.products.forEach(p => {
              const price = Number(p.price || 0);
              if (price > 0) {
                  if (GUARDIAN_TYPES.includes(p.type)) {
                      if (price < minAdult) minAdult = price;
                  } else {
                      if (price < minOther) minOther = price;
                  }
              }
          });
      }
      if (minAdult !== Infinity) return minAdult;
      const legacy = Number(item.priceAdult || 0);
      if (legacy > 0) return legacy;
      if (minOther !== Infinity) return minOther;
      return 0;
  };

  const priceToDisplay = getDisplayPrice();

  const handleImageError = (e) => {
      e.target.src = "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80"; 
  };

  return (
     <div 
        onClick={onClick} 
        className={`bg-white rounded-2xl shadow-sm border overflow-hidden group flex flex-col h-full relative transition-all active:scale-[0.98] ${isAd ? 'border-slate-200 ring-1 ring-slate-100' : 'border-slate-100'}`}
     >
        <div className="h-40 md:h-48 relative overflow-hidden bg-slate-100 shrink-0">
            <img 
                src={item.image} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={handleImageError} 
                alt={item.name}
            />
            
            {hasDiscount && (
              <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm flex items-center gap-1">
                 <Tag size={10} className="fill-current"/> {maxDiscount}% OFF
              </div>
            )}
        </div>
        
        <div className="p-3 flex flex-col relative gap-2">
           
           <div className="flex flex-col">
               <h2 className="font-bold text-sm md:text-base text-slate-800 leading-tight line-clamp-1">{item.name}</h2>
               <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                   {item.city || 'Minas Gerais'}, {item.state}
               </p>
           </div>
           
           <div className="mt-1 flex items-end justify-between">
               <div className="flex flex-col">
                   <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">A PARTIR DE</span>
                   <div className="flex items-baseline gap-1">
                       <span className="text-xs font-bold text-[#0097A8]">R$</span>
                       <span className="text-lg font-extrabold text-[#0097A8]">
                           {priceToDisplay > 0 ? formatBRL(priceToDisplay).replace('R$', '').trim() : '--'}
                       </span>
                   </div>
               </div>
           </div>

           {/* Tag AD só aparece se isAd (isSponsored) for true */}
           {isAd && (
               <span className="absolute bottom-2 right-2 text-[9px] text-slate-300 font-medium select-none bg-slate-50 px-1 rounded border border-slate-100">
                   Ad
               </span>
           )}
        </div>
     </div>
  );
};

export default DayUseCard;