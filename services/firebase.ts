
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

// IMPORTANTE: Para o Firebase funcionar no Vercel, você deve configurar seu projeto no console do Firebase
// e habilitar o método de login do Google usando o ID do Cliente fornecido.
const firebaseConfig = {
  apiKey: "AIzaSy" + "A-PLACEHOLDER-KEY", // Você precisará da sua API Key do Firebase aqui
  authDomain: "crono-esfera.firebaseapp.com",
  projectId: "crono-esfera",
  storageBucket: "crono-esfera.appspot.com",
  messagingSenderId: "436769177248",
  appId: "1:436769177248:web:dynamic"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configurando o ID do cliente OAuth fornecido
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
