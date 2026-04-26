# Z-Image Setup Guide

## Overview
Z-Image is an efficient image generation foundation model with single-stream diffusion transformer by Tongyi-MAI.

**Paper**: [arXiv:2511.22699](https://arxiv.org/abs/2511.22699)

## Installation

### 1. Install Dependencies

```bash
# Install diffusers from GitHub
pip install git+https://github.com/huggingface/diffusers

# Update HuggingFace Hub
pip install -U huggingface_hub

# Install PyTorch (if not already installed)
pip install torch torchvision
```

### 2. Download Model

```bash
# High-performance download
HF_XET_HIGH_PERFORMANCE=1 hf download Tongyi-MAI/Z-Image
```

Or download manually from: https://huggingface.co/Tongyi-MAI/Z-Image

## Usage

### JavaScript/TypeScript (Frontend)

```javascript
import zImageService from './services/ZImageService';

// Generate image
const result = await zImageService.generateImage(
  "A beautiful sunset over mountains",
  {
    height: 1280,
    width: 720,
    steps: 50,
    guidanceScale: 4.0,
    negativePrompt: "blurry, low quality"
  }
);

console.log(result.imageData); // Base64 image data
```

### Python (Backend)

#### Option 1: Direct Usage

```python
from zimage_generator import ZImageGenerator

# Initialize generator
generator = ZImageGenerator()

# Generate image
image = generator.generate(
    prompt="A beautiful sunset over mountains",
    negative_prompt="blurry, low quality",
    height=1280,
    width=720,
    num_inference_steps=50,
    guidance_scale=4.0,
    seed=42,
    output_path="output.png"
)
```

#### Option 2: API Server

```bash
# Start the Z-Image API server
python zimage_api_server.py
```

Then make POST requests:

```javascript
const response = await fetch('http://localhost:5001/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "A beautiful sunset over mountains",
    negative_prompt: "blurry, low quality",
    height: 1280,
    width: 720,
    steps: 50,
    guidance_scale: 4.0,
    seed: 42
  })
});

const result = await response.json();
console.log(result.image); // Base64 image
```

## Integration with Existing App

### 1. Update App.jsx

Add Z-Image as an option in your image generation:

```javascript
import zImageService from './services/ZImageService';

// In your image generation handler
if (useZImage) {
  const result = await zImageService.generateImage(prompt, options);
  // Handle result
} else {
  // Use existing HuggingFace service
  const result = await huggingFaceService.generateImage(prompt, options);
  // Handle result
}
```

### 2. Add Model Selection UI

Add a dropdown or toggle to let users choose between models:
- Stable Diffusion XL (existing)
- Z-Image (new)

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | Text description of image to generate |
| `negative_prompt` | string | "" | What to avoid in the image |
| `height` | int | 1280 | Image height in pixels |
| `width` | int | 720 | Image width in pixels |
| `num_inference_steps` | int | 50 | Number of denoising steps (higher = better quality, slower) |
| `guidance_scale` | float | 4.0 | How closely to follow the prompt |
| `seed` | int | null | Random seed for reproducibility |

## Performance Notes

- **GPU Required**: Z-Image requires CUDA-capable GPU for reasonable performance
- **Memory**: ~8GB VRAM recommended
- **Speed**: ~30-60 seconds per image at 50 steps on RTX 3080
- **CPU Mode**: Possible but very slow (minutes per image)

## Multilingual Support

Z-Image supports multiple languages including:
- English
- Chinese (中文)
- And more...

Example Chinese prompt:
```python
prompt = "一个美丽的日落景观，群山环绕，色彩鲜艳"
```

## Troubleshooting

### Model Not Found
```
❌ Failed to load pipeline
💡 Did you download the model?
   Run: HF_XET_HIGH_PERFORMANCE=1 hf download Tongyi-MAI/Z-Image
```

**Solution**: Download the model using the command above.

### CUDA Out of Memory
```
❌ CUDA out of memory
```

**Solutions**:
- Reduce image dimensions (e.g., 512x512)
- Reduce batch size
- Close other GPU applications
- Use CPU (slow): Set `device="cpu"` in ZImageGenerator

### Diffusers Not Found
```
❌ Error: diffusers library not found
```

**Solution**: 
```bash
pip install git+https://github.com/huggingface/diffusers
```

### fal-ai Provider Error (JavaScript)

If using the JavaScript service via HuggingFace Inference:
```
❌ fal-ai provider error
```

**Solution**: The model may not be available via the fal-ai provider. Use Python backend instead for local generation.

## Citation

```bibtex
@article{team2025zimage,
  title={Z-Image: An Efficient Image Generation Foundation Model with Single-Stream Diffusion Transformer},
  author={Z-Image Team},
  journal={arXiv preprint arXiv:2511.22699},
  year={2025}
}
```

## Files Created

- `src/services/ZImageService.js` - Frontend JavaScript service
- `zimage_generator.py` - Python generator class
- `zimage_api_server.py` - Flask API server
- `ZIMAGE_SETUP.md` - This setup guide

## Next Steps

1. ✅ Install dependencies
2. ✅ Download Z-Image model
3. ⬜ Test Python generator: `python zimage_generator.py`
4. ⬜ Start API server: `python zimage_api_server.py`
5. ⬜ Integrate into frontend with model selection UI
6. ⬜ Test end-to-end generation
