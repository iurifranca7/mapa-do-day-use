import React, { useState, useEffect, useRef } from 'react'; // 1. useRef Adicionado
import { createPortal } from 'react-dom'; 
import { doc, updateDoc, addDoc, getDocs, deleteDoc, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  User, MapPin, Info, Clock, Users, ShieldCheck, Coffee, 
  Edit, X, Image as ImageIcon, Trash2, Video, Search, Plus, Calendar, Utensils,
  MoreVertical, Power, AlertTriangle, ArrowLeft, Loader2, ExternalLink, Check, Rocket, Ban 
} from 'lucide-react';
import Button from './Button';
import ModalOverlay from './ModalOverlay';
import FeedbackModal from './FeedbackModal';
import { generateSlug, formatBRL } from '../utils/format';

// --- CONSTANTES ---
const AMENITIES_LIST = [
  "Piscina adulto", "Piscina infantil", "Piscina aquecida", "Cachoeira / Riacho", "Cascata/Cachoeira artificial",
    "Acesso à represa / lago", "Bicicletas", "Quadriciclo", "Passeio a cavalo", "Caiaque / Stand up",
    "Trilha", "Pesque e solte", "Fazendinha / Animais", "Espaço kids", "Recreação infantil",
    "Quadra de areia", "Campo de futebol", "Campo de vôlei e peteca", "Beach tennis / futvôlei",
    "Academia", "Sauna mista a vapor", "Hidromassagem / Banheira / Ofurô", "Massagem",
    "Espaço para meditação", "Capela", "Redes", "Vista / Mirante", "Fogo de chão / Lareira",
    "Churrasqueira", "Cozinha equipada", "Bar / Restaurante / Quiosque", "Sala de jogos", "Música ao vivo", 
    "Estacionamento", "Wi-Fi", "Piscina climatizada", "Playground", "Área verde", "Lagoa com água da nascente", 
    "Piscina com água da nascente", "Pratos e talheres", "Tomadas disponíveis", "Pia com torneira", "Tirolesa infantil",
    "Tirolesa Adulto", "Gangorra", "Cachoeira com túnel",  "Parque aquático adulto", "Piscina coberta", "Sauna masculina a vapor",
    "Sauna feminina a vapor", "Vara de pesca", "Iscas para pesca", "Banheiro com ducha quente","Lago", "Pesque e pague", "Balanço",
    "Ducha fria", "Banheiros com ducha", "Sinuca", "Espaço de leitura", "Quadra poliesportiva", "Piscina semiolímpica", 
    "Quadra de peteca e vôlei", "Barco a remo", "Pedalinho", "Bike park", "Escorrega de sabão", "Cama elástica infantil",
    "Vale jurássico", "Piscina de borda infinita", "Solarium", "Toboágua", "Acesso a acomodação", "Monitor infantil", "Passeio de charrete"
];

const MEALS_LIST = [
  "Café da manhã", "Almoço", "Café da tarde", "Petiscos", "Sobremesas", "Bebidas NÃO Alcoólicas", "Bebidas Alcoólicas", "Buffet Livre"
];

const PartnerMyDayUse = ({ user }) => {
  // --- STATES GERAIS ---
  const [loading, setLoading] = useState(false);
  
  // 🔥 2. TRAVA DE SEGURANÇA (Isso impede a duplicação)
  const isSavingRef = useRef(false); 

  const [feedback, setFeedback] = useState(null);
  const [viewMode, setViewMode] = useState('list'); 
  
  // --- STATES LISTAGEM ---
  const [dayUsesList, setDayUsesList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- STATES EDIÇÃO ---
  const [editModal, setEditModal] = useState(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cities, setCities] = useState([]); 
  const [loadingCities, setLoadingCities] = useState(false);
  const [amenitySearch, setAmenitySearch] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [blockedDateInput, setBlockedDateInput] = useState('');
  
  const states = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  const initialFormState = {
    id: null,
    status: 'active', 
    contactName: '', contactEmail: '', contactPhone: '', contactJob: '',
    cnpj: '', name: '', cep: '', street: '', number: '', district: '', city: '', state: '',
    localEmail: '', localPhone: '', localWhatsapp: '', referencePoint: '',
    description: '', videoUrl: '', menuUrl: '', logoUrl: '', images: ['', '', '', '', '', ''],
    availableDays: [0, 6], 
    openingTime: '09:00', closingTime: '18:00', specialDates: [],
    blockedDates: [],
    capacityAdults: '', capacityChildren: '', capacityPets: '',
    parkingCars: '', parkingMoto: '',
    acceptsPets: false, hasPaidParking: false,
    allowFood: false, hasSearch: false, usageRules: '', cancellationPolicy: '', observations: '',
    amenities: [], meals: [], notIncludedItems: ''
  };
  
  const [formData, setFormData] = useState(initialFormState);

  // 1. CARREGAR LISTA
  // 1. CARREGAR LISTA
  const fetchDayUses = async () => {
    if (!user) {
        console.log("❌ [MY DAY USE] Usuário não detectado ainda.");
        return;
    }

    setLoadingList(true);
    
    // 🔥 DEFINIÇÃO DO ID ALVO (Com Logs)
    const targetId = user.effectiveOwnerId || user.uid;

    console.group("🔍 [DEBUG MY DAY USE] Iniciando Busca");
    console.log("1. Objeto User Recebido:", user);
    console.log("2. UID do Usuário:", user.uid);
    console.log("3. EffectiveOwnerId:", user.effectiveOwnerId);
    console.log("🎯 ID FINAL USADO NA QUERY:", targetId);
    console.groupEnd();

    try {
      // A Query corrigida
      const q = query(collection(db, "dayuses"), where("ownerId", "==", targetId));
      
      const querySnapshot = await getDocs(q);
      
      console.log(`📊 [RESULTADO] Encontrados ${querySnapshot.size} Day Uses para o ID ${targetId}`);

      const list = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,      
            id: doc.id    
          };
      });
      setDayUsesList(list);
    } catch (error) {
      console.error("❌ Erro ao buscar lista:", error);
      // Se for erro de permissão, vai aparecer aqui
      if (error.code === 'permission-denied') {
          console.error("🚫 O Firebase bloqueou a leitura. Verifique se as regras permitem que o usuário", user.uid, "leia dados do dono", targetId);
      }
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchDayUses();
  }, [user]);

  // 2. CARREGAR CIDADES
  useEffect(() => {
    if (viewMode === 'edit' && formData.state) {
      setLoadingCities(true);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios`)
        .then(res => res.json())
        .then(data => {
          setCities(data.sort((a, b) => a.nome.localeCompare(b.nome)));
          setLoadingCities(false);
        })
        .catch(() => setLoadingCities(false));
    } else {
      setCities([]);
    }
  }, [formData.state, viewMode]);


  // --- ACTIONS ---

  const handleCreateNew = () => {
    setFormData({ 
        ...initialFormState, 
        contactName: user.displayName || '', 
        contactEmail: user.email || '' 
    });
    setViewMode('edit');
  };

  const handleEditItem = (item) => {

    console.log("🛠️ [DEBUG] Botão Editar Clicado!");
    console.log("🛠️ [DEBUG] Item recebido para edição:", item);
    console.log("🛠️ [DEBUG] ID do item:", item?.id);

    let loadedImages = item.images || [];
    while (loadedImages.length < 6) loadedImages.push('');

    setFormData({
        ...initialFormState, 
        ...item,
        images: loadedImages,
        availableDays: item.availableDays || [0, 6],
        blockedDates: item.blockedDates || [],
        amenities: item.amenities || [],
        meals: item.meals || [],
        capacityAdults: item.dailyStock?.adults || item.capacityAdults || '',
        capacityChildren: item.dailyStock?.children || item.capacityChildren || '',
        capacityPets: item.dailyStock?.pets || item.capacityPets || ''
    });
    setViewMode('edit');
  };

  const handleToggleStatus = async (item) => {
    const isCurrentlyActive = item.status === 'active';
    const newStatus = isCurrentlyActive ? 'paused' : 'active';
    const newPausedValue = newStatus !== 'active';

    try {
        const docRef = doc(db, "dayuses", item.id);
        
        await updateDoc(docRef, {
            status: newStatus,          
            paused: newPausedValue,     
            updatedAt: new Date()
        });

        setDayUsesList(currentList => currentList.map(d => 
            d.id === item.id 
                ? { ...d, status: newStatus, paused: newPausedValue } 
                : d
        ));

    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Não foi possível alterar o status. Verifique sua conexão.");
    }
  };

  const handleDeleteItem = async (id) => {
    if(!window.confirm("Tem certeza que deseja excluir este Day Use? Essa ação não pode ser desfeita.")) return;
    try {
        await deleteDoc(doc(db, "dayuses", id));
        fetchDayUses();
        setFeedback({ type: 'success', title: 'Excluído', msg: 'Day Use removido com sucesso.' });
    } catch (error) {
        setFeedback({ type: 'error', title: 'Erro', msg: 'Erro ao excluir.' });
    }
  };

  // --- HANDLERS DO FORMULÁRIO ---
  // (Mantidos iguais aos anteriores, omitindo para economizar espaço se já estiverem ok)
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    if (val.length > 10) val = val.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (val.length > 5) val = val.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (val.length > 2) val = val.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    setFormData(prev => ({ ...prev, contactPhone: val }));
  };

  const handleCnpjChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 14) val = val.slice(0, 14);
    val = val.replace(/^(\d{2})(\d)/, '$1.$2');
    val = val.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    val = val.replace(/\.(\d{3})(\d)/, '.$1/$2');
    val = val.replace(/(\d{4})(\d)/, '$1-$2');
    setFormData({ ...formData, cnpj: val });
  };

  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
            setFormData(prev => ({
                ...prev,
                street: data.logradouro,
                district: data.bairro,
                city: data.localidade,
                state: data.uf,
                number: prev.number || '' 
            }));
        } else {
            setFeedback({ type: 'warning', title: 'CEP não encontrado', msg: 'Verifique se o número está correto.' });
        }
    } catch (error) {
        console.error("Erro CEP:", error);
    } finally {
        setCepLoading(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const scaleSize = MAX_WIDTH / img.width;
          if (scaleSize < 1) {
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
          } else {
              canvas.width = img.width;
              canvas.height = img.height;
          }
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        };
      };
    });
  };

  const handleFileUpload = async (index, e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true); 
      try {
          const compressedBase64 = await compressImage(file);
          const newImages = [...formData.images];
          newImages[index] = compressedBase64;
          setFormData({ ...formData, images: newImages });
      } catch (error) {
          alert("Erro ao processar imagem.");
      } finally {
          setLoading(false);
      }
    }
  };

  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages[index] = '';
    setFormData({ ...formData, images: newImages });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true); 
      try {
          const compressedBase64 = await compressImage(file);
          setFormData({ ...formData, logoUrl: compressedBase64 });
      } catch (error) {
          alert("Erro ao processar logo.");
      } finally {
          setLoading(false);
      }
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logoUrl: '' });
  };

  // 🔥 3. FUNÇÃO BLINDADA CONTRA DUPLICIDADE 🔥
  const handleSave = async () => {
    // SE JÁ ESTIVER SALVANDO, ABORTA IMEDIATAMENTE (Trava de duplo clique)
    if (isSavingRef.current) return; 

    setLoading(true);
    isSavingRef.current = true; // Ativa a trava

    try {
      // Validações
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (formData.contactEmail && !emailRegex.test(formData.contactEmail.trim())) {
          setFeedback({ type: 'error', title: 'E-mail Inválido', msg: 'Digite um e-mail válido.' });
          setLoading(false); isSavingRef.current = false; return;
      }
      const cleanPhone = formData.contactPhone.replace(/\D/g, '');
      if (formData.contactPhone && (cleanPhone.length < 10 || cleanPhone.length > 11)) {
          setFeedback({ type: 'error', title: 'Telefone Inválido', msg: 'DDD + Número (10 ou 11 dígitos).' });
          setLoading(false); isSavingRef.current = false; return;
      }
      const cleanCnpj = formData.cnpj ? formData.cnpj.replace(/\D/g, '') : '';
      if (formData.cnpj && cleanCnpj.length !== 14) {
          setFeedback({ type: 'error', title: 'CNPJ Inválido', msg: 'O CNPJ deve conter 14 dígitos.' });
          setLoading(false); isSavingRef.current = false; return;
      }

      // ADICIONE ESTES LOGS LOGO APÓS AS TRAVAS DE SEGURANÇA
    console.log("💾 [DEBUG] handleSave Iniciado");
    console.log("💾 [DEBUG] Estado atual do formData:", formData);
    console.log("💾 [DEBUG] formData.id é:", formData.id);
    console.log("💾 [DEBUG] Tipo do ID:", typeof formData.id);

      // Prepara Dados
      // Mantém o slug existente se for edição, cria novo se for novo
      const generatedSlug = formData.slug || generateSlug(formData.name);
      
      const dataToSave = {
        ...formData,
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        ownerId: user.effectiveOwnerId || user.uid,
        slug: generatedSlug,
        updatedAt: new Date(),
        status: 'active',
        paused: false, 
        dailyStock: {
            adults: Number(formData.capacityAdults),
            children: Number(formData.capacityChildren),
            pets: Number(formData.capacityPets)
        }
      };

      let savedId = formData.id;
      
      if (formData.id) {

        // ADICIONE ESTE LOG DENTRO DO IF
        console.log("🔄 [DEBUG] Entrando no fluxo de UPDATE (Atualização). ID:", formData.id);
        // Atualiza existente
        await updateDoc(doc(db, "dayuses", formData.id), dataToSave);
      } else {

        console.log("✨ [DEBUG] Entrando no fluxo de CREATE (Criação Nova). Motivo: ID é nulo.");
        // Cria novo
        const docRef = await addDoc(collection(db, "dayuses"), { ...dataToSave, createdAt: new Date() });
        savedId = docRef.id;

        console.log("✅ [DEBUG] Novo documento criado com ID:", savedId);
      }

      // Atualiza o estado local para que o próximo clique seja uma EDIÇÃO e não CRIAÇÃO
      setFormData(prev => ({ 
          ...prev, 
          id: savedId, 
          slug: generatedSlug, 
          status: 'active' 
      }));

      // Atualiza a lista na tela principal também
      fetchDayUses();

      setEditModal(null);
      setShowPublishModal(true);
      
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', title: 'Erro', msg: 'Não foi possível publicar.' });
    } finally {
      setLoading(false);
      isSavingRef.current = false; // Libera a trava SEMPRE no final
    }
  };

  // --- RENDERIZAÇÃO ---

  const SectionCard = ({ title, icon, onEdit, children }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0097A8]/10 text-[#0097A8] flex items-center justify-center">
            {icon}
          </div>
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
        </div>
        <button onClick={onEdit} className="text-sm font-bold text-[#0097A8] hover:bg-[#0097A8]/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
          <Edit size={16}/> Editar
        </button>
      </div>
      <div className="text-sm text-slate-500 space-y-2 flex-1">
        {children}
      </div>
    </div>
  );

  if (viewMode === 'list') {
      const filteredList = dayUsesList.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      return (
        <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="w-full md:w-auto">
                    <h1 className="text-3xl font-bold text-slate-900">Meu Day Use</h1>
                    <p className="text-slate-500">Gerencie seus estabelecimentos.</p>
                </div>
                <Button onClick={handleCreateNew} className="flex items-center gap-2 px-6">
                    <Plus size={20}/> Novo Day Use
                </Button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                    <input 
                        type="text" 
                        placeholder="Buscar por nome..." 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="hidden md:block">
                     <select className="bg-white border border-slate-200 text-slate-600 py-2 px-4 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50">
                        <option>Todos</option>
                        <option>Ativos</option>
                        <option>Pausados</option>
                     </select>
                </div>
            </div>

            {!loadingList && filteredList.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Coffee size={32}/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Nenhum Day Use encontrado</h3>
                    <p className="text-slate-500 text-sm mt-1 mb-6">Cadastre seu primeiro estabelecimento para começar.</p>
                    <Button onClick={handleCreateNew} variant="outline">Cadastrar Agora</Button>
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredList.map(item => (
                    <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                        <div className="h-48 bg-slate-100 relative">
                            {item.images && item.images[0] ? (
                                <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.name}/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ImageIcon size={40}/>
                                </div>
                            )}
                            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border ${
                                item.status === 'paused' 
                                ? 'bg-amber-100/90 text-amber-700 border-amber-200' 
                                : 'bg-green-100/90 text-green-700 border-green-200'
                            }`}>
                                {item.status === 'paused' ? 'Vendas Pausadas' : 'Vendas Ativadas'}
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="font-bold text-xl text-slate-900 mb-1 line-clamp-1" title={item.name}>{item.name || 'Sem Nome'}</h3>
                            <p className="text-xs text-slate-400 mb-6 flex items-center gap-1">
                                <Clock size={12}/> Atualizado em: {item.updatedAt?.seconds ? new Date(item.updatedAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Hoje'}
                            </p>
                            
                            <div className="mt-auto grid grid-cols-3 gap-2">
                                <button 
                                    onClick={() => handleToggleStatus(item)}
                                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-colors font-bold text-xs w-full h-20 
                                    ${item.status === 'active' 
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100' 
                                        : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100' 
                                    }`}
                                >
                                    {item.status === 'active' ? (
                                        <>
                                            <Ban size={20} />
                                            Pausar
                                        </>
                                    ) : (
                                        <>
                                            <Power size={20} />
                                            Ativar
                                        </>
                                    )}
                                </button>

                                <button 
                                    onClick={() => handleEditItem(item)}
                                    className="col-span-1 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 flex flex-col items-center justify-center gap-1 transition-colors"
                                >
                                    <Edit size={16}/> Editar
                                </button>
                                <button 
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="col-span-1 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 flex flex-col items-center justify-center gap-1 transition-colors"
                                >
                                    <Trash2 size={16}/> Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {feedback && createPortal(
                <FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback?.type} title={feedback?.title} msg={feedback?.msg} />,
                document.body
            )}
        </div>
      );
  }

  // MODO EDIÇÃO
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
            <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <ArrowLeft size={24}/>
            </button>
            <div>
                <h1 className="text-3xl font-bold text-slate-900">{formData.id ? 'Editar Day Use' : 'Novo Day Use'}</h1>
                <p className="text-slate-500">{formData.name || 'Preencha as informações abaixo'}</p>
            </div>
        </div>
        <div className="flex gap-3">
             {formData.id && (
                <Button 
                    onClick={() => window.open(`/preview/${formData.id}`, '_blank')} 
                    variant="outline"
                    className="hidden md:flex"
                >
                    Ver Preview
                </Button>
             )}
             
             <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 pl-4 pr-6">
                {loading ? <Loader2 className="animate-spin"/> : <><Rocket size={20}/> Publicar</>}
             </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 pb-20">
        
        <SectionCard title="Dados do Responsável" icon={<User size={20}/>} onEdit={() => setEditModal('manager')}>
          <p><strong className="text-slate-700">Nome:</strong> {formData.contactName || '-'}</p>
          <p><strong className="text-slate-700">E-mail:</strong> {formData.contactEmail || '-'}</p>
          <p><strong className="text-slate-700">Telefone:</strong> {formData.contactPhone || '-'}</p>
          <p><strong className="text-slate-700">Cargo:</strong> {formData.contactJob || '-'}</p>
        </SectionCard>

        <SectionCard title="Dados do Local" icon={<MapPin size={20}/>} onEdit={() => setEditModal('local')}>
          <p><strong className="text-slate-700">Nome Fantasia:</strong> {formData.name || '-'}</p>
          <p><strong className="text-slate-700">CNPJ:</strong> {formData.cnpj || '-'}</p>
          <p><strong className="text-slate-700">WhatsApp:</strong> {formData.localWhatsapp || '-'}</p>
          <p><strong className="text-slate-700">Endereço:</strong> {formData.street ? `${formData.street}, ${formData.number} - ${formData.city}/${formData.state}` : '-'}</p>
        </SectionCard>

        <SectionCard title="Sobre o Day Use" icon={<Info size={20}/>} onEdit={() => setEditModal('about')}>
          <p className="line-clamp-3"><strong className="text-slate-700">Descrição:</strong> {formData.description || '-'}</p>
          <div className="flex gap-2 mt-2">
            {formData.images.slice(0, 3).map((img, i) => img && <img key={i} src={img} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />)}
            {formData.images.filter(i=>i).length > 3 && <span className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">+{formData.images.filter(i=>i).length - 3}</span>}
          </div>
        </SectionCard>

        <SectionCard title="Funcionamento" icon={<Clock size={20}/>} onEdit={() => setEditModal('operation')}>
          <p><strong className="text-slate-700">Horário Geral:</strong> {formData.openingTime} às {formData.closingTime}</p>
          <p><strong className="text-slate-700">Dias:</strong> {formData.availableDays.length === 7 ? 'Todos os dias' : 
             formData.availableDays.length === 0 ? 'Fechado' : 
             formData.availableDays.map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}
          </p>
          {formData.specialDates?.length > 0 && (
              <p className="text-xs text-[#0097A8] font-bold mt-1">
                  {formData.specialDates.length} datas especiais configuradas
              </p>
          )}
          {formData.blockedDates?.length > 0 && (
              <p className="text-xs text-red-500 font-bold mt-1">
                  {formData.blockedDates.length} datas bloqueadas
              </p>
          )}
        </SectionCard>

        <SectionCard title="Capacidade" icon={<Users size={20}/>} onEdit={() => setEditModal('capacity')}>
          <div className="grid grid-cols-2 gap-2">
            <p><strong className="text-slate-700">Adultos:</strong> {formData.capacityAdults || '-'}</p>
            <p><strong className="text-slate-700">Crianças:</strong> {formData.capacityChildren || '-'}</p>
            <p><strong className="text-slate-700">Pets:</strong> {formData.acceptsPets ? formData.capacityPets : 'Não aceita'}</p>
            <p><strong className="text-slate-700">Carros:</strong> {formData.hasPaidParking ? formData.parkingCars : 'Sem estacionamento pago'}</p>
          </div>
        </SectionCard>

        <SectionCard title="Regras de Acesso" icon={<ShieldCheck size={20}/>} onEdit={() => setEditModal('rules')}>
          <p><strong className="text-slate-700">Alimentos:</strong> {formData.allowFood ? 'Permitido ✅' : 'Proibido 🚫'}</p>
          <p><strong className="text-slate-700">Revista:</strong> {formData.hasSearch ? 'Sim' : 'Não'}</p>
          <p className="mt-2 text-xs text-slate-500 line-clamp-2">{formData.usageRules || 'Sem regras adicionais.'}</p>
        </SectionCard>

        <SectionCard title="Comodidades e Lazer" icon={<Coffee size={20}/>} onEdit={() => setEditModal('amenities')}>
          <p><strong className="text-slate-700">Itens:</strong> {formData.amenities.length} selecionados</p>
          <p><strong className="text-slate-700">Alimentação:</strong> {formData.meals.length} opções</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.amenities.slice(0, 5).map(a => <span key={a} className="text-[10px] bg-slate-100 px-2 py-1 rounded">{a}</span>)}
            {formData.amenities.length > 5 && <span className="text-[10px] bg-slate-100 px-2 py-1 rounded">...</span>}
          </div>
        </SectionCard>

      </div>

      {editModal === 'manager' && createPortal(
        <ModalOverlay onClose={() => setEditModal(null)}>
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-3xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><User size={20}/></div>
                <h3 className="font-bold text-2xl text-slate-900">Dados do Responsável</h3>
              </div>
              <button onClick={()=>setEditModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">Nome Completo</label>
                      <input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" value={formData.contactName} onChange={e=>setFormData({...formData, contactName: e.target.value})} />
                  </div>
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">Cargo</label>
                      <select 
                          className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" 
                          value={formData.contactJob} 
                          onChange={e=>setFormData({...formData, contactJob: e.target.value})}
                      >
                          <option value="">Selecione...</option>
                          <option value="Sócio/Proprietário">Sócio / Proprietário</option>
                          <option value="Gerente">Gerente</option>
                          <option value="Outros">Outros</option>
                      </select>
                  </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">E-mail Corporativo</label>
                      <input 
                          type="email" 
                          className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" 
                          value={formData.contactEmail} 
                          onChange={e=>setFormData({...formData, contactEmail: e.target.value})} 
                          placeholder="nome@empresa.com.br"
                      />
                  </div>
                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">Telefone / WhatsApp</label>
                      <input 
                          className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" 
                          placeholder="(00) 00000-0000"
                          value={formData.contactPhone} 
                          onChange={handlePhoneChange} 
                          maxLength={15}
                      />
                  </div>
              </div>
              <Button onClick={() => setEditModal(null)} className="w-full py-4 text-lg mt-4">Confirmar</Button>
            </div>
          </div>
        </ModalOverlay>, document.body
      )}

      {editModal === 'local' && createPortal(
        <ModalOverlay onClose={() => setEditModal(null)}>
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-4xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><MapPin size={20}/></div>
                <h3 className="font-bold text-2xl text-slate-900">Dados do Local</h3>
              </div>
              <button onClick={()=>setEditModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="space-y-8">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Informações Públicas</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                      <div>
                          <label className="text-sm font-bold text-slate-700 block mb-1">Nome Fantasia</label>
                          <input className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-sm font-bold text-slate-700 block mb-1">CNPJ</label>
                          <input 
                              className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" 
                              value={formData.cnpj} 
                              onChange={handleCnpjChange} 
                              placeholder="00.000.000/0000-00"
                              maxLength={18}
                          />
                      </div>
                  </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1">WhatsApp (Principal)</label>
                    <input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" value={formData.localWhatsapp} onChange={e=>setFormData({...formData, localWhatsapp: e.target.value})} />
                </div>
                <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1">Telefone Fixo</label>
                    <input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" value={formData.localPhone} onChange={e=>setFormData({...formData, localPhone: e.target.value})} />
                </div>
                <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1">E-mail do Local</label>
                    <input type="email" className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" value={formData.localEmail} onChange={e=>setFormData({...formData, localEmail: e.target.value})} />
                </div>
              </div>
              
              <hr className="border-slate-100" />

              <div>
                  <div className="flex justify-between items-center mb-4">
                      <p className="text-lg font-bold text-slate-800">Endereço</p>
                      {cepLoading && <span className="text-xs font-bold text-[#0097A8] flex items-center gap-1"><span className="w-2 h-2 bg-[#0097A8] rounded-full animate-ping"></span> Buscando CEP...</span>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-3">
                        <label className="text-xs font-bold text-slate-500 block mb-1">CEP</label>
                        <input 
                            className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8] focus:ring-2 focus:ring-blue-50 transition-all" 
                            placeholder="00000-000"
                            value={formData.cep} 
                            onChange={e=>setFormData({...formData, cep: e.target.value})}
                            onBlur={handleCepBlur}
                        />
                    </div>

                    <div className="md:col-span-3">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Estado (UF)</label>
                        <select 
                            className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" 
                            value={formData.state} 
                            onChange={e=>setFormData({...formData, state: e.target.value, city: ''})} 
                        >
                            <option value="">UF</option>
                            {states.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-6">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Cidade</label>
                        <select 
                            className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8] disabled:bg-slate-50 disabled:text-slate-400" 
                            value={formData.city} 
                            onChange={e=>setFormData({...formData, city: e.target.value})}
                            disabled={!formData.state || loadingCities}
                        >
                            <option value="">{loadingCities ? 'Carregando...' : 'Selecione a cidade'}</option>
                            {cities.map(city => (
                                <option key={city.id} value={city.nome}>{city.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-9">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Rua / Logradouro</label>
                        <input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" value={formData.street} onChange={e=>setFormData({...formData, street: e.target.value})} />
                    </div>
                    <div className="md:col-span-3">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Número</label>
                        <input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" placeholder="Ex: 120" value={formData.number} onChange={e=>setFormData({...formData, number: e.target.value})} />
                    </div>

                    <div className="md:col-span-4">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Bairro</label>
                        <input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" value={formData.district} onChange={e=>setFormData({...formData, district: e.target.value})} />
                    </div>
                    <div className="md:col-span-8">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Ponto de Referência</label>
                        <input className="w-full border p-3 rounded-xl outline-none focus:border-[#0097A8]" placeholder="Ex: Ao lado do posto Ipiranga..." value={formData.referencePoint || ''} onChange={e=>setFormData({...formData, referencePoint: e.target.value})} />
                    </div>
                  </div>
              </div>
              <Button onClick={() => setEditModal(null)} className="w-full py-4 text-lg mt-4">Confirmar</Button>
            </div>
          </div>
        </ModalOverlay>, document.body
      )}

      {editModal === 'about' && createPortal(
        <ModalOverlay onClose={() => setEditModal(null)}>
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-5xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Info size={20}/></div>
                <h3 className="font-bold text-2xl text-slate-900">Sobre o Day Use</h3>
              </div>
              <button onClick={()=>setEditModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Logo do Estabelecimento</label>
                        <div className="flex items-start gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className={`relative w-32 h-32 shrink-0 bg-white rounded-2xl flex items-center justify-center overflow-hidden group transition-all ${formData.logoUrl ? 'border-2 border-white shadow-md' : 'border-2 border-dashed border-slate-300 hover:border-[#0097A8]'}`}>
                                {formData.logoUrl ? (
                                    <>
                                        <img src={formData.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                        <button 
                                            onClick={removeLogo} 
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 cursor-pointer"
                                        >
                                            <div className="bg-white p-2 rounded-full text-red-500 hover:bg-red-50 shadow-sm">
                                                <Trash2 size={18}/>
                                            </div>
                                        </button>
                                    </>
                                ) : (
                                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-[#0097A8] transition-colors text-center p-2">
                                        <ImageIcon size={24} className="mb-2"/>
                                        <span className="text-[10px] font-bold uppercase leading-tight">Carregar Logo</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    </label>
                                )}
                            </div>
                            <div className="flex-1 py-2">
                                <p className="text-sm font-bold text-slate-700 mb-2">Formato da Imagem</p>
                                <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-xl text-xs text-yellow-800 leading-relaxed">
                                    <strong className="block mb-1">⚠️ Importante:</strong>
                                    Utilize uma imagem <strong>quadrada</strong> (proporção 1:1). <br/>
                                    Tamanho recomendado: <strong>600x600 pixels</strong>.
                                </div>
                            </div>
                        </div>
                    </div>
                    <hr className="border-slate-100" />

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Descrição da Experiência</label>
                        <textarea 
                            className="w-full border p-4 rounded-xl h-48 resize-none leading-relaxed outline-none focus:border-[#0097A8] transition-colors" 
                            placeholder="Descreva o que torna seu Day Use incrível..." 
                            value={formData.description} 
                            onChange={e=>setFormData({...formData, description: e.target.value})} 
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Vídeo do YouTube</label>
                            <div className="relative">
                                <Video size={18} className="absolute left-3 top-3.5 text-slate-400"/>
                                <input 
                                    className="w-full border p-3 pl-10 rounded-xl outline-none focus:border-[#0097A8] text-sm" 
                                    placeholder="Cole o link aqui (https://...)" 
                                    value={formData.videoUrl} 
                                    onChange={e=>setFormData({...formData, videoUrl: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                                Link do Cardápio <span className="text-xs font-normal text-slate-400">(Opcional)</span>
                            </label>
                            <div className="relative">
                                <Utensils size={18} className="absolute left-3 top-3.5 text-slate-400"/>
                                <input 
                                    className="w-full border p-3 pl-10 rounded-xl outline-none focus:border-[#0097A8] text-sm" 
                                    placeholder="Link para PDF, Google Drive ou site..." 
                                    value={formData.menuUrl || ''} 
                                    onChange={e=>setFormData({...formData, menuUrl: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-8 md:pt-0 md:pl-8">
                    <div className="flex justify-between items-end mb-4">
                        <label className="block text-sm font-bold text-slate-700">Galeria de Fotos</label>
                        <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100">
                            Exibidas no topo da página
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {formData.images.map((img, i) => (
                        <div key={i} className={`relative aspect-video rounded-xl border-2 flex items-center justify-center overflow-hidden group transition-all ${img ? 'border-transparent shadow-sm' : 'border-dashed border-slate-300 hover:border-[#0097A8] bg-slate-50'}`}>
                            {img ? (
                                <>
                                    <img src={img} className="w-full h-full object-cover" alt={`Foto ${i+1}`} />
                                    <button 
                                        onClick={() => removeImage(i)} 
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 cursor-pointer"
                                    >
                                        <div className="bg-white p-2 rounded-full text-red-500 hover:bg-red-50 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                            <Trash2 size={20}/>
                                        </div>
                                    </button>
                                </>
                            ) : (
                                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-[#0097A8] transition-colors">
                                    <ImageIcon size={28} className="mb-1"/>
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Foto {i+1}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(i, e)} />
                                </label>
                            )}
                        </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-4 text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        * Adicione 6 fotos de alta qualidade do seu espaço. Elas serão comprimidas automaticamente.
                    </p>
                </div>
            </div>
            <Button onClick={() => setEditModal(null)} className="w-full py-4 text-lg mt-8 shadow-xl">Confirmar</Button>
          </div>
        </ModalOverlay>, document.body
      )}

      {editModal === 'operation' && createPortal(
        <ModalOverlay onClose={() => setEditModal(null)}>
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-4xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Clock size={20}/></div>
                <h3 className="font-bold text-2xl text-slate-900">Funcionamento</h3>
              </div>
              <button onClick={()=>setEditModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="space-y-8">
                <div>
                    <label className="text-sm font-bold text-slate-700 block mb-4">Dias de Funcionamento Padrão</label>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, index) => {
                            const isSelected = formData.availableDays.includes(index);
                            return (
                                <button
                                    key={index}
                                    onClick={() => {
                                        const newDays = isSelected 
                                            ? formData.availableDays.filter(d => d !== index)
                                            : [...formData.availableDays, index];
                                        setFormData({...formData, availableDays: newDays.sort()});
                                    }}
                                    className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 transition-all ${
                                        isSelected 
                                        ? 'border-[#0097A8] bg-[#0097A8]/5 text-[#0097A8] shadow-sm' 
                                        : 'border-slate-100 text-slate-400 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="text-xs uppercase font-bold">{day.substring(0, 3)}</span>
                                    {isSelected && <span className="w-2 h-2 bg-[#0097A8] rounded-full mt-2"></span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="text-sm font-bold text-slate-700 block mb-4">Horário de Funcionamento Geral</label>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <span className="text-xs text-slate-500 mb-1 block">Abertura</span>
                            <input 
                                type="time" 
                                className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" 
                                value={formData.openingTime} 
                                onChange={e => setFormData({...formData, openingTime: e.target.value})}
                            />
                        </div>
                        <span className="text-slate-300 font-bold mt-4">-</span>
                        <div className="flex-1">
                            <span className="text-xs text-slate-500 mb-1 block">Fechamento</span>
                            <input 
                                type="time" 
                                className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" 
                                value={formData.closingTime} 
                                onChange={e => setFormData({...formData, closingTime: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Calendar size={16}/> Horários Especiais / Feriados
                        </label>
                        <button 
                            onClick={() => {
                                const newSpecial = [...(formData.specialDates || []), { date: '', open: '09:00', close: '18:00', note: '' }];
                                setFormData({...formData, specialDates: newSpecial});
                            }}
                            className="text-xs font-bold text-[#0097A8] flex items-center gap-1 hover:underline"
                        >
                            <Plus size={14}/> Adicionar Data
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(!formData.specialDates || formData.specialDates.length === 0) && (
                            <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-sm">
                                Nenhuma data especial configurada.
                            </div>
                        )}
                        {formData.specialDates?.map((item, idx) => (
                             <div key={idx} className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 items-end md:items-center animate-fade-in">
                                <div className="flex-1 w-full"><span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Data</span><input type="date" className="w-full border p-2 rounded-lg text-sm bg-slate-50" value={item.date} onChange={e => { const list = [...formData.specialDates]; list[idx].date = e.target.value; setFormData({...formData, specialDates: list}); }} /></div>
                                <div className="w-24"><span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Abre</span><input type="time" className="w-full border p-2 rounded-lg text-sm" value={item.open} onChange={e => { const list = [...formData.specialDates]; list[idx].open = e.target.value; setFormData({...formData, specialDates: list}); }} /></div>
                                <div className="w-24"><span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Fecha</span><input type="time" className="w-full border p-2 rounded-lg text-sm" value={item.close} onChange={e => { const list = [...formData.specialDates]; list[idx].close = e.target.value; setFormData({...formData, specialDates: list}); }} /></div>
                                <div className="flex-1 w-full"><span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Motivo</span><input type="text" placeholder="Ex: Natal" className="w-full border p-2 rounded-lg text-sm" value={item.note} onChange={e => { const list = [...formData.specialDates]; list[idx].note = e.target.value; setFormData({...formData, specialDates: list}); }} /></div>
                                <button onClick={() => { const list = formData.specialDates.filter((_, i) => i !== idx); setFormData({...formData, specialDates: list}); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors mb-0.5"><Trash2 size={18}/></button>
                             </div>
                        ))}
                    </div>
                </div>

                <hr className="border-slate-100" />
                
                <div>
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                        <Ban size={16} className="text-red-500"/> Datas Bloqueadas (Exceções)
                    </label>
                    <p className="text-xs text-slate-400 mb-3">
                        Selecione dias específicos em que o local estará fechado, mesmo que seja um dia de funcionamento normal.
                    </p>

                    <div className="flex gap-2 mb-4">
                        <input 
                            type="date" 
                            className="border p-2 rounded-xl text-sm flex-1 outline-none focus:border-[#0097A8] bg-slate-50"
                            value={blockedDateInput}
                            onChange={(e) => setBlockedDateInput(e.target.value)}
                        />
                        <button 
                            onClick={() => {
                                if (!blockedDateInput) return;
                                if (formData.blockedDates.includes(blockedDateInput)) {
                                    alert("Esta data já está bloqueada.");
                                    return;
                                }
                                setFormData({
                                    ...formData, 
                                    blockedDates: [...(formData.blockedDates || []), blockedDateInput].sort()
                                });
                                setBlockedDateInput('');
                            }}
                            className="bg-slate-800 text-white px-4 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
                        >
                            Bloquear Data
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {(!formData.blockedDates || formData.blockedDates.length === 0) && (
                            <span className="text-xs text-slate-300 italic">Nenhuma data bloqueada.</span>
                        )}
                        {formData.blockedDates?.map((date) => (
                            <div key={date} className="bg-red-50 border border-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 animate-fade-in">
                                 {date.split('-').reverse().join('/')}
                                 <button 
                                    onClick={() => {
                                        const newList = formData.blockedDates.filter(d => d !== date);
                                        setFormData({...formData, blockedDates: newList});
                                    }}
                                    className="hover:text-red-800 transition-colors"
                                 >
                                    <X size={14}/>
                                 </button>
                            </div>
                        ))}
                    </div>
                </div>

             </div>
             <Button onClick={() => setEditModal(null)} className="w-full py-4 text-lg mt-8">Confirmar</Button>
          </div>
        </ModalOverlay>, document.body
      )}

      {editModal === 'capacity' && createPortal(
        <ModalOverlay onClose={() => setEditModal(null)}>
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-3xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Users size={20}/></div>
                <h3 className="font-bold text-2xl text-slate-900">Capacidade & Estacionamento</h3>
              </div>
              <button onClick={()=>setEditModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="space-y-8">
              <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Limite de Pessoas (Estoque Diário)</p>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Max Adultos</label>
                        <input type="number" className="w-full border p-4 text-lg rounded-xl text-center font-bold outline-none focus:border-[#0097A8]" value={formData.capacityAdults} onChange={e=>setFormData({...formData, capacityAdults: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Max Crianças</label>
                        <input type="number" className="w-full border p-4 text-lg rounded-xl text-center font-bold outline-none focus:border-[#0097A8]" value={formData.capacityChildren} onChange={e=>setFormData({...formData, capacityChildren: e.target.value})} />
                    </div>
                  </div>
              </div>

              <hr className="border-slate-100" />

              <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">O espaço aceita pet?</label>
                  <select 
                      className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8] mb-4"
                      value={formData.acceptsPets ? 'true' : 'false'}
                      onChange={(e) => {
                          const isAccepting = e.target.value === 'true';
                          setFormData({
                              ...formData, 
                              acceptsPets: isAccepting,
                              capacityPets: isAccepting ? formData.capacityPets : '0'
                          });
                      }}
                  >
                      <option value="false">Não</option>
                      <option value="true">Sim</option>
                  </select>

                  {formData.acceptsPets && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in">
                          <label className="text-xs font-bold text-slate-500 block mb-2">Quantidade Máxima de Pets</label>
                          <input type="number" className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" placeholder="Ex: 5" value={formData.capacityPets} onChange={e=>setFormData({...formData, capacityPets: e.target.value})} />
                      </div>
                  )}
              </div>
              
              <hr className="border-slate-100" />

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Você disponibiliza estacionamento pago?</label>
                <select 
                      className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8] mb-4"
                      value={formData.hasPaidParking ? 'true' : 'false'}
                      onChange={(e) => {
                          const hasParking = e.target.value === 'true';
                          setFormData({
                              ...formData, 
                              hasPaidParking: hasParking,
                              parkingCars: hasParking ? formData.parkingCars : '0',
                              parkingMoto: hasParking ? formData.parkingMoto : '0'
                          });
                      }}
                  >
                      <option value="false">Não</option>
                      <option value="true">Sim</option>
                  </select>

                {formData.hasPaidParking && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Vagas Carros</label>
                            <input type="number" className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" placeholder="0" value={formData.parkingCars} onChange={e=>setFormData({...formData, parkingCars: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Vagas Motos</label>
                            <input type="number" className="w-full border p-3 rounded-xl bg-white outline-none focus:border-[#0097A8]" placeholder="0" value={formData.parkingMoto} onChange={e=>setFormData({...formData, parkingMoto: e.target.value})} />
                        </div>
                    </div>
                )}
              </div>
              <Button onClick={() => setEditModal(null)} className="w-full py-4 text-lg">Confirmar</Button>
            </div>
          </div>
        </ModalOverlay>, document.body
      )}

      {editModal === 'rules' && createPortal(
        <ModalOverlay onClose={() => setEditModal(null)}>
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-4xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><ShieldCheck size={20}/></div>
                <h3 className="font-bold text-2xl text-slate-900">Regras e Políticas</h3>
              </div>
              <button onClick={()=>setEditModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <label className="flex items-center justify-between cursor-pointer mb-4">
                            <span className="font-bold text-slate-700">Permite alimentos e bebidas?</span>
                            <input type="checkbox" className="accent-[#0097A8] w-6 h-6" checked={formData.allowFood} onChange={e=>setFormData({...formData, allowFood: e.target.checked})} />
                        </label>
                        <hr className="border-slate-200 my-4"/>
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="font-bold text-slate-700">Realiza revista na entrada?</span>
                            <input type="checkbox" className="accent-[#0097A8] w-6 h-6" checked={formData.hasSearch} onChange={e=>setFormData({...formData, hasSearch: e.target.checked})} />
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Outras Observações</label>
                        <textarea className="w-full border p-3 rounded-xl h-32" placeholder="..." value={formData.observations} onChange={e=>setFormData({...formData, observations: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Regras de Utilização</label>
                        <textarea className="w-full border p-3 rounded-xl h-32" placeholder="Ex: Proibido som automotivo..." value={formData.usageRules} onChange={e=>setFormData({...formData, usageRules: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Política de Cancelamento</label>
                        <textarea className="w-full border p-3 rounded-xl h-32" placeholder="Ex: Até 24h antes..." value={formData.cancellationPolicy} onChange={e=>setFormData({...formData, cancellationPolicy: e.target.value})} />
                    </div>
                </div>
            </div>
            <Button onClick={() => setEditModal(null)} className="w-full py-4 text-lg mt-8">Confirmar</Button>
          </div>
        </ModalOverlay>, document.body
      )}

      {editModal === 'amenities' && createPortal(
        <ModalOverlay onClose={() => setEditModal(null)}>
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-5xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Coffee size={20}/></div>
                <h3 className="font-bold text-2xl text-slate-900">Comodidades e Lazer</h3>
              </div>
              <button onClick={()=>setEditModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">O que o local oferece?</h4>
                        <div className="relative mb-4">
                            <Search size={18} className="absolute left-3 top-3.5 text-slate-400"/>
                            <input 
                                className="w-full border p-3 pl-10 rounded-xl bg-slate-50 focus:bg-white outline-none focus:border-[#0097A8] transition-colors text-sm"
                                placeholder="Buscar comodidade (ex: Piscina)..."
                                value={amenitySearch}
                                onChange={(e) => setAmenitySearch(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 h-80 overflow-y-auto custom-scrollbar">
                        {AMENITIES_LIST.filter(item => item.toLowerCase().includes(amenitySearch.toLowerCase())).map(item => (
                            <label key={item} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-[#0097A8] transition-colors">
                            <input 
                                type="checkbox" 
                                checked={formData.amenities.includes(item)} 
                                onChange={() => {
                                const newAmenities = formData.amenities.includes(item) 
                                    ? formData.amenities.filter(i => i !== item)
                                    : [...formData.amenities, item];
                                setFormData({...formData, amenities: newAmenities});
                                }}
                                className="accent-[#0097A8] w-4 h-4 shrink-0"
                            />
                            {item}
                            </label>
                        ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-slate-800 mb-4">Alimentação</h4>
                        <div className="flex flex-wrap gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {MEALS_LIST.map(item => (
                            <label key={item} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer px-2 py-1 rounded-lg hover:bg-white hover:shadow-sm transition-all">
                            <input 
                                type="checkbox" 
                                checked={formData.meals.includes(item)} 
                                onChange={() => {
                                const newMeals = formData.meals.includes(item) 
                                    ? formData.meals.filter(i => i !== item)
                                    : [...formData.meals, item];
                                setFormData({...formData, meals: newMeals});
                                }}
                                className="accent-[#0097A8] w-4 h-4"
                            />
                            {item}
                            </label>
                        ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-red-600 mb-2">O que NÃO está incluso?</label>
                        <textarea className="w-full border p-4 rounded-xl h-32 bg-red-50/20 border-red-100 focus:border-red-300" placeholder="Ex: Bebidas alcoólicas são pagas à parte..." value={formData.notIncludedItems} onChange={e=>setFormData({...formData, notIncludedItems: e.target.value})} />
                    </div>
                </div>
            </div>
            <Button onClick={() => setEditModal(null)} className="w-full py-4 text-lg mt-8">Confirmar</Button>
          </div>
        </ModalOverlay>, document.body
      )}

      {/* MODAL DE SUCESSO DA PUBLICAÇÃO */}
      {showPublishModal && createPortal(
        <ModalOverlay onClose={() => { /* Bloqueia */ }}>
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-fade-in text-center relative overflow-hidden">
            
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-blue-500"></div>
            
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Check size={40} strokeWidth={3} />
            </div>
            
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Parabéns! 🚀</h2>
            <p className="text-slate-500 mb-8">
                Seu Day Use foi publicado com sucesso e já está disponível para vendas.
            </p>

            {/* Campo da URL CORRIGIDO (Tudo minúsculo) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Link Oficial de Vendas</label>
                <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-slate-700 truncate flex-1 bg-white p-2 rounded border border-slate-100">
                        {`${window.location.origin}/${formData.state?.toLowerCase()}/${formData.slug}`}
                    </code>
                    <button 
                        onClick={() => {
                            const url = `${window.location.origin}/${formData.state?.toLowerCase()}/${formData.slug}`;
                            navigator.clipboard.writeText(url);
                            alert("Link copiado!");
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline"
                    >
                        Copiar
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <Button 
                    onClick={() => {
                        window.open(`/${formData.state?.toLowerCase()}/${formData.slug}`, '_blank');
                    }} 
                    className="w-full py-4 text-lg flex items-center justify-center gap-2"
                >
                    <ExternalLink size={20}/> Abrir Página Publicada
                </Button>

                <Button 
                    onClick={() => {
                        setShowPublishModal(false);
                        setViewMode('list');
                        fetchDayUses();
                    }} 
                    variant="ghost" 
                    className="w-full text-slate-500 hover:text-slate-700"
                >
                    Voltar para Meus Day Uses
                </Button>
            </div>
          </div>
        </ModalOverlay>, document.body
      )}

    </div>
  );
};

export default PartnerMyDayUse;