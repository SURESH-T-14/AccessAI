# Real-Time Data - Quick Start

## 🚀 Get Started in 2 Minutes

### Step 1: Import the Service
```javascript
import RealTimeDataService from './services/RealTimeDataService';
```

### Step 2: Choose Your Usage Pattern

#### Pattern A: Fetch All Data Once
```javascript
const data = await RealTimeDataService.fetchAllRealTimeData();
console.log(data);
```

#### Pattern B: Subscribe to Updates
```javascript
const unsubscribe = RealTimeDataService.subscribeToRealTimeUpdates(
  (data) => {
    console.log('Data updated:', data);
  },
  5000 // Every 5 seconds
);

// Stop listening
unsubscribe();
```

#### Pattern C: Use Dashboard Component
```javascript
import RealTimeDataMonitor from './components/RealTimeDataMonitor';

export default function App() {
  return <RealTimeDataMonitor />;
}
```

---

## 📊 Quick Data Access Examples

### Get Flask Status
```javascript
const status = await RealTimeDataService.fetchFlaskStatus();
// { status: 'online', api_endpoints: [...], nlp_capabilities: {...} }
```

### Get Gesture History
```javascript
const history = await RealTimeDataService.fetchGestureHistory();
// { history: [{gesture: 'A', confidence: 95}, ...], total: 10 }
```

### Search the Web
```javascript
const results = await RealTimeDataService.searchWebForRealTimeData('Python');
// { success: true, results: [{title, link, snippet}, ...], count: 5 }
```

### Analyze Text
```javascript
const analysis = await RealTimeDataService.performNLPAnalysis('Great!');
// { success: true, analysis: {sentiment, intent, keywords, ...} }
```

### Translate Text
```javascript
const translated = await RealTimeDataService.translateTextRealTime(
  'Hello',
  'en',
  'es'
);
// { success: true, translatedText: 'Hola' }
```

### Get System Status
```javascript
const status = await RealTimeDataService.getComprehensiveStatus();
// { flask, google, gemini, nlp, system, localStorage, timestamp }
```

---

## 🎯 Common Use Cases

### Use Case 1: Display System Health
```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await RealTimeDataService.getComprehensiveStatus();
    setHealthStatus(status);
  }, 10000);
  
  return () => clearInterval(interval);
}, []);
```

### Use Case 2: Monitor Gesture Detection
```javascript
useEffect(() => {
  const unsubscribe = RealTimeDataService.subscribeToRealTimeUpdates(
    (data) => {
      if (data.gestureHistory?.total > 0) {
        console.log(`Detected ${data.gestureHistory.total} gestures`);
      }
    },
    3000
  );
  
  return unsubscribe;
}, []);
```

### Use Case 3: Check Service Availability
```javascript
const checkServices = async () => {
  const status = await RealTimeDataService.getComprehensiveStatus();
  
  const services = {
    flask: status.flask.status === 'online',
    google: status.google.available,
    gemini: status.gemini.available,
    nlp: status.nlp.sentiment !== undefined
  };
  
  return services;
};
```

### Use Case 4: Real-Time Search
```javascript
const performSearch = async (query) => {
  const results = await RealTimeDataService.searchWebForRealTimeData(query, 5);
  
  if (results.success) {
    return results.results;
  } else {
    console.error('Search failed:', results.error);
    return [];
  }
};
```

### Use Case 5: Text Processing Pipeline
```javascript
const processText = async (text) => {
  // Analyze
  const analysis = await RealTimeDataService.performNLPAnalysis(text);
  
  // Translate if needed
  const translated = await RealTimeDataService.translateTextRealTime(
    text, 'en', 'es'
  );
  
  // Get AI response
  const response = await RealTimeDataService.getChatResponseRealTime(
    [{role: 'user', parts: [{text}]}],
    'You are helpful assistant'
  );
  
  return {
    original: text,
    analysis: analysis.analysis,
    translated: translated.translatedText,
    response: response.response
  };
};
```

---

## 🔍 Testing in Browser Console

```javascript
// 1. Test service is available
RealTimeDataService

// 2. Fetch all data
const data = await RealTimeDataService.fetchAllRealTimeData()
console.table(data)

// 3. Check Flask
const flask = await RealTimeDataService.fetchFlaskStatus()
console.log('Flask:', flask.status)

// 4. Get gestures
const gestures = await RealTimeDataService.fetchGestureHistory()
console.log('Gestures:', gestures.total)

// 5. Test search
const search = await RealTimeDataService.searchWebForRealTimeData('React')
console.log('Search results:', search.count)

// 6. Test translation
const trans = await RealTimeDataService.translateTextRealTime('Hi', 'en', 'fr')
console.log('Translated:', trans.translatedText)

// 7. Subscribe to updates
const unsub = RealTimeDataService.subscribeToRealTimeUpdates(
  (data) => console.log('Update!', data.timestamp),
  5000
)

// 8. Stop subscription
unsub()
```

---

## ⚡ Performance Tips

1. **Don't fetch too frequently**
   ```javascript
   // Good: Update every 5 seconds
   subscribeToRealTimeUpdates(callback, 5000)
   
   // Bad: Update every frame
   subscribeToRealTimeUpdates(callback, 100)
   ```

2. **Use selective fetching**
   ```javascript
   // Good: Get only what you need
   const status = await RealTimeDataService.fetchFlaskStatus()
   
   // Less efficient: Get everything
   const all = await RealTimeDataService.fetchAllRealTimeData()
   ```

3. **Cache results when possible**
   ```javascript
   const cachedStatus = useRef(null);
   
   const getStatus = useCallback(async () => {
     if (Date.now() - cachedStatus.lastFetch < 5000) {
       return cachedStatus.current;
     }
     const data = await RealTimeDataService.fetchFlaskStatus();
     cachedStatus.current = data;
     cachedStatus.lastFetch = Date.now();
     return data;
   }, []);
   ```

---

## 🛠️ Setup Checklist

- [ ] Import RealTimeDataService
- [ ] Verify Flask backend is running
- [ ] Check `.env.local` has required variables
- [ ] Test in browser console
- [ ] Add to your React component
- [ ] Handle errors appropriately
- [ ] Set up auto-refresh interval
- [ ] Test all 6 data sources
- [ ] Read full documentation
- [ ] Deploy confidently

---

## 📚 More Information

- **Full Guide**: `REAL_TIME_DATA_GUIDE.md`
- **Examples**: `src/services/RealTimeDataService.examples.js`
- **Implementation**: `REAL_TIME_DATA_IMPLEMENTATION.md`
- **Dashboard**: `src/components/RealTimeDataMonitor.jsx`

---

## ❓ FAQ

**Q: Which data source should I use?**  
A: Choose based on your needs:
- User chats → Firebase
- Current info → Google Search
- AI responses → Gemini
- Gestures → Flask
- Translations → Argos/Flask
- App state → LocalStorage

**Q: How often should I update?**  
A: 5-10 seconds is good for dashboards, 1 second for monitoring.

**Q: What if a service fails?**  
A: All methods return `{ success: false, error: message }`. Handle gracefully.

**Q: Can I use this in production?**  
A: Yes! All error handling is included.

**Q: How do I stop updates?**  
A: Call the unsubscribe function returned by `subscribeToRealTimeUpdates()`.

---

## 🚀 You're All Set!

Everything is ready to use. Start with:

```javascript
// Test it
const data = await RealTimeDataService.fetchAllRealTimeData()

// Or use the component
import RealTimeDataMonitor from './components/RealTimeDataMonitor'
```

**Happy coding!** 🎉
