# 🚨 SOS System - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Add Your Emergency Contacts
1. Click **Settings** (⚙️) button
2. Click **"🚨 Manage Emergency Contacts"**
3. Add at least one contact:
   - **Name**: e.g., "Mom"
   - **Phone**: Full number with country code, e.g., "+1-555-1234567"
   - **Relationship**: Family/Friend/Emergency Service
4. Click **"+ Add Contact"**

### 2. Test SOS Button
1. Click the **red SOS button** (bottom-left corner)
2. Camera should activate automatically
3. See **"🔴 LIVE"** indicator
4. Show `public/danger.jpg` to your camera
5. **Danger alert** should appear!
6. Wait 5 seconds or click to deactivate

---

## 🎯 Features Overview

| Feature | Status | Details |
|---------|--------|---------|
| **Emergency Contacts** | ✅ Ready | Add/Edit/Delete in Settings |
| **SOS Button** | ✅ Ready | Red pulsing button, auto-activates camera |
| **Image Detection** | ✅ Ready | Detects danger.jpg with histogram matching |
| **Event Logging** | ✅ Ready | Logs to Firestore for audit trail |
| **SMS Alerts** | ⏳ Setup | Need backend API (see integration guide) |
| **Email Alerts** | ⏳ Setup | Need backend API (see integration guide) |

---

## 📱 How It Works

```
1. Click SOS Button
   ↓
2. Camera Activates
   ↓
3. Show Danger Image
   ↓
4. Image Detected (>60% match)
   ↓
5. Emergency Alerts Sent
   ↓
6. 5-Second Countdown
   ↓
7. Auto-Deactivate
```

---

## 🔧 Backend Integration (Optional but Recommended)

### For SMS Alerts
You need to add an API endpoint that sends SMS. Here's a quick example:

**Using Twilio (Recommended)**:
```bash
npm install twilio
```

**Flask Endpoint**:
```python
from twilio.rest import Client
import os

@app.route('/api/send-emergency-sms', methods=['POST'])
def send_sms():
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    client = Client(account_sid, auth_token)
    
    data = request.json
    message = client.messages.create(
        body=data['message'],
        from_=os.getenv('TWILIO_PHONE_NUMBER'),
        to=data['phone']
    )
    return {'status': 'sent'}
```

### For Email Alerts
Similar approach using SendGrid or Mailgun.

---

## ✅ Verification Checklist

- [ ] SOS button visible in bottom-left
- [ ] Settings accessible (⚙️ top-right)
- [ ] Can add emergency contacts
- [ ] Can delete emergency contacts
- [ ] SOS button activates camera
- [ ] Shows "🔴 LIVE" status
- [ ] Danger image detected triggers alert
- [ ] 5-second countdown appears
- [ ] Firestore stores events
- [ ] No JavaScript errors in console

---

## 🐛 Troubleshooting

### "Camera not working"
- Check browser permissions: Allow camera access
- Ensure device has a camera
- Try reloading the page
- Check console for errors

### "Can't add emergency contacts"
- Ensure you're logged in
- Check Firebase database is connected
- Verify Firestore rules allow write access
- Check browser console for errors

### "Danger image not detected"
- Make sure `public/danger.jpg` exists
- Try showing different angles/distances
- Check console for histogram values
- May need to train a custom model for better accuracy

### "Emails/SMS not sending"
- Backend API not implemented yet
- Check API endpoint is responding
- Verify Twilio/SendGrid credentials
- Review backend logs for errors

---

## 📞 Emergency Contact Info

**Format**: Phone numbers should include country code
- US: +1-555-1234567
- India: +91-8888-888888
- UK: +44-2000-000000

**Relationship Types**:
- Family
- Friend  
- Emergency Service (Police, Fire, Ambulance)
- Other

---

## 🚀 Next Steps

1. **Immediate**: Add your emergency contacts now
2. **This Week**: Test SOS button with your contacts
3. **Soon**: Integrate SMS backend if you want actual alerts
4. **Future**: Consider geolocation sharing, automatic triggers

---

## 📖 Full Documentation

See `SOS_SYSTEM_COMPLETE.md` for:
- Detailed technical architecture
- Integration guides
- Security considerations
- Future enhancements

---

**Questions?** Check the browser console (F12) for detailed error messages.

**Happy Secure Communications!** 🎉
