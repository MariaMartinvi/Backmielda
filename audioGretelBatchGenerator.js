// AudioGretel Batch Story Generator
// Uses the actual project functions from generador-cuentos-backend

// Load environment variables from backend
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from the actual backend
const envPath = path.resolve(__dirname, 'generador-cuentos-backend', '.env');
console.log('🔧 Loading AudioGretel environment variables from:', envPath);

if (fs.existsSync(envPath)) {
  console.log('✅ .env file found, loading from AudioGretel backend');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('❌ Error loading .env file:', result.error);
    process.exit(1);
  }
} else {
  console.log('⚠️ No .env file found, using system environment variables');
}

// Import AudioGretel project functions
const { generateCompletion } = require('./generador-cuentos-backend/utils/openaiService');
const { synthesizeSpeech } = require('./generador-cuentos-backend/utils/googleTtsService');
const { constructPrompt } = require('./generador-cuentos-backend/utils/helpers');
const admin = require('firebase-admin');
const fsPromises = require('fs').promises;

// Initialize Firebase Admin with AudioGretel project
if (!admin.apps.length) {
    const serviceAccount = require('./firebase-credentials.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'cuentacuentos-b2e64.firebasestorage.app'  // Corrected bucket URL
    });
    console.log('🔥 Firebase initialized for AudioGretel project: cuentacuentos-b2e64');
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// AudioGretel story generation function using the actual project services
async function generateAudioGretelStory(storyParams) {
    console.log('🎬 Generating story with AudioGretel services...');
    
    // Use AudioGretel's system message logic
    const systemMessage = getAudioGretelSystemMessage(storyParams.language || 'español');
    
    // Use AudioGretel's prompt construction
    const prompt = constructAudioGretelPrompt(storyParams);
    
    console.log('📝 Using AudioGretel prompt construction');
    console.log('🤖 Calling AudioGretel OpenAI service...');
    
    return await generateCompletion(prompt, systemMessage, storyParams);
}

// AudioGretel system message (based on the project's logic)
function getAudioGretelSystemMessage(language) {
    if (language === 'english' || language === 'en') {
        return `You are an expert children's story writer. Create engaging, educational, and age-appropriate stories for children. Focus on positive messages, simple vocabulary, and imaginative scenarios that capture children's attention.`;
    } else {
        return `Eres un experto escritor de cuentos infantiles. Crea historias apropiadas para niños con vocabulario adecuado para su edad. Las historias deben ser entretenidas, educativas y con un mensaje positivo. Enfócate en escenarios imaginativos que capturen la atención de los niños.`;
    }
}

// AudioGretel prompt construction (simplified version of the project's logic)
function constructAudioGretelPrompt(storyParams) {
    const { topic, protagonist, theme, ageGroup, language } = storyParams;
    
    const ageText = ageGroup || '6 a 8 años';
    const maxWords = 200; // Perfect for social media
    
    if (language === 'english' || language === 'en') {
        return `Create a short children's story for ages ${ageText} (maximum ${maxWords} words) about ${topic || theme}.
        ${protagonist ? `The main character should be named ${protagonist}.` : ''}
        The story should be:
        - Entertaining and engaging
        - Perfect for social media
        - With simple dialogues and a clear moral
        - Easy to follow and visualize
        - Age-appropriate vocabulary
        
        Format: Start with an attractive title on the first line.`;
    } else {
        return `Crea una historia corta para niños de ${ageText} (máximo ${maxWords} palabras) sobre ${topic || theme}.
        ${protagonist ? `El protagonista debe llamarse ${protagonist}.` : ''}
        La historia debe ser:
        - Entretenida y con un mensaje positivo
        - Perfecta para redes sociales
        - Con diálogos simples y una moraleja clara
        - Fácil de seguir y visualizar
        - Vocabulario apropiado para la edad
        
        Formato: Empieza con un título atractivo en la primera línea.`;
    }
}

// AudioGretel audio generation function
async function generateAudioGretelAudio(text, storyId, voiceId = 'female') {
    try {
        console.log('🎵 Generating audio with AudioGretel TTS service...');
        
        // Use AudioGretel's TTS service with intelligent pauses
        const audioContent = await synthesizeSpeech(text, voiceId, 1.0, true);
        
        // Create audio file path
        const audioFileName = `${storyId}.mp3`;
        const audioFilePath = path.join('./audiogretel-stories', audioFileName);
        
        // Create directory if it doesn't exist
        try {
            await fsPromises.mkdir('./audiogretel-stories', { recursive: true });
        } catch (error) {
            // Directory already exists, ignore
        }
        
        // Write audio content to file
        await fsPromises.writeFile(audioFilePath, audioContent);
        
        console.log(`🎵 AudioGretel audio file created: ${audioFilePath}`);
        return audioFilePath;
    } catch (error) {
        console.error('❌ Error generating AudioGretel audio:', error);
        throw error;
    }
}

// Upload to AudioGretel Firebase Storage
async function uploadToAudioGretelStorage(localFilePath, storageFilePath) {
    try {
        await bucket.upload(localFilePath, {
            destination: storageFilePath,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });
        
        console.log(`✅ Uploaded to AudioGretel Storage: ${storageFilePath}`);
        return storageFilePath;
    } catch (error) {
        console.error(`❌ Error uploading to AudioGretel Storage ${storageFilePath}:`, error);
        throw error;
    }
}

// Story themes optimized for AudioGretel social media
const audioGretelThemes = [
    "Una aventura mágica en un bosque encantado",
    "Un viaje espacial a planetas desconocidos", 
    "Una búsqueda del tesoro en una isla misteriosa",
    "Una aventura submarina con criaturas fantásticas",
    "Dos amigos que salvan su pueblo",
    "Una amistad entre un niño y un animal mágico",
    "Amigos que descubren un mundo secreto",
    "Un dragón que no sabe volar",
    "Una princesa que prefiere la ciencia a los vestidos",
    "Un mago aprendiz que hace hechizos al revés",
    "Una casa que cobra vida por arte de magia",
    "Superar el miedo a la oscuridad",
    "Aprender a compartir juguetes",
    "La importancia de decir la verdad",
    "Cómo hacer nuevos amigos en el colegio"
];

// AudioGretel protagonist names
const audioGretelProtagonists = [
    "Sofia", "Diego", "Valentina", "Mateo", "Isabella", "Santiago", 
    "Camila", "Sebastián", "Martina", "Nicolás", "Lucía", "Alejandro",
    "Emma", "Daniel", "Olivia", "Gabriel", "Mía", "Samuel",
    "Paula", "David", "Valeria", "Andrés", "Zoe", "Lucas"
];

// Character types for AudioGretel stories
const characterTypes = [
    "un niño curioso", "una niña valiente", "un animal parlante",
    "un robot amigable", "una hada traviesa", "un superhéroe en entrenamiento",
    "una exploradora intrépida", "un inventor joven"
];

// Main function to generate and upload AudioGretel story
async function generateAndUploadAudioGretelStory(storyId, theme, protagonist) {
    try {
        console.log(`\n🎬 === AUDIOGRETEL STORY GENERATION ===`);
        console.log(`📝 Generando historia: ${storyId}`);
        console.log(`🎭 Tema: ${theme}`);
        console.log(`👤 Protagonista: ${protagonist}`);
        
        // Prepare AudioGretel story parameters
        const storyParams = {
            topic: theme,
            protagonist: protagonist,
            ageGroup: "6 a 8 años",
            language: "español",
            length: "medio",
            storyType: "aventura",
            creativityLevel: "innovador"
        };
        
        // Generate story using AudioGretel services
        const story = await generateAudioGretelStory(storyParams);
        
        // Extract title from first line
        const lines = story.content.split('\n').filter(line => line.trim());
        const title = lines[0] || `La aventura de ${protagonist}`;
        
        console.log(`📖 AudioGretel título: ${title}`);
        
        // Generate audio using AudioGretel TTS
        console.log(`🎵 Generando audio con AudioGretel TTS...`);
        const audioPath = await generateAudioGretelAudio(story.content, storyId);
        
        // Create text file
        const textFileName = `${storyId}.txt`;
        const textFilePath = path.join('./audiogretel-stories', textFileName);
        
        await fsPromises.writeFile(textFilePath, story.content, 'utf8');
        
        // Upload files to AudioGretel Firebase Storage
        console.log(`☁️ Subiendo a AudioGretel Firebase Storage...`);
        const audioStoragePath = await uploadToAudioGretelStorage(audioPath, `audio/${storyId}.mp3`);
        const textStoragePath = await uploadToAudioGretelStorage(textFilePath, `stories/${storyId}.txt`);
        
        // Save to AudioGretel Firestore with the exact structure
        const storyData = {
            age: "6to8",
            audioPath: `audio/${storyId}.mp3`,
            imagePath: `images/${storyId}.jpg`, // Placeholder for image
            language: "español",
            level: "intermedio",
            protagonista: protagonist,
            textPath: `stories/${storyId}.txt`,
            title: title
        };
        
        console.log(`💾 Guardando en AudioGretel Firestore...`);
        await db.collection('storyExamples').doc(storyId).set(storyData);
        
        // Clean up local files
        try {
            await fsPromises.unlink(textFilePath);
            await fsPromises.unlink(audioPath);
        } catch (cleanupError) {
            console.warn(`⚠️ Error limpiando archivos locales:`, cleanupError.message);
        }
        
        console.log(`✅ AudioGretel historia ${storyId} completada y subida`);
        
        return {
            storyId,
            title,
            protagonist,
            theme,
            wordCount: story.content.split(' ').length,
            firebaseData: storyData,
            audioGretelProject: true
        };
        
    } catch (error) {
        console.error(`❌ Error procesando AudioGretel historia ${storyId}:`, error);
        throw error;
    }
}

// Batch generation for AudioGretel
async function generateAudioGretelBatch(count = 5) {
    try {
        console.log(`🎬 === AUDIOGRETEL BATCH GENERATION ===`);
        console.log(`🎵 Generando ${count} historias para AudioGretel`);
        console.log(`📱 Configuración: Edad 6-8, Nivel intermedio, Idioma español`);
        console.log(`🔥 Proyecto: cuentacuentos-b2e64 (AudioGretel)\n`);
        
        const results = [];
        const usedNames = new Set();
        
        for (let i = 0; i < count; i++) {
            // Generate unique story ID for AudioGretel
            const timestamp = Date.now();
            const storyId = `audiogretel_${timestamp}_${i + 1}`;
            
            // Select random theme
            const theme = audioGretelThemes[Math.floor(Math.random() * audioGretelThemes.length)];
            
            // Select unique protagonist name
            let protagonist;
            do {
                protagonist = audioGretelProtagonists[Math.floor(Math.random() * audioGretelProtagonists.length)];
            } while (usedNames.has(protagonist) && usedNames.size < audioGretelProtagonists.length);
            usedNames.add(protagonist);
            
            try {
                const result = await generateAndUploadAudioGretelStory(storyId, theme, protagonist);
                results.push(result);
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 3000));
                
            } catch (error) {
                console.error(`❌ Error con AudioGretel historia ${i + 1}:`, error.message);
                continue;
            }
        }
        
        // Generate AudioGretel summary
        console.log(`\n🎉 ¡AudioGretel proceso completado!`);
        console.log(`📊 Historias AudioGretel generadas: ${results.length}/${count}`);
        console.log(`🔥 Proyecto: cuentacuentos-b2e64`);
        console.log(`\n📋 Resumen de historias AudioGretel:`);
        
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.title}`);
            console.log(`   👤 Protagonista: ${result.protagonist}`);
            console.log(`   📝 Palabras: ${result.wordCount}`);
            console.log(`   🆔 ID: ${result.storyId}`);
            console.log(`   🖼️ Imagen pendiente: images/${result.storyId}.jpg\n`);
        });
        
        console.log(`\n📝 Próximos pasos AudioGretel:`);
        console.log(`1. Ve a Firebase Storage (cuentacuentos-b2e64) y verifica los archivos`);
        console.log(`2. Agrega las imágenes en la carpeta 'images/' con los nombres mostrados`);
        console.log(`3. Las historias están listas para AudioGretel y redes sociales`);
        console.log(`4. Usa los MP3 en Canva para crear videos para Instagram/TikTok`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Error en AudioGretel batch generation:', error);
        throw error;
    }
}

// Single AudioGretel story generator
async function generateSingleAudioGretelStory(customTheme = null, customProtagonist = null) {
    const timestamp = Date.now();
    const storyId = `audiogretel_single_${timestamp}`;
    
    const theme = customTheme || audioGretelThemes[Math.floor(Math.random() * audioGretelThemes.length)];
    const protagonist = customProtagonist || audioGretelProtagonists[Math.floor(Math.random() * audioGretelProtagonists.length)];
    
    return await generateAndUploadAudioGretelStory(storyId, theme, protagonist);
}

module.exports = {
    generateAudioGretelBatch,
    generateSingleAudioGretelStory,
    audioGretelThemes,
    audioGretelProtagonists
};

// CLI usage for AudioGretel
if (require.main === module) {
    const args = process.argv.slice(2);
    const count = parseInt(args[0]) || 5;
    
    console.log('🎵 === AUDIOGRETEL STORY GENERATOR ===');
    console.log('🔥 Using AudioGretel project services');
    console.log('📱 Optimized for social media content\n');
    
    if (args.includes('--single')) {
        const theme = args.find(arg => arg.startsWith('--theme='))?.split('=')[1];
        const protagonist = args.find(arg => arg.startsWith('--protagonist='))?.split('=')[1];
        
        generateSingleAudioGretelStory(theme, protagonist)
            .then(result => {
                console.log('\n🎬 AudioGretel historia individual generada:');
                console.log(`📖 Título: ${result.title}`);
                console.log(`👤 Protagonista: ${result.protagonist}`);
                console.log(`🆔 ID: ${result.storyId}`);
                console.log(`🖼️ Agrega imagen: images/${result.storyId}.jpg`);
                console.log(`🔥 Proyecto: cuentacuentos-b2e64 (AudioGretel)`);
            })
            .catch(console.error);
    } else {
        generateAudioGretelBatch(count)
            .then(results => {
                console.log(`\n🚀 ¡${results.length} historias AudioGretel listas!`);
                console.log(`🔥 Subidas a: cuentacuentos-b2e64.appspot.com`);
                console.log(`📱 Perfectas para redes sociales`);
            })
            .catch(console.error);
    }
} 