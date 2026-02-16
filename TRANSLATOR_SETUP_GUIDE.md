# Google Cloud Translation API Setup Guide

## Overview

The Translator tool now uses **Google Cloud Translation API** with **language detection** capability. This provides:

- ✅ Accurate translation powered by Google's neural networks
- ✅ Automatic language detection (identifies source language)
- ✅ Support for 100+ languages
- ✅ Batch translation support
- ✅ HTML entity decoding

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown and select **"New Project"**
3. Enter a project name (e.g., "AccessAI Translator")
4. Click **"Create"**

### 2. Enable Translation API

1. In the Cloud Console, go to **APIs & Services > Library**
2. Search for **"Translation API"** (Google Cloud Translation API)
3. Click on it and select **"Enable"**
4. Wait for the API to be enabled

### 3. Create an API Key

1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials"** and select **"API Key"**
3. Copy the generated API key
4. Click **"Restrict Key"** to add restrictions:
   - **API restrictions**: Select "Cloud Translation API"
   - **Application restrictions**: Select "HTTP referrers (web sites)"
   - Add your domain (for local dev: `http://localhost:*`, for production: your domain)

### 4. Add API Key to Environment

1. Open `.env.local` file in your project root:

```env
VITE_GOOGLE_TRANSLATE_API_KEY=your_api_key_here
```

2. Replace `your_api_key_here` with your actual API key from step 3

3. Restart your development server:

```bash
npm run dev
```

## API Endpoints Used

### Language Detection

**POST** `https://translation.googleapis.com/language/translate/v2/detect`

```json
{
  "q": "Hello, how are you?",
  "key": "YOUR_API_KEY"
}
```

**Response:**
```json
{
  "detections": [
    [
      {
        "language": "en",
        "confidence": 1.0,
        "isReliable": true
      }
    ]
  ]
}
```

### Translation

**POST** `https://translation.googleapis.com/language/translate/v2`

```json
{
  "q": "Hello, how are you?",
  "target": "es",
  "source": "en",
  "key": "YOUR_API_KEY"
}
```

**Response:**
```json
{
  "data": {
    "translations": [
      {
        "translatedText": "Hola, ¿cómo estás?",
        "detectedSourceLanguage": "en"
      }
    ]
  }
}
```

## TranslationService API

### Available Methods

#### 1. `detectLanguage(text)`
Detects the language of given text

```javascript
const result = await TranslationService.detectLanguage("Hello");
// Returns: { language: "en", confidence: 1.0, isReliable: true, error: false }
```

#### 2. `translate(text, targetLanguage, sourceLanguage)`
Translates text from source to target language

```javascript
const result = await TranslationService.translate("Hello", "es", "en");
// Returns: { translatedText: "Hola", detectedSourceLanguage: "en", error: false }
```

#### 3. `autoTranslate(text, targetLanguage)`
Auto-detects source language and translates

```javascript
const result = await TranslationService.autoTranslate("Hello", "es");
// Returns: { translatedText: "Hola", detectedSourceLanguage: "en", detectionConfidence: 1.0 }
```

#### 4. `getLanguageName(code)`
Gets human-readable language name from code

```javascript
TranslationService.getLanguageName("es"); // Returns: "Spanish"
```

#### 5. `batchTranslate(texts, targetLanguage, sourceLanguage)`
Translates multiple texts

```javascript
const results = await TranslationService.batchTranslate(
  ["Hello", "Goodbye"],
  "es"
);
```

#### 6. `batchDetectLanguage(texts)`
Detects language for multiple texts

```javascript
const results = await TranslationService.batchDetectLanguage(
  ["Hello", "Bonjour", "Hola"]
);
```

## Translator Component Features

### User Interface

- **Auto-detect**: Click "🔍 Detect" button to automatically detect input language
- **Language Selection**: Choose source and target languages from dropdown
- **Swap Languages**: Exchange source/target languages (disabled when auto-detect is active)
- **Translate**: Click "🔄 Translate" to translate text
- **Copy**: Copy translated text to clipboard
- **Detected Language Info**: Shows detected language with confidence percentage

### Supported Languages

The component supports auto-detection and manual selection for:

- Auto-detect (automatic)
- English, Spanish, French, German, Hindi
- Japanese, Chinese, Portuguese, Russian, Arabic
- Italian, Korean, Dutch, Polish, Turkish
- Indonesian, Thai, Vietnamese, and more

## Error Handling

The service gracefully handles errors:

- Missing API key → Returns error with helpful message
- Network failures → Returns original text
- API errors → Logs error and provides fallback

## Cost Estimation

Google Cloud Translation API pricing (as of 2024):

- **Detection**: $0.00 per request (free)
- **Translation**: $15.00 per 1 million characters

**Note**: Free tier provides $300 in credits per month for new users.

## Troubleshooting

### "API key not configured"

**Solution**: Ensure `.env.local` has `VITE_GOOGLE_TRANSLATE_API_KEY` set correctly

### "Detection failed"

**Solution**: 
1. Check API key is valid
2. Ensure Cloud Translation API is enabled in Google Cloud Console
3. Check API key restrictions match your domain

### Translations are inaccurate

**Solution**:
1. Try explicitly selecting source language instead of auto-detect
2. Provide more context in the text
3. Check if the language pair is supported

## Integration Example

```javascript
import TranslationService from './services/TranslationService';

// In your component
const handleTranslate = async () => {
  const result = await TranslationService.autoTranslate(
    "Hello world",
    "es"
  );
  
  if (!result.error) {
    console.log(result.translatedText); // "Hola mundo"
    console.log(result.detectedSourceLanguage); // "en"
  }
};
```

## Production Deployment

For production:

1. **Use environment variables** through your hosting provider
2. **Restrict API key** to your domain only
3. **Set up billing alerts** in Google Cloud Console
4. **Consider using OAuth 2.0** for server-side implementation
5. **Implement rate limiting** to prevent abuse

## References

- [Google Cloud Translation API Documentation](https://cloud.google.com/translate/docs)
- [Language Detection API Reference](https://cloud.google.com/translate/docs/reference/rest/v3/DetectLanguage)
- [Translation API Pricing](https://cloud.google.com/translate/pricing)
