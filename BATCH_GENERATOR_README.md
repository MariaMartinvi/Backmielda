# 🎬 Generador de Historias para Redes Sociales

Este sistema te permite generar historias automáticamente optimizadas para Instagram y TikTok, con audio incluido y listas para subir a Firebase.

## 🚀 Características

- ✅ Genera historias automáticamente con OpenAI
- 🎵 Crea audio natural con Google TTS
- ☁️ Sube todo a Firebase Storage y Firestore
- 📱 Optimizado para redes sociales (Instagram/TikTok)
- 👤 Nombres de protagonistas españoles
- 🎭 15 temas diferentes predefinidos
- 📊 Configuración automática: Edad 6-8, Nivel intermedio, Español

## 📁 Estructura de Firebase

Las historias se guardan en Firestore con esta estructura:

```
storyExamples/
├── social_1234567890_1/
│   ├── age: "6to8"
│   ├── audioPath: "audio/social_1234567890_1.mp3"
│   ├── imagePath: "images/social_1234567890_1.jpg"
│   ├── language: "español"
│   ├── level: "intermedio"
│   ├── protagonista: "Sofia"
│   ├── textPath: "stories/social_1234567890_1.txt"
│   └── title: "La Aventura Mágica de Sofia"
```

## 🛠️ Uso

### Opción 1: Línea de Comandos (desde la raíz del proyecto)

```bash
# Generar 5 historias (por defecto)
node socialMediaBatch.js

# Generar número específico de historias
node socialMediaBatch.js 10

# Generar una historia individual
node socialMediaBatch.js --single

# Generar historia con tema específico
node socialMediaBatch.js --single --theme="Una aventura espacial" --protagonist="Diego"
```

### Opción 2: Script de Prueba Simple

```bash
# Probar con una historia individual
node testStory.js
```

### Opción 3: API Endpoints (desde el backend)

```bash
# Generar lote de historias
POST /api/batch/generate-batch
{
  "count": 5
}

# Generar historia individual
POST /api/batch/generate-single
{
  "theme": "Una aventura mágica",
  "protagonist": "Sofia"
}

# Ver opciones disponibles
GET /api/batch/options

# Ver estado del generador
GET /api/batch/status
```

## 🎭 Temas Disponibles

1. Una aventura mágica en un bosque encantado
2. Un viaje espacial a planetas desconocidos
3. Una búsqueda del tesoro en una isla misteriosa
4. Una aventura submarina con criaturas fantásticas
5. Dos amigos que salvan su pueblo
6. Una amistad entre un niño y un animal mágico
7. Amigos que descubren un mundo secreto
8. Un dragón que no sabe volar
9. Una princesa que prefiere la ciencia a los vestidos
10. Un mago aprendiz que hace hechizos al revés
11. Una casa que cobra vida por arte de magia
12. Superar el miedo a la oscuridad
13. Aprender a compartir juguetes
14. La importancia de decir la verdad
15. Cómo hacer nuevos amigos en el colegio

## 👤 Protagonistas Disponibles

Sofia, Diego, Valentina, Mateo, Isabella, Santiago, Camila, Sebastián, Martina, Nicolás, Lucía, Alejandro, Emma, Daniel, Olivia, Gabriel, Mía, Samuel, Paula, David, Valeria, Andrés, Zoe, Lucas

## 📝 Proceso Automático

1. **Generación**: Crea historia con OpenAI (máximo 200 palabras)
2. **Audio**: Genera MP3 con Google TTS (entonación natural)
3. **Archivos**: Crea archivo de texto
4. **Upload**: Sube audio y texto a Firebase Storage
5. **Database**: Guarda metadata en Firestore
6. **Cleanup**: Limpia archivos temporales locales

## 🖼️ Agregar Imágenes

Después de generar las historias, agrega las imágenes manualmente:

1. Ve a Firebase Storage
2. Crea/ve a la carpeta `images/`
3. Sube las imágenes con los nombres exactos mostrados en el resumen
4. Ejemplo: `images/social_1234567890_1.jpg`

## ⏱️ Tiempos Estimados

- Historia individual: 30-45 segundos
- Lote de 5 historias: 3-4 minutos
- Lote de 10 historias: 6-8 minutos

## 🔧 Configuración Requerida

Asegúrate de tener configurado:

- ✅ OpenAI API Key
- ✅ Google Cloud TTS credentials
- ✅ Firebase Admin credentials
- ✅ FFmpeg instalado localmente

## 📊 Ejemplo de Salida

```
🎬 Generando 3 historias para redes sociales...
📱 Configuración: Edad 6-8, Nivel intermedio, Idioma español

📝 Generando historia: social_1234567890_1
🎭 Tema: Una aventura mágica en un bosque encantado
👤 Protagonista: Sofia
📖 Título: El Bosque de los Cristales Mágicos
🎵 Generando audio...
☁️ Subiendo archivos a Firebase Storage...
✅ Archivo subido: audio/social_1234567890_1.mp3
✅ Archivo subido: stories/social_1234567890_1.txt
💾 Guardando en Firestore...
✅ Historia social_1234567890_1 completada y subida a Firebase

🎉 ¡Proceso completado!
📊 Historias generadas: 3/3

📋 Resumen de historias:
1. El Bosque de los Cristales Mágicos
   👤 Protagonista: Sofia
   📝 Palabras: 187
   🆔 ID: social_1234567890_1
   🖼️ Imagen pendiente: images/social_1234567890_1.jpg

📝 Próximos pasos:
1. Ve a Firebase Storage y verifica que se subieron los archivos
2. Agrega las imágenes en la carpeta 'images/' con los nombres mostrados arriba
3. Las historias ya están listas para usar en tu app y redes sociales
```

## 🎯 Flujo para Redes Sociales

1. **Ejecuta el generador** → Obtienes historias con audio
2. **Agrega imágenes** → Sube a Firebase Storage
3. **Usa en Canva** → Combina imagen + audio para video
4. **Publica** → Instagram, TikTok, etc.

## 🚨 Notas Importantes

- Máximo 20 historias por lote (evitar timeouts)
- Los archivos temporales se limpian automáticamente
- Las historias tienen títulos con entonación descendente natural
- Pausa de 1 segundo después de cada título
- Vocabulario nivel intermedio para niños 6-8 años

## 📁 Archivos en el Proyecto

```
nombre-del-proyecto/
├── socialMediaBatch.js          # Script principal
├── testStory.js                 # Script de prueba simple
├── BATCH_GENERATOR_README.md    # Esta documentación
├── temp/                        # Carpeta temporal (se crea automáticamente)
└── generador-cuentos-backend/   # Backend con utilidades
    ├── utils/
    │   ├── openaiService.js
    │   └── googleTtsService.js
    └── firebase-credentials-key.json
```

## 🔍 Troubleshooting

Si hay errores:
1. Verifica que todas las APIs estén configuradas
2. Revisa que Firebase tenga permisos de escritura
3. Asegúrate de que FFmpeg esté funcionando
4. Verifica conexión a internet para APIs externas
5. Asegúrate de estar en la raíz del proyecto al ejecutar los scripts 