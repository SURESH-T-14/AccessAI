# Real-Time Data Fetching - Complete Guide

## Overview

Your AccessAI application fetches real-time data from **6 major sources**. This document explains each source, how it works, and how to fetch data from it.

---

## 📊 Real-Time Data Sources

### 1. **Firebase Firestore** (Chat Messages & User Data)
**Purpose**: Store and sync chat messages, user profiles, and conversation history  
**Type**: Real-time listeners (onSnapshot)  
**Update Frequency**: Instant (event-driven)

#### Location: `src/App.jsx` (lines 555-575)
```javascript
useEffect(() => {
  const messagesRef = collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages");
  const q = query(messagesRef);
  
  const unsubscribe = onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sortedData = data.sort((a, b) => {
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return aTime - bTime;
    });
    setMessages(sortedData);
  });
  
  return unsubscribe;
}, [user, currentChatId, isFirebaseConfigured, db, appId]);
```

#### Data Structure:
```json
{
  "id": "doc_id",
  "text": "user message",
  "sender": "user|bot",
  "timestamp": { "seconds": 1674000000 },
  "nlp": {
    "sentiment": "positive",
    "intent": "question"
  }
}
```

---

### 2. **Google Custom Search API** (Real-Time Web Data)
**Purpose**: Fetch current information from the web for AI context  
**Type**: HTTP REST API  
**Update Frequency**: On-demand (triggered by specific keywords)

#### Location: `src/services/GoogleSearchService.js`

#### Usage Example:
```javascript
const results = await GoogleSearchService.search(query, maxResults);
// Returns: [{ title, link, snippet, displayLink }, ...]
```

#### Auto-Detection Keywords:
- "what", "how", "why", "when", "where", "who"
- "latest", "news", "current", "trending"
- "tell me", "find", "search", "look up"
- "real time", "live", "definition"

#### Configuration Required:
```env
VITE_GOOGLE_CUSTOM_SEARCH_API_KEY=your_api_key
VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_engine_id (optional)
```

---

### 3. **Gemini AI API** (Chat Responses)
**Purpose**: Generate AI responses using Google's Gemini model  
**Type**: HTTP REST API  
**Update Frequency**: Per message (streaming)

#### Location: `src/App.jsx` (lines 721-750)

#### Usage Example:
```javascript
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: chatHistory,
    systemInstruction: { parts: [{ text: systemMessage }] }
  })
});
```

#### Configuration Required:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
```

#### System Message Includes:
- Current date and time
- Web search results (if applicable)
- User context and chat history
- Accessibility-focused instructions

---

### 4. **Flask Backend** (Gesture Detection & NLP)
**Purpose**: Real-time hand gesture recognition and NLP processing  
**Type**: HTTP REST API  
**Update Frequency**: Per frame (video stream) or on-demand

#### Location: `gesture_api_server_simple.py`

#### Key Endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/status` | GET | System status & capabilities |
| `/api/process-frame` | POST | Process video frame for gestures |
| `/api/start-detection` | POST | Start hand detection |
| `/api/stop-detection` | POST | Stop hand detection |
| `/api/gesture-history` | GET | Get last 10 gestures |
| `/api/clear-history` | POST | Clear gesture history |

#### NLP Endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/nlp/sentiment` | POST | Analyze text sentiment |
| `/api/nlp/intent` | POST | Detect user intent |
| `/api/nlp/keywords` | POST | Extract keywords |
| `/api/nlp/entities` | POST | Extract named entities |
| `/api/nlp/summarize` | POST | Summarize text |
| `/api/nlp/analyze` | POST | Comprehensive analysis |

#### Configuration Required:
```env
VITE_FLASK_API_URL=http://localhost:5000
```

---

### 5. **Translation Service** (Argos Translate)
**Purpose**: Free, local text translation  
**Type**: HTTP REST API (via Flask)  
**Update Frequency**: On-demand

#### Location: `gesture_api_server_simple.py` (lines 662-800)

#### Key Endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/translate/supported` | GET | Get supported language pairs |
| `/api/translate/translate` | POST | Translate text |
| `/api/translate/detect` | POST | Detect language |
| `/api/translate/batch` | POST | Batch translate |

#### Usage Example:
```javascript
const response = await fetch('http://localhost:5000/api/translate/translate', {
  method: 'POST',
  body: JSON.stringify({
    text: 'Hello',
    sourceLanguageCode: 'en',
    targetLanguageCode: 'es'
  })
});
// Returns: { translations: [{ translatedText: 'Hola' }] }
```

---

### 6. **LocalStorage** (Client-Side Persistence)
**Purpose**: Persist chats, settings, and user preferences  
**Type**: Browser API  
**Update Frequency**: Automatic (on state change)

#### Location: `src/App.jsx` (lines 214-240)

#### Stored Data:
```javascript
localStorage.getItem('accessai_chats')        // Array of chat objects
localStorage.getItem('accessai_currentChatId') // Current active chat ID
localStorage.getItem('accessai_nextChatId')    // Next chat ID to create
```

---

## 🚀 Using the Real-Time Data Service

### New `RealTimeDataService.js`
Located: `src/services/RealTimeDataService.js`

This unified service provides easy access to all data sources:

### 1. Fetch All Real-Time Data at Once
```javascript
import RealTimeDataService from './services/RealTimeDataService';

const allData = await RealTimeDataService.fetchAllRealTimeData();
console.log(allData);
// Returns: {
//   flaskStatus: {...},
//   gestureHistory: {...},
//   translationLanguages: {...},
//   systemMetrics: {...},
//   googleSearchStatus: {...},
//   geminiStatus: {...},
//   nlpCapabilities: {...},
//   localStorageData: {...},
//   timestamp: "2024-01-20T..."
// }
```

### 2. Subscribe to Continuous Real-Time Updates
```javascript
const unsubscribe = RealTimeDataService.subscribeToRealTimeUpdates(
  (data) => {
    console.log('Updated data:', data);
  },
  5000 // Update every 5 seconds
);

// Later, stop listening:
unsubscribe();
```

### 3. Fetch Specific Data Sources

#### Flask Status
```javascript
const status = await RealTimeDataService.fetchFlaskStatus();
// { status: 'online|offline', ...capabilities }
```

#### Gesture Detection Data
```javascript
const gestureData = await RealTimeDataService.getGestureDetectionData();
// { flaskStatus, gestureHistory, totalGestures, timestamp }
```

#### Web Search Data
```javascript
const searchResults = await RealTimeDataService.searchWebForRealTimeData('Python tutorials');
// { success: true, query, results: [...], count, timestamp }
```

#### NLP Analysis
```javascript
const nlpResults = await RealTimeDataService.performNLPAnalysis('Great to meet you!');
// { success: true, text, analysis: {...}, timestamp }
```

#### Translation
```javascript
const translated = await RealTimeDataService.translateTextRealTime(
  'Hello world',
  'en',
  'es'
);
// { success: true, translatedText: 'Hola mundo', timestamp }
```

#### Chat Response
```javascript
const response = await RealTimeDataService.getChatResponseRealTime(
  chatHistory,
  systemInstruction
);
// { success: true, response: 'AI response...', timestamp }
```

### 4. Gesture Detection Control
```javascript
// Start detection
await RealTimeDataService.startGestureDetection();

// Stop detection
await RealTimeDataService.stopGestureDetection();

// Clear history
await RealTimeDataService.clearGestureHistory();

// Get history
const history = await RealTimeDataService.fetchGestureHistory();
```

### 5. Get Comprehensive System Status
```javascript
const status = await RealTimeDataService.getComprehensiveStatus();
// Returns all Flask, Google, Gemini, NLP, system, and localStorage status
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   App.jsx    │  │ Components   │  │  Services    │          │
│  │              │  │              │  │              │          │
│  │ - Chat UI    │  │ - Gesture    │  │ - Real-Time  │          │
│  │ - Messages   │  │ - Settings   │  │   Data       │          │
│  │ - Gestures   │  │ - Translator │  │ - Google     │          │
│  └──────┬───────┘  └──────┬───────┘  │ - NLP        │          │
│         │                 │          │ - Translate  │          │
│         └─────────┬───────┴──────────┴──────────────┘          │
│                   │                                            │
└───────────────────┼────────────────────────────────────────────┘
                    │
      ┌─────────────┼─────────────┬──────────────┬────────────┐
      │             │             │              │            │
      ▼             ▼             ▼              ▼            ▼
  ┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐
  │Firebase│  │  Google  │  │ Gemini   │  │  Flask   │  │Local   │
  │Firestore  │  Search   │  │   API    │  │Backend   │  │Storage │
  │        │  │   API    │  │          │  │          │  │        │
  │• Chat  │  │          │  │• AI Chat │  │• Gesture │  │• Chats │
  │• User  │  │• Web     │  │  Response│  │  Detection  │• State │
  │  Data  │  │  Data    │  │• Context │  │• NLP     │  │• Prefs │
  └────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘
```

---

## 📡 Real-Time Update Intervals

| Source | Interval | Trigger |
|--------|----------|---------|
| Firebase Messages | Instant | onSnapshot listener |
| Google Search | On-demand | User query contains keywords |
| Gemini Responses | Per message | User sends message |
| Flask Gesture | Per frame | 300ms (optimized) |
| Translation | On-demand | User initiates translation |
| LocalStorage | Automatic | State change |
| System Metrics | 1 second | setInterval |

---

## 🛠️ Environment Configuration

Create or update `.env.local`:

```env
# Firebase
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google
VITE_GOOGLE_CUSTOM_SEARCH_API_KEY=your_search_api_key
VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_engine_id

# Gemini
VITE_GEMINI_API_KEY=your_gemini_api_key

# Flask Backend
VITE_FLASK_API_URL=http://localhost:5000
```

---

## 🔍 Monitoring Real-Time Data

To monitor all real-time data in your browser console:

```javascript
// In browser console:
import RealTimeDataService from './src/services/RealTimeDataService.js';

// Fetch all data once
const data = await RealTimeDataService.fetchAllRealTimeData();
console.table(data);

// Subscribe to continuous updates
const unsubscribe = RealTimeDataService.subscribeToRealTimeUpdates(
  (data) => console.table(data),
  3000
);

// Stop after 30 seconds
setTimeout(unsubscribe, 30000);
```

---

## ✅ Testing All Data Sources

### 1. Test Flask Backend
```bash
curl http://localhost:5000/api/status
```

### 2. Test Gesture History
```bash
curl http://localhost:5000/api/gesture-history
```

### 3. Test Translation Languages
```bash
curl http://localhost:5000/api/translate/supported
```

### 4. Test Google Search
Check browser console after asking a question like "What's the weather today?"

### 5. Test Gemini API
Send a message in the chat interface and check network tab

### 6. Test LocalStorage
```javascript
console.log(localStorage.getItem('accessai_chats'))
```

---

## 📋 Quick Reference

```javascript
// Import the service
import RealTimeDataService from './services/RealTimeDataService';

// All available methods:
RealTimeDataService.fetchAllRealTimeData()
RealTimeDataService.fetchFlaskStatus()
RealTimeDataService.fetchGestureHistory()
RealTimeDataService.fetchSupportedLanguages()
RealTimeDataService.getSystemMetrics()
RealTimeDataService.getGoogleSearchStatus()
RealTimeDataService.getGeminiStatus()
RealTimeDataService.getNLPCapabilities()
RealTimeDataService.getLocalStorageData()
RealTimeDataService.searchWebForRealTimeData(query, maxResults)
RealTimeDataService.getGestureDetectionData()
RealTimeDataService.processFrameRealTime(frameData)
RealTimeDataService.performNLPAnalysis(text)
RealTimeDataService.translateTextRealTime(text, sourceLang, targetLang)
RealTimeDataService.getChatResponseRealTime(messages, systemInstruction)
RealTimeDataService.subscribeToRealTimeUpdates(callback, interval)
RealTimeDataService.getComprehensiveStatus()
RealTimeDataService.startGestureDetection()
RealTimeDataService.stopGestureDetection()
RealTimeDataService.clearGestureHistory()
```

---

## 🚨 Troubleshooting

### Flask Backend Not Responding
- Ensure Flask server is running: `python gesture_api_server_simple.py`
- Check `VITE_FLASK_API_URL` in `.env.local`

### Google Search Not Working
- Verify API key in Google Cloud Console
- Check `VITE_GOOGLE_CUSTOM_SEARCH_API_KEY` is set
- Ensure quota is not exceeded

### Gemini API Errors
- Verify API key is correct
- Check quota in Google Cloud Console
- Ensure `VITE_GEMINI_API_KEY` is set

### LocalStorage Issues
- Check browser storage quota
- Verify localStorage is enabled
- Check browser console for quota exceeded errors

### Translation Not Available
- Ensure Flask backend is running
- Check `/api/translate/supported` endpoint
- Verify language codes are correct (e.g., 'en', 'es')

---

## 📚 Related Documentation

- [Firebase Setup](./FIREBASE_SETUP.md)
- [Google Search Integration](./GOOGLE_SEARCH_SETUP.md)
- [Gesture Recognition](./GESTURE_QUICK_START.md)
- [Translation Guide](./TRANSLATOR_SETUP_GUIDE.md)

---

**Last Updated**: January 28, 2026  
**Service Version**: 1.0  
**Status**: Production Ready ✅
