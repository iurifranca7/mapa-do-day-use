import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- COLE SUA CONFIGURAÇÃO AQUI ABAIXO ---
// (Substitua tudo entre as chaves pelo que copiou do site do Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyAqZhR7Wy0GrifwYnuqEM0nimGHCCcDlks",
  authDomain: "mapa-do-day-use.firebaseapp.com",
  projectId: "mapa-do-day-use",
  storageBucket: "mapa-do-day-use.firebasestorage.app",
  messagingSenderId: "506362926044",
  appId: "1:506362926044:web:72ae25104b288a7fe0f519"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
// Exporta o Banco de Dados para usarmos no site
export const db = getFirestore(app);