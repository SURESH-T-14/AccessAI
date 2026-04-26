#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// WiFi Credentials
const char* ssid = "Ragunathan";
const char* password = "19930303";

// Firebase Realtime Database
const char* FIREBASE_URL = "https://bot-ai-54cc6-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* FIREBASE_API_KEY = "AIzaSyDPEMe_l6z0bX-1RhRbS4yJkJQy8_M9PEI";

const int BUZZER = 5;
unsigned long buzzerEndTime = 0;
bool buzzerActive = false;

WebServer server(80);
HTTPClient http;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);
  
  Serial.println("\n[ESP32] Starting Emergency Buzzer System (HTTP Edition)...");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup web server endpoints
  setupWebServer();
  
  Serial.println("[READY] ESP32 listening for buzzer commands!");
  Serial.println("[INFO] Polling Firebase every 1 second...");
}

void loop() {
  server.handleClient();
  
  // Handle buzzer auto-off
  if (buzzerActive && millis() > buzzerEndTime) {
    digitalWrite(BUZZER, LOW);
    buzzerActive = false;
    Serial.println("[BUZZER] Auto-stop (timeout)");
  }
  
  // Poll Firebase every 1 second
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 1000) {
    lastCheck = millis();
    checkFirebaseCommand();
  }
  
  delay(10);
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WiFi] Connected - IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("[WiFi] Failed to connect!");
  }
}

void checkFirebaseCommand() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Build Firebase REST API URL
  String url = String(FIREBASE_URL) + "/devices/esp32/buzzer.json?auth=" + FIREBASE_API_KEY;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    // Simple JSON parsing for {"trigger":1,"duration":120000}
    if (payload.indexOf("\"trigger\":1") != -1) {
      
      // Extract duration value
      int duration = 120000; // default 2 minutes
      int durationPos = payload.indexOf("\"duration\":");
      if (durationPos != -1) {
        int startPos = durationPos + 11;
        int endPos = payload.indexOf(",", startPos);
        if (endPos == -1) endPos = payload.indexOf("}", startPos);
        
        String durationStr = payload.substring(startPos, endPos);
        duration = durationStr.toInt();
      }
      
      // Activate buzzer
      activateBuzzer(duration);
      
      // Clear trigger flag by sending trigger:0
      clearFirebaseTrigger();
    }
    
    // Update status
    updateFirebaseStatus();
  } else if (httpCode != -1) {
    if (httpCode % 100 != 0) { // Avoid logging normal timeouts
      Serial.print("[Firebase] GET failed, HTTP code: ");
      Serial.println(httpCode);
    }
  }
  
  http.end();
}

void clearFirebaseTrigger() {
  String url = String(FIREBASE_URL) + "/devices/esp32/buzzer/trigger.json?auth=" + FIREBASE_API_KEY;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.PUT("0");
  http.end();
}

void updateFirebaseStatus() {
  String url = String(FIREBASE_URL) + "/devices/esp32/status.json?auth=" + FIREBASE_API_KEY;
  
  // Build JSON status
  String statusJson = "{";
  statusJson += "\"online\":true,";
  statusJson += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  statusJson += "\"buzzer_active\":" + String(buzzerActive ? "true" : "false") + ",";
  statusJson += "\"timestamp\":" + String(millis());
  statusJson += "}";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.PUT(statusJson);
  http.end();
}

void activateBuzzer(int duration) {
  digitalWrite(BUZZER, HIGH);
  buzzerActive = true;
  buzzerEndTime = millis() + duration;
  
  Serial.print("[BUZZER] Activated for ");
  Serial.print(duration);
  Serial.println("ms");
}

void setupWebServer() {
  // Local endpoints (for backward compatibility)
  server.on("/alert", HTTP_GET, handleAlert);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/trigger", HTTP_POST, handleTrigger);
  server.on("/stop", HTTP_GET, handleStop);
  
  server.begin();
  Serial.println("[SERVER] Started on port 80");
}

void handleAlert() {
  activateBuzzer(120000);
  server.send(200, "application/json", "{\"status\":\"alert_triggered\"}");
}

void handleStatus() {
  String json = "{\"online\":true,\"ip\":\"" + WiFi.localIP().toString() + "\",\"buzzer_active\":" + String(buzzerActive ? "true" : "false") + "}";
  server.send(200, "application/json", json);
}

void handleTrigger() {
  if (server.hasArg("duration")) {
    int duration = server.arg("duration").toInt();
    activateBuzzer(duration);
    server.send(200, "application/json", "{\"status\":\"triggered\"}");
  } else {
    server.send(400, "application/json", "{\"error\":\"duration parameter required\"}");
  }
}

void handleStop() {
  digitalWrite(BUZZER, LOW);
  buzzerActive = false;
  server.send(200, "application/json", "{\"status\":\"stopped\"}");
}
