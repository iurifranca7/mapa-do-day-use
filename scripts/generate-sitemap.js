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
const BASE_URL = 'https://mapadodayuse.com';

// Função auxiliar para formatar slug de cidade (mesma lógica do App.jsx)
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
        console.log("🔍 Iniciando mapeamento de URLs...");
        
        // Busca TODOS os anúncios (para indexar até os pausados/seeding)
        const snapshot = await db.collection('dayuses').get();

        console.log(`✅ Encontrados ${snapshot.size} locais no banco de dados.`);

        const lastMod = new Date().toISOString().split('T')[0];
        
        // 1. URLs Estáticas (Institucionais, Blog, etc.)
        const staticPages = [
            { url: '/', priority: '1.0', freq: 'daily' },
            { url: '/sobre-nos', priority: '0.8', freq: 'monthly' },
            { url: '/contato', priority: '0.8', freq: 'monthly' },
            { url: '/day-use', priority: '0.9', freq: 'weekly' }, // Hub do Blog
            { url: '/day-use/o-que-e-day-use', priority: '0.8', freq: 'monthly' }, // Artigo
            { url: '/mapa-do-site', priority: '0.5', freq: 'weekly' },
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

        // 2. URLs Dinâmicas (Locais, Cidades, Estados)
        const states = new Set();
        const cities = new Set();
        let countLocais = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.slug && data.state) {
                const stateLower = data.state.toLowerCase();
                const itemMod = data.updatedAt ? new Date(data.updatedAt.toDate()).toISOString().split('T')[0] : lastMod;

                // A. URL do Local (Day Use)
                xml += `
  <url>
    <loc>${BASE_URL}/${stateLower}/${data.slug}</loc>
    <lastmod>${itemMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
                countLocais++;

                // B. Coleta Estado
                states.add(stateLower);

                // C. Coleta Cidade
                if (data.city) {
                    const citySlug = generateSlug(data.city);
                    cities.add(`${stateLower}/${citySlug}`);
                }
            }
        });

        // Adiciona URLs de Estados
        states.forEach(s => {
            xml += `
  <url>
    <loc>${BASE_URL}/${s}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
        });

        // Adiciona URLs de Cidades
        cities.forEach(c => {
            xml += `
  <url>
    <loc>${BASE_URL}/${c}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
        });

        xml += `
</urlset>`;

        // Salva o arquivo
        const publicPath = join(__dirname, '../public/sitemap.xml');
        fs.writeFileSync(publicPath, xml);

        console.log(`\n🎉 Sitemap gerado com sucesso!`);
        console.log(`   - Páginas Estáticas: ${staticPages.length}`);
        console.log(`   - Day Uses: ${countLocais}`);
        console.log(`   - Estados: ${states.size}`);
        console.log(`   - Cidades: ${cities.size}`);
        console.log(`\n📂 Arquivo salvo em: ${publicPath}`);
        console.log("👉 Execute: git add public/sitemap.xml && git commit -m 'Update sitemap' && git push");

    } catch (error) {
        console.error("❌ Erro ao gerar sitemap:", error);
    }
};

generateSitemap();