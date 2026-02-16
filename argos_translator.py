#!/usr/bin/env python3
"""
Argos Translate Integration for AccessAI
Provides free, open-source translation without API keys
"""

import argostranslate.package
import argostranslate.translate
from typing import Dict, List, Optional

class ArgosTranslator:
    """Wrapper for Argos Translate functionality"""
    
    def __init__(self):
        """Initialize Argos Translate"""
        self.initialized = False
        self.available_packages = []
        self.supported_languages = {}
        
    def initialize(self):
        """Download and initialize translation packages"""
        try:
            print("[*] Initializing Argos Translate...")
            
            # Update package index
            argostranslate.package.update_package_index()
            print("[✓] Package index updated")
            
            # Get available packages
            self.available_packages = argostranslate.package.get_available_packages()
            print(f"[✓] Found {len(self.available_packages)} available translation packages")
            
            # Build supported languages map
            self._build_language_map()
            
            self.initialized = True
            print("[✓] Argos Translate initialized successfully")
            
        except Exception as e:
            print(f"[!] Error initializing Argos Translate: {e}")
            self.initialized = False
    
    def _build_language_map(self):
        """Build a map of supported language pairs"""
        for package in self.available_packages:
            key = f"{package.from_code}_{package.to_code}"
            self.supported_languages[key] = {
                'from_code': package.from_code,
                'to_code': package.to_code,
                'from_name': package.from_name,
                'to_name': package.to_name
            }
    
    def _ensure_package(self, from_code: str, to_code: str) -> bool:
        """Download and install translation package if needed"""
        try:
            # Check if package is already installed
            installed_packages = argostranslate.package.get_installed_packages()
            for pkg in installed_packages:
                if pkg.from_code == from_code and pkg.to_code == to_code:
                    return True
            
            # Find and install package
            package_to_install = next(
                (pkg for pkg in self.available_packages 
                 if pkg.from_code == from_code and pkg.to_code == to_code),
                None
            )
            
            if package_to_install:
                print(f"[*] Installing translation package: {from_code} -> {to_code}")
                argostranslate.package.install_from_path(package_to_install.download())
                print(f"[✓] Package installed: {from_code} -> {to_code}")
                return True
            else:
                print(f"[!] Package not found: {from_code} -> {to_code}")
                return False
                
        except Exception as e:
            print(f"[!] Error installing package: {e}")
            return False
    
    def translate(self, text: str, from_code: str, to_code: str) -> Dict:
        """
        Translate text from source to target language
        
        Args:
            text: Text to translate
            from_code: Source language code (e.g., 'en')
            to_code: Target language code (e.g., 'es')
        
        Returns:
            Dictionary with translation result 
        """
        try:
            if not text or not text.strip():
                return {
                    'translatedText': '',
                    'detectedSourceLanguage': from_code,
                    'error': False
                }
            
            # Ensure package is installed
            if not self._ensure_package(from_code, to_code):
                return {
                    'translatedText': text,
                    'error': True,
                    'message': f'Translation package not available for {from_code} -> {to_code}'
                }
            
            # Perform translation
            translated = argostranslate.translate.translate(text, from_code, to_code)
            
            return {
                'translatedText': translated,
                'detectedSourceLanguage': from_code,
                'error': False
            }
            
        except Exception as e:
            print(f"[!] Translation error: {e}")
            return {
                'translatedText': text,
                'error': True,
                'message': str(e)
            }
    
    def detect_language(self, text: str) -> Dict:
        """
        Detect language of text
        Note: Argos Translate doesn't have built-in detection,
        so we return a placeholder or use simple heuristics
        
        Args:
            text: Text to detect language for
        
        Returns:
            Dictionary with detection result
        """
        try:
            # Simple heuristic: assume English if no detection available
            # In production, you could use langdetect or textblob
            return {
                'languages': [
                    {
                        'languageCode': 'en',
                        'confidence': 0.8
                    }
                ],
                'error': False
            }
            
        except Exception as e:
            print(f"[!] Detection error: {e}")
            return {
                'languages': [],
                'error': True,
                'message': str(e)
            }
    
    def get_supported_languages(self) -> Dict:
        """Get list of supported language pairs"""
        installed = argostranslate.package.get_installed_packages()
        
        languages = {}
        for pkg in installed:
            languages[f"{pkg.from_code}_{pkg.to_code}"] = {
                'from': pkg.from_code,
                'to': pkg.to_code,
                'from_name': pkg.from_name,
                'to_name': pkg.to_name
            }
        
        return {
            'languages': languages,
            'count': len(languages)
        }
    
    def batch_translate(self, texts: List[str], from_code: str, to_code: str) -> List[Dict]:
        """
        Translate multiple texts at once
        
        Args:
            texts: List of texts to translate
            from_code: Source language code
            to_code: Target language code
        
        Returns:
            List of translation results
        """
        results = []
        for text in texts:
            result = self.translate(text, from_code, to_code)
            results.append(result)
        return results


# Global translator instance
translator = None

def init_translator():
    """Initialize the global translator instance"""
    global translator
    if translator is None:
        translator = ArgosTranslator()
        translator.initialize()
    return translator

def get_translator():
    """Get the global translator instance"""
    global translator
    if translator is None:
        init_translator()
    return translator
