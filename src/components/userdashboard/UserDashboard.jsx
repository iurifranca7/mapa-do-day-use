import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ticket } from 'lucide-react';
import { auth, db } from '../../firebase';
import { getStateSlug, generateSlug } from '../../utils/format';
import Button from './../Button'; 
import VoucherModal from './../VoucherModal';
import DashboardFilters from '../userdashboard/DashboardFilters';
import TripCard from '../userdashboard/TripCard';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const clearFilters = () => {
      setSearchTerm('');
      setFilterDate('');
      setFilterStatus('all');
  };

  const hasActiveFilters = searchTerm || filterDate || filterStatus !== 'all';

  useEffect(() => {
     const unsub = onAuthStateChanged(auth, u => {
        if(u) {
           setUser(u);
           const q = query(collection(db, "reservations"), where("userId", "==", u.uid));
           
           getDocs(q)
             .then(s => {
                 const data = s.docs.map(d => ({id: d.id, ...d.data()}));
                 data.sort((a, b) => {
                     const dateA = a.createdAt?.seconds || a.date;
                     const dateB = b.createdAt?.seconds || b.date;
                     return dateA > dateB ? -1 : 1; 
                 });
                 setTrips(data);
             })
             .catch(err => console.error("Erro ao buscar ingressos:", err))
             .finally(() => setLoading(false));
        } else {
           setLoading(false);
        }
     });
     return unsub;
  }, []);

  // Navegar para Checkout (Recuperação)
  const handleResumePayment = (trip) => {
      const bookingData = {
          item: trip.item,
          date: trip.date,
          adults: trip.adults,
          children: trip.children,
          pets: trip.pets,
          selectedSpecial: trip.selectedSpecial || {},
          priceSnapshot: trip.priceSnapshot || {},
          total: trip.total,
          couponCode: trip.couponCode,
          dayuseId: trip.item?.id || trip.dayuseId
      };
      navigate('/checkout', { state: { bookingData } });
  };

  // Navegar para Detalhes (Recompra de Expirado)
  const handleRepurchase = (trip) => {
      if (trip.item) {
          const stateSlug = getStateSlug(trip.item.state);
          const nameSlug = generateSlug(trip.item.name);
          navigate(`/${stateSlug}/${nameSlug}`, { state: { id: trip.item.id } });
      } else {
          // Fallback se o item não tiver dados completos
          navigate('/');
      }
  };

  // Lógica de Clique no Card (Imagem/Nome)
  const handleCardClick = (trip, isConfirmed) => {
      if (isConfirmed) {
          setSelectedVoucher(trip);
      }
  };

  // --- FILTRAGEM ---
  const filteredTrips = trips.filter(t => {
      // 1. Filtro de Texto
      const matchText = (t.item?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (t.item?.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Filtro de Data
      const matchDate = filterDate ? t.date === filterDate : true;
      
      // 3. Filtro de Status (Agrupamento Inteligente)
      let matchStatus = true;
      if (filterStatus !== 'all') {
          if (filterStatus === 'waiting_payment') {
              matchStatus = ['pending', 'waiting_payment', 'failed_payment'].includes(t.status);
          } else if (filterStatus === 'confirmed') {
              matchStatus = ['confirmed', 'approved'].includes(t.status);
          } else if (filterStatus === 'cancelled') {
              matchStatus = ['cancelled', 'cancelled_sold_out', 'chargeback'].includes(t.status);
          } else {
              matchStatus = t.status === filterStatus;
          }
      }
      
      return matchText && matchDate && matchStatus;
  });

  if (loading) return <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-slate-300 border-t-[#0097A8] rounded-full animate-spin"></div>Carregando ingressos...</div>;
  if (!user) return <div className="text-center py-20 text-slate-400">Faça login para ver seus ingressos.</div>;

  return (
     <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in min-h-[60vh]">
        <VoucherModal isOpen={!!selectedVoucher} trip={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
        
        <DashboardFilters 
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            filterDate={filterDate} setFilterDate={setFilterDate}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            showFilters={showFilters} setShowFilters={setShowFilters}
            hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
        />
        
        <div className="space-y-6">
           {filteredTrips.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                   <Ticket size={40} className="mx-auto text-slate-300 mb-4"/>
                   <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum ingresso encontrado</h3>
                   <p className="text-slate-500 mb-6">Tente ajustar seus filtros ou busque novos destinos.</p>
                   {searchTerm || filterDate || filterStatus !== 'all' ? (
                       <Button variant="outline" onClick={clearFilters}>Limpar Filtros</Button>
                   ) : (
                       <Button onClick={()=>window.location.href='/'}>Explorar Destinos</Button>
                   )}
               </div>
           ) : (
               filteredTrips.map(t => (
                   <TripCard 
                       key={t.id} 
                       trip={t} 
                       handleResumePayment={handleResumePayment}
                       handleRepurchase={handleRepurchase}
                       handleCardClick={handleCardClick}
                       setSelectedVoucher={setSelectedVoucher}
                   />
               ))
           )}
        </div>
     </div>
  );
};

export default UserDashboard;