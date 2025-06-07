# Instrucciones para Subir Archivos a Firebase Storage y Firestore

Este proyecto incluye un script para subir automáticamente historias, imágenes y archivos de audio a Firebase Storage y crear/actualizar documentos en Firestore.

## Requisitos Previos

1. Node.js instalado en tu sistema
2. Archivo de credenciales de Firebase (`firebase-credentials.json`) en la raíz del proyecto

## Estructura de Directorios

Por defecto, el script busca los archivos en los siguientes directorios:

```
temp/
├── stories/    # Archivos de texto (.txt, .md, .json)
├── images/     # Imágenes (.jpg, .jpeg, .png, .gif, .webp, .svg)
└── audio/      # Archivos de audio (.mp3, .wav, .ogg, .m4a)
```

## Obtener Credenciales de Firebase

Si aún no tienes el archivo de credenciales, sigue estos pasos:

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a Configuración > Cuentas de servicio
4. Haz clic en "Generar nueva clave privada"
5. Guarda el archivo JSON descargado como `firebase-credentials.json` en la raíz del proyecto

## Uso Básico

Para subir todos los archivos de los directorios predeterminados:

```bash
node firebase-upload-assets.js
```

## Uso Avanzado

Puedes especificar directorios personalizados y la colección de Firestore usando argumentos:

```bash
node firebase-upload-assets.js --stories=./mis-historias --images=./mis-imagenes --audio=./mis-audios --collection=storyExamples
```

## Sincronización con Firestore

El script ahora también actualiza la base de datos Firestore:

1. Por cada archivo de historia, crea/actualiza un documento en la colección especificada (por defecto `stories`)
2. El ID del documento se basa en el nombre del archivo (sin extensión)
3. El script busca automáticamente archivos de imagen y audio con el mismo nombre base

Cada documento creado incluye:
- `title`: Título capitalizado (basado en el nombre del archivo)
- `textPath`: Ruta al archivo de texto en Storage
- `imagePath`: Ruta al archivo de imagen en Storage
- `audioPath`: Ruta al archivo de audio en Storage
- `language`: Idioma (por defecto "spanish")
- `level`: Nivel de dificultad (por defecto "beginner")
- `age`: Rango de edad (por defecto "3to5")

## Tipos de Archivos Soportados

- **Historias**: .txt, .md, .json
- **Imágenes**: .jpg, .jpeg, .png, .gif, .webp, .svg
- **Audio**: .mp3, .wav, .ogg, .m4a

## Resultados

Al finalizar la subida, el script generará un archivo JSON con los resultados, incluyendo URLs de descarga para cada archivo subido correctamente.

## Solución de Problemas

### Error: No se encuentra el archivo de credenciales

Asegúrate de tener el archivo `firebase-credentials.json` en la raíz del proyecto.

### Error: Permission denied

Verifica que las credenciales de Firebase tengan permisos para escribir en Storage y Firestore.

### Error: Directorio no encontrado

Verifica que los directorios especificados existan y contengan archivos del tipo adecuado. 

### Error al actualizar Firestore

Verifica que tu cuenta de servicio tenga permisos para escribir en la base de datos Firestore. 