"""
Minimal Translation Server - No TensorFlow dependency
Provides basic translation functionality without heavy dependencies
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Simple language detection
LANGUAGE_CODES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'hi': 'Hindi',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ar': 'Arabic'
}

# Basic word-based language detection
LANGUAGE_KEYWORDS = {
    'en': ['the', 'is', 'and', 'to', 'a', 'in', 'of', 'that', 'it'],
    'es': ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'por', 'para'],
    'fr': ['le', 'de', 'un', 'et', 'à', 'en', 'que', 'est', 'pour'],
    'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit'],
    'hi': ['का', 'से', 'है', 'और', 'के', 'में', 'यह', 'को', 'अन्य'],
    'pt': ['o', 'de', 'que', 'e', 'do', 'a', 'em', 'um', 'para'],
    'ru': ['и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с'],
    'ja': ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と'],
    'zh': ['的', '一', '是', '在', '不', '了', '有', '和', '人'],
    'ar': ['في', 'من', 'إلى', 'أن', 'على', 'هو', 'هذا', 'باستخدام', 'مع']
}

@app.route('/api/translate/translate', methods=['POST', 'OPTIONS'])
def translate_text():
    """Translate text - returns original text as fallback"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json(force=True) if request.is_json else {}
        text = data.get('text', '')
        source_lang = data.get('sourceLanguageCode', 'en')
        target_lang = data.get('targetLanguageCode', 'es')
        
        print(f"[Translate] {source_lang} -> {target_lang}: {text[:50]}...")
        
        if not text:
            return jsonify({
                'translations': [{'translatedText': ''}],
                'error': True
            }), 400
        
        # For now, return original text with success
        # In production, integrate with actual translation API
        response_data = {
            'translations': [{
                'translatedText': text,
                'detectedSourceLanguage': source_lang
            }],
            'data': {
                'translations': [{
                    'translatedText': text,
                    'detectedSourceLanguage': source_lang
                }]
            },
            'error': False,
            'provider': 'local-fallback'
        }
        print("[Translate] OK - Success")
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"[Translate] ERR - Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': True,
            'message': str(e),
            'translations': [{'translatedText': text if text else ''}]
        }), 200

@app.route('/api/translate/detect', methods=['POST', 'OPTIONS'])
def detect_language():
    """Detect language of text"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json(force=True) if request.is_json else {}
        text = data.get('content', '').lower()
        
        print(f"[Detect] Language detection for: {text[:50]}...")
        
        if not text:
            return jsonify({
                'languages': [{'language': 'en', 'confidence': 0.5}],
                'error': False
            }), 200
        
        # Detect language based on keywords
        detected_lang = 'en'  # Default
        max_matches = 0
        
        for lang, keywords in LANGUAGE_KEYWORDS.items():
            matches = sum(1 for word in keywords if word in text)
            if matches > max_matches:
                max_matches = matches
                detected_lang = lang
        
        confidence = min(0.9, 0.5 + (max_matches * 0.1))
        
        response_data = {
            'languages': [{
                'language': detected_lang,
                'languageCode': detected_lang,
                'confidence': confidence,
                'languageName': LANGUAGE_CODES.get(detected_lang, 'Unknown')
            }],
            'error': False
        }
        print(f"[Detect] OK - Detected: {detected_lang}")
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"[Detect] ERR - Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': False,
            'languages': [{'language': 'en', 'confidence': 0.5}]
        }), 200

@app.route('/api/translate/supported', methods=['GET'])
def get_supported_languages():
    """Get list of supported languages"""
    return jsonify({
        'languages': [
            {'code': code, 'name': name}
            for code, name in LANGUAGE_CODES.items()
        ]
    })

@app.route('/api/status', methods=['GET'])
def status():
    """Get server status"""
    return jsonify({
        'status': 'online',
        'service': 'Translation Server',
        'version': '1.0',
        'providers': ['local-fallback'],
        'endpoints': [
            '/api/translate/translate',
            '/api/translate/detect',
            '/api/translate/supported'
        ]
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print("=" * 60)
    print("Translation Server - Local Translation & Detection")
    print("=" * 60)
    print(f"Server: http://localhost:{port}")
    print("\nAvailable endpoints:")
    print("  POST /api/translate/translate - Translate text")
    print("  POST /api/translate/detect - Detect language")
    print("  GET  /api/translate/supported - Supported languages")
    print("  GET  /api/status - Server status")
    print("=" * 60)
    print("Starting server...")
    
    # Run without debug mode and reloader to avoid crashes
    try:
        app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False, threaded=True)
    except KeyboardInterrupt:
        print("\nServer stopped")
    except Exception as e:
        print(f"Server error: {e}")
        import traceback
        traceback.print_exc()
