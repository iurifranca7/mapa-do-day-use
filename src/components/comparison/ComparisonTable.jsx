import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Minus } from 'lucide-react'; // Ícones mais limpos
import { formatBRL } from '../../utils/format'; 

const ComparisonTable = ({ 
    item1, 
    item2, 
    getStateSlug, 
    stateNames,     
    amenitiesList   
}) => {
  const navigate = useNavigate();

  // Função para calcular o menor preço
  const getLowestPrice = (item, type) => {
      let minPrice = Infinity;
      const adultTypes = ['adult', 'combo_adult', 'mix_ac', 'mix_suite', 'super_mix'];

      if (item.products && Array.isArray(item.products) && item.products.length > 0) {
          item.products.forEach(p => {
              const price = Number(p.price || 0);
              if (price > 0) {
                  const pType = p.type || 'unknown';
                  if (type === 'adult') {
                      if (adultTypes.includes(pType)) {
                          if (price < minPrice) minPrice = price;
                      }
                  } else if (type === 'child') {
                      if (pType === 'child' || (p.title && p.title.toLowerCase().includes('criança'))) {
                          if (price < minPrice) minPrice = price;
                      }
                  }
              }
          });
      }

      if (minPrice === Infinity) {
          const legacy = Number(type === 'adult' ? item.priceAdult : item.priceChild);
          if (legacy > 0) return legacy;
      }

      return minPrice === Infinity ? 0 : minPrice;
  };

  const priceAdult1 = getLowestPrice(item1, 'adult');
  const priceAdult2 = getLowestPrice(item2, 'adult');
  const priceChild1 = getLowestPrice(item1, 'child');
  const priceChild2 = getLowestPrice(item2, 'child');

  const renderCheck = (val) => {
      if (val === true) return <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto"><Check size={14} strokeWidth={3} /></div>;
      return <div className="w-6 h-6 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto"><X size={14} /></div>;
  };

  // 🔥 HELPER PARA RENDERIZAR O PREÇO COM "A PARTIR DE"
  const renderPriceCell = (price, isMain = false) => {
      if (price > 0) {
          return (
              <div className="flex flex-col justify-center items-center">
                  <span className="text-[9px] md:text-[10px] text-slate-400 font-normal uppercase tracking-wide leading-none mb-0.5">
                      a partir de
                  </span>
                  <span className={isMain ? "text-[#0097A8] font-black text-sm md:text-lg" : "text-slate-600 font-bold text-xs md:text-base"}>
                      {formatBRL(price)}
                  </span>
              </div>
          );
      }
      return <span className="text-slate-300 text-xs">-</span>;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-12">
        <table className="w-full text-sm text-center table-fixed">
            <thead className="bg-slate-50/80 backdrop-blur-md text-slate-500 font-bold uppercase text-[10px] md:text-xs tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                    <th className="py-3 px-2 w-[30%] text-left pl-4 md:pl-6 bg-slate-50/90">Item</th>
                    <th className="py-3 px-1 w-[35%] text-slate-800 bg-slate-50/90 truncate">{item1.name.split(' ')[0]}</th>
                    <th className="py-3 px-1 w-[35%] text-slate-800 bg-slate-50/90 truncate">{item2.name.split(' ')[0]}</th>
                </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
                {/* PREÇOS COM "A PARTIR DE" */}
                <tr className="bg-white">
                    <td className="py-4 text-left pl-4 md:pl-6 font-bold text-slate-700 text-xs md:text-sm">Adulto</td>
                    <td className="py-2">{renderPriceCell(priceAdult1, true)}</td>
                    <td className="py-2">{renderPriceCell(priceAdult2, true)}</td>
                </tr>
                <tr>
                    <td className="py-3 text-left pl-4 md:pl-6 font-medium text-slate-500 text-xs md:text-sm">Criança</td>
                    <td className="py-2">{renderPriceCell(priceChild1)}</td>
                    <td className="py-2">{renderPriceCell(priceChild2)}</td>
                </tr>
                
                {/* DADOS GERAIS */}
                <tr>
                    <td className="py-3 text-left pl-4 md:pl-6 font-medium text-slate-500 text-xs md:text-sm">Cidade</td>
                    <td className="text-xs text-slate-600 truncate px-1">{item1.city}</td>
                    <td className="text-xs text-slate-600 truncate px-1">{item2.city}</td>
                </tr>
                <tr>
                    <td className="py-3 text-left pl-4 md:pl-6 font-medium text-slate-500 text-xs md:text-sm">Pet Friendly</td>
                    <td>{renderCheck(item1.petAllowed)}</td>
                    <td>{renderCheck(item2.petAllowed)}</td>
                </tr>
                <tr>
                    <td className="py-3 text-left pl-4 md:pl-6 font-medium text-slate-500 text-xs md:text-sm">Refeições</td>
                    <td className="text-[10px] md:text-xs text-slate-600 px-1 leading-tight py-2">{item1.meals?.join(', ') || '-'}</td>
                    <td className="text-[10px] md:text-xs text-slate-600 px-1 leading-tight py-2">{item2.meals?.join(', ') || '-'}</td>
                </tr>
                
                <tr>
                    <td colSpan="3" className="bg-slate-50 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-t border-b border-slate-100">
                        Comodidades
                    </td>
                </tr>
                
                {amenitiesList.filter(a => (item1.amenities?.includes(a) || item2.amenities?.includes(a))).map(am => (
                    <tr key={am} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 text-left pl-4 md:pl-6 text-slate-600 text-xs md:text-sm">{am}</td>
                        <td>{renderCheck(item1.amenities?.includes(am))}</td>
                        <td>{renderCheck(item2.amenities?.includes(am))}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        <div 
            onClick={() => navigate(`/${getStateSlug(item1.state)}`)}
            className="p-3 bg-slate-50 text-center border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors active:scale-[0.99]"
        >
            <span className="text-[#0097A8] font-bold text-xs uppercase tracking-wide">
                Ver mais em {stateNames[item1.state] || item1.state}
            </span>
        </div>
    </div>
  );
};

export default ComparisonTable;