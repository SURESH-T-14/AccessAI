# Z-Image Quick Start Guide

## 🚀 Quick Setup (No Additional Servers Needed!)

Z-Image is **already integrated** into your existing Python server (`gesture_api_server_simple.py`). No need to run separate servers!

### Step 1: Your Server is Already Ready!

Your Python gesture API server already includes Z-Image endpoints:
- Running on: `http://localhost:5000`
- Endpoint: `POST /api/zimage/generate`

**No additional server setup required!** ✅

### Step 2: Just Add Your HuggingFace API Key

Make sure your `.env` file has:
```bash
VITE_HUGGINGFACE_API_KEY=your_huggingface_token_here
```

Get your free token from: https://huggingface.co/settings/tokens

### Step 3: Use It!

**In the chat, just type:**
```
generate z-image of a beautiful sunset
```

Or for Chinese prompts:
```
generate z-image of 一个美丽的日落景观
```

**Keywords that trigger Z-Image:**
- "z-image"
- "zimage"  
- Also auto-selected for Chinese/multilingual prompts

**Default keywords trigger Stable Diffusion XL:**
- "generate image of..."
- "create picture of..."
- "draw..."

## 💡 Two Models Available

### Model 1: Stable Diffusion XL (Default)
```
generate image of a beautiful sunset
```
- High quality photorealistic images
- Fast generation (~20-30s)
- 512x512 or 1024x1024

### Model 2: Z-Image (Multilingual)  
```
generate z-image of a beautiful sunset
```
- Efficient transformer model
- Better multilingual support (Chinese++)
- 720x1280 portrait mode
- ~30-60s generation

## 🎨 Example Prompts

**English:**
```
"A beautiful sunset over mountains with vibrant orange and pink clouds"
"Modern minimalist living room with large windows and natural light"
"Astronaut riding a horse on the moon"
```

**Chinese:**
```
"一个美丽的日落景观，群山环绕，色彩鲜艳"
"两名年轻女性站在一起，背景为朴素的灰色墙面"
```

## 🔧 Configuration

### Adjust Quality vs Speed

| Steps | Quality | Time |
|-------|---------|------|
| 5     | Low     | ~5s  |
| 25    | Medium  | ~15s |
| 50    | High    | ~30s |
| 100   | Best    | ~60s |

### Image Sizes

Common sizes for Z-Image:
- **Portrait:** 720x1280
- **Landscape:** 1280x720
- **Square:** 1024x1024
- **Custom:** Any size (must be multiple of 8)

## ⚠️ Requirements

- **GPU:** CUDA-capable NVIDIA GPU (recommended)
- **VRAM:** ~8GB for 1280x720 images
- **Storage:** ~6GB for model files
- **RAM:** 16GB+ recommended

## 🐛 Common Issues

### 1. CUDA Out of Memory
**Solution:** Reduce image size or steps
```python
# Smaller size
generator.generate(prompt, height=512, width=512)

# Fewer steps
generator.generate(prompt, num_inference_steps=25)
```

### 2. Model Not Found
**Solution:** Download the model
```bash
huggingface-cli download Tongyi-MAI/Z-Image
```

### 3. Diffusers Not Found
**Solution:** Install from GitHub
```bash
pip install git+https://github.com/huggingface/diffusers
```

### 4. CPU Mode (Slow)
If no GPU available, generator automatically uses CPU. Expect 10-20x slower generation.

## 📁 Files Overview

| File | Purpose | Needed? |
|------|---------|---------|
| `ZImageService.js` | Frontend service (calls backend) | ✅ Yes |
| `gesture_api_server_simple.py` | Python server with Z-Image endpoint | ✅ Already running! |
| `zimage_generator.py` | Python generator class (optional) | ⬜ For testing only |
| `zimage_api_server.py` | Standalone Flask server | ⬜ **Not needed** |
| `setup_zimage.py` | Setup scripts | ⬜ **Not needed** |
| `setup_zimage.bat` | Setup scripts | ⬜ **Not needed** |

**Note:** Files marked ⬜ are for advanced local generation only. Default setup uses HuggingFace API through your existing server.

## 🎯 Quick Test

1. Make sure your servers are running:
   - Frontend: `npm run dev` (http://localhost:5173)
   - Backend: Already running gesture server (http://localhost:5000)

2. Open http://localhost:5173

3. Type in chat:
   ```
   generate z-image of a banana on a table
   ```

4. Wait ~30-60 seconds for generation

5. Image appears in chat! ✨

## ⚠️ Requirements

**Cloud-based (Default):**
- HuggingFace API key (free)
- Internet connection
- That's it! ✅

**Local generation (Optional/Advanced):**
- CUDA-capable GPU (8GB+ VRAM)
- ~6GB model download
- See `ZIMAGE_SETUP.md` for details

## 🐛 Common Issues

### 1. "Cannot connect to backend server"
**Solution:** Make sure `gesture_api_server_simple.py` is running
```bash
python gesture_api_server_simple.py
```

### 2. "Model is loading. Wait 30 seconds"
**Solution:** This is normal! HuggingFace models need warm-up time. Just wait and retry.

### 3. "Invalid API key"
**Solution:** Check your `.env` file has correct HuggingFace token:
```bash
VITE_HUGGINGFACE_API_KEY=hf_...
```

### 4. Image generation takes too long
**Solution:** Z-Image takes 30-60s. This is normal for AI image generation.

## 📚 Resources

- **Model:** https://huggingface.co/Tongyi-MAI/Z-Image
- **Paper:** https://arxiv.org/abs/2511.22699
- **Get API Key:** https://huggingface.co/settings/tokens

---

**Ready to generate amazing images with Z-Image!** 🎨✨

**No additional servers needed - just use your existing setup!**
