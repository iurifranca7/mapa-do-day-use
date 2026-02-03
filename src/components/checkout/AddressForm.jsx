import React from 'react';

const AddressForm = ({
  cep, setCep, handleCepBlur, loadingCep,
  showManualAddress, setShowManualAddress,
  addressStreet, setAddressStreet,
  addressNumber, setAddressNumber,
  addressNeighborhood, setAddressNeighborhood,
  addressState, setAddressState,
  addressCity, setAddressCity,
  ufList, cityList, loadingCities
}) => {
  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
        {/* Título */}
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                📍 Endereço da Fatura
            </h4>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap">
                Exigido pelo banco
            </span>
        </div>

        {/* CEP e Número */}
        <div className="grid grid-cols-10 gap-3 mb-3">
            <div className="col-span-6 relative">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">CEP</label>
                <input 
                    className={`w-full border p-3 rounded-lg mt-1 outline-none transition-all ${showManualAddress ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-[#0097A8]'}`}
                    placeholder="00000-000"
                    value={cep}
                    onChange={e => {
                        const val = e.target.value;
                        setCep(val);
                        if(val === '') setShowManualAddress(false);
                    }}
                    onBlur={handleCepBlur}
                    maxLength={9}
                />
                {loadingCep && <div className="absolute right-3 top-9 animate-spin h-4 w-4 border-2 border-[#0097A8] border-t-transparent rounded-full"/>}
            </div>
            
            <div className="col-span-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Número</label>
                <input 
                    id="address-number"
                    className="w-full border border-slate-300 p-3 rounded-lg mt-1 outline-none focus:border-[#0097A8]" 
                    placeholder="123"
                    value={addressNumber}
                    onChange={e => setAddressNumber(e.target.value)}
                />
            </div>
        </div>

        {/* CENÁRIO 1: CEP Encontrado */}
        {!showManualAddress && addressStreet && (
            <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 border border-slate-200 animate-fade-in flex justify-between items-center group">
                <div>
                    <p className="font-bold text-slate-800">{addressStreet}, {addressNumber || '...'}</p>
                    <p>{addressNeighborhood} - {addressCity}/{addressState}</p>
                </div>
                <button 
                    onClick={() => setShowManualAddress(true)} 
                    className="text-[10px] text-[#0097A8] font-bold underline opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    Editar
                </button>
            </div>
        )}

        {/* CENÁRIO 2: Fallback Manual */}
        {showManualAddress && (
            <div className="animate-fade-in space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                <p className="text-xs text-orange-600 font-bold mb-2 flex items-center gap-1">
                    ⚠️ Não achamos pelo CEP. Por favor, complete:
                </p>
                
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Rua / Logradouro</label>
                    <input 
                        className="w-full border border-slate-300 p-2 rounded bg-white outline-none focus:border-[#0097A8]" 
                        value={addressStreet} 
                        onChange={e=>setAddressStreet(e.target.value)} 
                        placeholder="Ex: Avenida Paulista"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Bairro</label>
                        <input className="w-full border border-slate-300 p-2 rounded bg-white outline-none focus:border-[#0097A8]" value={addressNeighborhood} onChange={e=>setAddressNeighborhood(e.target.value)} />
                    </div>
                    
                    {/* SELECT DE ESTADO */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Estado</label>
                        <div className="relative">
                            <select 
                                className="w-full border border-slate-300 p-2 rounded bg-white outline-none focus:border-[#0097A8] appearance-none" 
                                value={addressState} 
                                onChange={e=> {
                                    setAddressState(e.target.value);
                                    setAddressCity(''); 
                                }}
                            >
                                <option value="">Selecione...</option>
                                {ufList.map(uf => (
                                    <option key={uf.id} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
                        </div>
                    </div>
                </div>
                
                {/* SELECT DE CIDADE */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between">
                        Cidade
                        {loadingCities && <span className="text-[#0097A8]">Carregando...</span>}
                    </label>
                    <div className="relative">
                        <select 
                            className="w-full border border-slate-300 p-2 rounded bg-white outline-none focus:border-[#0097A8] appearance-none disabled:bg-slate-100 disabled:text-slate-400" 
                            value={addressCity} 
                            onChange={e=>setAddressCity(e.target.value)}
                            disabled={!addressState || loadingCities}
                        >
                            <option value="">{addressState ? 'Selecione a cidade...' : 'Selecione o estado primeiro'}</option>
                            {cityList.map(city => (
                                <option key={city.id} value={city.nome}>{city.nome}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AddressForm;