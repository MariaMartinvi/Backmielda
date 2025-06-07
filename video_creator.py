#!/usr/bin/env python3
"""
Automated Video Creator for TikTok/Instagram
Combines images and MP3 files to create videos optimized for social media
"""

import os
import random
import json
from datetime import datetime, timedelta
from pathlib import Path
import schedule
import time
from moviepy.editor import ImageClip, AudioFileClip, CompositeVideoClip
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageFont
import argparse

class VideoCreator:
    def __init__(self, images_folder, audio_folder, output_folder="output_videos", lightweight_mode=False):
        self.images_folder = Path(images_folder)
        self.audio_folder = Path(audio_folder)
        self.output_folder = Path(output_folder)
        self.output_folder.mkdir(exist_ok=True)
        self.lightweight_mode = lightweight_mode
        
        # Social media specifications for Stories
        if lightweight_mode:
            # Reduced resolution for smaller files
            self.platforms = {
                'tiktok_story': {
                    'resolution': (720, 1280),  # Lower resolution (720p instead of 1080p)
                    'fps': 25  # Lower FPS for smaller files
                },
                'instagram_story': {
                    'resolution': (720, 1280),  # Lower resolution for smaller files
                    'fps': 25  # Lower FPS
                }
            }
        else:
            # Standard high quality
            self.platforms = {
                'tiktok_story': {
                    'resolution': (1080, 1920),  # 9:16 aspect ratio for Stories
                    'fps': 30
                },
                'instagram_story': {
                    'resolution': (1080, 1920),  # 9:16 for Instagram Stories
                    'fps': 30
                }
            }
        
        # Fixed hashtags for all posts (always the same)
        self.fixed_hashtags = [
            '#audiogretel', '#audiocuentos', '#personalizados', '#aprendeidiomas', 
            '#aprendeespañol', '#aprendeinglés', '#niños', '#audiolibro', '#relatos', 
            '#cuentos', '#historias', '#podcast', '#audio', '#narración', '#literatura', '#entretenimiento'
        ]
        
        # Track used combinations
        self.usage_file = self.output_folder / "used_combinations.json"
        self.used_combinations = self.load_used_combinations()
    
    def load_used_combinations(self):
        """Load previously used image/audio combinations"""
        if self.usage_file.exists():
            with open(self.usage_file, 'r') as f:
                return set(json.load(f))
        return set()
    
    def save_used_combinations(self):
        """Save used combinations to prevent repeats"""
        with open(self.usage_file, 'w') as f:
            json.dump(list(self.used_combinations), f)
    
    def get_available_files(self):
        """Get lists of available image and audio files"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
        audio_extensions = {'.mp3', '.wav', '.m4a', '.aac'}
        
        images = [f for f in self.images_folder.iterdir() 
                 if f.suffix.lower() in image_extensions]
        audios = [f for f in self.audio_folder.iterdir() 
                 if f.suffix.lower() in audio_extensions]
        
        return images, audios
    
    def get_all_matching_combinations(self, images, audios):
        """Get ALL image/audio combinations that have matching filenames"""
        matching_combinations = []
        
        for img in images:
            img_name = img.stem  # nombre sin extensión
            for audio in audios:
                audio_name = audio.stem  # nombre sin extensión
                if img_name == audio_name:  # Si tienen el mismo nombre
                    combo = f"{img.name}+{audio.name}"
                    if combo not in self.used_combinations:
                        matching_combinations.append((img, audio, combo))
        
        if not matching_combinations:
            print("⚠️  No matching file pairs found or all pairs already used!")
            print("💡 Make sure image and audio files have the same name:")
            print("   Example: paisaje.jpg + paisaje.mp3")
            return []
        
        return matching_combinations  # Return ALL available matches
    
    def prepare_image(self, image_path, target_resolution, duration):
        """Prepare image with effects, text overlay and proper sizing for social media"""
        # Open and enhance image
        img = Image.open(image_path)
        
        # Apply subtle enhancements
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.1)  # Slightly brighter
        
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.05)  # Slightly more contrast
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Calculate scaling to FILL the entire screen (crop if necessary)
        target_width, target_height = target_resolution
        img_width, img_height = img.size
        
        # Scale to fill while maintaining aspect ratio (may crop)
        scale_w = target_width / img_width
        scale_h = target_height / img_height
        scale = max(scale_w, scale_h)  # Use max instead of min to fill completely
        
        new_width = int(img_width * scale)
        new_height = int(img_height * scale)
        
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Center and crop the image to fit exactly
        if new_width > target_width:
            # Crop horizontally
            left = (new_width - target_width) // 2
            img = img.crop((left, 0, left + target_width, new_height))
        
        if new_height > target_height:
            # Crop vertically  
            top = (new_height - target_height) // 2
            img = img.crop((0, top, new_width, top + target_height))
        
        # If image is smaller than target (shouldn't happen with max scale), center it
        if img.size != target_resolution:
            background = Image.new('RGB', target_resolution, (0, 0, 0))
            x_offset = (target_width - img.size[0]) // 2
            y_offset = (target_height - img.size[1]) // 2
            background.paste(img, (x_offset, y_offset))
            img = background
        
        # Add text overlay ON TOP of the image
        img = self.add_text_overlay(img, target_resolution)
        
        # Save temporary image
        temp_path = self.output_folder / f"temp_image_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        img.save(temp_path, quality=90)
        
        # Create video clip from image
        clip = ImageClip(str(temp_path), duration=duration)
        
        # Clean up temp file
        temp_path.unlink()
        
        return clip
    
    def add_text_overlay(self, image, target_resolution):
        """Add 'www.audiogretel.com' text overlay with AudioGretel colors and transparent background"""
        # Create a copy to work with
        img_with_text = image.copy()
        draw = ImageDraw.Draw(img_with_text)
        
        # Text to add
        text = "www.audiogretel.com"
        target_width, target_height = target_resolution
        
        # Try to load a font, fallback to default if not available
        try:
            # Larger font size for better visibility
            font_size = max(50, target_width // 20)  # Más grande que antes
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font_size = max(45, target_width // 22)
                font = ImageFont.load_default()
            except:
                font = ImageFont.load_default()
        
        # Get text dimensions
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Position text at the CENTER of the image
        x = (target_width - text_width) // 2
        y = (target_height - text_height) // 2  # Centrado verticalmente
        
        # AudioGretel brand colors (purple/blue gradient effect)
        purple_color = (138, 43, 226)    # Purple
        blue_color = (65, 105, 225)      # Royal Blue
        
        # Draw multiple shadow layers for depth and visibility
        shadow_layers = [
            (4, (0, 0, 0)),      # Black shadow (strongest)
            (3, (40, 40, 40)),   # Dark gray
            (2, (80, 80, 80)),   # Medium gray
        ]
        
        # Draw shadows
        for offset, color in shadow_layers:
            draw.text((x + offset, y + offset), text, font=font, fill=color)
        
        # Create gradient effect by drawing the text multiple times with slight offsets
        # Main text in AudioGretel purple
        draw.text((x, y), text, font=font, fill=purple_color)
        
        # Add a subtle blue highlight/outline effect
        # Draw slightly offset in blue for gradient effect
        draw.text((x - 1, y - 1), text, font=font, fill=blue_color)
        
        # Final layer: bright purple/magenta for the main text
        bright_purple = (147, 112, 219)  # Medium slate blue
        draw.text((x, y), text, font=font, fill=bright_purple)
        
        return img_with_text
    
    def create_video(self, image_path, audio_path, platform='tiktok_story'):
        """Create a video combining image and audio for specified platform (Stories format)"""
        platform_config = self.platforms[platform]
        
        # Load audio and use its complete duration
        audio_clip = AudioFileClip(str(audio_path))
        audio_duration = audio_clip.duration  # Use full audio duration
        
        print(f"  🎵 Audio duration: {audio_duration:.1f} seconds")
        
        # Prepare image clip with the full audio duration
        image_clip = self.prepare_image(
            image_path, 
            platform_config['resolution'], 
            audio_duration
        )
        
        # Create final video with full audio
        final_clip = image_clip.set_audio(audio_clip)
        
        # Generate output filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        img_name = image_path.stem
        audio_name = audio_path.stem
        
        # Clean platform name for filename
        platform_name = platform.replace('_story', '_story')
        output_filename = f"{platform_name}_{img_name}_{audio_name}_{timestamp}.mp4"
        output_path = self.output_folder / output_filename
        
        # Export video optimized for Stories with smaller file size
        if self.lightweight_mode:
            # Extra compression for very small files
            final_clip.write_videofile(
                str(output_path),
                fps=platform_config['fps'],
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-audio.m4a',
                remove_temp=True,
                verbose=False,
                logger=None,
                preset='fast',
                bitrate='1500k',      # Very low bitrate for tiny files
                audio_bitrate='96k',  # Lower audio quality
                ffmpeg_params=[
                    '-crf', '32',     # Higher compression
                    '-movflags', '+faststart',
                    '-pix_fmt', 'yuv420p'
                ]
            )
        else:
            # Standard compression (good balance)
            final_clip.write_videofile(
                str(output_path),
                fps=platform_config['fps'],
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-audio.m4a',
                remove_temp=True,
                verbose=False,
                logger=None,
                preset='fast',
                bitrate='3000k',      # Moderate bitrate
                audio_bitrate='128k',
                ffmpeg_params=[
                    '-crf', '28',
                    '-movflags', '+faststart',
                    '-pix_fmt', 'yuv420p'
                ]
            )
        
        # Clean up
        image_clip.close()
        audio_clip.close()
        final_clip.close()
        
        return output_path
    
    def create_daily_videos(self):
        """Create videos for all matching file pairs"""
        print(f"\n🎬 Creating videos at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        images, audios = self.get_available_files()
        
        if not images:
            print("❌ No images found in the images folder!")
            return
        
        if not audios:
            print("❌ No audio files found in the audio folder!")
            return
        
        try:
            # Get ALL matching combinations
            matching_pairs = self.get_all_matching_combinations(images, audios)
            
            if not matching_pairs:
                print("❌ No matching file pairs available!")
                return
            
            print(f"📊 Found {len(matching_pairs)} matching file pair(s) to process")
            
            total_videos_created = 0
            
            # Process each matching pair
            for pair_index, (image_file, audio_file, combo_key) in enumerate(matching_pairs, 1):
                print(f"\n--- Processing pair {pair_index}/{len(matching_pairs)} ---")
                print(f"🖼️  Using image: {image_file.name}")
                print(f"🎵 Using audio: {audio_file.name}")
                
                # Create videos for both platforms
                for platform in ['tiktok_story', 'instagram_story']:
                    platform_display = platform.replace('_', ' ').title()
                    print(f"📱 Creating {platform_display} video...")
                    output_path = self.create_video(image_file, audio_file, platform)
                    print(f"✅ {platform_display} video saved: {output_path.name}")
                    
                    # Show file size
                    file_size_mb = output_path.stat().st_size / (1024 * 1024)
                    print(f"📏 File size: {file_size_mb:.1f} MB")
                    
                    # Generate hashtags for this video
                    hashtags = self.generate_hashtags_for_post()
                    hashtags_path = self.save_hashtags_to_file(output_path.name, hashtags)
                    print(f"📝 Hashtags saved: {hashtags_path.name}")
                    
                    total_videos_created += 1
                
                # Mark combination as used
                self.used_combinations.add(combo_key)
            
            # Save used combinations
            self.save_used_combinations()
            
            print(f"\n🎉 Successfully created {total_videos_created} videos from {len(matching_pairs)} file pair(s)!")
            print("📋 Don't forget to copy the hashtags from the _hashtags.txt files!")
            
        except Exception as e:
            print(f"❌ Error creating videos: {str(e)}")
    
    def start_scheduler(self, times=['09:00', '18:00']):
        """Start the automated scheduler"""
        print("🤖 Starting automated video creation scheduler...")
        print(f"⏰ Scheduled times: {', '.join(times)}")
        print("📁 Output folder:", self.output_folder.absolute())
        
        # Schedule the jobs
        for time_str in times:
            schedule.every().day.at(time_str).do(self.create_daily_videos)
        
        print("🟢 Scheduler started! Press Ctrl+C to stop.")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            print("\n🛑 Scheduler stopped by user.")
    
    def generate_hashtags_for_post(self):
        """Generate the same fixed hashtags for all post captions"""
        return ' '.join(self.fixed_hashtags)
    
    def save_hashtags_to_file(self, video_filename, hashtags):
        """Save hashtags to a text file alongside the video"""
        hashtags_filename = video_filename.replace('.mp4', '_hashtags.txt')
        hashtags_path = self.output_folder / hashtags_filename
        
        with open(hashtags_path, 'w', encoding='utf-8') as f:
            f.write("HASHTAGS PARA LA PUBLICACIÓN:\n")
            f.write("=" * 40 + "\n\n")
            f.write(hashtags + "\n\n")
            f.write("SUGERENCIAS ADICIONALES:\n")
            f.write("- Copia y pega estos hashtags en tu publicación\n")
            f.write("- Puedes añadir hashtags específicos del contenido\n")
            f.write("- Recuerda etiquetar @audiogretel si aplica\n")
        
        return hashtags_path
    
    def show_available_pairs(self):
        """Show available image/audio pairs with matching names"""
        images, audios = self.get_available_files()
        
        print("\n📁 Available file pairs:")
        print("=" * 40)
        
        matching_found = False
        for img in images:
            img_name = img.stem
            for audio in audios:
                audio_name = audio.stem
                if img_name == audio_name:
                    combo = f"{img.name}+{audio.name}"
                    status = "✅ Available" if combo not in self.used_combinations else "❌ Already used"
                    print(f"🔗 {img.name} + {audio.name} - {status}")
                    matching_found = True
        
        if not matching_found:
            print("❌ No matching pairs found!")
            print("\n💡 Tips:")
            print("   • Make sure files have the same name (without extension)")
            print("   • Example: story1.jpg + story1.mp3")
            print("   • Supported image formats: .jpg, .jpeg, .png, .bmp, .tiff")
            print("   • Supported audio formats: .mp3, .wav, .m4a, .aac")
        
        return matching_found

def main():
    parser = argparse.ArgumentParser(description='Automated Video Creator for Social Media')
    parser.add_argument('--images', default='temp/images', help='Path to images folder')
    parser.add_argument('--audio', default='temp/audio', help='Path to audio/MP3 folder')
    parser.add_argument('--output', default='output_videos', help='Output folder for videos')
    parser.add_argument('--times', nargs='+', default=['09:00', '18:00'], 
                       help='Daily posting times (24-hour format)')
    parser.add_argument('--create-now', action='store_true', 
                       help='Create videos immediately instead of scheduling')
    parser.add_argument('--lightweight', action='store_true', 
                       help='Use lightweight mode (lower resolution and FPS)')
    parser.add_argument('--show-pairs', action='store_true', 
                       help='Show available image/audio pairs with matching names')
    
    args = parser.parse_args()
    
    # Create temp folders if they don't exist
    os.makedirs(args.images, exist_ok=True)
    os.makedirs(args.audio, exist_ok=True)
    
    # Validate folders
    if not os.path.exists(args.images):
        print(f"❌ Images folder not found: {args.images}")
        return
    
    if not os.path.exists(args.audio):
        print(f"❌ Audio folder not found: {args.audio}")
        return
    
    # Create video creator instance
    creator = VideoCreator(args.images, args.audio, args.output, args.lightweight)
    
    if args.show_pairs:
        creator.show_available_pairs()
    elif args.create_now:
        creator.create_daily_videos()
    else:
        creator.start_scheduler(args.times)

if __name__ == "__main__":
    main()