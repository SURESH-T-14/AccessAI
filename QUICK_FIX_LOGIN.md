# Quick Fix: auth/operation-not-allowed Error

## 🔴 Problem
Google login shows: "Firebase: Error (auth/operation-not-allowed)"

## ✅ Solution (2 minutes)

### Step 1: Enable Google Sign-In in Firebase Console
```
1. Go to: https://console.firebase.google.com/
2. Select your project
3. Left menu → Authentication
4. Click "Sign-in method" tab
5. Find "Google" in the list
6. Click the Google row
7. Toggle the switch to ON (green)
8. Click "Save"
```

### Step 2: Check Environment Variables
```
1. Open: c:\ai bot base\.env.local
2. Verify these exist:
   - VITE_FIREBASE_API_KEY
   - VITE_FIREBASE_AUTH_DOMAIN
   - VITE_FIREBASE_PROJECT_ID
   - VITE_FIREBASE_STORAGE_BUCKET
   - VITE_FIREBASE_MESSAGING_SENDER_ID
   - VITE_FIREBASE_APP_ID

3. Make sure NO blank values
4. No extra spaces after values
```

### Step 3: Reload the App
```
1. Press Ctrl+C in terminal (stop dev server)
2. Run: npm run dev
3. Open browser: http://localhost:5174
4. Try login again
```

---

## Verify Success ✅

After enabling Google Sign-In:
- [ ] Login page loads
- [ ] "Continue with Google" button visible
- [ ] Can click button without error
- [ ] Google popup opens
- [ ] Can select account
- [ ] Redirected to main app

---

## Still Not Working?

### Check 1: Is Google Really Enabled?
```
Firebase Console:
- Authentication → Sign-in method
- Look for "Google" in the provider list
- It should show: ✅ Enabled (green badge)
```

### Check 2: Check Browser Console
```
1. Open browser: F12
2. Click "Console" tab
3. Try login again
4. Look for error messages
5. Share error details
```

### Check 3: Clear Cache
```
1. Press Ctrl+Shift+Delete (in browser)
2. Select "All time"
3. Check "Cookies and site data"
4. Click "Clear data"
5. Reload page and try again
```

---

## If Only Google Fails (Email/Phone Work)

This means:
- Firebase is initialized ✅
- Other authentication methods enabled ✅
- Google specifically not enabled ❌

**Fix:**
1. Firebase Console → Authentication → Sign-in method
2. Find "Google" in the list
3. Click on Google row to open settings
4. Toggle "Enable" switch ON
5. Click "Save"
6. Reload browser and try again

---

## Need More Help?

See full guide: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

Key sections:
- OAuth Configuration for Google Sign-In
- Environment Variables Setup
- Security Rules Setup
- Comprehensive Troubleshooting

---

**Last Updated**: January 2026
**Priority**: HIGH - Blocks login functionality
