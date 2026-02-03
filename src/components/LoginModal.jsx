import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, X, Facebook } from 'lucide-react';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  sendEmailVerification, sendPasswordResetEmail, updateProfile, 
  signInWithPopup, GoogleAuthProvider, FacebookAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Ajuste o caminho se necessário
import ModalOverlay from './ModalOverlay';
import Button from './Button';
import FeedbackModal from './FeedbackModal'; // Certifique-se de ter este componente ou remova a importação

// Provedores
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

const LoginModal = ({ isOpen, onClose, onSuccess, initialRole = 'user', hideRoleSelection = false, closeOnSuccess = true, initialMode = 'login', customTitle, customSubtitle }) => {
  if (!isOpen) return null;

  const [view, setView] = useState(initialMode); 
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); 

  // Dados do Formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // NOVOS CAMPOS
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(''); 
  
  const [registeredUser, setRegisteredUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
        setFeedback(null);
        setView(initialMode); setRole(initialRole);
        setEmail(''); setPassword(''); 
        setFirstName(''); setLastName(''); 
        setPhone('');
        setRegisteredUser(null);
    }
  }, [isOpen, initialMode, initialRole]);

  // Função para formatar telefone (Máscara)
  const handlePhoneChange = (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 11) val = val.slice(0, 11);
      if (val.length > 10) val = val.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      else if (val.length > 5) val = val.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      else if (val.length > 2) val = val.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
      setPhone(val);
  };

  const actionCodeSettings = {
    url: 'https://mapadodayuse.com/minhas-viagens', // Ajuste para sua URL real
    handleCodeInApp: true,
  };

  const ensureProfile = async (u, specificName = null, specificPhone = null) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    let userRole = role; 
    
    const finalName = specificName || u.displayName || u.email?.split('@')[0] || "Usuário";

    if (snap.exists()) { 
        userRole = snap.data().role || 'user'; 
    } else { 
        await setDoc(ref, { 
            email: u.email || "", 
            displayName: finalName,
            role: role, 
            photoURL: u.photoURL || "",
            createdAt: new Date(),
            personalData: {
                phone: specificPhone || "",
                cpf: ""
            }
        }); 
    }
    return { ...u, role: userRole, displayName: finalName };
  };

  const handleSocialLogin = async (provider) => {
    setFeedback(null);
    try {
       const res = await signInWithPopup(auth, provider);
       const userWithRole = await ensureProfile(res.user, null, null);
       if (onSuccess) onSuccess(userWithRole);
       if (closeOnSuccess) onClose();
    } catch (e) { 
        console.error(e);
        let msg = "Erro ao conectar.";
        if (e.code === 'auth/account-exists-with-different-credential') msg = "Já existe uma conta com este e-mail.";
        else if (e.code === 'auth/popup-closed-by-user') return;
        setFeedback({ type: 'error', title: 'Erro de Login', msg });
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault(); setLoading(true); setFeedback(null);
    try {
        if (view === 'register') {
            if (!firstName.trim() || !lastName.trim()) {
                throw new Error("Por favor, preencha seu Nome e Sobrenome.");
            }
            if (!phone || phone.length < 14) {
                throw new Error("Por favor, insira um telefone válido com DDD.");
            }

            const fullName = `${firstName.trim()} ${lastName.trim()}`;
            const res = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(res.user, { displayName: fullName });

            try { await sendEmailVerification(res.user, actionCodeSettings); } catch(e){}
            
            const userWithRole = await ensureProfile(res.user, fullName, phone);
            
            setRegisteredUser(userWithRole);
            setView('email_sent');
            setLoading(false);
            return;
        } else {
            const res = await signInWithEmailAndPassword(auth, email, password);
            const userWithRole = await ensureProfile(res.user);
            if (onSuccess) onSuccess(userWithRole);
            if (closeOnSuccess) onClose();
        }
    } catch (err) {
        console.error(err);
        let title = "Atenção";
        let msg = "Erro desconhecido.";
        
        if (err.message.includes("preencha") || err.message.includes("telefone")) {
            msg = err.message;
        }
        else if (err.code === 'auth/email-already-in-use') {
            msg = "Este e-mail já possui cadastro. Tente fazer login.";
            if (view === 'register') setView('login');
        }
        else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
            if (view === 'login') {
                title = "Conta não encontrada";
                msg = "Não encontramos uma conta. Criamos um cadastro para você?";
                setView('register');
            } else {
                msg = "E-mail ou senha incorretos.";
            }
        }
        else if (err.code === 'auth/weak-password') {
            msg = "A senha deve ter pelo menos 6 caracteres.";
        }
        else msg = "Erro: " + err.code;
        
        setFeedback({ type: 'error', title, msg });
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
      e.preventDefault(); setLoading(true); setFeedback(null);
      try {
          await sendPasswordResetEmail(auth, email, actionCodeSettings);
          setFeedback({ type: 'success', title: 'Link Enviado', msg: `Se o e-mail existir, você receberá um link.` });
      } catch (err) { 
          setFeedback({ type: 'error', title: 'Erro', msg: "Não foi possível enviar." });
      } finally { setLoading(false); }
  };

  const getTitle = () => {
      if (view === 'forgot') return 'Recuperar Senha';
      if (view === 'email_sent') return 'Verifique seu E-mail';
      if (view === 'register' && role === 'partner') return 'Boas-vindas';
      return customTitle || (view === 'login' ? 'Olá, novamente' : 'Criar conta');
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full rounded-2xl shadow-xl overflow-hidden relative animate-fade-in max-w-md mx-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors"><X size={18} className="text-slate-800"/></button>
            <h2 className="font-bold text-slate-800 text-base">{getTitle()}</h2>
            <div className="w-6"></div>
        </div>

        <div className="p-6">
            {feedback && createPortal(<FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback.type} title={feedback.title} msg={feedback.msg} />, document.body)}

            {/* SUCESSO CADASTRO */}
            {view === 'email_sent' ? (
                <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-teal-50 text-[#0097A8] rounded-full flex items-center justify-center mx-auto mb-2"><Mail size={32}/></div>
                    <div><h3 className="text-lg font-bold text-slate-800">Conta Criada!</h3><p className="text-slate-600 text-sm mt-2">Enviamos um link para <strong>{email}</strong>.</p></div>
                    <Button onClick={() => { if (registeredUser) { onSuccess(registeredUser); if (closeOnSuccess) onClose(); } else { setView('login'); } }} className="w-full mt-4">{role === 'partner' ? 'Ir para o Painel' : 'Fazer Login'}</Button>
                </div>
            ) : (
                <>
                    {!hideRoleSelection && ['login','register'].includes(view) && (
                        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                            <button onClick={()=>setRole('user')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role==='user'?'bg-white text-[#0097A8] shadow-sm':'text-slate-500'}`}>Viajante</button>
                            <button onClick={()=>setRole('partner')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role==='partner'?'bg-white text-[#0097A8] shadow-sm':'text-slate-500'}`}>Parceiro</button>
                        </div>
                    )}

                    {['login','register'].includes(view) && (
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            {view === 'register' && role === 'partner' && <p className="text-sm text-slate-500 -mt-2 mb-2">Preencha seus dados para se cadastrar</p>}
                            
                            {/* CAMPOS DE NOME E TELEFONE (SÓ NO REGISTRO) */}
                            {view === 'register' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" placeholder="Nome" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
                                        <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" placeholder="Sobrenome" value={lastName} onChange={e=>setLastName(e.target.value)} required />
                                    </div>
                                    <input 
                                        className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" 
                                        placeholder="WhatsApp (00) 00000-0000" 
                                        value={phone} 
                                        onChange={handlePhoneChange} 
                                        maxLength={15}
                                        required 
                                    />
                                </>
                            )}

                            <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required />
                            <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#0097A8] outline-none" type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} required />
                            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Processando...' : (view === 'login' ? 'Entrar' : 'Cadastrar')}</Button>
                        </form>
                    )}

                    {view === 'forgot' && (
                        <form onSubmit={handleForgot} className="space-y-4">
                            <p className="text-sm text-slate-600">Insira seu e-mail para recuperar.</p>
                            <input className="w-full p-3 border border-slate-300 rounded-xl outline-none" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required/>
                            <Button type="submit" className="w-full" disabled={loading}>Enviar link</Button>
                            <p className="text-center text-xs font-bold underline cursor-pointer mt-4" onClick={()=>setView('login')}>Voltar</p>
                        </form>
                    )}

                    {['login','register'].includes(view) && (
                        <>
                            <div className="flex items-center my-6"><div className="flex-grow border-t border-slate-200"></div><span className="mx-3 text-xs text-slate-400">ou entre com</span><div className="flex-grow border-t border-slate-200"></div></div>
                            <div className="space-y-3">
                                <button onClick={() => handleSocialLogin(googleProvider)} className="w-full border-2 border-slate-100 rounded-xl py-2.5 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-semibold text-slate-600 text-sm"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" /> Continuar com Google</button>
                                <button onClick={() => handleSocialLogin(facebookProvider)} className="w-full border-2 border-slate-100 rounded-xl py-2.5 flex items-center justify-center gap-3 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all font-semibold text-slate-600 text-sm group"><Facebook size={20} className="text-[#1877F2] group-hover:text-white transition-colors" fill="currentColor" /> Continuar com Facebook</button>
                            </div>
                            <div className="mt-4 text-center text-xs text-slate-500">
                                {view==='login' ? <><span onClick={()=>setView('forgot')} className="cursor-pointer hover:underline mr-4">Esqueci a senha</span> <span onClick={()=>{setView('register'); setFeedback(null)}} className="cursor-pointer font-bold text-[#0097A8]">Criar conta</span></> : <span onClick={()=>{setView('login'); setFeedback(null)}} className="cursor-pointer font-bold text-[#0097A8]">Já tenho conta</span>}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
      </div>
    </ModalOverlay>
  );
};

export default LoginModal;