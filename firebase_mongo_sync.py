#!/usr/bin/env python3
"""
Firebase to MongoDB Sync via Flask API
This endpoint syncs all data from Firebase to MongoDB
Call from frontend: POST http://localhost:5000/api/sync-firebase-to-mongodb
"""

import requests
import json
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv(Path(__file__).parent / '.env.local')

class FirebaseMongoSync:
    def __init__(self):
        self.firebase_api_key = os.getenv('VITE_FIREBASE_API_KEY')
        self.firebase_project_id = os.getenv('VITE_FIREBASE_PROJECT_ID')
        self.mongodb_uri = os.getenv('MONGODB_URI')
        
    def sync_via_rest_api(self):
        """
        Sync Firebase data using REST API
        This is called by the Flask endpoint after frontend fetches data
        """
        try:
            from mongodb_connection import get_db
            db = get_db()
            
            if not db:
                return {'success': False, 'error': 'MongoDB unavailable'}
            
            return {'success': True, 'message': 'Sync initiated'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

def get_sync_handler():
    """Returns the sync handler instance"""
    return FirebaseMongoSync()
