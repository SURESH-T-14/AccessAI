# Firebase Console: Step-by-Step Screenshots Description

## Screen 1: Firebase Console Home
```
URL: https://console.firebase.google.com/

[Firebase Logo]  [Google Logo]

My Projects:
┌────────────────────────────────────────────┐
│ Project: bot-ai-54cc6                      │
│ Region: us-central1                        │
│                                            │
│ [Click here to enter project]   ➜          │
└────────────────────────────────────────────┘
```

**Action**: Click "bot-ai-54cc6" to enter the project

---

## Screen 2: Firebase Project Dashboard
```
URL: https://console.firebase.google.com/project/bot-ai-54cc6/overview

Left Sidebar:
┌──────────────────────────┐
│ Build                    │
│ ├─ Realtime Database     │
│ ├─ Firestore Database    │
│ ├─ Storage               │
│ ├─ Authentication    ◄── CLICK THIS
│ ├─ Functions             │
│ └─ Hosting               │
│                          │
│ Analytics                │
│ Release & Monitor        │
└──────────────────────────┘

Main Content Area:
[Your project overview]
```

**Action**: Click "Authentication" in the left sidebar

---

## Screen 3: Authentication Overview
```
URL: https://console.firebase.google.com/project/bot-ai-54cc6/authentication/overview

Tabs:
┌─────────────────────────────────────────────────┐
│ [Providers]  [Sign-in method] ◄── CLICK THIS  │
│ [Settings]   [Templates]                       │
└─────────────────────────────────────────────────┘

Content Area:
[Shows list of authentication providers]
```

**Action**: Click "Sign-in method" tab

---

## Screen 4: Sign-in Method Providers
```
URL: https://console.firebase.google.com/project/bot-ai-54cc6/authentication/providers

Top section:
┌──────────────────────────────────────────────────────┐
│ Enable new provider                                  │
│ [+ Add new provider]                                 │
└──────────────────────────────────────────────────────┘

Provider List:
┌──────────────────────────────────────────────────────┐
│                                                      │
│ Email/Password          [Status: ✅ Enabled]        │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Google                  [Status: ❌ Disabled]       │
│ ← CLICK ON THIS ROW                                  │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Phone                   [Status: ✅ Enabled]        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Action**: Click on the "Google" row to open settings

---

## Screen 5: Google Sign-In Configuration
```
URL: (opens dialog on same page)

Dialog Box:
┌─────────────────────────────────────────────────────┐
│ Google Authentication Settings              [×]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Enable Google Sign-In                               │
│                                                     │
│ [Toggle Switch]  OFF  ← TURN THIS ON             │
│ ▯────────                                           │
│                                                     │
│ This will allow users to sign in with their        │
│ Google accounts.                                    │
│                                                     │
│ Support email:                                     │
│ [Your email address shown here]                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                          [Cancel]  [Save]  ◄ CLICK  │
└─────────────────────────────────────────────────────┘
```

**Action 1**: Click the toggle switch to turn ON (it will become BLUE)
**Action 2**: Click "Save" button

---

## Screen 6: Confirmation
```
After clicking Save:

Provider List (Updated):
┌──────────────────────────────────────────────────────┐
│                                                      │
│ Email/Password          [Status: ✅ Enabled]        │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Google                  [Status: ✅ Enabled]  ← NOW!
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Phone                   [Status: ✅ Enabled]        │
│                                                      │
└──────────────────────────────────────────────────────┘

Message (at top): "Google Sign-In enabled successfully"
```

**Success**: Google now shows ✅ Enabled!

---

## Screen 7: Return to Your App
```
Your local app should now work:

URL: http://localhost:5174

Login Screen:
┌─────────────────────────────────────────────────────┐
│                                                     │
│             [AccessAI Logo - 80x80px]              │
│                                                     │
│                   AccessAI                          │
│              Sign in to continue                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [🔵 Continue with Google]          ← NOW WORKS!   │
│                                                     │
│ [✉️  Continue with Email]                          │
│                                                     │
│ [📱 Continue with Phone]                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Test**: Click "🔵 Continue with Google"
- Popup should open
- Google account selection appears
- Click your account
- Redirected to main chat app
- See user info in top-right menu (👤)

---

## Optional: Configure Authorized Domains

If you get redirect error:

### Screen A: Authentication Settings
```
URL: https://console.firebase.google.com/project/bot-ai-54cc6/authentication/settings

Scroll down to:
┌─────────────────────────────────────────────────────┐
│ Authorized domains                                  │
├─────────────────────────────────────────────────────┤
│ Domain List:                                        │
│ ✅ localhost                                         │
│ ✅ 127.0.0.1                                         │
│ ✅ yourdomain.com (for production)                   │
│                                                     │
│ [Add domain]                                        │
└─────────────────────────────────────────────────────┘
```

**Note**: These should be automatically added. If not:
1. Click "[Add domain]"
2. Enter: localhost
3. Click "Add"
4. Repeat for 127.0.0.1

---

## Quick Reference: Toggle Switch Animation

When clicking the Google provider toggle:

```
BEFORE (Off):
▯─────────
    ❌ Disabled

CLICK THE SWITCH...

AFTER (On):
───────●
    ✅ Enabled
```

The switch becomes BLUE when enabled.

---

## Verification Checklist

After all steps:

```
☑️ Opened Firebase Console
☑️ Selected "bot-ai-54cc6" project
☑️ Clicked "Authentication"
☑️ Clicked "Sign-in method" tab
☑️ Found "Google" in provider list
☑️ Clicked Google row
☑️ Toggled "Enable" switch to ON (blue)
☑️ Clicked "Save" button
☑️ Saw success message
☑️ Google shows ✅ Enabled in list
☑️ Reloaded app at http://localhost:5174
☑️ Google button no longer shows error
☑️ Clicked Google button - popup opens
☑️ Successfully logged in ✅
```

---

## Alternative: Firebase CLI Method

If you prefer command line (advanced):

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Enable Google provider
firebase auth:import --hash-algo=scrypt

# Or use direct API call:
curl -X POST https://identitytoolkit.googleapis.com/v1/projects/bot-ai-54cc6/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signIn": {
      "google": { "enabled": true }
    }
  }'
```

---

## Summary

**Total Steps**: 6-7 clicks
**Time Required**: 2 minutes
**Result**: Google login fully functional ✅

**Key Points**:
1. Open Firebase Console
2. Select your project (bot-ai-54cc6)
3. Go to Authentication → Sign-in method
4. Find Google provider
5. Click Google row
6. Toggle Enable ON
7. Click Save
8. Test the app

---

**Status**: Ready to Enable Google Sign-In
**Your Project**: bot-ai-54cc6
**Last Updated**: January 2026
