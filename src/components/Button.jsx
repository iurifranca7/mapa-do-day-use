import React from 'react';

const Button = ({ children, onClick, className = '', variant = 'primary', disabled = false, type = 'button' }) => {
  const baseStyle = "py-3 px-6 font-bold rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#0097A8] hover:bg-[#007F8D] text-white shadow-lg shadow-teal-100",
    outline: "border-2 border-slate-200 text-slate-600 hover:border-[#0097A8] hover:text-[#0097A8] bg-white",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-red-100",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600"
  };

  return (
    <button 
      type={type}
      className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;