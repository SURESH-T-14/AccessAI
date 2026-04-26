# ESP32 Emergency Alert System - Complete Setup Guide

## Overview
This system integrates an ESP32 microcontroller with the AccessAI application to provide physical emergency alerts via buzzer and LED. The ESP32 listens for commands from the backend and triggers audio/visual alerts.

## Hardware Requirements
- **ESP32 Development Board** (e.g., ESP32-DEVKIT-V1)
- **Buzzer Module** (5V, active or passive) - **ONLY buzzer needed**
- **Jumper Wires**
- **USB Cable** (for programming)
- **WiFi Network** (2.4GHz recommended)

## Hardware Wiring

### Pin Configuration
```
ESP32 Pin 5  → Buzzer Positive (+ terminal)
ESP32 GND    → Buzzer Negative (- terminal)
```

### Detailed Wiring Diagram
```
ESP32              Buzzer Module       
Pin 5 --------→ [+] Positive         
               [−] Negative ←-------- GND

GND --------→ Common Ground (Buzzer -)
```

## Software Setup

### Step 1: Install Arduino IDE
1. Download Arduino IDE from: https://www.arduino.cc/en/software
2. Install the IDE following the official guide

### Step 2: Add ESP32 Board Support
1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Boards Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**
5. Go to **Tools → Board → Boards Manager**
6. Search for "ESP32"
7. Install **"esp32" by Espressif Systems**
8. Restart Arduino IDE

### Step 3: Select Board and Port
1. Go to **Tools → Board** and select **"ESP32 Dev Module"**
2. Go to **Tools → Port** and select your ESP32's COM port
3. Go to **Tools → Upload Speed** and select **115200**

### Step 4: Upload the Sketch
1. Open the `esp32_emergency_alert.ino` file in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_NAME";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. ⚠️ **No LED pin configuration needed** - Buzzer only on Pin 5
4. Click **Upload** (Ctrl+U)
5. Once upload completes, open the **Serial Monitor** (Tools → Serial Monitor)
6. Set baud rate to **115200**
7. Press the RESET button on the ESP32

### Step 5: Note the ESP32 IP Address
The Serial Monitor will display output like:
```
Connecting to Wi-Fi...
Connected!
IP Address: 192.168.1.42
ESP32 Emergency Alert Server started!
```

**Save the IP Address** (e.g., 192.168.1.42) - you'll need this for configuration.

## Backend Configuration

### Step 1: Update .env File
Add/update the following in `.env`:
```env
# ESP32 Device Configuration
ESP32_IP=http://192.168.1.42
ESP32_PORT=80
```

Replace `192.168.1.42` with the actual IP address from your ESP32.

### Step 2: Restart Node Backend
```bash
npm run server
```

## Frontend Integration

### Step 1: Import Component
In your `App.jsx` or relevant component:
```jsx
import ESP32DeviceControl from './components/ESP32DeviceControl';
```

### Step 2: Add to UI
```jsx
<div className="your-container">
  <ESP32DeviceControl />
</div>
```

### Step 3: Configure ESP32 IP in Frontend
1. Click the **⚙️ Settings** button in the ESP32 Device Control panel
2. Enter your ESP32 IP address
3. Click **Save Settings**

## API Endpoints

### Trigger Alert
**POST** `/api/trigger-esp32-alert`
```json
{
  "deviceId": "main",
  "duration": 3000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert triggered on Main Emergency Alert Device",
  "device": "main",
  "duration": 3000,
  "timestamp": "2026-04-21T10:30:00.000Z"
}
```

### Get Device Status
**GET** `/api/esp32-status/main`

**Response:**
```json
{
  "success": true,
  "device": "main",
  "deviceName": "Main Emergency Alert Device",
  "deviceStatus": {
    "status": "online",
    "device": "ESP32-Emergency-Alert"
  },
  "timestamp": "2026-04-21T10:30:00.000Z"
}
```

## Troubleshooting

### ESP32 Won't Connect to WiFi
- Check WiFi credentials (SSID and password are case-sensitive)
- Ensure WiFi is 2.4GHz (not 5GHz)
- Verify password doesn't contain special characters; if it does, use a temporary simpler password
- Check WiFi signal strength near the ESP32

### Can't Upload to ESP32
- Install USB drivers from: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
- Check if COM port is correctly selected
- Try using a different USB cable (some are charge-only)
- Hold BOOT button while uploading

### Buzzer/LED Not Working
- Check polarity (+ and - connections)
- Test buzzer with 5V directly
- Ensure pin 5 isn't used by other components
- Check for short circuits
- Verify buzzer is 5V compatible with ESP32
- Try a different buzzer to confirm

### Can't Reach ESP32 from Backend
- Ping the ESP32: `ping 192.168.1.42`
- Check if ESP32 is on the same network as your backend
- Verify firewall isn't blocking traffic
- Check ESP32 IP in Serial Monitor is correct

### Device Shows "Offline" in Frontend
- Verify ESP32 IP is correct in settings
- Make sure backend has updated `.env` with correct ESP32_IP
- Check network connectivity
- Restart both ESP32 and backend

## Testing

### Manual Test via cURL
```bash
# Trigger alert for 2 seconds
curl -X POST http://localhost:3001/api/trigger-esp32-alert \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"main","duration":2000}'

# Check status
curl http://localhost:3001/api/esp32-status/main
```

### Direct ESP32 Test
In a browser, navigate to:
```
http://192.168.1.42/alert
http://192.168.1.42/status
http://192.168.1.42/trigger?duration=1000
```

## Integration with SOS System

The ESP32 device triggers **automatically when you click the Emergency Alert button**:
1. **Emergency SOS Button** - Sends SMS/Email alerts to contacts AND sounds buzzer for 2 minutes
2. The buzzer starts immediately when emergency is triggered
3. The buzzer **automatically stops after 2 minutes** (120,000 ms)
4. No manual shutdown needed - fully automatic

### Example Usage
```jsx
// When user clicks \"🚨 SEND EMERGENCY ALERT\" button:
// 1. SMS/Email sent to all contacts
// 2. ESP32 buzzer triggered for 2 minutes
// 3. Buzzer stops automatically after 120 seconds
```

## Advanced Configuration

### Multiple Devices
To support multiple ESP32 devices, update `server.js`:
```javascript
const ESP32_DEVICES = {
  main: { ip: 'http://192.168.1.42', port: 80, name: 'Main Buzzer' },
  backup: { ip: 'http://192.168.1.43', port: 80, name: 'Backup Buzzer' }
};
```

### Custom Alert Duration
To change the default 2-minute buzzer duration for emergency contacts, modify `src/components/SOS.jsx`:
```jsx
// Change this value (in milliseconds):
duration: 120000  // Current: 2 minutes
duration: 180000  // For 3 minutes
duration: 300000  // For 5 minutes
```

### Manual Stop Endpoint
You can manually stop the buzzer with:
```bash
curl http://192.168.1.42/stop
```

## Security Notes
- ✅ Buzzer automatically stops after 2 minutes for safety
- Change default WiFi credentials immediately
- Use strong WiFi password
- Consider adding authentication to ESP32 endpoints in production
- Disable Serial Monitor debug output in production code
- Use HTTPS for backend communication when possible
- Emergency contacts are stored encrypted in Firebase/MongoDB

## References
- ESP32 Documentation: https://docs.espressif.com/projects/esp32-arduino-core/
- Arduino IDE Guide: https://www.arduino.cc/en/Guide
- Troubleshooting: https://github.com/espressif/arduino-esp32/issues

## Support
For issues or questions:
1. Check the Troubleshooting section
2. Review Serial Monitor output
3. Test endpoints with cURL
4. Verify network connectivity
