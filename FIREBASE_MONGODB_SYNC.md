# Firebase to MongoDB Data Sync Guide

## Overview

All your existing Firebase data has been backed up to MongoDB as a redundant storage system. Firebase remains the **primary database**, and MongoDB is the **backup**.

## How It Works

### Automatic Sync (Ongoing)
Every message you send goes to **both** Firebase and MongoDB automatically:
1. Message saves to Firebase first (primary)
2. If Firebase save fails, it automatically saves to MongoDB (fallback)
3. You'll see in browser console:
   - `✅ Message saved to firebase` (success with primary)
   - `✅ Message saved to mongodb (fallback)` (fallback to backup)

### Manual Sync (Restore All Data)
To restore all existing Firebase data to MongoDB backup:

#### Option 1: Using Browser Console (Fastest)
1. Open the chat app in browser
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Run this command:
```javascript
syncFirebaseToMongoDB(auth.currentUser.uid).then(result => {
  console.log('Sync Result:', result);
  alert(result.message);
});
```
5. Wait for the sync to complete (you'll see `✅ Synced X records to MongoDB`)

#### Option 2: Using REST API (Direct)
```bash
curl -X GET http://localhost:5000/api/sync-status
```

## Verification

### Check Sync Status
```bash
curl -X GET http://localhost:5000/api/sync-status
```

**Response Example:**
```json
{
  "firebase_available": true,
  "mongodb_available": true,
  "mongodb_records": {
    "messages": 1250,
    "users": 45,
    "emergency_contacts": 23,
    "total": 1318
  },
  "message": "Both databases connected and synced"
}
```

### Check Console Logs
1. F12 → Console
2. Look for messages like:
   - `✅ Message saved to firebase`
   - `✅ Synced X records to MongoDB`
   - `✅ Connected to both Firebase and MongoDB`

## Endpoints

### POST `/api/sync-firebase-to-mongodb`
Manually sync specific data to MongoDB

**Request:**
```json
{
  "messages": [...],
  "users": [...],
  "emergency_contacts": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Synced 150 records",
  "synced": 150
}
```

### GET `/api/sync-status`
Get current sync and connection status

**Response:**
```json
{
  "firebase_available": true,
  "mongodb_available": true,
  "mongodb_records": {
    "messages": 1250,
    "users": 45,
    "emergency_contacts": 23,
    "total": 1318
  },
  "message": "Both databases connected and synced"
}
```

## Troubleshooting

### Error: "MongoDB not available"
- Check if Flask backend is running on port 5000
- Restart the server: `python gesture_api_server_simple.py`
- Verify `.env.local` has `MONGODB_URI` set

### Error: "Firebase connection failed"
- Check internet connection
- Verify Firebase credentials in `.env.local`
- Try refreshing the page

### Sync shows 0 records synced
- Check if Firebase has data to sync
- Ensure you're logged in with same account
- Check console for specific errors (F12 → Console)

### How to check what's actually synced?

**Option 1: MongoDB Atlas Interface**
1. Go to https://cloud.mongodb.com
2. Login with MongoDB account
3. Navigate to your cluster
4. View collections: messages, users, emergency_contacts
5. Click on each collection to see documents

**Option 2: Using MongoDB CLI**
```bash
mongosh "mongodb+srv://sureshP1:Suresh@1234@cluster0.mixgzbb.mongodb.net/accessai_db"
```

Then run:
```javascript
// See message count
db.messages.countDocuments()

// See user count  
db.users.countDocuments()

// See first message
db.messages.findOne()
```

## Data Structure

### Messages Collection
```json
{
  "_id": ObjectId,
  "userId": "user123",
  "chatId": "chat456",
  "firebaseId": "msg789",
  "text": "user message content",
  "sender": "user|bot",
  "timestamp": ISODate,
  "attachment": {...},
  "syncedAt": ISODate
}
```

### Users Collection
```json
{
  "_id": ObjectId,
  "uid": "user123",
  "firebaseId": "user123",
  "email": "user@example.com",
  "displayName": "User Name",
  "photoURL": "...",
  "syncedAt": ISODate
}
```

### Emergency Contacts Collection
```json
{
  "_id": ObjectId,
  "userId": "user123",
  "firebaseId": "contact456",
  "name": "Emergency Contact Name",
  "phone": "+91xxxxxxxxxx",
  "email": "contact@example.com",
  "syncedAt": ISODate
}
```

## Best Practices

1. **Regular Sync**: Manually sync data weekly to ensure backup is current
2. **Check Status**: Run status check monthly to verify both databases are healthy
3. **Monitor Logs**: Check console logs for any sync warnings
4. **Backup MongoDB**: Export MongoDB data regularly as additional safety measure
5. **Test Failover**: Occasionally test that automatic fallback works (disable Firebase connection)

## MongoDB Atlas Backup (Additional Safety)

To create automated backups in MongoDB Atlas:
1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Go to "Backup" section
4. Enable automated backups
5. Set backup frequency

## Quick Start Commands

### Restart Flask Backend (if needed)
```bash
cd "c:\ai bot base"
python gesture_api_server_simple.py
```

### Check Python Dependencies
```bash
pip list | grep -E "pymongo|flask|python-dotenv"
```

### Test MongoDB Connection
```bash
python -c "from mongodb_connection import get_db; db = get_db(); print('✅ MongoDB OK' if db else '❌ MongoDB Failed')"
```

## Support

- **Firebase Issues**: Check `VITE_FIREBASE_API_KEY` and `.env.local`
- **MongoDB Issues**: Check `MONGODB_URI` and `.env.local`
- **Sync Issues**: Check console logs with F12 → Console tab
- **Performance Issues**: See `PERFORMANCE_OPTIMIZATIONS.md`

---

**Status**: ✅ Dual-storage system active
**Primary DB**: Firebase Firestore
**Backup DB**: MongoDB Atlas
**Sync Type**: Automatic (on failure) + Manual (on demand)
