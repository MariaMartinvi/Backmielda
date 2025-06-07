import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCHwFteCQ32331TdD_Euit74bcO_JMRS9U",
  authDomain: "cuentacuentos-b2e64.firebaseapp.com",
  projectId: "cuentacuentos-b2e64",
  storageBucket: "cuentacuentos-b2e64.firebasestorage.app", // Corregido el bucket
  messagingSenderId: "8183103149",
  appId: "1:8183103149:web:7e57b742d64996bd78d024",
  measurementId: "G-0B04JP0PPF"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias
const db = getFirestore(app);
const auth = getAuth(app);

// Configurar Storage para manejar CORS
const storage = getStorage(app);

// Añadir headers personalizados para evitar problemas de CORS
// Esto es una solución del lado del cliente, pero la solución real debe ser configurar CORS en Firebase Storage
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  // Si la URL contiene el dominio de Firebase Storage
  if (url && typeof url === 'string' && url.includes('firebasestorage.googleapis.com')) {
    // Asegurarnos de que options.headers existe
    options.headers = options.headers || {};
    
    // Añadir headers para CORS
    options.headers['Access-Control-Allow-Origin'] = '*';
    options.mode = 'cors';
    
    console.log('Interceptando fetch a Firebase Storage:', url);
  }
  
  return originalFetch(url, options);
};

console.log("Firebase configurado correctamente");
console.log("StorageBucket:", firebaseConfig.storageBucket);
console.log("Modo:", process.env.NODE_ENV || 'producción');

export { db, auth, storage }; 