import { InferenceClient } from "@huggingface/inference";

/**
 * Hugging Face Image Generation Service
 * Generates images using Stable Diffusion and other models
 */

class HuggingFaceService {
  constructor() {
    this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';
    
    // Initialize Inference Client
    if (this.apiKey) {
      this.client = new InferenceClient(this.apiKey);
    }
    
    // Available models
    this.models = {
      'stable-diffusion': 'stabilityai/stable-diffusion-2-1',
      'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0',
      'openjourney': 'prompthero/openjourney',
      'anything-v4': 'andite/anything-v4.0',
      'realistic-vision': 'SG161222/Realistic_Vision_V2.0'
    };
    
    this.currentModel = this.models['stable-diffusion-xl'];
    this.generationHistory = this.loadHistory();
  }

  /**
   * Check if Hugging Face is configured
   */
  isConfigured() {
    return Boolean(this.apiKey && this.client);
  }

  /**
   * Generate image from text prompt
   */
  async generateImage(prompt, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Hugging Face API key not configured. Add VITE_HUGGINGFACE_API_KEY to .env file');
    }

    const model = options.model || this.currentModel;
    const steps = options.steps || 25; // Increased steps for better quality
    
    console.log('🎨 Generating image with Hugging Face:', {
      prompt,
      model,
      steps,
      apiKey: this.apiKey.substring(0, 8) + '...'
    });

    try {
      // Method 1: Try with the new Inference Client API (recommended)
      try {
        console.log('🔄 Attempting method 1: InferenceClient.textToImage');
        
        const imageBlob = await this.client.textToImage({
          model: model,
          inputs: prompt,
          parameters: { 
            num_inference_steps: steps,
            guidance_scale: options.guidance || 7.5,
            negative_prompt: options.negative_prompt || 'blurry, bad quality, distorted, ugly, deformed'
          }
        });

        // Convert Blob to base64
        const imageBase64 = await this.blobToBase64(imageBlob);

        if (!imageBase64 || typeof imageBase64 !== 'string') {
          throw new Error('Failed to convert image to base64');
        }

        console.log('✅ Method 1 successful');
        return this.createGenerationResult(prompt, model, imageBase64, steps, options.guidance);
        
      } catch (method1Error) {
        console.warn('⚠️ Method 1 failed:', method1Error.message);
        
        // Method 2: Fallback to direct API call
        console.log('🔄 Attempting method 2: Direct API call');
        
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              num_inference_steps: steps,
              guidance_scale: options.guidance || 7.5,
              negative_prompt: options.negative_prompt || 'blurry, bad quality, distorted'
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          
          // Check for specific errors
          if (response.status === 503) {
            throw new Error('Model is loading. Please wait 20-30 seconds and try again.');
          } else if (response.status === 401) {
            throw new Error('Invalid API key. Please check your HuggingFace API key.');
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
          }
          
          throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const imageBlob = await response.blob();
        const imageBase64 = await this.blobToBase64(imageBlob);

        if (!imageBase64 || typeof imageBase64 !== 'string') {
          throw new Error('Failed to convert image to base64');
        }

        console.log('✅ Method 2 successful');
        return this.createGenerationResult(prompt, model, imageBase64, steps, options.guidance);
      }
      
    } catch (error) {
      console.error('❌ All generation methods failed:', error);
      throw new Error(error.message || 'Failed to generate image. Please try again.');
    }
  }

  /**
   * Create generation result object
   */
  createGenerationResult(prompt, model, imageBase64, steps, guidance) {
    const generationData = {
      id: Date.now().toString(),
      prompt,
      model,
      image: imageBase64,
      timestamp: new Date().toISOString(),
      steps: steps,
      guidance: guidance || 7.5
    };
    
    this.addToHistory(generationData);
    console.log('✅ Image generated successfully, size:', imageBase64.length, 'bytes');
    
    return generationData;
  }

  /**
   * Convert blob to base64
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Detect if user is requesting image generation
   */
  isImageGenerationRequest(text) {
    const lowerText = text.toLowerCase();
    const keywords = [
      'generate image', 'create image', 'draw', 'make image',
      'generate picture', 'create picture', 'make picture',
      'generate photo', 'create photo', 'show me',
      'image of', 'picture of', 'photo of',
      'paint', 'illustrate', 'design'
    ];
    
    return keywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Extract prompt from user message
   */
  extractPrompt(text) {
    // Remove trigger phrases
    let prompt = text.toLowerCase()
      .replace(/generate (an?|the)?\s*(image|picture|photo) of\s*/gi, '')
      .replace(/create (an?|the)?\s*(image|picture|photo) of\s*/gi, '')
      .replace(/draw (an?|the)?\s*/gi, '')
      .replace(/make (an?|the)?\s*(image|picture|photo) of\s*/gi, '')
      .replace(/show me (an?|the)?\s*/gi, '')
      .trim();
    
    return prompt || text;
  }

  /**
   * Add to generation history
   */
  addToHistory(generation) {
    this.generationHistory.unshift(generation);
    
    // Keep only last 50 generations
    if (this.generationHistory.length > 50) {
      this.generationHistory = this.generationHistory.slice(0, 50);
    }
    
    this.saveHistory();
  }

  /**
   * Get generation history
   */
  getHistory() {
    return this.generationHistory;
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.generationHistory = [];
    this.saveHistory();
  }

  /**
   * Save history to localStorage
   */
  saveHistory() {
    try {
      // Don't save images to localStorage (too large), only metadata
      const historyToSave = this.generationHistory.map(item => ({
        id: item.id,
        prompt: item.prompt,
        model: item.model,
        timestamp: item.timestamp,
        parameters: item.parameters
      }));
      
      localStorage.setItem('hf_generation_history', JSON.stringify(historyToSave));
    } catch (error) {
      console.warn('Failed to save generation history:', error);
    }
  }

  /**
   * Load history from localStorage
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem('hf_generation_history');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Failed to load generation history:', error);
      return [];
    }
  }

  /**
   * Get available models
   */
  getModels() {
    return Object.keys(this.models).map(key => ({
      id: key,
      name: key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      model: this.models[key]
    }));
  }

  /**
   * Set current model
   */
  setModel(modelKey) {
    if (this.models[modelKey]) {
      this.currentModel = this.models[modelKey];
    }
  }
}

export default new HuggingFaceService();
