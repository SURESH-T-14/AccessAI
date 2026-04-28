import React, { useState, useEffect, useRef } from "react";
import { 
  Waves, Send, X,
  Bot, User, BrainCircuit, Sparkles
} from "lucide-react";
import { InferenceClient } from "@huggingface/inference";
import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, deleteDoc, initializeFirestore } from "firebase/firestore";
import GestureRecognition from './components/GestureRecognition';
import LoadingSpinner from './components/LoadingSpinner';
import PerformanceMonitor from './components/PerformanceMonitor';
import ChatSidebar from './components/ChatSidebar';
import Settings from './components/Settings';
import Translator from './components/Translator';
import Login from './components/Login';
import SOS from './components/SOS';
import FileUpload from './components/FileUpload';
import FormattedMessage from './components/FormattedMessage';
import { ToastProvider, useToast } from './components/Toast';
import { validateChatInput, sanitizeInput } from './utils/validation';
import NLPService from './services/NLPService';
import GoogleSearchService from './services/GoogleSearchService';
import EmergencyContactService from './services/EmergencyContactService';
import HuggingFaceService from './services/HuggingFaceService';
import ZImageService from './services/ZImageService';
import useSparklerTrail from './hooks/useSparklerTrail';

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
    
    // Use modern cache settings instead of deprecated enableIndexedDbPersistence
    db = initializeFirestore(app, {
      cache: {
        kind: 'persistent'
      }
    });
    
    console.log("✅ Firebase initialized successfully with persistent cache");
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
  }
} else {
  console.warn("⚠️ Firebase not configured - check .env file");
}

/* --- AI API CONFIG (OpenAI + Hugging Face Fallback) --- */
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
const huggingfaceKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
const OPENAI_MODEL = "gpt-3.5-turbo";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// Using Qwen2.5-7B-Instruct via Hugging Face API (better quality, still free)
const HF_MODEL = "Qwen/Qwen2.5-7B-Instruct";
const HF_URL = "https://api-inference.huggingface.co/models/" + HF_MODEL;
const isOpenAIConfigured = Boolean(openaiKey);
const isHFConfigured = Boolean(huggingfaceKey);
const isAIConfigured = isOpenAIConfigured || isHFConfigured;

// Log configuration status
console.log("🔧 Configuration Status:", {
  openAIConfigured: isOpenAIConfigured,
  huggingFaceConfigured: isHFConfigured,
  firebaseConfigured: isFirebaseConfigured,
  primaryProvider: isOpenAIConfigured ? "OpenAI" : "Hugging Face",
  fallbackAvailable: isHFConfigured
});

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
  // Numbers 1-9 (0 image not available)
  '1': '/signs/1.jpg', '2': '/signs/2.jpg', '3': '/signs/3.jpg',
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
  '?': '/signs/question mark.jpg'
  // Note: 'hello', 'yes', 'no', and '0' images not available - will show emoji glyphs instead
};

const translateToSignGlyph = (text) => {
  const lowerText = text.toLowerCase().trim();
  if (SIGN_GLYPHS[lowerText]) return SIGN_GLYPHS[lowerText];
  return lowerText.split('').map(char => SIGN_GLYPHS[char] || char).join('');
};

/* --- GENERATED IMAGE DISPLAY COMPONENT --- */
const GeneratedImageDisplay = ({ imageRef, userId, chatId }) => {
  const [imageSrc, setImageSrc] = useState(imageRef.fullImage || null);
  const [isLoading, setIsLoading] = useState(!imageRef.fullImage && imageRef.mongoOnly);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If image is stored in MongoDB only, fetch it
    if (imageRef.mongoOnly && imageRef.id && !imageSrc) {
      const fetchImage = async () => {
        try {
          setIsLoading(true);
          const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';
          const response = await fetch(`${BACKEND_URL}/api/get-images/${userId}/${chatId}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch image from database');
          }
          
          const data = await response.json();
          const image = data.images.find(img => img.id === imageRef.id);
          
          if (image && image.image) {
            setImageSrc(image.image);
          } else {
            throw new Error('Image not found in database');
          }
        } catch (err) {
          console.error('Failed to fetch image:', err);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchImage();
    }
  }, [imageRef, userId, chatId, imageSrc]);

  if (error) {
    return (
      <div style={{
        padding: '1rem',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '8px',
        color: '#ef4444'
      }}>
        ⚠️ Failed to load image: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        padding: '1rem',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        ⏳ Loading image from database...
      </div>
    );
  }

  if (!imageSrc) {
    return null;
  }

  const downloadImage = () => {
    if (!imageSrc) return;
    
    try {
      const link = document.createElement('a');
      link.href = imageSrc;
      link.download = `${imageRef.prompt?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'generated-image'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('✅ Image downloaded');
    } catch (error) {
      console.error('❌ Download failed:', error);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      padding: '0.5rem',
      background: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '8px',
      marginBottom: '0.5rem'
    }}>
      <img 
        src={imageSrc} 
        alt={imageRef.prompt || 'Generated Image'}
        style={{
          width: '100%',
          maxWidth: '300px',
          borderRadius: '8px',
          objectFit: 'cover',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer'
        }}
        onClick={downloadImage}
        title="Click to download"
        onError={(e) => {
          console.error('Generated image failed to load:', {
            prompt: imageRef.prompt,
            hasFullImage: !!imageRef.fullImage,
            mongoOnly: imageRef.mongoOnly,
            id: imageRef.id,
            srcLength: imageSrc?.length
          });
          setError('Image failed to render');
        }}
      />
      <button
        onClick={downloadImage}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
          transition: 'transform 0.2s, opacity 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        ⬇️ Download
      </button>
      {imageRef.isThumbnail && (
        <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          ⚠️ Thumbnail version
        </span>
      )}
    </div>
  );
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
  
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);

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
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript;
            setInputText(prev => prev + (prev ? ' ' : '') + transcript);
          }
        }
      };
      
      recognitionRef.current = recognition;
    }
    // Hand detection is handled by Flask backend via GestureRecognition component
    // No need to initialize local hand detector - using MediaPipe on server side

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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
    if (!user || !isFirebaseConfigured || !db || !currentChatId) {
      console.log("⏭️ Skipping Firestore listener:", { 
        user: !!user, 
        isFirebaseConfigured, 
        db: !!db, 
        currentChatId 
      });
      return;
    }
    
    // Clear messages immediately when switching chats (before loading from Firestore)
    setMessages([]);
    
    console.log(`📡 Setting up Firestore listener for chat ${currentChatId}`);
    
    // Query messages for current chat only
    try {
      const messagesRef = collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages");
      const q = query(messagesRef);
      
      const unsubscribe = onSnapshot(q, (snap) => {
        console.log(`📥 Received ${snap.docs.length} messages from Firestore`);
        const data = snap.docs.map(d => {
          const msgData = { id: d.id, ...d.data() };
          
          // Log attachment info if present
          if (msgData.attachment) {
            console.log(`📎 Message ${d.id} has attachment:`, {
              name: msgData.attachment.name,
              type: msgData.attachment.type,
              isImage: msgData.attachment.isImage,
              hasData: !!msgData.attachment.data,
              dataLength: msgData.attachment.data?.length,
              dataPrefix: msgData.attachment.data?.substring(0, 50)
            });
          }
          
          return msgData;
        });
        
        // Deduplicate messages by ID
        const uniqueData = Array.from(
          new Map(data.map(item => [item.id, item])).values()
        );
        
        // Sort by timestamp
        const sortedData = uniqueData.sort((a, b) => {
          const aTime = a.timestamp?.seconds || 0;
          const bTime = b.timestamp?.seconds || 0;
          return aTime - bTime;
        });
        
        console.log(`✅ Displaying ${sortedData.length} unique messages`);
        
        setMessages(sortedData);
        // Update chats with new messages
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId ? { ...chat, messages: sortedData } : chat
        ));
      }, (error) => {
        console.warn("⚠️ Firestore listener error (collection may not exist yet):", error);
      });
      
      return unsubscribe;
    } catch (err) {
      console.error("❌ Firestore query error:", err);
    }
  }, [user, currentChatId, isFirebaseConfigured, db, appId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const toggleVoiceRecording = () => {
    if (recognitionRef.current) {
      if (isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      } else {
        setTranscript('');
        recognitionRef.current.start();
        setIsRecording(true);
      }
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

  const fetchWithRetry = async (url, options, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔄 Fetch attempt ${i + 1}/${maxRetries}`);
        const response = await fetch(url, options);
        console.log(`📡 Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log("✅ Fetch successful");
          return data;
        }
        
        // Don't retry on 429 (rate limit/no credits) or other client errors
        if (response.status === 429 || (response.status >= 400 && response.status < 500)) {
          const errorText = await response.text();
          console.error(`❌ HTTP ${response.status} error (no retry):`, errorText);
          const error = new Error(`HTTP ${response.status}: ${errorText}`);
          error.status = response.status;
          throw error;
        }
        
        // Only retry on 5xx server errors
        console.warn(`⚠️ Server error (${response.status}), will retry...`);
      } catch (err) {
        console.error(`❌ Fetch error on attempt ${i + 1}:`, err.message);
        
        // If error has a status code (HTTP error), throw immediately without retry
        if (err.status) {
          throw err;
        }
        
        // If it's an abort error (timeout) and not the last retry, continue
        if (err.name === 'AbortError' && i < maxRetries - 1) {
          console.log('⏱️ Request timeout - retrying with longer timeout...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        if (i === maxRetries - 1) throw err;
      }
      const delay = Math.pow(2, i) * 1000;
      console.log(`⏳ Waiting ${delay}ms before retry...`);
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

    // Play sign visualization for user's input
    playSignSequence(cleanText);
    
    setInputText("");
    setIsThinking(true);

    // Check if required services are configured
    if (!isFirebaseConfigured || !db || !isAIConfigured) {
      setIsThinking(false);
      let errorMsg = "⚠️ Configuration Error:\n";
      if (!isFirebaseConfigured) errorMsg += "- Firebase not configured\n";
      if (!db) errorMsg += "- Firestore not initialized\n";
      if (!isAIConfigured) errorMsg += "- No AI provider configured (need OpenAI or Hugging Face API key)\n";
      errorMsg += "\nPlease check your .env file and restart the server.";
      
      console.error("Configuration check failed:", { 
        isFirebaseConfigured, 
        db: !!db, 
        isAIConfigured,
        isOpenAIConfigured,
        isHFConfigured
      });
      
      try {
        if (isFirebaseConfigured && db) {
          await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
            text: errorMsg, sender: "bot", timestamp: serverTimestamp()
          });
        } else {
          alert(errorMsg);
        }
      } catch (err) {
        console.error("Failed to save error message:", err);
        alert(errorMsg);
      }
      return;
    }

    try {
      // Check if this is an image generation request
      if (HuggingFaceService.isImageGenerationRequest(cleanText)) {
        console.log('🎨 Image generation request detected');
        
        // Determine which model to use (Z-Image or Stable Diffusion XL)
        const useZImage = cleanText.toLowerCase().includes('z-image') || 
                          cleanText.toLowerCase().includes('zimage') ||
                          /chinese|中文|multilingual/i.test(cleanText);
        
        const modelName = useZImage ? 'Z-Image' : 'Stable Diffusion XL';
        console.log(`🎨 Using model: ${modelName}`);
        
        // Check if Hugging Face is configured
        if (!HuggingFaceService.isConfigured() && !useZImage) {
          const errorMsg = "⚠️ Hugging Face not configured.\n\n📝 To enable image generation:\n1. Get API key from https://huggingface.co/settings/tokens\n2. Add to .env: VITE_HUGGINGFACE_API_KEY=your_key\n3. Restart the app";
          
          await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
            text: errorMsg,
            sender: "bot",
            timestamp: serverTimestamp()
          });
          
          setIsThinking(false);
          return;
        }
        
        // Extract prompt from user message
        const prompt = HuggingFaceService.extractPrompt(cleanText);
        console.log('🎨 Generating image for prompt:', prompt);
        
        // Save user message
        await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
          text: cleanText,
          sender: "user",
          timestamp: serverTimestamp()
        });
        
        try {
          // Generate image using selected model
          console.log(`🚀 Starting ${modelName} image generation...`);
          
          let generation;
          if (useZImage) {
            // Use Z-Image model
            generation = await ZImageService.generateImage(prompt, {
              height: 1280,
              width: 720,
              steps: 50,
              guidanceScale: 4.0
            });
            // Normalize response format
            generation = {
              image: generation.imageData,
              prompt: generation.prompt,
              model: generation.model,
              size: generation.size
            };
          } else {
            // Use Stable Diffusion XL
            generation = await HuggingFaceService.generateImage(prompt);
          }
          
          // Delete loading message
          try {
            await deleteDoc(loadingDocRef);
          } catch (e) {
            console.warn('Could not delete loading message:', e);
          }
          
          // Validate that we have image data
          if (!generation || !generation.image || typeof generation.image !== 'string') {
            throw new Error('Invalid image data received from generator');
          }
          
          console.log('📦 Image generated, size:', generation.image.length, 'bytes');
          
          // Validate that we have a proper data URL
          let imageData = generation.image;
          if (!imageData || !imageData.startsWith('data:image/')) {
            throw new Error('Invalid image data format. Expected data URL.');
          }
          
          console.log('✅ Valid data URL detected:', imageData.substring(0, 30) + '...');
          
          // Store in MongoDB instead of Firestore to avoid size limits
          try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';
            const storeResponse = await fetch(`${BACKEND_URL}/api/store-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                chatId: String(currentChatId),
                prompt: prompt,
                imageData: imageData,
                model: generation.model || 'huggingface'
              })
            });
            
            if (!storeResponse.ok) {
              const errorText = await storeResponse.text();
              console.error('MongoDB storage failed:', errorText);
              throw new Error('Failed to store image in MongoDB');
            }
            
            const storeResult = await storeResponse.json();
            console.log('✅ Image stored in MongoDB:', storeResult.imageId);
            
            // Check if image is too large for Firestore (1MB limit)
            const FIRESTORE_LIMIT = 1000000; // ~1MB in bytes
            const shouldStoreInFirestore = imageData.length < FIRESTORE_LIMIT;
            
            if (!shouldStoreInFirestore) {
              console.warn('⚠️ Image too large for Firestore, storing reference only');
            }
            
            // Save message with image reference
            const messageData = {
              text: `✅ Image created successfully!\n\n🎨 Prompt: "${prompt}"\n💾 Stored in database\n📊 Size: ${Math.round(storeResult.size / 1024)} KB`,
              sender: "bot",
              timestamp: serverTimestamp(),
              imageRef: {
                id: storeResult.imageId,
                prompt: prompt,
                mongoOnly: !shouldStoreInFirestore
              }
            };
            
            // Only include fullImage if it fits in Firestore
            if (shouldStoreInFirestore) {
              messageData.imageRef.fullImage = imageData;
              console.log('✅ Image included in Firestore (within size limit)');
            } else {
              console.log('📍 Image stored in MongoDB only, use imageRef.id to fetch');
            }
            
            await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), messageData);
            
            console.log('✅ Image message saved');
          } catch (storeError) {
            console.error('Failed to store in MongoDB:', storeError);
            
            // Fallback: still display the image but warn about storage
            await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
              text: `✅ Image created!\n\n🎨 "${prompt}"\n⚠️ Could not store in database: ${storeError.message}`,
              sender: "bot",
              timestamp: serverTimestamp(),
              imageRef: {
                prompt: prompt,
                fullImage: imageData, // Still use full valid data URL
                isThumbnail: false
              }
            });
          }
        } catch (genError) {
          console.error('❌ Image generation error:', genError);
          
          // Delete loading message if it exists
          try {
            if (loadingDocRef) {
              await deleteDoc(loadingDocRef);
            }
          } catch (e) {
            console.warn('Could not delete loading message:', e);
          }
          
          let errorMessage = '❌ Failed to generate image.\n\n';
          
          if (genError.message.includes('Model is loading')) {
            errorMessage += genError.message + '\n\n💡 The AI model needs to warm up. Please try again in a moment.';
          } else if (genError.message.includes('not configured')) {
            errorMessage += genError.message;
          } else {
            errorMessage += `Error: ${genError.message}\n\n💡 Try:\n• Simplifying your prompt\n• Using different words\n• Waiting a moment and trying again`;
          }
          
          await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
            text: errorMessage,
            sender: "bot",
            timestamp: serverTimestamp()
          });
        }
        
        setIsThinking(false);
        return;
      }
      
      // Analyze user message with NLP (in background, don't await)
      let nlpAnalysis = null;
      // Fire and forget - don't block message processing on NLP
      NLPService.quickAnalysis(cleanText)
        .then(analysis => {
          if (analysis && typeof analysis === 'object') {
            nlpAnalysis = JSON.parse(JSON.stringify(analysis));
          }
        })
        .catch(err => console.warn('NLP analysis failed:', err));

      // Save user message with NLP data and file attachment
      console.log("Saving user message to Firestore:", { currentChatId, cleanText });
      const messageData = {
        text: cleanText, 
        sender: "user", 
        timestamp: serverTimestamp()
      };
      
      // Only add nlp if it's valid
      if (nlpAnalysis && Object.keys(nlpAnalysis).length > 0) {
        messageData.nlp = nlpAnalysis;
      }
      
      // Add file attachment if present
      if (currentFileAttachment) {
        console.log('📎 Adding file attachment:', {
          name: currentFileAttachment.name,
          type: currentFileAttachment.type,
          isImage: currentFileAttachment.isImage,
          dataLength: currentFileAttachment.data?.length,
          dataPrefix: currentFileAttachment.data?.substring(0, 100)
        });
        
        // Validate attachment fields are primitives
        if (!currentFileAttachment.name || typeof currentFileAttachment.name !== 'string') {
          console.error('Invalid attachment name');
          throw new Error('Invalid file attachment: name must be a string');
        }
        if (!currentFileAttachment.type || typeof currentFileAttachment.type !== 'string') {
          console.error('Invalid attachment type');
          throw new Error('Invalid file attachment: type must be a string');
        }
        if (!currentFileAttachment.data || typeof currentFileAttachment.data !== 'string') {
          console.error('Invalid attachment data');
          throw new Error('Invalid file attachment: data must be a base64 string');
        }
        
        // Create clean attachment with ONLY primitive types - use JSON parse/stringify for purity
        const cleanAttachment = JSON.parse(JSON.stringify({
          name: String(currentFileAttachment.name),
          type: String(currentFileAttachment.type),
          isImage: Boolean(currentFileAttachment.isImage === true),
          data: String(currentFileAttachment.data)
        }));
        
        // Final validation - ensure all values are primitives
        for (const [key, value] of Object.entries(cleanAttachment)) {
          const valueType = typeof value;
          if (valueType !== 'string' && valueType !== 'boolean' && valueType !== 'number') {
            console.error(`Invalid type for ${key}: ${valueType}`, value);
            throw new Error(`Attachment field ${key} contains invalid type: ${valueType}`);
          }
        }
        
        // Create prototype-less object for Firestore (prevents "nested entity" error)
        const firestoreAttachment = Object.create(null);
        firestoreAttachment.name = cleanAttachment.name;
        firestoreAttachment.type = cleanAttachment.type;
        firestoreAttachment.isImage = cleanAttachment.isImage;
        firestoreAttachment.data = cleanAttachment.data;
        
        messageData.attachment = firestoreAttachment;
        
        // Check Firestore size limits (1MB per document)
        const attachmentSize = new Blob([JSON.stringify(messageData.attachment)]).size;
        const attachmentSizeMB = (attachmentSize / (1024 * 1024)).toFixed(2);
        console.log(`📊 Attachment size: ${attachmentSizeMB}MB`, {
          name: typeof cleanAttachment.name,
          type: typeof cleanAttachment.type,
          isImage: typeof cleanAttachment.isImage,
          data: typeof cleanAttachment.data
        });
        
        if (attachmentSize > 1048576) { // 1MB in bytes
          console.warn('⚠️ WARNING: Attachment may exceed Firestore document size limit (1MB)');
          // Optionally compress or store in Firebase Storage instead
        }
      }
      
      console.log("💾 Saving message to Firestore with data:", {
        text: messageData.text,
        hasAttachment: !!messageData.attachment,
        attachmentType: messageData.attachment?.type
      });
      
      await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), messageData);
      console.log("✅ User message saved successfully");
      
      // Clear file attachment after sending
      setCurrentFileAttachment(null);

      // Build chat history for context
      const chatHistory = messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [
          { text: m.text },
          // Add image data if attachment exists
          ...(m.attachment && m.attachment.isImage ? [{ inlineData: { mimeType: m.attachment.type, data: m.attachment.data.split(',')[1] } }] : [])
        ]
      }));
      
      // Add current file attachment to user message if present
      const userMessageParts = [{ text: cleanText }];
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

      try {
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

      // Prepare API payload with search context and current date - ALWAYS include date prominently
      const systemMessage = searchContext
        ? `You are AccessAI, a helpful assistant for people with accessibility needs. Be concise, empathetic, and clear.\n\n**IMPORTANT: Today's date is ${currentDateTime.date} and the current time is ${currentDateTime.time}. Always refer to this when answering date/time questions.**\n\nContext information:\n${searchContext}`
        : `You are AccessAI, a helpful assistant for people with accessibility needs. Be concise, empathetic, and clear.\n\n**IMPORTANT: Today's date is ${currentDateTime.date} and the current time is ${currentDateTime.time}. Always refer to this when answering date/time questions.**`;

      let botResponse = "";
      let usedProvider = "";

      // TRY OPENAI FIRST (if configured)
      if (isOpenAIConfigured) {
        try {
          console.log("🚀 Trying OpenAI API...");
          
          // Convert chat history to OpenAI format
          const openaiMessages = [
            { role: "system", content: systemMessage },
            ...chatHistory.map(m => ({
              role: m.role === 'model' ? 'assistant' : m.role,
              content: m.parts[0].text
            })),
            { role: "user", content: cleanText }
          ];

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const result = await fetchWithRetry(OPENAI_URL, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
              model: OPENAI_MODEL,
              messages: openaiMessages,
              temperature: 0.7,
              max_tokens: 1000
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          botResponse = result.choices?.[0]?.message?.content || "";
          usedProvider = "OpenAI";
          console.log("✅ OpenAI API success");
        } catch (openaiError) {
          console.warn("⚠️ OpenAI failed:", openaiError.status || openaiError.message);
          
          // Always try Hugging Face fallback if OpenAI fails and HF is available
          if (isHFConfigured) {
            console.log("🔄 Falling back to Hugging Face...");
            // botResponse remains empty, will trigger HF below
          } else {
            // No fallback available
            throw new Error("OpenAI API failed: " + (openaiError.message || "Unknown error"));
          }
        }
      }

      // TRY HUGGING FACE (if OpenAI failed or not configured)
      if (!botResponse && isHFConfigured) {
        try {
          console.log("🚀 Using Hugging Face API (FREE) with", HF_MODEL);
          
          // Initialize Hugging Face client
          const hfClient = new InferenceClient(huggingfaceKey);
          
          // Build conversation messages for Hugging Face
          const hfMessages = [
            { role: "system", content: systemMessage }
          ];
          
          // Add chat history
          chatHistory.forEach(m => {
            hfMessages.push({
              role: m.role === 'model' ? 'assistant' : 'user',
              content: m.parts[0].text
            });
          });
          
          // Add current user message
          hfMessages.push({ role: "user", content: cleanText });

          console.log("📝 Calling Hugging Face with", hfMessages.length, "messages");
          
          // Use chatCompletion with Qwen2.5-7B (better quality than Mistral)
          const result = await hfClient.chatCompletion({
            model: HF_MODEL,
            messages: hfMessages,
            max_tokens: 500,
            temperature: 0.7
          });

          botResponse = result.choices?.[0]?.message?.content || "";
          usedProvider = "Hugging Face - Qwen2.5-7B";
          console.log("✅ Hugging Face API success, response length:", botResponse.length);
        } catch (hfError) {
          console.error("❌ Hugging Face failed:", hfError);
          throw new Error("All AI providers failed");
        }
      }

      if (!botResponse) {
        throw new Error("No AI provider available");
      }

      const cleanedResponse = cleanBotResponse(botResponse);
      console.log(`✅ Response from ${usedProvider}`);

      // Save bot response
      console.log("💾 Saving bot response to Firestore:", { currentChatId, responseLength: cleanedResponse.length });
      await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
        text: cleanedResponse, sender: "bot", timestamp: serverTimestamp()
      });
      console.log("✅ Bot response saved successfully");
      
      // Speak response if enabled
      if (isSpeaking && window.speechSynthesis) {
        try {
          const ut = new SpeechSynthesisUtterance(cleanedResponse);
          window.speechSynthesis.speak(ut);
        } catch (speechErr) {
          console.warn("Speech synthesis unavailable:", speechErr);
        }
      }
      
      // Play sign sequence
      playSignSequence(cleanedResponse);
    } catch (apiError) {
        // Handle different error types
        let userErrorMsg = "❌ Failed to get response. Please try again.";
        
        if (apiError.name === 'AbortError') {
          userErrorMsg = "⏱️ Request timed out.\n\n💡 Try:\n• Simplifying your request\n• Making it more specific\n• Asking again in a moment";
        } else if (apiError.message?.includes("No AI provider")) {
          userErrorMsg = "❌ No AI service configured.\n\nPlease add either:\n• OpenAI API key (VITE_OPENAI_API_KEY)\n• Hugging Face API key (VITE_HUGGINGFACE_API_KEY)\n\nin your .env file.";
        } else if (apiError.message?.includes("All AI providers failed")) {
          userErrorMsg = "❌ All AI services failed.\n\n" +
            (isOpenAIConfigured ? "• OpenAI: No credits/billing\n" : "") +
            (isHFConfigured ? "• Hugging Face: Service error\n" : "") +
            "\n💡 Try again in a moment or check your API keys.";
        } else if (apiError.status === 401 || apiError.status === 403) {
          userErrorMsg = "🔑 API authentication failed. Please check your API keys in the .env file.";
        } else if (apiError.status === 429) {
          userErrorMsg = "⚡ Rate limit exceeded on OpenAI.\n\n" +
            (isHFConfigured ? "✅ Automatic fallback to Hugging Face should activate." : 
             "💡 Add VITE_HUGGINGFACE_API_KEY in .env for free fallback.");
        } else if (apiError.status === 500 || apiError.status === 503) {
          userErrorMsg = "🔧 API server error. The service is having issues. Please try again in a moment.";
        } else if (apiError.message) {
          userErrorMsg = `❌ Error: ${apiError.message}`;
        }

        console.error("AI API Error:", apiError);
        
        if (isFirebaseConfigured && db) {
          await addDoc(collection(db, "artifacts", appId, "users", user.uid, "chats", String(currentChatId), "messages"), {
            text: userErrorMsg, 
            sender: "bot", 
            timestamp: serverTimestamp()
          });
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
            backgroundClip: 'text'
          }}>
            AccessAI
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
                    // Log to Firestore (non-blocking - SMS/Email already sent)
                    if (db) {
                      try {
                        await EmergencyContactService.logEmergencyEvent(user.uid, eventData, db);
                      } catch (err) {
                        // Silently fail - critical alerts (SMS/Email) already sent
                        console.warn('Event logging skipped:', err.message);
                      }
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
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
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
                            border: '2px solid var(--primary)',
                            margin: '0 auto'
                          }}
                        />
                      </div>
                    )}
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {user?.displayName || 'User'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
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
                
                // Generate a truly unique key using ID + timestamp + index as fallback
                const uniqueKey = m.id ? `${m.id}-${m.timestamp?.seconds || idx}` : `msg-${idx}-${Date.now()}`;
                
                return (
                <div key={uniqueKey} style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  animation: 'fadeIn 0.3s ease'
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
                    gap: '0.4rem'
                  }}>
                    {/* File Attachment Thumbnail */}
                    {m.attachment && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        background: 'rgba(102, 126, 234, 0.1)',
                        border: '1px solid rgba(102, 126, 234, 0.3)',
                        borderRadius: '8px',
                        marginBottom: '0.5rem'
                      }}>
                        {m.attachment.isImage ? (
                          <img 
                            src={m.attachment.data} 
                            alt={m.attachment.name}
                            style={{
                              maxWidth: '150px',
                              maxHeight: '150px',
                              borderRadius: '6px',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              console.error('Image failed to load:', {
                                name: m.attachment.name,
                                type: m.attachment.type,
                                dataLength: m.attachment.data?.length,
                                dataPrefix: m.attachment.data?.substring(0, 50)
                              });
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            background: 'rgba(102, 126, 234, 0.2)',
                            borderRadius: '6px'
                          }}>
                            <span style={{ fontSize: '1.5rem' }}>📎</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{m.attachment.name}</span>
                          </div>
                        )}
                        {/* Fallback for failed images */}
                        <div style={{
                          display: 'none',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          background: 'rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                            {m.attachment.name} (Image failed to load)
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Generated Image Reference (MongoDB/Firestore stored) */}
                    {m.imageRef && (
                      <GeneratedImageDisplay 
                        imageRef={m.imageRef}
                        userId={user?.uid}
                        chatId={currentChatId}
                      />
                    )}
                    
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      background: m.sender === 'user' 
                        ? 'linear-gradient(135deg, rgba(14, 120, 245, 0.25) 0%, rgba(124, 58, 237, 0.2) 100%)'
                        : 'rgba(77, 159, 255, 0.1)',
                      border: m.sender === 'user'
                        ? '1px solid rgba(124, 58, 237, 0.3)'
                        : '1px solid rgba(77, 159, 255, 0.2)',
                      color: 'var(--text-primary)',
                      wordBreak: 'break-word'
                    }}>
                      {m.sender === 'bot' ? (
                        <FormattedMessage text={m.text} />
                      ) : (
                        m.text
                      )}
                    </div>
                    
                    {/* Action Buttons for Bot Messages */}
                    {m.sender === 'bot' && m.text && (
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        marginTop: '0.5rem'
                      }}>
                        {/* YouTube Button */}
                        <button
                          onClick={() => {
                            const query = encodeURIComponent(m.text.substring(0, 100));
                            window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.8rem',
                            background: '#FF0000',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            transition: 'transform 0.2s, opacity 0.2s'
                          }}
                          onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; e.target.style.opacity = '0.9'; }}
                          onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.opacity = '1'; }}
                          title="Search on YouTube"
                        >
                          <img src="/youtube.png" alt="YouTube" style={{ width: '16px', height: '16px' }} />
                          YouTube
                        </button>

                        {/* Suggestions Button */}
                        <button
                          onClick={async () => {
                            const suggestPrompt = `Give me 3 brief suggestions or tips related to: "${m.text.substring(0, 100)}"`;
                            await handleSend(suggestPrompt);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.8rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            transition: 'transform 0.2s, opacity 0.2s'
                          }}
                          onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; e.target.style.opacity = '0.9'; }}
                          onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.opacity = '1'; }}
                          title="Get suggestions"
                        >
                          💡 Suggestions
                        </button>

                        {/* Copy Button */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(m.text)
                              .then(() => {
                                console.log('✅ Text copied to clipboard');
                              })
                              .catch(err => {
                                console.error('❌ Failed to copy:', err);
                              });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(124, 58, 237, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            transition: 'transform 0.2s, opacity 0.2s'
                          }}
                          onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; e.target.style.opacity = '0.9'; }}
                          onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.opacity = '1'; }}
                          title="Copy to clipboard"
                        >
                          <img src="/copy.png" alt="Copy" style={{ width: '16px', height: '16px' }} />
                          Copy
                        </button>

                        {/* Image Button (if message has image reference) */}
                        {m.imageRef && (
                          <button
                            onClick={() => {
                              const imgElement = document.querySelector(`[alt="${m.imageRef.prompt || 'Generated Image'}"]`);
                              if (imgElement) {
                                imgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.4rem 0.8rem',
                              background: 'rgba(59, 130, 246, 0.8)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              transition: 'transform 0.2s, opacity 0.2s'
                            }}
                            onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; e.target.style.opacity = '0.9'; }}
                            onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.opacity = '1'; }}
                            title="Scroll to image"
                          >
                            <img src="/image.png" alt="Image" style={{ width: '16px', height: '16px' }} />
                            Image
                          </button>
                        )}
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
                  alignItems: 'center',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  <img 
                    src="/logo.png" 
                    alt="AccessAI Logo" 
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '6px',
                      objectFit: 'contain',
                      flexShrink: 0,
                      animation: 'pulse 2s infinite'
                    }} 
                  />
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15))',
                    borderRadius: '12px',
                    border: '1px solid rgba(102, 126, 234, 0.3)'
                  }}>
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      animation: 'bounce 1.2s infinite',
                      boxShadow: '0 0 10px rgba(102, 126, 234, 0.5)'
                    }} />
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      animation: 'bounce 1.2s infinite', 
                      animationDelay: '0.2s',
                      boxShadow: '0 0 10px rgba(102, 126, 234, 0.5)'
                    }} />
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      animation: 'bounce 1.2s infinite', 
                      animationDelay: '0.4s',
                      boxShadow: '0 0 10px rgba(102, 126, 234, 0.5)'
                    }} />
                  </div>
                  <span style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontStyle: 'italic',
                    animation: 'fadeInOut 2s infinite'
                  }}>
                    Thinking...
                  </span>
                </div>
              )}
            </>
          )}
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
                  placeholder="Type message..."
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
                    key={`gesture-${currentChatId}`}
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


      <style>{`
        @keyframes bounce {
          0%, 100% { 
            opacity: 0.3; 
            transform: translateY(0);
          }
          50% { 
            opacity: 1; 
            transform: translateY(-8px);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;
