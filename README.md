# 🎬 Automated Video Creator for Social Media

Un script en Python que combina automáticamente imágenes y archivos de audio para crear videos optimizados para TikTok e Instagram.

## ✨ Características

- **Automatización completa**: Combina imágenes y audio automáticamente
- **Optimización para plataformas**: Configuraciones específicas para TikTok (9:16) e Instagram Reels
- **Programación automática**: Crea videos en horarios específicos
- **Evita repeticiones**: Registra combinaciones usadas para evitar duplicados
- **Mejoras de imagen**: Aplica filtros de brillo y contraste automáticamente
- **Redimensionado inteligente**: Adapta imágenes al formato vertical de redes sociales

## 📋 Requisitos

- Python 3.7+
- FFmpeg (se instala automáticamente con moviepy)

## 🚀 Instalación

1. Clona o descarga este repositorio
2. Instala las dependencias:
```bash
pip install -r requirements.txt
```

## 📁 Estructura de carpetas

```
proyecto/
├── video_creator.py      # Script principal
├── requirements.txt      # Dependencias
├── temp/
│   ├── images/          # Coloca aquí tus imágenes (JPG, PNG, etc.)
│   └── audio/           # Coloca aquí tus archivos de audio (MP3, WAV, etc.)
└── output_videos/       # Videos generados se guardan aquí
```

## 🎯 Uso

### Crear videos inmediatamente

```bash
python video_creator.py --create-now
```

### Programar creación automática

```bash
# Horarios por defecto (9:00 AM y 6:00 PM)
python video_creator.py

# Horarios personalizados
python video_creator.py --times 08:00 12:00 20:00
```

### Opciones personalizadas

```bash
python video_creator.py \
  --images "mis_imagenes" \
  --audio "mis_audios" \
  --output "videos_finales" \
  --times 10:00 15:00 \
  --create-now
```

## ⚙️ Configuración

### Formatos soportados

**Imágenes**: JPG, JPEG, PNG, BMP, TIFF
**Audio**: MP3, WAV, M4A, AAC

### Especificaciones de video

- **TikTok**: 1080x1920 (9:16), máx. 3 minutos, 30 FPS
- **Instagram Reels**: 1080x1920 (9:16), máx. 90 segundos, 30 FPS

## 📖 Cómo funciona

1. **Selección aleatoria**: Elige una combinación única de imagen + audio
2. **Procesamiento de imagen**: Mejora brillo/contraste y redimensiona
3. **Creación de video**: Combina imagen y audio con la duración del audio
4. **Exportación**: Genera videos para ambas plataformas
5. **Registro**: Guarda la combinación usada para evitar repetir

## 🔧 Personalización

Puedes modificar las configuraciones en el archivo `video_creator.py`:

```python
self.platforms = {
    'tiktok': {
        'resolution': (1080, 1920),  # Resolución
        'max_duration': 180,         # Duración máxima en segundos
        'fps': 30                    # Frames por segundo
    }
}
```

## 📝 Notas importantes

- Asegúrate de tener imágenes en `temp/images/` y audios en `temp/audio/`
- Los videos se guardan con nombres descriptivos que incluyen timestamp
- El script evita automáticamente usar la misma combinación imagen+audio
- Para detener el programador automático, usa `Ctrl+C`

## 🆘 Solución de problemas

### Error: "No module named 'moviepy'"
```bash
pip install moviepy==1.0.3
```

### Error de FFmpeg
MoviePy descarga FFmpeg automáticamente en la primera ejecución.

### Carpetas vacías
Verifica que tengas archivos en las carpetas `temp/images/` y `temp/audio/`.

## 📱 Ejemplos de nombres de salida

```
tiktok_paisaje_musica_relajante_20250206_143022.mp4
instagram_retrato_beat_energico_20250206_143045.mp4
```

¡Listo para crear contenido automáticamente! 🎉 