// controllers/storyController.js
const openaiService = require('../utils/openaiService');
const { constructPrompt, extractTitle } = require('../utils/helpers');
console.log("OpenAI API Key:", process.env.OPENAI_API_KEY ? "Configurada (primeros caracteres: " + process.env.OPENAI_API_KEY.substring(0, 5) + "...)" : "No configurada");

exports.generateStory = async (req, res, next) => {
  try {
    const storyParams = req.body;
    
    // Validate request body
    if (!storyParams.topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    // Generate story text via OpenAI
    const prompt = constructPrompt(storyParams);
    const storyContent = await openaiService.generateCompletion(prompt, storyParams);
    
    // Extract or generate a title
    const title = extractTitle(storyContent, storyParams.topic);
    
    // Return the generated story
    res.status(200).json({
      title,
      content: storyContent,
      parameters: storyParams,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error); // Pass to error handling middleware
  }
};

exports.getStoryById = async (req, res, next) => {
  // Implementation for retrieving saved stories
  // This would require a database connection
  res.status(501).json({ message: 'Not implemented yet' });
};