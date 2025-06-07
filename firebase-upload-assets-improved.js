/**
 * Script mejorado para subir archivos de historias, imágenes y audios a Firebase Storage
 * 
 * MEJORAS IMPLEMENTADAS:
 * - Edad por defecto: "6to8" (6 a 8 años)
 * - Idioma por defecto: "español"
 * - Nivel por defecto: "intermediate" (intermedio)
 * - Extracción automática del protagonista del texto
 * - Protagonista por defecto: "Ana" si no se encuentra
 * - Extracción automática del título del texto
 * - Mejor análisis de contenido
 * 
 * Uso:
 * 1. Asegúrate de tener el archivo firebase-credentials.json en la raíz del proyecto
 * 2. Ejecuta: node firebase-upload-assets-improved.js
 * 
 * Puedes especificar directorios personalizados con argumentos:
 * node firebase-upload-assets-improved.js --stories=./mis-historias --images=./mis-imagenes --audio=./mis-audios
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

// Configuración por defecto mejorada
const DEFAULT_CONFIG = {
  age: "6to8",           // 6 a 8 años por defecto
  language: "español",   // Español por defecto
  level: "intermediate", // Nivel intermedio por defecto
  protagonista: "Ana"    // Protagonista por defecto si no se encuentra
};

// Extensiones de archivo permitidas por categoría
const allowedExtensions = {
  stories: ['.txt', '.md', '.json'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a']
};

// Lista de nombres comunes para detectar protagonistas por idioma
const NAMES_BY_LANGUAGE = {
  spanish: [
    // Nombres femeninos
    'Ana', 'María', 'Carmen', 'Isabel', 'Pilar', 'Dolores', 'Teresa', 'Rosa', 'Francisca', 'Antonia',
    'Sofía', 'Lucía', 'Martina', 'Paula', 'Julia', 'Daniela', 'Valeria', 'Alba', 'Sara', 'Noa',
    'Emma', 'Olivia', 'Mía', 'Isabella', 'Camila', 'Valentina', 'Zoe', 'Carla', 'Abril', 'Elena',
    // Nombres masculinos
    'Antonio', 'Manuel', 'José', 'Francisco', 'David', 'Juan', 'Javier', 'Daniel', 'Carlos', 'Miguel',
    'Alejandro', 'Pablo', 'Álvaro', 'Adrián', 'Diego', 'Mario', 'Hugo', 'Marco', 'Leo', 'Lucas',
    'Mateo', 'Santiago', 'Sebastián', 'Nicolás', 'Gabriel', 'Samuel', 'Andrés', 'Emilio', 'Iker', 'Bruno'
  ],
  english: [
    'Alice', 'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Mia', 'Amelia', 'Harper',
    'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Mila', 'Ella', 'Avery', 'Sofia', 'Camila', 'Aria',
    'James', 'Robert', 'John', 'Michael', 'David', 'William', 'Richard', 'Thomas', 'Christopher', 'Charles',
    'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth'
  ],
  french: [
    'Marie', 'Jeanne', 'Catherine', 'Françoise', 'Anne', 'Monique', 'Christine', 'Nicole', 'Sylvie', 'Nathalie',
    'Isabelle', 'Valérie', 'Sandrine', 'Céline', 'Stéphanie', 'Virginie', 'Laurence', 'Élodie', 'Amélie', 'Cécile',
    'Pierre', 'Jean', 'Michel', 'André', 'Philippe', 'Alain', 'Bernard', 'Christophe', 'François', 'Daniel',
    'Éric', 'Frédéric', 'Nicolas', 'Laurent', 'Thierry', 'David', 'Stéphane', 'Pascal', 'Julien', 'Sébastien'
  ],
  german: [
    'Anna', 'Emma', 'Hannah', 'Marie', 'Sofia', 'Lina', 'Emilia', 'Mia', 'Lena', 'Lea',
    'Amelie', 'Leonie', 'Nele', 'Clara', 'Maja', 'Charlotte', 'Johanna', 'Greta', 'Frieda', 'Ida',
    'Ben', 'Paul', 'Leon', 'Finn', 'Jonas', 'Luis', 'Noah', 'Luca', 'Felix', 'Henri',
    'Max', 'Emil', 'Oskar', 'Moritz', 'Jakob', 'Anton', 'Karl', 'Friedrich', 'Wilhelm', 'Franz'
  ],
  italian: [
    'Sofia', 'Giulia', 'Aurora', 'Alice', 'Ginevra', 'Emma', 'Giorgia', 'Greta', 'Beatrice', 'Anna',
    'Vittoria', 'Matilde', 'Noemi', 'Francesca', 'Sara', 'Azzurra', 'Martina', 'Chiara', 'Elena', 'Ludovica',
    'Francesco', 'Alessandro', 'Lorenzo', 'Leonardo', 'Andrea', 'Mattia', 'Gabriele', 'Riccardo', 'Tommaso', 'Edoardo',
    'Federico', 'Antonio', 'Diego', 'Davide', 'Christian', 'Nicolò', 'Giuseppe', 'Samuele', 'Giovanni', 'Pietro'
  ],
  portuguese: [
    'Maria', 'Ana', 'Francisca', 'Beatriz', 'Inês', 'Mariana', 'Matilde', 'Carolina', 'Leonor', 'Sofia',
    'Joana', 'Mafalda', 'Isabel', 'Alice', 'Marta', 'Lara', 'Constança', 'Madalena', 'Gabriela', 'Catarina',
    'João', 'Santiago', 'Francisco', 'Tomás', 'Pedro', 'Martim', 'Rodrigo', 'Salvador', 'Afonso', 'António',
    'Vicente', 'Gonçalo', 'Miguel', 'Gabriel', 'Duarte', 'Gustavo', 'Lourenço', 'Manuel', 'Rafael', 'Simão'
  ]
};

// Patrones de idiomas para detección automática
const LANGUAGE_PATTERNS = {
  spanish: {
    keywords: [
      'había una vez', 'érase una vez', 'en un lugar', 'muy lejos', 'entonces', 'después', 'cuando', 'porque',
      'también', 'siempre', 'nunca', 'princesa', 'príncipe', 'castillo', 'bosque', 'dragón', 'hada', 'bruja',
      'rey', 'reina', 'niña', 'niño', 'aventura', 'historia', 'cuento', 'mágico', 'encantado'
    ],
    commonWords: ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'con', 'por', 'para', 'que', 'se', 'le'],
    language: 'spanish'
  },
  english: {
    keywords: [
      'once upon a time', 'long ago', 'there was', 'there were', 'then', 'after', 'when', 'because',
      'also', 'always', 'never', 'princess', 'prince', 'castle', 'forest', 'dragon', 'fairy', 'witch',
      'king', 'queen', 'little girl', 'little boy', 'adventure', 'story', 'tale', 'magic', 'magical'
    ],
    commonWords: ['the', 'and', 'was', 'were', 'is', 'are', 'to', 'of', 'in', 'with', 'for', 'that', 'he', 'she', 'it'],
    language: 'english'
  },
  french: {
    keywords: [
      'il était une fois', 'il y a longtemps', 'dans un', 'alors', 'après', 'quand', 'parce que',
      'aussi', 'toujours', 'jamais', 'princesse', 'prince', 'château', 'forêt', 'dragon', 'fée', 'sorcière',
      'roi', 'reine', 'petite fille', 'petit garçon', 'aventure', 'histoire', 'conte', 'magique', 'enchanté'
    ],
    commonWords: ['le', 'la', 'les', 'un', 'une', 'de', 'du', 'dans', 'avec', 'pour', 'que', 'se', 'il', 'elle', 'était'],
    language: 'french'
  },
  german: {
    keywords: [
      'es war einmal', 'vor langer zeit', 'in einem', 'dann', 'nach', 'als', 'weil',
      'auch', 'immer', 'nie', 'prinzessin', 'prinz', 'schloss', 'wald', 'drache', 'fee', 'hexe',
      'könig', 'königin', 'kleines mädchen', 'kleiner junge', 'abenteuer', 'geschichte', 'märchen', 'magisch', 'verzaubert'
    ],
    commonWords: ['der', 'die', 'das', 'ein', 'eine', 'von', 'in', 'mit', 'für', 'dass', 'sich', 'er', 'sie', 'war'],
    language: 'german'
  },
  italian: {
    keywords: [
      'cera una volta', 'tanto tempo fa', 'in un', 'allora', 'dopo', 'quando', 'perché',
      'anche', 'sempre', 'mai', 'principessa', 'principe', 'castello', 'bosco', 'drago', 'fata', 'strega',
      're', 'regina', 'bambina', 'bambino', 'avventura', 'storia', 'racconto', 'magico', 'incantato'
    ],
    commonWords: ['il', 'la', 'i', 'le', 'un', 'una', 'di', 'del', 'in', 'con', 'per', 'che', 'si', 'lui', 'lei'],
    language: 'italian'
  },
  portuguese: {
    keywords: [
      'era uma vez', 'há muito tempo', 'num', 'então', 'depois', 'quando', 'porque',
      'também', 'sempre', 'nunca', 'princesa', 'príncipe', 'castelo', 'floresta', 'dragão', 'fada', 'bruxa',
      'rei', 'rainha', 'menina', 'menino', 'aventura', 'história', 'conto', 'mágico', 'encantado'
    ],
    commonWords: ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'em', 'com', 'para', 'que', 'se', 'ele', 'ela'],
    language: 'portuguese'
  }
};

// Función para detectar idioma automáticamente
function detectLanguage(content) {
  const textLower = content.toLowerCase();
  const languageScores = {};
  
  // Inicializar scores
  for (const lang of Object.keys(LANGUAGE_PATTERNS)) {
    languageScores[lang] = 0;
  }
  
  // Calcular scores basado en palabras clave y palabras comunes
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    // Puntos por palabras clave (más peso)
    for (const keyword of patterns.keywords) {
      if (textLower.includes(keyword)) {
        languageScores[lang] += 3;
      }
    }
    
    // Puntos por palabras comunes (menos peso)
    for (const word of patterns.commonWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        languageScores[lang] += matches.length * 0.5;
      }
    }
  }
  
  // Encontrar el idioma con mayor score
  let maxScore = 0;
  let detectedLanguage = 'spanish'; // Por defecto
  
  for (const [lang, score] of Object.entries(languageScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLanguage = LANGUAGE_PATTERNS[lang].language;
    }
  }
  
  console.log(`  🌍 Scores de idiomas: ${Object.entries(languageScores).map(([k,v]) => `${k}:${v.toFixed(1)}`).join(', ')}`);
  console.log(`  🎯 Idioma detectado: ${detectedLanguage} (score: ${maxScore.toFixed(1)})`);
  
  return detectedLanguage;
}

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

// Función para extraer el título del texto
function extractTitle(content) {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return null;
    
    const firstLine = lines[0].trim();
    
    // Buscar patrones de título
    const titlePatterns = [
      /^\*\*(.*?)\*\*$/,           // **Título**
      /^#\s*(.*?)$/,               // # Título
      /^Título:\s*(.*?)$/i,        // Título: ...
      /^"(.*?)"$/,                 // "Título"
      /^'(.*?)'$/,                 // 'Título'
      /^(.*?)$/                    // Primera línea como título
    ];
    
    for (const pattern of titlePatterns) {
      const match = firstLine.match(pattern);
      if (match) {
        let title = match[1] || match[0];
        title = title.trim();
        
        // Limpiar caracteres especiales
        title = title.replace(/[*#"']/g, '').trim();
        
        // Si el título es muy largo, tomar solo las primeras palabras
        if (title.length > 50) {
          const words = title.split(' ');
          title = words.slice(0, 8).join(' ');
          if (words.length > 8) title += '...';
        }
        
        return title || null;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Error extrayendo título:', error.message);
    return null;
  }
}

// Función para extraer el protagonista del texto según el idioma detectado
function extractProtagonist(content, detectedLanguage = 'spanish') {
  try {
    // Buscar nombres en el texto según el idioma detectado
    const foundNames = [];
    const namesForLanguage = NAMES_BY_LANGUAGE[detectedLanguage] || NAMES_BY_LANGUAGE['spanish'];
    
    for (const name of namesForLanguage) {
      // Buscar el nombre como palabra completa (no parte de otra palabra)
      const regex = new RegExp(`\\b${name}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        foundNames.push({
          name: name,
          count: matches.length,
          // Dar más peso si aparece al principio del texto
          earlyAppearance: content.substring(0, 300).toLowerCase().includes(name.toLowerCase())
        });
      }
    }
    
    // Si no se encuentra ningún nombre, buscar nombres propios con mayúscula
    if (foundNames.length === 0) {
      // Buscar palabras que empiecen con mayúscula y no sean palabras comunes
      const commonWords = ['El', 'La', 'Los', 'Las', 'Un', 'Una', 'De', 'Del', 'En', 'Con', 'Por', 'Para', 'Que', 'Se', 'Le',
                          'The', 'And', 'Was', 'Were', 'Is', 'Are', 'To', 'Of', 'In', 'With', 'For', 'That', 'He', 'She', 'It',
                          'Le', 'La', 'Les', 'Un', 'Une', 'De', 'Du', 'Dans', 'Avec', 'Pour', 'Que', 'Se', 'Il', 'Elle', 'Était'];
      
      const properNouns = content.match(/\b[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ][a-zàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]{2,}\b/g);
      
      if (properNouns) {
        const filteredNouns = properNouns.filter(noun => !commonWords.includes(noun));
        if (filteredNouns.length > 0) {
          // Tomar el primer nombre propio que no sea una palabra común
          return filteredNouns[0];
        }
      }
    }
    
    if (foundNames.length === 0) {
      return DEFAULT_CONFIG.protagonista; // "Ana" por defecto
    }
    
    // Ordenar por frecuencia y aparición temprana
    foundNames.sort((a, b) => {
      if (a.earlyAppearance && !b.earlyAppearance) return -1;
      if (!a.earlyAppearance && b.earlyAppearance) return 1;
      return b.count - a.count;
    });
    
    return foundNames[0].name;
    
  } catch (error) {
    console.warn('⚠️ Error extrayendo protagonista:', error.message);
    return DEFAULT_CONFIG.protagonista; // "Ana" por defecto
  }
}

// Función para analizar el contenido del archivo de historia
function analyzeStoryContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Detectar idioma primero
    const detectedLanguage = detectLanguage(content);
    
    const analysis = {
      title: extractTitle(content) || 'Historia sin título',
      protagonista: extractProtagonist(content, detectedLanguage),
      language: detectedLanguage,
      wordCount: content.split(/\s+/).length,
      hasDialogue: content.includes('"') || content.includes('—') || content.includes('-') || content.includes('«') || content.includes('»'),
      content: content
    };
    
    console.log(`  📊 Análisis: Título="${analysis.title}", Protagonista="${analysis.protagonista}", Idioma="${analysis.language}", Palabras=${analysis.wordCount}`);
    
    return analysis;
    
  } catch (error) {
    console.warn(`⚠️ Error analizando contenido de ${filePath}:`, error.message);
    return {
      title: 'Historia sin título',
      protagonista: DEFAULT_CONFIG.protagonista,
      language: 'spanish',
      wordCount: 0,
      hasDialogue: false,
      content: ''
    };
  }
}

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
  console.log('=== SUBIENDO ARCHIVOS A FIREBASE STORAGE (VERSIÓN MEJORADA) ===\n');
  console.log('🔧 Configuración por defecto:');
  console.log(`   👶 Edad: ${DEFAULT_CONFIG.age} (6 a 8 años)`);
  console.log(`   🌍 Idioma: ${DEFAULT_CONFIG.language}`);
  console.log(`   📊 Nivel: ${DEFAULT_CONFIG.level} (intermedio)`);
  console.log(`   👤 Protagonista por defecto: ${DEFAULT_CONFIG.protagonista}\n`);
  
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
  const firestoreCollection = args.collection || 'storyExamples';
  console.log(`ℹ️ Se actualizará la colección de Firestore: ${firestoreCollection}`);
  
  // Procesar historias
  console.log('\n📚 Procesando historias...');
  const storyFiles = listFiles(directories.stories, allowedExtensions.stories);
  
  if (storyFiles.length > 0) {
    console.log(`Encontrados ${storyFiles.length} archivos de historias para subir`);
    
    for (const file of storyFiles) {
      console.log(`\n- Procesando historia: ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`);
      
      // Analizar contenido de la historia
      const analysis = analyzeStoryContent(file.path);
      
      // Subir archivo de historia
      const result = await uploadFile(
        file.path, 
        `stories/${file.filename}`
      );
      
      results.stories.push({
        filename: file.filename,
        analysis: analysis,
        ...result
      });
      
      if (result.success) {
        console.log(`  ✅ Subido correctamente a ${result.path}`);
        
        // Extraer nombre base del archivo (sin extensión)
        const storyId = path.basename(file.filename, path.extname(file.filename)).toLowerCase();
        
        // Buscamos los archivos correspondientes de imagen y audio
        const imageFile = imageFiles.find(img => 
          path.basename(img.filename, path.extname(img.filename)).toLowerCase() === storyId
        );
        
        const audioFile = audioFiles.find(aud => 
          path.basename(aud.filename, path.extname(aud.filename)).toLowerCase() === storyId
        );
        
        // Crear documento de Firestore con datos mejorados
        console.log(`  🔄 Actualizando Firestore para: ${storyId}`);
        
        const storyData = {
          age: DEFAULT_CONFIG.age,                    // "6to8" por defecto
          audioPath: audioFile ? `audio/${audioFile.filename}` : "",
          imagePath: imageFile ? `images/${imageFile.filename}` : `images/${storyId}.jpg`,
          language: analysis.language,                // Idioma detectado automáticamente
          level: DEFAULT_CONFIG.level,                // "intermediate" por defecto
          protagonista: analysis.protagonista,        // Extraído del texto o "Ana" por defecto
          textPath: `stories/${file.filename}`,
          title: analysis.title                       // Extraído del texto
        };
        
        console.log(`  📋 Datos del documento:`);
        console.log(`     📖 Título: "${storyData.title}"`);
        console.log(`     👤 Protagonista: "${storyData.protagonista}"`);
        console.log(`     👶 Edad: ${storyData.age}`);
        console.log(`     🌍 Idioma: ${storyData.language}`);
        console.log(`     📊 Nivel: ${storyData.level}`);
        console.log(`     🖼️ Imagen: ${storyData.imagePath}`);
        console.log(`     🔊 Audio: ${storyData.audioPath || 'No disponible'}`);
        
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
      } else {
        console.log(`  ❌ Error: ${result.error}`);
      }
    }
  } else {
    console.log('No se encontraron archivos de audio para subir');
  }
  
  // Resumen final
  console.log('\n=== RESUMEN DE LA SUBIDA (VERSIÓN MEJORADA) ===');
  console.log(`📚 Historias: ${results.stories.filter(r => r.success).length} subidas, ${results.stories.filter(r => !r.success).length} fallidas`);
  console.log(`🖼️ Imágenes: ${results.images.filter(r => r.success).length} subidas, ${results.images.filter(r => !r.success).length} fallidas`);
  console.log(`🔊 Audios: ${results.audio.filter(r => r.success).length} subidos, ${results.audio.filter(r => !r.success).length} fallidos`);
  
  // Mostrar análisis de historias procesadas
  const successfulStories = results.stories.filter(r => r.success);
  if (successfulStories.length > 0) {
    console.log('\n📊 Análisis de historias procesadas:');
    successfulStories.forEach((story, index) => {
      console.log(`${index + 1}. ${story.filename}`);
      console.log(`   📖 Título: "${story.analysis.title}"`);
      console.log(`   👤 Protagonista: ${story.analysis.protagonista}`);
      console.log(`   📝 Palabras: ${story.analysis.wordCount}`);
      console.log(`   💬 Diálogos: ${story.analysis.hasDialogue ? 'Sí' : 'No'}`);
    });
  }
  
  // Generar archivo JSON con los resultados
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFilePath = `upload-results-improved-${timestamp}.json`;
  
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
console.log('\nIniciando proceso de subida mejorado...');
uploadAllFiles()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    console.log('🎉 Todas las historias han sido procesadas con:');
    console.log('   👶 Edad: 6to8 (6 a 8 años)');
    console.log('   🌍 Idioma: español');
    console.log('   📊 Nivel: intermediate (intermedio)');
    console.log('   📖 Títulos extraídos automáticamente');
    console.log('   👤 Protagonistas detectados automáticamente');
  })
  .catch(error => {
    console.error('\n❌ Error general:', error);
    process.exit(1);
  }); 