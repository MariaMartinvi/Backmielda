const { generateBatchStoriesForSocialMedia, generateSingleStory } = require('./socialMediaBatch');

async function testBatchGeneration() {
    console.log('🧪 Probando generación de historias para redes sociales...\n');
    
    try {
        // Test single story generation first
        console.log('📝 Generando una historia de prueba...');
        const singleStory = await generateSingleStory(
            "Una aventura mágica en un bosque encantado",
            "Sofia"
        );
        
        console.log('✅ Historia individual generada:');
        console.log(`   Título: ${singleStory.title}`);
        console.log(`   Protagonista: ${singleStory.protagonist}`);
        console.log(`   ID: ${singleStory.storyId}\n`);
        
        // Test batch generation
        console.log('🎬 Generando lote de 3 historias...');
        const batchResults = await generateBatchStoriesForSocialMedia(3);
        
        console.log('\n🎉 ¡Prueba completada exitosamente!');
        console.log(`Total de historias generadas: ${batchResults.length + 1}`);
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Run test if called directly
if (require.main === module) {
    testBatchGeneration();
}

module.exports = { testBatchGeneration }; 