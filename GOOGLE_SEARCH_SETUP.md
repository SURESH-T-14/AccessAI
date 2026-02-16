# Google Custom Search Integration Guide

## Setup Complete ✅

Google Custom Search API has been integrated into AccessAI. When users ask questions, the app will automatically fetch real-time data from Google and provide it to the AI.

## Files Added/Modified

### New Files:
1. **`src/services/GoogleSearchService.js`**
   - Handles all Google Custom Search API calls
   - Auto-detects when web search is needed
   - Formats results for AI context

### Modified Files:
1. **`src/App.jsx`**
   - Imported GoogleSearchService
   - Updated handleSend() to perform web searches
   - Provides search results to Gemini AI for context

2. **`.env.local`**
   - Added Google Custom Search API credentials

## Configuration

### Environment Variables (in `.env.local`):
```
VITE_GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyC767zwWYTQmOaKJyYiKKh_TjQB89ny4EQ
VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id_here
```

⚠️ **IMPORTANT**: The API key has been exposed! You should:
1. Go to Google Cloud Console
2. Regenerate the API key
3. Update `.env.local` with the new key
4. Revoke the old key

### Set Up Custom Search Engine (Optional):
If you want to search only specific websites, create a Custom Search Engine:
1. Go to https://programmablesearchengine.google.com/
2. Create a new search engine
3. Get the Search Engine ID
4. Add it to `VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID` in `.env.local`

## How It Works

### Auto-Detection:
The system automatically triggers web search when users ask questions with keywords like:
- "what", "how", "why", "when", "where", "who"
- "latest", "news", "current", "trending"
- "tell me", "find", "search", "look up"
- "real time", "live", "definition"

### Flow:
1. User sends a message
2. System checks if web search is needed
3. GoogleSearchService fetches top 5 results from Google
4. Results are added to system context
5. Gemini AI uses search results to provide accurate, up-to-date answers
6. Response is sent to user

### Example:
**User**: "What's the weather in New York today?"
→ System triggers web search for "weather New York today"
→ Gets real-time weather data
→ Sends to Gemini with context
→ AI provides current weather information

## Key Features

✅ Automatic web search detection
✅ Real-time data fetching from Google
✅ Context-aware AI responses
✅ Fallback if search fails
✅ No breaking changes to existing functionality
✅ Works with all authentication methods

## Testing

To test the integration:
1. Log in to the app
2. Ask a question that requires current information, e.g.:
   - "What are the latest news headlines?"
   - "How do I get started with React?"
   - "What's trending on Twitter right now?"
3. Watch the console for search activity
4. Get AI responses with real-time information

## Troubleshooting

### Search not working?
- Check browser console for errors
- Verify API key is correct
- Check `.env.local` has the credentials
- Ensure Search Engine ID is set (optional but recommended)

### API errors?
- Rate limit hit: Wait a few seconds and retry
- API key invalid: Regenerate in Google Cloud Console
- No results: Try rephrasing the query

## API Limits

- Free Custom Search API: 100 queries/day
- Paid: Up to 10,000 queries/day
- Each query counts toward the limit regardless of results

For production apps, consider upgrading to a paid plan.
