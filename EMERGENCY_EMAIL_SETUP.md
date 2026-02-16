# Emergency Email Alerts Setup Guide

## Problem: Email Alerts Not Sending

If your emergency alerts aren't sending emails, follow these steps to fix it.

---

## Step 1: Check Flask Backend is Running

First, verify the Flask backend is running on port 5000:

```bash
# In your terminal, check if this shows "✅ Server running":
python -c "import requests; r = requests.get('http://localhost:5000/api/status', timeout=2); print('✅ Server running') if r.status_code else print('❌ Not running')"
```

If not running, start it:
```bash
cd "c:\ai bot base"
python gesture_api_server_simple.py
```

---

## Step 2: Setup Gmail for Email Sending

The email system uses Gmail SMTP. You need to create an **App Password** (NOT your regular password).

### Option A: Gmail with App Password (RECOMMENDED)

**Follow these exact steps:**

1. **Go to myaccount.google.com/security** (open in browser)

2. **Enable 2-Factor Authentication** (if not already enabled):
   - Click "Security" on left
   - Find "2-Step Verification"
   - Click "Enable"
   - Follow prompts

3. **Generate App Password:**
   - Go back to security.google.com
   - Click "App passwords" (near bottom, under "How you sign in")
   - Select "Mail" and "Windows Computer"
   - Google generates a 16-character password
   - **Copy the password** (you'll need it below)

4. **Add to .env.local:**
   ```
   SENDER_EMAIL=your-gmail-address@gmail.com
   SENDER_PASSWORD=your-16-character-app-password
   ```
   
   Example:
   ```
   SENDER_EMAIL=john.doe@gmail.com
   SENDER_PASSWORD=abcd efgh ijkl mnop
   ```

5. **Restart Flask:**
   ```bash
   # Stop the running server (Ctrl+C)
   # Then restart:
   python gesture_api_server_simple.py
   ```

---

## Step 3: Test Email Sending

### Test Method 1: Using Browser Console

1. Open the chat app
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Paste this test:

```javascript
fetch('http://localhost:5000/api/send-emergency-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@gmail.com',  // CHANGE THIS TO A REAL EMAIL
    subject: '🚨 Test Emergency Alert',
    message: 'This is a test message from AccessAI',
    userId: 'test-user',
    contactName: 'Test Contact'
  })
})
.then(r => r.json())
.then(data => console.log('Result:', data));
```

5. **Check the result** in console:
   - ✅ `"success": true` → Email sent!
   - ❌ `"success": false` → See error message

---

### Test Method 2: Using PowerShell Terminal

```powershell
cd "c:\ai bot base"
python -c "
import requests
import json

result = requests.post('http://localhost:5000/api/send-emergency-email', json={
    'email': 'test@gmail.com',  # Change this to a real email
    'subject': 'Test Emergency Alert',
    'message': 'This is a test message',
    'userId': 'test-user',
    'contactName': 'Test'
})

print('Status:', result.status_code)
print('Response:', result.json())
"
```

---

## Step 4: Test in SOS System

1. Open the chat app
2. Add an emergency contact:
   - Click the **SOS button** (red button)
   - Click **"Add Emergency Contact"**
   - Enter Name, Email, and Phone
   - Click **Save**

3. Test sending alert:
   - Click **SOS button** again
   - Click **"SEND EMERGENCY ALERT"**
   - Watch the console (F12) for messages

---

## Troubleshooting

### Error: "Email service not configured"

**Cause:** SMTP credentials missing from .env.local

**Fix:**
1. Open `.env.local` file
2. Add these lines:
   ```
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SENDER_EMAIL=your-gmail@gmail.com
   SENDER_PASSWORD=your-app-password
   ```
3. Restart Flask server

### Error: "SMTP Authentication failed"

**Cause:** Wrong email or password

**Fix:**
1. **If using Gmail:**
   - Don't use regular password, use App Password
   - Follow "Step 2: Setup Gmail" above
   - Make sure you copied the 16-character password correctly

2. **If using different email provider:**
   - Check if credentials are correct
   - Some providers don't allow password login (use app-specific password)

### Error: "SMTP timeout"

**Cause:** Network issue or wrong SMTP server

**Fix:**
1. Check internet connection
2. Use correct SMTP server:
   - Gmail: `smtp.gmail.com`
   - Outlook: `smtp.outlook.com`
   - Yahoo: `smtp.mail.yahoo.com`

### Error: "Connection refused" to localhost:5000

**Cause:** Flask backend not running

**Fix:**
1. Start Flask in new terminal:
   ```bash
   cd "c:\ai bot base"
   python gesture_api_server_simple.py
   ```
2. Wait for message: `"Starting Flask server on http://localhost:5000"`

---

## How to Monitor Email Sending

### Check Flask Console Output

When you send an emergency alert, look at the Flask terminal for:

```
[Email] Attempting to send to John Doe (john@gmail.com)
[Email] SMTP Config:
  Server: smtp.gmail.com
  Port: 587
  From: sender@gmail.com
  Password set: True
[Email] Connected to SMTP server
[Email] TLS enabled
[Email] Authenticated as sender@gmail.com
[✓] Email sent successfully to John Doe (john@gmail.com)
```

**If you see `[!]` errors instead of `[✓]`, read the error message carefully.**

---

## Quick Checklist

- [ ] Flask server running on port 5000
- [ ] Gmail 2-Factor Authentication enabled
- [ ] App Password generated from myaccount.google.com/security
- [ ] .env.local has:
  - `SMTP_SERVER=smtp.gmail.com`
  - `SMTP_PORT=587`
  - `SENDER_EMAIL=your-gmail@gmail.com`
  - `SENDER_PASSWORD=app-password-here`
- [ ] Flask server restarted after .env.local changes
- [ ] Emergency contact has valid email address

---

## Next Steps

Once emails are working:

1. **Add real emergency contacts** in SOS panel
2. **Test with real contacts** (send them test alerts)
3. **Configure SMS** (optional - similar process)

For SMS setup, see `PHONE_AUTH_FIX_NOW.md`

---

## Support

**If still having issues:**
1. Check Flask console for detailed error messages
2. Try the test commands above
3. Verify .env.local file has correct credentials
4. Restart Flask server
5. Check firewall isn't blocking port 5000

---

**Status:** Email system ready to configure 📧
**Next:** Add emergency contacts and test sending
