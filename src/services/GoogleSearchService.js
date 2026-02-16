/**
 * Google Custom Search Service
 * Fetches real-time data from Google when users ask questions
 */

const GOOGLE_SEARCH_API_KEY = import.meta.env.VITE_GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = import.meta.env.VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

// Log configuration status
console.log('🔍 Google Search Service initialized:', {
  hasApiKey: !!GOOGLE_SEARCH_API_KEY,
  hasEngineId: !!GOOGLE_SEARCH_ENGINE_ID
});

class GoogleSearchService {
  /**
   * Search Google for information
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results to return (1-10)
   * @returns {Promise<Array>} Search results
   */
  static async search(query, maxResults = 5) {
    if (!GOOGLE_SEARCH_API_KEY) {
      console.warn('Google Custom Search API key not configured');
      return [];
    }

    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.append('q', query);
      url.searchParams.append('key', GOOGLE_SEARCH_API_KEY);
      
      if (GOOGLE_SEARCH_ENGINE_ID) {
        url.searchParams.append('cx', GOOGLE_SEARCH_ENGINE_ID);
      }
      
      url.searchParams.append('num', Math.min(maxResults, 10));

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error('Google Search API error:', response.statusText);
        return [];
      }

      const data = await response.json();

      if (!data.items) {
        return [];
      }

      // Format results for easier use
      return data.items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink
      }));
    } catch (error) {
      console.error('Google Search Service error:', error);
      return [];
    }
  }

  /**
   * Search and format results as a readable string for AI context
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results
   * @returns {Promise<string>} Formatted search results
   */
  static async searchAndFormat(query, maxResults = 5) {
    const results = await this.search(query, maxResults);

    if (results.length === 0) {
      return `No search results found for "${query}"`;
    }

    let formatted = `🔍 Google Search Results for "${query}":\n\n`;
    
    results.forEach((result, index) => {
      formatted += `${index + 1}. **${result.title}**\n`;
      formatted += `   Link: ${result.link}\n`;
      formatted += `   Summary: ${result.snippet}\n\n`;
    });

    return formatted;
  }

  /**
   * Determine if a query needs web search
   * Returns true if query seems to ask for current information
   * @param {string} query - User query
   * @returns {boolean}
   */
  static shouldSearch(query) {
    const searchKeywords = [
      'what is', 'what are', 'how', 'why', 'when', 'where', 'who',
      'latest', 'news', 'current', 'today', 'now', 'recent',
      'tell me', 'find', 'search', 'look up', 'get information',
      'real time', 'live', 'trending', 'popular',
      'how to', 'tutorial', 'guide', 'definition',
      'date', 'time', 'what is the date', 'what time is it'
    ];

    const lowerQuery = query.toLowerCase();
    return searchKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Get current date and time for context
   * @returns {Object} Current date/time information
   */
  static getCurrentDateTime() {
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: now.toISOString(),
      dateObject: now
    };
  }

  /**
   * Add current date context to search results
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results
   * @returns {Promise<Object>} Search results with date context
   */
  static async searchWithDateContext(query, maxResults = 5) {
    const dateTime = this.getCurrentDateTime();
    const results = await this.search(query, maxResults);

    return {
      currentDate: dateTime.date,
      currentTime: dateTime.time,
      results: results
    };
  }
}

export default GoogleSearchService;
