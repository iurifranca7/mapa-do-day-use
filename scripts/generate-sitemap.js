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

const generateSitemap = async () => {
    try {
        console.log("🔍 Lendo Day Uses do banco de dados...");
        
        // CORREÇÃO: Removido o filtro .where('paused', '!=', true)
        // Agora buscamos TODOS os anúncios para garantir a indexação SEO de locais pausados (estratégia de seeding)
        const snapshot = await db.collection('dayuses').get();

        if (snapshot.empty) {
            console.log("⚠️ Nenhum day use encontrado.");
            return;
        }

        console.log(`✅ Encontrados ${snapshot.size} locais (ativos e pausados).`);

        const lastMod = new Date().toISOString().split('T')[0];
        
        // Cabeçalho e Páginas Estáticas
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Páginas Estáticas -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/politica-de-privacidade</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${BASE_URL}/termos-de-uso</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${BASE_URL}/partner-register</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>0.8</priority>
  </url>`;

        // Sets para coletar Estados e Cidades únicos enquanto percorre os locais
        const states = new Set();
        const cities = new Set();
        let pagesCount = 4; // Contando as estáticas

        // Processa cada Day Use
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.slug && data.state) {
                const stateLower = data.state.toLowerCase();
                // Usa a data de atualização se existir, senão usa hoje
                const itemMod = data.updatedAt ? new Date(data.updatedAt.toDate()).toISOString().split('T')[0] : lastMod;

                // 1. Adiciona a URL do Local (Day Use)
                xml += `
  <url>
    <loc>${BASE_URL}/${stateLower}/${data.slug}</loc>
    <lastmod>${itemMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
                pagesCount++;

                // 2. Coleta Estado para criar página de listagem
                states.add(stateLower);

                // 3. Coleta Cidade para criar página de listagem
                if (data.city) {
                    const citySlug = data.city.toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
                        .replace(/\s+/g, '-')
                        .replace(/[^\w\-]+/g, '');
                    cities.add(`${stateLower}/${citySlug}`);
                }
            }
        });

        console.log(`🗺️  Gerando páginas para ${states.size} Estados e ${cities.size} Cidades identificadas...`);

        // Adiciona URLs de Estados no XML (ex: /mg)
        states.forEach(s => {
            xml += `
  <url>
    <loc>${BASE_URL}/${s}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
            pagesCount++;
        });

        // Adiciona URLs de Cidades no XML (ex: /mg/belo-horizonte)
        cities.forEach(c => {
            xml += `
  <url>
    <loc>${BASE_URL}/${c}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
            pagesCount++;
        });

        xml += `
</urlset>`;

        // Salva o arquivo na pasta public
        const publicPath = join(__dirname, '../public/sitemap.xml');
        fs.writeFileSync(publicPath, xml);

        console.log(`🎉 Sitemap gerado com sucesso em: ${publicPath}`);
        console.log(`📊 Total de URLs indexadas: ${pagesCount}`);
        console.log("👉 Agora faça o commit e push para subir o arquivo atualizado.");

    } catch (error) {
        console.error("❌ Erro ao gerar sitemap:", error);
    }
};

generateSitemap();