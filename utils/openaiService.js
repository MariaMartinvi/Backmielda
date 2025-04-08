// utils/openaiService.js
const axios = require('axios');

exports.generateCompletion = async (prompt, storyParams) => {
  try {
    const maxTokens = getMaxTokens(storyParams.length);
    const temperature = getTemperature(storyParams.creativityLevel);
    
    console.log('storyParams recibidos:', JSON.stringify(storyParams));

    // Usar el idioma si está disponible, o usar español por defecto
    const systemMessage = storyParams.language === 'en' 
      ? 'You are a creative story writer in English. Create original, coherent and captivating stories.'
      : 'Eres un creativo escritor de cuentos en español. Crea historias originales, coherentes y cautivadoras.';
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      top_p: 1,
      frequency_penalty: 0.2,
      presence_penalty: 0.6
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    
    // Enhanced error handling
    if (error.response?.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    } else if (error.response?.status === 401) {
      throw new Error('Authentication error with OpenAI API. Check your API key.');
    } else {
      throw new Error('Failed to generate story with OpenAI: ' + (error.response?.data?.error?.message || error.message));
    }
  }
};

// Helper functions to determine parameters based on user selections
function getMaxTokens(length) {
  // Manejar tanto valores en español como en inglés
  switch (length?.toLowerCase()) {
    case 'short': 
    case 'corto': 
      return 400;
    case 'medium': 
    case 'medio': 
      return 800;
    case 'long': 
    case 'largo': 
      return 1600;
    default: 
      return 800;
  }
}

function getTemperature(creativityLevel) {
  // Manejar tanto valores en español como en inglés
  switch (creativityLevel?.toLowerCase()) {
    case 'conservative':
    case 'conservador': 
      return 0.5;
    case 'innovative':
    case 'innovador': 
      return 0.7;
    case 'imaginative':
    case 'imaginativo': 
      return 0.8;
    case 'visionary':
    case 'visionario': 
      return 0.9;
    case 'inspired':
    case 'inspirado': 
      return 1.0;
    default: 
      return 0.7;
  }
}