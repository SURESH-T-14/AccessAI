"""
Z-Image Generator using Diffusers Library
Tongyi-MAI/Z-Image - Efficient Image Generation Foundation Model

Installation:
    pip install git+https://github.com/huggingface/diffusers
    pip install -U huggingface_hub torch

Download Model:
    HF_XET_HIGH_PERFORMANCE=1 hf download Tongyi-MAI/Z-Image

Citation:
    @article{team2025zimage,
      title={Z-Image: An Efficient Image Generation Foundation Model with Single-Stream Diffusion Transformer},
      author={Z-Image Team},
      journal={arXiv preprint arXiv:2511.22699},
      year={2025}
    }
"""

import os
import sys
import torch
from pathlib import Path
from datetime import datetime

try:
    from diffusers import ZImagePipeline
except ImportError:
    print("❌ Error: diffusers library not found")
    print("📦 Install with: pip install git+https://github.com/huggingface/diffusers")
    sys.exit(1)


class ZImageGenerator:
    def __init__(self, model_name="Tongyi-MAI/Z-Image", device="cuda"):
        """
        Initialize Z-Image Generator
        
        Args:
            model_name (str): HuggingFace model path
            device (str): Device to run on ('cuda' or 'cpu')
        """
        self.model_name = model_name
        self.device = device if torch.cuda.is_available() else "cpu"
        
        if self.device == "cpu":
            print("⚠️  Warning: CUDA not available, using CPU (will be slow)")
        
        self.pipe = None
        self._load_pipeline()
    
    def _load_pipeline(self):
        """Load the Z-Image pipeline"""
        print(f"🔄 Loading Z-Image pipeline from {self.model_name}...")
        
        try:
            self.pipe = ZImagePipeline.from_pretrained(
                self.model_name,
                torch_dtype=torch.bfloat16 if self.device == "cuda" else torch.float32,
                low_cpu_mem_usage=False,
            )
            self.pipe.to(self.device)
            print(f"✅ Pipeline loaded successfully on {self.device}")
        except Exception as e:
            print(f"❌ Failed to load pipeline: {e}")
            print("\n💡 Did you download the model?")
            print("   Run: HF_XET_HIGH_PERFORMANCE=1 hf download Tongyi-MAI/Z-Image")
            raise
    
    def generate(
        self,
        prompt,
        negative_prompt="",
        height=1280,
        width=720,
        num_inference_steps=50,
        guidance_scale=4.0,
        seed=None,
        output_path=None
    ):
        """
        Generate image from text prompt
        
        Args:
            prompt (str): Text description of the image to generate
            negative_prompt (str): What to avoid in the image (optional)
            height (int): Image height (default: 1280)
            width (int): Image width (default: 720)
            num_inference_steps (int): Number of denoising steps (default: 50)
            guidance_scale (float): Guidance scale for generation (default: 4.0)
            seed (int): Random seed for reproducibility (optional)
            output_path (str): Path to save the image (optional)
        
        Returns:
            PIL.Image: Generated image
        """
        if not self.pipe:
            raise RuntimeError("Pipeline not loaded")
        
        print(f"\n🎨 Generating image with Z-Image...")
        print(f"   Prompt: {prompt[:100]}...")
        print(f"   Size: {width}x{height}")
        print(f"   Steps: {num_inference_steps}")
        print(f"   Guidance Scale: {guidance_scale}")
        
        # Set generator for reproducibility
        generator = None
        if seed is not None:
            generator = torch.Generator(self.device).manual_seed(seed)
            print(f"   Seed: {seed}")
        
        try:
            # Generate image
            result = self.pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                height=height,
                width=width,
                cfg_normalization=False,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                generator=generator,
            )
            
            image = result.images[0]
            print("✅ Image generated successfully")
            
            # Save if output path provided
            if output_path:
                image.save(output_path)
                print(f"💾 Image saved to: {output_path}")
            
            return image
            
        except Exception as e:
            print(f"❌ Generation failed: {e}")
            raise
    
    def batch_generate(self, prompts, **kwargs):
        """
        Generate multiple images from a list of prompts
        
        Args:
            prompts (list): List of text prompts
            **kwargs: Additional arguments for generate()
        
        Returns:
            list: List of generated PIL Images
        """
        images = []
        for i, prompt in enumerate(prompts, 1):
            print(f"\n📸 Generating image {i}/{len(prompts)}")
            image = self.generate(prompt, **kwargs)
            images.append(image)
        
        return images


def main():
    """Example usage"""
    # Initialize generator
    generator = ZImageGenerator()
    
    # Example 1: Simple generation
    print("\n" + "="*60)
    print("Example 1: Simple Generation")
    print("="*60)
    
    prompt = "A beautiful sunset over mountains with vibrant orange and pink clouds"
    image = generator.generate(
        prompt=prompt,
        height=1280,
        width=720,
        num_inference_steps=50,
        guidance_scale=4.0,
        seed=42,
        output_path="generated_sunset.png"
    )
    
    # Example 2: With negative prompt
    print("\n" + "="*60)
    print("Example 2: With Negative Prompt")
    print("="*60)
    
    prompt = "A modern minimalist living room with large windows"
    negative_prompt = "cluttered, dark, blurry, low quality"
    
    image = generator.generate(
        prompt=prompt,
        negative_prompt=negative_prompt,
        height=1280,
        width=720,
        num_inference_steps=50,
        guidance_scale=4.0,
        seed=123,
        output_path="generated_room.png"
    )
    
    # Example 3: Chinese prompt (Z-Image supports multilingual)
    print("\n" + "="*60)
    print("Example 3: Chinese Prompt")
    print("="*60)
    
    prompt = "两名年轻亚裔女性紧密站在一起，背景为朴素的灰色纹理墙面，身穿休闲时尚服装，面带微笑直视镜头"
    
    image = generator.generate(
        prompt=prompt,
        height=1280,
        width=720,
        num_inference_steps=50,
        guidance_scale=4.0,
        seed=456,
        output_path="generated_chinese.png"
    )
    
    print("\n✅ All examples completed!")


if __name__ == "__main__":
    main()
