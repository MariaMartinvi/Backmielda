/**
 * Script para subir archivos de ejemplo a Firebase Storage
 */
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadString, uploadBytes } = require('firebase/storage');
const fs = require('fs');
const path = require('path');

// Configuración de Firebase
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

// Contenido de ejemplo para los archivos de texto
const exampleStories = {
  'dragon-no-volar.txt': `El dragón que no podía volar

Había una vez un pequeño dragón llamado Puff que vivía en las montañas azules. A diferencia de otros dragones, Puff tenía un problema: no podía volar. Sus alas eran demasiado pequeñas y por más que lo intentaba, no lograba elevarse del suelo.

Todos los días, Puff observaba a los otros dragones volar alto en el cielo, haciendo piruetas y jugando entre las nubes. Se sentía muy triste porque quería jugar con ellos, pero no podía.

Un día, mientras caminaba por el bosque, Puff encontró a una pequeña niña que estaba perdida. La niña lloraba porque no podía encontrar el camino a su casa.

"No llores", le dijo Puff. "Yo te ayudaré a encontrar tu casa".

La niña se sorprendió al ver un dragón tan amable. Juntos caminaron por el bosque, y Puff usó su excelente sentido del olfato para seguir el rastro hasta la aldea donde vivía la niña.

Cuando llegaron, todos los habitantes del pueblo estaban asombrados. ¡Un dragón había ayudado a la niña! Estaban tan agradecidos que organizaron una gran fiesta para Puff.

Durante la fiesta, Puff se dio cuenta de algo importante: aunque no podía volar como los otros dragones, tenía otras habilidades especiales. Era amable, valiente y tenía un gran sentido del olfato que le permitía ayudar a los demás.

Desde ese día, Puff ya no se sintió triste por no poder volar. Había encontrado su propio camino para ser feliz y ayudar a los demás. Y así, el dragón que no podía volar se convirtió en el dragón más querido de todas las montañas azules.

Fin`,

  'princesa-valiente.txt': `La princesa valiente

Había una vez una princesa llamada Elena que vivía en un reino lejano. A diferencia de otras princesas, a Elena no le gustaban los vestidos elegantes ni las fiestas del palacio. Ella prefería explorar el bosque, trepar a los árboles y aprender a usar la espada.

El rey y la reina estaban preocupados por su hija. "Una princesa debe comportarse como tal", le decían. Pero Elena tenía otros planes.

Un día, un terrible dragón llegó al reino y comenzó a aterrorizar a los aldeanos. El rey envió a sus mejores caballeros para derrotar a la bestia, pero todos fallaron.

"Yo puedo derrotar al dragón", dijo Elena a su padre. El rey se rió. "Eres solo una niña", respondió. Pero Elena estaba decidida.

Esa noche, tomó la armadura de un caballero, una espada y partió hacia la cueva del dragón. Cuando llegó, no atacó de inmediato. En cambio, observó al dragón y notó algo extraño: tenía una espina clavada en su pata que le causaba dolor.

Con mucho cuidado, Elena se acercó al dragón. "No te haré daño", le dijo. "Quiero ayudarte". El dragón, aunque asustado, permitió que Elena le quitara la espina.

El dragón estaba tan agradecido que prometió no volver a molestar al reino. Elena regresó al castillo montada sobre el lomo del dragón, sorprendiendo a todos.

El rey y la reina finalmente entendieron que su hija era valiente y sabia a su manera. Desde ese día, Elena fue conocida como la princesa valiente, y cuando creció, se convirtió en la mejor gobernante que el reino había tenido jamás.

Fin`
};

// Función para crear un directorio si no existe
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directorio creado: ${dirPath}`);
  }
}

// Función para subir un archivo de texto
async function uploadTextFile(filename, content) {
  try {
    const storageRef = ref(storage, `stories/${filename}`);
    
    // Subir el contenido como string
    const result = await uploadString(storageRef, content, 'raw');
    console.log(`✅ Archivo de texto subido: stories/${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Error al subir archivo de texto ${filename}:`, error.message);
    return false;
  }
}

// Función para crear y subir archivos de audio de ejemplo (archivos vacíos)
async function createAndUploadEmptyAudioFile(filename) {
  try {
    // Crear un buffer vacío como archivo de audio de ejemplo
    const emptyBuffer = Buffer.alloc(1024); // 1KB de datos vacíos
    
    const storageRef = ref(storage, `audio/${filename}`);
    
    // Subir el buffer como bytes
    const result = await uploadBytes(storageRef, emptyBuffer, { contentType: 'audio/mpeg' });
    console.log(`✅ Archivo de audio vacío subido: audio/${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Error al subir archivo de audio ${filename}:`, error.message);
    return false;
  }
}

// Función principal para subir todos los archivos
async function uploadAllFiles() {
  console.log('=== SUBIENDO ARCHIVOS DE EJEMPLO A FIREBASE STORAGE ===');
  
  // Crear directorios locales temporales
  const tempDir = path.join(__dirname, 'temp');
  ensureDirectoryExists(tempDir);
  ensureDirectoryExists(path.join(tempDir, 'stories'));
  ensureDirectoryExists(path.join(tempDir, 'audio'));
  
  // Subir archivos de texto
  for (const [filename, content] of Object.entries(exampleStories)) {
    // Guardar localmente primero
    const filePath = path.join(tempDir, 'stories', filename);
    fs.writeFileSync(filePath, content);
    console.log(`Archivo guardado localmente: ${filePath}`);
    
    // Subir a Firebase Storage
    await uploadTextFile(filename, content);
  }
  
  // Crear y subir archivos de audio vacíos
  await createAndUploadEmptyAudioFile('dragon-no-volar.mp3');
  await createAndUploadEmptyAudioFile('princesa-valiente.mp3');
  
  console.log('\n=== PROCESO COMPLETADO ===');
}

// Ejecutar la función principal
uploadAllFiles().catch(error => {
  console.error('Error general:', error);
}); 