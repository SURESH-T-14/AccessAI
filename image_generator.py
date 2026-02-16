#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Image Generation Service using Unsplash API
Generates real images from text prompts by searching Unsplash
"""

import requests
import io
import os
from pathlib import Path
import hashlib
from PIL import Image, ImageDraw

# Load environment variables from .env.local if available
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env.local'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

# Configure Unsplash API - Free tier that doesn't require authentication for basic usage
UNSPLASH_API_URL = "https://api.unsplash.com/search/photos"
UNSPLASH_ACCESS_KEY = os.getenv('UNSPLASH_ACCESS_KEY', '')  # Optional for higher limits

if UNSPLASH_ACCESS_KEY:
    print("[✓] Unsplash Access Key configured")
else:
    print("[✓] Unsplash API ready (free tier - no key needed)")


class ImageGenerator:
    """Generate real images using Unsplash API with placeholder fallback"""
    
    @staticmethod
    def generate_image(prompt: str, quality: str = "standard") -> bytes:
        """
        Generate an image from text prompt using Unsplash API
        Falls back to placeholder if service unavailable
        
        Args:
            prompt (str): Text description of the image to generate
            quality (str): Image quality ("standard" or "high")
        
        Returns:
            bytes: Image data in PNG format
        """
        try:
            if not prompt or not prompt.strip():
                raise ValueError("No prompt provided")
            
            print(f"[Image Gen] Searching for: '{prompt.strip()}'")
            
            # Try Unsplash API first
            try:
                image_data = ImageGenerator._search_unsplash(prompt.strip(), quality)
                if image_data:
                    print(f"[Image Gen] ✓ Found real image on Unsplash")
                    return image_data
            except Exception as e:
                print(f"[Image Gen] Unsplash search failed: {e}")
            
            # Fallback to placeholder
            print(f"[Image Gen] Creating placeholder image...")
            return ImageGenerator._create_placeholder_image(prompt.strip(), quality)
        
        except Exception as e:
            print(f"[Image Gen] Error: {e}, creating placeholder...")
            return ImageGenerator._create_placeholder_image(prompt, quality)
    
    @staticmethod
    def _search_unsplash(prompt: str, quality: str) -> bytes:
        """
        Search Unsplash API for images matching the prompt
        
        Args:
            prompt (str): Search query
            quality (str): Quality level
        
        Returns:
            bytes: Image data or None if not found
        """
        try:
            headers = {}
            if UNSPLASH_ACCESS_KEY:
                headers['Authorization'] = f'Client-ID {UNSPLASH_ACCESS_KEY}'
            
            params = {
                'query': prompt,
                'per_page': 1,
                'order_by': 'relevant'
            }
            
            print(f"[Image Gen] Calling Unsplash API...")
            response = requests.get(UNSPLASH_API_URL, headers=headers, params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            if 'results' in data and len(data['results']) > 0:
                image_url = data['results'][0]['urls']['regular']
                image_credit = data['results'][0]['user']['name']
                print(f"[Image Gen] Found image by {image_credit}")
                
                # Download the image
                img_response = requests.get(image_url, timeout=15)
                img_response.raise_for_status()
                
                # Convert to PNG if needed
                image = Image.open(io.BytesIO(img_response.content))
                image = image.convert('RGB')
                
                # Resize if needed for consistency
                if quality == "high":
                    max_size = (1024, 1024)
                else:
                    max_size = (512, 512)
                
                # Maintain aspect ratio
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Save as PNG
                output = io.BytesIO()
                image.save(output, format='PNG')
                output.seek(0)
                
                return output.getvalue()
            
            print(f"[Image Gen] No results found for '{prompt}'")
            return None
        
        except requests.exceptions.Timeout:
            print(f"[Image Gen] Unsplash API timeout")
            return None
        except requests.exceptions.RequestException as e:
            print(f"[Image Gen] Unsplash API error: {e}")
            return None
        except Exception as e:
            print(f"[Image Gen] Error processing image: {e}")
            return None
    
    @staticmethod
    def _create_placeholder_image(prompt: str, quality: str = "standard") -> bytes:
        """
        Create a placeholder gradient image when real images unavailable
        
        Args:
            prompt (str): Text to display
            quality (str): Quality level
        
        Returns:
            bytes: PNG image data
        """
        try:
            if quality == "high":
                width, height = 800, 600
            else:
                width, height = 400, 300
            
            # Generate color based on prompt hash
            hash_obj = hashlib.md5(prompt.encode())
            hash_hex = hash_obj.hexdigest()
            r = int(hash_hex[0:2], 16)
            g = int(hash_hex[2:4], 16)
            b = int(hash_hex[4:6], 16)
            
            # Create gradient image
            image = Image.new('RGB', (width, height), (r, g, b))
            draw = ImageDraw.Draw(image)
            
            # Add gradient overlay
            for y in range(height):
                t = y / height
                blend_r = int(r * (1 - t) + 255 * t)
                blend_g = int(g * (1 - t) + 200 * t)
                blend_b = int(b * (1 - t) + 150 * t)
                
                blend_r = max(0, min(255, blend_r))
                blend_g = max(0, min(255, blend_g))
                blend_b = max(0, min(255, blend_b))
                
                draw.line([(0, y), (width, y)], fill=(blend_r, blend_g, blend_b))
            
            # Add text
            try:
                text = f"Image: {prompt[:35]}"
                draw.text((20, height // 2 - 10), text, fill='white')
            except:
                pass
            
            # Convert to PNG
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            return img_byte_arr.getvalue()
        except Exception as e:
            print(f"[Image Gen] Placeholder error: {e}")
            raise


def generate_image_endpoint(prompt: str) -> tuple:
    """
    Generate image and return as PNG bytes
    
    Args:
        prompt (str): Text prompt for image generation
    
    Returns:
        tuple: (image_bytes, error_message or None)
    """
    try:
        image_data = ImageGenerator.generate_image(prompt)
        return image_data, None
    except Exception as e:
        return None, str(e)
