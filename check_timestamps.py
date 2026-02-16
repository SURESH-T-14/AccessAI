#!/usr/bin/env python3
"""Check MongoDB message timestamps"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient
import json

load_dotenv('.env')

MONGODB_URI = os.getenv('MONGODB_URI', '')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'accessai_db')

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]

messages = list(db['messages'].find().limit(3))

print(f"Found {len(messages)} messages\n")

for msg in messages:
    print("=" * 70)
    print(f"ID: {msg.get('_id')}")
    print(f"Text: {msg.get('text', 'N/A')[:50]}")
    print(f"Timestamp field: {msg.get('timestamp')}")
    print(f"Timestamp type: {type(msg.get('timestamp'))}")
    if msg.get('timestamp'):
        ts = msg['timestamp']
        if hasattr(ts, 'keys'):
            print(f"Timestamp keys: {list(ts.keys())}")
            print(f"Timestamp.seconds: {ts.get('seconds')}")
    print()

client.close()
