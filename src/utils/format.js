// Formata moeda para Real (R$ 0,00)
export const formatBRL = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Gera um slug amigável para URLs a partir de um texto
 */
export const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Converte o nome completo do estado para sua sigla (slug)
 */
export const getStateSlug = (state) => {
  const map = {
    'Minas Gerais': 'mg', 'São Paulo': 'sp', 'Rio de Janeiro': 'rj',
    'Espírito Santo': 'es', 'Bahia': 'ba', 'Santa Catarina': 'sc',
    'Paraná': 'pr', 'Rio Grande do Sul': 'rs', 'Goiás': 'go',
    'Distrito Federal': 'df', 'Ceará': 'ce', 'Pernambuco': 'pe'
  };
  return map[state] || generateSlug(state);
};

/**
 * Extrai o ID de um vídeo do YouTube a partir de diversas variações de URL
 * Necessário para o iframe da DetailsPage
 */
export const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Formata data de YYYY-MM-DD para DD/MM/YYYY
export const formatDate = (dateString) => {
  if (!dateString) return '';
  // Se já vier no formato Date do JS
  if (dateString instanceof Date) {
      return new Intl.DateTimeFormat('pt-BR').format(dateString);
  }
  
  // Se vier como string YYYY-MM-DD (padrão do input type="date" e Firebase)
  if (typeof dateString === 'string' && dateString.includes('-')) {
      const parts = dateString.split('-');
      // Evita problemas de fuso horário criando a data manualmente
      if (parts.length === 3) {
          const [year, month, day] = parts;
          return `${day}/${month}/${year}`;
      }
  }
  
  return dateString; // Retorna original se não conseguir formatar
};