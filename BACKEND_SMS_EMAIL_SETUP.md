# 🚨 Emergency Alert System - Backend Setup Guide

## Problem
Messages show "sent" but you're not receiving them. This is because the backend SMS/Email services aren't configured yet.

---

## Solution Overview

The emergency system has **3 parts**:

1. **Frontend (React)** ✅ - Already working (storing contacts, showing UI)
2. **Firebase** ✅ - Already working (storing contacts, logging events)
3. **Backend SMS/Email** ❌ - **NOT configured yet** (this is what's missing!)

---

## Step 1: Install Backend Dependencies

```bash
npm install express cors twilio dotenv nodemailer
```

---

## Step 2: Set Up Twilio (for SMS)

### Get Twilio Account:
1. Go to https://www.twilio.com/
2. Click "Try for free"
3. Sign up and verify your email
4. Verify your personal phone number
5. You'll get **$15 free trial credits**

### Get Your Credentials:
1. Go to https://www.twilio.com/console
2. Copy **Account SID** and **Auth Token**
3. Go to "Phone Numbers" → "Manage" → "Active Numbers"
4. Buy a trial phone number (free in trial) - Example: +1234567890

### Test Phone Number (Optional):
- For testing, add your phone to "Verified Caller IDs"
- https://www.twilio.com/console/phone-numbers/verified

---

## Step 3: Set Up Email (Gmail Example)

### Use Gmail with App Password:

1. Go to **myaccount.google.com**
2. Click **Security** in left menu
3. Enable **2-Step Verification** (if not already)
4. Search for **"App passwords"**
5. Select **Mail** → **Windows Computer**
6. Google generates a **16-character password**
7. Copy this password

**Example:**
- EMAIL_USER: `your-email@gmail.com`
- EMAIL_PASSWORD: `xxxx xxxx xxxx xxxx` (the 16 chars from step 6)

---

## Step 4: Create .env File

Create file: `c:\ai bot base\.env`

```env
# TWILIO SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_PHONE=+1234567890

# EMAIL (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx

# Server
PORT=3001
```

⚠️ **IMPORTANT**: Never share your `.env` file! Add to `.gitignore`:
```
.env
.env.local
```

---

## Step 5: Start the Backend Server

Run in a **NEW terminal**:

```bash
node server.js
```

You should see:
```
✅ SMS configured
✅ Email configured
Running on http://localhost:3001
```

---

## Step 6: Test It

1. Open your React app
2. Click SOS button
3. Add a test contact with **your real phone number and email**
4. Click **SEND EMERGENCY ALERT**
5. Check your phone and email within 5-10 seconds

---

## Troubleshooting

### "Email/SMS not configured"
- Check your `.env` file exists in project root
- Restart server after creating `.env`
- Run: `node server.js` (in new terminal)

### "Failed to send SMS"
- Verify phone number in `.env` (must start with +)
- Check Twilio account has credits
- Check recipient phone number format: `+1234567890`

### "Failed to send Email"
- Verify Gmail App Password (not regular password)
- Check 2-Step Verification is enabled
- Allow "Less secure apps" if using regular password

### "Email/SMS sent but not received"
- Check spam folder
- Verify correct phone/email in contacts
- Check Twilio sent status: https://www.twilio.com/console/sms/logs

---

## Architecture

```
React App (Frontend)
    ↓
Contacts stored in Firebase
    ↓
Click "SEND ALERT"
    ↓
Calls /api/send-emergency-sms (Backend)
    ↓
Twilio → Your Contacts
    ↓
Calls /api/send-emergency-email (Backend)
    ↓
Gmail/SendGrid → Your Contacts
```

---

## Firebase vs Backend - What's the Difference?

| Component | Purpose | Status |
|-----------|---------|--------|
| **Firebase** | Store contacts, log events | ✅ Configured |
| **Backend Server** | Send SMS/Email | ❌ Needs setup |
| **Twilio** | SMS service provider | ⏳ Need account |
| **Email** | Email service provider | ⏳ Need Gmail/SendGrid |

---

## Alternative Email Services

Instead of Gmail, you can use:

**SendGrid:**
```env
EMAIL_SERVICE=SendGrid
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxx
```

**Mailgun, AWS SES, etc.** - All supported by Nodemailer

---

## Next Steps

After setup works:
1. ✅ Contacts can send emergency SMS
2. ✅ Contacts can send emergency Email
3. ✅ Firebase logs all events
4. ✅ Local storage backs up contacts

**All done!** 🎉

