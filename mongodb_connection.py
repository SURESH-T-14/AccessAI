#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MongoDB Connection Module
Handles MongoDB connection and operations for AccessAI
"""

import os
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, ConnectionFailure
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
try:
    env_path = Path(__file__).parent / '.env.local'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

# Get MongoDB URI from environment
MONGODB_URI = os.getenv('MONGODB_URI', '')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'accessai_db')

# Initialize MongoDB client
mongo_client = None
mongo_db = None

def connect_mongodb():
    """
    Connect to MongoDB and test connection
    Returns: (client, db) or (None, None) if connection fails
    """
    global mongo_client, mongo_db
    
    if not MONGODB_URI:
        print("[!] MongoDB URI not configured in .env.local")
        return None, None
    
    try:
        # Create MongoDB client with timeout
        mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        
        # Test connection
        mongo_client.admin.command('ping')
        print("[✓] MongoDB connected successfully")
        
        # Get database
        mongo_db = mongo_client[MONGODB_DB_NAME]
        print(f"[✓] Using database: {MONGODB_DB_NAME}")
        
        # Create indexes
        _create_indexes()
        
        return mongo_client, mongo_db
        
    except (ServerSelectionTimeoutError, ConnectionFailure) as e:
        print(f"[!] MongoDB connection failed: {e}")
        mongo_client = None
        mongo_db = None
        return None, None
    except Exception as e:
        print(f"[!] MongoDB error: {e}")
        mongo_client = None
        mongo_db = None
        return None, None

def _create_indexes():
    """Create necessary database indexes"""
    try:
        # Users collection indexes
        if mongo_db and 'users' in mongo_db.list_collection_names():
            mongo_db['users'].create_index('email', unique=True, sparse=True)
            mongo_db['users'].create_index('uid', unique=True)
            print("[✓] Created users collection indexes")
        
        # Messages collection indexes
        if mongo_db and 'messages' in mongo_db.list_collection_names():
            mongo_db['messages'].create_index([('userId', 1), ('chatId', 1), ('timestamp', -1)])
            print("[✓] Created messages collection indexes")
        
        # Emergency contacts indexes
        if mongo_db and 'emergency_contacts' in mongo_db.list_collection_names():
            mongo_db['emergency_contacts'].create_index('userId', unique=False)
            print("[✓] Created emergency_contacts collection indexes")
            
    except Exception as e:
        print(f"[!] Error creating indexes: {e}")

def get_db():
    """Get MongoDB database instance"""
    global mongo_db
    if mongo_db is None:
        connect_mongodb()
    return mongo_db

def close_connection():
    """Close MongoDB connection"""
    global mongo_client, mongo_db
    if mongo_client:
        mongo_client.close()
        print("[✓] MongoDB connection closed")
        mongo_client = None
        mongo_db = None

def insert_message(user_id, chat_id, message_data):
    """Insert a message into MongoDB"""
    try:
        db = get_db()
        if not db:
            return None
        
        result = db['messages'].insert_one({
            'userId': user_id,
            'chatId': chat_id,
            **message_data
        })
        return str(result.inserted_id)
    except Exception as e:
        print(f"[!] Error inserting message: {e}")
        return None

def get_messages(user_id, chat_id, limit=50):
    """Get messages for a specific chat"""
    try:
        db = get_db()
        if not db:
            return []
        
        messages = list(db['messages'].find(
            {'userId': user_id, 'chatId': chat_id}
        ).sort('timestamp', -1).limit(limit))
        
        # Convert ObjectId to string
        for msg in messages:
            msg['_id'] = str(msg['_id'])
        
        return messages
    except Exception as e:
        print(f"[!] Error getting messages: {e}")
        return []

def save_emergency_contact(user_id, contact_data):
    """Save emergency contact to MongoDB"""
    try:
        db = get_db()
        if not db:
            return None
        
        result = db['emergency_contacts'].insert_one({
            'userId': user_id,
            **contact_data
        })
        return str(result.inserted_id)
    except Exception as e:
        print(f"[!] Error saving emergency contact: {e}")
        return None

def get_emergency_contacts(user_id):
    """Get all emergency contacts for a user"""
    try:
        db = get_db()
        if not db:
            return []
        
        contacts = list(db['emergency_contacts'].find({'userId': user_id}))
        
        # Convert ObjectId to string
        for contact in contacts:
            contact['_id'] = str(contact['_id'])
        
        return contacts
    except Exception as e:
        print(f"[!] Error getting emergency contacts: {e}")
        return []

def save_user_profile(user_id, profile_data):
    """Save or update user profile in MongoDB"""
    try:
        db = get_db()
        if not db:
            return False
        
        result = db['users'].update_one(
            {'uid': user_id},
            {'$set': profile_data},
            upsert=True
        )
        return result.acknowledged
    except Exception as e:
        print(f"[!] Error saving user profile: {e}")
        return False

def get_user_profile(user_id):
    """Get user profile from MongoDB"""
    try:
        db = get_db()
        if not db:
            return None
        
        user = db['users'].find_one({'uid': user_id})
        if user:
            user['_id'] = str(user['_id'])
        return user
    except Exception as e:
        print(f"[!] Error getting user profile: {e}")
        return None
