import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Provedores de Login
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// 3. Adicione no export
export { auth, db, storage, googleProvider, facebookProvider }; 
export default app;