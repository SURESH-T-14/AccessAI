import * as tf from '@tensorflow/tfjs';

/**
 * Advanced Gesture Service using TFLite models
 */
export class AdvancedGestureService {
  constructor(modelPath, sequenceLength = 30, isOfflineModel = false) {
    this.model = null;
    this.modelPath = modelPath;
    this.sequenceLength = sequenceLength;
    this.isOfflineModel = isOfflineModel;
    this.labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    this.scaler = null;
    this.isReady = false;
  }

  /**
   * Load the TFLite model
   */
  async loadModel() {
    try {
      console.log('📦 Loading model from:', this.modelPath);
      
      const tflite = window.tflite;
      if (!tflite) {
        console.error('❌ TFLite not available. Make sure CDN script is loaded in HTML.');
        return false;
      }

      // Set WASM path for TFLite
      tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite/dist/');

      // Load model from path
      try {
        this.model = await tflite.loadTFLiteModel(this.modelPath);
        this.isReady = true;
        console.log('✅ Model loaded successfully');
        return true;
      } catch (error) {
        console.error('❌ Failed to load TFLite model:', error);
        return false;
      }
    } catch (error) {
      console.error('Error in loadModel:', error);
      return false;
    }
  }

  /**
   * Predict gesture from hand landmarks
   */
  async predict(landmarks) {
    if (!this.isReady || !this.model) {
      return { gesture: null, confidence: 0 };
    }

    try {
      // Prepare input tensor
      const input = tf.tensor2d([landmarks]);
      
      // Make prediction
      const output = this.model.predict(input);
      
      // Get the argmax (highest confidence class)
      const predictions = output.dataSync();
      const maxIdx = Array.from(predictions).indexOf(Math.max(...predictions));
      
      // Get confidence score
      const confidence = predictions[maxIdx];
      
      // Clean up tensors
      input.dispose();
      output.dispose();
      
      return {
        gesture: this.labels[maxIdx],
        confidence: confidence,
        allPredictions: predictions
      };
    } catch (error) {
      console.error('Prediction error:', error);
      return { gesture: null, confidence: 0 };
    }
  }

  /**
   * Extract features from hand landmarks
   */
  extractFeatures(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return null;
    }

    // Flatten landmarks to 1D array
    const features = [];
    for (let lm of landmarks) {
      features.push(lm.x, lm.y, lm.z);
    }
    
    return features;
  }

  /**
   * Get ready status
   */
  isModelReady() {
    return this.isReady;
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
    }
  }
}
