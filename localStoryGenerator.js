// Load environment variables from backend
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from backend
const envPath = path.resolve(__dirname, 'generador-cuentos-backend', '.env');
console.log('Loading environment variables from:', envPath);

if (fs.existsSync(envPath)) {
  console.log('.env file found, loading from backend');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
  }
} else {
  console.log('No .env file found, using environment variables from system');
}

const { generateCompletion } = require('./generador-cuentos-backend/utils/openaiService');
const { synthesizeSpeech } = require('./generador-cuentos-backend/utils/googleTtsService');
const fsPromises = require('fs').promises;

// Story generation function using the correct OpenAI service
async function generateStory(prompt) {
    const systemMessage = `Eres un experto escritor de cuentos infantiles. Crea historias apropiadas para niños de 6 a 8 años con vocabulario intermedio en español. Las historias deben ser entretenidas, educativas y con un mensaje positivo.`;
    
    const storyParams = {
        language: 'español',
        topic: 'aventura infantil',
        length: 'medio'
    };
    
    return await generateCompletion(prompt, systemMessage, storyParams);
}

// Audio generation function that creates a file
async function generateAudioFile(text, storyId) {
    try {
        // Generate audio content using Google TTS
        const audioContent = await synthesizeSpeech(text, 'female', 1.0, true);
        
        // Create audio file path
        const audioFileName = `${storyId}.mp3`;
        const audioFilePath = path.join('./generated-stories', audioFileName);
        
        // Create directory if it doesn't exist
        try {
            await fsPromises.mkdir('./generated-stories', { recursive: true });
        } catch (error) {
            // Directory already exists, ignore
        }
        
        // Write audio content to file
        await fsPromises.writeFile(audioFilePath, audioContent);
        
        console.log(`🎵 Audio file created: ${audioFilePath}`);
        return audioFilePath;
    } catch (error) {
        console.error('❌ Error generating audio file:', error);
        throw error;
    }
}

// Story themes optimized for social media
const socialMediaThemes = [
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

// Nombres de protagonistas españoles
const protagonistNames = [
    "Sofia", "Diego", "Valentina", "Mateo", "Isabella", "Santiago", 
    "Camila", "Sebastián", "Martina", "Nicolás", "Lucía", "Alejandro",
    "Emma", "Daniel", "Olivia", "Gabriel", "Mía", "Samuel",
    "Paula", "David", "Valeria", "Andrés", "Zoe", "Lucas"
];

// Character types
const characterTypes = [
    "un niño curioso", "una niña valiente", "un animal parlante",
    "un robot amigable", "una hada traviesa", "un superhéroe en entrenamiento",
    "una exploradora intrépida", "un inventor joven"
];

async function generateAndSaveStory(storyId, theme, protagonist) {
    try {
        console.log(`\n📝 Generando historia: ${storyId}`);
        console.log(`🎭 Tema: ${theme}`);
        console.log(`👤 Protagonista: ${protagonist}`);
        
        // Generate story with specific protagonist name
        const prompt = `Crea una historia corta para niños de 6 a 8 años (máximo 200 palabras) sobre ${theme}.
        El protagonista debe llamarse ${protagonist} y ser ${characterTypes[Math.floor(Math.random() * characterTypes.length)]}.
        La historia debe ser:
        - Entretenida y con un mensaje positivo
        - Perfecta para redes sociales
        - Con diálogos simples y una moraleja clara
        - Fácil de seguir y visualizar
        - Nivel intermedio de vocabulario en español
        
        Formato: Empieza con un título atractivo en la primera línea.`;
        
        const story = await generateStory(prompt);
        
        // Extract title from first line
        const lines = story.content.split('\n').filter(line => line.trim());
        const title = lines[0] || `La aventura de ${protagonist}`;
        const content = lines.slice(1).join('\n').trim();
        
        console.log(`📖 Título: ${title}`);
        
        // Generate audio
        console.log(`🎵 Generando audio...`);
        const audioPath = await generateAudioFile(story.content, storyId);
        
        // Create text file
        const textFileName = `${storyId}.txt`;
        const textFilePath = path.join('./generated-stories', textFileName);
        
        // Create directory if it doesn't exist
        try {
            await fsPromises.mkdir('./generated-stories', { recursive: true });
        } catch (error) {
            // Directory already exists, ignore
        }
        
        await fsPromises.writeFile(textFilePath, story.content, 'utf8');
        
        // Create metadata file
        const metadataFileName = `${storyId}_metadata.json`;
        const metadataFilePath = path.join('./generated-stories', metadataFileName);
        
        const storyData = {
            storyId,
            title,
            protagonist,
            theme,
            age: "6to8",
            language: "español",
            level: "intermedio",
            wordCount: story.content.split(' ').length,
            files: {
                audio: `${storyId}.mp3`,
                text: `${storyId}.txt`,
                metadata: `${storyId}_metadata.json`
            },
            generatedAt: new Date().toISOString(),
            forSocialMedia: true
        };
        
        await fsPromises.writeFile(metadataFilePath, JSON.stringify(storyData, null, 2), 'utf8');
        
        console.log(`✅ Historia ${storyId} completada y guardada localmente`);
        console.log(`📁 Archivos creados:`);
        console.log(`   📝 Texto: ${textFilePath}`);
        console.log(`   🎵 Audio: ${audioPath}`);
        console.log(`   📊 Metadata: ${metadataFilePath}`);
        
        return {
            storyId,
            title,
            protagonist,
            theme,
            wordCount: story.content.split(' ').length,
            files: {
                audio: audioPath,
                text: textFilePath,
                metadata: metadataFilePath
            },
            storyData
        };
        
    } catch (error) {
        console.error(`❌ Error procesando historia ${storyId}:`, error);
        throw error;
    }
}

async function generateBatchStoriesLocal(count = 5) {
    try {
        console.log(`🎬 Generando ${count} historias para redes sociales (LOCAL)...`);
        console.log(`📱 Configuración: Edad 6-8, Nivel intermedio, Idioma español`);
        console.log(`📁 Guardando en: ./generated-stories/\n`);
        
        const results = [];
        const usedNames = new Set();
        
        for (let i = 0; i < count; i++) {
            // Generate unique story ID
            const timestamp = Date.now();
            const storyId = `social_${timestamp}_${i + 1}`;
            
            // Select random theme
            const theme = socialMediaThemes[Math.floor(Math.random() * socialMediaThemes.length)];
            
            // Select unique protagonist name
            let protagonist;
            do {
                protagonist = protagonistNames[Math.floor(Math.random() * protagonistNames.length)];
            } while (usedNames.has(protagonist) && usedNames.size < protagonistNames.length);
            usedNames.add(protagonist);
            
            try {
                const result = await generateAndSaveStory(storyId, theme, protagonist);
                results.push(result);
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 3000));
                
            } catch (error) {
                console.error(`❌ Error con historia ${i + 1}:`, error.message);
                continue;
            }
        }
        
        // Generate summary
        console.log(`\n🎉 ¡Proceso completado!`);
        console.log(`📊 Historias generadas: ${results.length}/${count}`);
        console.log(`📁 Ubicación: ./generated-stories/`);
        console.log(`\n📋 Resumen de historias:`);
        
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.title}`);
            console.log(`   👤 Protagonista: ${result.protagonist}`);
            console.log(`   📝 Palabras: ${result.wordCount}`);
            console.log(`   🆔 ID: ${result.storyId}`);
            console.log(`   🎵 Audio: ${result.files.audio}`);
            console.log(`   📝 Texto: ${result.files.text}\n`);
        });
        
        console.log(`\n📝 Próximos pasos:`);
        console.log(`1. Ve a la carpeta './generated-stories/' para ver todos los archivos`);
        console.log(`2. Usa los archivos MP3 en Canva para crear videos`);
        console.log(`3. Agrega imágenes y publica en Instagram/TikTok`);
        console.log(`4. Opcional: Sube manualmente a Firebase Storage si lo necesitas`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Error en generación batch:', error);
        throw error;
    }
}

// Single story generator for testing
async function generateSingleStoryLocal(customTheme = null, customProtagonist = null) {
    const timestamp = Date.now();
    const storyId = `single_${timestamp}`;
    
    const theme = customTheme || socialMediaThemes[Math.floor(Math.random() * socialMediaThemes.length)];
    const protagonist = customProtagonist || protagonistNames[Math.floor(Math.random() * protagonistNames.length)];
    
    return await generateAndSaveStory(storyId, theme, protagonist);
}

module.exports = {
    generateBatchStoriesLocal,
    generateSingleStoryLocal,
    socialMediaThemes,
    protagonistNames
};

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const count = parseInt(args[0]) || 5;
    
    if (args.includes('--single')) {
        const theme = args.find(arg => arg.startsWith('--theme='))?.split('=')[1];
        const protagonist = args.find(arg => arg.startsWith('--protagonist='))?.split('=')[1];
        
        generateSingleStoryLocal(theme, protagonist)
            .then(result => {
                console.log('\n🎬 Historia individual generada:');
                console.log(`📖 Título: ${result.title}`);
                console.log(`👤 Protagonista: ${result.protagonist}`);
                console.log(`🆔 ID: ${result.storyId}`);
                console.log(`🎵 Audio: ${result.files.audio}`);
                console.log(`📝 Texto: ${result.files.text}`);
            })
            .catch(console.error);
    } else {
        generateBatchStoriesLocal(count)
            .then(results => {
                console.log(`\n🚀 ¡${results.length} historias listas para redes sociales!`);
                console.log(`📁 Revisa la carpeta './generated-stories/' para todos los archivos`);
            })
            .catch(console.error);
    }
} 