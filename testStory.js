const { generateSingleStory } = require('./socialMediaBatch');

async function testSingleStory() {
    console.log('🧪 Probando generación de una historia...\n');
    
    try {
        const result = await generateSingleStory(
            "Una aventura mágica en un bosque encantado",
            "Sofia"
        );
        
        console.log('\n✅ ¡Historia generada exitosamente!');
        console.log(`📖 Título: ${result.title}`);
        console.log(`👤 Protagonista: ${result.protagonist}`);
        console.log(`📝 Palabras: ${result.wordCount}`);
        console.log(`🆔 ID: ${result.storyId}`);
        console.log(`🖼️ Agrega imagen: images/${result.storyId}.jpg`);
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Run test if called directly
if (require.main === module) {
    testSingleStory();
}

module.exports = { testSingleStory }; 