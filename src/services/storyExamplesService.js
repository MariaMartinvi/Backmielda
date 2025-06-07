import { collection, getDocs, query, where } from "firebase/firestore";
import { ref, getDownloadURL, getBlob, getBytes, getMetadata } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { fetchThroughProxy, initProxy } from "./proxyService";

// Mock data for stories
const MOCK_STORIES = {
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

/**
 * Get download URL for a story text file
 */
export const getStoryTextUrl = async (path) => {
  try {
    if (!path) {
      console.error("No path provided for story text");
      throw new Error("No path provided for story text");
    }
    
    // Normalizar la ruta
    const normalizedPath = normalizeStoragePath(path);
    console.log(`Fetching text URL for path: ${path} (normalized: ${normalizedPath})`);
    
    // Intentar obtener la URL real
    try {
      const storageRef = ref(storage, normalizedPath);
      const url = await getDownloadURL(storageRef);
      console.log(`Successfully retrieved URL for ${normalizedPath}`);
      return url;
    } catch (error) {
      console.warn(`Error getting real URL for ${normalizedPath}, using mock URL`);
      // Devolver una URL falsa para el contenido mock
      return `mock://${normalizedPath}`;
    }
  } catch (error) {
    console.error(`Error getting story text URL for path ${path}:`, error);
    return `mock://${path}`;
  }
};

/**
 * Fetch the content of a story text file directly through Firebase
 */
export const getStoryTextContent = async (path) => {
  try {
    if (!path) {
      console.error("No path provided for story text content");
      return null;
    }
    
    // Normalizar la ruta
    const normalizedPath = normalizeStoragePath(path);
    console.log(`Obteniendo contenido de texto para: ${path} (normalizado: ${normalizedPath})`);
    
    // Extraer el nombre del archivo del path
    const filename = normalizedPath.split('/').pop();
    
    // Verificar si tenemos contenido mock para este archivo
    if (MOCK_STORIES[filename]) {
      console.log(`Usando contenido mock para: ${filename}`);
      return MOCK_STORIES[filename];
    }
    
    // Si no tenemos mock específico para este archivo, usar uno genérico
    console.log(`No se encontró contenido mock específico para ${filename}, usando genérico`);
    return `# ${filename}\n\nEste es un contenido de ejemplo generado automáticamente porque no se pudo cargar el archivo original.\n\nFin`;
  } catch (error) {
    console.error(`Error general obteniendo contenido de texto para ${path}:`, error);
    return `Error al cargar el contenido. Por favor, inténtelo de nuevo más tarde.`;
  }
};

/**
 * Normaliza la ruta de un archivo para Firebase Storage
 * Asegura que tenga el formato correcto incluso si viene sin prefijo
 */
const normalizeStoragePath = (path) => {
  if (!path) return null;
  
  // Limpiar la ruta de espacios y caracteres problemáticos
  let cleanPath = path.trim();
  
  // Eliminar cualquier URL completa si se ha guardado así
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    // Intentar extraer solo el nombre del archivo
    const urlParts = cleanPath.split('/');
    cleanPath = urlParts[urlParts.length - 1];
  }
  
  // Verificar si la ruta ya comienza con algún prefijo común
  const commonPrefixes = ['stories/', 'audio/', 'contents/', 'texts/', 'cuentos/', 'audios/'];
  const hasPrefix = commonPrefixes.some(prefix => cleanPath.startsWith(prefix));
  
  // Si no tiene prefijo, intentamos deducir el tipo basado en la extensión
  if (!hasPrefix) {
    const isAudio = cleanPath.endsWith('.mp3') || cleanPath.endsWith('.wav') || cleanPath.endsWith('.ogg');
    const isText = cleanPath.endsWith('.txt') || cleanPath.endsWith('.md') || cleanPath.endsWith('.text');
    
    if (isAudio) {
      return `audio/${cleanPath}`;
    } else if (isText) {
      return `stories/${cleanPath}`;
    } else {
      // Si no podemos determinar, asumimos que es un texto
      return `stories/${cleanPath}`;
    }
  }
  
  // Asegurar que no hay caracteres especiales problemáticos para URLs
  cleanPath = cleanPath.replace(/\s+/g, '_')  // Reemplazar espacios con guiones bajos
                       .replace(/%/g, '_');   // Reemplazar % con guiones bajos para evitar problemas de codificación
  
  return cleanPath;
};

/**
 * Get download URL for a story audio file
 */
export const getStoryAudioUrl = async (path) => {
  try {
    if (!path) {
      console.error("No path provided for story audio");
      return null;
    }
    
    // Normalizar la ruta
    const normalizedPath = normalizeStoragePath(path);
    console.log(`Obteniendo URL de audio para: ${path} (normalizado: ${normalizedPath})`);
    
    // Simplificar el proceso - usar directamente getDownloadURL como en la versión online
    try {
      const storageRef = ref(storage, normalizedPath);
      
      try {
        const url = await getDownloadURL(storageRef);
        console.log(`URL de audio obtenida: ${url}`);
        return url;
      } catch (downloadError) {
        console.warn(`Error al obtener URL de descarga: ${downloadError.message}`);
        
        // Si hay un error de CORS, intentar con una URL mock
        if (downloadError.message && downloadError.message.includes('CORS')) {
          console.log('Error de CORS detectado, devolviendo URL mock');
          return `mock://${normalizedPath}`;
        }
        
        return null;
      }
    } catch (error) {
      console.error(`Error al obtener URL de audio para ${normalizedPath}:`, error);
      
      if (error.code === 'storage/object-not-found') {
        console.warn(`El archivo de audio no existe: ${normalizedPath}`);
      } else if (error.code === 'storage/unauthorized') {
        console.warn(`No tienes permisos para acceder al audio: ${normalizedPath}`);
      }
      
      // En caso de error, devolver null para que la interfaz muestre un mensaje adecuado
      return null;
    }
  } catch (error) {
    console.error(`Error general obteniendo URL de audio para ${path}:`, error);
    return null;
  }
}; 