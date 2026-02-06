import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Ícones
import { 
  LayoutDashboard, MapPin, Package, DollarSign, ChevronRight,
  FileText, Tag, Users, Calendar as CalendarIcon, 
  LogOut, Store, Trash2, X, QrCode, MoreHorizontal, Home
} from 'lucide-react';

// Firebase
import { 
  doc, getDoc, setDoc, deleteDoc, collection, query, where, onSnapshot, getDocs 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, sendEmailVerification, 
  getAuth, createUserWithEmailAndPassword, signOut 
} from 'firebase/auth';
import { initializeApp, getApp } from 'firebase/app';
import { auth, db } from '../firebase'; 

// Componentes Internos
import PartnerOverview from './PartnerOverview';
import PartnerMyDayUse from './PartnerMyDayUse';
import PartnerProducts from './PartnerProducts';
import PartnerSales from './PartnerSales';
import PartnerReports from './PartnerReports';
import PartnerCalendar from './PartnerCalendar';
import PartnerCoupons from './PartnerCoupons';
import Button from './Button';
import FeedbackModal from './FeedbackModal';
import QrScannerModal from './QrScannerModal'; 
import TicketValidationModal from './TicketValidationModal'; // 🔥 SEU NOVO COMPONENTE

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { partnerId } = useParams();
  
  // --- ESTADOS DO SCANNER PADRONIZADOS ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedRes, setScannedRes] = useState(null);

  // --- STATES DE DADOS ---
  const [staffList, setStaffList] = useState([]);
  const [mpConnected, setMpConnected] = useState(false);
  const [docStatus, setDocStatus] = useState('none');
  const [mainOwnerId, setMainOwnerId] = useState(null);
  
  // --- STATES DE GESTÃO ---
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [newMemberRole, setNewMemberRole] = useState('staff');
  const [feedback, setFeedback] = useState(null);

  // 1. CARREGAMENTO INICIAL
  // 1. CARREGAMENTO INICIAL COM LOGS DE DEBUG
  useEffect(() => {
     console.log("🔄 [DASHBOARD] Iniciando verificação de auth...");
     console.log("🔗 [DASHBOARD] ID na URL (partnerId):", partnerId); // Verifica se o router pegou o ID

     const unsub = onAuthStateChanged(auth, async u => {
        if(u) {
           console.log("👤 [AUTH] Usuário logado (Admin/Você):", u.uid, u.email);

           // Pega dados do usuário logado
           const userDocRef = doc(db, "users", u.uid);
           const userDocSnap = await getDoc(userDocRef);
           
           let effectiveOwnerId = u.uid; 
           let isImpersonating = false;
           
           // --- LÓGICA NOVA PARA O ADMIN ---
           if (partnerId) {
               console.log("🕵️‍♂️ [MODO ESPIÃO] Detectado ID na URL. Tentando acessar como:", partnerId);
               effectiveOwnerId = partnerId;
               isImpersonating = true;
           } else {
               if(userDocSnap.exists()) {
                   const d = userDocSnap.data();
                   if (d.ownerId) effectiveOwnerId = d.ownerId;
               }
           }
           
           console.log("🎯 [FINAL] ID Efetivo que será usado:", effectiveOwnerId);

           // Busca dados do Dono Efetivo
           try {
               const ownerDocSnap = await getDoc(doc(db, "users", effectiveOwnerId));
               
               if(ownerDocSnap.exists()) {
                   console.log("✅ [DB] Dados do Parceiro encontrados:", ownerDocSnap.data());
                   const ownerData = ownerDocSnap.data();
                   setDocStatus(ownerData.docStatus || 'none');
                   if(ownerData.mp_access_token) setMpConnected(true);

                   // Monta o objeto User
                   const finalUserObj = { 
                     ...u, 
                     uid: effectiveOwnerId, // O ID MÁGICO
                     role: isImpersonating ? 'admin_view' : (userDocSnap.data()?.role || 'partner'), 
                     displayName: isImpersonating ? `[Admin] ${ownerDocSnap.data()?.displayName}` : (u.displayName || userDocSnap.data()?.displayName),
                     photoURL: u.photoURL || userDocSnap.data()?.photoURL
                   };
                   
                   console.log("🚀 [STATE] Atualizando User State para:", finalUserObj);
                   setUser(finalUserObj); 

                   setMainOwnerId(effectiveOwnerId);

                   // Busca equipe
                   const qStaff = query(collection(db, "users"), where("ownerId", "==", effectiveOwnerId));
                   onSnapshot(qStaff, s => setStaffList(s.docs.map(d => ({id: d.id, ...d.data()}))));

               } else {
                   console.warn("⚠️ [DB] Usuário parceiro NÃO encontrado no banco com ID:", effectiveOwnerId);
                   alert("Parceiro não encontrado no banco de dados.");
               }
           } catch (error) {
               console.error("❌ [ERRO CRÍTICO] Falha ao buscar dados do parceiro:", error);
               if (error.code === 'permission-denied') {
                   alert("ERRO DE PERMISSÃO: O Firebase bloqueou você de ver os dados deste parceiro. Verifique as 'Firestore Rules'.");
               }
           }

        } else {
           console.log("🚪 [AUTH] Nenhum usuário logado. Redirecionando...");
           navigate('/'); 
        }
     });
     return unsub;
  }, [navigate, partnerId]);

  // --- FUNÇÃO DE BUSCA (PADRONIZADA IGUAL AO CALENDÁRIO) ---
  const handleScanTicket = async (rawValue) => {
      if (!user) return;
      setScanLoading(true);
      try {
          let code = rawValue || '';
          if (code.includes('http') || code.includes('/')) {
              if (code.endsWith('/')) code = code.slice(0, -1);
              const parts = code.split('/');
              code = parts[parts.length - 1]; 
          }
          code = code.trim(); 

          const qTicketCode = query(collection(db, "reservations"), where("ownerId", "==", user.uid), where("ticketCode", "==", code.toUpperCase()));
          const docRef = doc(db, "reservations", code);
          
          const [snapTicket, docSnapId] = await Promise.all([getDocs(qTicketCode), getDoc(docRef)]);

          let foundData = null;
          if (!snapTicket.empty) {
              foundData = { id: snapTicket.docs[0].id, ...snapTicket.docs[0].data() };
          } else if (docSnapId.exists() && docSnapId.data().ownerId === user.uid) {
              foundData = { id: docSnapId.id, ...docSnapId.data() };
          }

          if (!foundData) { 
              setFeedback({ type: 'error', title: 'Não encontrado', msg: `Ingresso não localizado: ${code}` });
              setScanLoading(false); 
              return; 
          }

          const payStatus = (foundData.paymentStatus || foundData.status || '').toLowerCase();
          if (['cancelled', 'rejected', 'refunded'].includes(payStatus)) {
              setFeedback({ type: 'error', title: 'Cancelado', msg: 'Este ingresso foi cancelado ou reembolsado!' });
          }

          setScannedRes(foundData); 
          setIsScannerOpen(false); // Fecha scanner e abre o modal de validação
      } catch (error) { 
          console.error("Erro busca:", error); 
          setFeedback({ type: 'error', title: 'Erro', msg: 'Falha técnica ao buscar ingresso.' });
      } finally { 
          setScanLoading(false); 
      }
  };

  const handleValidationSuccess = (updatedRes) => {
      setFeedback({ type: 'success', title: 'Entrada Confirmada', msg: `${updatedRes.guestName} liberado!` });
      setScannedRes(null);
  };

  // --- ACTIONS GESTÃO ---
  const handleConnect = () => { 
      if (user.uid !== mainOwnerId) { 
          setFeedback({ type: 'warning', title: 'Restrito', msg: 'Apenas o titular da conta pode conectar o Mercado Pago.' }); 
          return; 
      } 
      const redirect = `${window.location.origin}/partner/callback`; 
      const clientId = import.meta.env.VITE_MP_CLIENT_ID; 
      window.location.href = `https://auth.mercadopago.com.br/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${user.uid}&redirect_uri=${encodeURIComponent(redirect)}`; 
  };

  const handleAddStaff = async (e) => { 
      e.preventDefault(); 
      if (docStatus !== 'verified') return setFeedback({ type: 'warning', title: 'Restrito', msg: 'Valide sua empresa antes de adicionar membros.' }); 
      setStaffLoading(true); 
      try { 
          const secondaryApp = initializeApp(getApp().options, "Secondary"); 
          const secondaryAuth = getAuth(secondaryApp); 
          const createdUser = await createUserWithEmailAndPassword(secondaryAuth, staffEmail, staffPass); 
          await sendEmailVerification(createdUser.user); 
          await setDoc(doc(db, "users", createdUser.user.uid), { 
              email: staffEmail, role: newMemberRole, ownerId: user.uid, createdAt: new Date(), name: newMemberRole === 'partner' ? "Sócio" : "Portaria" 
          }); 
          await signOut(secondaryAuth); 
          setFeedback({ type: 'success', title: 'Sucesso', msg: 'Convite enviado.' }); 
          setStaffEmail(''); setStaffPass(''); 
      } catch (err) { 
          setFeedback({ type: 'error', title: 'Erro', msg: err.message }); 
      } finally { 
          setStaffLoading(false); 
      } 
  };

  const handleDeleteStaff = async (staffId) => {
      if(!window.confirm("Remover este membro?")) return;
      try {
          await deleteDoc(doc(db, "users", staffId));
          setFeedback({ type: 'success', title: 'Removido', msg: 'Membro removido.' });
      } catch (err) {
          setFeedback({ type: 'error', title: 'Erro', msg: 'Erro ao remover.' });
      }
  };

  const handleLogout = () => {
      auth.signOut();
      window.location.href = '/';
  };

  if (!user) return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400">Carregando painel...</div>;
  const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Parceiro';

  // --- RENDERIZADORES ---

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* 1. SIDEBAR DESKTOP (ESCONDIDA NO MOBILE) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col z-20 shadow-xl">
          <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
                  {user.photoURL ? <img src={user.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="Perfil" /> : <div className="w-10 h-10 bg-[#0097A8] rounded-xl flex items-center justify-center text-white"><Store size={20}/></div>}
                  <div>
                      <h2 className="font-bold text-slate-900 text-sm truncate w-32">{user.displayName || "Meu Negócio"}</h2>
                      <p className="text-xs text-slate-400">Painel Parceiro</p>
                  </div>
              </div>
              
              <nav className="space-y-1">
                  <NavItem icon={<LayoutDashboard size={20}/>} label="Painel" active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')}/>
                  <NavItem icon={<DollarSign size={20}/>} label="Vendas" active={activeTab==='sales'} onClick={()=>setActiveTab('sales')}/>
                  <NavItem icon={<CalendarIcon size={20}/>} label="Agenda" active={activeTab==='calendar'} onClick={()=>setActiveTab('calendar')}/>
                  <div className="my-4 border-t border-slate-100"></div>
                  <NavItem icon={<MapPin size={20}/>} label="Meu Day Use" active={activeTab==='my-dayuse'} onClick={()=>setActiveTab('my-dayuse')}/>
                  <NavItem icon={<Package size={20}/>} label="Produtos" active={activeTab==='products'} onClick={()=>setActiveTab('products')}/>
                  <NavItem icon={<Tag size={20}/>} label="Cupons" active={activeTab==='coupons'} onClick={()=>setActiveTab('coupons')}/>
                  <NavItem icon={<FileText size={20}/>} label="Relatórios" active={activeTab==='reports'} onClick={()=>setActiveTab('reports')}/>
                  <NavItem icon={<Users size={20}/>} label="Equipe" active={activeTab==='team'} onClick={()=>setActiveTab('team')}/>
              </nav>
          </div>
          <div className="mt-auto p-6 border-t border-slate-100">
              <button onClick={() => navigate('/')} className="flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-[#0097A8] mb-4 transition-colors"><Home size={18}/> Ir para o Site</button>
              <button onClick={handleLogout} className="flex items-center gap-3 text-sm font-bold text-red-500 hover:text-red-700 transition-colors"><LogOut size={18}/> Sair</button>
          </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
          
          {/* Conteúdo Scrollável */}
          <div className="flex-1 overflow-y-auto pb-24 md:pb-0 p-4 md:p-8 scroll-smooth">
              
              {/* --- DASHBOARD / VISÃO GERAL --- */}
              {activeTab === 'dashboard' && (
                  <div className="animate-fade-in space-y-6">
                      
                      {/* HEADER PERSONALIZADO */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2 md:mt-0">
                          <div>
                              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                                  Olá, {firstName} <span className="text-blue-500">💙</span>
                              </h1>
                              <p className="text-slate-500 text-sm">Aqui está o resumo do seu negócio hoje.</p>
                          </div>

                          {/* CARD MERCADO PAGO */}
                          <div className={`bg-white rounded-2xl border p-3 shadow-sm flex items-center gap-3 transition-all ${mpConnected ? 'border-slate-100' : 'border-blue-100 ring-2 ring-blue-50'}`}>
                              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-100 shadow-sm overflow-hidden shrink-0">
                                  {mpConnected ? (<img src="https://img.icons8.com/color/96/mercado-pago.png" alt="MP" className="w-6 h-6 object-contain"/>) : (<DollarSign size={20} className="text-slate-300"/>)}
                              </div>
                              <div className="text-left">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight mb-0.5">Conta Mercado Pago</p>
                                  {mpConnected ? (
                                      <p className="text-xs font-bold text-green-600 flex items-center gap-1 leading-tight"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span> Conectada</p>
                                  ) : (
                                      <button onClick={handleConnect} className="text-xs font-bold text-blue-600 hover:underline leading-tight">Conectar Agora</button>
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* COMPONENTE DE OVERVIEW */}
                      <PartnerOverview user={user} setActiveTab={setActiveTab} />
                  </div>
              )}

              {/* OUTRAS ABAS */}
              {activeTab === 'sales' && <PartnerSales user={user} />}
              {activeTab === 'calendar' && <PartnerCalendar user={user} />}
              {activeTab === 'my-dayuse' && <PartnerMyDayUse user={user} />}
              {activeTab === 'products' && <PartnerProducts user={user} />}
              {activeTab === 'coupons' && <PartnerCoupons user={user} />}
              {activeTab === 'reports' && <PartnerReports user={user} />}
              
              {/* ABA EQUIPE INLINE */}
              {activeTab === 'team' && (
                  <div className="max-w-4xl mx-auto animate-fade-in mt-4">
                      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Equipe</h1><p className="text-slate-500 text-sm">Adicione membros para gerenciar o painel.</p></div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                          <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Membros Ativos</h3>
                              {staffList.length === 0 ? <p className="text-sm text-slate-400 italic">Nenhum membro.</p> : (
                                  <ul className="space-y-2">{staffList.map(s => (
                                      <li key={s.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                          <div><p className="text-sm font-bold text-slate-700">{s.email}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{s.role === 'partner' ? 'Sócio' : 'Portaria'}</p></div>
                                          <button onClick={() => handleDeleteStaff(s.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                                      </li>
                                  ))}</ul>
                              )}
                          </div>
                          <div className="pt-4 border-t border-slate-100">
                              <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Convidar Novo</h3>
                              <form onSubmit={handleAddStaff} className="space-y-3">
                                  <input className="w-full border p-3 rounded-xl text-sm bg-slate-50" placeholder="E-mail" value={staffEmail} onChange={e=>setStaffEmail(e.target.value)} required type="email"/>
                                  <div className="flex gap-2">
                                      <input className="w-full border p-3 rounded-xl text-sm bg-slate-50" placeholder="Senha" type="password" value={staffPass} onChange={e=>setStaffPass(e.target.value)} required />
                                      <select className="border p-3 rounded-xl text-sm bg-slate-50 font-bold text-slate-600" value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)}><option value="staff">Portaria</option><option value="partner">Sócio</option></select>
                                  </div>
                                  <Button type="submit" disabled={staffLoading} className="w-full py-3 text-sm">{staffLoading ? '...' : 'Adicionar Membro'}</Button>
                              </form>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </main>

      {/* 3. BOTTOM NAVIGATION (MOBILE APPS STYLE) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-between items-end px-2 pb-2 pt-1 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <MobileNavItem icon={<LayoutDashboard size={20}/>} label="Painel" active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} />
          <MobileNavItem icon={<DollarSign size={20}/>} label="Vendas" active={activeTab==='sales'} onClick={()=>setActiveTab('sales')} />
          
          {/* BOTÃO CENTRAL DE SCANNER (Floating Action Button) */}
          <div className="relative -top-5">
              <button 
                  onClick={() => setIsScannerOpen(true)}
                  className="w-14 h-14 bg-[#0097A8] rounded-full flex items-center justify-center text-white shadow-lg shadow-teal-200 border-4 border-slate-50 transform transition-transform active:scale-95"
              >
                  <QrCode size={24} />
              </button>
          </div>

          <MobileNavItem icon={<CalendarIcon size={20}/>} label="Agenda" active={activeTab==='calendar'} onClick={()=>setActiveTab('calendar')} />
          <MobileNavItem icon={<MoreHorizontal size={20}/>} label="Mais" active={isMoreMenuOpen} onClick={()=>setIsMoreMenuOpen(true)} />
      </nav>

      {/* 4. DRAWER LATERAL "MAIS" (MOBILE) */}
      {isMoreMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMoreMenuOpen(false)}></div>
              <div className="absolute right-0 top-0 h-full w-[80%] max-w-xs bg-white shadow-2xl animate-slide-in-right flex flex-col">
                  <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          {user.photoURL ? <img src={user.photoURL} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" alt="Perfil"/> : <div className="w-10 h-10 rounded-full bg-[#0097A8] text-white flex items-center justify-center"><Store size={20}/></div>}
                          <div><p className="font-bold text-slate-800 text-sm">{user.displayName || "Parceiro"}</p><p className="text-xs text-slate-400">Configurações</p></div>
                      </div>
                      <button onClick={() => setIsMoreMenuOpen(false)} className="p-2 bg-white rounded-full text-slate-400 shadow-sm"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 mt-2">Gestão</p>
                      <DrawerItem icon={<MapPin size={18}/>} label="Meu Day Use" onClick={()=>{setActiveTab('my-dayuse'); setIsMoreMenuOpen(false);}} />
                      <DrawerItem icon={<Package size={18}/>} label="Produtos" onClick={()=>{setActiveTab('products'); setIsMoreMenuOpen(false);}} />
                      <DrawerItem icon={<Tag size={18}/>} label="Cupons" onClick={()=>{setActiveTab('coupons'); setIsMoreMenuOpen(false);}} />
                      <DrawerItem icon={<FileText size={18}/>} label="Relatórios" onClick={()=>{setActiveTab('reports'); setIsMoreMenuOpen(false);}} />
                      
                      <div className="my-4 border-t border-slate-100"></div>
                      <p className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1">Conta</p>
                      <DrawerItem icon={<Users size={18}/>} label="Equipe & Acessos" onClick={()=>{setActiveTab('team'); setIsMoreMenuOpen(false);}} />
                      <DrawerItem icon={<Home size={18}/>} label="Voltar ao Site" onClick={()=>{navigate('/');}} />
                  </div>

                  <div className="p-4 border-t border-slate-100">
                      <button onClick={handleLogout} className="w-full py-3 text-red-600 bg-red-50 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><LogOut size={18}/> Sair da Conta</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- SISTEMA DE VALIDAÇÃO PADRONIZADO --- */}
      <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScanTicket} loading={scanLoading} />
      
      {scannedRes && (
           <TicketValidationModal 
               reservation={scannedRes}
               onClose={() => setScannedRes(null)}
               onValidationSuccess={handleValidationSuccess}
           />
      )}

      <FeedbackModal isOpen={!!feedback} onClose={()=>setFeedback(null)} type={feedback?.type} title={feedback?.title} msg={feedback?.msg} />
    </div>
  );
};

// --- SUBCOMPONENTES ---
const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-[#0097A8]/10 text-[#0097A8]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
        {icon} {label} {active && <ChevronRight size={16} className="ml-auto opacity-50"/>}
    </button>
);

const MobileNavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 rounded-xl flex-1 transition-colors ${active ? 'text-[#0097A8]' : 'text-slate-400'}`}>
        <div className={`mb-1 ${active ? 'transform scale-110' : ''}`}>{icon}</div>
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

const DrawerItem = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors font-medium text-sm">
        {icon} {label} <ChevronRight size={16} className="ml-auto text-slate-300"/>
    </button>
);

export default PartnerDashboard;