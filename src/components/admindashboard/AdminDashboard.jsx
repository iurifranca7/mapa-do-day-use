import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase'; // Ajuste o import
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, updateDoc, query, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';

// Componentes
import AdminLayout from './AdminLayout';
import FinancialOverview from './sections/FinancialOverview';
import PartnerManager from './sections/PartnerManager';
import CouponManager from './sections/CouponManager';
import CmsManager from './sections/CmsManager'; // Reutilizando seu CMS existente
import LeadsManager from './sections/LeadsManager'; // Reutilizando seu Leads existente
import PartnerModal from './PartnerModal'; // Reutilizando
import ClaimModal from './ClaimModal'; // Reutilizando
import { notifyPartnerStatus, notifyTransferApproved } from '../../utils/notifications'; // Suas notificações

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('financial');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dados
  const [dayUses, setDayUses] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [leads, setLeads] = useState([]);

  // Modais de Controle
  const [viewDoc, setViewDoc] = useState(null);
  const [viewClaim, setViewClaim] = useState(null);

  useEffect(() => {
    let unsubs = [];
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists() && snap.data().role === 'admin') {
          setUser(u);
          
          // 1. Day Uses (CMS + Parceiros)
          unsubs.push(onSnapshot(collection(db, "dayuses"), (s) => setDayUses(s.docs.map(d => ({id: d.id, ...d.data()})))));
          
          // 2. Reservas (Para Financeiro) - Query otimizada para pegar confirmadas
          // Para MVP pegamos todas, no futuro limite data
          unsubs.push(onSnapshot(query(collection(db, "reservations"), orderBy("createdAt", "desc")), (s) => setReservations(s.docs.map(d => ({id: d.id, ...d.data()})))));

          // 3. Moderação
          unsubs.push(onSnapshot(query(collection(db, "users"), where("docStatus", "==", "pending")), (s) => setPendingUsers(s.docs.map(d => ({id: d.id, ...d.data()})))));
          
          // 4. Claims
          unsubs.push(onSnapshot(query(collection(db, "property_claims"), orderBy("createdAt", "desc")), (s) => setClaims(s.docs.map(d => ({id: d.id, ...d.data()})))));

          // 5. Leads
          unsubs.push(onSnapshot(query(collection(db, "leads"), orderBy("createdAt", "desc")), (s) => setLeads(s.docs.map(d => ({id: d.id, ...d.data()})))));

          setLoading(false);
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    });
    return () => { unsubAuth(); unsubs.forEach(u => u()); };
  }, [navigate]);

  // --- Handlers (Mantidos e Adaptados) ---
  const handlePartnerAction = async (uid, status) => {
    if (confirm(status === 'verified' ? "Aprovar?" : "Rejeitar?")) {
      await updateDoc(doc(db, "users", uid), { docStatus: status });
      if (viewDoc?.email) await notifyPartnerStatus(viewDoc.email, status);
      setViewDoc(null);
    }
  };

  const handleTransferProperty = async (claim) => {
    // 1. Normalização dos dados (Híbrido: Novo || Antigo)
    const targetEmail = claim.claimantEmail || claim.userEmail;
    const targetDayUseId = claim.dayUseId || claim.propertyId;
    const targetName = claim.dayUseName || claim.propertyName;

    if (!targetEmail || !targetDayUseId) {
        alert("Erro: Dados da solicitação incompletos.");
        return;
    }

    if (!window.confirm(`ATENÇÃO: Transferir "${targetName}" para "${targetEmail}"?\n\nIsso moverá o Day Use e TODOS os produtos vinculados.`)) return;

    try {
      const usersRef = collection(db, "users");
      // Busca usuário por email
      const q = query(usersRef, where("email", "==", targetEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert(`ERRO: O e-mail ${targetEmail} não possui conta no site.`);
        return;
      }

      const targetUserId = querySnapshot.docs[0].id;

      // --- INÍCIO DA TRANSFERÊNCIA PROFUNDA (BATCH WRITE) ---
      const batch = writeBatch(db);

      // A) Referência do Day Use (Que contém os Cupons dentro)
      const dayUseRef = doc(db, "dayuses", targetDayUseId);
      batch.update(dayUseRef, { 
          ownerId: targetUserId, 
          updatedAt: new Date() 
      });

      // B) Buscar e Transferir Produtos (Ingressos) vinculados
      // Isso garante que o novo dono possa editar os preços
      const productsQuery = query(collection(db, "products"), where("dayUseId", "==", targetDayUseId));
      const productsSnapshot = await getDocs(productsQuery);

      productsSnapshot.forEach((productDoc) => {
          // Atualiza o ownerId de cada produto encontrado
          batch.update(productDoc.ref, { ownerId: targetUserId });
      });

      // C) Marcar a solicitação como concluída
      const claimRef = doc(db, "property_claims", claim.id);
      batch.update(claimRef, { status: 'done' });

      // Executa tudo de uma vez (Atômico)
      await batch.commit();
      
      // Notificação (Opcional)
      // await notifyTransferApproved({...}); 

      alert(`Transferência realizada com sucesso!\n\n${productsSnapshot.size} produtos foram movidos para o novo dono.`);
      setViewClaim(null);

    } catch (error) {
      console.error("Erro na transferência:", error);
      alert("Erro ao transferir propriedade. Consulte o console.");
    }
  };

  const handleArchiveClaim = async (id) => {
    if (window.confirm("Arquivar esta solicitação?")) {
      await updateDoc(doc(db, "property_claims", id), { status: 'archived' });
      setViewClaim(null);
    }
  };

  const handleDeletePage = async (id) => { if(confirm("Excluir?")) await deleteDoc(doc(db, "dayuses", id)); };
  const handleToggleStatus = async (item) => { await updateDoc(doc(db, "dayuses", item.id), { paused: !item.paused }); };

  if (loading) return <div className="flex h-screen items-center justify-center text-[#0097A8]">Carregando AdminPro...</div>;

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      
      {activeTab === 'financial' && <FinancialOverview reservations={reservations} />}
      
      {activeTab === 'partners' && (
        <PartnerManager 
          dayUses={dayUses} 
          pendingUsers={pendingUsers} 
          claims={claims}
          onOpenDocModal={setViewDoc}
          onOpenClaimModal={setViewClaim}
        />
      )}

      {activeTab === 'coupons' && <CouponManager dayUses={dayUses} />}

      {activeTab === 'cms' && (
        <CmsManager items={dayUses} onToggleStatus={handleToggleStatus} onDelete={handleDeletePage} />
      )}

      {activeTab === 'leads' && <LeadsManager leads={leads} />}

      {/* Modais Globais */}
      <PartnerModal data={viewDoc} onClose={() => setViewDoc(null)} onAction={handlePartnerAction} />

      <ClaimModal 
        data={viewClaim} 
        onClose={() => setViewClaim(null)} 
        onTransfer={handleTransferProperty} 
        onArchive={handleArchiveClaim} 
      />

    </AdminLayout>
  );
};

export default AdminDashboard;