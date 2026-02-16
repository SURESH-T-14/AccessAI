#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Firebase to MongoDB Data Sync
Restores all existing Firebase data to MongoDB as backup
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
try:
    env_path = Path(__file__).parent / '.env.local'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("[!] Firebase admin SDK not available")

try:
    from mongodb_connection import get_db, insert_message, save_user_profile, save_emergency_contact
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False
    print("[!] MongoDB module not available")

def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Try to use service account key if available
        service_account_path = Path(__file__).parent / 'firebase-service-account.json'
        
        if service_account_path.exists():
            cred = credentials.Certificate(str(service_account_path))
            firebase_admin.initialize_app(cred)
            print("[✓] Firebase initialized with service account")
            return True
        else:
            print("[!] Firebase service account key not found at:", service_account_path)
            print("[!] Please download it from Firebase Console > Project Settings > Service Accounts")
            return False
    except Exception as e:
        print(f"[!] Firebase initialization error: {e}")
        return False

def sync_messages(db_firestore, db_mongo):
    """Sync all chat messages from Firebase to MongoDB"""
    try:
        print("[*] Syncing messages from Firebase...")
        
        # Get all messages collection reference
        messages_ref = db_firestore.collection('artifacts').document('access-ai-v4').collection('users')
        
        total_synced = 0
        
        # Iterate through all users
        for user_doc in messages_ref.stream():
            user_id = user_doc.id
            print(f"  [*] Processing user: {user_id}")
            
            try:
                # Get all chats for this user
                chats_ref = user_doc.reference.collection('chats')
                
                for chat_doc in chats_ref.stream():
                    chat_id = chat_doc.id
                    
                    # Get all messages for this chat
                    messages = chat_doc.reference.collection('messages').stream()
                    
                    for msg in messages:
                        msg_data = msg.to_dict()
                        
                        # Save to MongoDB
                        try:
                            db_mongo['messages'].insert_one({
                                'userId': user_id,
                                'chatId': chat_id,
                                'firebaseId': msg.id,
                                **msg_data
                            })
                            total_synced += 1
                        except Exception as e:
                            if 'duplicate' not in str(e).lower():
                                print(f"    [!] Error syncing message: {e}")
            
            except Exception as e:
                print(f"  [!] Error reading user {user_id}: {e}")
        
        print(f"[✓] Synced {total_synced} messages to MongoDB")
        return total_synced
        
    except Exception as e:
        print(f"[!] Error syncing messages: {e}")
        return 0

def sync_users(db_firestore, db_mongo):
    """Sync user profiles from Firebase to MongoDB"""
    try:
        print("[*] Syncing user profiles from Firebase...")
        
        users_ref = db_firestore.collection('artifacts').document('access-ai-v4').collection('users')
        
        total_synced = 0
        
        for user_doc in users_ref.stream():
            user_id = user_doc.id
            user_data = user_doc.to_dict()
            
            try:
                db_mongo['users'].update_one(
                    {'uid': user_id},
                    {'$set': {
                        'uid': user_id,
                        'firebaseId': user_doc.id,
                        **user_data
                    }},
                    upsert=True
                )
                total_synced += 1
            except Exception as e:
                print(f"  [!] Error syncing user {user_id}: {e}")
        
        print(f"[✓] Synced {total_synced} user profiles to MongoDB")
        return total_synced
        
    except Exception as e:
        print(f"[!] Error syncing users: {e}")
        return 0

def sync_emergency_contacts(db_firestore, db_mongo):
    """Sync emergency contacts from Firebase to MongoDB"""
    try:
        print("[*] Syncing emergency contacts from Firebase...")
        
        users_ref = db_firestore.collection('artifacts').document('access-ai-v4').collection('users')
        
        total_synced = 0
        
        for user_doc in users_ref.stream():
            user_id = user_doc.id
            
            try:
                # Get emergency contacts for this user
                contacts_ref = user_doc.reference.collection('emergencyContacts')
                
                for contact_doc in contacts_ref.stream():
                    contact_data = contact_doc.to_dict()
                    
                    try:
                        db_mongo['emergency_contacts'].insert_one({
                            'userId': user_id,
                            'firebaseId': contact_doc.id,
                            **contact_data
                        })
                        total_synced += 1
                    except Exception as e:
                        if 'duplicate' not in str(e).lower():
                            print(f"    [!] Error syncing contact: {e}")
            
            except Exception as e:
                # No emergency contacts collection for this user
                pass
        
        print(f"[✓] Synced {total_synced} emergency contacts to MongoDB")
        return total_synced
        
    except Exception as e:
        print(f"[!] Error syncing emergency contacts: {e}")
        return 0

def full_sync():
    """Execute full sync from Firebase to MongoDB"""
    
    if not FIREBASE_AVAILABLE:
        print("[!] Firebase SDK not available. Install: pip install firebase-admin")
        return False
    
    if not MONGODB_AVAILABLE:
        print("[!] MongoDB module not available")
        return False
    
    print("=" * 70)
    print("FIREBASE TO MONGODB DATA SYNC")
    print("=" * 70)
    
    # Initialize Firebase
    if not init_firebase():
        print("[!] Cannot initialize Firebase")
        return False
    
    # Get database connections
    try:
        db_firestore = firestore.client()
        db_mongo = get_db()
        
        if not db_mongo:
            print("[!] MongoDB connection failed")
            return False
        
        print("[✓] Connected to both Firebase and MongoDB")
        print()
        
        # Sync all data
        msg_count = sync_messages(db_firestore, db_mongo)
        user_count = sync_users(db_firestore, db_mongo)
        contact_count = sync_emergency_contacts(db_firestore, db_mongo)
        
        print()
        print("=" * 70)
        print("SYNC COMPLETE!")
        print("=" * 70)
        print(f"✅ Messages synced: {msg_count}")
        print(f"✅ Users synced: {user_count}")
        print(f"✅ Emergency contacts synced: {contact_count}")
        print(f"✅ Total records: {msg_count + user_count + contact_count}")
        print()
        print("All Firebase data has been backed up to MongoDB!")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"[!] Sync error: {e}")
        import traceback
        print(traceback.format_exc())
        return False

if __name__ == '__main__':
    success = full_sync()
    exit(0 if success else 1)
