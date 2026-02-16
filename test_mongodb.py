#!/usr/bin/env python3
"""Quick MongoDB connection test"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from urllib.parse import quote_plus

# Load environment
load_dotenv('.env')

MONGODB_URI = os.getenv('MONGODB_URI', '')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'accessai_db')

print("=" * 70)
print("MONGODB CONNECTION TEST")
print("=" * 70)
print(f"URI configured: {'Yes' if MONGODB_URI else 'No'}")
print(f"Database name: {MONGODB_DB_NAME}")

if not MONGODB_URI:
    print("[!] ERROR: MONGODB_URI not found in .env")
    exit(1)

# Mask password in output
masked_uri = MONGODB_URI[:20] + "***" + MONGODB_URI[-30:] if len(MONGODB_URI) > 50 else "***"
print(f"URI (masked): {masked_uri}")
print("=" * 70)

try:
    print("[*] Attempting connection...")
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)
    
    # Test connection
    print("[*] Testing connection with ping command...")
    client.admin.command('ping')
    print("✅ [SUCCESS] MongoDB connected successfully!")
    
    # Get database
    db = client[MONGODB_DB_NAME]
    print(f"✅ [SUCCESS] Database '{MONGODB_DB_NAME}' accessed")
    
    # List collections
    collections = db.list_collection_names()
    print(f"✅ [SUCCESS] Found {len(collections)} collections: {collections}")
    
    # Test write permission
    print("[*] Testing write permission...")
    test_result = db['_test'].insert_one({'test': True})
    print(f"✅ [SUCCESS] Write test passed (ID: {test_result.inserted_id})")
    
    # Clean up test
    db['_test'].delete_many({'test': True})
    print("✅ [SUCCESS] Cleanup completed")
    
    print("=" * 70)
    print("✅ ALL TESTS PASSED - MongoDB is ready!")
    print("=" * 70)
    
    client.close()
    
except Exception as e:
    print("=" * 70)
    print(f"❌ [FAILED] MongoDB connection error: {e}")
    print("=" * 70)
    print("\nTroubleshooting:")
    print("1. Check if password has special characters that need URL encoding")
    print("2. Verify network connectivity to MongoDB Atlas")
    print("3. Check MongoDB Atlas IP whitelist (should allow 0.0.0.0/0)")
    print("4. Verify cluster is running and accessible")
    exit(1)
