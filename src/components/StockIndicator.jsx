import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Flame, AlertCircle, CheckCircle } from 'lucide-react';

const StockIndicator = ({ dayuseId, date }) => {
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(null);
  const [capacity, setCapacity] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchStock = async () => {
      try {
        // 1. Busca a Capacidade Total do Local
        const dayUseRef = doc(db, "dayuses", dayuseId);
        const dayUseSnap = await getDoc(dayUseRef);
        
        if (!dayUseSnap.exists()) return;
        const dayUseData = dayUseSnap.data();
        
        // Define o limite (prioriza capacityAdults ou limit genérico)
        const limit = Number(dayUseData.capacityAdults || dayUseData.limit || 50);
        setCapacity(limit);

        // 2. Busca todas as reservas confirmadas para esse dia
        const q = query(
            collection(db, "reservations"),
            where("item.id", "==", dayuseId),
            where("date", "==", date),
            where("status", "in", ["confirmed", "approved", "paid", "validated"])
        );

        const snapshot = await getDocs(q);
        
        // 3. Soma os passageiros (Adultos + Crianças)
        let occupied = 0;
        snapshot.forEach(doc => {
            const r = doc.data();
            occupied += (Number(r.adults || 0) + Number(r.children || 0));
        });

        if (isMounted) {
            setRemaining(Math.max(0, limit - occupied));
            setLoading(false);
        }

      } catch (error) {
        console.error("Erro ao verificar estoque:", error);
        if (isMounted) setLoading(false);
      }
    };

    if (dayuseId && date) {
        fetchStock();
    }

    return () => { isMounted = false; };
  }, [dayuseId, date]);

  if (loading) return <span className="text-[10px] text-slate-400 animate-pulse">Verificando vagas...</span>;

  // Lógica Visual
  if (remaining === 0) {
      return (
          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
              <AlertCircle size={10}/> Data Esgotada!
          </span>
      );
  }

  if (remaining <= 10) {
      return (
          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1 w-fit border border-orange-100 animate-pulse">
              <Flame size={10} fill="currentColor"/> Corre! Restam só {remaining} vagas
          </span>
      );
  }

  // Se tiver muitas vagas, mostra algo tranquilo ou nada
  return (
      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
          <CheckCircle size={10}/> Disponibilidade confirmada
      </span>
  );
};

export default StockIndicator;