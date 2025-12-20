import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Importa nossa conexão com o Google
import { collection, getDocs, addDoc } from 'firebase/firestore'; // Importa funções do banco
import { 
  MapPin, Calendar, Search, User, CheckCircle, 
  X, Coffee, Wifi, Car, Utensils, PlusCircle
} from 'lucide-react';

// --- COMPONENTES VISUAIS ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled, type='button' }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
    outline: "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ children }) => (
  <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium border border-emerald-100">
    {children}
  </span>
);

// --- TELAS ---

const HomePage = ({ items, onSelect, loading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-fade-in pb-10">
      {/* Hero */}
      <div className="bg-emerald-900 text-white py-12 px-4 rounded-3xl mb-8 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Onde você vai relaxar hoje?</h1>
          <p className="text-emerald-100 mb-6">Os melhores Day Uses de BH e região em um só lugar.</p>
          <div className="bg-white p-2 rounded-full shadow-lg flex max-w-md mx-auto">
            <input 
              className="flex-1 px-4 text-gray-700 outline-none rounded-l-full"
              placeholder="Buscar local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700">
              <Search size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">Em alta na região</h2>
      
      {loading ? (
        <div className="text-center py-20 text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          Carregando ofertas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-2">Nenhum local encontrado.</p>
          <p className="text-sm text-gray-400">Seja o primeiro parceiro a cadastrar!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(item => (
            <div key={item.id} onClick={() => onSelect(item)} className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer overflow-hidden border border-gray-100 transition-all">
              <div className="h-48 overflow-hidden relative">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold shadow-sm">⭐ 5.0</span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-3"><MapPin size={14}/> {item.location}</p>
                <div className="flex justify-between items-center border-t pt-3">
                  <div>
                    <p className="text-xs text-gray-400">A partir de</p>
                    <p className="text-emerald-600 font-bold text-lg">R$ {item.price}</p>
                  </div>
                  <Button className="text-sm px-3 py-1">Ver</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DetailsPage = ({ item, onBack, onBook }) => {
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(1);
  const total = item.price * guests;
  const signal = total * 0.20;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <button onClick={onBack} className="mb-4 text-gray-500 hover:text-emerald-600 flex items-center gap-1">← Voltar</button>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <img src={item.image} className="w-full h-72 object-cover rounded-2xl shadow-sm" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-gray-500 flex items-center gap-1"><MapPin size={16}/> {item.location}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
             {/* Verifica se amenities existe antes de mapear */}
            {item.amenities && item.amenities.map(a => <Badge key={a}>{a}</Badge>)}
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <h3 className="font-bold mb-2">Sobre</h3>
            <p className="text-gray-600">{item.description}</p>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 sticky top-4">
            <h3 className="font-bold text-xl mb-4">Reservar</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Data</label>
                <input type="date" className="w-full border rounded-lg p-2" onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Pessoas: {guests}</label>
                <input type="range" min="1" max="10" value={guests} onChange={e => setGuests(parseInt(e.target.value))} className="w-full accent-emerald-600" />
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-500"><span>Total</span><span>R$ {total}</span></div>
                <div className="flex justify-between text-emerald-700 font-bold text-lg"><span>Sinal (20%)</span><span>R$ {signal.toFixed(2)}</span></div>
                <p className="text-xs text-gray-400 text-center">Pague R$ {signal.toFixed(2)} agora e o resto no local.</p>
              </div>
              <Button className="w-full" disabled={!date} onClick={() => onBook({ item, date, guests, signal, total })}>
                Pagar Sinal
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PartnerPage = ({ onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', price: '', location: '', description: '', image: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Chama a função que salva no Google
    await onSave({
      ...formData,
      price: Number(formData.price),
      amenities: ["Wi-Fi", "Estacionamento"], // Padrão por enquanto
      createdAt: new Date()
    });
    setLoading(false);
    alert("Day Use cadastrado com sucesso!");
    setFormData({ name: '', price: '', location: '', description: '', image: '' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-indigo-900 text-white p-8 rounded-2xl mb-8">
        <h1 className="text-2xl font-bold mb-2">Área do Parceiro</h1>
        <p className="text-indigo-200">Cadastre seu Day Use no banco de dados.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Local</label>
          <input required className="w-full border rounded-lg p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Pousada do Sol" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
            <input required type="number" className="w-full border rounded-lg p-2" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input required className="w-full border rounded-lg p-2" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ex: Betim, MG" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL da Foto</label>
          <input required className="w-full border rounded-lg p-2" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea required className="w-full border rounded-lg p-2 h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descreva as atrações..." />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : "Cadastrar Day Use"}
        </Button>
      </form>
    </div>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  const [view, setView] = useState("home");
  const [selectedItem, setSelectedItem] = useState(null);
  
  // ESTADO DO BANCO DE DADOS
  const [dayUses, setDayUses] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. CARREGAR DADOS DO GOOGLE AO INICIAR
  useEffect(() => {
    async function loadData() {
      try {
        const querySnapshot = await getDocs(collection(db, "dayuses"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setDayUses(list);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []); // O array vazio [] garante que só roda uma vez

  // 2. FUNÇÃO PARA SALVAR NO GOOGLE
  const handleSaveItem = async (newItem) => {
    try {
      const docRef = await addDoc(collection(db, "dayuses"), newItem);
      // Atualiza a lista na tela sem precisar recarregar
      setDayUses([{ id: docRef.id, ...newItem }, ...dayUses]);
    } catch (e) {
      console.error("Erro ao salvar: ", e);
      alert("Erro ao salvar no banco de dados.");
    }
  };

  const handleSelect = (item) => {
    setSelectedItem(item);
    setView("details");
    window.scrollTo(0,0);
  };

  const handleBook = (data) => {
    if(confirm(`Você será redirecionado para o Mercado Pago para pagar R$ ${data.signal.toFixed(2)}.\n\nDeseja continuar?`)) {
      alert("✅ Reserva confirmada! (Simulação)");
      setView("home");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-emerald-800 cursor-pointer" onClick={() => setView("home")}>
            <MapPin className="text-emerald-600" /> Mapa do Day Use
          </div>
          <div className="flex gap-4 items-center">
             <button onClick={() => setView("partner")} className="text-sm font-medium text-gray-600 hover:text-indigo-600 flex items-center gap-1">
               <PlusCircle size={16}/> Sou Parceiro
             </button>
             <div className="bg-emerald-100 p-2 rounded-full text-emerald-700"><User size={20}/></div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {view === "home" && <HomePage items={dayUses} onSelect={handleSelect} loading={loading} />}
        {view === "details" && <DetailsPage item={selectedItem} onBack={() => setView("home")} onBook={handleBook} />}
        {view === "partner" && <PartnerPage onSave={handleSaveItem} />}
      </main>
    </div>
  );
}