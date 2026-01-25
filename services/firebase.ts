
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, query, getDocs, writeBatch, increment } from "firebase/firestore";

/**
 * Configuração oficial do projeto Crono Esfera.
 * Certifique-se de que o domínio de hospedagem está autorizado no Console do Firebase.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCSkqA5GVRswubE-Qr8tgiyGbPt_bGdhsU",
  authDomain: "projeto-crono-esfera.firebaseapp.com",
  projectId: "projeto-crono-esfera",
  storageBucket: "projeto-crono-esfera.firebasestorage.app",
  messagingSenderId: "521810951366",
  appId: "1:521810951366:web:549c0bfb7ee7e68a0febc7"
};

// Inicializa o Firebase apenas uma vez
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Força o Google a sempre pedir para selecionar a conta, evitando loops automáticos
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  getDocs,
  writeBatch,
  increment
};
export type { User };
