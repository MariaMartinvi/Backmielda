// AudioGretel Real Generator - Uses actual AudioGretel services
// Configuración: Duración media, Nivel intermedio, Muy creativo

const path = require('path');
const fs = require('fs').promises;

// Simular el entorno de AudioGretel para usar sus servicios
global.window = {
  location: {
    hostname: 'localhost' // Para usar el servidor local
  }
};

// Configurar axios para Node.js
const axios = require('axios');
global.fetch = require('node-fetch');

// Importar servicios reales de AudioGretel
const { generateStory } = require('./Cuentos_Front_Clean/src/services/storyService.js');
const { generateAudio } = require('./Cuentos_Front_Clean/src/services/audioService.js');

// Configuración de AudioGretel
const audioGretelConfig = {
  duration: 'media',        // Duración media
  level: 'intermedio',      // Nivel intermedio  
  creativity: 'muy creativo', // Muy creativo
  language: 'español',
  ageGroup: '6-8'
};

// Temas optimizados para AudioGretel
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

// Protagonistas españoles
const audioGretelProtagonists = [
    "Sofia", "Diego", "Valentina", "Mateo", "Isabella", "Santiago", 
    "Camila", "Sebastián", "Martina", "Nicolás", "Lucía", "Alejandro",
    "Emma", "Daniel", "Olivia", "Gabriel", "Mía", "Samuel",
    "Paula", "David", "Valeria", "Andrés", "Zoe", "Lucas"
];

// Función para generar historia con servicios reales de AudioGretel
async function generateAudioGretelStory(theme, protagonist) {
    try {
        console.log('🎬 === AUDIOGRETEL REAL STORY GENERATION ===');
        console.log(`🎭 Tema: ${theme}`);
        console.log(`👤 Protagonista: ${protagonist}`);
        console.log(`⚙️ Configuración: ${audioGretelConfig.duration}, ${audioGretelConfig.level}, ${audioGretelConfig.creativity}`);
        
        // Preparar datos para el servicio real de AudioGretel
        const storyData = {
            topic: theme,
            protagonist: protagonist,
            ageGroup: audioGretelConfig.ageGroup,
            language: audioGretelConfig.language,
            length: audioGretelConfig.duration,
            level: audioGretelConfig.level,
            creativityLevel: audioGretelConfig.creativity,
            storyType: 'aventura'
        };
        
        console.log('🤖 Llamando al servicio real de AudioGretel...');
        
        // Usar el servicio real de generación de historias de AudioGretel
        const storyResult = await generateStory(storyData);
        
        console.log('✅ Historia generada con AudioGretel');
        console.log(`📖 Título: ${storyResult.title || 'Sin título'}`);
        console.log(`📝 Contenido: ${storyResult.content ? storyResult.content.substring(0, 100) + '...' : 'Sin contenido'}`);
        
        return storyResult;
        
    } catch (error) {
        console.error('❌ Error generando historia con AudioGretel:', error);
        throw error;
    }
}

// Función para generar audio con servicios reales de AudioGretel
async function generateAudioGretelAudio(text, storyId) {
    try {
        console.log('🎵 === AUDIOGRETEL REAL AUDIO GENERATION ===');
        console.log(`📝 Texto: ${text.substring(0, 100)}...`);
        console.log(`🆔 Story ID: ${storyId}`);
        
        // Configuración de audio de AudioGretel con música de fondo
        const audioOptions = {
            text: text,
            voiceId: 'female', // Voz femenina por defecto
            speechRate: 1.0,   // Velocidad normal
            musicTrack: 'random', // Música de fondo aleatoria (no 'none')
            pauseSettings: {
                enabled: true,
                afterTitle: 1.0,
                afterParagraph: 0.8,
                afterSentence: 0.3,
                afterComma: 0.2
            }
        };
        
        console.log('🎵 Configuración de audio AudioGretel:');
        console.log(`   🎙️ Voz: ${audioOptions.voiceId}`);
        console.log(`   ⏩ Velocidad: ${audioOptions.speechRate}`);
        console.log(`   🎵 Música: ${audioOptions.musicTrack}`);
        console.log(`   ⏸️ Pausas: Habilitadas`);
        
        console.log('🚀 Llamando al servicio real de audio de AudioGretel...');
        
        // Usar el servicio real de generación de audio de AudioGretel
        const audioResult = await generateAudio(audioOptions);
        
        console.log('✅ Audio generado con AudioGretel');
        console.log(`🎵 Audio URL: ${audioResult.audioUrl || 'No URL'}`);
        
        // Crear directorio para guardar archivos
        const outputDir = './audiogretel-real-stories';
        await fs.mkdir(outputDir, { recursive: true });
        
        // Si tenemos una URL de audio, descargarla
        if (audioResult.audioUrl) {
            console.log('📥 Descargando audio generado...');
            
            const audioResponse = await fetch(audioResult.audioUrl);
            const audioBuffer = await audioResponse.buffer();
            
            const audioPath = path.join(outputDir, `${storyId}.mp3`);
            await fs.writeFile(audioPath, audioBuffer);
            
            console.log(`💾 Audio guardado: ${audioPath}`);
            return audioPath;
        }
        
        return audioResult;
        
    } catch (error) {
        console.error('❌ Error generando audio con AudioGretel:', error);
        throw error;
    }
}

// Función principal para generar historia completa con AudioGretel
async function generateCompleteAudioGretelStory(customTheme = null, customProtagonist = null) {
    try {
        const timestamp = Date.now();
        const storyId = `audiogretel_real_${timestamp}`;
        
        // Seleccionar tema y protagonista
        const theme = customTheme || audioGretelThemes[Math.floor(Math.random() * audioGretelThemes.length)];
        const protagonist = customProtagonist || audioGretelProtagonists[Math.floor(Math.random() * audioGretelProtagonists.length)];
        
        console.log('\n🎬 === GENERACIÓN COMPLETA AUDIOGRETEL ===');
        console.log(`🆔 ID: ${storyId}`);
        console.log(`🎭 Tema: ${theme}`);
        console.log(`👤 Protagonista: ${protagonist}`);
        console.log(`⚙️ Configuración: Duración ${audioGretelConfig.duration}, Nivel ${audioGretelConfig.level}, ${audioGretelConfig.creativity}\n`);
        
        // 1. Generar historia con AudioGretel
        console.log('📝 PASO 1: Generando historia...');
        const story = await generateAudioGretelStory(theme, protagonist);
        
        // 2. Generar audio con AudioGretel (con música de fondo)
        console.log('\n🎵 PASO 2: Generando audio con música...');
        const audioPath = await generateAudioGretelAudio(story.content, storyId);
        
        // 3. Guardar archivos de texto
        console.log('\n💾 PASO 3: Guardando archivos...');
        const outputDir = './audiogretel-real-stories';
        
        // Guardar texto
        const textPath = path.join(outputDir, `${storyId}.txt`);
        await fs.writeFile(textPath, story.content, 'utf8');
        
        // Guardar metadata
        const metadata = {
            storyId,
            title: story.title,
            protagonist,
            theme,
            audioGretelConfig,
            generatedAt: new Date().toISOString(),
            wordCount: story.content.split(' ').length,
            audioPath: audioPath,
            textPath: textPath
        };
        
        const metadataPath = path.join(outputDir, `${storyId}.json`);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
        
        console.log('\n🎉 === AUDIOGRETEL GENERACIÓN COMPLETADA ===');
        console.log(`📖 Título: ${story.title}`);
        console.log(`👤 Protagonista: ${protagonist}`);
        console.log(`📝 Palabras: ${metadata.wordCount}`);
        console.log(`🎵 Audio: ${audioPath}`);
        console.log(`📄 Texto: ${textPath}`);
        console.log(`📋 Metadata: ${metadataPath}`);
        console.log(`\n🎵 Audio generado con:`);
        console.log(`   ✅ Música de fondo`);
        console.log(`   ✅ Entonación natural`);
        console.log(`   ✅ Pausas inteligentes`);
        console.log(`   ✅ Servicios reales de AudioGretel`);
        
        return metadata;
        
    } catch (error) {
        console.error('❌ Error en generación completa:', error);
        throw error;
    }
}

// Función para generar múltiples historias
async function generateAudioGretelBatch(count = 3) {
    try {
        console.log(`🎬 === AUDIOGRETEL BATCH GENERATION ===`);
        console.log(`🎵 Generando ${count} historias con servicios reales de AudioGretel`);
        console.log(`⚙️ Configuración: ${audioGretelConfig.duration}, ${audioGretelConfig.level}, ${audioGretelConfig.creativity}\n`);
        
        const results = [];
        const usedNames = new Set();
        
        for (let i = 0; i < count; i++) {
            console.log(`\n--- Historia ${i + 1}/${count} ---`);
            
            // Seleccionar tema aleatorio
            const theme = audioGretelThemes[Math.floor(Math.random() * audioGretelThemes.length)];
            
            // Seleccionar protagonista único
            let protagonist;
            do {
                protagonist = audioGretelProtagonists[Math.floor(Math.random() * audioGretelProtagonists.length)];
            } while (usedNames.has(protagonist) && usedNames.size < audioGretelProtagonists.length);
            usedNames.add(protagonist);
            
            try {
                const result = await generateCompleteAudioGretelStory(theme, protagonist);
                results.push(result);
                
                // Pausa entre generaciones
                if (i < count - 1) {
                    console.log('\n⏳ Esperando 5 segundos antes de la siguiente historia...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                
            } catch (error) {
                console.error(`❌ Error con historia ${i + 1}:`, error.message);
                continue;
            }
        }
        
        // Resumen final
        console.log(`\n🎉 === AUDIOGRETEL BATCH COMPLETADO ===`);
        console.log(`📊 Historias generadas: ${results.length}/${count}`);
        console.log(`🎵 Todas con música de fondo y entonación natural`);
        console.log(`\n📋 Resumen:`);
        
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.title}`);
            console.log(`   👤 ${result.protagonist}`);
            console.log(`   📝 ${result.wordCount} palabras`);
            console.log(`   🎵 ${result.audioPath}`);
        });
        
        console.log(`\n📱 Listo para redes sociales:`);
        console.log(`1. Usa los MP3 en Canva`);
        console.log(`2. Agrega imágenes`);
        console.log(`3. Crea videos para Instagram/TikTok`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Error en batch generation:', error);
        throw error;
    }
}

module.exports = {
    generateCompleteAudioGretelStory,
    generateAudioGretelBatch,
    audioGretelThemes,
    audioGretelProtagonists,
    audioGretelConfig
};

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    console.log('🎵 === AUDIOGRETEL REAL GENERATOR ===');
    console.log('🔥 Usando servicios reales de AudioGretel');
    console.log('🎵 Con música de fondo y entonación natural');
    console.log(`⚙️ Configuración: ${audioGretelConfig.duration}, ${audioGretelConfig.level}, ${audioGretelConfig.creativity}\n`);
    
    if (args.includes('--single')) {
        const theme = args.find(arg => arg.startsWith('--theme='))?.split('=')[1];
        const protagonist = args.find(arg => arg.startsWith('--protagonist='))?.split('=')[1];
        
        generateCompleteAudioGretelStory(theme, protagonist)
            .then(result => {
                console.log('\n🚀 ¡Historia AudioGretel lista para redes sociales!');
            })
            .catch(console.error);
    } else {
        const count = parseInt(args[0]) || 3;
        
        generateAudioGretelBatch(count)
            .then(results => {
                console.log(`\n🚀 ¡${results.length} historias AudioGretel listas!`);
            })
            .catch(console.error);
    }
} 