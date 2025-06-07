/**
 * Script para verificar la existencia de archivos en Firebase Storage
 */
const { initializeApp } = require('firebase/app');
const { getStorage, ref, getDownloadURL, getMetadata } = require('firebase/storage');

// Configuración de Firebase (igual que en src/firebase/config.js)
const firebaseConfig = {
  apiKey: "AIzaSyCHwFteCQ32331TdD_Euit74bcO_JMRS9U",
  authDomain: "cuentacuentos-b2e64.firebaseapp.com",
  projectId: "cuentacuentos-b2e64",
  storageBucket: "cuentacuentos-b2e64.firebasestorage.app",
  messagingSenderId: "8183103149",
  appId: "1:8183103149:web:7e57b742d64996bd78d024",
  measurementId: "G-0B04JP0PPF"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Archivos a verificar
const filesToCheck = [
  'stories/dragon-no-volar.txt',
  'audio/dragon-no-volar.mp3',
  'stories/princesa-valiente.txt',
  'audio/princesa-valiente.mp3'
];

// Función para verificar si un archivo existe
async function checkFile(path) {
  try {
    const fileRef = ref(storage, path);
    
    // Intentar obtener metadatos del archivo
    try {
      const metadata = await getMetadata(fileRef);
      console.log(`✅ Archivo encontrado: ${path}`);
      console.log(`   Tamaño: ${metadata.size} bytes`);
      console.log(`   Tipo: ${metadata.contentType}`);
      console.log(`   Creado: ${metadata.timeCreated}`);
      return true;
    } catch (metadataError) {
      console.error(`❌ Error al obtener metadatos para ${path}:`, metadataError.message);
    }
    
    // Intentar obtener URL de descarga como alternativa
    try {
      const url = await getDownloadURL(fileRef);
      console.log(`✅ URL disponible para: ${path}`);
      console.log(`   URL: ${url}`);
      return true;
    } catch (urlError) {
      console.error(`❌ Error al obtener URL para ${path}:`, urlError.message);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error general verificando ${path}:`, error.message);
    return false;
  }
}

// Verificar todos los archivos
async function checkAllFiles() {
  console.log('=== VERIFICACIÓN DE ARCHIVOS EN FIREBASE STORAGE ===');
  
  for (const file of filesToCheck) {
    console.log(`\nVerificando: ${file}`);
    await checkFile(file);
  }
  
  console.log('\n=== VERIFICACIÓN COMPLETADA ===');
}

// Ejecutar verificación
checkAllFiles().catch(error => {
  console.error('Error en la verificación:', error);
}); 