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

// --- CONFIGURAÇÃO MANUAL (PREENCHA AQUI) ---
const OWNER_ID = "7hzmbWtgPeSYdxCFXz12BwfGIr73"; // Pegue no Firebase Auth ou no seu Perfil
const DAYUSE_ID = "StLQNTKXkMQK4SnhqeXb"; // Pegue no painel ou na URL de edição
const DAYUSE_NAME = "Francast Acquá Park"; // Nome que vai aparecer
// -------------------------------------------

const generateFakeReservations = async () => {
    try {
        console.log("🚀 Gerando reservas fakes...");

        const batch = db.batch();
        const today = new Date();
        
        // Gera 15 reservas variadas
        for (let i = 0; i < 15; i++) {
            const ref = db.collection('reservations').doc();
            
            // Data aleatória (entre hoje e +30 dias)
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + Math.floor(Math.random() * 30));
            const dateStr = futureDate.toISOString().split('T')[0];

            // Status aleatório
            const statuses = ['confirmed', 'confirmed', 'confirmed', 'validated', 'cancelled'];
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            // Método pagto aleatório
            const methods = ['pix', 'card'];
            const method = methods[Math.floor(Math.random() * methods.length)];

            const adults = Math.floor(Math.random() * 4) + 1;
            const children = Math.floor(Math.random() * 3);
            const total = (adults * 100) + (children * 50);

            const docData = {
                ownerId: OWNER_ID,
                userId: "fake_user_" + i,
                dayuseId: DAYUSE_ID,
                itemName: DAYUSE_NAME,
                itemImage: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80",
                
                guestName: `Visitante Teste ${i + 1}`,
                guestEmail: `teste${i}@exemplo.com`,
                
                date: dateStr,
                adults: adults,
                children: children,
                pets: 0,
                freeChildren: 0,
                
                total: total,
                discount: 0,
                couponCode: null,
                
                paymentMethod: method,
                paymentId: "FAKE_PAYMENT_" + Math.random().toString(36).substr(2, 9),
                
                status: status,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            batch.set(ref, docData);
        }

        await batch.commit();
        console.log("✅ Sucesso! 15 reservas fakes criadas no seu painel.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Erro:", error);
        process.exit(1);
    }
};

if (OWNER_ID === "COLE_SEU_UID_DE_PARCEIRO_AQUI") {
    console.error("⚠️  Por favor, edite o arquivo e coloque seu OWNER_ID na linha 32.");
} else {
    generateFakeReservations();
}