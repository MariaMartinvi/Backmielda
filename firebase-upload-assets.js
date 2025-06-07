/**
 * Script para subir archivos de historias, imágenes y audios a Firebase Storage
 * 
 * Uso:
 * 1. Asegúrate de tener el archivo firebase-credentials.json en la raíz del proyecto
 * 2. Ejecuta: node firebase-upload-assets.js
 * 
 * Puedes especificar directorios personalizados con argumentos:
 * node firebase-upload-assets.js --stories=./mis-historias --images=./mis-imagenes --audio=./mis-audios
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase-admin/storage');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Cargar credenciales desde el archivo JSON
let serviceAccount;
try {
  serviceAccount = require('./firebase-credentials.json');
} catch (error) {
  console.error('❌ Error al cargar firebase-credentials.json:', error.message);
  console.error('Asegúrate de tener el archivo firebase-credentials.json en la raíz del proyecto');
  process.exit(1);
}

// Inicializar Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "cuentacuentos-b2e64.firebasestorage.app"
});
const storage = getStorage(app);
const db = getFirestore(app);

// Extensiones de archivo permitidas por categoría
const allowedExtensions = {
  stories: ['.txt', '.md', '.json'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a']
};

// Función para parsear argumentos de línea de comandos
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value;
    }
  });
  return args;
}

// Directorios por defecto y personalizados
const args = parseArgs();
const directories = {
  stories: args.stories || './temp/stories',
  images: args.images || './temp/images',
  audio: args.audio || './temp/audio'
};

// Función para verificar si un directorio existe
function directoryExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (err) {
    return false;
  }
}

// Función para listar archivos en un directorio con filtro de extensión
function listFiles(dirPath, allowedExts) {
  if (!directoryExists(dirPath)) {
    console.log(`⚠️ El directorio ${dirPath} no existe o no es accesible`);
    return [];
  }
  
  try {
    return fs.readdirSync(dirPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return allowedExts.includes(ext);
      })
      .map(file => ({
        filename: file,
        path: path.join(dirPath, file),
        ext: path.extname(file).toLowerCase(),
        size: fs.statSync(path.join(dirPath, file)).size
      }));
  } catch (err) {
    console.error(`❌ Error al listar archivos en ${dirPath}:`, err.message);
    return [];
  }
}

// Función para subir un archivo a Firebase Storage
async function uploadFile(filePath, destinationPath, contentType) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const bucket = storage.bucket();
    const file = bucket.file(destinationPath);
    
    const metadata = {
      contentType: contentType || getContentType(filePath)
    };
    
    await file.save(fileBuffer, {
      metadata: metadata
    });
    
    // Obtener URL de descarga (vigente por 7 días)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Fecha lejana para URL casi permanente
    });
    
    return {
      success: true,
      path: destinationPath,
      url: url,
      size: fileBuffer.length
    };
  } catch (error) {
    console.error(`❌ Error al subir archivo ${filePath}:`, error.message);
    return {
      success: false,
      path: destinationPath,
      error: error.message
    };
  }
}

// Función para determinar el tipo de contenido basado en la extensión
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const contentTypes = {
    // Texto
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    
    // Imágenes
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/m4a'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Función para crear o actualizar un documento en Firestore
async function updateFirestoreDocument(collection, docId, data) {
  try {
    await db.collection(collection).doc(docId).set(data, { merge: true });
    return { success: true };
  } catch (error) {
    console.error(`❌ Error al actualizar documento en Firestore (${collection}/${docId}):`, error.message);
    return { success: false, error: error.message };
  }
}

// Función principal para subir todos los archivos
async function uploadAllFiles() {
  console.log('=== SUBIENDO ARCHIVOS A FIREBASE STORAGE ===\n');
  
  const results = {
    stories: [],
    images: [],
    audio: []
  };
  
  // Obtener archivos de imágenes y audio por adelantado
  console.log('🖼️ Analizando archivos de imágenes...');
  const imageFiles = listFiles(directories.images, allowedExtensions.images);
  if (imageFiles.length > 0) {
    console.log(`Encontrados ${imageFiles.length} archivos de imágenes`);
  }
  
  console.log('🔊 Analizando archivos de audio...');
  const audioFiles = listFiles(directories.audio, allowedExtensions.audio);
  if (audioFiles.length > 0) {
    console.log(`Encontrados ${audioFiles.length} archivos de audio`);
  }
  
  // La colección a la que se subirán los documentos
  const firestoreCollection = args.collection || 'stories';
  console.log(`ℹ️ Se actualizará la colección de Firestore: ${firestoreCollection}`);
  
  // Procesar historias
  console.log('\n📚 Procesando historias...');
  const storyFiles = listFiles(directories.stories, allowedExtensions.stories);
  
  if (storyFiles.length > 0) {
    console.log(`Encontrados ${storyFiles.length} archivos de historias para subir`);
    
    for (const file of storyFiles) {
      console.log(`- Subiendo historia: ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`);
      const result = await uploadFile(
        file.path, 
        `stories/${file.filename}`
      );
      
      results.stories.push({
        filename: file.filename,
        ...result
      });
      
      if (result.success) {
        console.log(`  ✅ Subido correctamente a ${result.path}`);
        console.log(`  📎 URL: ${result.url}`);
        
        // Extraer nombre base del archivo (sin extensión)
        const storyId = path.basename(file.filename, path.extname(file.filename)).toLowerCase();
        
        // Buscamos los archivos correspondientes de imagen y audio
        const imageFile = imageFiles.find(img => 
          path.basename(img.filename, path.extname(img.filename)).toLowerCase() === storyId
        );
        
        const audioFile = audioFiles.find(aud => 
          path.basename(aud.filename, path.extname(aud.filename)).toLowerCase() === storyId
        );
        
        // Si encontramos la historia, actualizaremos Firestore
        console.log(`  🔄 Actualizando Firestore para: ${storyId}`);
        
        const storyData = {
          title: storyId.charAt(0).toUpperCase() + storyId.slice(1), // Capitalize
          textPath: `stories/${file.filename}`,
          imagePath: imageFile ? `images/${imageFile.filename}` : "",
          audioPath: audioFile ? `audio/${audioFile.filename}` : "",
          language: "spanish", // Valor por defecto, podría extraerse del nombre o contenido
          level: "beginner",   // Valor por defecto
          age: "3to5"          // Valor por defecto
        };
        
        const firestoreResult = await updateFirestoreDocument(firestoreCollection, storyId, storyData);
        
        if (firestoreResult.success) {
          console.log(`  ✅ Documento de Firestore actualizado: ${firestoreCollection}/${storyId}`);
        } else {
          console.log(`  ❌ Error al actualizar Firestore: ${firestoreResult.error}`);
        }
      } else {
        console.log(`  ❌ Error: ${result.error}`);
      }
    }
  } else {
    console.log('No se encontraron archivos de historias para subir');
  }
  
  // Continuar con la carga de imágenes
  console.log('\n🖼️ Subiendo imágenes...');
  if (imageFiles.length > 0) {
    for (const file of imageFiles) {
      console.log(`- Subiendo imagen: ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`);
      const result = await uploadFile(
        file.path, 
        `images/${file.filename}`
      );
      
      results.images.push({
        filename: file.filename,
        ...result
      });
      
      if (result.success) {
        console.log(`  ✅ Subido correctamente a ${result.path}`);
        console.log(`  📎 URL: ${result.url}`);
      } else {
        console.log(`  ❌ Error: ${result.error}`);
      }
    }
  } else {
    console.log('No se encontraron archivos de imágenes para subir');
  }
  
  // Procesar audios
  console.log('\n🔊 Subiendo archivos de audio...');
  if (audioFiles.length > 0) {
    for (const file of audioFiles) {
      console.log(`- Subiendo audio: ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`);
      const result = await uploadFile(
        file.path, 
        `audio/${file.filename}`
      );
      
      results.audio.push({
        filename: file.filename,
        ...result
      });
      
      if (result.success) {
        console.log(`  ✅ Subido correctamente a ${result.path}`);
        console.log(`  📎 URL: ${result.url}`);
      } else {
        console.log(`  ❌ Error: ${result.error}`);
      }
    }
  } else {
    console.log('No se encontraron archivos de audio para subir');
  }
  
  // Resumen final
  console.log('\n=== RESUMEN DE LA SUBIDA ===');
  console.log(`📚 Historias: ${results.stories.filter(r => r.success).length} subidas, ${results.stories.filter(r => !r.success).length} fallidas`);
  console.log(`🖼️ Imágenes: ${results.images.filter(r => r.success).length} subidas, ${results.images.filter(r => !r.success).length} fallidas`);
  console.log(`🔊 Audios: ${results.audio.filter(r => r.success).length} subidos, ${results.audio.filter(r => !r.success).length} fallidos`);
  
  // Generar archivo JSON con los resultados
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFilePath = `upload-results-${timestamp}.json`;
  
  fs.writeFileSync(resultFilePath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Resultados guardados en ${resultFilePath}`);
  
  return results;
}

// Verificar que los directorios existan
console.log('Verificando directorios...');
Object.entries(directories).forEach(([key, dir]) => {
  if (directoryExists(dir)) {
    console.log(`✅ Directorio ${key}: ${dir}`);
  } else {
    console.log(`⚠️ Directorio ${key} no encontrado: ${dir}`);
  }
});

// Ejecutar la función principal
console.log('\nIniciando proceso de subida...');
uploadAllFiles()
  .then(() => {
    console.log('\n✅ Proceso completado');
  })
  .catch(error => {
    console.error('\n❌ Error general:', error);
    process.exit(1);
  }); 