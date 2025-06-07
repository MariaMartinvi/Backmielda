const { generateStory } = require('../utils/openaiService');
const { generateAudio } = require('../utils/googleTtsService');
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    const serviceAccount = require('../firebase-credentials-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'generador-cuentos-b7c7b.appspot.com'
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

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

async function uploadFileToStorage(localFilePath, storageFilePath) {
    try {
        await bucket.upload(localFilePath, {
            destination: storageFilePath,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });
        
        console.log(`✅ Archivo subido: ${storageFilePath}`);
        return storageFilePath;
    } catch (error) {
        console.error(`❌ Error subiendo archivo ${storageFilePath}:`, error);
        throw error;
    }
}

async function generateAndUploadStory(storyId, theme, protagonist) {
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
        const audioPath = await generateAudio(story.content, storyId);
        
        // Create text file
        const textFileName = `${storyId}.txt`;
        const textFilePath = path.join('./temp', textFileName);
        await fs.writeFile(textFilePath, story.content, 'utf8');
        
        // Upload files to Firebase Storage
        console.log(`☁️ Subiendo archivos a Firebase Storage...`);
        const audioStoragePath = await uploadFileToStorage(audioPath, `audio/${storyId}.mp3`);
        const textStoragePath = await uploadFileToStorage(textFilePath, `stories/${storyId}.txt`);
        
        // Save to Firestore with exact structure
        const storyData = {
            age: "6to8",
            audioPath: `audio/${storyId}.mp3`,
            imagePath: `images/${storyId}.jpg`, // Placeholder for image you'll add later
            language: "español",
            level: "intermedio",
            protagonista: protagonist,
            textPath: `stories/${storyId}.txt`,
            title: title
        };
        
        console.log(`💾 Guardando en Firestore...`);
        await db.collection('storyExamples').doc(storyId).set(storyData);
        
        // Clean up local files
        try {
            await fs.unlink(textFilePath);
            await fs.unlink(audioPath);
        } catch (cleanupError) {
            console.warn(`⚠️ Error limpiando archivos locales:`, cleanupError.message);
        }
        
        console.log(`✅ Historia ${storyId} completada y subida a Firebase`);
        
        return {
            storyId,
            title,
            protagonist,
            theme,
            wordCount: story.content.split(' ').length,
            firebaseData: storyData
        };
        
    } catch (error) {
        console.error(`❌ Error procesando historia ${storyId}:`, error);
        throw error;
    }
}

async function generateBatchStoriesForSocialMedia(count = 5) {
    try {
        console.log(`🎬 Generando ${count} historias para redes sociales...`);
        console.log(`📱 Configuración: Edad 6-8, Nivel intermedio, Idioma español\n`);
        
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
                const result = await generateAndUploadStory(storyId, theme, protagonist);
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
        console.log(`\n📋 Resumen de historias:`);
        
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.title}`);
            console.log(`   👤 Protagonista: ${result.protagonist}`);
            console.log(`   📝 Palabras: ${result.wordCount}`);
            console.log(`   🆔 ID: ${result.storyId}`);
            console.log(`   🖼️ Imagen pendiente: images/${result.storyId}.jpg\n`);
        });
        
        console.log(`\n📝 Próximos pasos:`);
        console.log(`1. Ve a Firebase Storage y verifica que se subieron los archivos`);
        console.log(`2. Agrega las imágenes en la carpeta 'images/' con los nombres mostrados arriba`);
        console.log(`3. Las historias ya están listas para usar en tu app y redes sociales`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Error en generación batch:', error);
        throw error;
    }
}

// Single story generator for testing
async function generateSingleStory(customTheme = null, customProtagonist = null) {
    const timestamp = Date.now();
    const storyId = `single_${timestamp}`;
    
    const theme = customTheme || socialMediaThemes[Math.floor(Math.random() * socialMediaThemes.length)];
    const protagonist = customProtagonist || protagonistNames[Math.floor(Math.random() * protagonistNames.length)];
    
    return await generateAndUploadStory(storyId, theme, protagonist);
}

module.exports = {
    generateBatchStoriesForSocialMedia,
    generateSingleStory,
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
        
        generateSingleStory(theme, protagonist)
            .then(result => {
                console.log('\n🎬 Historia individual generada:');
                console.log(`📖 Título: ${result.title}`);
                console.log(`👤 Protagonista: ${result.protagonist}`);
                console.log(`🆔 ID: ${result.storyId}`);
                console.log(`🖼️ Agrega imagen: images/${result.storyId}.jpg`);
            })
            .catch(console.error);
    } else {
        generateBatchStoriesForSocialMedia(count)
            .then(results => {
                console.log(`\n🚀 ¡${results.length} historias listas para redes sociales!`);
            })
            .catch(console.error);
    }
} 