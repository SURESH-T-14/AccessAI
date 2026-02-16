# Quick Reference: Google Cloud Translation Integration

## 🚀 Quick Start

### 1. Get API Key (2 minutes)
```
1. Go to console.cloud.google.com
2. Create new project
3. Enable "Cloud Translation API"
4. Create API Key (Credentials)
5. Restrict to HTTP referrers (optional but recommended)
```

### 2. Add to Environment
```bash
# .env.local
VITE_GOOGLE_TRANSLATE_API_KEY=your_key_here
```

### 3. Restart Server
```bash
npm run dev
```

## 📚 API Reference

### Detect Language
```javascript
const result = await TranslationService.detectLanguage("Hello world");

// Result:
{
  language: "en",           // 2-letter language code
  confidence: 0.95,         // 0-1 confidence score
  isReliable: true,         // Whether detection is reliable
  error: false
}
```

### Translate Text
```javascript
const result = await TranslationService.translate(
  "Hello",        // text
  "es",          // target language
  "en"           // source language (optional)
);

// Result:
{
  translatedText: "Hola",
  detectedSourceLanguage: "en",
  error: false
}
```

### Auto-Translate (Detect + Translate)
```javascript
const result = await TranslationService.autoTranslate(
  "Bonjour",     // text (auto-detects French)
  "es"           // target language
);

// Result:
{
  translatedText: "Hola",
  detectedSourceLanguage: "fr",
  detectionConfidence: 0.99,
  error: false
}
```

## 🎨 Component Usage

### In Translator Component
```jsx
// Already integrated! Just use the component:
<Translator onClose={() => setShowTranslator(false)} />
```

### In Custom Component
```jsx
import TranslationService from './services/TranslationService';

const [translated, setTranslated] = useState("");

const handleTranslate = async () => {
  const result = await TranslationService.autoTranslate(
    "Your text here",
    "es"
  );
  if (!result.error) {
    setTranslated(result.translatedText);
  }
};
```

## 🔧 Configuration

### Supported Languages (100+)
Auto-detect works for all, these are the ones with UI support:

| Code | Language |
|------|----------|
| auto | Auto-detect |
| en | English |
| es | Spanish |
| fr | French |
| de | German |
| hi | Hindi |
| ja | Japanese |
| zh | Chinese |
| pt | Portuguese |
| ru | Russian |
| ar | Arabic |
| it | Italian |
| ko | Korean |

See `TRANSLATOR_SETUP_GUIDE.md` for complete list.

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "API key not configured" | Add `VITE_GOOGLE_TRANSLATE_API_KEY` to `.env.local` |
| "Detection failed" | Check API is enabled in Google Cloud Console |
| Blank translations | Verify API key has correct permissions |
| Slow requests | Normal - API takes 0.5-2s depending on text length |

## 💰 Pricing

| Operation | Cost |
|-----------|------|
| Language Detection | FREE |
| Translation | $15 per 1M characters |
| Free Tier | $300 monthly credit |

## 📝 Code Examples

### Batch Translate Multiple Texts
```javascript
const texts = ["Hello", "Goodbye", "Thank you"];
const results = await TranslationService.batchTranslate(
  texts,
  "es"  // Spanish
);
// Returns array of translation results
```

### Batch Detect Languages
```javascript
const texts = ["Hello", "Bonjour", "Hola"];
const detections = await TranslationService.batchDetectLanguage(texts);
// Returns: [
//   { language: "en", ... },
//   { language: "fr", ... },
//   { language: "es", ... }
// ]
```

### Get Language Name
```javascript
TranslationService.getLanguageName("es");   // "Spanish"
TranslationService.getLanguageName("ja");   // "Japanese"
TranslationService.getLanguageName("auto"); // "Auto-detect"
```

## 🔑 API Endpoints

### Language Detection
```
Method: POST
Endpoint: https://translation.googleapis.com/language/translate/v2/detect
Param: key=YOUR_API_KEY
Body: { "q": "text to detect" }
```

### Translation
```
Method: POST
Endpoint: https://translation.googleapis.com/language/translate/v2
Param: key=YOUR_API_KEY
Body: {
  "q": "text to translate",
  "target": "target_language",
  "source": "source_language" // optional
}
```

## 🔐 Security Notes

✅ API key is safe in `.env.local` (not committed to git)
✅ Restrict API key to your domain in Google Cloud Console
✅ Monitor usage in Google Cloud to prevent unexpected costs
✅ Never commit API keys to version control

## 📖 Full Documentation

See `TRANSLATOR_SETUP_GUIDE.md` for:
- Complete setup instructions
- Detailed API reference
- Error handling
- Production deployment
- Pricing estimation

---

**Last Updated**: January 2026
**API Version**: Google Cloud Translation v2
**Status**: ✅ Production Ready
