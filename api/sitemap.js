import * as admin from 'firebase-admin';

// --- INICIALIZAÇÃO BLINDADA (Igual ao process-payment.js) ---
if (!admin.apps.length) {
  try {
    // Tenta usar a variável JSON única (Recomendado)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        // Fallback para variáveis individuais
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
            // Limpeza da chave privada
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.slice(1, -1);
            }
            privateKey = privateKey.replace(/\\n/g, '\n');

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
        }
    }
  } catch (e) {
    console.error("Erro Firebase Admin Sitemap:", e);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

export default async function handler(req, res) {
  if (!db) {
      return res.status(500).send("Erro de configuração do banco de dados.");
  }

  try {
    const baseUrl = 'https://mapadodayuse.com';
    const lastMod = new Date().toISOString().split('T')[0]; // Data YYYY-MM-DD

    // 1. Busca todos os Day Uses ativos (paused != true)
    // Usamos get() para ler todos de uma vez
    const snapshot = await db.collection('dayuses')
        .where('paused', '!=', true) 
        .get();

    // 2. Início do XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Páginas Estáticas -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/politica-de-privacidade</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/termos-de-uso</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/partner-register</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>0.8</priority>
  </url>`;

    // 3. Páginas Dinâmicas (Day Uses, Estados e Cidades)
    const states = new Set();
    const cities = new Set();

    snapshot.forEach(doc => {
        const data = doc.data();
        
        // Validação para evitar URLs quebradas
        if (data.slug && data.state) {
            const stateLower = data.state.toLowerCase();
            
            // URL do Day Use Específico
            // Se tiver data de atualização (updatedAt), usa ela, senão usa hoje
            const itemMod = data.updatedAt ? new Date(data.updatedAt.toDate()).toISOString().split('T')[0] : lastMod;

            xml += `
  <url>
    <loc>${baseUrl}/${stateLower}/${data.slug}</loc>
    <lastmod>${itemMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
            
            // Coleta Estado para adicionar página de lista
            states.add(stateLower);
            
            // Coleta Cidade para adicionar página de lista
            if (data.city) {
                const citySlug = data.city.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
                    .replace(/\s+/g, '-') // Espaço vira hífen
                    .replace(/[^\w\-]+/g, ''); // Remove especiais
                cities.add(`${stateLower}/${citySlug}`);
            }
        }
    });

    // Adiciona URLs de Estados (ex: /mg)
    states.forEach(s => {
        xml += `
  <url>
    <loc>${baseUrl}/${s}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    // Adiciona URLs de Cidades (ex: /mg/belo-horizonte)
    cities.forEach(c => {
        xml += `
  <url>
    <loc>${baseUrl}/${c}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    // 4. Retorna XML com header correto e Cache
    res.setHeader('Content-Type', 'text/xml');
    // Cache de 1 hora na CDN (s-maxage) e revalidação em background
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); 
    res.status(200).send(xml);

  } catch (e) {
    console.error("Erro ao gerar sitemap:", e);
    res.status(500).send("Erro interno ao gerar sitemap");
  }
}