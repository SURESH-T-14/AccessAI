# Firebase Authentication Setup Guide

## Error: "auth/operation-not-allowed"

This error occurs when the authentication method is disabled in Firebase Console.

---

## Step-by-Step Setup Instructions

### 1. Enable Google Sign-In

**In Firebase Console:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** (left sidebar)
4. Click **Sign-in method** tab
5. Click **Google** provider
6. Toggle **Enable** to ON
7. Select or create a project in Google Cloud Console
8. Click **Save**

**Expected Result:** Google provider shows as "Enabled" (green checkmark)

---

### 2. Enable Email/Password Authentication

**In Firebase Console:**

1. Go to **Authentication** → **Sign-in method**
2. Click **Email/Password** provider
3. Toggle **Enable** to ON
4. Optionally enable "Email link (passwordless sign-in)"
5. Click **Save**

**Expected Result:** Email/Password shows as "Enabled"

---

### 3. Enable Phone Authentication

**In Firebase Console:**

1. Go to **Authentication** → **Sign-in method**
2. Click **Phone** provider
3. Toggle **Enable** to ON
4. Choose SMS provider (default: Firebase)
5. Add test phone numbers (optional, for testing)
6. Click **Save**

**Expected Result:** Phone provider shows as "Enabled"

---

## OAuth Configuration for Google Sign-In

### Configure Authorized Domains

1. In Firebase Console → **Authentication** → **Settings** tab
2. Scroll to **Authorized domains**
3. Add your domains:
   ```
   localhost
   127.0.0.1
   yourdomain.com
   www.yourdomain.com
   ```
4. Click **Save**

### Configure Web Client ID

1. Go to **Project Settings** (gear icon, top-right)
2. Click **Service Accounts** tab
3. Scroll down and click **Generate New Private Key**
4. Save the JSON file (keep it secure)

---

## Environment Variables Setup

### Create `.env.local` file

Create file: `c:\ai bot base\.env.local`

Add your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### Where to Find These Values

1. Go to Firebase Console
2. Click **Project Settings** (gear icon)
3. Click **General** tab
4. Scroll to **Your apps** section
5. Find your web app
6. Copy all credentials
7. Paste into `.env.local`

---

## Firebase Security Rules Setup

### Update Firestore Security Rules

**Current Rules (at `firestore.rules`):**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to access their own data
    match /artifacts/{appId}/users/{uid}/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

### Apply Rules

1. Firebase Console → **Firestore Database**
2. Click **Rules** tab
3. Replace with the rules above
4. Click **Publish**

---

## Testing Authentication Methods

### Test Google Sign-In

1. Open http://localhost:5174
2. Click "🔵 Continue with Google"
3. Popup should appear
4. Select Google account
5. Should redirect to main app

**If popup blocked:**
- Check browser popup blocker
- Add localhost:5174 to whitelist

### Test Email/Password

1. Click "✉️ Continue with Email"
2. Toggle to **Sign Up**
3. Enter:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
4. Click **Sign Up**
5. Should redirect to main app

**Login with same credentials:**
1. Click "✉️ Continue with Email"
2. Keep **Sign In** selected
3. Enter email and password
4. Click **Sign In**

### Test Phone Authentication

1. Click "📱 Continue with Phone"
2. Enter: +1 (555) 123-4567 (or your phone)
3. Click **Send Verification Code**
4. Receive SMS with 6-digit code
5. Enter code
6. Click **Verify**
7. Should redirect to main app

**Test with Firebase Test Numbers:**
1. Firebase Console → **Authentication** → **Phone** provider
2. Add test phone number
3. Use that number during testing (no SMS sent)

---

## Verification Checklist

- [ ] Google Sign-In enabled in Firebase Console
- [ ] Email/Password enabled in Firebase Console
- [ ] Phone enabled in Firebase Console
- [ ] `.env.local` file created with all credentials
- [ ] All credential values copied correctly (no extra spaces)
- [ ] Authorized domains include localhost and 127.0.0.1
- [ ] Firestore security rules updated
- [ ] React app reloaded after `.env.local` changes

---

## Troubleshooting

### Error: "auth/operation-not-allowed"

**Solution:**
```
1. Firebase Console → Authentication → Sign-in method
2. Ensure Google is toggled ON (green)
3. Reload browser (F5)
4. Try login again
```

### Error: "auth/invalid-api-key"

**Solution:**
```
1. Check .env.local has correct API_KEY
2. Verify API_KEY matches Firebase Console
3. Reload browser after fixing .env.local
4. Try again
```

### Error: "auth/configuration-not-found"

**Solution:**
```
1. Verify all Firebase config values in .env.local
2. Check no typos in environment variable names
3. Ensure .env.local is in root of project
4. Restart dev server: npm run dev
```

### Google Popup Not Opening

**Solution:**
```
1. Check browser popup blocker (top-right warning)
2. Add localhost:5174 to whitelist
3. Allow popups for this site
4. Disable extensions that block popups
5. Try in incognito mode
```

### Phone SMS Not Received

**Solution:**
```
1. Wait 10-15 seconds (SMS can be delayed)
2. Check spam/junk folder
3. Try with test phone number in Firebase Console
4. Verify Firebase Phone provider enabled
5. Check carrier SMS filtering settings
```

### No Email Received for Password Reset

**Solution:**
```
1. Verify email/password authentication enabled
2. Check spam folder
3. Update email in Firebase Console settings
4. Try again after 5 minutes
```

---

## Common Configuration Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "operation-not-allowed" | Provider not enabled | Enable in Firebase Console → Sign-in method |
| "invalid-api-key" | Wrong API key | Copy correct key from Firebase Console |
| "auth/popup-blocked" | Popup blocker active | Allow popups for localhost:5174 |
| "auth/cancelled-popup-request" | Popup closed | Try login again, don't close popup |
| "auth/network-request-failed" | Network issue | Check internet connection, try again |
| "auth/internal-error" | Server error | Check Firebase Cloud Functions logs |

---

## After Successful Login

### User Data Structure in Firestore

```
artifacts/
  {appId}/
    users/
      {uid}/
        chats/
          1/
            messages/
              doc1: { text, sender, timestamp }
              doc2: { text, sender, timestamp }
          2/
            messages/
              ...
```

### localStorage Persistence

```
accessai_chats: [
  { id: 1, name: "Chat 1", messages: [...] },
  { id: 2, name: "Chat 2", messages: [...] }
]
accessai_currentChatId: 1
accessai_nextChatId: 3
accessai_user: { uid, email, displayName }
```

---

## Next Steps

1. **Enable authentication methods** in Firebase Console
2. **Create `.env.local`** with your credentials
3. **Reload the app** (npm run dev)
4. **Test each login method**
5. **Check browser console** for any errors (F12)

---

## Support Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Google OAuth Setup](https://firebase.google.com/docs/auth/web/google-signin)
- [Phone Authentication](https://firebase.google.com/docs/auth/web/phone-auth)

---

**Status**: Follow this guide to resolve "auth/operation-not-allowed" error ✅
