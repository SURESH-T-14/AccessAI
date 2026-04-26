# ESP32 Emergency Buzzer - Quick Start

## What You Have
✅ **Buzzer only** - No LED needed  
✅ **2-minute automatic duration** - Buzzer turns off by itself  
✅ **Integrated with Emergency Button** - Click SOS → Buzzer sounds

## Hardware Setup (Simple!)
```
ESP32 Pin 5  ——→ Buzzer (+)
ESP32 GND    ——→ Buzzer (-)
```

That's it! Just two wires.

## Software Setup Steps

### 1. Configure Arduino IDE
- Add ESP32 board: https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
- Select board: **ESP32 Dev Module**
- Select port: Your COM port
- Speed: **115200**

### 2. Upload Code
1. Open `esp32_emergency_alert.ino` in Arduino IDE
2. Edit WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_NAME";
   const char* password = "YOUR_PASSWORD";
   ```
3. Click **Upload** (Ctrl+U)
4. Open Serial Monitor → Press RESET on ESP32
5. **Note the IP address** displayed (e.g., 192.168.1.42)

### 3. Update Backend
Edit `.env` file:
```
ESP32_IP=http://192.168.1.42
ESP32_PORT=80
```

Then restart backend:
```bash
npm run server
```

### 4. Done! 
Your system is ready:
- Frontend running on http://localhost:5173
- Backend running on http://localhost:3001
- Python gesture API on http://localhost:5000
- ESP32 ready at http://192.168.1.42

## How It Works

### When Emergency Button is Clicked:
```
User clicks "🚨 SEND EMERGENCY ALERT"
         ↓
SMS/Email sent to all emergency contacts
         ↓
ESP32 buzzer starts immediately
         ↓
Buzzer runs for exactly 2 minutes (120 seconds)
         ↓
Buzzer stops automatically (no action needed)
```

### Buzzer Details:
- **Pin**: GPIO 5
- **Voltage**: 5V (compatible with ESP32)
- **Duration**: 120,000 ms (2 minutes) - Fixed
- **Auto-off**: Yes, after 2 minutes
- **Continuous**: Buzzer sounds continuously for the 2 minutes

## Testing

### Test 1: Direct ESP32
Open in browser:
```
http://192.168.1.42/alert          (triggers 2-min buzz)
http://192.168.1.42/status         (check status)
http://192.168.1.42/stop           (manual stop)
http://192.168.1.42/trigger?duration=5000  (5 seconds)
```

### Test 2: Via Backend
```bash
curl -X POST http://localhost:3001/api/trigger-esp32-alert \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"main","duration":120000}'
```

### Test 3: Via Web App
1. Go to http://localhost:5173
2. Open SOS panel (bottom right)
3. Add an emergency contact
4. Click "🚨 SEND EMERGENCY ALERT"
5. 🔔 **Buzzer should sound for 2 minutes!**

## Troubleshooting

### Buzzer Won't Sound
- Check if wired to Pin 5 correctly (+ to pin 5, - to GND)
- Verify ESP32 is powered on
- Check Serial Monitor for errors
- Test buzzer with 5V battery directly
- Try `/stop` endpoint then `/alert` again

### Can't Reach ESP32
- Ping it: `ping 192.168.1.42`
- Check IP address in Serial Monitor
- Ensure same WiFi network as backend
- Check Windows Firewall isn't blocking it

### Buzzer Doesn't Stop After 2 Minutes
- Restart ESP32 (press RESET button)
- Upload sketch again
- Use `/stop` endpoint manually to stop

## API Endpoints

### POST /api/trigger-esp32-alert
Triggers the buzzer
```json
{
  "deviceId": "main",
  "duration": 120000
}
```

### GET /api/esp32-status/main
Check if device is online
```json
{
  "success": true,
  "deviceStatus": {
    "status": "online",
    "buzzer_active": true
  }
}
```

### GET http://192.168.1.42/stop
Emergency stop (direct)

## Important Notes
⚠️ **Buzzer Duration**: Currently hardcoded to 2 minutes for emergency contact alerts  
⚠️ **Safety**: Buzzer automatically stops - won't drain battery or annoy indefinitely  
⚠️ **WiFi**: Must be on same network as your backend server  
⚠️ **IP Address**: Changes each time ESP32 restarts (check Serial Monitor)  

## Next Steps
1. ✅ Hardware wired (Pin 5 + GND)
2. ✅ Arduino sketch uploaded
3. ✅ Backend configured with ESP32_IP
4. ✅ Restart backend
5. ✅ Test SOS emergency button
6. ✅ Listen for buzzer! 🔔

## Support
- Check [ESP32_SETUP_GUIDE.md](ESP32_SETUP_GUIDE.md) for detailed setup
- See troubleshooting section above
- Review Serial Monitor output from ESP32
- Check if buzzer itself works (test with 5V battery)
