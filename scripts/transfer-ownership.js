import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const admin = require('firebase-admin');

// 1. CONFIGURAÇÃO
const serviceAccountPath = join(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('\n❌ Erro: service-account.json não encontrado na raiz.');
    process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// --- CONFIGURE SEU E-MAIL AQUI ---
// Este é o e-mail da conta que vai "herdar" todos os day uses importados
const TARGET_EMAIL = "iuri@mapadodayuse.com"; 
// ---------------------------------

const transferOwnership = async () => {
  try {
    console.log(`🔍 Buscando usuário: ${TARGET_EMAIL}...`);
    
    // Busca o UID do seu usuário no Firebase Auth
    const user = await auth.getUserByEmail(TARGET_EMAIL);
    const newOwnerId = user.uid;
    
    console.log(`✅ Usuário encontrado! UID: ${newOwnerId}`);
    console.log(`📦 Buscando day uses marcados como 'ADMIN_IMPORT'...`);

    // Busca todos os day uses importados
    const snapshot = await db.collection('dayuses').where('ownerId', '==', 'ADMIN_IMPORT').get();

    if (snapshot.empty) {
        console.log('⚠️ Nenhum Day Use pendente de transferência encontrado.');
        process.exit();
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        // Atualiza o dono para o seu usuário
        batch.update(doc.ref, { 
            ownerId: newOwnerId,
            updatedAt: new Date()
        });
        count++;
    });

    await batch.commit();
    console.log(`🎉 Sucesso! ${count} Day Uses foram transferidos para o seu painel.`);
    console.log(`👉 Acesse /partner no site para editá-los.`);

  } catch (error) {
    console.error("❌ Erro:", error.message);
    if (error.code === 'auth/user-not-found') {
        console.error("Dica: Crie uma conta no site com esse e-mail antes de rodar o script.");
    }
  }
  process.exit();
};

transferOwnership();