import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const admin = require('firebase-admin');

// 1. Carrega Credenciais
const serviceAccountPath = join(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Erro: service-account.json não encontrado na raiz.');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Inicializa Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const updateData = async () => {
  try {
    const dataPath = join(__dirname, '../dados_atualizacao.json');
    
    if (!fs.existsSync(dataPath)) {
        throw new Error("Arquivo 'dados_atualizacao.json' não encontrado na raiz.");
    }

    const rawData = fs.readFileSync(dataPath);
    const updates = JSON.parse(rawData);

    console.log(`🔄 Iniciando atualização de ${updates.length} itens...`);

    const batch = db.batch();
    let count = 0;
    let batchCount = 0;

    for (const item of updates) {
        // Busca o day use pelo nome exato para garantir que estamos atualizando o certo
        const snapshot = await db.collection('dayuses').where('name', '==', item.name).get();

        if (snapshot.empty) {
            console.warn(`⚠️ Não encontrado: "${item.name}" (Verifique a grafia)`);
            continue;
        }

        // Pega o documento encontrado
        const docRef = snapshot.docs[0].ref;
        const currentData = snapshot.docs[0].data();

        // Tratamento dos dados (Conversão de String para Array)
        const amenitiesArray = item.amenities 
            ? item.amenities.split(',').map(s => s.trim()).filter(s => s !== "") 
            : (currentData.amenities || []);

        const mealsArray = item.meals
            ? (Array.isArray(item.meals) ? item.meals : item.meals.split(',').map(s => s.trim()))
            : (currentData.meals || []);

        const imagesArray = Array.isArray(item.images) 
            ? item.images 
            : (item.images ? item.images.split(',').map(s => s.trim()) : (currentData.images || []));

        // Objeto de atualização
        const updatePayload = {
            description: item.description || currentData.description,
            priceAdult: item.priceAdult ? Number(item.priceAdult) : currentData.priceAdult,
            city: item.city || currentData.city,
            state: item.state || currentData.state,
            localWhatsapp: item.whats || currentData.localWhatsapp,
            notIncludedItems: item.notIncludedItems || currentData.notIncludedItems,
            
            // Campos tratados
            image: item.image || currentData.image, // Capa
            images: imagesArray,
            amenities: amenitiesArray,
            meals: mealsArray,
            
            updatedAt: new Date()
        };

        batch.update(docRef, updatePayload);
        count++;
        batchCount++;

        // Commit em lotes de 400 para não estourar limite do Firestore
        if (batchCount >= 400) {
            await batch.commit();
            console.log(`📦 Lote salvo: ${count} itens atualizados...`);
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log(`✅ Sucesso! ${count} Day Uses foram atualizados.`);
    process.exit(0);

  } catch (error) {
    console.error("❌ Erro na atualização:", error);
    process.exit(1);
  }
};

updateData();