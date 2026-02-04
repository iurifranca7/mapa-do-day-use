// -----------------------------------------------------------------------------
// CHECKOUT PAGE (FRONTEND MP SDK + SAVING TO FIRESTORE)
// -----------------------------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { addDoc, collection, doc, updateDoc, onSnapshot, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { useSEO } from '../../hooks/useSEO';
import { notifyCustomer, notifyPartner } from '../../utils/notifications';

// Componentes UI
import { ChevronLeft, User, Lock } from 'lucide-react';
import Button from '../Button';
import SuccessModal from '../SuccessModal';
import PixModal from '../PixModal';
import LoginModal from '../LoginModal';

// Novos Componentes Organizados
import OrderSummary from '../checkout/OrderSummary';
import ProfileCompletionModal from '../checkout/ProfileCompletionModal';
import PaymentSection from '../checkout/PaymentSection';

const CheckoutPage = () => {
  try { useSEO("Pagamento", "Finalize sua reserva.", true); } catch(e) {}

  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData } = location.state || {};
  
  // Normalização dos dados
  const itemData = bookingData?.item || bookingData; 

  // States
  const [user, setUser] = useState(auth.currentUser);
  const [showLogin, setShowLogin] = useState(false);
  const [initialAuthMode, setInitialAuthMode] = useState('login'); 
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorData, setErrorData] = useState(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [currentReservationId, setCurrentReservationId] = useState(null);

  // Valores e Cupons
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(bookingData?.total || 0);
  const [couponMsg, setCouponMsg] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [couponSuccess, setCouponSuccess] = useState(null);

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState('card'); 
  const [cardName, setCardName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [installments, setInstallments] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  // MP Instance
  const [mpInstance, setMpInstance] = useState(null); 
  const [mpPaymentMethodId, setMpPaymentMethodId] = useState('');
  const [issuerId, setIssuerId] = useState(null);

  // Endereço
  const [cep, setCep] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  
  const [loadingCep, setLoadingCep] = useState(false);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [saveUserData, setSaveUserData] = useState(true);

  // IBGE
  const [ufList, setUfList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Perfil
  const [userProfile, setUserProfile] = useState(null); 
  const [showCompleteModal, setShowCompleteModal] = useState(false); 
  const [tempName, setTempName] = useState('');
  const [tempSurname, setTempSurname] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Auth Listener
  useEffect(() => { return onAuthStateChanged(auth, u => setUser(u)); }, []);

  // MP SDK
  useEffect(() => {
    const initSDK = async () => {
        if (window.mpInstance) { setMpInstance(window.mpInstance); return; }
        const mpKey = import.meta.env.VITE_MP_PUBLIC_KEY_TEST; 
        if (!mpKey) return;
        try {
            if (!window.MercadoPago) await loadMercadoPago();
            if (window.MercadoPago) {
                const instance = new window.MercadoPago(mpKey);
                window.mpInstance = instance;
                setMpInstance(instance);
            }
        } catch (e) { console.error("Erro SDK:", e); }
    };
    initSDK();
  }, []);

  useEffect(() => {
  if (window.MercadoPago && !mpInstance) {
    const mp = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY_TEST);
    setMpInstance(mp);
    console.log("✅ Mercado Pago instanciado com sucesso");
  }
}, []);

  // Busca Perfil
  useEffect(() => {
    if (user?.uid) {
        if (user.displayName) {
            const parts = user.displayName.split(' ');
            setTempName(parts[0] || '');
            setTempSurname(parts.slice(1).join(' ') || '');
        }
        const fetchProfile = async () => {
            try {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserProfile(data);
                    if (data.personalData?.phone) setTempPhone(data.personalData.phone);
                }
            } catch (error) { console.error(error); }
        };
        fetchProfile();
    }
  }, [user?.uid]);

  const checkProfileStatus = () => {
    if (!user) return false;
    const hasFullName = user.displayName && user.displayName.trim().indexOf(' ') > 0;
    const hasPhone = userProfile?.personalData?.phone && userProfile.personalData.phone.length >= 10;
    return !!(hasFullName && hasPhone); 
  };

  const handleSaveProfile = async () => {
    if (!tempName || !tempSurname || !tempPhone) { alert("Preencha todos os campos."); return; }
    setSavingProfile(true);
    try {
        const fullName = `${tempName.trim()} ${tempSurname.trim()}`;
        const { updateProfile } = await import('firebase/auth');
        await updateProfile(user, { displayName: fullName });
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
            displayName: fullName, email: user.email,
            personalData: { cpf: userProfile?.personalData?.cpf || '', address: userProfile?.personalData?.address || null, phone: tempPhone }
        }, { merge: true });
        setUserProfile(prev => ({ ...prev, personalData: { ...prev?.personalData, phone: tempPhone } }));
        setUser(prev => ({ ...prev, displayName: fullName }));
        setShowCompleteModal(false);
    } catch (error) { alert("Erro ao salvar."); } finally { setSavingProfile(false); }
  };

  // IBGE & CEP
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json()).then(data => setUfList(data));
  }, []);

  useEffect(() => {
      if (addressState) {
          setLoadingCities(true);
          fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${addressState}/municipios`)
            .then(res => res.json()).then(data => { setCityList(data); setLoadingCities(false); });
      } else { setCityList([]); }
  }, [addressState]);

  const handleCepBlur = async () => {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length === 0) { setShowManualAddress(false); return; }
      if (cleanCep.length === 8) {
          setLoadingCep(true);
          try {
              const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
              const data = await res.json();
              if (!data.erro) {
                  setAddressStreet(data.logradouro); setAddressNeighborhood(data.bairro);
                  setAddressState(data.uf); setAddressCity(data.localidade);
                  setShowManualAddress(false); document.getElementById('address-number')?.focus();
              } else { setShowManualAddress(true); setAddressState(''); setAddressCity(''); }
          } catch (error) { setShowManualAddress(true); } finally { setLoadingCep(false); }
      }
  };

  // Cupom
  const handleApplyCoupon = () => {
      setCouponMsg(null); 
      if (!itemData || !itemData.coupons?.length) { setCouponMsg({ type: 'error', text: "Sem cupons disponíveis." }); return; }
      const found = itemData.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
      if(found) {
        const val = (bookingData.total * found.percentage) / 100;
        setDiscount(val); setFinalTotal(bookingData.total - val);
        setCouponMsg({ type: 'success', text: `Cupom ${found.code}: ${found.percentage}% OFF` });
      } else {
        setDiscount(0); setFinalTotal(bookingData.total);
        setCouponMsg({ type: 'error', text: "Cupom inválido." });
      }
  };

  const changeMethod = (method) => {
      setPaymentMethod(method);
      if (method === 'pix') setCardName('');
  };

  // Processar Pagamento
 const processPayment = async () => {
    // 1. Verificações Iniciais
    if (!user) { 
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setErrorData({ title: "Identificação Necessária", msg: "Por favor, faça login ou cadastre-se." });
        return; 
    }

    const cleanDoc = (docNumber || "").replace(/\D/g, ''); 
    if ((paymentMethod === 'card' || paymentMethod === 'pix') && cleanDoc.length < 11) { 
        alert("CPF inválido."); 
        return; 
    }

    // 2. Verificação de Segurança do Cartão
    if (paymentMethod === 'card') {
        if (!mpInstance) {
            setErrorData({ 
                title: "Sistema Carregando", 
                msg: "Aguarde o carregamento completo do sistema de segurança (aprox. 3 segundos)." 
            });
            return;
        }
    }

    setProcessing(true);
    const email = user.email || "cliente@mapadodayuse.com";
    const firstName = user.displayName ? user.displayName.split(' ')[0] : "Cliente";
    const lastName = user.displayName ? user.displayName.split(' ').slice(1).join(' ') : "Sobrenome";
    let reservationIdRef = null;

    try {
        const addressObj = { 
            zipCode: cep, 
            street: addressStreet, 
            number: addressNumber, 
            neighborhood: addressNeighborhood, 
            city: addressCity, 
            state: addressState 
        };

        const rawRes = {
            ...bookingData, 
            total: Number(finalTotal.toFixed(2)), 
            discount, 
            couponCode: couponCode || null, 
            paymentMethod,
            status: 'waiting_payment', 
            userId: user.uid, 
            ownerId: itemData.ownerId, 
            createdAt: new Date(), 
            guestName: firstName, 
            guestEmail: email, 
            mpStatus: 'pending', 
            parentTicketId: bookingData.parentTicketId || null,
            billingAddress: paymentMethod === 'card' ? addressObj : null, 
            payerDoc: cleanDoc
        };

        // Salvar dados do usuário
        if (paymentMethod === 'card' && saveUserData && user) {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { personalData: { cpf: cleanDoc, address: addressObj } }, { merge: true });
        }

        // Criar reserva no Firestore
        const docRef = await addDoc(collection(db, "reservations"), rawRes);
        reservationIdRef = docRef.id; 
        setCurrentReservationId(reservationIdRef); 
        const safeId = itemData.id || itemData.dayuseId;

        console.log("🔍 DEBUG CHECKOUT DATA:", {
            bookingData: bookingData,
            cartItems: bookingData?.cartItems,
            adults: bookingData?.adults,
            children: bookingData?.children
        });
        
        // --- AQUI ESTAVA O ERRO: DEFINIÇÃO DO PAYLOAD DEVE VIR ANTES DO TOKEN ---
        const paymentPayload = {
            token: null, 
            transaction_amount: Number(finalTotal.toFixed(2)),
            payment_method_id: paymentMethod === 'pix' ? 'pix' : (mpPaymentMethodId || 'credit_card'),
            issuer_id: issuerId ? Number(issuerId) : null, 
            installments: Number(installments),
            payer: { 
                email, 
                first_name: firstName, 
                last_name: lastName, 
                identification: { type: 'CPF', number: cleanDoc },
                ...(paymentMethod === 'card' && { 
                    address: { 
                        zip_code: cep.replace(/\D/g, ''), 
                        street_name: addressStreet, 
                        street_number: Number(addressNumber) || 0, 
                        neighborhood: addressNeighborhood || 'Centro', 
                        city: addressCity, 
                        federal_unit: addressState 
                    } 
                })
            },
            bookingDetails: { 
                dayuseId: safeId, 
                item: { id: safeId, name: itemData.name }, 
                date: bookingData.date, 
                total: finalTotal, 
                adults: bookingData.adults, 
                children: bookingData.children, 
                pets: bookingData.pets, 
                selectedSpecial: bookingData.selectedSpecial, 
                couponCode,
                cartItems: bookingData.cartItems || [] 
            },
            reservationId: reservationIdRef 
        };

        // 3. Geração do Token (Só acontece AGORA, que o paymentPayload já existe)
        if (paymentMethod === 'card') {
            try {
                if (!mpInstance) throw new Error("Sistema de pagamento não inicializado.");
                
                const tokenObj = await mpInstance.fields.createCardToken({ 
                    cardholderName: cardName, 
                    identificationType: 'CPF', 
                    identificationNumber: cleanDoc 
                });
                
                if (!tokenObj || !tokenObj.id) {
                    throw new Error("Dados do cartão inválidos.");
                }
                
                // Agora sim podemos salvar o token no payload
                paymentPayload.token = tokenObj.id; 
            
            } catch (tokenErr) {
                console.error("Erro token:", tokenErr);
                // Apaga a reserva pois falhou antes de enviar ao backend
                await deleteDoc(doc(db, "reservations", reservationIdRef));
                
                const msg = tokenErr.message?.includes("primary field") 
                    ? "Erro de conexão. Recarregue a página." 
                    : "Verifique o número, validade e CVV do cartão.";
                
                setErrorData({ title: "Erro no Cartão", msg });
                setProcessing(false);
                return;
            }
        }

        // 4. Enviar para o Backend
        const response = await fetch("/api/process-payment", { 
            method: "POST", 
            headers: { "Content-Type":"application/json" }, 
            body: JSON.stringify(paymentPayload) 
        });
        
        const result = await response.json();

        // 5. Tratamento da Resposta
        if (!response.ok || result.status === 'rejected' || result.status === 'cancelled') {
            const status = (response.status === 409) ? 'cancelled_sold_out' : 'failed_payment';
            await updateDoc(doc(db, "reservations", reservationIdRef), { status });
            
            if (status === 'cancelled_sold_out') {
                setIsSoldOut(true);
            } else {
                setErrorData({ title: "Pagamento recusado", msg: result.message || "Cartão recusado pelo banco." });
            }
            setProcessing(false); 
            return; 
        }

        if (paymentMethod === 'pix' && result.point_of_interaction) {
            setPixData(result.point_of_interaction.transaction_data); 
            setShowPixModal(true); 
            setProcessing(false);
        } else if (result.status === 'approved' || result.status === 'confirmed') {
            setProcessing(false); 
            setShowSuccess(true); 
            const finalData = { ...rawRes, paymentId: result.id, status: result.status };
            notifyCustomer(finalData, reservationIdRef).catch(console.error);
            notifyPartner(finalData, result.id).catch(console.error);
        } else {
            setProcessing(false); 
            alert("Pagamento em análise."); 
            navigate('/minhas-viagens');
        }

    } catch (err) {
        console.error("Erro Geral:", err);
        setErrorData({ title: "Erro", msg: "Falha na comunicação. Tente novamente." });
        setProcessing(false);
    }
};

  const handleSoldOutReturn = () => { navigate(-1); };
  const handlePixSuccess = async () => {
      if (showSuccess) return; 
      setShowSuccess(true); setShowPixModal(false);
      const email = user?.email || "cliente@mapadodayuse.com";
      const firstName = user?.displayName ? user.displayName.split(' ')[0] : "Cliente";
      const finalData = { ...bookingData, ownerId: itemData.ownerId, guestName: firstName, guestEmail: email, status: 'approved', paymentId: currentReservationId };
      notifyCustomer(finalData, currentReservationId).catch(console.error);
      setTimeout(() => { if (finalData.ownerId) notifyPartner(finalData, currentReservationId).catch(console.error); }, 500);
  };

  useEffect(() => {
      if (!currentReservationId || paymentMethod !== 'pix' || showSuccess) return;
      const unsubscribe = onSnapshot(doc(db, "reservations", currentReservationId), (docSnap) => {
          if (docSnap.exists() && docSnap.data().status === 'approved' && !showSuccess) {
              setShowPixModal(false); handlePixSuccess(); unsubscribe();
          }
      });
      return () => unsubscribe();
  }, [currentReservationId, paymentMethod, showSuccess]);

  if (!bookingData) return null; 

  return (
      <>
      <ProfileCompletionModal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} tempName={tempName} setTempName={setTempName} tempSurname={tempSurname} setTempSurname={setTempSurname} tempPhone={tempPhone} setTempPhone={setTempPhone} handleSaveProfile={handleSaveProfile} savingProfile={savingProfile} />
      {showSuccess && <SuccessModal isOpen={showSuccess} onClose={()=>setShowSuccess(false)} title="Reserva Confirmada!" message="Voucher enviado por e-mail." onAction={()=>navigate('/minhas-viagens')} actionLabel="Ver Ingressos" />}
      {isSoldOut && <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-3xl text-center max-w-sm"><h3 className="font-bold text-2xl">Esgotado!</h3><p>Alguém comprou na sua frente.</p><Button onClick={handleSoldOutReturn}>Voltar</Button></div></div>}
      {errorData && <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"><div className="bg-white p-8 rounded-3xl text-center max-w-sm"><h3 className="text-lg font-bold text-red-600 mb-2">{errorData.title}</h3><p className="mb-4">{errorData.msg}</p><button onClick={()=>setErrorData(null)} className="w-full bg-slate-100 py-2 rounded mt-4">OK</button></div></div>}
      {showPixModal && <PixModal isOpen={showPixModal} onClose={()=>setShowPixModal(false)} pixData={pixData} onConfirm={() => handlePixSuccess()} paymentId={currentReservationId} ownerId={itemData.ownerId} />}
      {showLogin && <LoginModal isOpen={showLogin} onClose={()=>setShowLogin(false)} onSuccess={()=>setShowLogin(false)} initialMode={initialAuthMode} />}

      <div className="max-w-6xl mx-auto pt-8 pb-20 px-4 animate-fade-in relative z-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 text-slate-500 hover:text-[#0097A8] font-medium transition-colors"><ChevronLeft size={18}/> Voltar para o local</button>

        {/* --- GRID CORRIGIDO --- */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            
            {/* Coluna Esquerda: Dados + Pagamento */}
            <div className="space-y-8">
                {/* 1. Identificação */}
                <div className={`bg-white p-6 rounded-3xl border shadow-sm transition-all ${user && checkProfileStatus() ? 'border-green-200 ring-1 ring-green-100' : 'border-orange-200 ring-4 ring-orange-50'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${user && checkProfileStatus() ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}><User size={20} /></div>
                        <div><h3 className="font-bold text-lg text-slate-900">{user ? `Olá, ${user.displayName ? user.displayName.split(' ')[0] : 'Visitante'}!` : 'Vamos começar?'}</h3><p className="text-xs text-slate-500">{user ? (checkProfileStatus() ? 'Dados confirmados.' : 'Complete seu cadastro.') : 'Identifique-se.'}</p></div>
                    </div>
                    {user ? (
                        <div className="space-y-3">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="font-bold text-slate-700 text-sm">{user.displayName}</p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                                <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-2">
                                    {checkProfileStatus() ? <div className="text-[10px] font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full flex items-center gap-1"><Lock size={8}/> Verificado</div> : <div className="text-[10px] font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded-full flex items-center gap-1">⚠️ Pendente</div>}
                                    <button onClick={() => { setTempName(user.displayName?.split(' ')[0]||''); setTempSurname(user.displayName?.split(' ').slice(1).join(' ')||''); setTempPhone(userProfile?.personalData?.phone||tempPhone); setShowCompleteModal(true); }} className="text-[10px] font-bold text-[#0097A8] underline cursor-pointer">Atualizar</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3"><Button onClick={()=>{ setInitialAuthMode('login'); setShowLogin(true); }} className="w-full !bg-white border-2 border-[#0097A8] !text-[#0097A8] font-bold">Entrar</Button><Button onClick={()=>{ setInitialAuthMode('register'); setShowLogin(true); }} className="w-full">Criar Conta</Button></div>
                    )}
                </div>

                {/* Resumo Mobile */}
                <div className="block md:hidden">
                    <OrderSummary isMobile={true} bookingData={bookingData} discount={discount} finalTotal={finalTotal} couponCode={couponCode} setCouponCode={setCouponCode} handleApplyCoupon={handleApplyCoupon} couponMsg={couponMsg} /> 
                </div>
            
                {/* 2. Pagamento */}
                <PaymentSection 
                    paymentMethod={paymentMethod} changeMethod={changeMethod} mpInstance={mpInstance} setMpPaymentMethodId={setMpPaymentMethodId} setIssuerId={setIssuerId}
                    cardName={cardName} setCardName={setCardName} docNumber={docNumber} setDocNumber={setDocNumber} installments={installments} setInstallments={setInstallments}
                    finalTotal={finalTotal} processPayment={processPayment} processing={processing} saveUserData={saveUserData} setSaveUserData={setSaveUserData} user={user}
                    addressProps={{ cep, setCep, handleCepBlur, loadingCep, showManualAddress, setShowManualAddress, addressStreet, setAddressStreet, addressNumber, setAddressNumber, addressNeighborhood, setAddressNeighborhood, addressState, setAddressState, addressCity, setAddressCity, ufList, cityList, loadingCities }}
                />
            </div>

            {/* Coluna Direita: Resumo Desktop (AGORA DENTRO DO GRID) */}
            <div className="hidden md:block">
                <OrderSummary bookingData={bookingData} discount={discount} finalTotal={finalTotal} couponCode={couponCode} setCouponCode={setCouponCode} handleApplyCoupon={handleApplyCoupon} couponMsg={couponMsg} />
            </div>

        </div>
      </div>
    </>
  );
};

export default CheckoutPage;