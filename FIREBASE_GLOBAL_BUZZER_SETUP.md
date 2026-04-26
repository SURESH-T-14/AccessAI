# Firebase Global ESP32 Buzzer Setup Guide

## 🌍 Overview
This guide enables your ESP32 emergency buzzer to work **from anywhere in the world** via Firebase Realtime Database.

Your buzzer will now have **2 methods**:
1. **Firebase** (Global) ✅ - Works from anywhere on internet
2. **Local HTTP** (Fallback) - Works on home WiFi as backup

---

## 📋 Prerequisites
- ✅ Firebase project already set up: `accessai-db-e75f8`
- ✅ ESP32 microcontroller
- ✅ Arduino IDE installed
- ✅ Node.js backend running

---

## 🚀 Step 1: Install Firebase Admin SDK

Run this in your project directory:

```bash
npm install firebase-admin
```

---

## 🔐 Step 2: Get Firebase Service Account Key

This is the **most critical step**:

### 2.1 Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `accessai-db-e75f8`
3. Click **Settings** (⚙️ icon, top-left)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key** button

### 2.2 Save the JSON Key
You'll download a file named something like: `accessai-db-e75f8-xxxxxxxxxxxxx.json`

**Save this file to your project root** as: `firebase-admin-sdk.json`

⚠️ **IMPORTANT**: 
- Keep this file **SECRET** - never commit to Git
- Add to `.gitignore`: `firebase-admin-sdk.json`
- This file contains your Firebase credentials

---

## 🔌 Step 3: Update Firebase Rules

Your Realtime Database needs proper security rules for the ESP32:

### 3.1 Set Realtime Database Rules
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Realtime Database**
4. Go to **Rules** tab
5. **Replace everything** with:

```json
{
  "rules": {
    "devices": {
      "esp32": {
        "buzzer": {
          ".read": true,
          ".write": true,
          "trigger": {
            ".validate": "newData.isNumber()"
          },
          "duration": {
            ".validate": "newData.isNumber()"
          }
        },
        "status": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

6. Click **Publish**

---

## 📝 Step 4: Arduino Setup

### 4.1 Install Required Libraries

In Arduino IDE, go to **Sketch** → **Include Library** → **Manage Libraries**

Search for and install:
- **Firebase ESP32 Client** (by Mobizt)
- **ArduinoJson** (by Benoit Blanchon)

### 4.2 Upload New Code

Use the new file: `esp32_firebase_buzzer.ino`

**Updated features:**
- Connects to Firebase Realtime Database
- Listens for `/devices/esp32/buzzer/trigger` commands
- Auto-stops buzzer after duration
- Still has local HTTP endpoints as fallback

### 4.3 Configure WiFi (already done)
The code already has your WiFi credentials:
```cpp
const char* ssid = "Ragunathan_5G";
const char* password = "19930303";
```

### 4.4 Upload to ESP32
1. Select correct board: **Tools** → **Board** → **ESP32** → **ESP32 Dev Module**
2. Select correct port: **Tools** → **Port** → `COM3` (or your port)
3. Click **Upload** (or Ctrl+U)
4. Wait for "Hard resetting via RTS pin..."

### 4.5 Check Serial Monitor
Open **Tools** → **Serial Monitor** (Ctrl+Shift+M)
Set baud rate to **115200**

Expected output:
```
[ESP32] Starting Emergency Buzzer System...
[WiFi] Connected - IP: 192.168.X.X
[Firebase] Token ready!
[READY] ESP32 listening to Firebase for buzzer commands!
```

---

## 🔄 Step 5: Restart Backend

Kill and restart Node backend to load Firebase:

```bash
# Kill existing process
taskkill /F /IM node.exe

# Start backend again
node server.js
```

Expected output:
```
[Firebase] Connected to Realtime Database
[MongoDB] Connected successfully
[SOS] Backend running on port 3001
```

---

## ✅ Step 6: Test Global Buzzer

### Test from Same WiFi:
1. Open http://localhost:5173
2. Add emergency contact
3. Click **"🚨 SEND EMERGENCY ALERT"**
4. ✅ Buzzer should sound!

### Test from Different Network:
1. Turn off your WiFi / use mobile data
2. Click emergency button again
3. ✅ Buzzer should still sound! (via Firebase)

---

## 🐛 Troubleshooting

### ❌ "Firebase connection failed"
- Check `.env` has correct `FIREBASE_DATABASE_URL`
- Verify `firebase-admin-sdk.json` exists in root
- Check Firebase rules are published

### ❌ ESP32 doesn't connect to WiFi
- Check WiFi name is 2.4GHz (not 5GHz)
- Verify password is correct
- Check Serial Monitor for errors

### ❌ Buzzer doesn't sound
- **Local WiFi**: Check if device is `Ragunathan_5G`
- **Firebase**: Check Firebase Realtime Database in console - should show `/devices/esp32/buzzer/trigger: 1`
- Check ESP32 Serial Monitor for "Buzzer activated" message

### ✅ Still doesn't work?
- Check backend logs: `node server.js` output
- Check Firebase Console → Realtime Database → Data section
- Check ESP32 Serial Monitor for connection status

---

## 📊 How It Works

```
User clicks Emergency Button
        ↓
Backend sends command to Firebase
        ↓
ESP32 reads command from Firebase
        ↓
GPIO 5 activates buzzer 🔔
        ↓
Buzzer runs for 2 minutes (120,000ms)
        ↓
Auto-stops or manual stop
```

**Works from:**
- ✅ Home WiFi
- ✅ Mobile hotspot
- ✅ Public WiFi
- ✅ Different country
- ✅ Anywhere with internet

---

## 🔐 Security Notes

1. **firebase-admin-sdk.json** must be kept SECRET
   - Add to `.gitignore`
   - Never share publicly
   - This is your Firebase master key

2. **Realtime Database Rules** control who can access:
   - Currently set to allow read/write (test mode)
   - For production, add authentication

---

## 🎯 Summary

✅ **What just happened:**
1. Connected Node backend to Firebase
2. ESP32 now listens to Firebase for commands
3. Buzzer works from **anywhere** via internet
4. Local WiFi backup still available

✅ **What works now:**
- Emergency button triggers SMS/Email (unchanged)
- Buzzer triggers via Firebase (global)
- Buzzer still works via local HTTP (home WiFi)

✅ **Next steps:**
- Test from different network
- Monitor Firebase Realtime Database console
- Celebrate! 🎉

---

**Questions?** Check Firebase Console → Realtime Database → Data tab to see live trigger commands!
