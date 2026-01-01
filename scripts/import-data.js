import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// --- COMPATIBILIDADE ESM (Cria require e __dirname manualmente) ---
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ------------------------------------------------------------------

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. CONFIGURAÇÃO (Use o arquivo JSON de credenciais que você já baixou do Firebase)
// Se não tiver o arquivo service-account.json na raiz, baixe novamente no Console do Firebase > Configurações > Contas de Serviço
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. FUNÇÕES AUXILIARES
const generateSlug = (text) => {
    return text.toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
};

// 3. FUNÇÃO DE IMPORTAÇÃO
const importData = async () => {
  try {
    const dataPath = path.join(__dirname, '../dados_dayuse.json');
    const rawData = fs.readFileSync(dataPath);
    const dayuses = JSON.parse(rawData);

    console.log(`🚀 Iniciando importação de ${dayuses.length} locais...`);

    const batch = db.batch();
    let count = 0;

    for (const item of dayuses) {
        const ref = db.collection('dayuses').doc(); // Gera ID automático
        
        // Trata os dados para o formato do banco
        const docData = {
            name: item.name,
            slug: generateSlug(item.name),
            city: item.city,
            state: item.state.toUpperCase(), // Garante MG, SP...
            description: item.description,
            
            // Imagens
            image: item.image, // Capa
            images: item.images || [], // Galeria
            image2: item.images?.[0] || "",
            image3: item.images?.[1] || "",

            // Preços e Regras
            priceAdult: Number(item.priceAdult),
            priceChild: Number(item.priceAdult) * 0.5, // Estimativa: metade do preço
            petFee: 0,
            
            // Filtros
            amenities: item.amenities ? item.amenities.split(',').map(s => s.trim()) : [],
            meals: ["Almoço"], // Padrão, ajuste se tiver na planilha
            petAllowed: true, // Padrão
            petSize: "Todos os portes",
            
            // Contato
            localWhatsapp: item.whatsapp,
            
            // Configurações do Sistema
            ownerId: "ADMIN_IMPORT", // Marcador para saber que foi importado
            paused: true, // Começa pausado para revisão (segurança)
            createdAt: new Date(),
            updatedAt: new Date()
        };

        batch.set(ref, docData);
        count++;

        // O Firestore aceita batches de até 500. Se passar, commita e abre outro.
        if (count % 400 === 0) {
            await batch.commit();
            console.log(`📦 Salvos ${count} itens...`);
        }
    }

    await batch.commit();
    console.log(`✅ Sucesso! ${count} Day Uses importados.`);

  } catch (error) {
    console.error("Erro na importação:", error);
  }
};

importData();