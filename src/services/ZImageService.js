import { InferenceClient } from "@huggingface/inference";

class ZImageService {
  constructor() {
    this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    this.backendUrl = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';
    
    if (!this.apiKey) {
      console.warn('⚠️  VITE_HUGGINGFACE_API_KEY not found - Z-Image will use backend proxy');
    }
    
    this.client = new InferenceClient(this.apiKey);
    this.defaultModel = 'Tongyi-MAI/Z-Image';
    this.provider = 'fal-ai';
  }

  /**
   * Generate image using Z-Image model via backend Flask server
   * @param {string} prompt - The text prompt for image generation
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated image result
   */
  async generateImage(prompt, options = {}) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Valid prompt is required');
    }

    const {
      model = this.defaultModel,
      height = 1280,
      width = 720,
      steps = 50,
      guidanceScale = 4,
      negativePrompt = '',
      seed = null
    } = options;

    console.log('🎨 Z-Image Generation:', {
      provider: 'Backend Flask Server',
      model,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      dimensions: `${width}x${height}`,
      steps
    });

    try {
      // Use backend Flask server (already running gesture API)
      console.log('🔄 Calling Z-Image via backend server...');
      
      const response = await fetch(`${this.backendUrl}/api/zimage/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: model,
          negative_prompt: negativePrompt,
          steps: steps,
          guidance: guidanceScale,
          width: width,
          height: height,
          seed: seed
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 503 && errorData.loading) {
          throw new Error(`Z-Image model is loading. Wait ${errorData.estimated_time || 30} seconds and try again.`);
        } else if (response.status === 401) {
          throw new Error('Invalid HuggingFace API key. Please check your configuration.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        
        throw new Error(errorData.message || 'Z-Image generation failed');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.message || 'Z-Image generation failed');
      }

      console.log('✅ Z-Image generated successfully via backend server');
      
      return {
        success: true,
        imageData: result.imageData,
        prompt: result.prompt,
        model: result.model,
        size: result.size,
        provider: result.provider || 'backend-server',
        timestamp: result.timestamp || new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Z-Image generation failed:', error);

      // Enhanced error messages
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Cannot connect to backend server. Make sure Python server is running on port 5000.');
      }

      throw error;
    }
  }

  /**
   * Check if the service is properly configured
   * @returns {boolean} - True if configured
   */
  isConfigured() {
    return true; // Backend server handles API key
  }
}

// Export singleton instance
const zImageService = new ZImageService();
export default zImageService;
