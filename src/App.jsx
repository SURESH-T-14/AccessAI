import React, { useState, useEffect, useRef } from "react";
import { 
  Waves, Send, X,
  Bot, User, BrainCircuit, Sparkles
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, doc, deleteDoc, orderBy } from "firebase/firestore";
import GestureRecognition from './components/GestureRecognition';
import LoadingSpinner from './components/LoadingSpinner';
import PerformanceMonitor from './components/PerformanceMonitor';
import ChatSidebar from './components/ChatSidebar';
import Settings from './components/Settings';
import Translator from './components/Translator';
import Login from './components/Login';
import SOS from './components/SOS';
import FileUpload from './components/FileUpload';
import { ToastProvider, useToast } from './components/Toast';
import { validateChatInput, sanitizeInput } from './utils/validation';
import NLPService from './services/NLPService';
import GoogleSearchService from './services/GoogleSearchService';
import EmergencyContactService from './services/EmergencyContactService';
import { TranslationService } from './services/TranslationService';
import useSparklerTrail from './hooks/useSparklerTrail';

/* --- CODE BLOCK RENDERER WITH SYNTAX HIGHLIGHTING --- */
const renderMessageWithCodeHighlight = (text) => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    // Add code block
    const language = match[1] || 'javascript';
    const code = match[2];
    
    parts.push({
      type: 'code',
      language: language,
      content: code
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return parts.map((part, idx) => {
    if (part.type === 'code') {
      // Apply syntax highlighting
      const highlighted = window.hljs ? window.hljs.highlight(part.content, { 
        language: part.language,
        ignoreIllegals: true 
      }).value : part.content;

      return (
        <div key={idx} style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          margin: '0.8rem 0',
          overflow: 'auto',
          fontSize: '0.85rem',
          fontFamily: "'Courier New', monospace",
          lineHeight: '1.5'
        }}>
          <div style={{
            color: '#888',
            fontSize: '0.75rem',
            marginBottom: '0.5rem',
            fontWeight: '600'
          }}>
            {part.language}
          </div>
          <code 
            dangerouslySetInnerHTML={{ __html: highlighted }}
            style={{
              color: '#e8e8e8',
              display: 'block',
              whiteSpace: 'pre',
              tabSize: 4,
              MozTabSize: 4,
              WebkitTabSize: 4
            }}
          />
        </div>
      );
    } else {
      // Process inline code in text parts
      const inlineCodeRegex = /`([^`]+)`/g;
      const textParts = [];
      let textLastIndex = 0;
      let inlineMatch;
      
      while ((inlineMatch = inlineCodeRegex.exec(part.content)) !== null) {
        if (inlineMatch.index > textLastIndex) {
          textParts.push(
            <span key={`t${textLastIndex}`}>
              {part.content.substring(textLastIndex, inlineMatch.index)}
            </span>
          );
        }
        textParts.push(
          <code key={`c${inlineMatch.index}`} style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px',
            fontFamily: "'Courier New', monospace",
            fontSize: '0.9em',
            color: '#e8e8e8'
          }}>
            {inlineMatch[1]}
          </code>
        );
        textLastIndex = inlineMatch.index + inlineMatch[0].length;
      }
      
      if (textLastIndex < part.content.length) {
        textParts.push(
          <span key={`t${textLastIndex}`}>
            {part.content.substring(textLastIndex)}
          </span>
        );
      }
      
      return (
        <div key={idx} style={{ 
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word'
        }}>
          {textParts.length > 0 ? textParts : part.content}
        </div>
      );
    }
  });
};

/* --- FIREBASE CONFIG FROM ENV VARIABLES --- */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-91CJBN7PC9"
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'access-ai-v4';

// Initialize Firebase only if config is provided
let app, auth, db;
const isFirebaseConfigured = firebaseConfig.apiKey && Object.keys(firebaseConfig).every(key => firebaseConfig[key]);

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

/* --- GEMINI API CONFIG FROM ENV VARIABLES --- */
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const GEMINI_URL = apiKey 
  ? `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  : null;
const isGeminiConfigured = Boolean(apiKey);

/* --- SIGN LANGUAGE GLYPHS --- */
const SIGN_GLYPHS = {
  'a': '✊', 'b': '✋', 'c': '🤏', 'd': '☝️', 'e': '✊', 'f': '👌', 'g': '🤏', 'h': '✌️',
  'i': '🤙', 'j': '🤙', 'k': '✌️', 'l': '☝️', 'm': '✊', 'n': '✊', 'o': '👌', 'p': '🤏',
  'q': '🤏', 'r': '✌️', 's': '✊', 't': '✊', 'u': '✌️', 'v': '✌️', 'w': '🖖', 'x': '☝️',
  'y': '🤙', 'z': '☝️', ' ': ' ', '.': '✨', 'hello': '👋', 'yes': '👍', 'no': '👎',
  // Special characters
  '~': '〰️', '`': '´', '!': '❗', '#': '#️⃣', '$': '💲', '%': '🔢', '^': '⬆️', '&': '🤝',
  '*': '⭐', '(': '🟰', ')': '🟰', '_': '➖', '-': '➖', '+': '➕', '=': '🟰',
  '{': '〰️', '}': '〰️', '|': '📏', '/': '📐', ':': '⏰', ';': '🔔', '"': '💬', "'": '💬',
  '<': '◀️', '>': '▶️', ',': '🔹', '?': '❓'
};

/* --- SIGN LANGUAGE IMAGE PATHS --- */
const SIGN_IMAGES = {
  // Letters A-Z
  'a': '/signs/a.jpg', 'b': '/signs/b.jpg', 'c': '/signs/c.jpg', 'd': '/signs/d.jpg', 
  'e': '/signs/e.jpg', 'f': '/signs/f.jpg', 'g': '/signs/g.jpg', 'h': '/signs/h.jpg',
  'i': '/signs/i.jpg', 'j': '/signs/j.jpg', 'k': '/signs/k.jpg', 'l': '/signs/l.jpg', 
  'm': '/signs/m.jpg', 'n': '/signs/n.jpg', 'o': '/signs/o.jpg', 'p': '/signs/p.jpg',
  'q': '/signs/q.jpg', 'r': '/signs/r.jpg', 's': '/signs/s.jpg', 't': '/signs/t.jpg', 
  'u': '/signs/u.jpg', 'v': '/signs/v.jpg', 'w': '/signs/w.jpg', 'x': '/signs/x.jpg',
  'y': '/signs/y.jpg', 'z': '/signs/z.jpg',
  // Numbers 0-9
  '0': '/signs/0.jpg', '1': '/signs/1.jpg', '2': '/signs/2.jpg', '3': '/signs/3.jpg',
  '4': '/signs/4.jpg', '5': '/signs/5.jpg', '6': '/signs/6.jpg', '7': '/signs/7.jpg',
  '8': '/signs/8.jpg', '9': '/signs/9.jpg',
  // Special characters
  ' ': '/signs/space.jpg', '.': '/signs/dot.jpg',
  '~': '/signs/~.jpg', '`': '/signs/`.jpg', '!': '/signs/!.jpg',
  '#': '/signs/#.jpg', '$': '/signs/$.jpg', '%': '/signs/%.jpg',
  '^': '/signs/^.jpg', '&': '/signs/&.jpg', '*': '/signs/star.jpg',
  '(': '/signs/().jpg', ')': '/signs/().jpg', '_': '/signs/_.jpg',
  '-': '/signs/-.jpg', '+': '/signs/+.jpg', '=': '/signs/=.jpg',
  '{': '/signs/{}.jpg', '}': '/signs/{}.jpg', '|': '/signs/line.jpg',
  '/': '/signs/slanding line.jpg', ':': '/signs/two dot.jpg', ';': '/signs/;.jpg',
  '"': '/signs/double qoutes.jpg', "'": '/signs/\'.jpg',
  '<': '/signs/v brases.jpg', '>': '/signs/v brases.jpg', ',': '/signs/,.jpg',
  '?': '/signs/question mark.jpg',
  'hello': '/signs/hello.jpg', 'yes': '/signs/yes.jpg', 'no': '/signs/no.jpg'
};

const translateToSignGlyph = (text) => {
  const lowerText = text.toLowerCase().trim();
  if (SIGN_GLYPHS[lowerText]) return SIGN_GLYPHS[lowerText];
  return lowerText.split('').map(char => SIGN_GLYPHS[char] || char).join('');
};

/**
 * Detect language preference from user input
 * Looks for patterns like "give me in tamil", "respond in tamil", "write in tamil" etc.
 */
const detectLanguagePreference = (text) => {
  const lowerText = text.toLowerCase().trim();
  
  // Map of language patterns to language codes
  const languagePatterns = {
    tamil: ['tamil', 'tamil', 'ta'],
    telugu: ['telugu', 'telgu'],
    kannada: ['kannada', 'kanada'],
    malayalam: ['malayalam', 'malayaalam'],
    marathi: ['marathi', 'marathi'],
    hindi: ['hindi', 'hindustani'],
    bengali: ['bengali', 'bangla'],
    gujarati: ['gujarati'],
    punjabi: ['punjabi', 'panjabi'],
    english: ['english', 'en'],
    spanish: ['spanish', 'español'],
    french: ['french'],
    german: ['german'],
    chinese: ['chinese', 'mandarin'],
    japanese: ['japanese'],
    korean: ['korean'],
    arabic: ['arabic'],
  };

  // Check for language preference patterns
  const patterns = [
    /give\s+me\s+in\s+(\w+)/i,
    /respond\s+in\s+(\w+)/i,
    /write\s+in\s+(\w+)/i,
    /speak\s+in\s+(\w+)/i,
    /translate\s+to\s+(\w+)/i,
    /answer\s+in\s+(\w+)/i,
    /reply\s+in\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const lang = match[1].toLowerCase().trim();
      // Find matching language
      for (const [key, values] of Object.entries(languagePatterns)) {
        if (values.some(v => v.includes(lang) || lang.includes(v))) {
          return key; // Return the language code
        }
      }
    }
  }
  
  return null; // No language preference detected
};

/**
 * Speak text using backend Text-to-Speech API (supports Tamil, Telugu, etc.)
 * Calls the Flask backend TTS endpoint for better language support
 */
const speakWithTranslation = async (text) => {
  if (!text) return;

  try {
    // Detect the language of the text
    const detectionResult = await TranslationService.detectLanguage(text);
    const detectedLang = detectionResult.language || 'en';

    console.log(`🎤 [Backend TTS] Speaking in ${detectedLang}`);

    // Call the backend TTS API
    const ttsResponse = await fetch('http://localhost:5000/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        language: detectedLang
      })
    });

    if (ttsResponse.ok) {
      // Get the audio blob from the response
      const audioBlob = await ttsResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log(`✅ Playing Tamil/Indian language speech`);
      
      // Create and play the audio
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.warn('⚠️ Audio playback failed:', err);
        fallbackToSystemSpeech(text, detectedLang);
      });
    } else {
      console.warn('⚠️ Backend TTS API error:', ttsResponse.status);
      fallbackToSystemSpeech(text, detectedLang);
    }

  } catch (err) {
    console.warn('⚠️ Backend TTS error:', err);
    fallbackToSystemSpeech(text, 'en');
  }
};

/**
 * Fallback to system Web Speech API when backend TTS is not available
 */
const fallbackToSystemSpeech = (text, langCode) => {
  try {
    if (window.speechSynthesis) {
      console.log(`🎤 [Fallback] Using system Web Speech API`);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(voice => voice.lang.startsWith(langCode.split('-')[0]));

      if (matchingVoice) {
        utterance.voice = matchingVoice;
        console.log(`✅ Using voice: ${matchingVoice.name}`);
      }

      window.speechSynthesis.speak(utterance);
    }
  } catch (fallbackErr) {
    console.warn('⚠️ Fallback speech synthesis also failed:', fallbackErr);
  }
};

/**
 * Download image from chat
 */
const downloadImage = (imageData, imageName = 'generated-image') => {
  try {
    // Convert base64 data URL to blob
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `${imageName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('✅ Image downloaded successfully');
  } catch (err) {
    console.error('❌ Download error:', err);
    alert('Failed to download image');
  }
};

/**
 * Dual-Storage Helper: Try Firebase first, fallback to MongoDB
 * Attempts to save data to Firebase, and falls back to MongoDB if Firebase fails
 */
const saveMessageDualStorage = async (userId, chatId, messageData) => {
  // Check if message contains large image (Firebase has 1MB limit)
  const hasLargeImage = messageData.attachment?.isImage && 
                        messageData.attachment?.data && 
                        messageData.attachment.data.length > 500000; // 500KB threshold
  
  // For large images, use MongoDB directly (Firebase has 1MB document limit)
  if (hasLargeImage) {
    console.log(`📦 Large image detected (${(messageData.attachment.data.length / 1024).toFixed(0)}KB), saving to MongoDB...`);
    try {
      // Convert Firebase serverTimestamp() to regular timestamp for MongoDB
      const mongoMessageData = {
        ...messageData,
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };
      
      const response = await fetch('http://localhost:5000/api/save-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chatId,
          messageData: mongoMessageData
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Large image message saved to MongoDB (ID: ${result.messageId})`);
        return { success: true, location: 'mongodb', messageId: result.messageId };
      }
    } catch (mongoError) {
      console.error(`❌ MongoDB save failed: ${mongoError.message}`);
      return { success: false, location: 'none', error: mongoError.message };
    }
  }
  
  // Try Firebase first (primary storage) for normal messages
  try {
    if (db) {
      await addDoc(collection(db, "artifacts", appId, "users", userId, "chats", String(chatId), "messages"), messageData);
      console.log(`✅ Message saved to Firebase`);
      return { success: true, location: 'firebase' };
    }
  } catch (firebaseError) {
    console.warn(`⚠️ Firebase save failed: ${firebaseError.message}, trying MongoDB...`);
    
    // Fallback to MongoDB
    try {
      const response = await fetch('http://localhost:5000/api/save-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chatId,
          messageData: messageData
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Message saved to MongoDB (fallback) (ID: ${result.messageId})`);
        return { success: true, location: 'mongodb', messageId: result.messageId };
      }
    } catch (mongoError) {
      console.error(`❌ MongoDB fallback failed: ${mongoError.message}`);
    }
  }
  
  return { success: false, location: 'none' };
};

/**
 * Sync all Firebase data to MongoDB backup - IMPROVED VERSION
 * Collects all user data from Firebase and sends to MongoDB
 */
const syncFirebaseToMongoDB = async (userId) => {
  try {
    console.log(`[Sync] Starting Firebase to MongoDB sync for user: ${userId}`);
    
    if (!db) {
      return { success: false, message: 'Firebase not initialized' };
    }
    
    const dataToSync = {
      userId: userId,
      messages: [],
      user_profile: {},
      emergency_contacts: []
    };
    
    // 1. FETCH ALL MESSAGES
    console.log('[Sync] Fetching all messages...');
    try {
      const chatsRef = collection(db, "artifacts", appId, "users", userId, "chats");
      const chatsSnapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(chatsRef, (snapshot) => {
          resolve(snapshot);
        });
        setTimeout(() => unsubscribe(), 10000); // Wait max 10 seconds
      });
      
      for (const chatDoc of chatsSnapshot.docs) {
        const chatId = chatDoc.id;
        const messagesRef = collection(chatDoc.ref, "messages");
        
        const messagesSnapshot = await new Promise((resolve) => {
          const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
            resolve(snapshot);
          });
          setTimeout(() => unsubscribe(), 5000);
        });
        
        messagesSnapshot.docs.forEach(msgDoc => {
          dataToSync.messages.push({
            id: msgDoc.id,
            firebaseId: msgDoc.id,
            chatId: chatId,
            ...msgDoc.data()
          });
        });
      }
      console.log(`[Sync] ✅ Fetched ${dataToSync.messages.length} messages`);
    } catch (e) {
      console.warn('[Sync] Could not fetch messages:', e.message);
    }
    
    // 2. FETCH USER PROFILE
    console.log('[Sync] Fetching user profile...');
    try {
      const userDocRef = doc(db, "artifacts", appId, "users", userId);
      const userSnapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
          resolve(snapshot);
        });
        setTimeout(() => unsubscribe(), 5000);
      });
      
      if (userSnapshot.exists()) {
        dataToSync.user_profile = {
          uid: userId,
          firebaseId: userId,
          ...userSnapshot.data()
        };
        console.log(`[Sync] ✅ Fetched user profile: ${dataToSync.user_profile.displayName || userId}`);
      }
    } catch (e) {
      console.warn('[Sync] Could not fetch user profile:', e.message);
    }
    
    // 3. FETCH EMERGENCY CONTACTS
    console.log('[Sync] Fetching emergency contacts...');
    try {
      const contactsRef = collection(db, "artifacts", appId, "users", userId, "emergencyContacts");
      const contactsSnapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(contactsRef, (snapshot) => {
          resolve(snapshot);
        });
        setTimeout(() => unsubscribe(), 5000);
      });
      
      contactsSnapshot.docs.forEach(contactDoc => {
        dataToSync.emergency_contacts.push({
          id: contactDoc.id,
          firebaseId: contactDoc.id,
          ...contactDoc.data()
        });
      });
      console.log(`[Sync] ✅ Fetched ${dataToSync.emergency_contacts.length} emergency contacts`);
    } catch (e) {
      console.warn('[Sync] Could not fetch emergency contacts:', e.message);
    }
    
    // 4. SEND TO BACKEND FOR MONGODB STORAGE
    console.log('[Sync] Sending data to MongoDB...');
    const response = await fetch('http://localhost:5000/api/sync-user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSync)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ SYNC COMPLETE! Synced ${result.synced} total records to MongoDB`);
      console.log(`   - Messages: ${result.details?.messages || 0}`);
      console.log(`   - User profile: ${result.details?.users || 0}`);
      console.log(`   - Emergency contacts: ${result.details?.contacts || 0}`);
      
      return {
        success: true,
        message: `✅ Successfully synced ${result.synced} records from Firebase to MongoDB!\n\nDetails:\n- Messages: ${result.details?.messages || 0}\n- User profile: ${result.details?.users || 0}\n- Emergency contacts: ${result.details?.contacts || 0}`,
        synced: result.synced,
        details: result.details
      };
    } else {
      console.error(`❌ Sync failed: ${result.message}`);
      return {
        success: false,
        message: result.message || 'Sync failed'
      };
    }
  } catch (error) {
    console.error('[Sync Error]', error);
    return {
      success: false,
      message: `Sync error: ${error.message}`
    };
  }
};

/**
 * Get sync status between Firebase and MongoDB
 */
const getSyncStatus = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/sync-status');
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[Sync Status Error]', error);
    return {
      firebase_available: false,
      mongodb_available: false,
      error: error.message
    };
  }
};

/**
 * Generate image from text prompt via Python backend (avoids CORS issues)
 */
const generateImage = async (prompt) => {
  if (!prompt || !prompt.trim()) {
    console.warn('⚠️ No image prompt provided');
    throw new Error('No prompt provided');
  }

  try {
    console.log(`[Image Gen] Starting generation via backend...`);
    console.log(`[Image Gen] Prompt: "${prompt.substring(0, 100)}..."`);
    
    const startTime = Date.now();
    
    // Call Python backend which will proxy to Hugging Face
    const response = await fetch('http://localhost:5000/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });
    
    console.log(`[Image Gen] Backend response status: ${response.status}`);
    
    const result = await response.json();
    console.log(`[Image Gen] Backend result:`, result);
    
    if (!response.ok) {
      console.error(`[Image Gen] Backend error:`, result);
      throw new Error(result.error || `Backend returned ${response.status}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Generation failed');
    }
    
    if (!result.image) {
      console.error(`[Image Gen] No image in response:`, result);
      throw new Error('No image data in response');
    }

    console.log(`✅ [Image Gen] SUCCESS! Total time: ${(Date.now() - startTime) / 1000}s`);
    console.log(`[Image Gen] Image size: ${(result.size / 1024).toFixed(2)} KB`);
    
    return result.image;

  } catch (err) {
    console.error('❌ [Image Gen] FAILED:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    throw new Error(err.message || 'Failed to generate image');
  }
};

/**
 * Detect if user is asking for image generation
 * Patterns: "generate image", "create image", "draw", "sketch", "image of", "picture of", etc.
 */
const detectImageGenerationRequest = (text) => {
  const patterns = [
    /generate\s+(?:an?\s+)?image/i,
    /create\s+(?:an?\s+)?image/i,
    /draw\s+(?:an?\s+)?image/i,
    /make\s+(?:an?\s+)?image/i,
    /sketch\s+(?:an?\s+)?image/i,
    /picture\s+of/i,
    /image\s+of/i,
    /visual\s+of/i,
    /show\s+me\s+(?:an?\s+)?image/i,
    /show\s+me\s+(?:a\s+)?picture/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      // Extract the subject (what to draw)
      // e.g., "generate image of banana" -> "banana"
      const match = text.match(/(?:of|for|:)\s+(.+?)$/i) || 
                    text.match(/image\s+(?:of\s+)?(.+?)$/i) ||
                    text.match(/picture\s+(?:of\s+)?(.+?)$/i) ||
                    text.match(/draw[^:]*:?\s+(.+?)$/i);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      // If no subject found, use the whole text minus the command
      return text.replace(pattern, '').trim();
    }
  }

  return null;
};

const App = () => {
  const { error: showError } = useToast();
  
  // Enable sparkler trail effect on cursor movement
  useSparklerTrail();
  
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [isCamOpen, setIsCamOpen] = useState(false);
  const [currentSign, setCurrentSign] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [preferredResponseLanguage, setPreferredResponseLanguage] = useState('en'); // Track user's preferred response language
  const [showGesturePanel, setShowGesturePanel] = useState(false);
  const [showFileUploadPanel, setShowFileUploadPanel] = useState(false);
  const [currentFileAttachment, setCurrentFileAttachment] = useState(null); // Store current file attachment
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState("");
  const [lastAddedGesture, setLastAddedGesture] = useState("");
  const [lastGestureTime, setLastGestureTime] = useState(0);
  const [gestureHistory, setGestureHistory] = useState([]);
  // Add transcript state for voice input
  const [transcript, setTranscript] = useState("");
  const [animatedGlyph, setAnimatedGlyph] = useState("");
  const [animatedImage, setAnimatedImage] = useState(null);
  const [glyphIndex, setGlyphIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  
  // Emergency SOS System
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  
  // Image Preview Modal
  const [imagePreviewModal, setImagePreviewModal] = useState({
    isOpen: false,
    imageData: null,
    imageName: null
  });
  
  // Multi-Chat Management with localStorage persistence
  const [chats, setChats] = useState(() => {
    // Load chats from localStorage on mount
    const saved = localStorage.getItem('accessai_chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : [{ id: 1, name: 'Chat 1', messages: [], timestamp: new Date() }];
      } catch (err) {
        console.error('Failed to parse saved chats:', err);
        return [{ id: 1, name: 'Chat 1', messages: [], timestamp: new Date() }];
      }
    }
    return [{ id: 1, name: 'Chat 1', messages: [], timestamp: new Date() }];
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    // Load currentChatId from localStorage
    const saved = localStorage.getItem('accessai_currentChatId');
    return saved ? parseInt(saved) : 1;
  });
  const [nextChatId, setNextChatId] = useState(() => {
    // Calculate next chat ID from existing chats
    const saved = localStorage.getItem('accessai_nextChatId');
    if (saved) return parseInt(saved);
    // Default to 2 or find max ID + 1
    return 2;
  });
  
  // Settings State
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState('medium');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [language, setLanguage] = useState('en');
  const [showSettings, setShowSettings] = useState(false);
  const [showTranslator, setShowTranslator] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Engagement Features State
  // 1. Streak & Achievements
  const [userStats, setUserStats] = useState(() => {
    const saved = localStorage.getItem('accessai_userStats');
    return saved ? JSON.parse(saved) : {
      currentStreak: 0,
      lastChatDate: null,
      totalChatsCount: 0,
      achievements: [],
      totalMessagesCount: 0,
      topicsExplored: []
    };
  });
  
  // 2. Suggestions - Store per message
  const [messageSuggestions, setMessageSuggestions] = useState({});
  const [loadingSuggestions, setLoadingSuggestions] = useState({});
  
  // 3. YouTube Videos - Store per message
  const [messageYoutubeResults, setMessageYoutubeResults] = useState({});
  const [loadingYoutube, setLoadingYoutube] = useState({});
  
  // 4. Action Buttons (Expanded Message View)
  const [expandedMessage, setExpandedMessage] = useState(null);
  
  // ========== NEW FEATURES ==========
  
  // Feature 4: Message Editing
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  
  // Feature 5: Quick Chat Templates
  const [showTemplates, setShowTemplates] = useState(false);
  const chatTemplates = [
    { id: 1, label: '📚 Learn Something New', text: 'Teach me about ' },
    { id: 2, label: '🏆 Help with Homework', text: 'Can you help me with this: ' },
    { id: 3, label: '💭 Brainstorm Ideas', text: 'Help me brainstorm ideas for: ' },
    { id: 4, label: '🐛 Fix a Bug', text: 'I have a bug in my code: ' },
    { id: 5, label: '📝 Write Content', text: 'Write a ' },
    { id: 6, label: '❓ Ask a Question', text: 'I have a question about: ' }
  ];
  
  // Feature 9: Keyboard Shortcuts
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Feature 10: Voice Commands
  const [isListeningCommands, setIsListeningCommands] = useState(false);  // For voice commands only
  const [voiceText, setVoiceText] = useState('');
  const [isVoiceCommandMode, setIsVoiceCommandMode] = useState(false);  // JARVIS-like mode - voice controls everything
  // Legacy fallback state for compatibility
  const isListening = isListeningCommands;
  
  // Performance Metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    detectionTime: 0,
    apiTime: 0,
    totalLatency: 0,
    memoryUsage: 0,
    confidence: 0,
    frameCount: 0
  });
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const fpsRef = useRef(0);
  const previousChatIdRef = useRef(null); // Track previous chat to detect changes

  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const canvasRef = useRef(null);
  const commandRecognitionRef = useRef(null);  // Separate ref for voice commands
  const voiceInputRef = useRef(null);  // Separate ref for voice input/dictation
  const mediaStreamRef = useRef(null);
  const voiceCommandModeRef = useRef(false);  // Track JARVIS mode for event handlers
  // Legacy fallback (for compatibility)
  const recognitionRef = commandRecognitionRef;

  // Chat Management Functions
  const getCurrentChat = () => chats.find(chat => chat.id === currentChatId);
  
  const createNewChat = () => {
    const newChat = {
      id: nextChatId,
      name: `Chat ${nextChatId}`,
      messages: [],
      timestamp: new Date()
    };
    setChats([...chats, newChat]);
    setCurrentChatId(nextChatId); // This will trigger Firestore listener to clear and load empty chat
    setNextChatId(nextChatId + 1);
    setInputText("");
    setMessages([]); // Ensure messages are empty for welcome screen
    setIsThinking(false); // Ensure not thinking so welcome screen shows
    setCurrentSign(""); // Clear any sign display
  };
  
  const switchChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
      setInputText("");
    }
  };
  
  const renameChat = (chatId, newName) => {
    setChats(chats.map(chat => 
      chat.id === chatId ? { ...chat, name: newName } : chat
    ));
  };
  
  const deleteChat = (chatId) => {
    if (chats.length === 1) {
      alert("Cannot delete the last chat!");
      return;
    }
    const newChats = chats.filter(chat => chat.id !== chatId);
    setChats(newChats);
    if (currentChatId === chatId) {
      setCurrentChatId(newChats[0].id);
      setMessages(newChats[0].messages);
    }
  };
  
  const updateCurrentChatMessages = (newMessages) => {
    setMessages(newMessages);
    setChats(chats.map(chat => 
      chat.id === currentChatId ? { ...chat, messages: newMessages } : chat
    ));
  };

  // ========== ENGAGEMENT FEATURES HELPER FUNCTIONS ==========
  
  // 1. Streak Management
  const updateStreak = () => {
    const today = new Date().toDateString();
    const lastDate = userStats.lastChatDate?.toString?.() || userStats.lastChatDate;
    const lastDateTime = lastDate ? new Date(lastDate).toDateString() : null;
    
    let newStreak = userStats.currentStreak || 0;
    
    if (lastDateTime !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDateTime === yesterday.toDateString()) {
        newStreak += 1;
      } else if (lastDateTime !== today) {
        newStreak = 1;
      }
    }
    
    const updatedStats = {
      ...userStats,
      currentStreak: newStreak,
      lastChatDate: new Date(),
      totalMessagesCount: (userStats.totalMessagesCount || 0) + 1,
      totalChatsCount: (userStats.totalChatsCount || 0) + 1
    };
    
    setUserStats(updatedStats);
    localStorage.setItem('accessai_userStats', JSON.stringify(updatedStats));
    return newStreak;
  };
  
  // 2. Achievements/Badges
  const checkAndAddAchievements = (topic) => {
    const newAchievements = [...(userStats.achievements || [])];
    const topicsExplored = new Set(userStats.topicsExplored || []);
    
    topicsExplored.add(topic);
    
    // Achievement logic
    const achievementMap = {
      'First Message': userStats.totalMessagesCount === 1,
      'Chatty': (userStats.totalMessagesCount || 0) >= 10,
      'Conversationalist': (userStats.totalMessagesCount || 0) >= 50,
      'ChatMaster': (userStats.totalMessagesCount || 0) >= 100,
      'Week Streak': (userStats.currentStreak || 0) >= 7,
      'Month Streak': (userStats.currentStreak || 0) >= 30,
      'Knowledge Explorer': topicsExplored.size >= 5
    };
    
    Object.entries(achievementMap).forEach(([badge, condition]) => {
      if (condition && !newAchievements.includes(badge)) {
        newAchievements.push(badge);
      }
    });
    
    const updatedStats = {
      ...userStats,
      achievements: newAchievements,
      topicsExplored: Array.from(topicsExplored)
    };
    
    setUserStats(updatedStats);
    localStorage.setItem('accessai_userStats', JSON.stringify(updatedStats));
  };
  
  // 3. Generate Suggestions
  const generateSuggestions = async (botMessage, messageId) => {
    if (!messageId) return;
    
    try {
      setLoadingSuggestions(prev => ({ ...prev, [messageId]: true }));
      const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000'}/api/generate-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botMessage })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessageSuggestions(prev => ({ 
          ...prev, 
          [messageId]: data.suggestions || [] 
        }));
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [messageId]: false }));
    }
  };
  
  // 4. YouTube Search
  const searchYoutube = async (query, messageId) => {
    if (!messageId) return;
    
    try {
      setLoadingYoutube(prev => ({ ...prev, [messageId]: true }));
      const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000'}/api/youtube-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessageYoutubeResults(prev => ({ 
          ...prev, 
          [messageId]: data.videos || [] 
        }));
      }
    } catch (err) {
      console.error('Error searching YouTube:', err);
    } finally {
      setLoadingYoutube(prev => ({ ...prev, [messageId]: false }));
    }
  };
  
  // ========== NEW FEATURE FUNCTIONS ==========
  
  // Feature 4: Message Editing
  const editMessage = (messageId, newText) => {
    // Remove the old user message and any bot response that followed it
    const messageIdx = messages.findIndex(m => m.id === messageId || messages.indexOf(m) === messageId);
    
    let filteredMessages = [...messages];
    
    if (messageIdx >= 0) {
      // Remove the user message
      filteredMessages.splice(messageIdx, 1);
      
      // If the next message is a bot response, remove it too
      if (messageIdx < filteredMessages.length && filteredMessages[messageIdx]?.sender === 'bot') {
        filteredMessages.splice(messageIdx, 1);
      }
    }
    
    // Update messages list (removes old message and bot response)
    updateCurrentChatMessages(filteredMessages);
    
    // Close editing mode
    setEditingMessageId(null);
    setEditingText('');
    
    // Clear input and automatically send the edited message
    setInputText("");
    setIsThinking(true);
    
    // Call handleSend with the new edited text after state updates
    setTimeout(() => {
      handleSend(newText);
    }, 0);
  };
  
  // Feature: Delete Specific Conversation (User Message + Bot Response)
  const deleteConversation = (messageId) => {
    try {
      // Find message by ID or by index
      const messageIdx = messages.findIndex((m, idx) => m.id === messageId || idx === messageId);
      
      if (messageIdx < 0) {
        console.warn('Message not found:', messageId);
        return;
      }
      
      const message = messages[messageIdx];
      if (message.sender !== 'user') {
        console.warn('Can only delete user messages');
        return;
      }
      
      let messagesToDelete = [messageIdx];
      
      // If next message is bot response, mark it for deletion too
      if (messageIdx + 1 < messages.length && messages[messageIdx + 1].sender === 'bot') {
        messagesToDelete.push(messageIdx + 1);
      }
      
      // Remove messages in reverse order to avoid index issues
      let updatedMessages = messages.filter((_, idx) => !messagesToDelete.includes(idx));
      
      // Ensure all remaining messages have unique IDs
      updatedMessages = updatedMessages.map((msg, idx) => {
        if (!msg.id) {
          return { ...msg, id: `msg-${Date.now()}-${idx}` };
        }
        return msg;
      });
      
      // Update local state FIRST
      setMessages(updatedMessages);
      setChats(chats.map(chat => 
        chat.id === currentChatId ? { ...chat, messages: updatedMessages } : chat
      ));
      
      console.log(`🗑️ Deleted conversation pair (${messagesToDelete.length} messages removed)`);
      
      // Update Firebase if configured (non-blocking)
      if (user && db && isFirebaseConfigured && currentChatId) {
        // Validate parameters are strings
        const uid = typeof user.uid === 'string' ? user.uid : String(user.uid);
        const chatId = typeof currentChatId === 'string' ? currentChatId : String(currentChatId);
        
        if (uid && chatId) {
          try {
            const chatRef = doc(db, 'users', uid, 'chats', chatId);
            updateDoc(chatRef, {
              messages: updatedMessages,
              updatedAt: serverTimestamp()
            }).then(() => {
              console.log('✅ Firebase deletion synced');
            }).catch(err => {
              if (err.code === 'permission-denied') {
                console.warn('⚠️ Firebase permission denied - local deletion saved');
              } else {
                console.error('Firebase sync error (local deletion preserved):', err.code);
              }
            });
          } catch (firebaseErr) {
            console.warn('⚠️ Firebase not available - local deletion saved');
          }
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };
  
  // Feature 5: Smart Template Insertion
  const insertTemplate = (template) => {
    setInputText(template.text);
    setShowTemplates(false);
  };
  
  // Feature 9: Message Search
  const searchMessages = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = messages.filter(m =>
      m.text.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(results);
  };
  
  // Feature 10: Voice Commands Setup
  useEffect(() => {
    // Keep voice command mode ref in sync with state
    voiceCommandModeRef.current = isVoiceCommandMode;
  }, [isVoiceCommandMode]);
  
  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser');
      return;
    }
    
    if (commandRecognitionRef.current) return; // Already initialized
    
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('🎙️ Voice commands listening started...');
        setIsListeningCommands(true);
      };
      
      recognition.onend = () => {
        console.log('🎙️ Voice commands listening ended');
        // If JARVIS mode is still active, restart listening for next command
        if (isVoiceCommandMode) {
          console.log('🔄 Restarting JARVIS listening...');
          try {
            setTimeout(() => {
              if (commandRecognitionRef.current && isVoiceCommandMode) {
                commandRecognitionRef.current.start();
              }
            }, 100);
          } catch (err) {
            console.error('Failed to restart listening:', err);
            setIsListeningCommands(false);
          }
        } else {
          setIsListeningCommands(false);
        }
      };
      
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            processVoiceCommand(transcript.toLowerCase());
          } else {
            interim += transcript;
          }
        }
        if (interim) setVoiceText(interim);
      };
      
      recognition.onerror = (event) => {
        console.error('🎙️ Voice commands error:', event.error);
        setIsListeningCommands(false);
        setVoiceText('');
      };
      
      commandRecognitionRef.current = recognition;
      console.log('✅ Voice commands initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Voice Commands:', error);
    }
  }, []);

  // Feature 10B: Initialize Voice Input (Separate from Commands)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser');
      return;
    }
    
    if (voiceInputRef.current) return; // Already initialized
    
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('🎤 Voice input started...');
      };
      
      recognition.onend = () => {
        console.log('🎤 Voice input ended');
      };
      
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // Add final transcript to input field
            setInputText(prev => prev + (prev ? ' ' : '') + transcript);
          } else {
            interim += transcript;
          }
        }
        // Show interim results as you speak
        if (interim) setVoiceText(interim);
      };
      
      recognition.onerror = (event) => {
        console.error('🎤 Voice input error:', event.error);
        setVoiceText('');
      };
      
      voiceInputRef.current = recognition;
      console.log('✅ Voice input (dictation) initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Voice Input:', error);
    }
  }, []);
  
  // Feature 10: Process Voice Commands - JARVIS-like voice control with wake word
  const processVoiceCommand = (command) => {
    const cleanCommand = command.trim().toLowerCase();
    console.log('🎙️ Recognized command:', cleanCommand);
    
    // CHECK FOR WAKE WORD "HEY JARVIS" / "JARVIS"
    if (cleanCommand.includes('hey jarvis') || cleanCommand.includes('jarvis')) {
      console.log('🤖 WAKE WORD DETECTED! Activating JARVIS mode...');
      setIsVoiceCommandMode(true);
      setIsListeningCommands(true);
      setVoiceText('🤖 Ready!');
      setTimeout(() => setVoiceText(''), 2000);
      return;
    }
    
    // Only process commands if in JARVIS mode
    if (!isVoiceCommandMode) {
      return; // Wait for wake word
    }
    
    setVoiceText('');
    
    if (!cleanCommand) return;
    
    // SEND MESSAGE - Extract message content before "send"
    if (cleanCommand.includes('send') || cleanCommand.includes('submit')) {
      console.log('📤 Sending message via voice');
      
      // Extract message by removing "send" or "submit" keywords
      let messageContent = cleanCommand
        .replace(/\bsend\b/gi, '')
        .replace(/\bsubmit\b/gi, '')
        .trim();
      
      // If voice detected a message, send it
      if (messageContent) {
        console.log('🎤 Voice message:', messageContent);
        handleSend(messageContent); // Pass message text directly
      } else if (inputText.trim()) {
        // If no message from voice but input has text, just send it
        console.log('📤 Sending existing input');
        handleSend(inputText);
      } else {
        // No message to send
        console.warn('⚠️ No message to send');
        setVoiceText('❌ Say something before "send"');
        setTimeout(() => setVoiceText(''), 3000);
      }
      return;
    } 
    
    // NEW CHAT
    if (cleanCommand.includes('new chat') || cleanCommand.includes('create') || cleanCommand.includes('new conversation')) {
      console.log('🆕 Creating new chat');
      createNewChat();
      return;
    } 
    
    // DELETE CHAT
    if (cleanCommand.includes('delete chat') || cleanCommand.includes('remove chat')) {
      console.log('🗑️ Deleting current chat');
      if (chats.length > 0) {
        const newChats = chats.filter(c => c.id !== currentChatId);
        setChats(newChats);
        if (newChats.length > 0) setCurrentChatId(newChats[0].id);
      }
      return;
    }
    
    // CLEAR CHAT
    if (cleanCommand.includes('clear') || cleanCommand.includes('clear messages')) {
      console.log('🧹 Clearing chat history');
      setMessages([]);
      return;
    }
    
    // SEARCH
    if (cleanCommand.includes('search') || cleanCommand.includes('find')) {
      console.log('🔍 Opening search');
      setShowSearch(true);
      return;
    } 
    
    // SHOW TEMPLATES
    if (cleanCommand.includes('template') || cleanCommand.includes('show template')) {
      console.log('📋 Showing templates');
      setShowTemplates(true);
      return;
    }
    
    // SHOW SETTINGS
    if (cleanCommand.includes('settings') || cleanCommand.includes('preference')) {
      console.log('⚙️ Opening settings');
      setShowSettings(true);
      return;
    }
    
    // STOP/CLOSE/EXIT
    if (cleanCommand.includes('stop') || cleanCommand.includes('close') || cleanCommand.includes('exit')) {
      console.log('❌ Closing JARVIS');
      setShowSearch(false);
      setShowTemplates(false);
      setIsVoiceCommandMode(false);
      setIsListeningCommands(false);
      if (commandRecognitionRef.current) {
        commandRecognitionRef.current.stop();
      }
      return;
    }
    
    // If no command matched and in voice mode, add to input
    if (isVoiceCommandMode) {
      console.log('📝 Adding speech to input:', cleanCommand);
      setInputText(prev => prev + (prev ? ' ' : '') + cleanCommand);
    }
  };
  
  // Feature 10B: Toggle Voice Command Mode (JARVIS wake word listener)
  const toggleVoiceCommandMode = () => {
    if (!commandRecognitionRef.current) {
      console.error('🎙️ Voice commands not initialized');
      alert('Voice recognition is not available in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    try {
      if (isListeningCommands) {
        // Stop listening for wake word
        commandRecognitionRef.current.stop();
        setIsListeningCommands(false);
        setIsVoiceCommandMode(false);
        voiceCommandModeRef.current = false; // Update ref
        setVoiceText('');
        console.log('🎙️ Stopped listening for wake word');
      } else {
        // Start listening for wake word "Hey Jarvis"
        setVoiceText('🎤 Say "Hey Jarvis" to activate...');
        commandRecognitionRef.current.start();
        setIsListeningCommands(true);
        console.log('🎙️ Listening for wake word "Hey Jarvis"... (like Alexa)');
      }
    } catch (error) {
      console.error('Error toggling voice command mode:', error);
    }
  };
  
  // Feature 10: Toggle Voice Commands (Separate from Voice Input)
  const toggleVoiceCommands = () => {
    if (!commandRecognitionRef.current) {
      console.error('🎙️ Voice commands not initialized');
      alert('Voice recognition is not available in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    try {
      if (isListeningCommands) {
        commandRecognitionRef.current.stop();
        setIsListeningCommands(false);
        setVoiceText('');
      } else {
        setVoiceText('');
        commandRecognitionRef.current.start();
        setIsListeningCommands(true);
      }
    } catch (error) {
      console.error('Error toggling voice commands:', error);
      setIsListeningCommands(false);
    }
  };
  
  // Feature 9: Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K: Open Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(!showSearch);
      }
      
      // Ctrl+Enter or Cmd+Enter: Send Message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (inputText.trim()) handleSend();
      }
      
      // Ctrl+Shift+N or Cmd+Shift+N: New Chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        createNewChat();
      }
      
      // Escape: Close all modals
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowTemplates(false);
        setImagePreviewModal({ ...imagePreviewModal, isOpen: false });
        setExpandedMessage(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputText, showSearch, showTemplates, imagePreviewModal, expandedMessage]);
  
  // Persist chats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('accessai_chats', JSON.stringify(chats));
    } catch (err) {
      console.error('Failed to save chats to localStorage:', err);
    }
  }, [chats]);

  // Persist currentChatId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('accessai_currentChatId', String(currentChatId));
    } catch (err) {
      console.error('Failed to save currentChatId to localStorage:', err);
    }
  }, [currentChatId]);

  // Persist nextChatId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('accessai_nextChatId', String(nextChatId));
    } catch (err) {
      console.error('Failed to save nextChatId to localStorage:', err);
    }
  }, [nextChatId]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser({ isAnonymous: true, uid: 'demo-user' });
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Load emergency contacts when user logs in
        if (db) {
          const contacts = await EmergencyContactService.getEmergencyContacts(u.uid, db);
          setEmergencyContacts(contacts);
        }
      } else {
        setUser(null); // User not logged in, show login screen
        setEmergencyContacts([]);
      }
    });
    
    return unsubscribe;
  }, []);

  // Helper function to draw hand landmarks on canvas with numbers
  const drawHand = (canvas, hands) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match video dimensions
    if (videoRef.current) {
      const width = videoRef.current.videoWidth || videoRef.current.offsetWidth;
      const height = videoRef.current.videoHeight || videoRef.current.offsetHeight;
      
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!hands || hands.length === 0) {
      return;
    }
    
    const hand = hands[0];
    const keypoints = hand.keypoints || [];
    
    // Landmark connections (MediaPipe hand topology)
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [5, 6], [6, 7], [7, 8], // Index
      [9, 10], [10, 11], [11, 12], // Middle
      [13, 14], [14, 15], [15, 16], // Ring
      [17, 18], [18, 19], [19, 20], // Pinky
      [0, 5], [5, 9], [9, 13], [13, 17], [0, 17] // Connections between fingers
    ];
    
    // Draw connections (bones)
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    connections.forEach(([start, end]) => {
      if (keypoints[start] && keypoints[end]) {
        ctx.beginPath();
        ctx.moveTo(keypoints[start].x, keypoints[start].y);
        ctx.lineTo(keypoints[end].x, keypoints[end].y);
        ctx.stroke();
      }
    });
    
    // Draw landmarks (joints) with numbers
    keypoints.forEach((kp, idx) => {
      if (kp && (kp.score || 1) > 0.3) {
        // Draw filled circle
        ctx.fillStyle = idx === 0 ? 'rgba(239, 68, 68, 0.95)' : 'rgba(99, 102, 241, 0.95)';
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw white border
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw index numbers (WHITE TEXT)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(idx.toString(), kp.x, kp.y);
      }
    });
    
    // Draw hand info text at top-left
    if (keypoints.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Hand Detected: ${keypoints.length} landmarks`, 15, 15);
    }
  };

  // Performance Metrics Update Effect
  useEffect(() => {
    const metricsInterval = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - lastFrameTimeRef.current;
      
      // Calculate FPS
      if (deltaTime > 0) {
        fpsRef.current = Math.round(1000 / deltaTime);
      }
      
      // Get memory usage (if available)
      let memoryUsage = 0;
      if (performance.memory) {
        memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576); // Convert to MB
      }
      
      setPerformanceMetrics(prev => ({
        ...prev,
        fps: fpsRef.current,
        memoryUsage: memoryUsage,
        frameCount: frameCountRef.current
      }));
      
      lastFrameTimeRef.current = now;
      frameCountRef.current = 0;
    }, 1000); // Update every second
    
    return () => clearInterval(metricsInterval);
  }, []);

  // Hand tracking effect
  useEffect(() => {
    if (!isCamOpen || !videoRef.current) return;

    let rafId = null;
    let mediaStream = null;

    const startHandTracking = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        mediaStream = stream;
        mediaStreamRef.current = stream;
        videoRef.current.srcObject = stream;

        // Wait for video to load
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = resolve;
        });

        // Initialize canvas dimensions
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }

        console.log('🎥 Camera stream started, canvas initialized');
        console.log(`📐 Canvas size: ${canvasRef.current?.width}x${canvasRef.current?.height}`);

        let frameCount = 0;
        let lastPredictionTime = 0;
        const PREDICTION_INTERVAL = 300; // Predict every 300ms
        let lastDrawnHands = [];

        const detectHands = async () => {
          if (!videoRef.current) {
            return;
          }
          try {
            frameCount++;
            // Hand detection is handled by Flask backend via GestureRecognition component
            // No local hand detection needed - all detection happens server-side
          } catch (error) {
            console.error('Detection loop error:', error);
          }

          rafId = requestAnimationFrame(detectHands);
        };

        rafId = requestAnimationFrame(detectHands);
      } catch (error) {
        console.error('Camera access error:', error);
        setDetectedGesture('❌ Camera access denied');
      }
    };

    // Start hand tracking immediately
    startHandTracking();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCamOpen]);

  // Animate glyphs word by word, character by character within each word
  useEffect(() => {
    if (messages.length === 0) {
      setAnimatedGlyph("");
      setAnimatedImage(null);
      setGlyphIndex(0);
      setWordIndex(0);
      return;
    }

    const lastText = messages[messages.length - 1].text;
    // Split text into words and spaces - keep both
    const tokens = lastText.trim().split(/(\s+)/); // Keep spaces as separate tokens
    const nonEmptyTokens = tokens.filter(t => t.trim().length > 0 || t === ' '); // Keep space tokens
    
    // If we've finished all tokens, keep showing the last one
    if (wordIndex >= nonEmptyTokens.length) {
      return;
    }

    const currentToken = nonEmptyTokens[wordIndex];
    const isSpace = currentToken === ' ';
    
    if (isSpace) {
      // Show space image and move to next token
      const timer = setTimeout(() => {
        setAnimatedImage(SIGN_IMAGES[' ']);
        setAnimatedGlyph(' ');
        setGlyphIndex(0);
        setWordIndex(prev => prev + 1);
      }, 500); // Show space for 500ms
      
      return () => clearTimeout(timer);
    }
    
    const currentWordGlyph = translateToSignGlyph(currentToken);
    
    // Animate character by character within the word
    if (glyphIndex < currentWordGlyph.length && glyphIndex < currentToken.length) {
      const timer = setTimeout(() => {
        const currentChar = currentToken[glyphIndex] ? currentToken[glyphIndex].toLowerCase() : '';
        // Set both glyph (fallback) and image
        setAnimatedGlyph(currentWordGlyph[glyphIndex]);
        setAnimatedImage(SIGN_IMAGES[currentChar] || null);
        setGlyphIndex(prev => prev + 1);
      }, 300); // 300ms per character
      
      return () => clearTimeout(timer);
    } else {
      // Move to next token after current token is complete
      const timer = setTimeout(() => {
        setGlyphIndex(0);
        setAnimatedImage(null);
        setWordIndex(prev => prev + 1);
      }, 500); // 500ms pause between words

      return () => clearTimeout(timer);
    }
  }, [messages, glyphIndex, wordIndex]);

  // Reset animation when new message arrives
  useEffect(() => {
    if (messages.length === 0) return;
    
    // Small delay to ensure reset happens before animation starts
    const resetTimer = setTimeout(() => {
      setGlyphIndex(0);
      setWordIndex(0);
      setAnimatedGlyph("");
      setAnimatedImage(null);
    }, 50);
    
    return () => clearTimeout(resetTimer);
  }, [messages.length]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db || !currentChatId) return;
    
    // Check if chat has changed (not just a reload)
    const chatHasChanged = previousChatIdRef.current !== null && 
                           previousChatIdRef.current !== currentChatId;
    
    // Only clear messages when switching to a different chat
    if (chatHasChanged) {
      setMessages([]);
      console.log(`🔄 Switched from chat ${previousChatIdRef.current} to ${currentChatId}`);
    }
    
    // Update previous chat ID
    previousChatIdRef.current = currentChatId;
    
    // Track MongoDB messages separately to avoid race conditions
    let mongoMessagesCache = [];
    let isLoadingMongo = false;
    let isInitialLoad = true;
    let hasSetInitialMessages = false;
    
    // Fetch MongoDB messages (for large images that can't fit in Firebase)
    const fetchMongoMessages = async () => {
      if (isLoadingMongo && !isInitialLoad) {
        return mongoMessagesCache; // Return cache if already loading
      }
      
      isLoadingMongo = true;
      try {
        const response = await fetch('http://localhost:5000/api/get-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            chatId: currentChatId
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.messages) {
            console.log(`📦 Fetched ${result.messages.length} messages from MongoDB`);
            mongoMessagesCache = result.messages;
            isLoadingMongo = false;
            isInitialLoad = false;
            return result.messages;
          }
        }
      } catch (err) {
        console.warn('MongoDB fetch failed:', err);
      }
      isLoadingMongo = false;
      isInitialLoad = false;
      return mongoMessagesCache;
    };
    
    // Load MongoDB messages immediately on mount (only once)
    const initializeMessages = async () => {
      if (hasSetInitialMessages) return; // Prevent multiple initializations
      
      const mongoData = await fetchMongoMessages();
      if (mongoData.length > 0) {
        const mongoMessages = mongoData.map((m, idx) => {
          let timestamp = m.timestamp || {};
          if (!timestamp.seconds) {
            timestamp = { seconds: Math.floor(Date.now() / 1000) - (mongoData.length - idx) * 60 };
          }
          
          return {
            ...m,
            id: m._id || `mongo-${idx}`,
            source: 'mongodb',
            timestamp: timestamp
          };
        });
        
        // Set MongoDB messages immediately (only first time)
        setMessages(mongoMessages);
        hasSetInitialMessages = true;
        console.log('✅ MongoDB messages loaded on mount');
      } else {
        // If no MongoDB messages, clear for fresh start
        setMessages([]);
        hasSetInitialMessages = true;
      }
    };
    
    // Start loading MongoDB messages immediately
    initializeMessages();
    
    // Query messages for current chat only (ordered by timestamp)
    try {
      const messagesRef = collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages");
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      
      const unsubscribe = onSnapshot(q, async (snap) => {
        console.log(`📥 Firebase loaded ${snap.docs.length} messages`);
        const firebaseData = snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'firebase' }));
        
        // Merge with MongoDB messages (for large images)
        const mongoData = await fetchMongoMessages();
        const mongoMessages = mongoData.map((m, idx) => {
          // Ensure timestamp has proper format
          let timestamp = m.timestamp || {};
          if (!timestamp.seconds) {
            // If no seconds field, try to parse from other formats or use current time
            timestamp = { seconds: Math.floor(Date.now() / 1000) - (mongoData.length - idx) * 60 }; // Stagger by minute
          }
          
          return {
            ...m,
            id: m._id || `mongo-${idx}`,
            source: 'mongodb',
            timestamp: timestamp
          };
        });
        
        // Merge Firebase and MongoDB messages properly
        setMessages(prevMessages => {
          // Combine all sources
          const allMessages = [
            ...firebaseData,
            ...mongoMessages
          ];
          
          // Deduplicate by ID (prefer Firebase source if duplicate)
          const uniqueMessagesMap = new Map();
          allMessages.forEach(msg => {
            const existingMsg = uniqueMessagesMap.get(msg.id);
            if (!existingMsg || msg.source === 'firebase') {
              uniqueMessagesMap.set(msg.id, msg);
            }
          });
          
          const uniqueMessages = Array.from(uniqueMessagesMap.values());
          
          // Sort by timestamp
          const sortedData = uniqueMessages.sort((a, b) => {
            const aTime = a.timestamp?.seconds || a.timestamp?.toDate?.().getTime() / 1000 || 0;
            const bTime = b.timestamp?.seconds || b.timestamp?.toDate?.().getTime() / 1000 || 0;
            return aTime - bTime;
          });
          
          console.log(`📊 Total messages after merge: ${sortedData.length} (${firebaseData.length} Firebase + ${mongoMessages.length} MongoDB)`);
          return sortedData;
        });
      }, (error) => {
        console.warn("Firestore listener error (collection may not exist yet):", error);
      });
      
      return unsubscribe;
    } catch (err) {
      console.error("Firestore query error:", err);
    }
  }, [user, currentChatId, isFirebaseConfigured, db, appId]);

  useEffect(() => {
    // Update current chat messages whenever messages state changes
    if (messages.length > 0) {
      updateCurrentChatMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    // Scroll to bottom with a small delay to ensure DOM is rendered
    const scrollToBottom = () => {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 0);
    };
    
    scrollToBottom();
  }, [messages, isThinking, currentChatId]);

  // Handle keyboard shortcuts for image preview modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && imagePreviewModal.isOpen) {
        setImagePreviewModal({ isOpen: false, imageData: null, imageName: null });
      }
    };
    
    if (imagePreviewModal.isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [imagePreviewModal.isOpen]);

  const toggleVoiceRecording = () => {
    if (!voiceInputRef.current) {
      console.error('🎤 Voice input not initialized');
      alert('Voice input is not available in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    try {
      if (isRecording) {
        voiceInputRef.current.stop();
        setIsRecording(false);
      } else {
        setTranscript('');
        setVoiceText('');
        voiceInputRef.current.start();
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Error toggling voice input:', error);
      setIsRecording(false);
    }
  };

  // Clean up asterisks from bot responses
  const cleanBotResponse = (text) => {
    if (!text) return text;
    // Remove asterisks used for bullet points (* at start of lines)
    return text
      .split('\n')
      .map(line => line.replace(/^\s*\*\s+/, '')) // Remove * from line starts
      .join('\n')
      .replace(/\*\*/g, '') // Remove ** (bold markdown)
      .trim();
  };

  const fetchWithRetry = async (url, options, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return await response.json();
        if (response.status !== 429 && response.status < 500) break; 
      } catch (err) {
        if (i === maxRetries - 1) throw err;
      }
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Failed after multiple retries");
  };

  const playSignSequence = async (text) => {
    // Display signs instantly in rapid sequence
    for (const char of text.toLowerCase()) {
      const sign = SIGN_GLYPHS[char] || '✨';
      setCurrentSign(sign);
      await new Promise(r => setTimeout(r, 200)); // Faster animation
    }
    // Keep last sign visible for 500ms then clear
    await new Promise(r => setTimeout(r, 500));
    setCurrentSign("");
  };

  const handleSend = async (text = inputText) => {
    const { error: validationError, valid } = validateChatInput(typeof text === 'string' ? text : inputText);
    
    if (!valid) {
      showError?.(validationError || "Please enter a valid message");
      return;
    }

    const cleanText = sanitizeInput(typeof text === 'string' ? text.trim() : inputText.trim());
    if (!cleanText || !user) return;

    // ✨ CHECK FOR IMAGE GENERATION REQUEST FIRST
    const imagePrompt = detectImageGenerationRequest(cleanText);
    if (imagePrompt) {
      console.log(`🎨 Image generation request detected: "${imagePrompt}"`);
      setInputText("");
      setIsThinking(true);

      let loadingMsgRef = null;
      try {
        // Save user message
        const userMsgRef = await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
          text: cleanText, 
          sender: "user", 
          timestamp: serverTimestamp()
        });

        // Add a loading message with animation
        loadingMsgRef = await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
          text: "🎨 Generating your image...",
          sender: "bot",
          timestamp: serverTimestamp(),
          isGenerating: true
        });

        // Generate image
        const imageData = await generateImage(imagePrompt);
        
        if (imageData) {
          // Delete the loading message
          try {
            await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages", loadingMsgRef.id));
          } catch (delErr) {
            console.warn("Failed to delete loading message:", delErr);
          }
          
          // Save bot message with image using dual-storage (Firebase + MongoDB fallback)
          const messageData = {
            text: `🎨 Here's your image: ${imagePrompt}`,
            sender: "bot",
            timestamp: serverTimestamp(),
            attachment: {
              name: `generated-${imagePrompt.slice(0, 20)}.png`,
              type: "image/png",
              isImage: true,
              data: imageData
            }
          };
          
          const saveResult = await saveMessageDualStorage(user.uid, currentChatId, messageData);
          console.log(`✅ Image message saved to ${saveResult.location}`);
          
          // Delete the loading message - this triggers onSnapshot which refetches MongoDB
          // But we also add manually for instant feedback
          if (saveResult.location === 'mongodb' && saveResult.messageId) {
            const newMessage = {
              id: saveResult.messageId,
              _id: saveResult.messageId,
              ...messageData,
              timestamp: { seconds: Math.floor(Date.now() / 1000) },
              source: 'mongodb'
            };
            setMessages(prev => {
              // Check if not already present
              if (!prev.some(m => m.id === saveResult.messageId)) {
                return [...prev, newMessage];
              }
              return prev;
            });
            console.log(`✅ MongoDB message added to UI with ID: ${saveResult.messageId}`);
          }
        } else {
          throw new Error("No image data returned from generation");
        }
      } catch (err) {
        console.error("❌ Image generation error:", err);
        
        // Delete loading message if it exists
        if (loadingMsgRef) {
          try {
            await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages", loadingMsgRef.id));
          } catch (delErr) {
            console.warn("Failed to delete loading message:", delErr);
          }
        }
        
        // Show error message
        await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
          text: `❌ Sorry, I couldn't generate the image. ${err.message || 'Please try again.'}`,
          sender: "bot",
          timestamp: serverTimestamp()
        });
      }
      
      setIsThinking(false);
      return;
    }

    // Play sign visualization for user's input
    playSignSequence(cleanText);
    
    setInputText("");
    setIsThinking(true);

    // Check if required services are configured
    if (!isFirebaseConfigured || !db || !isGeminiConfigured) {
      setIsThinking(false);
      const errorMsg = "⚠️ Configuration Required: Please set up Firebase and Gemini API credentials.";
      console.warn("Configuration check failed:", { isFirebaseConfigured, db: !!db, isGeminiConfigured });
      try {
        if (isFirebaseConfigured && db) {
          await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
            text: errorMsg, sender: "bot", timestamp: serverTimestamp()
          });
        }
      } catch (err) {
        console.error("Failed to save error message:", err);
      }
      return;
    }

    try {
      // Analyze user message with NLP (in background, don't await)
      let nlpAnalysis = {};
      NLPService.quickAnalysis(cleanText).then(analysis => {
        nlpAnalysis = analysis;
      }).catch(err => {
        console.warn('NLP analysis failed:', err);
      });

      // Save user message with NLP data and file attachment (Firebase + MongoDB fallback)
      console.log("Saving user message with dual-storage:", { currentChatId, cleanText });
      
      // Save clean message text for UI display (don't include extracted text)
      const messageData = {
        text: cleanText, 
        sender: "user", 
        timestamp: serverTimestamp(),
        nlp: nlpAnalysis
      };
      
      // Add file attachment if present (include extracted text for future chat history)
      if (currentFileAttachment) {
        console.log('📎 Attaching file to message:', currentFileAttachment.name);
        messageData.attachment = {
          name: currentFileAttachment.name,
          type: currentFileAttachment.type,
          isImage: currentFileAttachment.isImage,
          data: currentFileAttachment.data,
          ...(currentFileAttachment.extractedText && { extractedText: currentFileAttachment.extractedText })
        };
      }
      
      const saveResult = await saveMessageDualStorage(user.uid, currentChatId, messageData);
      console.log(`User message saved to ${saveResult.location}`);
      
      // Clear file attachment after sending
      setCurrentFileAttachment(null);

      // Build chat history for context
      const chatHistory = messages.slice(-10).map(m => {
        // Include extracted text from document attachments in chat history for AI context
        let historyText = m.text;
        if (m.attachment && m.attachment.extractedText && !m.attachment.isImage) {
          historyText += `\n\n[Document content]:\n${m.attachment.extractedText}`;
        }
        
        return {
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [
            { text: historyText },
            // Add image data if attachment exists and is an image
            ...(m.attachment && m.attachment.isImage ? [{ inlineData: { mimeType: m.attachment.type, data: m.attachment.data.split(',')[1] } }] : [])
          ]
        };
      });
      
      // Add current file attachment to user message for AI (include extracted text as context)
      let aiContextText = cleanText;
      if (currentFileAttachment && currentFileAttachment.extractedText) {
        const { name = 'document' } = currentFileAttachment;
        aiContextText += `\n\n[Document content from ${name}]:\n${currentFileAttachment.extractedText}`;
      }

      const userMessageParts = [{ text: aiContextText }];
      if (currentFileAttachment && currentFileAttachment.isImage) {
        userMessageParts.push({
          inlineData: {
            mimeType: currentFileAttachment.type,
            data: currentFileAttachment.data.split(',')[1] // Remove data URL prefix
          }
        });
      }

      // Check if user is asking specifically about today's date or current time
      const dateQuery = cleanText.toLowerCase();
      const isDateQuery = /\b(what is the?|what's the?|today[']?s?|current)\s+(date|time|day)\b/.test(dateQuery) || 
                         /\b(date|time)\s+today\b/.test(dateQuery) ||
                         /\bwhat[']?s?\s+(today|now|current)\b/.test(dateQuery);

      let searchContext = '';
      const currentDateTime = GoogleSearchService.getCurrentDateTime();
      
      // If asking about date, provide immediate accurate response without search
      if (isDateQuery) {
        console.log('📅 Date/Time query detected, providing current information');
        searchContext = `Current System Information:\n- Today's Date: ${currentDateTime.date}\n- Current Time: ${currentDateTime.time}`;
      } else if (GoogleSearchService.shouldSearch(cleanText)) {
        // For other queries, perform web search if needed
        try {
          console.log('🔍 Performing Google search for:', cleanText);
          const searchResult = await GoogleSearchService.searchWithDateContext(cleanText, 5);
          searchContext = await GoogleSearchService.searchAndFormat(cleanText, 5);
          console.log('✅ Search results obtained:', searchContext.length, 'characters');
        } catch (searchErr) {
          console.warn('⚠️ Google search failed:', searchErr);
          // Continue without search results
        }
      }

      // Detect language preference from user input
      const detectedLanguage = detectLanguagePreference(cleanText);
      if (detectedLanguage) {
        setPreferredResponseLanguage(detectedLanguage);
        console.log(`🌐 Language preference detected: ${detectedLanguage}`);
      }

      // Prepare API payload with search context and current date - ALWAYS include date prominently
      let systemMessage = searchContext
        ? `You are AccessAI, a helpful assistant for people with accessibility needs. Be concise, empathetic, and clear.\n\n**IMPORTANT: Today's date is ${currentDateTime.date} and the current time is ${currentDateTime.time}. Always refer to this when answering date/time questions.**\n\nContext information:\n${searchContext}`
        : `You are AccessAI, a helpful assistant for people with accessibility needs. Be concise, empathetic, and clear.\n\n**IMPORTANT: Today's date is ${currentDateTime.date} and the current time is ${currentDateTime.time}. Always refer to this when answering date/time questions.**`;

      // Add language preference to system message if set
      if (preferredResponseLanguage !== 'en') {
        const languageNames = {
          tamil: 'Tamil',
          telugu: 'Telugu',
          kannada: 'Kannada',
          malayalam: 'Malayalam',
          marathi: 'Marathi',
          hindi: 'Hindi',
          bengali: 'Bengali',
          gujarati: 'Gujarati',
          punjabi: 'Punjabi',
          spanish: 'Spanish',
          french: 'French',
          german: 'German',
          chinese: 'Chinese',
          japanese: 'Japanese',
          korean: 'Korean',
          arabic: 'Arabic',
        };
        
        const langName = languageNames[preferredResponseLanguage] || preferredResponseLanguage;
        systemMessage += `\n\n**RESPOND IN ${langName.toUpperCase()}: Always respond to the user in ${langName}. All your responses should be in ${langName}.** Do not respond in English unless the user explicitly asks for English.`;
      }

      const payload = {
        contents: [...chatHistory, { role: "user", parts: userMessageParts }],
        systemInstruction: {
          parts: [{ text: systemMessage }]
        }
      };

      // Call Gemini API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const result = await fetchWithRetry(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const botResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that.";
        const cleanedResponse = cleanBotResponse(botResponse);

        // Save bot response with dual-storage (Firebase + MongoDB fallback)
        console.log("Saving bot response with dual-storage:", { currentChatId });
        const botMessageData = {
          text: cleanedResponse, 
          sender: "bot", 
          timestamp: serverTimestamp()
        };
        const saveBotResult = await saveMessageDualStorage(user.uid, currentChatId, botMessageData);
        console.log(`Bot response saved to ${saveBotResult.location}`);
        
        // ✨ Update streak and check achievements
        updateStreak();
        const topic = detectLanguagePreference(cleanText) || 'General';
        checkAndAddAchievements(topic);
        
        // Generate suggestions and YouTube search (in background) - Pass bot message ID
        const botMsgId = botMessageData.id;
        generateSuggestions(cleanedResponse, botMsgId).catch(err => console.warn('Failed to generate suggestions:', err));
        searchYoutube(cleanText, botMsgId).catch(err => console.warn('Failed to search YouTube:', err));
        
        // Speak response if enabled - with automatic English translation for better TTS support
        if (isSpeaking) {
          try {
            await speakWithTranslation(cleanedResponse);
          } catch (speechErr) {
            console.warn("Speech synthesis unavailable:", speechErr);
          }
        }
        
        // Play sign sequence
        playSignSequence(cleanedResponse);
      } catch (apiError) {
        clearTimeout(timeoutId);
        
        // Handle different error types
        let userErrorMsg = "❌ Failed to get response. Please try again.";
        
        if (apiError.name === 'AbortError') {
          userErrorMsg = "⏱️ Request timed out. Please try again.";
        } else if (apiError.status === 401) {
          userErrorMsg = "🔑 API authentication failed. Please check your credentials.";
        } else if (apiError.status === 429) {
          userErrorMsg = "⚡ Rate limited. Please wait a moment and try again.";
        } else if (apiError.status === 500) {
          userErrorMsg = "🔧 API server error. Please try again later.";
        }

        console.error("Gemini API Error:", apiError);
        
        // Save error message with dual-storage
        if (isFirebaseConfigured && db) {
          const errorMessageData = {
            text: userErrorMsg, 
            sender: "bot", 
            timestamp: serverTimestamp()
          };
          await saveMessageDualStorage(user.uid, currentChatId, errorMessageData);
        }
      }
      
      setIsThinking(false);
    } catch (e) {
      console.error("Message processing error:", e);
      setIsThinking(false);
      
      // Save generic error message
      if (user && isFirebaseConfigured && db) {
        try {
          await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
            text: "⚠️ An unexpected error occurred. Please refresh and try again.", 
            sender: "bot", 
            timestamp: serverTimestamp()
          });
        } catch (err) {
          console.error("Failed to save error message:", err);
        }
      }
    }
  };

  // Show login screen if user is not authenticated
  if (!user) {
    return (
      <Login 
        auth={auth} 
        onLoginSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
        }} 
      />
    );
  }

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
        setUser(null);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-darker)', color: 'var(--text-primary)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        /* Smooth Button Transitions with Curved Motion */
        button {
          transition: all 0.3s cubic-bezier(0.4, 0.01, 0.165, 0.99) !important;
          will-change: transform, background, border-color, box-shadow;
        }
        
        button:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        button:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        /* Edit Button Smooth Styles - Curved */
        .smooth-btn-edit {
          border-radius: 8px !important;
        }
        
        .smooth-btn-edit:hover {
          background: #f3f4f6 !important;
          border-color: #d1d5db !important;
        }
        
        /* Delete Button Smooth Styles - Curved */
        .smooth-btn-delete {
          border-radius: 8px !important;
        }
        
        .smooth-btn-delete:hover {
          background: #f3f4f6 !important;
          border-color: #d1d5db !important;
        }
        
        /* Save Button Smooth Styles - Curved */
        .smooth-btn-save {
          border-radius: 8px !important;
        }
        
        .smooth-btn-save:hover {
          background: #f3f4f6 !important;
          border-color: #d1d5db !important;
        }
        
        /* Cancel Button Smooth Styles - Curved */
        .smooth-btn-cancel {
          border-radius: 8px !important;
        }
        
        .smooth-btn-cancel:hover {
          background: #f3f4f6 !important;
          border-color: #d1d5db !important;
        }
      `}</style>
      {/* Chat Sidebar */}
      <ChatSidebar 
        chats={chats}
        currentChatId={currentChatId}
        onSwitchChat={switchChat}
        onCreateChat={createNewChat}
        onRenameChat={renameChat}
        onDeleteChat={deleteChat}
        onOpenSettings={() => setShowSettings(true)}
        animatedGlyph={animatedGlyph}
        animatedImage={animatedImage}
      />

      {/* Settings Modal */}
      {showSettings && (
        <Settings 
          theme={theme}
          setTheme={setTheme}
          fontSize={fontSize}
          setFontSize={setFontSize}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          showTimestamps={showTimestamps}
          setShowTimestamps={setShowTimestamps}
          autoSave={autoSave}
          setAutoSave={setAutoSave}
          language={language}
          setLanguage={setLanguage}
          user={user}
          db={db}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Performance Monitor Toggle - Only show when clicked */}
      {showPerformanceMonitor && (
        <div style={{ position: 'relative' }}>
          <PerformanceMonitor metrics={performanceMetrics} />
          <button
            onClick={() => setShowPerformanceMonitor(false)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(239, 68, 68, 0.8)',
              border: 'none',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              zIndex: 1001
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 1)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.8)'}
          >
            ✕ Close
          </button>
        </div>
      )}

      {/* Translator Modal */}
      {showTranslator && (
        <Translator onClose={() => setShowTranslator(false)} />
      )}

      {/* MAIN CHAT AREA */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-darker)'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: '0',
            fontSize: '1.5rem',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #4D9FFF 0%, #7C3AED 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span>AccessAI</span>
            {/* Streak Display */}
            {userStats.currentStreak > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.8rem',
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '700',
                color: 'white',
                WebkitBackgroundClip: 'unset',
                WebkitTextFillColor: 'unset',
                backgroundClip: 'unset'
              }}>
                <span>🔥</span>
                <span>{userStats.currentStreak} day{userStats.currentStreak !== 1 ? 's' : ''}</span>
              </div>
            )}
            {/* Achievements Display */}
            {(userStats.achievements || []).length > 0 && (
              <div style={{
                display: 'flex',
                gap: '0.3rem',
                alignItems: 'center'
              }}>
                {userStats.achievements.slice(0, 3).map((badge, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease'
                    }}
                    onClick={() => alert(`Achievement: ${badge}`)}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    title={badge}
                  >
                    {badge === 'First Message' && '🎯'}
                    {badge === 'Chatty' && '💬'}
                    {badge === 'Conversationalist' && '👥'}
                    {badge === 'ChatMaster' && '🏆'}
                    {badge === 'Week Streak' && '🌟'}
                    {badge === 'Month Streak' && '⭐'}
                    {badge === 'Knowledge Explorer' && '🧠'}
                  </div>
                ))}
              </div>
            )}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {/* SOS Emergency Button */}
            {user && (
              <div className="sos-button-wrapper">
                <SOS 
                  user={user}
                  emergencyContacts={emergencyContacts}
                  db={db}
                  onEmergencyTriggered={async (eventData) => {
                    if (db) {
                      await EmergencyContactService.logEmergencyEvent(user.uid, eventData, db);
                    }
                    console.log('🚨 Emergency triggered:', eventData);
                  }}
                />
              </div>
            )}

            {/* Performance Monitor Button */}
            <button 
              onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: 'none',
                background: showPerformanceMonitor ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(255, 255, 255, 0.9)',
                color: showPerformanceMonitor ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                fontSize: '1.1rem'
              }}
              title={showPerformanceMonitor ? 'Hide Performance Metrics' : 'Show Performance Metrics'}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              ⚡
            </button>

            <button 
              onClick={() => setShowTranslator(!showTranslator)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: 'none',
                background: showTranslator ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.9)',
                color: showTranslator ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                fontSize: '1.1rem'
              }}
              title={showTranslator ? 'Hide Translator' : 'Show Translator'}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              <img src="/translator.png" alt="Translator" style={{ width: '20px', height: '20px' }} />
            </button>
            
            {/* JARVIS Voice Command Mode Button - TOP RIGHT */}
            <button
              onClick={toggleVoiceCommandMode}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: isListeningCommands ? '2px solid #3B82F6' : '2px solid rgba(79, 70, 229, 0.5)',
                background: isListeningCommands ? 'linear-gradient(135deg, #3B82F6 0%, #1E3A8A 100%)' : 'rgba(255, 255, 255, 0.9)',
                color: isListeningCommands ? '#93C5FD' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0.01, 0.165, 0.99)',
                fontSize: '1.3rem',
                animation: isListeningCommands ? 'pulse 1.5s infinite' : 'none',
                boxShadow: isListeningCommands ? '0 0 20px rgba(59, 130, 246, 0.8)' : 'none',
                fontWeight: '600'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.15)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
              title={isListeningCommands 
                ? (isVoiceCommandMode ? '🎙️ JARVIS ACTIVE - Give commands' : '🎤 Listening - Say "Hey Jarvis"')
                : 'Enable JARVIS Voice Control (Click to start listening)'}
            >
              <img 
                src="/voice command.png" 
                alt="Voice Command" 
                style={{
                  width: '24px',
                  height: '24px',
                  objectFit: 'contain'
                }}
              />
            </button>
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0E78F5 0%, #7C3AED 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                title={user?.displayName || user?.email || 'User Menu'}
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--primary)'
                    }}
                  />
                ) : (
                  <img
                    src="/profile.png"
                    alt="Profile"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'contain'
                    }}
                  />
                )}
              </button>
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '45px',
                  right: '0',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  minWidth: '200px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                  zIndex: 1000,
                  overflow: 'hidden',
                  background: 'white'
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #e0e0e0',
                    textAlign: 'center'
                  }}>
                    {user?.photoURL && (
                      <div style={{ marginBottom: '12px' }}>
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #667eea',
                            margin: '0 auto'
                          }}
                        />
                      </div>
                    )}
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'black' }}>
                      {user?.displayName || 'User'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                      {user?.email || user?.phoneNumber || 'Authenticated'}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={(e) => e.target.style.background = 'none'}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          {messages.length === 0 && !isThinking ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem',
              textAlign: 'center'
            }}>
              <img 
                src="/logo.png" 
                alt="AccessAI Logo" 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '12px',
                  objectFit: 'contain'
                }} 
              />
              <div>
                <div style={{
                  fontSize: '0.95rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem'
                }}>
                  📅 {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <h1 style={{
                  margin: '0',
                  fontSize: '2rem',
                  fontWeight: '600'
                }}>
                  How can I help you today?
                </h1>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                width: '100%',
                maxWidth: '600px'
              }}>
                {[
                  { label: 'Translate my signs', icon: '🤟' },
                  { label: 'Summarize text', icon: '/new chat.png', isImage: true },
                  { label: 'Describe surroundings', icon: '📷' },
                  { label: 'Practice ASL', icon: '🧠' }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(item.label)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'rgba(77, 159, 255, 0.05)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.borderColor = 'var(--primary)';
                      e.target.style.background = 'rgba(77, 159, 255, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.borderColor = 'var(--border)';
                      e.target.style.background = 'rgba(77, 159, 255, 0.05)';
                    }}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, idx) => {
                const sentimentInfo = m.nlp ? NLPService.getSentimentEmoji(m.nlp.sentiment) : null;
                const intentEmoji = m.nlp ? NLPService.getIntentEmoji(m.nlp.intent) : null;
                const lastUserMessageIdx = messages.reduce((last, msg, i) => msg.sender === 'user' ? i : last, -1);
                const isLastUserMessage = m.sender === 'user' && idx === lastUserMessageIdx;
                
                // Generate unique key: combine ID with index to ensure uniqueness
                const messageKey = m.id ? `${m.id}-${idx}` : `${m.sender}-${idx}-${m.text?.slice(0, 10) || 'msg'}`;
                
                return (
                <div key={messageKey} style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  animation: 'fadeIn 0.3s ease',
                  marginBottom: '1.2rem',
                  paddingLeft: m.sender === 'user' ? '2rem' : '0',
                  paddingRight: m.sender === 'user' ? '0' : '2rem'
                }}>
                  {m.sender === 'bot' && (
                    <img 
                      src="/logo.png" 
                      alt="AccessAI Logo" 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '6px',
                        objectFit: 'contain',
                        flexShrink: 0
                      }} 
                    />
                  )}
                  <div style={{
                    maxWidth: '60%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.7rem'
                  }}>
                    {/* File Attachment Thumbnail */}
                    {m.attachment && (
                      <div>
                        {m.attachment.isImage ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              background: 'rgba(102, 126, 234, 0.1)',
                              border: '1px solid rgba(102, 126, 234, 0.3)',
                              borderRadius: '8px',
                              position: 'relative',
                              maxWidth: 'fit-content',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onClick={() => setImagePreviewModal({
                              isOpen: true,
                              imageData: m.attachment.data,
                              imageName: m.attachment.name
                            })}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                              e.currentTarget.style.transform = 'scale(1.02)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Click to view full image">
                              <img 
                                src={m.attachment.data} 
                                alt={m.attachment.name}
                                style={{
                                  maxWidth: '200px',
                                  maxHeight: '200px',
                                  borderRadius: '6px',
                                  objectFit: 'cover'
                                }}
                              />
                            </div>
                            <button
                              onClick={() => downloadImage(m.attachment.data, m.attachment.name.replace('.png', ''))}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #0E78F5 0%, #7C3AED 100%)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.3s ease',
                                width: 'fit-content'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 20px rgba(14, 120, 245, 0.3)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                              }}
                              title="Download image"
                            >
                              <img src="/download (2).png" alt="Download" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                              Download
                            </button>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            background: 'rgba(102, 126, 234, 0.2)',
                            borderRadius: '6px',
                            marginBottom: '0.5rem'
                          }}>
                            <img src="/image.png" alt="Image" style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{m.attachment.name || 'Document'}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={{
                      padding: '1rem 1.5rem',
                      borderRadius: '12px',
                      background: m.sender === 'user' 
                        ? 'linear-gradient(135deg, rgba(14, 120, 245, 0.25) 0%, rgba(124, 58, 237, 0.2) 100%)'
                        : 'rgba(77, 159, 255, 0.1)',
                      border: m.sender === 'user'
                        ? '1px solid rgba(124, 58, 237, 0.3)'
                        : '1px solid rgba(77, 159, 255, 0.2)',
                      color: 'var(--text-primary)',
                      wordBreak: 'break-word',
                      lineHeight: '1.6',
                      letterSpacing: '0.3px',
                      animation: 'slideInMessage 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      fontSize: '0.95rem'
                    }}>
                      {m.attachment && m.attachment.isImage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <img src="/image.png" alt="Image" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                        </div>
                      )}
                      <div style={{ width: '100%' }}>
                        {m.isGenerating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ 
                              display: 'flex', 
                              gap: '0.4rem',
                              alignItems: 'center'
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                animation: 'bounce 1.4s infinite'
                              }} />
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                animation: 'bounce 1.4s infinite 0.2s'
                              }} />
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                animation: 'bounce 1.4s infinite 0.4s'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                              {m.text}
                            </span>
                          </div>
                        ) : (
                          renderMessageWithCodeHighlight(m.text.replace('🎨 ', ''))
                        )}
                      </div>
                    </div>
                    
                    {/* Message Timestamp */}
                    {m.timestamp && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        opacity: 0.7,
                        paddingRight: m.sender === 'user' ? '0' : '0.5rem',
                        paddingLeft: m.sender === 'user' ? '0.5rem' : '0',
                        textAlign: m.sender === 'user' ? 'right' : 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {(() => {
                          try {
                            const timestamp = m.timestamp.toDate ? m.timestamp.toDate() : 
                                            (m.timestamp.seconds ? new Date(m.timestamp.seconds * 1000) : 
                                            (m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)));
                            return timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            });
                          } catch (e) {
                            return 'Now';
                          }
                        })()}
                        {m.isEdited && (
                          <span style={{ fontSize: '0.65rem', fontStyle: 'italic', color: 'rgba(255, 165, 0, 0.8)' }}>
                            (edited)
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Edit Button for Last User Message Only */}
                    {isLastUserMessage && editingMessageId !== (m.id || idx) && (
                      <button
                        onClick={() => {
                          setEditingMessageId(m.id || idx);
                          setEditingText(m.text);
                        }}
                        className="smooth-btn-edit"
                        style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          color: 'black',
                          borderRadius: '8px',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0.01, 0.165, 0.99)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img src="/edit.png" alt="Edit" style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                        Edit
                      </button>
                    )}
                    
                    {/* Delete Button for User Messages */}
                    {m.sender === 'user' && editingMessageId !== (m.id || idx) && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this conversation and AI response? This cannot be undone.')) {
                            deleteConversation(m.id || idx);
                          }
                        }}
                        className="smooth-btn-delete"
                        style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          color: 'black',
                          borderRadius: '8px',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0.01, 0.165, 0.99)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete this conversation pair"
                      >
                        <img src="/delete.png" alt="Delete" style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                        Delete
                      </button>
                    )}
                    
                    {/* Edit Mode UI */}
                    {editingMessageId === (m.id || idx) && isLastUserMessage && (
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        width: '100%',
                        flexDirection: 'column'
                      }}>
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(102, 126, 234, 0.5)',
                            background: 'rgba(102, 126, 234, 0.05)',
                            color: 'var(--text-primary)',
                            fontSize: 'inherit',
                            width: '100%'
                          }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => editMessage(m.id || idx, editingText)}
                            className="smooth-btn-save"
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              color: 'black',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              transition: 'all 0.3s cubic-bezier(0.4, 0.01, 0.165, 0.99)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <img src="/save.png" alt="Save" style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditingText('');
                            }}
                            className="smooth-btn-cancel"
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              color: 'black',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              transition: 'all 0.3s cubic-bezier(0.4, 0.01, 0.165, 0.99)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* NLP Analysis Display for User Messages */}
                    {m.sender === 'user' && m.nlp && !m.nlp.error && (
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        flexWrap: 'wrap',
                        opacity: 0.8
                      }}>
                        {m.nlp.sentiment && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: `${sentimentInfo?.color}20`,
                            border: `1px solid ${sentimentInfo?.color}40`,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            {sentimentInfo?.emoji} {m.nlp.sentiment}
                          </span>
                        )}
                        {m.nlp.intent && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(123, 60, 237, 0.2)',
                            border: '1px solid rgba(123, 60, 237, 0.4)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            {intentEmoji} {m.nlp.intent}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* ========== ENGAGEMENT FEATURES ========== */}
                    
                    {/* Bot Message Engagement Features */}
                    {m.sender === 'bot' && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        marginTop: '0.5rem'
                      }}>
                        
                        {/* 1. Reaction Buttons */}
                        {/* 2. Action Buttons */}
                        {expandedMessage !== (m.id || idx) && (
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                            fontSize: '0.75rem'
                          }}>
                            <button
                              onClick={() => {
                                const msgId = m.id || idx;
                                setExpandedMessage(msgId);
                                // Trigger fetch if not already loaded
                                if (!messageYoutubeResults[msgId] && !loadingYoutube[msgId]) {
                                  searchYoutube(m.text, msgId);
                                }
                              }}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: 'var(--text-secondary)',
                                borderRadius: '6px',
                                padding: '0.4rem 0.7rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.75rem'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                                e.target.style.borderColor = 'rgb(239, 68, 68)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                              }}
                              title="Search related YouTube videos"
                            >
                              <img src="/youtube.png" alt="YouTube" style={{ width: '16px', height: '16px', objectFit: 'contain', marginRight: '0.3rem' }} />
                              YouTube{messageYoutubeResults[m.id || idx]?.length > 0 ? ` (${messageYoutubeResults[m.id || idx].length})` : ''}
                            </button>
                            
                            <button
                              onClick={() => {
                                const msgId = m.id || idx;
                                setExpandedMessage(msgId);
                                // Trigger fetch if not already loaded
                                if (!messageSuggestions[msgId] && !loadingSuggestions[msgId]) {
                                  generateSuggestions(m.text, msgId);
                                }
                              }}
                              style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: 'var(--text-secondary)',
                                borderRadius: '6px',
                                padding: '0.4rem 0.7rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.75rem'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = 'rgba(34, 197, 94, 0.2)';
                                e.target.style.borderColor = 'rgb(34, 197, 94)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'rgba(34, 197, 94, 0.1)';
                                e.target.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                              }}
                              title="Get related topics"
                            >
                              💡 Suggestions{messageSuggestions[m.id || idx]?.length > 0 ? ` (${messageSuggestions[m.id || idx].length})` : ''}
                            </button>
                            
                            <button
                              onClick={() => navigator.clipboard.writeText(m.text)}
                              style={{
                                background: 'rgba(168, 85, 247, 0.1)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                color: 'var(--text-secondary)',
                                borderRadius: '6px',
                                padding: '0.4rem 0.7rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.75rem'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = 'rgba(168, 85, 247, 0.2)';
                                e.target.style.borderColor = 'rgb(168, 85, 247)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'rgba(168, 85, 247, 0.1)';
                                e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                              }}
                              title="Copy to clipboard"
                            >
                              <img src="/copy.png" alt="Copy" style={{ width: '16px', height: '16px', objectFit: 'contain', marginRight: '0.3rem' }} />
                              Copy
                            </button>
                            
                            <button
                              onClick={() => handleSend(`Create an image based on: ${m.text}`)}
                              style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: 'var(--text-secondary)',
                                borderRadius: '6px',
                                padding: '0.4rem 0.7rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.75rem'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                                e.target.style.borderColor = 'rgb(59, 130, 246)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                                e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                              }}
                              title="Generate image based on this content"
                            >
                              <img src="/image.png" alt="Image" style={{ width: '16px', height: '16px', objectFit: 'contain', marginRight: '0.3rem' }} />
                              Image
                            </button>
                          </div>
                        )}
                        
                        {/* 3. YouTube Loading Animation */}
                        {loadingYoutube[m.id || idx] && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            minHeight: '60px',
                            justifyContent: 'center'
                          }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <img src="/youtube.png" alt="YouTube" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                              Fetching YouTube Videos...
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '0.4rem',
                              alignItems: 'center',
                              marginTop: '0.5rem'
                            }}>
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.6)',
                                animation: 'bounce 1.4s infinite'
                              }} />
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.6)',
                                animation: 'bounce 1.4s infinite 0.2s'
                              }} />
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.6)',
                                animation: 'bounce 1.4s infinite 0.4s'
                              }} />
                            </div>
                          </div>
                        )}
                        
                        {/* 3. YouTube Results - Show automatically or when expanded */}
                        {(expandedMessage === (m.id || idx) || messageYoutubeResults[m.id || idx]?.length > 0) && !loadingYoutube[m.id || idx] && (!messageYoutubeResults[m.id || idx] || messageYoutubeResults[m.id || idx].length === 0) && expandedMessage === (m.id || idx) && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            textAlign: 'center'
                          }}>
                            No YouTube videos found
                          </div>
                        )}
                        
                        {(expandedMessage === (m.id || idx) || messageYoutubeResults[m.id || idx]?.length > 0) && messageYoutubeResults[m.id || idx]?.length > 0 && !loadingYoutube[m.id || idx] && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <img src="/youtube.png" alt="YouTube" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                              Related YouTube Videos
                            </div>
                            {messageYoutubeResults[m.id || idx]?.slice(0, 3).map((video, vidIdx) => (
                              <a
                                key={vidIdx}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                  transition: 'all 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                  e.currentTarget.style.transform = 'translateX(4px)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                  e.currentTarget.style.transform = 'translateX(0)';
                                }}
                              >
                                {video.thumbnail && (
                                  <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    style={{
                                      width: '48px',
                                      height: '27px',
                                      borderRadius: '4px',
                                      objectFit: 'cover',
                                      flexShrink: 0
                                    }}
                                  />
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                    {video.title}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    {video.channel}
                                  </span>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                        
                        {/* 4. Suggestions Loading Animation */}
                        {loadingSuggestions[m.id || idx] && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgba(34, 197, 94, 0.05)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            minHeight: '60px',
                            justifyContent: 'center'
                          }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              💡 Generating Suggestions...
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '0.4rem',
                              alignItems: 'center',
                              marginTop: '0.5rem'
                            }}>
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'rgba(34, 197, 94, 0.6)',
                                animation: 'bounce 1.4s infinite'
                              }} />
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'rgba(34, 197, 94, 0.6)',
                                animation: 'bounce 1.4s infinite 0.2s'
                              }} />
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'rgba(34, 197, 94, 0.6)',
                                animation: 'bounce 1.4s infinite 0.4s'
                              }} />
                            </div>
                          </div>
                        )}
                        
                        {/* 4. Suggestions - No results message */}
                        {(expandedMessage === (m.id || idx) || messageSuggestions[m.id || idx]?.length > 0) && !loadingSuggestions[m.id || idx] && (!messageSuggestions[m.id || idx] || messageSuggestions[m.id || idx].length === 0) && expandedMessage === (m.id || idx) && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgba(34, 197, 94, 0.05)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            textAlign: 'center'
                          }}>
                            No suggestions available
                          </div>
                        )}
                        
                        {/* 4. Suggestions - Show automatically or when expanded */}
                        {(expandedMessage === (m.id || idx) || messageSuggestions[m.id || idx]?.length > 0) && messageSuggestions[m.id || idx]?.length > 0 && !loadingSuggestions[m.id || idx] && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgba(34, 197, 94, 0.05)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                              💡 Suggested Questions
                            </div>
                            {messageSuggestions[m.id || idx]?.map((suggestion, sugIdx) => (
                              <button
                                key={sugIdx}
                                onClick={() => handleSend(suggestion)}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  background: 'rgba(34, 197, 94, 0.1)',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontSize: '0.8rem',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                  e.target.style.background = 'rgba(34, 197, 94, 0.2)';
                                  e.target.style.borderColor = 'rgb(34, 197, 94)';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.background = 'rgba(34, 197, 94, 0.1)';
                                  e.target.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                                }}
                              >
                                → {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Close expanded view button */}
                        {(expandedMessage === (m.id || idx) || messageYoutubeResults[m.id || idx]?.length > 0 || messageSuggestions[m.id || idx]?.length > 0) && (
                          <button
                            onClick={() => {
                              setExpandedMessage(null);
                              // Clear this message's results
                              setMessageYoutubeResults(prev => {
                                const newState = { ...prev };
                                delete newState[m.id || idx];
                                return newState;
                              });
                              setMessageSuggestions(prev => {
                                const newState = { ...prev };
                                delete newState[m.id || idx];
                                return newState;
                              });
                            }}
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              alignSelf: 'flex-start'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.background = 'rgba(77, 159, 255, 0.1)';
                              e.target.style.borderColor = 'var(--primary)';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = 'transparent';
                              e.target.style.borderColor = 'var(--border)';
                            }}
                          >
                            ✕ Close
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {m.sender === 'user' && (
                    <div style={{ fontSize: '1.5rem' }}>
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="User"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--primary)'
                          }}
                        />
                      ) : (
                        <img
                          src="/profile.png"
                          alt="User"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%'
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
              })}
              {isThinking && (
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-end',
                  animation: 'slideUp 0.4s ease-out'
                }}>
                  <img 
                    src="/logo.png" 
                    alt="AccessAI Logo" 
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '6px',
                      objectFit: 'contain',
                      flexShrink: 0
                    }} 
                  />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(77, 159, 255, 0.1)',
                    border: '1px solid rgba(77, 159, 255, 0.2)',
                    borderRadius: '12px',
                    minHeight: '44px'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>AccessAI is thinking</span>
                    <span style={{ 
                      display: 'inline-flex', 
                      gap: '0.3rem',
                      marginLeft: '0.3rem'
                    }}>
                      <span style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: 'var(--accent)', 
                        animation: 'typingBounce 1.4s infinite' 
                      }} />
                      <span style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: 'var(--accent)', 
                        animation: 'typingBounce 1.4s infinite 0.2s' 
                      }} />
                      <span style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: 'var(--accent)', 
                        animation: 'typingBounce 1.4s infinite 0.4s' 
                      }} />
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area - Inline Camera or Text Input */}
        <div style={{
          padding: '1.5rem 1rem',
          borderTop: '1px solid var(--border)',
          background: 'rgba(15, 15, 15, 0.8)',
          display: 'flex',
          gap: '1rem',
          alignItems: (showGesturePanel || showFileUploadPanel) ? 'stretch' : 'flex-end',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          {showFileUploadPanel ? (
            // FILE UPLOAD MODE
            <>
              <div style={{
                position: 'relative',
                width: '100%',
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '12px',
                border: '2px solid var(--border)',
                padding: '1rem',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                {/* Close button */}
                <button
                  onClick={() => setShowFileUploadPanel(false)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 15,
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%)',
                    color: 'white',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: '0.3s',
                    boxShadow: 'rgba(239, 68, 68, 0.3) 0px 4px 15px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                  title="Close File Upload"
                >
                  ✕
                </button>

                {/* File Upload Component */}
                <FileUpload
                  onAnalysisComplete={(analysisData) => {
                    console.log('File analysis completed:', analysisData);
                    // Store file attachment for chat
                    if (analysisData.fileData) {
                      setCurrentFileAttachment(analysisData.fileData);
                      // Close the panel after selecting file
                      setShowFileUploadPanel(false);
                      // Add file info to input text
                      setInputText(`📎 [${analysisData.fileData.name}] - `);
                    }
                  }}
                  onError={(error) => {
                    console.error('File upload error:', error);
                    showError?.(error);
                  }}
                />
              </div>

              {/* Control Buttons Row */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-end'
              }}>
                <button
                  onClick={() => setShowFileUploadPanel(false)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    flexShrink: 0
                  }}
                  title="Close File Upload"
                >
                  ✕
                </button>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Type message... (Ctrl+Enter to send)"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'rgba(42, 42, 42, 0.6)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    resize: 'none',
                    maxHeight: '80px',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.background = 'rgba(42, 42, 42, 0.9)';
                    e.target.style.boxShadow = '0 0 0 2px rgba(14, 120, 245, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)';
                    e.target.style.background = 'rgba(42, 42, 42, 0.6)';
                    e.target.style.boxShadow = 'none';
                  }}
                  rows="1"
                />
                
                {/* Templates Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      border: 'none',
                      background: showTemplates ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(102, 126, 234, 0.1)',
                      color: showTemplates ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      flexShrink: 0,
                      fontSize: '1.2rem'
                    }}
                    title="Quick Templates (Ctrl+Shift+T)"
                  >
                    💡
                  </button>
                  
                  {showTemplates && (
                    <div style={{
                      position: 'absolute',
                      bottom: '50px',
                      left: '0',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      minWidth: '180px',
                      zIndex: 1000,
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                      maxHeight: '250px',
                      overflowY: 'auto'
                    }}>
                      {chatTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => insertTemplate(template)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(102, 126, 234, 0.1)',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '0.8rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'rgba(102, 126, 234, 0.2)';
                            e.target.style.transform = 'translateX(4px)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                            e.target.style.transform = 'translateX(0)';
                          }}
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Search Button */}
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: showSearch ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(59, 130, 246, 0.1)',
                    color: showSearch ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                    fontSize: '1.2rem'
                  }}
                  title="Search Messages (Ctrl+K)"
                >
                  🔍
                </button>
                
                {/* Voice Command Button */}
                <button
                  onClick={toggleVoiceCommands}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isListeningCommands ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 'rgba(239, 68, 68, 0.1)',
                    color: isListeningCommands ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                    fontSize: '1.2rem',
                    animation: isListeningCommands ? 'pulse 1.5s infinite' : 'none'
                  }}
                  title="Voice Commands (say: send, new chat, search)"
                >
                  🎙️
                </button>
                
                <button
                  onClick={toggleVoiceRecording}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isRecording ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 'rgba(77, 159, 255, 0.1)',
                    color: isRecording ? 'white' : 'var(--accent)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    flexShrink: 0
                  }}
                  title={isRecording ? 'Stop Recording' : 'Voice Input'}
                >
                  {isRecording ? '⏸️' : '🎤'}
                </button>
                
                <button
                  onClick={() => setShowFileUploadPanel(!showFileUploadPanel)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: showFileUploadPanel ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(102, 126, 234, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                    padding: '0'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.background = showFileUploadPanel ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(102, 126, 234, 0.1)';
                  }}
                  title="Upload & Analyze Files"
                >
                  <img src="/icons8-clip-50.png" alt="Upload" style={{ 
                    width: '22px', 
                    height: '22px', 
                    objectFit: 'contain',
                    filter: showFileUploadPanel ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(54%) sepia(44%) saturate(1152%) hue-rotate(231deg)',
                    transition: 'filter 0.3s ease'
                  }} />
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() && !isThinking}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: inputText.trim() ? 'linear-gradient(135deg, #0E78F5 0%, #7C3AED 100%)' : 'rgba(77, 159, 255, 0.2)',
                    color: 'white',
                    cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    opacity: inputText.trim() ? 1 : 0.5,
                    flexShrink: 0,
                    fontSize: '18px'
                  }}
                  onMouseOver={(e) => {
                    if (inputText.trim()) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 10px 25px rgba(14, 120, 245, 0.3)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  💬
                </button>
              </div>
            </>
          ) : showGesturePanel ? (
            // CAMERA MODE - Camera + Controls
            <>
              {/* Camera Container */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '320px',
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '12px',
                border: '2px solid var(--border)',
                overflow: 'visible'
              }}>
                {/* Close button */}
                <button
                  onClick={() => setShowGesturePanel(false)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 15,
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%)',
                    color: 'white',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: '0.3s',
                    boxShadow: 'rgba(239, 68, 68, 0.3) 0px 4px 15px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                  title="Close Camera"
                >
                  ✕
                </button>

                {/* Gesture Recognition Component */}
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '100%',
                  overflow: 'visible',
                  pointerEvents: 'auto'
                }}>
                  <GestureRecognition
                    onGestureDetected={(gesture) => {
                      setInputText((prev) => prev + gesture);
                    }}
                  />
                </div>
              </div>

              {/* Control Buttons Row - Below Camera */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-end'
              }}>
                {/* Close Button */}
                <button
                  onClick={() => setShowGesturePanel(false)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    flexShrink: 0
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                  title="Close Camera"
                >
                  ✕
                </button>

                {/* Message Input */}
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Type message or use camera..."
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'rgba(42, 42, 42, 0.6)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    resize: 'none',
                    maxHeight: '80px',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.background = 'rgba(42, 42, 42, 0.9)';
                    e.target.style.boxShadow = '0 0 0 2px rgba(14, 120, 245, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)';
                    e.target.style.background = 'rgba(42, 42, 42, 0.6)';
                    e.target.style.boxShadow = 'none';
                  }}
                  rows="1"
                />

                {/* Mic Button */}
                <button
                  onClick={toggleVoiceRecording}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isRecording ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 'rgba(77, 159, 255, 0.1)',
                    color: isRecording ? 'white' : 'var(--accent)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    flexShrink: 0
                  }}
                  title={isRecording ? 'Stop Recording' : 'Voice Input'}
                >
                  {isRecording ? <Waves size={20} /> : <img src="/mic.png" alt="Mic" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />}
                </button>

                {/* Send Button */}
                <button
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() && !isThinking}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: inputText.trim() ? 'linear-gradient(135deg, #0E78F5 0%, #7C3AED 100%)' : 'rgba(77, 159, 255, 0.2)',
                    color: 'white',
                    cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    opacity: inputText.trim() ? 1 : 0.5,
                    flexShrink: 0
                  }}
                  onMouseOver={(e) => {
                    if (inputText.trim()) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 10px 25px rgba(14, 120, 245, 0.3)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          ) : (
            // TEXT INPUT MODE - Normal message input
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-end',
              justifyContent: 'center',
              maxWidth: '900px',
              margin: '0 auto',
              width: '100%'
            }}>
              <button
                onClick={() => setShowGesturePanel(true)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(77, 159, 255, 0.1)',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  fontSize: '20px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #0E78F5 0%, #7C3AED 100%)';
                  e.target.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(77, 159, 255, 0.1)';
                  e.target.style.color = 'var(--accent)';
                }}
                title="Open Camera for Gestures"
              >
                <img src="/camera.png" alt="Camera" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
              </button>
              <button
                onClick={() => setShowFileUploadPanel(true)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  fontSize: '20px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  e.target.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                  e.target.style.color = '#667eea';
                }}
                title="Upload & Analyze Files"
              >
                <img src="/icons8-clip-50.png" alt="Upload" style={{ width: '22px', height: '22px', objectFit: 'contain', filter: 'brightness(0) saturate(100%) invert(54%) sepia(44%) saturate(1152%) hue-rotate(231deg)' }} />
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Message AccessAI..."
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'rgba(42, 42, 42, 0.6)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  resize: 'none',
                  maxHeight: '100px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.background = 'rgba(42, 42, 42, 0.9)';
                  e.target.style.boxShadow = '0 0 0 2px rgba(14, 120, 245, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.background = 'rgba(42, 42, 42, 0.6)';
                  e.target.style.boxShadow = 'none';
                }}
                rows="1"
              />
              <button
                onClick={toggleVoiceRecording}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isRecording ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : 'rgba(77, 159, 255, 0.1)',
                  color: isRecording ? 'white' : 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  fontSize: '18px'
                }}
                title={isRecording ? 'Stop Recording' : 'Voice Input'}
              >
                {isRecording ? '⏸️' : '🎤'}
              </button>
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() && !isThinking}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  background: inputText.trim() ? 'linear-gradient(135deg, #0E78F5 0%, #7C3AED 100%)' : 'rgba(77, 159, 255, 0.2)',
                  color: 'white',
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  opacity: inputText.trim() ? 1 : 0.5,
                  fontSize: '18px'
                }}
                onMouseOver={(e) => {
                  if (inputText.trim()) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 10px 25px rgba(14, 120, 245, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <img src="/chat.png" alt="Send" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1rem',
          minWidth: '400px',
          maxWidth: '600px',
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          zIndex: 9999,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchMessages(e.target.value);
              }}
              placeholder="Search messages... (Escape to close)"
              autoFocus
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'rgba(77, 159, 255, 0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowSearch(false);
                if (e.key === 'Enter') searchMessages(searchQuery);
              }}
            />
            <button
              onClick={() => setShowSearch(false)}
              style={{
                padding: '0.75rem 1rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              ✕
            </button>
          </div>
          
          {searchResults.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setShowSearch(false);
                    // Highlight the result
                    const element = document.getElementById(`msg-${idx}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(77, 159, 255, 0.1)',
                    border: '1px solid rgba(77, 159, 255, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(77, 159, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(77, 159, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                    {result.sender === 'user' ? 'You' : 'AccessAI'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                    {result.text.substring(0, 100)}...
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No messages found matching "{searchQuery}"
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Type to search your conversation...
            </div>
          )}
        </div>
      )}
      
      {/* Voice Command Mode JARVIS Indicator */}
      {isListeningCommands && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: isVoiceCommandMode 
            ? 'linear-gradient(90deg, rgba(79, 70, 229, 0.95) 0%, rgba(49, 46, 129, 0.95) 100%)' 
            : 'linear-gradient(90deg, rgba(59, 130, 246, 0.95) 0%, rgba(30, 58, 138, 0.95) 100%)',
          color: isVoiceCommandMode ? '#60A5FA' : '#93C5FD',
          padding: '1rem 2rem',
          zIndex: 10000,
          borderBottom: isVoiceCommandMode ? '2px solid #60A5FA' : '2px solid #93C5FD',
          animation: 'slideDown 0.3s ease-out',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          justifyContent: 'space-between',
          textShadow: '0 0 20px rgba(96, 165, 250, 0.5)',
          fontWeight: '600'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.5rem', animation: 'pulse 1.5s infinite' }}>🤖</span>
            <div>
              <span>{isVoiceCommandMode ? 'JARVIS ACTIVE' : 'LISTENING FOR WAKE WORD'}</span>
              <div style={{ opacity: 0.9, marginTop: '0.3rem', fontSize: '0.85rem' }}>
                {isVoiceCommandMode 
                  ? 'Say: "new chat", "search", "send", "delete chat", "settings", "exit"' 
                  : 'Say "Hey Jarvis" to activate'}
              </div>
            </div>
          </div>
          
          {/* Close Button (X) */}
          <button
            onClick={() => {
              if (commandRecognitionRef.current) {
                commandRecognitionRef.current.stop();
              }
              setIsListeningCommands(false);
              setIsVoiceCommandMode(false);
              setVoiceText('');
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: isVoiceCommandMode ? '#60A5FA' : '#93C5FD',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              transition: 'all 0.2s ease',
              fontWeight: 'bold'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              e.target.style.transform = 'scale(1)';
            }}
            title="Close JARVIS"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Voice Command Status Indicator - JARVIS Mode */}
      {isListeningCommands && isVoiceCommandMode && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)',
          color: '#60A5FA',
          padding: '1.2rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 0 20px rgba(79, 70, 229, 0.8), inset 0 0 10px rgba(96, 165, 250, 0.2)',
          animation: 'pulse 1.5s infinite',
          zIndex: 9998,
          border: '1px solid rgba(96, 165, 250, 0.5)'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem', animation: 'pulse 1.5s infinite' }}>🤖</span>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#BFDBFE' }}>LISTENING...</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, maxWidth: '250px', color: '#93C5FD', marginTop: '0.3rem' }}>
                {voiceText || '🎙️ Awaiting command...'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Voice Command Status Indicator - Regular Voice */}
      {isListeningCommands && !isVoiceCommandMode && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
          animation: 'pulse 1.5s infinite',
          zIndex: 9998
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem' }}>🎤</span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Listening...</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, maxWidth: '200px' }}>
                {voiceText || 'Say: send, new chat, search, or anything else'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreviewModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            maxWidth: '90vw',
            maxHeight: '90vh',
            position: 'relative',
            animation: 'fadeIn 0.3s ease'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setImagePreviewModal({ isOpen: false, imageData: null, imageName: null })}
              style={{
                position: 'absolute',
                top: '-50px',
                right: '0px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transition: 'all 0.3s ease',
                zIndex: 10001
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Close preview (ESC)"
            >
              ✕
            </button>

            {/* Image */}
            <img
              src={imagePreviewModal.imageData}
              alt={imagePreviewModal.imageName}
              style={{
                maxWidth: '90vw',
                maxHeight: '75vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
              }}
            />

            {/* Controls */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: '1rem'
            }}>
              {/* Download Button */}
              <button
                onClick={() => downloadImage(imagePreviewModal.imageData, imagePreviewModal.imageName.replace('.png', ''))}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0E78F5 0%, #7C3AED 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 20px rgba(14, 120, 245, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(14, 120, 245, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(14, 120, 245, 0.3)';
                }}
              >
                <img src="/download (2).png" alt="Download" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                Download Image
              </button>

              {/* Image Info */}
              <div style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                textAlign: 'center'
              }}>
                {imagePreviewModal.imageName}
              </div>
            </div>

            {/* Keyboard Hint */}
            <div style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.85rem',
              marginTop: '0.5rem'
            }}>
              Press ESC or click X to close
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Core Animations */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Enhanced Typing Indicator Animations */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes typingBounce {
          0% {
            opacity: 0.4;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-6px);
          }
          100% {
            opacity: 0.4;
            transform: translateY(0);
          }
        }
        
        /* Message Slide In Animation */
        @keyframes slideInMessage {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        /* Smooth Chat Container */
        .chat-messages {
          animation: fadeIn 0.5s ease-out;
        }
        
        /* Button Hover Effects */
        button:hover {
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export default App;
