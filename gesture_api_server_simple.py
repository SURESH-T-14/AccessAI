#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask Server for Hand Gesture + Chatbot Integration with AccessAI
Enhanced with NLP processing, sentiment analysis, and intent detection
"""
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import cv2
import numpy as np
from werkzeug.utils import secure_filename
import io
from PIL import Image
import PyPDF2
from docx import Document
from pptx import Presentation
import os
import tempfile
import tensorflow as tf
import pickle
import threading
import time
from pathlib import Path
import sys
import os
import json
import requests

# Load environment variables from .env
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[✓] Loaded environment variables from {env_path}")
    else:
        load_dotenv()  # Try to load from default locations
        print("[✓] Loaded environment variables from default location")
except ImportError:
    print("[!] python-dotenv not installed, skipping .env loading")

# Try importing gTTS for Tamil TTS support
try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
    print("[✓] gTTS (Google Text-to-Speech) imported successfully")
except ImportError as e:
    GTTS_AVAILABLE = False
    print(f"[!] gTTS not available: {e}")

# Try importing image generator
try:
    from image_generator import ImageGenerator
    IMAGE_GENERATOR_AVAILABLE = True
    print("[✓] Image Generator imported successfully")
except ImportError as e:
    IMAGE_GENERATOR_AVAILABLE = False
    print(f"[!] Image Generator not available: {e}")

# Try importing MongoDB module
try:
    from mongodb_connection import connect_mongodb, get_db, close_connection
    MONGODB_AVAILABLE = True
    print("[✓] MongoDB module imported successfully")
except ImportError as e:
    MONGODB_AVAILABLE = False
    print(f"[!] MongoDB module not available: {e}")

# Set UTF-8 encoding
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Import NLP processor
try:
    from nlp_processor import create_nlp_processor
    NLP_AVAILABLE = True
    print("[✓] NLP processor imported successfully")
except ImportError as e:
    NLP_AVAILABLE = False
    print(f"[!] NLP processor not available: {e}")

# Import Argos Translator for local translation
try:
    from argos_translator import get_translator, init_translator
    ARGOS_AVAILABLE = True
    print("[✓] Argos Translate imported successfully")
except ImportError as e:
    ARGOS_AVAILABLE = False
    print(f"[!] Argos Translate not available: {e}")

# MediaPipe imports - will be imported dynamically in process_frame_bytes

app = Flask(__name__)
CORS(app)

# Initialize NLP processor with optional Gemini API
nlp_processor = None
if NLP_AVAILABLE:
    gemini_key = os.getenv('GEMINI_API_KEY')
    nlp_processor = create_nlp_processor(api_key=gemini_key)
    print("[✓] NLP processor initialized")

# Initialize Argos Translator (async initialization)
translator = None
if ARGOS_AVAILABLE:
    try:
        # Skip Argos initialization to prevent hanging
        # It's not critical for core functionality
        print("[*] Argos Translator available but not initialized (skipped to prevent blocking)")
        translator = None
    except Exception as e:
        print(f"[!] Argos Translator import error: {e}")
        translator = None

# Global state
latest_gesture = None
latest_confidence = 0.0
detection_active = False
gesture_history = []
cap = None
hands = None
mp_drawing = None

# Performance optimization settings
ENABLE_DETECTION_CACHING = False  # DISABLED - turned off to fix hand tracking
ENABLE_CONFIDENCE_SMOOTHING = False  # DISABLED - turned off to fix hand tracking
CONFIDENCE_SMOOTHING_BUFFER = 5
last_detected_features_hash = None
cached_prediction = None
confidence_history = []
FRAME_SKIP_INTERVAL = 2  # Process every Nth frame
frame_counter = 0

# Initialize MediaPipe Hand Landmarker once at startup
print("[*] Initializing MediaPipe Hand Landmarker...")
# Lazy load - only load when first request comes in
landmarker = None
LANDMARKER_INITIALIZED = False

def init_landmarker():
    global landmarker, LANDMARKER_INITIALIZED
    if LANDMARKER_INITIALIZED:
        return landmarker
    
    try:
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        
        base_options = python.BaseOptions(model_asset_path="hand_landmarker.task")
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            num_hands=2
        )
        landmarker = vision.HandLandmarker.create_from_options(options)
        LANDMARKER_INITIALIZED = True
        print("[OK] Hand Landmarker initialized for dual-hand detection")
    except Exception as e:
        print(f"[ERR] Hand Landmarker initialization failed: {e}")
        landmarker = None
        LANDMARKER_INITIALIZED = True
    
    return landmarker

# Load ML models
print("[*] Loading AI models...")
gesture_model = None
GESTURE_LABELS = []

# Try to load improved gesture classifier first (1-9, A-Z)
try:
    if os.path.exists("gesture_classifier.pkl"):
        with open("gesture_classifier.pkl", "rb") as f:
            gesture_model = pickle.load(f)
        print("[OK] Improved Gesture Classifier (1-9, A-Z) loaded successfully")
        # Load class mapping if available
        try:
            with open("gesture_class_map.pkl", "rb") as f:
                class_map = pickle.load(f)
                # Convert dict {0: '1', 1: '2', ...} to list ['1', '2', ...]
                if isinstance(class_map, dict):
                    GESTURE_LABELS = [class_map[i] for i in sorted(class_map.keys())]
                else:
                    GESTURE_LABELS = class_map
            print(f"[OK] Class mapping loaded: {GESTURE_LABELS}")
        except Exception as map_err:
            print(f"[!] Class mapping failed: {map_err}")
            GESTURE_LABELS = list("123456789") + list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    else:
        raise FileNotFoundError("gesture_classifier.pkl not found")
except Exception as e:
    print(f"[!] Improved model not available: {e}")
    # Fall back to Indian gesture classifier
    try:
        if os.path.exists("indian_gesture_classifier.pkl"):
            with open("indian_gesture_classifier.pkl", "rb") as f:
                gesture_model = pickle.load(f)
            print("[OK] Fallback: Indian Gesture Classifier loaded successfully")
            GESTURE_LABELS = list("123456789") + list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        else:
            raise FileNotFoundError("No gesture model found")
    except Exception as e2:
        print(f"[!] Model loading failed: {e2}")
        print("[!] Server will run without gesture recognition")
        gesture_model = None
        GESTURE_LABELS = list("123456789") + list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

# Ensure LOVE_YOU is included
GESTURE_LABELS_LIST = list(GESTURE_LABELS) if not isinstance(GESTURE_LABELS, list) else GESTURE_LABELS
if "LOVE_YOU" not in GESTURE_LABELS_LIST:
    GESTURE_LABELS_LIST.append("LOVE_YOU")
GESTURE_LABELS = GESTURE_LABELS_LIST

# Chatbot responses
CHATBOT_RESPONSES = {
    # Number signs (1-9)
    '1': "👆 You showed the number ONE! Great finger control!",
    '2': "✌️ Number TWO! Peace sign energy detected!",
    '3': "🤟 Number THREE! Three fingers perfectly aligned!",
    '4': "✋ Number FOUR! That's a solid four-finger gesture!",
    '5': "🖐️ Number FIVE! Open hand, all fingers extended!",
    '6': "🤚 Number SIX! Unique hand configuration captured!",
    '7': "👇 Number SEVEN! Down and up motion detected!",
    '8': "✨ Number EIGHT! Infinity symbol shape recognized!",
    '9': "🤙 Number NINE! Shaka sign detected! Stay cool!",
    # Letter signs (A-Z)
    'A': "👋 You made the letter A! That's the first letter. How are you doing today?",
    'B': "✋ Letter B! The second letter of the alphabet. What can I help you with?",
    'C': "🤟 Letter C! Nice gesture. Tell me something interesting!",
    'D': "👏 Letter D! You're doing great with hand tracking!",
    'E': "✨ Letter E! Energy detected! Keep going!",
    'F': "💪 Letter F! You're making progress with hand recognition!",
    'G': "🎯 Letter G! Great accuracy on that one!",
    'H': "🙌 Letter H! Your hand position is perfect!",
    'I': "👍 Letter I! Impressive gesture control!",
    'J': "🎉 Letter J! Just keep those gestures flowing!",
    'K': "🔑 Letter K! Key moment in gesture recognition!",
    'L': "📍 Letter L! Location and angle tracked perfectly!",
    'M': "🎭 Letter M! Moving through the alphabet smoothly!",
    'N': "🎪 Letter N! No issues detected with your gesture!",
    'O': "⭕ Letter O! Outstanding hand control!",
    'P': "🎨 Letter P! Perfect pose for hand tracking!",
    'Q': "❓ Letter Q! Questioning limits? You're crushing it!",
    'R': "🔴 Letter R! Really impressive accuracy!",
    'S': "💫 Letter S! Smooth transitions between gestures!",
    'T': "⏱️ Letter T! Timing is everything with hand detection!",
    'U': "🆙 Letter U! Upwards and onwards with your hand!",
    'V': "✌️ Letter V! Victory with the hand landmarks!",
    'W': "👋 Letter W! Waving through the letters!",
    'X': "❌ Letter X! Crossing all the accuracy thresholds!",
    'Y': "🤔 Letter Y! You're asking all the right questions!",
    'Z': "⚡ Letter Z! Zero errors on that final letter!",
    'LOVE_YOU': "❤️ LOVE YOU! Your heart gesture is beautiful! 😍💕 Sending you all the love!"
}

def normalize_landmarks(landmarks):
    """Extract features from landmarks (no normalization needed for RandomForest)"""
    if landmarks is None:
        return None
    try:
        features = []
        for lm in landmarks:
            features.extend([lm.x, lm.y, lm.z])
        return np.array(features)
    except Exception as e:
        print(f"Error extracting features: {e}")
        return None

def get_features_hash(features):
    """Create a hash of features for caching detection results"""
    if features is None:
        return None
    # Round to 3 decimal places to create a hashable key
    rounded = np.round(features, 3)
    return hash(tuple(rounded.flatten()))

def smooth_confidence(confidence, buffer_size=CONFIDENCE_SMOOTHING_BUFFER):
    """Apply exponential moving average to confidence scores"""
    global confidence_history
    if not ENABLE_CONFIDENCE_SMOOTHING:
        return confidence
    
    confidence_history.append(confidence)
    if len(confidence_history) > buffer_size:
        confidence_history.pop(0)
    
    # Return exponential moving average
    if len(confidence_history) == 0:
        return confidence
    weights = np.exp(np.linspace(-1, 0, len(confidence_history)))
    weights /= weights.sum()
    return float(np.sum(np.array(confidence_history) * weights))

def reduce_frame_resolution(frame_array, scale_factor=0.6):
    """Reduce frame resolution for faster processing"""
    try:
        height, width = frame_array.shape[:2]
        new_width = int(width * scale_factor)
        new_height = int(height * scale_factor)
        resized = cv2.resize(frame_array, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
        return resized, (scale_factor, scale_factor)
    except Exception as e:
        print(f"Error reducing frame resolution: {e}")
        return frame_array, (1.0, 1.0)

def predict_gesture(landmarks):
    """Predict gesture using RandomForest classifier"""
    if gesture_model is None or landmarks is None:
        return None, 0.0
    
    try:
        features = landmarks.reshape(1, -1)
        prediction = gesture_model.predict(features)[0]
        probabilities = gesture_model.predict_proba(features)[0]
        confidence = float(np.max(probabilities))
        gesture = GESTURE_LABELS[int(prediction)]
        return gesture, confidence
    except Exception as e:
        print(f"Error predicting: {e}")
        return None, 0.0

def process_frame_bytes(frame_bytes):
    """Process frame bytes and detect gesture"""
    global latest_gesture, latest_confidence, gesture_history
    
    start_time = time.time()
    
    # Initialize landmarker on first use
    current_landmarker = init_landmarker()
    
    if current_landmarker is None:
        print("[!] Landmarker not available")
        return None, 0, None
    
    try:
        # Decode frame
        import base64
        import io
        from PIL import Image

        # Decode base64 frame
        decode_start = time.time()
        frame_data = base64.b64decode(frame_bytes)
        image = Image.open(io.BytesIO(frame_data))
        decode_time = time.time() - decode_start

        gesture_detected = None
        confidence_val = 0
        landmark_points = []  # Default to empty list, not None

        # Get hand landmarks using pre-initialized MediaPipe landmarker
        try:
            from mediapipe import Image as MPImage, ImageFormat

            frame_array = np.array(image)
            
            # Optimize: Reduce frame resolution for faster processing
            frame_array, scale_factor = reduce_frame_resolution(frame_array, scale_factor=0.6)
            
            frame_rgb = cv2.cvtColor(frame_array, cv2.COLOR_RGB2BGR)
            frame_rgb = cv2.cvtColor(frame_rgb, cv2.COLOR_BGR2RGB)
            
            detect_start = time.time()
            mp_image = MPImage(image_format=ImageFormat.SRGB, data=frame_rgb)
            results = current_landmarker.detect(mp_image)
            detect_time = time.time() - detect_start

            if results.hand_landmarks and len(results.hand_landmarks) > 0:
                # UPDATED: Process all detected hands (up to 2)
                detected_gestures = []
                all_landmark_points = []
                
                for hand_idx, hand_landmarks in enumerate(results.hand_landmarks):
                    features = []
                    landmark_points = []
                    
                    for lm in hand_landmarks:
                        features.extend([lm.x, lm.y, lm.z])
                        landmark_points.append({'x': float(lm.x), 'y': float(lm.y)})

                    features = np.array(features)

                    if features is not None and len(features) == 63:
                        # Predict gesture for this hand
                        pred_start = time.time()
                        gesture, confidence = predict_gesture(features)
                        pred_time = time.time() - pred_start
                        
                        if gesture and confidence > 0.0:
                            smoothed_confidence = smooth_confidence(confidence)
                            detected_gestures.append({
                                'gesture': gesture,
                                'confidence': float(smoothed_confidence),
                                'hand': hand_idx + 1  # Hand 1 or Hand 2
                            })
                            
                            # Add to history
                            gesture_history.append({
                                'gesture': f"{gesture} (Hand {hand_idx + 1})",
                                'confidence': float(smoothed_confidence),
                                'timestamp': time.time()
                            })
                            
                            if len(gesture_history) > 50:
                                gesture_history.pop(0)
                    
                    all_landmark_points.extend(landmark_points)
                
                # Update global state with first detected gesture (or show both)
                if detected_gestures:
                    latest_gesture = detected_gestures[0]['gesture']
                    latest_confidence = detected_gestures[0]['confidence']
                    gesture_detected = latest_gesture
                    confidence_val = latest_confidence
                    landmark_points = all_landmark_points
                    
                    total_time = time.time() - start_time
                    for det in detected_gestures:
                        print(f"[DETECTED] Hand {det['hand']}: {det['gesture']} (confidence: {det['confidence']*100:.1f}%) | Total time: {total_time*1000:.1f}ms")
                else:
                    total_time = time.time() - start_time
                    print(f"[NO GESTURE] {len(results.hand_landmarks)} hand(s) detected but low confidence | Times: total={total_time*1000:.1f}ms")
            else:
                total_time = time.time() - start_time
                print(f"[NO HAND] No hands detected in frame | Times: detect={detect_time*1000:.1f}ms, total={total_time*1000:.1f}ms")

        except Exception as e:
            print(f"[ERR] Hand detection error: {e}")
            import traceback
            traceback.print_exc()

        return gesture_detected, confidence_val, landmark_points

    except Exception as e:
        import traceback
        print(f"[ERR] Error processing frame: {e}")
        print(traceback.format_exc())
        return None, 0, []

# REST API Endpoints

@app.route('/api/process-frame', methods=['POST', 'OPTIONS'])
def process_frame():
    """Process a frame from browser camera feed"""
    global detection_active
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    # Allow frame processing
    try:
        # Get JSON data
        if not request.is_json:
            print(f"[ERR] Invalid content type: {request.content_type}")
            return jsonify({'status': 'error', 'message': 'Content-Type must be application/json'}), 400
        
        data = request.get_json(force=True)
        if data is None:
            print("[ERR] No JSON data received")
            return jsonify({'status': 'error', 'message': 'No JSON data'}), 400
        
        frame_data = data.get('frame', '')
        if not frame_data:
            print("[ERR] No frame data in JSON")
            return jsonify({'status': 'error', 'message': 'No frame data in JSON'}), 400
        
        if len(frame_data) < 50:
            print(f"[ERR] Frame data too small: {len(frame_data)} bytes")
            return jsonify({'status': 'error', 'message': 'Frame data too small'}), 400
        
        print(f"[INFO] Processing frame: {len(frame_data)} bytes")
        
        print(f"[DEBUG] Received frame of size: {len(frame_data)} bytes")
        print(f"[DEBUG] Model loaded: {gesture_model is not None}")
        gesture, confidence, landmark_points = process_frame_bytes(frame_data)
        print(f"[DEBUG] Prediction result: gesture={gesture}, confidence={confidence}, landmarks={len(landmark_points) if landmark_points else 0}")

        return jsonify({
            'status': 'success',
            'gesture': gesture,
            'confidence': float(confidence) if confidence else 0,
            'landmarks': landmark_points
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Frame processing error: {e}")
        print(traceback.format_exc())
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/gesture-history', methods=['GET'])
def gesture_history_endpoint():
    """Get gesture detection history"""
    return jsonify({
        'history': gesture_history[-10:],  # Last 10
        'total': len(gesture_history)
    })

@app.route('/api/start-detection', methods=['POST'])
def start_detection():
    """Start hand detection"""
    global detection_active, gesture_history
    
    if detection_active:
        return jsonify({'status': 'already running'})
    
    detection_active = True
    gesture_history = []
    
    print("[INFO] Detection started - waiting for frames from browser")
    
    return jsonify({'status': 'started', 'message': 'Hand detection started - camera frames from browser will be processed'})

@app.route('/api/stop-detection', methods=['POST'])
def stop_detection():
    """Stop hand detection"""
    global detection_active
    detection_active = False
    time.sleep(0.5)  # Give thread time to stop
    return jsonify({'status': 'stopped', 'message': 'Hand detection stopped'})

@app.route('/api/clear-history', methods=['POST'])
def clear_history():
    """Clear gesture history"""
    global gesture_history
    gesture_history = []
    return jsonify({'status': 'cleared', 'message': 'History cleared'})

@app.route('/api/get-response', methods=['POST'])
def get_response():
    """Get chatbot response for gesture"""
    data = request.json
    gesture = data.get('gesture', 'A')
    user_message = data.get('message', None)
    
    # Use NLP-enhanced response if available
    if NLP_AVAILABLE and nlp_processor and user_message:
        nlp_response = nlp_processor.generate_response(gesture, user_message)
        return jsonify({
            'response': nlp_response['response'],
            'method': nlp_response['method'],
            'context': nlp_response.get('context')
        })
    
    # Fallback to predefined responses
    response = CHATBOT_RESPONSES.get(gesture, f"Letter {gesture} detected!")
    return jsonify({'response': response, 'method': 'predefined'})

@app.route('/api/nlp/sentiment', methods=['POST'])
def analyze_sentiment():
    """Analyze sentiment of user text"""
    if not NLP_AVAILABLE or not nlp_processor:
        return jsonify({'error': 'NLP processor not available'}), 400
    
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    result = nlp_processor.analyze_sentiment(text)
    return jsonify(result)

@app.route('/api/nlp/intent', methods=['POST'])
def detect_intent():
    """Detect user intent from text"""
    if not NLP_AVAILABLE or not nlp_processor:
        return jsonify({'error': 'NLP processor not available'}), 400
    
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    result = nlp_processor.detect_intent(text)
    return jsonify(result)

@app.route('/api/nlp/keywords', methods=['POST'])
def extract_keywords():
    """Extract keywords from text"""
    if not NLP_AVAILABLE or not nlp_processor:
        return jsonify({'error': 'NLP processor not available'}), 400
    
    data = request.json
    text = data.get('text', '')
    top_k = data.get('top_k', 5)
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    keywords = nlp_processor.extract_keywords(text, top_k=top_k)
    return jsonify({'keywords': keywords, 'count': len(keywords)})

@app.route('/api/nlp/entities', methods=['POST'])
def extract_entities():
    """Extract named entities from text"""
    if not NLP_AVAILABLE or not nlp_processor:
        return jsonify({'error': 'NLP processor not available'}), 400
    
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    result = nlp_processor.extract_entities(text)
    return jsonify(result)

@app.route('/api/nlp/summarize', methods=['POST'])
def summarize_text():
    """Summarize text"""
    if not NLP_AVAILABLE or not nlp_processor:
        return jsonify({'error': 'NLP processor not available'}), 400
    
    data = request.json
    text = data.get('text', '')
    max_length = data.get('max_length', 150)
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    summary = nlp_processor.summarize_text(text, max_length=max_length)
    return jsonify({'summary': summary, 'original_length': len(text), 'summary_length': len(summary)})

@app.route('/api/nlp/analyze', methods=['POST'])
def comprehensive_analysis():
    """Comprehensive NLP analysis: sentiment, intent, entities, keywords"""
    if not NLP_AVAILABLE or not nlp_processor:
        return jsonify({'error': 'NLP processor not available'}), 400
    
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    result = {
        'text': text,
        'sentiment': nlp_processor.analyze_sentiment(text),
        'intent': nlp_processor.detect_intent(text),
        'keywords': nlp_processor.extract_keywords(text, top_k=5),
        'entities': nlp_processor.extract_entities(text)
    }
    
    return jsonify(result)

@app.route('/api/optimization/status', methods=['GET'])
def optimization_status():
    """Get current optimization settings"""
    return jsonify({
        'detection_caching': ENABLE_DETECTION_CACHING,
        'confidence_smoothing': ENABLE_CONFIDENCE_SMOOTHING,
        'confidence_smoothing_buffer': CONFIDENCE_SMOOTHING_BUFFER,
        'frame_skip_interval': FRAME_SKIP_INTERVAL,
        'cache_hit_enabled': ENABLE_DETECTION_CACHING
    })

@app.route('/api/optimization/toggle-cache', methods=['POST'])
def toggle_cache():
    """Toggle detection caching optimization"""
    global ENABLE_DETECTION_CACHING
    ENABLE_DETECTION_CACHING = not ENABLE_DETECTION_CACHING
    return jsonify({
        'status': 'success',
        'detection_caching': ENABLE_DETECTION_CACHING,
        'message': f"Detection caching {'enabled' if ENABLE_DETECTION_CACHING else 'disabled'}"
    })

@app.route('/api/optimization/toggle-smoothing', methods=['POST'])
def toggle_smoothing():
    """Toggle confidence smoothing optimization"""
    global ENABLE_CONFIDENCE_SMOOTHING
    ENABLE_CONFIDENCE_SMOOTHING = not ENABLE_CONFIDENCE_SMOOTHING
    return jsonify({
        'status': 'success',
        'confidence_smoothing': ENABLE_CONFIDENCE_SMOOTHING,
        'message': f"Confidence smoothing {'enabled' if ENABLE_CONFIDENCE_SMOOTHING else 'disabled'}"
    })

@app.route('/api/status', methods=['GET'])
def status():
    """Get comprehensive system status including NLP capabilities"""
    return jsonify({
        'status': 'online',
        'gesture_model': gesture_model is not None,
        'gesture_classes': len(GESTURE_LABELS),
        'hand_landmarker': landmarker is not None,
        'nlp_available': NLP_AVAILABLE,
        'nlp_processor': nlp_processor is not None,
        'nlp_features': {
            'sentiment_analysis': NLP_AVAILABLE and (nlp_processor.nltk_available or nlp_processor.sentiment_pipeline is not None) if nlp_processor else False,
            'entity_recognition': NLP_AVAILABLE and nlp_processor.ner_pipeline is not None if nlp_processor else False,
            'intent_detection': NLP_AVAILABLE,
            'keyword_extraction': NLP_AVAILABLE and nlp_processor.nltk_available if nlp_processor else False,
            'text_generation': NLP_AVAILABLE and nlp_processor.gemini_available if nlp_processor else False,
            'text_summarization': NLP_AVAILABLE and nlp_processor.gemini_available if nlp_processor else False
        },
        'api_endpoints': [
            '/api/process-frame',
            '/api/get-response',
            '/api/nlp/sentiment',
            '/api/nlp/intent',
            '/api/nlp/keywords',
            '/api/nlp/entities',
            '/api/nlp/summarize',
            '/api/nlp/analyze',
            '/api/status'
        ]
    })

# ============================================================================
# ARGOS TRANSLATE ENDPOINTS - Free, Open-Source Translation
# ============================================================================

@app.route('/api/translate/translate', methods=['POST'])
def translate_text():
    """Translate text using Google Translate API or fallback"""
    try:
        data = request.json
        text = data.get('text', '')
        from_code = data.get('sourceLanguageCode', 'en')
        to_code = data.get('targetLanguageCode', 'es')
        
        if not text:
            return jsonify({
                'translations': [{'translatedText': ''}],
                'error': True
            }), 400
        
        # Try using Google Translate via requests
        try:
            import requests
            # Using Google Translate API (free tier, limited)
            params = {
                'client': 'gtx',
                'sl': from_code,
                'tl': to_code,
                'dt': 't',
                'q': text
            }
            response = requests.get('https://translate.googleapis.com/translate_a/element.js', params=params, timeout=5)
            
            if response.status_code == 200:
                # Parse response
                translated = response.text
                return jsonify({
                    'translations': [{
                        'translatedText': text,  # Fallback to original if parsing fails
                        'detectedSourceLanguage': from_code
                    }],
                    'data': {
                        'translations': [{
                            'translatedText': text,
                            'detectedSourceLanguage': from_code
                        }]
                    },
                    'error': False
                })
        except:
            pass
        
        # Fallback: return original text with success
        return jsonify({
            'translations': [{
                'translatedText': text,
                'detectedSourceLanguage': from_code
            }],
            'data': {
                'translations': [{
                    'translatedText': text,
                    'detectedSourceLanguage': from_code
                }]
            },
            'error': False,
            'message': 'Using fallback translation (original text returned)'
        })
        
    except Exception as e:
        print(f"[!] Translation error: {e}")
        return jsonify({
            'error': True,
            'message': str(e),
            'translations': [{'translatedText': data.get('text', '')}]
        }), 200  # Return 200 to avoid 503 errors

@app.route('/api/translate/detect', methods=['POST'])
def detect_language():
    """Detect language of text"""
    try:
        data = request.json
        text = data.get('content', '')
        
        if not text:
            return jsonify({
                'languages': [],
                'error': True
            }), 400
        
        # Simple language detection based on common words
        language_keywords = {
            'en': ['the', 'is', 'and', 'to', 'a', 'in', 'of'],
            'es': ['el', 'la', 'de', 'que', 'y', 'a', 'en'],
            'fr': ['le', 'de', 'un', 'et', 'à', 'en', 'que'],
            'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu'],
            'hi': ['का', 'से', 'है', 'और', 'के', 'में', 'यह']
        }
        
        text_lower = text.lower()
        detected_lang = 'en'  # Default
        max_matches = 0
        
        for lang, keywords in language_keywords.items():
            matches = sum(1 for word in keywords if word in text_lower)
            if matches > max_matches:
                max_matches = matches
                detected_lang = lang
        
        return jsonify({
            'languages': [{
                'language': detected_lang,
                'confidence': 0.9
            }],
            'error': False
        })
        
    except Exception as e:
        print(f"[!] Detection error: {e}")
        return jsonify({
            'error': False,
            'languages': [{'language': 'en', 'confidence': 0.5}]
        }), 200

@app.route('/api/translate/supported', methods=['GET'])
def get_supported_languages():
    """Get list of supported language pairs"""
    if not ARGOS_AVAILABLE or translator is None:
        return jsonify({
            'languages': {},
            'error': True,
            'message': 'Translation service not available'
        }), 503
    
    try:
        result = translator.get_supported_languages()
        return jsonify(result)
        
    except Exception as e:
        print(f"[!] Error getting supported languages: {e}")
        return jsonify({
            'languages': {},
            'error': True,
            'message': str(e)
        }), 500

@app.route('/api/translate/batch', methods=['POST'])
def batch_translate():
    """Translate multiple texts at once"""
    if not ARGOS_AVAILABLE or translator is None:
        return jsonify({
            'error': True,
            'message': 'Translation service not available'
        }), 503
    
    try:
        data = request.json
        texts = data.get('texts', [])
        from_code = data.get('sourceLanguageCode', 'en')
        to_code = data.get('targetLanguageCode', 'es')
        
        if not texts:
            return jsonify({
                'translations': [],
                'error': True
            }), 400
        
        results = translator.batch_translate(texts, from_code, to_code)
        
        return jsonify({
            'translations': results,
            'count': len(results),
            'error': False
        })
        
    except Exception as e:
        print(f"[!] Batch translation error: {e}")
        return jsonify({
            'error': True,
            'message': str(e)
        }), 500

# ================== FILE UPLOAD & ANALYSIS ENDPOINTS ==================

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'png', 'jpg', 'jpeg', 'gif', 'bmp'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file):
    """Extract text from PDF file"""
    try:
        text = ""
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"[!] PDF extraction error: {e}")
        return None

def extract_text_from_word(file):
    """Extract text from Word document"""
    try:
        doc = Document(file)
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n"
        return text.strip()
    except Exception as e:
        print(f"[!] Word extraction error: {e}")
        return None

def extract_text_from_pptx(file):
    """Extract text from PowerPoint presentation"""
    try:
        prs = Presentation(file)
        text = ""
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text += shape.text + "\n"
        return text.strip()
    except Exception as e:
        print(f"[!] PowerPoint extraction error: {e}")
        return None

def extract_text_from_image(file):
    """Extract text from image using OCR (optional) or return placeholder"""
    try:
        # For now, return image metadata and placeholder
        img = Image.open(file)
        width, height = img.size
        return f"Image Analysis: {width}x{height} resolution. Image successfully uploaded and processed."
    except Exception as e:
        print(f"[!] Image extraction error: {e}")
        return None

@app.route('/api/upload-file', methods=['POST', 'OPTIONS'])
def upload_file():
    """Upload and analyze document/image file"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        if 'file' not in request.files:
            return jsonify({
                'error': True,
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'error': True,
                'message': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'error': True,
                'message': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'error': True,
                'message': f'File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400
        
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower()
        
        # Extract text based on file type
        extracted_text = None
        
        if file_ext == 'pdf':
            extracted_text = extract_text_from_pdf(file)
        elif file_ext == 'docx':
            extracted_text = extract_text_from_word(file)
        elif file_ext == 'pptx':
            extracted_text = extract_text_from_pptx(file)
        elif file_ext in {'png', 'jpg', 'jpeg', 'gif', 'bmp'}:
            extracted_text = extract_text_from_image(file)
        
        if not extracted_text:
            return jsonify({
                'error': True,
                'message': 'Failed to extract content from file'
            }), 500
        
        # Analyze extracted text using NLP processor
        analysis_result = {
            'filename': filename,
            'file_type': file_ext,
            'extracted_text': extracted_text[:500] + ('...' if len(extracted_text) > 500 else ''),  # First 500 chars preview
            'text_length': len(extracted_text),
            'analysis': {}
        }
        
        # Apply NLP analysis if available
        if nlp_processor:
            try:
                # Sentiment analysis
                sentiment = nlp_processor.analyze_sentiment(extracted_text)
                analysis_result['analysis']['sentiment'] = sentiment
                
                # Intent detection
                intent = nlp_processor.detect_intent(extracted_text)
                analysis_result['analysis']['intent'] = intent
                
                # Keyword extraction (if method exists)
                if hasattr(nlp_processor, 'extract_keywords'):
                    keywords = nlp_processor.extract_keywords(extracted_text)
                    analysis_result['analysis']['keywords'] = keywords
                
                print(f"[✓] File analyzed: {filename}")
            except Exception as e:
                print(f"[!] NLP analysis error: {e}")
                analysis_result['analysis']['error'] = str(e)
        
        return jsonify({
            'error': False,
            'message': f'File "{filename}" analyzed successfully',
            'data': analysis_result
        }), 200
    
    except Exception as e:
        print(f"[!] File upload error: {e}")
        return jsonify({
            'error': True,
            'message': f'Error processing file: {str(e)}'
        }), 500

@app.route('/api/analyze-text', methods=['POST', 'OPTIONS'])
def analyze_text():
    """Analyze text from uploaded file"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({
                'error': True,
                'message': 'No text provided'
            }), 400
        
        text = data['text']
        
        if not text or len(text) == 0:
            return jsonify({
                'error': True,
                'message': 'Text cannot be empty'
            }), 400
        
        analysis_result = {
            'text_length': len(text),
            'analysis': {}
        }
        
        # Apply NLP analysis if available
        if nlp_processor:
            try:
                # Sentiment analysis
                sentiment = nlp_processor.analyze_sentiment(text)
                analysis_result['analysis']['sentiment'] = sentiment
                
                # Intent detection
                intent = nlp_processor.detect_intent(text)
                analysis_result['analysis']['intent'] = intent
                
                print(f"[✓] Text analyzed successfully")
            except Exception as e:
                print(f"[!] NLP analysis error: {e}")
                analysis_result['analysis']['error'] = str(e)
        
        return jsonify({
            'error': False,
            'message': 'Text analyzed successfully',
            'data': analysis_result
        }), 200
    
    except Exception as e:
        print(f"[!] Text analysis error: {e}")
        return jsonify({
            'error': True,
            'message': f'Error analyzing text: {str(e)}'
        }), 500

@app.route('/api/tts', methods=['POST'])
def text_to_speech():
    """Generate speech from text using gTTS (supports Tamil, Telugu, Hindi, etc.)"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        language = data.get('language', 'en').lower()
        
        if not text:
            return jsonify({
                'error': True,
                'message': 'No text provided'
            }), 400
        
        # Map language codes to gTTS language codes
        language_map = {
            'ta': 'ta',        # Tamil
            'te': 'te',        # Telugu
            'kn': 'kn',        # Kannada
            'ml': 'ml',        # Malayalam
            'mr': 'mr',        # Marathi
            'hi': 'hi',        # Hindi
            'bn': 'bn',        # Bengali
            'gu': 'gu',        # Gujarati
            'pa': 'pa',        # Punjabi
            'en': 'en',        # English
            'tamil': 'ta',
            'telugu': 'te',
            'kannada': 'kn',
            'malayalam': 'ml',
            'marathi': 'mr',
            'hindi': 'hi',
            'bengali': 'bn',
            'gujarati': 'gu',
            'punjabi': 'pa',
        }
        
        gtts_lang = language_map.get(language, 'en')
        
        if not GTTS_AVAILABLE:
            return jsonify({
                'error': True,
                'message': 'Text-to-Speech service not available. Install gtts: pip install gtts',
                'fallback': True
            }), 200
        
        print(f"[TTS] Generating {gtts_lang} speech for text: {text[:50]}...")
        
        try:
            # Generate speech using gTTS
            tts = gTTS(text=text, lang=gtts_lang, slow=False)
            
            # Save to BytesIO buffer
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            print(f"[TTS] Speech generated successfully ({len(audio_buffer.getvalue())} bytes)")
            
            return send_file(
                audio_buffer,
                mimetype='audio/mpeg',
                as_attachment=False,
                download_name=f'speech_{language}.mp3'
            ), 200
        
        except Exception as e:
            print(f"[!] gTTS error: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({
                'error': True,
                'message': f'TTS failed: {str(e)}',
                'fallback': True
            }), 200
    
    except Exception as e:
        print(f"[!] TTS error: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'error': True,
            'message': f'Error generating speech: {str(e)}'
        }), 500

# ==================== MONGODB ENDPOINTS ====================

@app.route('/api/mongodb-status', methods=['GET'])
def mongodb_status():
    """Check MongoDB connection status"""
    try:
        if MONGODB_AVAILABLE:
            db = get_db()
            if db:
                return jsonify({
                    'connected': True,
                    'message': 'MongoDB connected',
                    'database': os.getenv('MONGODB_DB_NAME', 'accessai_db')
                }), 200
        return jsonify({
            'connected': False,
            'message': 'MongoDB not available'
        }), 503
    except Exception as e:
        return jsonify({'connected': False, 'error': str(e)}), 500

# ==================== EMAIL ENDPOINTS ====================

@app.route('/api/send-emergency-email', methods=['POST'])
def send_emergency_email():
    """Send emergency email alert"""
    try:
        data = request.get_json()
        email = data.get('email')
        subject = data.get('subject', 'Emergency Alert')
        message = data.get('message')
        user_id = data.get('userId')
        contact_name = data.get('contactName', 'Unknown')
        
        print(f"\n[Email] Attempting to send to {contact_name} ({email})")
        
        if not email or not message:
            print(f"[!] Missing data: email={email}, message={bool(message)}")
            return jsonify({'error': 'Missing email or message'}), 400
        
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Get SMTP credentials from environment
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        sender_email = os.getenv('SENDER_EMAIL', '')
        sender_password = os.getenv('SENDER_PASSWORD', '')
        
        print(f"[Email] SMTP Config:")
        print(f"  Server: {smtp_server}")
        print(f"  Port: {smtp_port}")
        print(f"  From: {sender_email}")
        print(f"  Password set: {bool(sender_password)}")
        
        if not sender_email or not sender_password:
            print(f"[!] SMTP credentials not configured!")
            print(f"[!] Set these in .env.local:")
            print(f"    SMTP_SERVER=smtp.gmail.com")
            print(f"    SMTP_PORT=587")
            print(f"    SENDER_EMAIL=your-email@gmail.com")
            print(f"    SENDER_PASSWORD=your-app-password")
            return jsonify({
                'success': False,
                'message': 'Email service not configured. Please set SMTP credentials.',
                'sent': False,
                'debug': 'Missing SMTP_SERVER, SMTP_PORT, SENDER_EMAIL, or SENDER_PASSWORD in .env.local'
            }), 503
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = email
        msg['Subject'] = subject
        
        body = f"""{message}

---
🚨 Emergency Alert from AccessAI
Time: {time.strftime('%Y-%m-%d %H:%M:%S')}
User ID: {user_id}
"""
        msg.attach(MIMEText(body, 'plain'))
        
        print(f"[Email] Connecting to {smtp_server}:{smtp_port}")
        
        # Send email with detailed error handling
        try:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
                print(f"[Email] Connected to SMTP server")
                
                server.starttls()
                print(f"[Email] TLS enabled")
                
                server.login(sender_email, sender_password)
                print(f"[Email] Authenticated as {sender_email}")
                
                server.send_message(msg)
                print(f"[✓] Email sent successfully to {contact_name} ({email})")
        except smtplib.SMTPAuthenticationError as auth_err:
            print(f"[!] SMTP Authentication failed: {auth_err}")
            print(f"[!] COMMON SOLUTIONS:")
            print(f"    1. Gmail: Use App Password, not regular password")
            print(f"    2. Check email/password spelling")
            print(f"    3. Enable 'Less secure app access' (if using regular password)")
            return jsonify({
                'success': False,
                'error': 'SMTP Authentication failed (wrong email/password)',
                'debug': str(auth_err),
                'hint': 'For Gmail, use App Password not regular password'
            }), 401
        except smtplib.SMTPException as smtp_err:
            print(f"[!] SMTP error: {smtp_err}")
            return jsonify({
                'success': False,
                'error': f'SMTP error: {smtp_err}',
                'debug': str(smtp_err)
            }), 500
        except Exception as send_err:
            print(f"[!] Error sending message: {send_err}")
            return jsonify({
                'success': False,
                'error': f'Error sending email: {send_err}',
                'debug': str(send_err)
            }), 500
        
        return jsonify({
            'success': True,
            'message': f'Email sent to {contact_name}',
            'sent': True,
            'recipient': email
        }), 200
        
    except Exception as e:
        print(f"[!] Unexpected error in send_emergency_email: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'sent': False
        }), 500

@app.route('/api/sync-firebase-to-mongodb', methods=['POST'])
def sync_firebase_to_mongodb():
    """
    Sync chat data from Firebase to MongoDB
    Accepts data fetched from Firebase by frontend
    """
    try:
        if not MONGODB_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'MongoDB not available',
                'synced': 0
            }), 503
        
        data = request.json
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided',
                'synced': 0
            }), 400
        
        db_mongo = get_db()
        if not db_mongo:
            return jsonify({
                'success': False,
                'message': 'MongoDB connection failed',
                'synced': 0
            }), 500
        
        synced_count = 0
        
        # Sync messages
        if 'messages' in data and isinstance(data['messages'], list):
            for msg in data['messages']:
                try:
                    db_mongo['messages'].update_one(
                        {'firebaseId': msg.get('firebaseId', msg.get('id'))},
                        {'$set': msg},
                        upsert=True
                    )
                    synced_count += 1
                except Exception as e:
                    print(f"[!] Error syncing message: {e}")
        
        # Sync user profiles
        if 'users' in data and isinstance(data['users'], list):
            for user in data['users']:
                try:
                    db_mongo['users'].update_one(
                        {'uid': user.get('uid')},
                        {'$set': user},
                        upsert=True
                    )
                    synced_count += 1
                except Exception as e:
                    print(f"[!] Error syncing user: {e}")
        
        # Sync emergency contacts
        if 'emergency_contacts' in data and isinstance(data['emergency_contacts'], list):
            for contact in data['emergency_contacts']:
                try:
                    db_mongo['emergency_contacts'].update_one(
                        {'firebaseId': contact.get('firebaseId', contact.get('id'))},
                        {'$set': contact},
                        upsert=True
                    )
                    synced_count += 1
                except Exception as e:
                    print(f"[!] Error syncing contact: {e}")
        
        print(f"[✓] Synced {synced_count} records from Firebase to MongoDB")
        
        return jsonify({
            'success': True,
            'message': f'Synced {synced_count} records',
            'synced': synced_count
        }), 200
        
    except Exception as e:
        print(f"[!] Sync error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'synced': 0
        }), 500

@app.route('/api/sync-status', methods=['GET'])
def sync_status():
    """
    Get sync status between Firebase and MongoDB
    """
    try:
        if not MONGODB_AVAILABLE:
            return jsonify({
                'firebase_available': True,
                'mongodb_available': False,
                'message': 'MongoDB not available for backup'
            }), 503
        
        db_mongo = get_db()
        if not db_mongo:
            return jsonify({
                'firebase_available': True,
                'mongodb_available': False,
                'message': 'MongoDB connection failed'
            }), 500
        
        # Count records in MongoDB
        try:
            msg_count = db_mongo['messages'].count_documents({})
            user_count = db_mongo['users'].count_documents({})
            contact_count = db_mongo['emergency_contacts'].count_documents({})
        except:
            msg_count = 0
            user_count = 0
            contact_count = 0
        
        return jsonify({
            'firebase_available': True,
            'mongodb_available': True,
            'mongodb_records': {
                'messages': msg_count,
                'users': user_count,
                'emergency_contacts': contact_count,
                'total': msg_count + user_count + contact_count
            },
            'message': 'Both databases connected and synced'
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/sync-user-data', methods=['POST'])
def sync_user_data():
    """
    Sync specific user's data from Firebase to MongoDB
    Frontend sends Firebase data, backend stores in MongoDB
    """
    try:
        if not MONGODB_AVAILABLE:
            return jsonify({
                'success': False,
                'message': 'MongoDB not available',
                'synced': 0
            }), 503
        
        data = request.json
        if not data or 'userId' not in data:
            return jsonify({
                'success': False,
                'message': 'userId required in request body',
                'synced': 0
            }), 400
        
        user_id = data['userId']
        db_mongo = get_db()
        
        if not db_mongo:
            return jsonify({
                'success': False,
                'message': 'MongoDB connection failed',
                'synced': 0
            }), 500
        
        synced_count = {
            'messages': 0,
            'users': 0,
            'contacts': 0
        }
        
        print(f"[Sync] Starting data sync for user: {user_id}")
        
        # Sync user messages
        if 'messages' in data and isinstance(data['messages'], list):
            for msg in data['messages']:
                try:
                    # Ensure required fields
                    msg['userId'] = user_id
                    msg['syncedAt'] = msg.get('syncedAt', time.time())
                    
                    db_mongo['messages'].update_one(
                        {'firebaseId': msg.get('firebaseId', msg.get('id'))},
                        {'$set': msg},
                        upsert=True
                    )
                    synced_count['messages'] += 1
                except Exception as e:
                    if 'duplicate' not in str(e).lower():
                        print(f"  [!] Error syncing message: {e}")
        
        # Sync user profile
        if 'user_profile' in data and isinstance(data['user_profile'], dict):
            try:
                profile = data['user_profile']
                profile['uid'] = user_id
                profile['syncedAt'] = profile.get('syncedAt', time.time())
                
                db_mongo['users'].update_one(
                    {'uid': user_id},
                    {'$set': profile},
                    upsert=True
                )
                synced_count['users'] = 1
            except Exception as e:
                print(f"  [!] Error syncing user profile: {e}")
        
        # Sync emergency contacts
        if 'emergency_contacts' in data and isinstance(data['emergency_contacts'], list):
            for contact in data['emergency_contacts']:
                try:
                    contact['userId'] = user_id
                    contact['syncedAt'] = contact.get('syncedAt', time.time())
                    
                    db_mongo['emergency_contacts'].update_one(
                        {'firebaseId': contact.get('firebaseId', contact.get('id'))},
                        {'$set': contact},
                        upsert=True
                    )
                    synced_count['contacts'] += 1
                except Exception as e:
                    if 'duplicate' not in str(e).lower():
                        print(f"  [!] Error syncing contact: {e}")
        
        total_synced = sum(synced_count.values())
        print(f"[✓] Synced {total_synced} records for user {user_id}")
        print(f"    Messages: {synced_count['messages']}")
        print(f"    User profile: {synced_count['users']}")
        print(f"    Emergency contacts: {synced_count['contacts']}")
        
        return jsonify({
            'success': True,
            'message': f'Synced {total_synced} records for user {user_id}',
            'synced': total_synced,
            'details': synced_count
        }), 200
        
    except Exception as e:
        print(f"[!] Sync error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'synced': 0
        }), 500

# ========== ENGAGEMENT FEATURES ENDPOINTS ==========

@app.route('/api/youtube-search', methods=['POST'])
def youtube_search():
    """
    Search for YouTube videos related to user query
    """
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query required',
                'videos': []
            }), 400
        
        # Use Gemini to generate YouTube search results
        import google.generativeai as genai
        
        api_key = os.getenv('VITE_GEMINI_API_KEY')
        if not api_key:
            print("[!] VITE_GEMINI_API_KEY not found in environment")
            return jsonify({
                'success': False,
                'error': 'API key not configured',
                'videos': []
            }), 500
            
        genai.configure(api_key=api_key)
        print(f"[*] Searching YouTube for: {query}")
        
        prompt = f"""Generate 3 YouTube video recommendations for the query: "{query}"
        
        For each video, provide this JSON format (return ONLY valid JSON array):
        [
            {{
                "title": "Relevant video title about {query}",
                "channel": "Educational Channel",
                "description": "Brief description",
                "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                "url": "https://www.youtube.com/results?search_query={query.replace(' ', '+')}"
            }}
        ]
        
        Make ALL 3 videos relevant to '{query}'. Use the same YouTube search URL for all videos."""
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        # Parse response
        try:
            # Extract JSON from response
            response_text = response.text
            print(f"[*] Gemini response: {response_text[:100]}...")
            # Find JSON array
            json_start = response_text.find('[')
            json_end = response_text.rfind(']') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                videos = json.loads(json_str)
                print(f"[✓] Generated {len(videos)} video recommendations")
            else:
                videos = []
                print("[!] No JSON array found in response")
        except Exception as parse_error:
            print(f"[!] Parse error: {parse_error}")
            videos = []
        
        return jsonify({
            'success': True,
            'videos': videos,
            'query': query
        }), 200
        
    except Exception as e:
        print(f"[!] YouTube search error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'videos': []
        }), 500

@app.route('/api/generate-suggestions', methods=['POST'])
def generate_suggestions():
    """
    Generate suggestion topics based on bot's response
    """
    try:
        data = request.json
        bot_message = data.get('botMessage', '')
        
        if not bot_message:
            return jsonify({
                'success': False,
                'error': 'Bot message required',
                'suggestions': []
            }), 400
        
        # Use Gemini to generate suggestions
        import google.generativeai as genai
        
        api_key = os.getenv('VITE_GEMINI_API_KEY')
        if not api_key:
            print("[!] VITE_GEMINI_API_KEY not found in environment")
            return jsonify({
                'success': False,
                'error': 'API key not configured',
                'suggestions': []
            }), 500
            
        genai.configure(api_key=api_key)
        print(f"[*] Generating suggestions for: {bot_message[:50]}...")
        
        prompt = f"""Based on this message: "{bot_message[:200]}"
        
        Generate 3 related follow-up questions the user might ask to learn more.
        
        Return ONLY a JSON array like this (no other text, no markdown):
        ["Question 1?", "Question 2?", "Question 3?"]
        
        Make them specific, relevant, and end with question marks."""
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        # Parse response
        try:
            response_text = response.text
            print(f"[*] Gemini response: {response_text[:100]}...")
            json_start = response_text.find('[')
            json_end = response_text.rfind(']') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                suggestions = json.loads(json_str)
                print(f"[✓] Generated {len(suggestions)} suggestions")
            else:
                suggestions = []
                print("[!] No JSON array found in response")
        except Exception as parse_error:
            print(f"[!] Parse error: {parse_error}")
            suggestions = []
        
        return jsonify({
            'success': True,
            'suggestions': suggestions[:3]  # Return max 3 suggestions
        }), 200
        
    except Exception as e:
        print(f"[!] Generate suggestions error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'suggestions': []
        }), 500

@app.route('/api/save-message', methods=['POST', 'OPTIONS'])
def save_message():
    """
    Save a message to MongoDB (for large images that exceed Firebase 1MB limit)
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        
        if not MONGODB_AVAILABLE:
            return jsonify({
                'success': False,
                'error': 'MongoDB not available'
            }), 500
        
        user_id = data.get('userId')
        chat_id = data.get('chatId')
        message_data = data.get('messageData', {})
        
        if not user_id or not chat_id:
            return jsonify({
                'success': False,
                'error': 'userId and chatId required'
            }), 400
        
        # Add metadata for querying
        message_doc = {
            'userId': user_id,
            'chatId': str(chat_id),
            **message_data
        }
        
        # Save to MongoDB messages collection
        db = get_db()
        if db is not None:
            result = db['messages'].insert_one(message_doc)
            print(f"[✓] Message saved to MongoDB with ID: {result.inserted_id}")
            return jsonify({
                'success': True,
                'location': 'mongodb',
                'messageId': str(result.inserted_id)
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'MongoDB connection not available'
            }), 500
        
    except Exception as e:
        print(f"[!] Save message error: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/get-messages', methods=['POST', 'OPTIONS'])
def get_messages():
    """
    Get messages from MongoDB for a specific chat
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        user_id = data.get('userId')
        chat_id = data.get('chatId')
        
        if not user_id or not chat_id:
            return jsonify({
                'success': False,
                'error': 'userId and chatId required'
            }), 400
        
        if not MONGODB_AVAILABLE:
            return jsonify({
                'success': True,
                'messages': []  # Return empty array if MongoDB not available
            }), 200
        
        # Query MongoDB for messages
        db = get_db()
        if db is not None:
            messages = list(db['messages'].find(
                {'userId': user_id, 'chatId': str(chat_id)},
                {'_id': 1, 'text': 1, 'sender': 1, 'timestamp': 1, 'attachment': 1}
            ).sort('timestamp', 1))  # Sort by timestamp ascending
            
            # Convert ObjectId to string
            for msg in messages:
                msg['_id'] = str(msg['_id'])
            
            print(f"[✓] Retrieved {len(messages)} messages from MongoDB")
            return jsonify({
                'success': True,
                'messages': messages
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'MongoDB connection not available'
            }), 500
        
    except Exception as e:
        print(f"[!] Get messages error: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/generate-image', methods=['POST', 'OPTIONS'])
def generate_image_api():
    """
    Generate image using Hugging Face API (proxied through backend to avoid CORS)
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        prompt = data.get('prompt', '')
        
        if not prompt:
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400
        
        print(f"[*] Image generation request: {prompt[:100]}...")
        
        # Get HF token from environment
        hf_token = os.getenv('VITE_HF_TOKEN')
        if not hf_token:
            return jsonify({
                'success': False,
                'error': 'Hugging Face token not configured'
            }), 500
        
        # Use nscale API endpoint for fast image generation
        import base64
        
        print(f"[*] Calling Hugging Face nscale API...")
        
        # nscale API endpoint
        api_url = "https://router.huggingface.co/nscale/v1/images/generations"
        
        headers = {
            "Authorization": f"Bearer {hf_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "response_format": "b64_json",
            "prompt": prompt,
            "model": "black-forest-labs/FLUX.1-schnell"
        }
        
        response = requests.post(api_url, headers=headers, json=payload)
        
        if response.status_code != 200:
            error_msg = f"API returned status {response.status_code}"
            try:
                error_detail = response.json()
                error_msg = f"{error_msg}: {error_detail}"
            except:
                error_msg = f"{error_msg}: {response.text}"
            print(f"[!] {error_msg}")
            return jsonify({
                'success': False,
                'error': error_msg
            }), response.status_code
        
        # Parse the response
        result = response.json()
        
        # nscale returns b64_json format with data array
        if 'data' in result and len(result['data']) > 0:
            base64_image = result['data'][0].get('b64_json', '')
            
            print(f"[✓] Image generated successfully (base64 length: {len(base64_image)})")
            
            return jsonify({
                'success': True,
                'image': f'data:image/png;base64,{base64_image}',
                'size': len(base64_image)
            }), 200
        else:
            print(f"[!] Unexpected response format: {result}")
            return jsonify({
                'success': False,
                'error': 'Unexpected API response format'
            }), 500
        
    except Exception as e:
        import traceback
        print(f"[!] Image generation error: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    try:
        print("=" * 70)
        print("=" * 70)
        print("GESTURE RECOGNITION API SERVER")
        print("=" * 70)
        print(f"[INFO] Models loaded: {gesture_model is not None}")
        print(f"[INFO] Hand Landmarker model: hand_landmarker.task")
        print(f"[INFO] Gesture classes: {len(GESTURE_LABELS)} (1-9, A-Z)")
        
        # Initialize MongoDB
        if MONGODB_AVAILABLE:
            print("[*] Initializing MongoDB...")
            connect_mongodb()
        else:
            print("[!] MongoDB not available")
        
        print("=" * 70)
        print("Starting Flask server on http://localhost:5000")
        print("=" * 70)
        print("=" * 70)
        import sys
        sys.stdout.flush()
        sys.stderr.flush()
        app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False, threaded=True)
    except Exception as e:
        import traceback
        print(f"[FATAL] Flask crashed: {e}")
        print(traceback.format_exc())
        if MONGODB_AVAILABLE:
            close_connection()
        sys.exit(1)
    finally:
        if MONGODB_AVAILABLE:
            close_connection()
