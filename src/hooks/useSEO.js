import { useEffect } from 'react';

// Define a URL base dinamicamente (funciona em localhost e produção)
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

/**
 * Hook para gerenciar Meta Tags, Título, Open Graph e Canonical URL
 * @param {string} title - Título da página
 * @param {string} description - Descrição para SEO e Social
 * @param {string|null} image - URL da imagem de capa (opcional)
 * @param {boolean} noIndex - Se true, bloqueia indexação (opcional, default false)
 * @param {string|null} canonical - URL canônica forçada (opcional)
 */
export const useSEO = (title, description, image = null, noIndex = false, canonical = null) => {
  
  // Ajuste de compatibilidade para chamadas antigas onde o 3º argumento era 'noIndex'
  if (typeof image === 'boolean') {
      noIndex = image;
      image = null;
  }

  // Imagem padrão caso nenhuma seja fornecida
  const defaultImage = `${BASE_URL}/logo.png`; 
  const finalImage = image || defaultImage;
  
  // Constrói a URL canônica
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const finalCanonical = canonical || `${BASE_URL}${currentPath === '/' ? '' : currentPath}`;

  // Título padrão
  const siteTitle = (title === "Home" || !title) ? "Mapa do Day Use" : title;

  useEffect(() => {
    // 1. Define o Título da Aba
    document.title = siteTitle;
    
    // Função auxiliar para criar ou atualizar meta tags
    const setMeta = (attrName, attrValue, content) => {
        let element = document.querySelector(`meta[${attrName}='${attrValue}']`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attrName, attrValue);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content || "");
    };

    // 2. Meta Tags Básicas
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? "noindex, nofollow" : "index, follow");

    // 3. Open Graph (Facebook, WhatsApp, LinkedIn)
    setMeta('property', 'og:title', siteTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', finalImage);
    setMeta('property', 'og:url', finalCanonical);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'Mapa do Day Use');
    setMeta('property', 'og:locale', 'pt_BR');

    // 4. Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', siteTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', finalImage);

    // 5. Tag Canônica (Evita conteúdo duplicado no Google)
    let linkCanonical = document.querySelector("link[rel='canonical']");
    if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", finalCanonical);

  }, [title, description, finalImage, noIndex, siteTitle, finalCanonical]);
};

/**
 * Hook para injetar JSON-LD (Dados Estruturados do Google)
 * @param {object} schemaData - Objeto JSON com os dados estruturados
 */
export const useSchema = (schemaData) => {
  useEffect(() => {
    if (!schemaData) return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    // Limpa o script ao sair da página para não duplicar
    return () => {
      document.head.removeChild(script);
    };
  }, [schemaData]);
};