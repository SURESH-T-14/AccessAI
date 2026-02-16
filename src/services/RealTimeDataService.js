/**
 * Real-Time Data Service
 * Unified service for fetching and managing all real-time data across the application
 * Sources: Firebase, Google Search, Gemini API, Flask Backend, Translation, LocalStorage
 */

import GoogleSearchService from './GoogleSearchService';
import NLPService from './NLPService';
import TranslationService from './TranslationService';

const FLASK_API_URL = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

class RealTimeDataService {
  /**
   * Fetch all real-time data from all sources
   * @returns {Promise<Object>} Aggregated real-time data
   */
  static async fetchAllRealTimeData() {
    try {
      const dataPromises = {
        flaskStatus: this.fetchFlaskStatus(),
        gestureHistory: this.fetchGestureHistory(),
        translationLanguages: this.fetchSupportedLanguages(),
        systemMetrics: this.getSystemMetrics(),
        googleSearchStatus: this.getGoogleSearchStatus(),
        geminiStatus: this.getGeminiStatus(),
        nlpCapabilities: this.getNLPCapabilities(),
        localStorageData: this.getLocalStorageData(),
        timestamp: Promise.resolve(new Date().toISOString())
      };

      const results = await Promise.allSettled(Object.values(dataPromises));
      const data = {};

      Object.keys(dataPromises).forEach((key, idx) => {
        if (results[idx].status === 'fulfilled') {
          data[key] = results[idx].value;
        } else {
          console.warn(`Failed to fetch ${key}:`, results[idx].reason);
          data[key] = null;
        }
      });

      return data;
    } catch (error) {
      console.error('Error fetching all real-time data:', error);
      return null;
    }
  }

  /**
   * Fetch Flask backend status and capabilities
   */
  static async fetchFlaskStatus() {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        return {
          status: 'offline',
          error: 'Flask backend not responding'
        };
      }

      const data = await response.json();
      return {
        status: 'online',
        ...data
      };
    } catch (error) {
      console.warn('Flask status check failed:', error);
      return {
        status: 'offline',
        error: error.message
      };
    }
  }

  /**
   * Fetch gesture detection history
   */
  static async fetchGestureHistory() {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/gesture-history`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) return [];

      const data = await response.json();
      return {
        history: data.history || [],
        total: data.total || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to fetch gesture history:', error);
      return { history: [], total: 0, error: error.message };
    }
  }

  /**
   * Fetch supported languages for translation
   */
  static async fetchSupportedLanguages() {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/translate/supported`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) return {};

      const data = await response.json();
      return {
        languages: data.languages || {},
        count: Object.keys(data.languages || {}).length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to fetch supported languages:', error);
      return { languages: {}, count: 0, error: error.message };
    }
  }

  /**
   * Get system performance metrics
   */
  static getSystemMetrics() {
    return Promise.resolve({
      memory: performance.memory ? {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576),
        jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      } : null,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      online: navigator.onLine
    });
  }

  /**
   * Get Google Search API status
   */
  static getGoogleSearchStatus() {
    return Promise.resolve({
      hasApiKey: !!import.meta.env.VITE_GOOGLE_CUSTOM_SEARCH_API_KEY,
      hasEngineId: !!import.meta.env.VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
      available: !!import.meta.env.VITE_GOOGLE_CUSTOM_SEARCH_API_KEY,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get Gemini API status
   */
  static getGeminiStatus() {
    return Promise.resolve({
      hasApiKey: !!GEMINI_API_KEY,
      available: !!GEMINI_API_KEY,
      currentDateTime: GoogleSearchService.getCurrentDateTime(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get NLP capabilities
   */
  static getNLPCapabilities() {
    try {
      return Promise.resolve({
        sentiment: NLPService.getSentimentAnalysis ? 'available' : 'unavailable',
        intent: NLPService.getIntentDetection ? 'available' : 'unavailable',
        keywords: NLPService.getKeywordExtraction ? 'available' : 'unavailable',
        entities: NLPService.getEntityExtraction ? 'available' : 'unavailable',
        summarization: NLPService.getTextSummarization ? 'available' : 'unavailable',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return Promise.resolve({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get local storage data
   */
  static getLocalStorageData() {
    return Promise.resolve({
      chats: localStorage.getItem('accessai_chats') ? JSON.parse(localStorage.getItem('accessai_chats')).length : 0,
      currentChatId: localStorage.getItem('accessai_currentChatId'),
      nextChatId: localStorage.getItem('accessai_nextChatId'),
      hasChatsData: !!localStorage.getItem('accessai_chats'),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Perform a web search with real-time data
   */
  static async searchWebForRealTimeData(query, maxResults = 5) {
    try {
      const results = await GoogleSearchService.search(query, maxResults);
      return {
        success: true,
        query,
        results,
        count: results.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Web search failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get gesture detection real-time data
   */
  static async getGestureDetectionData() {
    try {
      const [status, history] = await Promise.all([
        this.fetchFlaskStatus(),
        this.fetchGestureHistory()
      ]);

      return {
        flaskStatus: status.status,
        gestureHistory: history.history,
        totalGestures: history.total,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get gesture detection data:', error);
      return { error: error.message };
    }
  }

  /**
   * Process frame for gesture detection (real-time)
   */
  static async processFrameRealTime(frameData) {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/process-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: frameData })
      });

      if (!response.ok) throw new Error(`Frame processing failed: ${response.statusText}`);

      const data = await response.json();
      return {
        success: true,
        ...data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Frame processing error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Perform NLP analysis on text (real-time)
   */
  static async performNLPAnalysis(text) {
    try {
      const analysis = await NLPService.quickAnalysis(text);
      return {
        success: true,
        text,
        analysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('NLP analysis error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Translate text with real-time data
   */
  static async translateTextRealTime(text, sourceLanguage, targetLanguage) {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/translate/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLanguageCode: sourceLanguage,
          targetLanguageCode: targetLanguage
        })
      });

      if (!response.ok) throw new Error(`Translation failed: ${response.statusText}`);

      const data = await response.json();
      return {
        success: true,
        sourceLanguage,
        targetLanguage,
        originalText: text,
        translatedText: data.translations?.[0]?.translatedText || '',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Stream chat response (real-time)
   */
  static async getChatResponseRealTime(messages, systemInstruction) {
    try {
      if (!GEMINI_API_KEY) {
        return {
          success: false,
          error: 'Gemini API key not configured'
        };
      }

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages,
          systemInstruction: { parts: [{ text: systemInstruction }] }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);

      const data = await response.json();
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        success: true,
        response: botResponse,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Chat response error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Initialize continuous real-time data monitoring
   * @param {Function} callback - Function called with updated data
   * @param {number} interval - Update interval in milliseconds (default 5000ms)
   * @returns {Function} Unsubscribe function
   */
  static subscribeToRealTimeUpdates(callback, interval = 5000) {
    const intervalId = setInterval(async () => {
      const data = await this.fetchAllRealTimeData();
      if (callback) {
        callback(data);
      }
    }, interval);

    // Return unsubscribe function
    return () => {
      clearInterval(intervalId);
      console.log('Real-time data subscription ended');
    };
  }

  /**
   * Get comprehensive system status
   */
  static async getComprehensiveStatus() {
    return {
      flask: await this.fetchFlaskStatus(),
      google: this.getGoogleSearchStatus(),
      gemini: this.getGeminiStatus(),
      nlp: await this.getNLPCapabilities(),
      system: await this.getSystemMetrics(),
      localStorage: await this.getLocalStorageData(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start gesture detection
   */
  static async startGestureDetection() {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/start-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      return {
        success: response.ok,
        ...data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to start gesture detection:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Stop gesture detection
   */
  static async stopGestureDetection() {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/stop-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      return {
        success: response.ok,
        ...data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to stop gesture detection:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clear gesture history
   */
  static async clearGestureHistory() {
    try {
      const response = await fetch(`${FLASK_API_URL}/api/clear-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      return {
        success: response.ok,
        ...data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to clear gesture history:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default RealTimeDataService;
