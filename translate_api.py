#!/usr/bin/env python3
"""
Translation API server using OpenAI
Clean, simple, and reliable
"""

import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

# Load environment variables from .env file
def load_env_file():
    """Load .env file and set environment variables"""
    env_file = r'd:\ai bot base\.env'
    if os.path.exists(env_file):
        try:
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key.strip()] = value.strip()
            print("✓ Environment variables loaded from .env")
        except Exception as e:
            print(f"! Error loading .env: {e}")
    else:
        print(f"! .env file not found at {env_file}")

# Load environment before creating app
load_env_file()

# Create app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Get OpenAI API key
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

# Language names mapping
LANGUAGE_NAMES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'hi': 'Hindi',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
}

LANGUAGE_MAP = {
    'english': 'en',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'hindi': 'hi',
    'portuguese': 'pt',
    'russian': 'ru',
    'chinese': 'zh',
    'japanese': 'ja',
    'korean': 'ko',
}

def normalize_lang_code(lang):
    """Convert language name or code to standard code"""
    if not lang:
        return 'en'
    lang_lower = lang.lower()
    if len(lang_lower) <= 2:
        return lang_lower
    return LANGUAGE_MAP.get(lang_lower, lang_lower[:2])

def translate_with_openai(text, src, tgt):
    """Translate using OpenAI API"""
    if not OPENAI_API_KEY or not text or len(text.strip()) == 0:
        return None
    
    try:
        tgt_name = LANGUAGE_NAMES.get(tgt, tgt.upper())
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-3.5-turbo',
                'messages': [
                    {
                        'role': 'system',
                        'content': f'You are a professional translator. Translate text to {tgt_name}. Return ONLY the translated text.'
                    },
                    {
                        'role': 'user',
                        'content': text
                    }
                ],
                'temperature': 0.3,
                'max_tokens': 2000
            },
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            translated = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            if translated:
                print(f"✓ Translated via OpenAI: '{text}' → '{translated}'")
                return translated
        elif response.status_code == 429:
            print(f"! OpenAI rate limit (429) - quota exceeded")
        else:
            print(f"! OpenAI error: {response.status_code}")
    except Exception as e:
        print(f"! Exception: {e}")
    
    return None

def detect_language_openai(text):
    """Detect language using OpenAI"""
    if not OPENAI_API_KEY or not text or len(text.strip()) < 3:
        return 'en'
    
    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-3.5-turbo',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'Respond with ONLY a 2-letter language code for the text.'
                    },
                    {
                        'role': 'user',
                        'content': text
                    }
                ],
                'temperature': 0,
                'max_tokens': 2
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            lang = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip().lower()
            if len(lang) == 2:
                print(f"✓ Detected: {lang}")
                return lang
    except Exception as e:
        print(f"! Error: {e}")
    
    return 'en'

@app.route('/api/translate/translate', methods=['POST', 'OPTIONS'])
def translate():
    """Translate endpoint"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({'error': True, 'message': 'No JSON payload'}), 400
        
        text = payload.get('text', '').strip()
        src = normalize_lang_code(payload.get('sourceLanguageCode', 'en'))
        tgt = normalize_lang_code(payload.get('targetLanguageCode', 'es'))
        
        if not text:
            return jsonify({
                'translations': [{'translatedText': ''}],
                'error': False,
                'provider': 'none'
            }), 200
        
        # Same language
        if src == tgt:
            return jsonify({
                'translations': [{'translatedText': text}],
                'error': False,
                'provider': 'same'
            }), 200
        
        # Translate
        translated = translate_with_openai(text, src, tgt)
        
        result = {
            'translations': [{'translatedText': translated or text}],
            'error': False,
            'provider': 'openai' if translated else 'fallback'
        }
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': True, 'message': str(e)}), 500

@app.route('/api/translate/detect', methods=['POST', 'OPTIONS'])
def detect():
    """Language detection endpoint"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({'error': True, 'message': 'No JSON payload'}), 400
        
        text = payload.get('content', '').strip()
        
        if not text:
            return jsonify({
                'languages': [{'language': 'en', 'confidence': 0.5}],
                'error': False
            }), 200
        
        detected = detect_language_openai(text)
        
        return jsonify({
            'languages': [{'language': detected, 'confidence': 0.95}],
            'error': False
        }), 200
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': True, 'message': str(e)}), 500

@app.route('/api/status', methods=['GET'])
def status():
    """Status endpoint"""
    return jsonify({
        'status': 'online',
        'service': 'translation',
        'has_openai': bool(OPENAI_API_KEY)
    }), 200

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Translation API Server (OpenAI)")
    print("="*60)
    print(f"OpenAI configured: {bool(OPENAI_API_KEY)}")
    if OPENAI_API_KEY:
        print(f"API Key: {OPENAI_API_KEY[:30]}...")
    print("="*60)
    print("Starting on http://127.0.0.1:5000\n")
    
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
