/**
 * NLP Service for integrated text analysis
 * Handles sentiment analysis, intent detection, and text processing
 */

const API_BASE = 'http://localhost:5000/api';

export class NLPService {
  /**
   * Analyze sentiment of text
   */
  static async analyzeSentiment(text) {
    try {
      const response = await fetch(`${API_BASE}/nlp/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) throw new Error('Sentiment analysis failed');
      return await response.json();
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return {
        sentiment: 'neutral',
        confidence: 0,
        error: true
      };
    }
  }

  /**
   * Detect intent of text
   */
  static async detectIntent(text) {
    try {
      const response = await fetch(`${API_BASE}/nlp/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) throw new Error('Intent detection failed');
      return await response.json();
    } catch (error) {
      console.error('Intent detection error:', error);
      return {
        primary_intent: 'general',
        confidence: 0,
        error: true
      };
    }
  }

  /**
   * Extract keywords from text
   */
  static async extractKeywords(text, topK = 5) {
    try {
      const response = await fetch(`${API_BASE}/nlp/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, top_k: topK }),
      });
      
      if (!response.ok) throw new Error('Keyword extraction failed');
      return await response.json();
    } catch (error) {
      console.error('Keyword extraction error:', error);
      return {
        keywords: [],
        error: true
      };
    }
  }

  /**
   * Extract named entities from text
   */
  static async extractEntities(text) {
    try {
      const response = await fetch(`${API_BASE}/nlp/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) throw new Error('Entity extraction failed');
      return await response.json();
    } catch (error) {
      console.error('Entity extraction error:', error);
      return {
        entities: [],
        error: true
      };
    }
  }

  /**
   * Comprehensive NLP analysis (sentiment + intent + keywords + entities)
   */
  static async comprehensiveAnalysis(text) {
    try {
      const response = await fetch(`${API_BASE}/nlp/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      return await response.json();
    } catch (error) {
      console.error('Comprehensive analysis error:', error);
      return {
        sentiment: { sentiment: 'neutral', confidence: 0 },
        intent: { primary_intent: 'general', confidence: 0 },
        keywords: [],
        entities: { entities: [] },
        error: true
      };
    }
  }

  /**
   * Quick analysis for chat messages (lightweight)
   * Returns sentiment and intent only
   */
  static async quickAnalysis(text) {
    try {
      const [sentiment, intent] = await Promise.all([
        this.analyzeSentiment(text),
        this.detectIntent(text)
      ]);

      return {
        sentiment: sentiment.sentiment || 'neutral',
        sentimentConfidence: sentiment.confidence || 0,
        intent: intent.primary_intent || 'general',
        intentConfidence: intent.confidence || 0,
        error: false
      };
    } catch (error) {
      console.error('Quick analysis error:', error);
      return {
        sentiment: 'neutral',
        sentimentConfidence: 0,
        intent: 'general',
        intentConfidence: 0,
        error: true
      };
    }
  }

  /**
   * Get sentiment emoji/color
   */
  static getSentimentEmoji(sentiment) {
    const sentimentMap = {
      'positive': { emoji: '😊', color: '#10B981' },
      'negative': { emoji: '😞', color: '#EF4444' },
      'neutral': { emoji: '😐', color: '#6B7280' },
      'mixed': { emoji: '🤔', color: '#F59E0B' }
    };
    return sentimentMap[sentiment?.toLowerCase()] || sentimentMap['neutral'];
  }

  /**
   * Get intent emoji
   */
  static getIntentEmoji(intent) {
    const intentMap = {
      'greeting': '👋',
      'question': '❓',
      'statement': '💬',
      'command': '⚡',
      'request': '🙏',
      'general': '💭'
    };
    return intentMap[intent?.toLowerCase()] || intentMap['general'];
  }
}

export default NLPService;
