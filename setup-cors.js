/**
 * Script para configurar CORS en Firebase Storage
 * 
 * Para usar este script:
 * 1. Instala las dependencias: npm install firebase-admin
 * 2. Ejecuta: node setup-cors.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Verificar si existe el archivo de credenciales
const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
if (!fs.existsSync(credentialsPath)) {
  console.error('Error: No se encontró el archivo de credenciales.');
  console.log('Por favor, crea un archivo firebase-credentials.json con las credenciales de tu cuenta de servicio de Firebase.');
  console.log('Puedes obtener este archivo desde la consola de Firebase:');
  console.log('1. Ve a https://console.firebase.google.com/');
  console.log('2. Selecciona tu proyecto');
  console.log('3. Ve a Configuración > Cuentas de servicio');
  console.log('4. Haz clic en "Generar nueva clave privada"');
  console.log('5. Guarda el archivo JSON descargado como "firebase-credentials.json" en la raíz del proyecto');
  process.exit(1);
}

// Configuración de CORS
const corsConfiguration = [
  {
    origin: ["*"], // Permitir cualquier origen (puedes restringirlo a dominios específicos)
    method: ["GET", "HEAD", "PUT", "POST", "DELETE"],
    responseHeader: ["Content-Type", "Content-Length", "Content-Disposition", "Access-Control-Allow-Origin"],
    maxAgeSeconds: 3600
  }
];

// Inicializar Firebase Admin
try {
  const serviceAccount = require(credentialsPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "cuentacuentos-b2e64.firebasestorage.app"
  });
  
  console.log('Firebase Admin inicializado correctamente.');
  
  // Configurar CORS en el bucket
  const bucket = admin.storage().bucket();
  
  bucket.setCorsConfiguration(corsConfiguration)
    .then(() => {
      console.log('Configuración CORS aplicada correctamente al bucket de Firebase Storage.');
      console.log('Configuración aplicada:');
      console.log(JSON.stringify(corsConfiguration, null, 2));
    })
    .catch(error => {
      console.error('Error al aplicar la configuración CORS:', error);
    });
    
} catch (error) {
  console.error('Error al inicializar Firebase Admin:', error);
  process.exit(1);
} 