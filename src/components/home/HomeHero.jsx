import React from 'react';

const HomeHero = () => {
  return (
    <div className="relative bg-[#0097A8] text-white pt-24 pb-20 px-4 rounded-b-[3rem] shadow-xl">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                Mapa do Day Use
            </h1>
            <p className="text-lg md:text-2xl text-cyan-50 font-light max-w-2xl mx-auto">
                Sua mini-férias começa agora. Hotéis e resorts incríveis para curtir o dia, perto de você.
            </p>
        </div>
    </div>
  );
};

export default HomeHero;