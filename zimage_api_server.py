"""
Z-Image API Server
Flask server for generating images using Z-Image model
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
import base64
import io
from datetime import datetime
import sys

try:
    from diffusers import ZImagePipeline
except ImportError:
    print("❌ Error: diffusers library not found")
    print("📦 Install with: pip install git+https://github.com/huggingface/diffusers")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

# Global pipeline variable
pipeline = None
device = "cuda" if torch.cuda.is_available() else "cpu"


def load_pipeline():
    """Load Z-Image pipeline at startup"""
    global pipeline
    
    print("🔄 Loading Z-Image pipeline...")
    try:
        pipeline = ZImagePipeline.from_pretrained(
            "Tongyi-MAI/Z-Image",
            torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
            low_cpu_mem_usage=False,
        )
        pipeline.to(device)
        print(f"✅ Pipeline loaded successfully on {device}")
        return True
    except Exception as e:
        print(f"❌ Failed to load pipeline: {e}")
        print("\n💡 Did you download the model?")
        print("   Run: HF_XET_HIGH_PERFORMANCE=1 hf download Tongyi-MAI/Z-Image")
        return False


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model': 'Z-Image',
        'device': device,
        'pipeline_loaded': pipeline is not None,
        'cuda_available': torch.cuda.is_available()
    })


@app.route('/generate', methods=['POST'])
def generate_image():
    """
    Generate image from text prompt
    
    Request JSON:
    {
        "prompt": "text description",
        "negative_prompt": "what to avoid (optional)",
        "height": 1280,
        "width": 720,
        "steps": 50,
        "guidance_scale": 4.0,
        "seed": 42
    }
    
    Response JSON:
    {
        "success": true,
        "image": "base64_encoded_image",
        "model": "Tongyi-MAI/Z-Image",
        "parameters": {...}
    }
    """
    if pipeline is None:
        return jsonify({
            'success': False,
            'error': 'Pipeline not loaded. Please check server logs.'
        }), 503
    
    try:
        data = request.get_json()
        
        # Extract parameters
        prompt = data.get('prompt')
        if not prompt:
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400
        
        negative_prompt = data.get('negative_prompt', '')
        height = int(data.get('height', 1280))
        width = int(data.get('width', 720))
        num_inference_steps = int(data.get('steps', 50))
        guidance_scale = float(data.get('guidance_scale', 4.0))
        seed = data.get('seed')
        
        print(f"\n🎨 Generating image...")
        print(f"   Prompt: {prompt[:100]}...")
        print(f"   Size: {width}x{height}")
        print(f"   Steps: {num_inference_steps}")
        
        # Set generator
        generator = None
        if seed is not None:
            generator = torch.Generator(device).manual_seed(int(seed))
        
        # Generate image
        result = pipeline(
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
        
        # Convert image to base64
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_base64}',
            'model': 'Tongyi-MAI/Z-Image',
            'parameters': {
                'prompt': prompt,
                'negative_prompt': negative_prompt,
                'height': height,
                'width': width,
                'steps': num_inference_steps,
                'guidance_scale': guidance_scale,
                'seed': seed
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Generation failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/models', methods=['GET'])
def list_models():
    """List available models"""
    return jsonify({
        'models': [
            {
                'name': 'Z-Image',
                'full_name': 'Tongyi-MAI/Z-Image',
                'description': 'Efficient Image Generation Foundation Model with Single-Stream Diffusion Transformer',
                'default_size': '720x1280',
                'paper': 'arXiv:2511.22699'
            }
        ]
    })


if __name__ == '__main__':
    print("="*60)
    print("Z-Image API Server")
    print("="*60)
    
    # Load pipeline at startup
    if load_pipeline():
        print("\n🚀 Starting Flask server on http://localhost:5001")
        print("   Endpoints:")
        print("   - GET  /health   - Health check")
        print("   - POST /generate - Generate image")
        print("   - GET  /models   - List models")
        app.run(host='0.0.0.0', port=5001, debug=False)
    else:
        print("\n❌ Server startup failed")
        sys.exit(1)
