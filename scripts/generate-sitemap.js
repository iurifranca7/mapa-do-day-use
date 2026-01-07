import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// --- CONFIGURAÇÃO DE AMBIENTE (Node.js) ---
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const admin = require('firebase-admin');

// 1. Carrega Credenciais
const serviceAccountPath = join(__dirname, '../service-account.json');
let serviceAccount;

if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
} else {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (e) { console.error("Erro ao ler env"); }
    }
}

if (!serviceAccount) {
    console.error('❌ Erro: service-account.json não encontrado.');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const BASE_URL = 'https://mapadodayuse.com';

const generateSlug = (text) => {
    return text.toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
};

const generateSitemap = async () => {
    try {
        console.log("🔍 Iniciando mapeamento...");
        
        const snapshot = await db.collection('dayuses').get();
        console.log(`✅ Encontrados ${snapshot.size} locais.`);

        const lastMod = new Date().toISOString().split('T')[0];
        
        // 1. URLs Estáticas (Agora são 12)
        const staticPages = [
            { url: '/', priority: '1.0', freq: 'daily' },
            { url: '/sobre-nos', priority: '0.8', freq: 'monthly' },
            { url: '/contato', priority: '0.8', freq: 'monthly' },
            { url: '/day-use', priority: '0.9', freq: 'weekly' },
            { url: '/day-use/o-que-e-day-use', priority: '0.8', freq: 'monthly' },
            { url: '/mapa-do-site', priority: '0.6', freq: 'weekly' },
            { url: '/comparativo', priority: '0.9', freq: 'weekly' }, // Home do Comparador
            { url: '/quiz', priority: '0.9', freq: 'monthly' },       // Home do Quiz
            { url: '/seja-parceiro', priority: '0.9', freq: 'monthly' },
            { url: '/politica-de-privacidade', priority: '0.5', freq: 'yearly' },
            { url: '/termos-de-uso', priority: '0.5', freq: 'yearly' },
            { url: '/partner-register', priority: '0.7', freq: 'monthly' },
        ];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        // Adiciona Páginas Estáticas
        staticPages.forEach(page => {
            xml += `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
        });

        // Variáveis de controle
        const states = new Set();
        const cities = new Set();
        const itemsByCity = {}; // Agrupamento para comparações
        let countLocais = 0;
        let countComparacoes = 0;

        // 2. Processa Day Uses
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.slug && data.state) {
                const stateLower = data.state.toLowerCase();
                const itemMod = data.updatedAt ? new Date(data.updatedAt.toDate()).toISOString().split('T')[0] : lastMod;

                // A. URL do Local
                xml += `
  <url>
    <loc>${BASE_URL}/${stateLower}/${data.slug}</loc>
    <lastmod>${itemMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
                countLocais++;
                states.add(stateLower);

                if (data.city) {
                    const citySlug = generateSlug(data.city);
                    cities.add(`${stateLower}/${citySlug}`);
                    
                    // Agrupa para gerar comparações
                    if (!itemsByCity[data.city]) itemsByCity[data.city] = [];
                    itemsByCity[data.city].push(data);
                }
            }
        });

        // 3. Gera URLs de Estados
        states.forEach(s => {
            xml += `
  <url>
    <loc>${BASE_URL}/${s}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
        });

        // 4. Gera URLs de Cidades
        cities.forEach(c => {
            xml += `
  <url>
    <loc>${BASE_URL}/${c}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
        });

        // 5. NOVA SEÇÃO: URLs de Comparativos (SEO Cross-Linking)
        // Gera pares de day uses na mesma cidade (ex: hotel-a-vs-hotel-b)
        Object.keys(itemsByCity).forEach(city => {
            const items = itemsByCity[city];
            if (items.length > 1) {
                // Gera combinações (A vs B)
                for (let i = 0; i < items.length; i++) {
                    for (let j = i + 1; j < items.length; j++) {
                        const slugA = items[i].slug;
                        const slugB = items[j].slug;
                        
                        // Evita duplicatas inversas ordenando alfabeticamente ou apenas pelo loop
                        xml += `
  <url>
    <loc>${BASE_URL}/comparativo/${slugA}-vs-${slugB}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
                        countComparacoes++;
                    }
                }
            }
        });

        xml += `
</urlset>`;

        const publicPath = join(__dirname, '../public/sitemap.xml');
        fs.writeFileSync(publicPath, xml);

        console.log(`\n🎉 Sitemap gerado com sucesso!`);
        console.log(`   - Estáticas: ${staticPages.length}`);
        console.log(`   - Day Uses: ${countLocais}`);
        console.log(`   - Estados/Cidades: ${states.size + cities.size}`);
        console.log(`   - Comparativos (Novo): ${countComparacoes}`);
        console.log(`\n📂 Arquivo salvo em: ${publicPath}`);

    } catch (error) {
        console.error("❌ Erro ao gerar sitemap:", error);
    }
};

generateSitemap();