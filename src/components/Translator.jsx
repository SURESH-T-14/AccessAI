import React, { useState } from 'react';
import './Translator.css';
import TranslationService from '../services/TranslationService';

const Translator = ({ onClose }) => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [translationError, setTranslationError] = useState(null);
  const [translationProvider, setTranslationProvider] = useState('argos');
  const [lastProvider, setLastProvider] = useState(null);

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
    vi: 'Vietnamese'
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setIsTranslating(true);
    setTranslationError(null);
    
    try {
      let result;
      
      // If source language is auto-detect, use autoTranslate
      if (sourceLanguage === 'auto') {
        if (translationProvider === 'auto') {
          result = await TranslationService.translateAuto(inputText, targetLanguage);
        } else {
          result = await TranslationService.autoTranslate(inputText, targetLanguage);
        }
        
        // Set detected language
        if (result.detectedSourceLanguage) {
          setDetectedLanguage({
            code: result.detectedSourceLanguage,
            confidence: result.detectionConfidence || 0
          });
        }
      } else {
        // Use specific source language
        if (translationProvider === 'auto') {
          result = await TranslationService.translateAuto(inputText, targetLanguage, sourceLanguage);
        } else if (translationProvider === 'gemini') {
          result = await TranslationService.translateWithGemini(inputText, targetLanguage, sourceLanguage);
        } else if (translationProvider === 'openai') {
          result = await TranslationService.translateWithOpenAI(inputText, targetLanguage, sourceLanguage);
        } else {
          result = await TranslationService.translate(inputText, targetLanguage, sourceLanguage);
        }
      }

      if (result.error) {
        setTranslationError(result.message || 'Translation failed');
        setTranslatedText('');
      } else {
        setTranslatedText(result.translatedText);
        setLastProvider(result.provider);
        setTranslationError(null);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError('Error translating text');
      setTranslatedText('');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDetectLanguage = async () => {
    if (!inputText.trim()) return;

    try {
      const detection = await TranslationService.detectLanguage(inputText);
      
      if (!detection.error) {
        setDetectedLanguage(detection);
        // Auto-update source language to detected language
        setSourceLanguage(detection.language);
      } else {
        setTranslationError('Could not detect language');
      }
    } catch (error) {
      console.error('Detection error:', error);
      setTranslationError('Language detection failed');
    }
  };

  const swapLanguages = () => {
    if (sourceLanguage !== 'auto') {
      setSourceLanguage(targetLanguage);
      setTargetLanguage(sourceLanguage);
      setInputText(translatedText);
      setTranslatedText('');
      setDetectedLanguage(null);
    }
  };

  return (
    <div className="translator-modal-overlay" onClick={onClose}>
      <div className="translator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="translator-header">
          <h2><img src="/translator.png" alt="Translator" style={{ width: '24px', height: '24px', marginRight: '8px', verticalAlign: 'middle' }} /> Translator</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="translator-content">
          <div className="language-section">
            <div className="language-group">
              <label>From</label>
              <select 
                value={sourceLanguage}
                onChange={(e) => {
                  setSourceLanguage(e.target.value);
                  setDetectedLanguage(null);
                }}
                className="language-select"
              >
                {Object.entries(languages).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              {detectedLanguage && sourceLanguage === 'auto' && (
                <small style={{ marginTop: '0.5rem', color: '#10B981', display: 'block' }}>
                  🔍 Detected: {TranslationService.getLanguageName(detectedLanguage.code)} 
                  ({(detectedLanguage.confidence * 100).toFixed(0)}%)
                </small>
              )}
            </div>

            <button className="swap-btn" onClick={swapLanguages} title="Swap languages" disabled={sourceLanguage === 'auto'}>
              ⇅
            </button>

            <div className="language-group">
              <label>To</label>
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="language-select"
              >
                {Object.entries(languages).filter(([code]) => code !== 'auto').map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div className="language-group">
              <label>Provider</label>
              <select 
                value={translationProvider}
                onChange={(e) => setTranslationProvider(e.target.value)}
                className="language-select"
              >
                <option value="argos">🌍 Local (Argos)</option>
                <option value="auto">🤖 Auto (Best Available)</option>
                <option value="gemini">✨ Gemini AI</option>
                <option value="openai">🔮 OpenAI GPT</option>
              </select>
            </div>
          </div>

          <div className="translator-body">
            <div className="input-section">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to translate..."
                className="translator-textarea"
                rows="6"
              />
              <div className="button-group">
                <button
                  onClick={handleDetectLanguage}
                  disabled={isTranslating || !inputText.trim()}
                  className="detect-btn"
                  title="Auto-detect language"
                >
                  🔍 Detect
                </button>
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating || !inputText.trim()}
                  className="translate-btn"
                >
                  {isTranslating ? '⏳ Translating...' : '🔄 Translate'}
                </button>
              </div>
            </div>

            <div className="output-section">
              <div className="output-label">Translation</div>
              {translationError && (
                <div className="error-message">
                  ⚠️ {translationError}
                </div>
              )}
              <div className="translator-output">
                {translatedText || 'Translation will appear here...'}
              </div>
              {translatedText && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(translatedText);
                    alert('Copied to clipboard!');
                  }}
                  className="copy-btn"
                >
                  📋 Copy
                </button>
              )}
            </div>
          </div>

          <div className="translator-features">
            <div className="feature-item">
              <span className="feature-icon">🌍</span>
              <span>Local & Cloud Translation</span>
            </div>
            <div className="feature-item">
              <img src="/new chat.png" alt="Gemini AI" style={{ width: '20px', height: '20px' }} />
              <span>Gemini AI Translation</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔮</span>
              <span>OpenAI GPT Translation</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <span>Auto Provider Selection</span>
            </div>
            {lastProvider && (
              <div className="feature-item" style={{ gridColumn: '1 / -1', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#10B981' }}>✓ Last translation via: <strong>{lastProvider}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Translator;
