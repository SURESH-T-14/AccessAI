/**
 * Translation Service using Argos Translate (Local, Free, Open-Source)
 * Falls back to Google Cloud Translation API if available
 * Also supports Gemini and OpenAI APIs for advanced translation
 * No API key required for local translation
 */

const ARGOS_API_BASE = 'http://localhost:5000/api/translate';
const GOOGLE_TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';
const OPENAI_API_BASE = 'https://api.openai.com/v1/chat/completions';

/**
 * Get API key from environment variables (optional, for fallback)
 */
const getGoogleApiKey = () => {
  return import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || '';
};

const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

const getOpenAIApiKey = () => {
  return import.meta.env.VITE_OPENAI_API_KEY || '';
};

export class TranslationService {
  /**
   * Detect language of given text
   * Uses local Argos Translate service
   * @param {string} text - Text to detect language for
   * @returns {Promise<Object>} - Detection result
   */
  static async detectLanguage(text) {
    try {
      // Try Argos Translate first (local)
      const response = await fetch(`${ARGOS_API_BASE}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.error && data.languages?.length > 0) {
          return {
            language: data.languages[0].languageCode,
            confidence: data.languages[0].confidence || 0.8,
            isReliable: true,
            error: false,
            provider: 'argos'
          };
        }
      }

      // Fallback to default
      return {
        language: 'en',
        confidence: 0.5,
        error: true,
        message: 'Could not detect language',
        provider: 'fallback'
      };
    } catch (error) {
      console.error('Language detection error:', error);
      return {
        language: 'en',
        confidence: 0,
        error: true,
        message: error.message,
        provider: 'error'
      };
    }
  }

  /**
   * Translate text using Argos Translate or Google Cloud API
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code
   * @param {string} sourceLanguage - Source language code (optional)
   * @returns {Promise<Object>} - Translation result
   */
  static async translate(text, targetLanguage, sourceLanguage = null) {
    try {
      // Try Argos Translate first (local, free)
      const response = await fetch(`${ARGOS_API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          sourceLanguageCode: sourceLanguage || 'en',
          targetLanguageCode: targetLanguage
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.error && data.translations?.[0]) {
          return {
            translatedText: data.translations[0].translatedText,
            detectedSourceLanguage: data.translations[0].detectedSourceLanguage,
            error: false,
            provider: 'argos'
          };
        }
      }

      // Fallback to Google Cloud API if configured
      const googleKey = getGoogleApiKey();
      if (googleKey) {
        return await this._translateWithGoogle(text, targetLanguage, sourceLanguage, googleKey);
      }

      // If both fail, return original text
      return {
        translatedText: text,
        error: true,
        message: 'Translation service unavailable',
        provider: 'fallback'
      };
    } catch (error) {
      console.error('Translation error:', error);
      
      // Try Google Cloud API as fallback
      const googleKey = getGoogleApiKey();
      if (googleKey) {
        try {
          return await this._translateWithGoogle(text, targetLanguage, sourceLanguage, googleKey);
        } catch (googleError) {
          console.error('Google Cloud fallback also failed:', googleError);
        }
      }

      return {
        translatedText: text,
        error: true,
        message: error.message,
        provider: 'error'
      };
    }
  }

  /**
   * Fallback Google Cloud Translation
   * @private
   */
  static async _translateWithGoogle(text, targetLanguage, sourceLanguage, apiKey) {
    const params = new URLSearchParams({
      key: apiKey,
      q: text,
      target: targetLanguage
    });

    if (sourceLanguage && sourceLanguage !== 'auto') {
      params.append('source', sourceLanguage);
    }

    const response = await fetch(`${GOOGLE_TRANSLATE_API}?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`Google API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const translatedText = data.data?.translations?.[0]?.translatedText;

    if (!translatedText) {
      throw new Error('No translation data returned');
    }

    return {
      translatedText: this.decodeHtmlEntities(translatedText),
      detectedSourceLanguage: sourceLanguage,
      error: false,
      provider: 'google-cloud'
    };
  }

  /**
   * Auto-detect source language and translate
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} - Translation result with detected source language
   */
  static async autoTranslate(text, targetLanguage) {
    try {
      // First detect the language
      const detection = await this.detectLanguage(text);

      // Then translate
      const translation = await this.translate(
        text,
        targetLanguage,
        detection.language
      );

      return {
        ...translation,
        detectedSourceLanguage: detection.language,
        detectionConfidence: detection.confidence
      };
    } catch (error) {
      console.error('Auto-translate error:', error);
      return {
        translatedText: text,
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Get language name from language code
   */
  static getLanguageName(code) {
    const languages = {
      auto: 'Auto-detect',
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      hi: 'Hindi',
      ja: 'Japanese',
      zh: 'Chinese',
      pt: 'Portuguese',
      ru: 'Russian',
      ar: 'Arabic',
      it: 'Italian',
      ko: 'Korean',
      nl: 'Dutch',
      pl: 'Polish',
      tr: 'Turkish',
      id: 'Indonesian',
      th: 'Thai',
      vi: 'Vietnamese',
      sv: 'Swedish',
      da: 'Danish',
      fi: 'Finnish',
      no: 'Norwegian',
      el: 'Greek',
      he: 'Hebrew',
      uk: 'Ukrainian',
      cs: 'Czech',
      hu: 'Hungarian'
    };
    return languages[code] || code.toUpperCase();
  }

  /**
   * Decode HTML entities in translated text
   */
  static decodeHtmlEntities(text) {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'"
    };
    let decoded = text;
    Object.entries(entities).forEach(([entity, char]) => {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    });
    return decoded;
  }

  /**
   * Batch translate texts
   */
  static async batchTranslate(texts, targetLanguage, sourceLanguage = null) {
    try {
      const response = await fetch(`${ARGOS_API_BASE}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: texts,
          sourceLanguageCode: sourceLanguage || 'en',
          targetLanguageCode: targetLanguage
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          return data.translations;
        }
      }

      // Fallback: translate individually
      const results = await Promise.all(
        texts.map(text => this.translate(text, targetLanguage, sourceLanguage))
      );
      return results;
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts.map(text => ({
        translatedText: text,
        error: true
      }));
    }
  }

  /**
   * Get supported languages from local service
   */
  static async getSupportedLanguages() {
    try {
      const response = await fetch(`${ARGOS_API_BASE}/supported`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      return {
        languages: {},
        error: true,
        message: 'Could not fetch supported languages'
      };
    } catch (error) {
      console.error('Error fetching supported languages:', error);
      return {
        languages: {},
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Translate using Gemini AI
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code or name
   * @param {string} sourceLanguage - Source language code or name (optional)
   * @returns {Promise<Object>} - Translation result
   */
  static async translateWithGemini(text, targetLanguage, sourceLanguage = null) {
    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return {
          translatedText: text,
          error: true,
          message: 'Gemini API key not configured. Please add VITE_GEMINI_API_KEY to .env.local',
          provider: 'gemini'
        };
      }

      // Convert language codes to names for better Gemini understanding
      const targetLangName = this.getLanguageName(targetLanguage);
      const sourceLangName = sourceLanguage ? this.getLanguageName(sourceLanguage) : null;

      let prompt;
      if (sourceLangName && sourceLangName !== 'Auto-detect') {
        prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. Return ONLY the translated text, nothing else:\n\n${text}`;
      } else {
        prompt = `Translate the following text to ${targetLangName}. Return ONLY the translated text, nothing else:\n\n${text}`;
      }

      const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ 
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error Response:', errorText);
        return {
          translatedText: text,
          error: true,
          message: `Gemini API Error: ${response.status} ${response.statusText}`,
          provider: 'gemini'
        };
      }

      const data = await response.json();
      
      // Check for safety ratings or blocked content
      if (data.promptFeedback?.blockReason) {
        return {
          translatedText: text,
          error: true,
          message: 'Content blocked by Gemini safety filter',
          provider: 'gemini'
        };
      }

      const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!translatedText) {
        console.error('Gemini response:', data);
        return {
          translatedText: text,
          error: true,
          message: 'No translation data from Gemini',
          provider: 'gemini'
        };
      }

      return {
        translatedText: translatedText.trim(),
        error: false,
        provider: 'gemini',
        model: 'gemini-2.5-flash-preview-09-2025'
      };
    } catch (error) {
      console.error('Gemini translation error:', error);
      return {
        translatedText: text,
        error: true,
        message: `Gemini Error: ${error.message}`,
        provider: 'gemini'
      };
    }
  }

  /**
   * Translate using OpenAI API
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language name
   * @param {string} sourceLanguage - Source language name (optional)
   * @returns {Promise<Object>} - Translation result
   */
  static async translateWithOpenAI(text, targetLanguage, sourceLanguage = null) {
    try {
      const apiKey = getOpenAIApiKey();
      if (!apiKey) {
        return {
          translatedText: text,
          error: true,
          message: 'OpenAI API key not configured',
          provider: 'openai'
        };
      }

      const prompt = `Translate the following text to ${targetLanguage}${sourceLanguage ? ` from ${sourceLanguage}` : ''}. Return only the translated text without any explanation:\n\n${text}`;

      const response = await fetch(OPENAI_API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate the user text accurately and naturally.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        return {
          translatedText: text,
          error: true,
          message: `OpenAI API Error: ${response.status} ${response.statusText}`,
          provider: 'openai'
        };
      }

      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content;

      if (!translatedText) {
        return {
          translatedText: text,
          error: true,
          message: 'No translation data from OpenAI',
          provider: 'openai'
        };
      }

      return {
        translatedText: translatedText.trim(),
        error: false,
        provider: 'openai',
        model: 'gpt-3.5-turbo'
      };
    } catch (error) {
      console.error('OpenAI translation error:', error);
      return {
        translatedText: text,
        error: true,
        message: error.message,
        provider: 'openai'
      };
    }
  }

  /**
   * Translate with intelligent provider selection
   * Tries multiple providers in order: Argos (local) -> Gemini -> OpenAI -> Google
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code/name
   * @param {string} sourceLanguage - Source language code/name (optional)
   * @param {string} preferredProvider - Preferred provider: 'argos', 'gemini', 'openai', 'google'
   * @returns {Promise<Object>} - Translation result with provider info
   */
  static async translateAuto(text, targetLanguage, sourceLanguage = null, preferredProvider = null) {
    // Use 'argos' (local) as default provider first, since it's most reliable
    const providers = ['argos', 'google', 'gemini', 'openai'];
    
    // Reorder providers based on preference
    if (preferredProvider && providers.includes(preferredProvider)) {
      providers.splice(providers.indexOf(preferredProvider), 1);
      providers.unshift(preferredProvider);
    }

    for (const provider of providers) {
      try {
        let result;

        switch (provider) {
          case 'argos':
            result = await this.translate(text, targetLanguage, sourceLanguage);
            if (!result.error) {
              console.log('✓ Translation successful via Argos');
              return result;
            }
            break;

          case 'google':
            const googleKey = getGoogleApiKey();
            if (googleKey) {
              result = await this._translateWithGoogle(text, targetLanguage, sourceLanguage, googleKey);
              if (!result.error) {
                console.log('✓ Translation successful via Google');
                return result;
              }
            }
            break;

          case 'gemini':
            result = await this.translateWithGemini(text, targetLanguage, sourceLanguage);
            if (!result.error) {
              console.log('✓ Translation successful via Gemini');
              return result;
            }
            break;

          case 'openai':
            result = await this.translateWithOpenAI(text, targetLanguage, sourceLanguage);
            if (!result.error) {
              console.log('✓ Translation successful via OpenAI');
              return result;
            }
            break;
        }
      } catch (error) {
        console.warn(`⚠ ${provider} translation failed:`, error.message);
        continue;
      }
    }

    // All providers failed
    return {
      translatedText: text,
      error: true,
      message: 'All translation providers failed',
      provider: 'none'
    };
  }
}

export default TranslationService;
