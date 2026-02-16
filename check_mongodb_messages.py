#!/usr/bin/env python3
"""Check MongoDB messages"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv('.env')

MONGODB_URI = os.getenv('MONGODB_URI', '')
MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'accessai_db')

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]

messages = list(db['messages'].find().limit(5))

print(f"Found {len(messages)} messages\n")

for msg in messages:
    print("=" * 70)
    print(f"ID: {msg.get('_id')}")
    print(f"Text: {msg.get('text', 'N/A')}")
    print(f"Sender: {msg.get('sender', 'N/A')}")
    print(f"Has attachment: {bool(msg.get('attachment'))}")
    if msg.get('attachment'):
        att = msg['attachment']
        print(f"  - Type: {att.get('type', 'N/A')}")
        print(f"  - Name: {att.get('name', 'N/A')}")
        print(f"  - Is Image: {att.get('isImage', 'N/A')}")
        print(f"  - Data length: {len(att.get('data', '')) if att.get('data') else 0}")
    print()

client.close()
