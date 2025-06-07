const { generateStory } = require('../utils/openaiService');
const { generateAudio } = require('../utils/googleTtsService');
const fs = require('fs').promises;
const path = require('path');

// Story themes optimized for social media
const socialMediaThemes = [
    // Adventure themes
    "Una aventura mágica en un bosque encantado",
    "Un viaje espacial a planetas desconocidos",
    "Una búsqueda del tesoro en una isla misteriosa",
    "Una aventura submarina con criaturas fantásticas",
    
    // Friendship themes
    "Dos amigos que salvan su pueblo",
    "Una amistad entre un niño y un animal mágico",
    "Amigos que descubren un mundo secreto",
    "Una aventura de camping que sale mal pero termina bien",
    
    // Fantasy themes
    "Un dragón que no sabe volar",
    "Una princesa que prefiere la ciencia a los vestidos",
    "Un mago aprendiz que hace hechizos al revés",
    "Una casa que cobra vida por arte de magia",
    
    // Educational themes
    "Cómo los animales se preparan para el invierno",
    "Un viaje por el sistema solar",
    "La historia de una gota de agua",
    "Cómo crecen las plantas desde semillas",
    
    // Emotional themes
    "Superar el miedo a la oscuridad",
    "Aprender a compartir juguetes",
    "La importancia de decir la verdad",
    "Cómo hacer nuevos amigos en el colegio"
];

const characterTypes = [
    "un niño curioso",
    "una niña valiente",
    "un animal parlante",
    "un robot amigable",
    "una hada traviesa",
    "un superhéroe en entrenamiento",
    "una exploradora intrépida",
    "un inventor joven"
];

async function generateBatchStories(count = 5, outputDir = './generated-stories') {
    try {
        // Create output directory
        await fs.mkdir(outputDir, { recursive: true });
        
        console.log(`🎬 Generando ${count} historias para redes sociales...`);
        
        const results = [];
        
        for (let i = 0; i < count; i++) {
            console.log(`\n📝 Generando historia ${i + 1}/${count}...`);
            
            // Random theme and character
            const theme = socialMediaThemes[Math.floor(Math.random() * socialMediaThemes.length)];
            const character = characterTypes[Math.floor(Math.random() * characterTypes.length)];
            
            const prompt = `Crea una historia corta para niños (máximo 200 palabras) sobre ${theme} con ${character} como protagonista. 
            La historia debe ser perfecta para redes sociales: entretenida, con un mensaje positivo, y fácil de seguir.
            Incluye diálogos simples y una moraleja clara.`;
            
            try {
                // Generate story
                const story = await generateStory(prompt);
                
                // Generate audio
                console.log(`🎵 Generando audio para historia ${i + 1}...`);
                const audioPath = await generateAudio(story.content, `story_${Date.now()}_${i + 1}`);
                
                // Save story text
                const storyFileName = `story_${Date.now()}_${i + 1}.txt`;
                const storyPath = path.join(outputDir, storyFileName);
                await fs.writeFile(storyPath, story.content, 'utf8');
                
                const result = {
                    id: i + 1,
                    theme,
                    character,
                    storyPath,
                    audioPath,
                    wordCount: story.content.split(' ').length,
                    title: story.content.split('\n')[0] || `Historia ${i + 1}`
                };
                
                results.push(result);
                console.log(`✅ Historia ${i + 1} completada: ${result.title.substring(0, 50)}...`);
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`❌ Error generando historia ${i + 1}:`, error.message);
                continue;
            }
        }
        
        // Generate summary report
        const report = {
            timestamp: new Date().toISOString(),
            totalStories: results.length,
            stories: results,
            themes: [...new Set(results.map(r => r.theme))],
            characters: [...new Set(results.map(r => r.character))]
        };
        
        const reportPath = path.join(outputDir, 'batch_report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n🎉 ¡Listo! Se generaron ${results.length} historias`);
        console.log(`📁 Archivos guardados en: ${outputDir}`);
        console.log(`📊 Reporte guardado en: ${reportPath}`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Error en generación batch:', error);
        throw error;
    }
}

// Social media optimized story generator
async function generateSocialMediaStory(platform = 'instagram', duration = 'short') {
    const platformSpecs = {
        instagram: {
            short: { maxWords: 150, style: "visual y dinámico" },
            medium: { maxWords: 200, style: "emotivo y engaging" }
        },
        tiktok: {
            short: { maxWords: 100, style: "rápido y divertido" },
            medium: { maxWords: 150, style: "viral y entretenido" }
        }
    };
    
    const spec = platformSpecs[platform][duration];
    const theme = socialMediaThemes[Math.floor(Math.random() * socialMediaThemes.length)];
    const character = characterTypes[Math.floor(Math.random() * characterTypes.length)];
    
    const prompt = `Crea una historia para ${platform} (máximo ${spec.maxWords} palabras) sobre ${theme} con ${character}.
    Estilo: ${spec.style}
    - Debe ser perfecta para ${platform}
    - Incluye momentos visuales descriptivos para Canva
    - Ritmo dinámico y engaging
    - Final impactante o emotivo
    - Fácil de seguir en video`;
    
    try {
        const story = await generateStory(prompt);
        const audioPath = await generateAudio(story.content, `${platform}_${Date.now()}`);
        
        return {
            platform,
            duration,
            theme,
            character,
            content: story.content,
            audioPath,
            wordCount: story.content.split(' ').length,
            visualCues: extractVisualCues(story.content)
        };
        
    } catch (error) {
        console.error(`Error generando historia para ${platform}:`, error);
        throw error;
    }
}

function extractVisualCues(story) {
    // Extract visual elements that can help with Canva design
    const visualWords = [
        'bosque', 'castillo', 'mar', 'montaña', 'ciudad', 'casa', 'jardín',
        'sol', 'luna', 'estrellas', 'arcoíris', 'nubes',
        'dragón', 'unicornio', 'hada', 'robot', 'nave espacial',
        'tesoro', 'mapa', 'corona', 'varita mágica'
    ];
    
    const foundVisuals = visualWords.filter(word => 
        story.toLowerCase().includes(word)
    );
    
    return foundVisuals;
}

module.exports = {
    generateBatchStories,
    generateSocialMediaStory,
    socialMediaThemes,
    characterTypes
};

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const count = parseInt(args[0]) || 5;
    const platform = args[1] || 'instagram';
    
    if (args.includes('--single')) {
        generateSocialMediaStory(platform, 'short')
            .then(result => {
                console.log('\n🎬 Historia generada para', platform);
                console.log('📝 Tema:', result.theme);
                console.log('👤 Personaje:', result.character);
                console.log('🎵 Audio:', result.audioPath);
                console.log('🎨 Elementos visuales:', result.visualCues.join(', '));
            })
            .catch(console.error);
    } else {
        generateBatchStories(count)
            .then(results => {
                console.log('\n📊 Resumen:');
                results.forEach(r => {
                    console.log(`- ${r.title.substring(0, 40)}... (${r.wordCount} palabras)`);
                });
            })
            .catch(console.error);
    }
} 