/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#E0F7FA',  // Fundo bem clarinho
          100: '#B2EBF2', // Detalhes sutis
          500: '#0097A8', // COR PRINCIPAL (Sua cor)
          600: '#008391', // Cor do botão ao passar o mouse (Hover)
          900: '#006064', // Texto escuro / Rodapé
        }
      }
    },
  },
  plugins: [],
}