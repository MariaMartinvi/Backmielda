const express = require('express');
const router = express.Router();
const { generateBatchStoriesForSocialMedia, generateSingleStory, socialMediaThemes, protagonistNames } = require('../scripts/socialMediaBatch');

// Generate batch stories for social media
router.post('/generate-batch', async (req, res) => {
    try {
        const { count = 5 } = req.body;
        
        if (count > 20) {
            return res.status(400).json({
                error: 'Maximum 20 stories per batch to avoid timeouts'
            });
        }
        
        console.log(`🎬 API: Generando ${count} historias para redes sociales...`);
        
        const results = await generateBatchStoriesForSocialMedia(count);
        
        res.json({
            success: true,
            message: `${results.length} historias generadas exitosamente`,
            count: results.length,
            stories: results.map(story => ({
                storyId: story.storyId,
                title: story.title,
                protagonist: story.protagonist,
                theme: story.theme,
                wordCount: story.wordCount,
                imagePlaceholder: `images/${story.storyId}.jpg`
            }))
        });
        
    } catch (error) {
        console.error('❌ Error en batch generation API:', error);
        res.status(500).json({
            error: 'Error generating batch stories',
            details: error.message
        });
    }
});

// Generate single story
router.post('/generate-single', async (req, res) => {
    try {
        const { theme, protagonist } = req.body;
        
        console.log(`📝 API: Generando historia individual...`);
        
        const result = await generateSingleStory(theme, protagonist);
        
        res.json({
            success: true,
            message: 'Historia generada exitosamente',
            story: {
                storyId: result.storyId,
                title: result.title,
                protagonist: result.protagonist,
                theme: result.theme,
                wordCount: result.wordCount,
                imagePlaceholder: `images/${result.storyId}.jpg`
            }
        });
        
    } catch (error) {
        console.error('❌ Error en single story generation API:', error);
        res.status(500).json({
            error: 'Error generating story',
            details: error.message
        });
    }
});

// Get available themes and protagonists
router.get('/options', (req, res) => {
    res.json({
        themes: socialMediaThemes,
        protagonists: protagonistNames,
        defaultConfig: {
            age: "6to8",
            language: "español",
            level: "intermedio"
        }
    });
});

// Get generation status (for long-running batch operations)
router.get('/status', (req, res) => {
    res.json({
        status: 'ready',
        message: 'Batch generator ready to process stories',
        maxBatchSize: 20,
        estimatedTimePerStory: '30-45 seconds'
    });
});

module.exports = router; 