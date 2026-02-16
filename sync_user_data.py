#!/usr/bin/env python3
"""
Sync specific user data from Firebase to MongoDB
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv(Path(__file__).parent / '.env.local')

import firebase_admin
from firebase_admin import credentials, firestore
from mongodb_connection import get_db

# Firebase config
firebase_config_created = False
try:
    # Try to initialize with service account
    service_account_path = Path(__file__).parent / 'firebase-service-account.json'
    if service_account_path.exists():
        cred = credentials.Certificate(str(service_account_path))
        firebase_admin.initialize_app(cred, {
            'projectId': os.getenv('VITE_FIREBASE_PROJECT_ID')
        })
        firebase_config_created = True
        print("[✓] Firebase initialized with service account")
    else:
        print("[!] Service account key not found")
        print("    Download from: Firebase Console > Project Settings > Service Accounts")
except Exception as e:
    print(f"[!] Firebase init error: {e}")

def sync_user_data(uid):
    """Sync all data for specific user from Firebase to MongoDB"""
    
    if not firebase_config_created:
        print("[!] Firebase not configured. Cannot sync.")
        return
    
    try:
        db_firestore = firestore.client()
        db_mongo = get_db()
        
        if not db_mongo:
            print("[!] MongoDB connection failed")
            return
        
        print("=" * 70)
        print(f"SYNCING DATA FOR USER: {uid}")
        print("=" * 70)
        
        app_id = 'access-ai-v4'
        synced = {
            'messages': 0,
            'profile': 0,
            'contacts': 0
        }
        
        # 1. SYNC MESSAGES
        print(f"\n[*] Fetching messages for user {uid}...")
        try:
            user_chats_ref = f"artifacts/{app_id}/users/{uid}/chats"
            chats_col = db_firestore.collection(user_chats_ref)
            chats = chats_col.stream()
            
            for chat_doc in chats:
                chat_id = chat_doc.id
                print(f"  [*] Processing chat: {chat_id}")
                
                # Get messages in this chat
                messages_ref = f"artifacts/{app_id}/users/{uid}/chats/{chat_id}/messages"
                messages_col = db_firestore.collection(messages_ref)
                messages = messages_col.stream()
                
                for msg_doc in messages:
                    msg_data = msg_doc.to_dict()
                    
                    try:
                        # Insert to MongoDB
                        db_mongo['messages'].insert_one({
                            'userId': uid,
                            'chatId': chat_id,
                            'firebaseDocId': msg_doc.id,
                            **msg_data
                        })
                        synced['messages'] += 1
                    except Exception as e:
                        if 'duplicate' not in str(e).lower():
                            print(f"    [!] Error: {e}")
            
            print(f"  [✓] Synced {synced['messages']} messages")
        
        except Exception as e:
            print(f"  [!] Error fetching messages: {e}")
        
        # 2. SYNC USER PROFILE
        print(f"\n[*] Fetching user profile...")
        try:
            user_ref = f"artifacts/{app_id}/users/{uid}"
            user_doc = db_firestore.document(user_ref).get()
            
            if user_doc.exists:
                user_data = user_doc.to_dict()
                db_mongo['users'].update_one(
                    {'uid': uid},
                    {'$set': {
                        'uid': uid,
                        'firebaseDocId': user_doc.id,
                        **user_data
                    }},
                    upsert=True
                )
                synced['profile'] = 1
                print(f"  [✓] Synced user profile")
                print(f"      Name: {user_data.get('displayName', 'N/A')}")
                print(f"      Email: {user_data.get('email', 'N/A')}")
            else:
                print(f"  [!] No user profile found")
        
        except Exception as e:
            print(f"  [!] Error fetching user profile: {e}")
        
        # 3. SYNC EMERGENCY CONTACTS
        print(f"\n[*] Fetching emergency contacts...")
        try:
            contacts_ref = f"artifacts/{app_id}/users/{uid}/emergencyContacts"
            contacts_col = db_firestore.collection(contacts_ref)
            contacts = contacts_col.stream()
            
            for contact_doc in contacts:
                contact_data = contact_doc.to_dict()
                
                try:
                    db_mongo['emergency_contacts'].insert_one({
                        'userId': uid,
                        'firebaseDocId': contact_doc.id,
                        **contact_data
                    })
                    synced['contacts'] += 1
                except Exception as e:
                    if 'duplicate' not in str(e).lower():
                        print(f"    [!] Error: {e}")
            
            print(f"  [✓] Synced {synced['contacts']} emergency contacts")
        
        except Exception as e:
            print(f"  [!] No emergency contacts or error: {e}")
        
        # SUMMARY
        print("\n" + "=" * 70)
        print("SYNC COMPLETE!")
        print("=" * 70)
        print(f"✅ Messages synced:           {synced['messages']}")
        print(f"✅ User profile synced:       {synced['profile']}")
        print(f"✅ Emergency contacts synced: {synced['contacts']}")
        print(f"✅ Total records:             {sum(synced.values())}")
        print("=" * 70)
        print("\nYour Firebase data has been backed up to MongoDB!")
        print(f"MongoDB Database: {os.getenv('MONGODB_DB_NAME')}")
        print(f"Collections: messages, users, emergency_contacts")
        print("=" * 70)
        
    except Exception as e:
        print(f"[!] Fatal error: {e}")
        import traceback
        print(traceback.format_exc())

if __name__ == '__main__':
    # UID provided by user
    uid = "lZDRsB0x0Af037qRWHiYqTkRvdT2"
    sync_user_data(uid)
