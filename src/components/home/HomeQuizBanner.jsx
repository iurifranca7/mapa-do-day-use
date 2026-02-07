import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomeQuizBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl relative overflow-hidden group cursor-pointer" onClick={() => navigate('/quiz')}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
        <div className="relative z-10">
            <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-4 border border-white/20 backdrop-blur-sm">Ainda na dúvida?</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Descubra seu Day Use ideal com IA ✨</h2>
            <p className="text-indigo-100 mb-8 max-w-xl mx-auto">Responda 3 perguntas rápidas e nossa inteligência encontra a experiência perfeita para o seu perfil.</p>
            <button className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg">Fazer Quiz Agora</button>
        </div>
    </div>
  );
};

export default HomeQuizBanner;