"""
Advanced NLP Integration for Gesture Recognition System
Includes: Sentiment Analysis, Entity Recognition, Text Generation, Intent Detection
"""

import os
import json
from typing import Dict, List, Tuple, Optional
import re

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("[!] Google Generative AI not available. Install: pip install google-generativeai")

try:
    from transformers import pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("[!] Transformers not available. Install: pip install transformers torch")

try:
    import nltk
    from nltk.tokenize import word_tokenize, sent_tokenize
    from nltk.corpus import stopwords
    from nltk.sentiment import SentimentIntensityAnalyzer
    
    # Download required NLTK data
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    
    try:
        nltk.data.find('sentiment/vader_lexicon')
    except LookupError:
        nltk.download('vader_lexicon', quiet=True)
    
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
    
    NLTK_AVAILABLE = True
    sia = SentimentIntensityAnalyzer()
except ImportError:
    NLTK_AVAILABLE = False
    print("[!] NLTK not available. Install: pip install nltk")

class NLPProcessor:
    """Enhanced NLP processing for gesture recognition system"""
    
    def __init__(self, gemini_api_key: Optional[str] = None):
        """Initialize NLP processor with optional Gemini API"""
        self.gemini_available = False
        self.transformers_available = TRANSFORMERS_AVAILABLE
        self.nltk_available = NLTK_AVAILABLE
        
        # Initialize Gemini if available
        if GEMINI_AVAILABLE and gemini_api_key:
            try:
                genai.configure(api_key=gemini_api_key)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
                self.gemini_available = True
                print("[✓] Gemini AI configured successfully")
            except Exception as e:
                print(f"[!] Gemini configuration failed: {e}")
        
        # Initialize transformer pipelines
        self.sentiment_pipeline = None
        self.ner_pipeline = None
        if self.transformers_available:
            try:
                self.sentiment_pipeline = pipeline("sentiment-analysis", device=-1)  # CPU
                print("[✓] Sentiment analysis pipeline loaded")
            except:
                pass
            
            try:
                self.ner_pipeline = pipeline("ner", device=-1)  # CPU
                print("[✓] Named Entity Recognition pipeline loaded")
            except:
                pass
    
    def analyze_sentiment(self, text: str) -> Dict:
        """Analyze sentiment of text using multiple methods"""
        result = {
            'text': text,
            'sentiment': None,
            'confidence': 0.0,
            'methods': {}
        }
        
        # Method 1: VADER Sentiment (NLTK)
        if self.nltk_available:
            try:
                scores = sia.polarity_scores(text)
                result['methods']['vader'] = {
                    'sentiment': 'positive' if scores['compound'] > 0.05 else 'negative' if scores['compound'] < -0.05 else 'neutral',
                    'score': scores['compound'],
                    'scores': scores
                }
                result['sentiment'] = result['methods']['vader']['sentiment']
                result['confidence'] = abs(scores['compound'])
            except Exception as e:
                print(f"[!] VADER sentiment analysis failed: {e}")
        
        # Method 2: Transformer-based sentiment
        if self.sentiment_pipeline:
            try:
                pred = self.sentiment_pipeline(text[:512])[0]  # Limit to 512 chars
                result['methods']['transformer'] = {
                    'label': pred['label'].lower(),
                    'score': pred['score']
                }
            except Exception as e:
                print(f"[!] Transformer sentiment failed: {e}")
        
        return result
    
    def extract_entities(self, text: str) -> Dict:
        """Extract named entities from text"""
        result = {
            'text': text,
            'entities': [],
            'entities_by_type': {}
        }
        
        if self.ner_pipeline:
            try:
                entities = self.ner_pipeline(text[:512])  # Limit to 512 chars
                
                current_entity = None
                for entity in entities:
                    entity_type = entity['entity'].replace('B-', '').replace('I-', '')
                    word = entity['word'].strip('#')
                    score = entity['score']
                    
                    if entity_type not in result['entities_by_type']:
                        result['entities_by_type'][entity_type] = []
                    
                    if entity['entity'].startswith('B-'):
                        current_entity = {'type': entity_type, 'text': word, 'score': score}
                        result['entities'].append(current_entity)
                    elif current_entity and entity['entity'].startswith('I-'):
                        current_entity['text'] += ' ' + word
                    
                    result['entities_by_type'][entity_type].append(word)
            except Exception as e:
                print(f"[!] NER extraction failed: {e}")
        
        return result
    
    def detect_intent(self, text: str) -> Dict:
        """Detect user intent from text"""
        text_lower = text.lower()
        
        intents = {
            'greeting': {
                'keywords': ['hello', 'hi', 'hey', 'greetings', 'howdy', 'good morning', 'good afternoon', 'good evening'],
                'response': 'greeting'
            },
            'farewell': {
                'keywords': ['bye', 'goodbye', 'see you', 'farewell', 'goodbye', 'quit', 'exit'],
                'response': 'farewell'
            },
            'help': {
                'keywords': ['help', 'assist', 'support', 'how do i', 'how to', 'can you help', 'need help'],
                'response': 'help'
            },
            'question': {
                'keywords': ['what', 'why', 'how', 'when', 'where', 'who', '?'],
                'response': 'question'
            },
            'command': {
                'keywords': ['show', 'display', 'tell', 'give', 'list', 'start', 'stop', 'run'],
                'response': 'command'
            },
            'feedback': {
                'keywords': ['great', 'awesome', 'excellent', 'terrible', 'bad', 'good', 'amazing', 'love'],
                'response': 'feedback'
            }
        }
        
        detected_intents = []
        for intent_name, intent_data in intents.items():
            for keyword in intent_data['keywords']:
                if keyword in text_lower:
                    detected_intents.append({
                        'intent': intent_name,
                        'keyword': keyword,
                        'confidence': 0.8
                    })
                    break
        
        return {
            'text': text,
            'primary_intent': detected_intents[0]['intent'] if detected_intents else 'unknown',
            'all_intents': detected_intents,
            'confidence': detected_intents[0]['confidence'] if detected_intents else 0.0
        }
    
    def extract_keywords(self, text: str, top_k: int = 5) -> List[str]:
        """Extract top keywords from text"""
        if not self.nltk_available:
            # Fallback: simple word extraction
            words = re.findall(r'\b[a-z]{3,}\b', text.lower())
            return list(set(words))[:top_k]
        
        try:
            tokens = word_tokenize(text.lower())
            stop_words = set(stopwords.words('english'))
            keywords = [w for w in tokens if w.isalnum() and w not in stop_words and len(w) > 2]
            return list(set(keywords))[:top_k]
        except Exception as e:
            print(f"[!] Keyword extraction failed: {e}")
            return []
    
    def generate_response(self, gesture: str, user_message: Optional[str] = None) -> Dict:
        """Generate intelligent response using Gemini AI"""
        result = {
            'gesture': gesture,
            'response': None,
            'context': None,
            'method': None
        }
        
        if self.gemini_available and user_message:
            try:
                prompt = f"""
You are a friendly gesture recognition assistant helping someone learn Indian Sign Language.
The user just made the gesture: {gesture}

User message: {user_message}

Provide a friendly, encouraging response that acknowledges their gesture and builds on their message.
Keep it brief (1-2 sentences) and positive.
                """
                
                response = self.model.generate_content(prompt)
                result['response'] = response.text
                result['method'] = 'gemini_ai'
                result['context'] = {'user_message': user_message, 'gesture': gesture}
            except Exception as e:
                print(f"[!] Gemini generation failed: {e}")
        
        # Fallback to predefined responses
        if not result['response']:
            predefined = {
                'A': "👋 You made the letter A! Great start!",
                'B': "✋ Letter B! Keep the momentum!",
                'LOVE_YOU': "❤️ LOVE YOU! Your heart gesture is beautiful! 😍💕",
            }
            result['response'] = predefined.get(gesture, f"Gesture {gesture} detected! Keep practicing!")
            result['method'] = 'predefined'
        
        return result
    
    def summarize_text(self, text: str, max_length: int = 150) -> str:
        """Summarize text using Gemini"""
        if not self.gemini_available:
            # Fallback: return first sentence or truncate
            sentences = sent_tokenize(text) if self.nltk_available else text.split('.')
            return sentences[0][:max_length] if sentences else text[:max_length]
        
        try:
            prompt = f"Summarize this text in {max_length} characters or less:\n{text}"
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"[!] Summarization failed: {e}")
            return text[:max_length]
    
    def classify_gesture_category(self, gesture: str) -> Dict:
        """Classify gesture into category"""
        categories = {
            'digit': list("123456789"),
            'letter': list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
            'custom': ["LOVE_YOU"]
        }
        
        for category, gestures in categories.items():
            if gesture in gestures:
                return {
                    'gesture': gesture,
                    'category': category,
                    'position': gestures.index(gesture) + 1 if category == 'digit' else None
                }
        
        return {'gesture': gesture, 'category': 'unknown', 'position': None}

def create_nlp_processor(api_key: Optional[str] = None) -> NLPProcessor:
    """Factory function to create NLP processor"""
    return NLPProcessor(gemini_api_key=api_key)

# Example usage and testing
if __name__ == "__main__":
    print("\n" + "="*60)
    print("NLP PROCESSOR TEST")
    print("="*60 + "\n")
    
    processor = create_nlp_processor()
    
    # Test sentiment analysis
    test_texts = [
        "I love this gesture recognition system!",
        "This is terrible, it doesn't work at all",
        "The weather is nice today"
    ]
    
    print("📊 SENTIMENT ANALYSIS")
    print("-" * 60)
    for text in test_texts:
        result = processor.analyze_sentiment(text)
        print(f"Text: {text}")
        print(f"Sentiment: {result['sentiment']} (Confidence: {result['confidence']:.2f})")
        print()
    
    # Test intent detection
    print("\n🎯 INTENT DETECTION")
    print("-" * 60)
    test_intents = [
        "Hello, how can you help me?",
        "Show me the letter A",
        "Goodbye, see you later",
        "What is Indian Sign Language?"
    ]
    
    for text in test_intents:
        result = processor.detect_intent(text)
        print(f"Text: {text}")
        print(f"Intent: {result['primary_intent']} (Confidence: {result['confidence']:.2f})")
        print()
    
    # Test keyword extraction
    print("\n🔑 KEYWORD EXTRACTION")
    print("-" * 60)
    text = "Indian Sign Language is a beautiful gesture-based communication system used in India"
    keywords = processor.extract_keywords(text, top_k=5)
    print(f"Text: {text}")
    print(f"Keywords: {', '.join(keywords)}")
    print()
    
    # Test gesture classification
    print("\n🤟 GESTURE CLASSIFICATION")
    print("-" * 60)
    gestures = ['A', '5', 'LOVE_YOU', 'Z']
    for gesture in gestures:
        result = processor.classify_gesture_category(gesture)
        print(f"Gesture: {gesture} -> Category: {result['category']}")
    
    print("\n" + "="*60)
    print("✅ NLP PROCESSOR READY")
    print("="*60)
