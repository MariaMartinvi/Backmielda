/**
 * Script para subir archivos de historias, imágenes y audios a Firebase Storage usando Admin SDK
 * y crear entradas en la base de datos Firestore
 * 
 * Uso:
 * 1. Asegúrate de tener el archivo firebase-credentials.json en la raíz del proyecto
 * 2. Ejecuta: node firebase-upload-admin.js
 * 
 * Puedes especificar directorios personalizados con argumentos:
 * node firebase-upload-admin.js --stories=./mis-historias --images=./mis-imagenes --audio=./mis-audios
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Ruta al archivo de credenciales
const credentialsPath = path.join(__dirname, 'firebase-credentials.json');

// Verificar si existe el archivo de credenciales
if (!fs.existsSync(credentialsPath)) {
  console.error('❌ No se encontró el archivo de credenciales de Firebase.');
  console.error('Por favor, crea un archivo firebase-credentials.json con las credenciales de tu cuenta de servicio de Firebase.');
  process.exit(1);
}

// Leer el archivo de credenciales
let serviceAccount;
try {
  serviceAccount = require(credentialsPath);
  console.log(`✅ Credenciales cargadas para el proyecto: ${serviceAccount.project_id}`);
} catch (error) {
  console.error('❌ Error al leer el archivo de credenciales:', error.message);
  process.exit(1);
}

// Inicializar Firebase Admin con las credenciales
try {
  // Usar el nombre específico del bucket de la configuración original
  const bucketName = "cuentacuentos-b2e64.firebasestorage.app";
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: bucketName
  });
  
  console.log(`✅ Firebase Admin inicializado correctamente con el bucket: ${bucketName}`);
} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin:', error.message);
  process.exit(1);
}

// Obtener referencia al bucket y a la base de datos
const bucket = admin.storage().bucket();
const db = admin.firestore();

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

// Función para extraer el título del archivo
function extractTitleFromFilename(filename) {
  // Quitar la extensión
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  
  // Convertir guiones y guiones bajos a espacios
  const nameWithSpaces = nameWithoutExt.replace(/[-_]/g, ' ');
  
  // Capitalizar cada palabra
  return nameWithSpaces.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Función para extraer el contenido de un archivo de texto
function extractTextContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Extraer el primer párrafo como descripción (hasta 200 caracteres)
    const firstParagraph = content.split('\n\n')[0].trim();
    return {
      content: content,
      description: firstParagraph.substring(0, 200) + (firstParagraph.length > 200 ? '...' : '')
    };
  } catch (error) {
    console.error(`❌ Error al leer el contenido del archivo ${filePath}:`, error.message);
    return {
      content: '',
      description: ''
    };
  }
}

// Función para subir un archivo a Firebase Storage usando Admin SDK
async function uploadFile(filePath, destinationPath) {
  try {
    const contentType = getContentType(filePath);
    
    // Opciones para la subida
    const options = {
      destination: destinationPath,
      metadata: {
        contentType: contentType,
        metadata: {
          firebaseStorageDownloadTokens: uuidv4()
        }
      }
    };
    
    console.log(`  Subiendo a bucket: ${bucket.name}`);
    
    // Subir el archivo
    const [file] = await bucket.upload(filePath, options);
    
    // Obtener URL pública
    const [metadata] = await file.getMetadata();
    const downloadToken = metadata.metadata.firebaseStorageDownloadTokens;
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${downloadToken}`;
    
    return {
      success: true,
      path: destinationPath,
      url: downloadURL,
      size: fs.statSync(filePath).size
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

// Función para crear una entrada en la base de datos para una historia
async function createStoryEntry(storyData) {
  try {
    // Usar el nombre del archivo como ID del documento
    const storyId = storyData.title.toLowerCase();
    
    // Crear la entrada en la colección storyExamples
    const storyRef = db.collection('storyExamples').doc(storyId);
    
    await storyRef.set(storyData);
    
    console.log(`  ✅ Entrada creada en la base de datos con ID: ${storyId}`);
    return {
      success: true,
      id: storyId
    };
  } catch (error) {
    console.error(`❌ Error al crear entrada en la base de datos:`, error.message);
    return {
      success: false,
      error: error.message
    };
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
  
  // Mapeo de nombres de archivo a IDs de historia
  const storyIds = {};
  
  // Procesar historias
  console.log('📚 Procesando historias...');
  const storyFiles = listFiles(directories.stories, allowedExtensions.stories);
  
  if (storyFiles.length > 0) {
    console.log(`Encontrados ${storyFiles.length} archivos de historias para subir`);
    
    for (const file of storyFiles) {
      console.log(`- Subiendo historia: ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`);
      
      // Obtener nombre base del archivo sin extensión
      const baseFilename = path.basename(file.filename, path.extname(file.filename));
      storyIds[baseFilename.toLowerCase()] = baseFilename.toLowerCase();
      
      // Subir archivo de texto
      const result = await uploadFile(
        file.path, 
        `stories/${file.filename}`
      );
      
      // Extraer contenido y descripción del archivo
      const { content, description } = extractTextContent(file.path);
      
      // Crear entrada en la base de datos
      if (result.success) {
        console.log(`  ✅ Subido correctamente a ${result.path}`);
        console.log(`  📎 URL: ${result.url}`);
        
        // Crear entrada en Firestore con la estructura correcta
        const storyData = {
          title: baseFilename.toLowerCase(),
          textPath: `stories/${file.filename}`,
          imagePath: '', // Se actualizará cuando se suba la imagen
          audioPath: '', // Se actualizará cuando se suba el audio
          age: "3to5", // Valor por defecto
          level: "beginner", // Valor por defecto
          language: "spanish" // Valor por defecto
        };
        
        const dbResult = await createStoryEntry(storyData);
        
        results.stories.push({
          filename: file.filename,
          id: baseFilename.toLowerCase(),
          ...result,
          dbEntry: dbResult
        });
      } else {
        console.log(`  ❌ Error: ${result.error}`);
        
        results.stories.push({
          filename: file.filename,
          id: baseFilename.toLowerCase(),
          ...result
        });
      }
    }
  } else {
    console.log('No se encontraron archivos de historias para subir');
  }
  
  // Procesar imágenes
  console.log('\n🖼️ Procesando imágenes...');
  const imageFiles = listFiles(directories.images, allowedExtensions.images);
  
  if (imageFiles.length > 0) {
    console.log(`Encontrados ${imageFiles.length} archivos de imágenes para subir`);
    
    for (const file of imageFiles) {
      console.log(`- Subiendo imagen: ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`);
      const result = await uploadFile(
        file.path, 
        `images/${file.filename}`
      );
      
      // Intentar asociar la imagen con una historia
      const baseFilename = path.basename(file.filename, path.extname(file.filename));
      const storyId = storyIds[baseFilename.toLowerCase()];
      
      if (result.success) {
        console.log(`  ✅ Subido correctamente a ${result.path}`);
        console.log(`  📎 URL: ${result.url}`);
        
        // Actualizar la entrada de la historia con la ruta de la imagen
        if (storyId) {
          try {
            await db.collection('storyExamples').doc(storyId).update({
              imagePath: `images/${file.filename}`
            });
            console.log(`  ✅ Ruta de imagen actualizada en la historia con ID: ${storyId}`);
          } catch (error) {
            console.error(`  ❌ Error al actualizar la ruta de imagen en la historia:`, error.message);
          }
        }
      } else {
        console.log(`  ❌ Error: ${result.error}`);
      }
      
      results.images.push({
        filename: file.filename,
        storyId: storyId,
        ...result
      });
    }
  } else {
    console.log('No se encontraron archivos de imágenes para subir');
  }
  
  // Procesar audios
  console.log('\n🔊 Procesando archivos de audio...');
  const audioFiles = listFiles(directories.audio, allowedExtensions.audio);
  
  if (audioFiles.length > 0) {
    console.log(`Encontrados ${audioFiles.length} archivos de audio para subir`);
    
    for (const file of audioFiles) {
      console.log(`- Subiendo audio: ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`);
      const result = await uploadFile(
        file.path, 
        `audio/${file.filename}`
      );
      
      // Intentar asociar el audio con una historia
      const baseFilename = path.basename(file.filename, path.extname(file.filename));
      const storyId = storyIds[baseFilename.toLowerCase()];
      
      if (result.success) {
        console.log(`  ✅ Subido correctamente a ${result.path}`);
        console.log(`  📎 URL: ${result.url}`);
        
        // Actualizar la entrada de la historia con la ruta del audio
        if (storyId) {
          try {
            await db.collection('storyExamples').doc(storyId).update({
              audioPath: `audio/${file.filename}`
            });
            console.log(`  ✅ Ruta de audio actualizada en la historia con ID: ${storyId}`);
          } catch (error) {
            console.error(`  ❌ Error al actualizar la ruta de audio en la historia:`, error.message);
          }
        }
      } else {
        console.log(`  ❌ Error: ${result.error}`);
      }
      
      results.audio.push({
        filename: file.filename,
        storyId: storyId,
        ...result
      });
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