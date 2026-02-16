# Restore Your Firebase Data to MongoDB 

## Your UID:
```
lZDRsB0x0Af037qRWHiYqTkRvdT2
```

All your existing data in Firebase will be synced to MongoDB as secure backup.

## How to Sync (Choose One Method):

### METHOD 1: Browser Console (Recommended - Fastest)

1. **Go to the chat app** in your browser
2. **Press `F12`** to open Developer Tools  
3. **Click "Console"** tab
4. **Paste and run this command:**

```javascript
syncFirebaseToMongoDB('lZDRsB0x0Af037qRWHiYqTkRvdT2').then(result => {
  console.log('✅ SYNC RESULT:', result);
  alert(result.message);
});
```

5. **Wait for the sync to complete** - you'll see:
   ```
   ✅ SYNC COMPLETE! Synced X records to MongoDB
   ```

### METHOD 2: Using Terminal

```bash
# Start Flask backend (if not running)
cd "c:\ai bot base"
python gesture_api_server_simple.py

# In another terminal, run:
curl -X POST http://localhost:5000/api/sync-user-data \
  -H "Content-Type: application/json" \
  -d '{"userId": "lZDRsB0x0Af037qRWHiYqTkRvdT2"}'
```

### METHOD 3: Automated Script

```bash
cd "c:\ai bot base"
python sync_user_data.py
```

(Note: This requires Firebase service account key)

---

## What Gets Synced?

✅ **All chat messages** 
- Every message you sent and received
- Attachments and images
- Timestamps and metadata

✅ **User profile**
- Name, email, photo
- Settings and preferences
- Account information

✅ **Emergency contacts** 
- SOS contact list
- Phone numbers and emails
- Contact information

---

## After Sync:

### Check Sync Status
```javascript
// In browser console:
fetch('http://localhost:5000/api/sync-status')
  .then(r => r.json())
  .then(data => console.log('Sync Status:', data));
```

### Verify in MongoDB
Visit https://cloud.mongodb.com
- Your backup data is in: **database:** `accessai_db`
- Collections: `messages`, `users`, `emergency_contacts`

---

## Troubleshooting

**"MongoDB not available"**
- Flask backend not running on port 5000
- Restart backend: `python gesture_api_server_simple.py`

**"Sync shows 0 records"**
- Use the same login account for sync
- Check browser console for errors (F12)
- Verify you're authenticated in the app

**"Firebase error"**
- Make sure app is connected to internet
- Check Internet connection
- Try reloading the page

---

## Summary

- **Status:** Dual-storage system ready ✅
- **Primary:** Firebase (your main database)
- **Backup:** MongoDB (redundant storage)
- **Your Data:** Fully protected and backed up 🔒

Run the sync command now to restore all existing data to MongoDB!
