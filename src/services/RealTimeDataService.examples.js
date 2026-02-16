/**
 * Real-Time Data Service - Usage Examples
 * 
 * This file demonstrates how to use the RealTimeDataService
 * to fetch data from all sources in your AccessAI application.
 */

import RealTimeDataService from '../services/RealTimeDataService';

// ============================================================================
// EXAMPLE 1: Fetch All Real-Time Data at Once
// ============================================================================

export async function example_fetchAllData() {
  console.log('📊 Fetching all real-time data...');
  
  const allData = await RealTimeDataService.fetchAllRealTimeData();
  
  console.log('✅ All data fetched:', allData);
  // Returns:
  // {
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
}

// ============================================================================
// EXAMPLE 2: Monitor Real-Time Updates Continuously
// ============================================================================

export function example_subscribeToUpdates() {
  console.log('📡 Subscribing to real-time updates...');
  
  const unsubscribe = RealTimeDataService.subscribeToRealTimeUpdates(
    (data) => {
      console.log('🔄 Data updated at:', data.timestamp);
      
      // React to status changes
      if (data.flaskStatus?.status === 'offline') {
        console.warn('⚠️ Flask backend is offline!');
      }
      
      if (data.gestureHistory?.total > 0) {
        console.log(`👋 ${data.gestureHistory.total} gestures detected`);
      }
      
      // Update UI with new data
      updateDashboard(data);
    },
    5000 // Update every 5 seconds
  );
  
  // To stop listening later:
  // unsubscribe();
  
  return unsubscribe;
}

// ============================================================================
// EXAMPLE 3: Check Flask Backend Status
// ============================================================================

export async function example_checkFlaskStatus() {
  console.log('🐍 Checking Flask backend status...');
  
  const status = await RealTimeDataService.fetchFlaskStatus();
  
  if (status.status === 'online') {
    console.log('✅ Flask is running');
    console.log('Available endpoints:', status.api_endpoints);
    console.log('NLP capabilities:', status.nlp_capabilities);
  } else {
    console.log('❌ Flask is offline');
  }
  
  return status;
}

// ============================================================================
// EXAMPLE 4: Get Gesture Detection Data
// ============================================================================

export async function example_getGestureData() {
  console.log('👋 Getting gesture detection data...');
  
  const gestureData = await RealTimeDataService.getGestureDetectionData();
  
  console.log('Recent gestures:', gestureData.gestureHistory);
  console.log('Total gestures:', gestureData.totalGestures);
  
  // Display in UI
  displayGestureHistory(gestureData);
  
  return gestureData;
}

// ============================================================================
// EXAMPLE 5: Perform Web Search with Real-Time Data
// ============================================================================

export async function example_webSearch() {
  console.log('🔍 Searching for: "latest AI news"...');
  
  const searchResults = await RealTimeDataService.searchWebForRealTimeData(
    'latest AI news',
    5 // Return top 5 results
  );
  
  if (searchResults.success) {
    console.log(`Found ${searchResults.count} results:`);
    searchResults.results.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.title}`);
      console.log(`   ${result.snippet}`);
      console.log(`   ${result.link}`);
    });
  } else {
    console.log('Search failed:', searchResults.error);
  }
  
  return searchResults;
}

// ============================================================================
// EXAMPLE 6: Analyze Text with NLP
// ============================================================================

export async function example_nlpAnalysis() {
  console.log('🧠 Analyzing text with NLP...');
  
  const nlpResults = await RealTimeDataService.performNLPAnalysis(
    'I love this amazing application! It really helps people communicate.'
  );
  
  if (nlpResults.success) {
    console.log('Text:', nlpResults.text);
    console.log('Analysis:', nlpResults.analysis);
    // Results may include: sentiment, intent, keywords, entities, etc.
  } else {
    console.log('NLP analysis failed:', nlpResults.error);
  }
  
  return nlpResults;
}

// ============================================================================
// EXAMPLE 7: Translate Text Real-Time
// ============================================================================

export async function example_translateText() {
  console.log('🌐 Translating text...');
  
  const translated = await RealTimeDataService.translateTextRealTime(
    'Hello, how are you?',
    'en',  // From English
    'es'   // To Spanish
  );
  
  if (translated.success) {
    console.log('Original:', translated.originalText);
    console.log('Translated:', translated.translatedText);
  } else {
    console.log('Translation failed:', translated.error);
  }
  
  return translated;
}

// ============================================================================
// EXAMPLE 8: Get System Status
// ============================================================================

export async function example_getSystemStatus() {
  console.log('💻 Getting comprehensive system status...');
  
  const status = await RealTimeDataService.getComprehensiveStatus();
  
  console.log('Flask Status:', status.flask.status);
  console.log('Google Search:', status.google.available ? '✅' : '❌');
  console.log('Gemini AI:', status.gemini.available ? '✅' : '❌');
  console.log('NLP:', status.nlp);
  console.log('System Memory:', status.system.memory);
  console.log('Stored Chats:', status.localStorage.chats);
  
  return status;
}

// ============================================================================
// EXAMPLE 9: Control Gesture Detection
// ============================================================================

export async function example_controlGestureDetection() {
  console.log('🎥 Controlling gesture detection...');
  
  // Start detection
  const startResult = await RealTimeDataService.startGestureDetection();
  console.log('Detection started:', startResult.success);
  
  // Wait 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Get history
  const history = await RealTimeDataService.fetchGestureHistory();
  console.log('Gestures detected:', history.total);
  
  // Stop detection
  const stopResult = await RealTimeDataService.stopGestureDetection();
  console.log('Detection stopped:', stopResult.success);
  
  // Clear history
  const clearResult = await RealTimeDataService.clearGestureHistory();
  console.log('History cleared:', clearResult.success);
}

// ============================================================================
// EXAMPLE 10: Process Frame Real-Time (for gesture detection)
// ============================================================================

export async function example_processFrameRealTime(frameData) {
  console.log('📸 Processing frame for gesture detection...');
  
  const result = await RealTimeDataService.processFrameRealTime(frameData);
  
  if (result.success) {
    console.log('Detected gesture:', result.gesture);
    console.log('Confidence:', result.confidence, '%');
  } else {
    console.log('Frame processing failed:', result.error);
  }
  
  return result;
}

// ============================================================================
// EXAMPLE 11: Get Chat Response Real-Time
// ============================================================================

export async function example_getChatResponseRealTime() {
  console.log('💬 Getting AI response...');
  
  const messages = [
    {
      role: 'user',
      parts: [{ text: 'What is accessibility in web design?' }]
    }
  ];
  
  const systemInstruction = `You are AccessAI, a helpful assistant for people with accessibility needs. 
  Be concise, empathetic, and clear. Today's date is ${new Date().toLocaleDateString()}.`;
  
  const response = await RealTimeDataService.getChatResponseRealTime(
    messages,
    systemInstruction
  );
  
  if (response.success) {
    console.log('AI Response:', response.response);
  } else {
    console.log('Failed to get response:', response.error);
  }
  
  return response;
}

// ============================================================================
// EXAMPLE 12: React Component Integration
// ============================================================================

export function example_ReactComponentIntegration() {
  // This would be in your React component file
  
  const ComponentCode = `
    import React, { useState, useEffect } from 'react';
    import RealTimeDataService from '../services/RealTimeDataService';
    
    function MyComponent() {
      const [data, setData] = useState(null);
      const [loading, setLoading] = useState(false);
      
      useEffect(() => {
        fetchData();
      }, []);
      
      const fetchData = async () => {
        setLoading(true);
        const allData = await RealTimeDataService.fetchAllRealTimeData();
        setData(allData);
        setLoading(false);
      };
      
      const subscribeToUpdates = () => {
        const unsubscribe = RealTimeDataService.subscribeToRealTimeUpdates(
          (newData) => setData(newData),
          5000
        );
        
        // Clean up on unmount
        return unsubscribe;
      };
      
      useEffect(() => {
        return subscribeToUpdates();
      }, []);
      
      if (loading) return <div>Loading...</div>;
      
      return (
        <div>
          <h2>Flask Status: {data?.flaskStatus?.status}</h2>
          <p>Gestures: {data?.gestureHistory?.total}</p>
          <button onClick={fetchData}>Refresh</button>
        </div>
      );
    }
  `;
  
  return ComponentCode;
}

// ============================================================================
// EXAMPLE 13: Error Handling
// ============================================================================

export async function example_errorHandling() {
  try {
    const data = await RealTimeDataService.fetchAllRealTimeData();
    
    // Check if specific services are available
    if (!data.flaskStatus?.status === 'online') {
      console.warn('Flask backend is not available');
      // Fallback logic
    }
    
    if (!data.googleSearchStatus?.available) {
      console.warn('Google Search is not configured');
      // Use alternative search method
    }
    
    if (!data.geminiStatus?.available) {
      console.warn('Gemini API is not configured');
      // Use alternative AI
    }
    
  } catch (error) {
    console.error('Failed to fetch real-time data:', error);
    // Handle error appropriately
  }
}

// ============================================================================
// EXAMPLE 14: Custom Monitoring Dashboard
// ============================================================================

export async function example_monitoringDashboard() {
  console.log('📊 Setting up custom monitoring dashboard...');
  
  // Create a monitoring object
  const dashboard = {
    startMonitoring() {
      this.unsubscribe = RealTimeDataService.subscribeToRealTimeUpdates(
        (data) => this.onDataUpdate(data),
        3000
      );
    },
    
    stopMonitoring() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    },
    
    onDataUpdate(data) {
      // Check Flask status
      if (data.flaskStatus?.status !== this.lastFlaskStatus) {
        this.lastFlaskStatus = data.flaskStatus?.status;
        console.log('🔔 Flask status changed to:', data.flaskStatus?.status);
      }
      
      // Check gesture count
      if (data.gestureHistory?.total > (this.lastGestureCount || 0)) {
        this.lastGestureCount = data.gestureHistory?.total;
        console.log(`👋 New gesture detected! Total: ${this.lastGestureCount}`);
      }
      
      // Check memory
      if (data.systemMetrics?.memory) {
        const used = data.systemMetrics.memory.usedJSHeapSize;
        const limit = data.systemMetrics.memory.jsHeapSizeLimit;
        const percentage = ((used / limit) * 100).toFixed(1);
        console.log(`💾 Memory usage: ${percentage}%`);
        
        if (percentage > 80) {
          console.warn('⚠️ High memory usage!');
        }
      }
    }
  };
  
  dashboard.startMonitoring();
  
  // Stop after 30 seconds (for example)
  setTimeout(() => dashboard.stopMonitoring(), 30000);
  
  return dashboard;
}

// ============================================================================
// EXAMPLE 15: Export All Examples
// ============================================================================

export const examples = {
  fetchAllData: example_fetchAllData,
  subscribeToUpdates: example_subscribeToUpdates,
  checkFlaskStatus: example_checkFlaskStatus,
  getGestureData: example_getGestureData,
  webSearch: example_webSearch,
  nlpAnalysis: example_nlpAnalysis,
  translateText: example_translateText,
  getSystemStatus: example_getSystemStatus,
  controlGestureDetection: example_controlGestureDetection,
  processFrameRealTime: example_processFrameRealTime,
  getChatResponseRealTime: example_getChatResponseRealTime,
  errorHandling: example_errorHandling,
  monitoringDashboard: example_monitoringDashboard
};

// ============================================================================
// HOW TO USE IN BROWSER CONSOLE
// ============================================================================

/*
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run examples:

// Fetch all data
await examples.fetchAllData();

// Subscribe to updates
const unsub = examples.subscribeToUpdates();

// Check Flask status
await examples.checkFlaskStatus();

// Get gestures
await examples.getGestureData();

// Search web
await examples.webSearch();

// Analyze text
await examples.nlpAnalysis();

// Translate
await examples.translateText();

// System status
await examples.getSystemStatus();

// Gesture control
await examples.controlGestureDetection();

// Error handling
await examples.errorHandling();

// Dashboard
await examples.monitoringDashboard();

// Stop subscription
unsub();
*/
