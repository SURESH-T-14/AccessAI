#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lightweight Flask Server - With Gesture Recognition
Optimized to avoid memory allocation errors
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import cv2
import numpy as np
import pickle
import os
import sys
import io
import base64

# Set UTF-8 encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

app = Flask(__name__)
CORS(app)

print("""
╔════════════════════════════════════════╗
║  Gesture Recognition Backend Server    ║
║  Running on http://localhost:5000      ║
╚════════════════════════════════════════╝
""")

# ========================================
# LAZY LOAD MODELS (load only when needed)
# ========================================
landmarker = None
gesture_model = None
GESTURE_LABELS = []
models_loaded = False

def load_models():
    """Load models only once when first request comes"""
    global landmarker, gesture_model, GESTURE_LABELS, models_loaded
    
    if models_loaded:
        return True
    
    try:
        # Import MediaPipe (only when needed)
        from mediapipe import vision
        from mediapipe.tasks import python
        
        print("[*] Loading MediaPipe Hand Landmarker...")
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
        print("[OK] Hand Landmarker loaded")
    except Exception as e:
        print(f"[!] Hand Landmarker error: {e}")
        landmarker = None
    
    try:
        # Load gesture classifier
        print("[*] Loading Gesture Classifier...")
        if os.path.exists("gesture_classifier.pkl"):
            with open("gesture_classifier.pkl", "rb") as f:
                gesture_model = pickle.load(f)
            
            # Load class labels
            try:
                with open("gesture_class_map.pkl", "rb") as f:
                    class_map = pickle.load(f)
                    if isinstance(class_map, dict):
                        GESTURE_LABELS = [class_map[i] for i in sorted(class_map.keys())]
                    else:
                        GESTURE_LABELS = class_map
            except:
                GESTURE_LABELS = list("123456789") + list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
            
            print(f"[OK] Gesture Classifier loaded with {len(GESTURE_LABELS)} labels")
        else:
            print("[!] gesture_classifier.pkl not found")
            gesture_model = None
    except Exception as e:
        print(f"[!] Gesture Classifier error: {e}")
        gesture_model = None
    
    models_loaded = True
    return landmarker is not None and gesture_model is not None

# ========================================
# HEALTH CHECK
# ========================================
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'message': 'Backend server is running',
        'port': 5000,
        'models_loaded': models_loaded
    })

# ========================================
# GESTURE STATUS
# ========================================
@app.route('/api/gesture-status', methods=['GET'])
def gesture_status():
    load_models()
    return jsonify({
        'status': 'ready',
        'landmarker': landmarker is not None,
        'gesture_model': gesture_model is not None,
        'labels': GESTURE_LABELS
    })

# ========================================
# PROCESS FRAME - Gesture Recognition
# ========================================
@app.route('/api/process-frame', methods=['POST'])
def process_frame():
    """Process image frame for gesture recognition"""
    try:
        load_models()
        
        if gesture_model is None or landmarker is None:
            return jsonify({
                'status': 'error',
                'message': 'Models not loaded',
                'gesture': None
            }), 500
        
        # Get image from request
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({
                'status': 'error',
                'message': 'No image provided',
                'gesture': None
            }), 400
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({
                'status': 'error',
                'message': 'Invalid image',
                'gesture': None
            }), 400
        
        # Detect hand landmarks
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        from mediapipe.framework.formats import image as image_module
        mp_image = image_module.Image(image_format=image_module.ImageFormat.SRGB, data=rgb_frame)
        
        detection_result = landmarker.detect(mp_image)
        
        if not detection_result.hand_landmarks:
            return jsonify({
                'status': 'ok',
                'gesture': None,
                'confidence': 0
            })
        
        # Extract features from landmarks
        landmarks = detection_result.hand_landmarks[0]
        landmarks_list = []
        for lm in landmarks:
            landmarks_list.extend([lm.x, lm.y, lm.z])
        
        # Predict gesture
        prediction = gesture_model.predict([landmarks_list])
        confidence = gesture_model.predict_proba([landmarks_list]).max()
        
        gesture_label = GESTURE_LABELS[prediction[0]] if prediction[0] < len(GESTURE_LABELS) else "Unknown"
        
        return jsonify({
            'status': 'ok',
            'gesture': gesture_label,
            'confidence': float(confidence),
            'landmarks_count': len(landmarks)
        })
    
    except Exception as e:
        print(f"[ERR] Frame processing error: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'gesture': None
        }), 500

# ========================================
# CHATBOT ENDPOINT
# ========================================
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    
    return jsonify({
        'status': 'ok',
        'message': user_message,
        'response': f'You said: {user_message}'
    })

if __name__ == '__main__':
    # Load models on startup
    print("[*] Pre-loading models...")
    load_models()
    
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

