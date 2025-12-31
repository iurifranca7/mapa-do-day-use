import * as admin from 'firebase-admin';

// Inicialização segura do Firebase (Reutilizando a lógica do pagamento)
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    } else if (process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    }
  } catch (e) { console.error("Erro Firebase Sitemap:", e); }
}

const db = admin.apps.length ? admin.firestore() : null;

export default async function handler(req, res) {
  if (!db) return res.status(500).end();

  try {
    // 1. Busca todos os Day Uses ativos (não pausados)
    const snapshot = await db.collection('dayuses').where('paused', '!=', true).get();
    
    const baseUrl = 'https://mapadodayuse.com';
    const lastMod = new Date().toISOString();

    // 2. Cabeçalho do XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>${baseUrl}/</loc><lastmod>${lastMod}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
      <url><loc>${baseUrl}/politica-de-privacidade</loc><lastmod>${lastMod}</lastmod><priority>0.5</priority></url>
      <url><loc>${baseUrl}/termos-de-uso</loc><lastmod>${lastMod}</lastmod><priority>0.5</priority></url>
    `;

    // 3. Gera URLs dinâmicas
    const states = new Set();
    const cities = new Set();

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.slug && data.state) {
            // URL do Day Use
            xml += `<url><loc>${baseUrl}/${data.state.toLowerCase()}/${data.slug}</loc><lastmod>${lastMod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
            
            // Coleta Estado
            states.add(data.state.toLowerCase());
            
            // Coleta Cidade (Gera slug da cidade)
            if (data.city) {
                const citySlug = data.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                cities.add(`${data.state.toLowerCase()}/${citySlug}`);
            }
        }
    });

    // Adiciona URLs de Estados
    states.forEach(s => {
        xml += `<url><loc>${baseUrl}/${s}</loc><lastmod>${lastMod}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`;
    });

    // Adiciona URLs de Cidades
    cities.forEach(c => {
        xml += `<url><loc>${baseUrl}/${c}</loc><lastmod>${lastMod}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`;
    });

    xml += `</urlset>`;

    // 4. Retorna como XML
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(xml);

  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}