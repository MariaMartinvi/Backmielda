// utils/helpers.js
exports.constructPrompt = (params) => {
    const { topic, length, storyType, creativityLevel, ageGroup } = params;
    
    let lengthDescription;
    switch (length) {
      case 'corto': lengthDescription = 'corta (aproximadamente 250 palabras)'; break;
      case 'medio': lengthDescription = 'de longitud media (aproximadamente 500 palabras)'; break;
      case 'largo': lengthDescription = 'larga (aproximadamente 1000 palabras)'; break;
      default: lengthDescription = 'de longitud media'; break;
    }
    
    let ageDescription;
    switch (ageGroup) {
      case '3-6': ageDescription = 'niños de 3 a 6 años'; break;
      case '7-13': ageDescription = 'niños de 7 a 13 años'; break;
      case '13-20': ageDescription = 'adolescentes de 13 a 20 años'; break;
      case '21-35': ageDescription = 'adultos jóvenes'; break;
      case '35+': ageDescription = 'adultos'; break;
      default: ageDescription = 'todo público'; break;
    }
    
    return `Escribe una historia ${lengthDescription} de género ${storyType} sobre "${topic}". 
  La historia debe ser apropiada para ${ageDescription}.
  Usa un estilo narrativo atractivo, con personajes interesantes y un desarrollo coherente de la trama.
  Incluye diálogos y descripciones donde sea apropiado.
  La historia debe tener un inicio, desarrollo y conclusión claros.`;
  };
  
  exports.extractTitle = (content, fallbackTopic) => {
    // Try to extract title from the first line if it looks like a title
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    
    // If first line is short enough and doesn't end with punctuation, use as title
    if (firstLine.length < 60 && !firstLine.match(/[.,:;?!]$/)) {
      return firstLine;
    }
    
    // Otherwise generate a title based on the topic
    return `Historia de ${fallbackTopic}`;
  };