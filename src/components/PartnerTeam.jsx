import React, { useState, useEffect } from 'react';
import { 
  collection, query, where, onSnapshot, deleteDoc, doc, setDoc 
} from 'firebase/firestore';
import { 
  getAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut 
} from 'firebase/auth';
import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app'; // Adicionado getApps e deleteApp
import { db } from '../firebase'; 
import { Users, Trash2, Mail, Lock, Shield, UserPlus, Store, Loader2, AlertTriangle } from 'lucide-react';
import Button from './Button'; 
import FeedbackModal from './FeedbackModal'; 

const PartnerTeam = ({ user }) => {
  const [teamList, setTeamList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('staff');
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // O ID do dono principal
  const ownerId = user.effectiveOwnerId || user.uid;

  // 1. Carregar Equipe
  useEffect(() => {
    if (!ownerId) return;

    const q = query(collection(db, "users"), where("ownerId", "==", ownerId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeamList(list.filter(u => u.id !== ownerId));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar equipe:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ownerId]);

  // 2. Adicionar Membro (LÓGICA CORRIGIDA)
  const handleAddMember = async (e) => {
    e.preventDefault();
    console.log("🚀 [TEAM] Botão clicado. Iniciando cadastro...");

    if (!email || !password || !name) {
        console.log("⚠️ [TEAM] Campos vazios.");
        setFeedback({ type: 'warning', title: 'Atenção', msg: 'Preencha todos os campos.' });
        return;
    }

    setIsAdding(true);
    let secondaryApp = null;

    try {
        console.log("⚙️ [TEAM] Configurando App Secundário...");
        
        // TRUQUE BLINDADO: Verifica se já existe para não dar erro
        const appName = "SecondaryApp";
        const existingApp = getApps().find(app => app.name === appName);
        
        if (existingApp) {
            secondaryApp = existingApp;
        } else {
            secondaryApp = initializeApp(getApp().options, appName);
        }

        const secondaryAuth = getAuth(secondaryApp);

        console.log("👤 [TEAM] Criando usuário no Auth...");
        // 1. Cria o usuário na Auth Secundária
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUser = userCredential.user;
        console.log("✅ [TEAM] Usuário criado no Auth. UID:", newUser.uid);

        // 2. Salva no Firestore
        console.log("💾 [TEAM] Salvando no Firestore...");
        await setDoc(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            email: email,
            displayName: name,
            role: role, 
            ownerId: ownerId, // VITAL: Vincula ao dono atual
            createdAt: new Date(),
            status: 'active'
        });
        console.log("✅ [TEAM] Salvo no Firestore com sucesso.");

        // 3. Limpeza: Desloga da instância secundária
        await signOut(secondaryAuth);
        
        setFeedback({ type: 'success', title: 'Membro Adicionado', msg: `Acesso criado para ${name}.` });
        setEmail('');
        setPassword('');
        setName('');

    } catch (error) {
        console.error("❌ [TEAM] Erro no processo:", error);
        let msg = "Erro ao criar usuário.";
        if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está cadastrado.";
        if (error.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
        setFeedback({ type: 'error', title: 'Erro', msg: msg });
    } finally {
        // Opcional: Limpar o app da memória para evitar conflitos futuros
        // if (secondaryApp) await deleteApp(secondaryApp).catch(console.error);
        setIsAdding(false);
    }
  };

  // 3. Remover Membro
  const handleDelete = async (memberId) => {
      if (!window.confirm("Tem certeza? O membro perderá o acesso ao painel.")) return;
      try {
          await deleteDoc(doc(db, "users", memberId));
          setFeedback({ type: 'success', title: 'Removido', msg: 'Membro removido da equipe.' });
      } catch (error) {
          console.error(error);
          setFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível remover.' });
      }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Users className="text-[#0097A8]"/> Gestão de Equipe
            </h1>
            <p className="text-slate-500 mt-1">Cadastre sócios (acesso total) ou portaria (apenas validação de ingressos).</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            
            {/* COLUNA 1: LISTA */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm order-2 md:order-1">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Membros Ativos ({teamList.length})</h3>
                
                {loading ? (
                    <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-[#0097A8]"/></div>
                ) : teamList.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p>Nenhum membro na equipe ainda.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teamList.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#0097A8]/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${member.role === 'partner' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                        {member.displayName ? member.displayName[0].toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">{member.displayName}</p>
                                        <p className="text-xs text-slate-500">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg ${member.role === 'partner' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {member.role === 'partner' ? 'Sócio' : 'Portaria'}
                                    </span>
                                    <button 
                                        onClick={() => handleDelete(member.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Revogar acesso"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* COLUNA 2: FORMULÁRIO */}
            <div className="order-1 md:order-2">
                <div className="bg-[#0097A8]/5 p-6 rounded-3xl border border-[#0097A8]/20 sticky top-6">
                    <h3 className="font-bold text-lg text-[#0097A8] mb-4 flex items-center gap-2"><UserPlus size={20}/> Novo Acesso</h3>
                    <form onSubmit={handleAddMember} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-600 ml-1 mb-1 block">Nome</label>
                            <input 
                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0097A8] outline-none bg-white"
                                placeholder="Ex: Maria Portaria"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 ml-1 mb-1 block">E-mail de Login</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                                <input 
                                    className="w-full p-3 pl-10 rounded-xl border border-slate-200 focus:border-[#0097A8] outline-none bg-white"
                                    placeholder="email@exemplo.com"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 ml-1 mb-1 block">Senha Provisória</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                                <input 
                                    className="w-full p-3 pl-10 rounded-xl border border-slate-200 focus:border-[#0097A8] outline-none bg-white"
                                    placeholder="Mínimo 6 caracteres"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-slate-600 ml-1 mb-1 block">Nível de Permissão</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setRole('staff')}
                                    className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${role === 'staff' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                >
                                    <Shield size={18}/>
                                    Equipe / Portaria
                                    <span className="text-[9px] font-normal opacity-80 text-center">Valida Ingressos</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setRole('partner')}
                                    className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${role === 'partner' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                >
                                    <Store size={18}/>
                                    Sócio / Gerente
                                    <span className="text-[9px] font-normal opacity-80 text-center">Acesso Total</span>
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                             <div className="flex items-start gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100 mb-3">
                                <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5"/>
                                <p className="text-[10px] text-yellow-700">O novo membro usará este e-mail e senha para fazer login no painel.</p>
                             </div>
                            {/* 🔥 ADICIONEI type="submit" PARA GARANTIR O ENVIO */}
                            <Button type="submit" disabled={isAdding} className="w-full py-4 shadow-lg shadow-teal-100">
                                {isAdding ? 'Criando acesso...' : 'Cadastrar Membro'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} {...feedback} />
    </div>
  );
};

export default PartnerTeam;