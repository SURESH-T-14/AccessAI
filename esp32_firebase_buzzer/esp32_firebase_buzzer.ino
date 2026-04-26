#include <WiFi.h>
#include <WebServer.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// WiFi Credentials
const char* ssid = "Ragunathan";
const char* password = "19930303";

// Firebase Configuration
#define API_KEY "AIzaSyDPEMe_l6z0bX-1RhRbS4yJkJQy8_M9PEI"
#define DATABASE_URL "https://bot-ai-54cc6-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define USER_EMAIL "suresh140105@gmail.com"
#define USER_PASSWORD "19930303"

const int BUZZER = 5;
unsigned long buzzerEndTime = 0;
bool buzzerActive = false;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

WebServer server(80);

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);
  
  Serial.println("\n[ESP32] Starting Emergency Buzzer System...");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize Firebase
  initializeFirebase();
  
  // Setup web server endpoints (local backup)
  setupWebServer();
  
  Serial.println("[READY] ESP32 listening to Firebase for buzzer commands!");
}

void loop() {
  server.handleClient();
  
  // Handle buzzer auto-off
  if (buzzerActive && millis() > buzzerEndTime) {
    digitalWrite(BUZZER, LOW);
    buzzerActive = false;
    Serial.println("[BUZZER] Auto-stop (timeout)");
  }
  
  // Listen to Firebase for commands (polling every 500ms)
  if (Firebase.ready()) {
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck > 500) {
      lastCheck = millis();
      checkFirebaseCommand();
    }
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

void initializeFirebase() {
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Set Firebase auth user account
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  
  // Assign the callback for Firebase token generation
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("[Firebase] Initializing connection...");
}

void checkFirebaseCommand() {
  if (Firebase.RTDB.getJSON(&fbdo, "/devices/esp32/buzzer")) {
    if (fbdo.dataType() == fb_esp_rtdb_data_type_json) {
      FirebaseJson json = fbdo.jsonObject();
      
      // Check if there's a trigger command
      int trigger = 0;
      if (json.get(JsonData, "trigger")) {
        trigger = JsonData.intValue;
      }
      
      if (trigger == 1) {
        // Get duration (default 120000ms = 2 minutes)
        int duration = 120000;
        if (json.get(JsonData, "duration")) {
          duration = JsonData.intValue;
        }
        
        // Activate buzzer
        activateBuzzer(duration);
        
        // Clear the trigger flag
        Firebase.RTDB.setInt(&fbdo, "/devices/esp32/buzzer/trigger", 0);
      }
      
      // Update status
      updateFirebaseStatus();
    }
  }
}

void activateBuzzer(int duration) {
  digitalWrite(BUZZER, HIGH);
  buzzerActive = true;
  buzzerEndTime = millis() + duration;
  
  Serial.print("[BUZZER] Activated for ");
  Serial.print(duration);
  Serial.println("ms");
}

void updateFirebaseStatus() {
  StaticJsonDocument<200> status;
  status["online"] = true;
  status["ip"] = WiFi.localIP().toString();
  status["buzzer_active"] = buzzerActive;
  status["timestamp"] = millis();
  
  String jsonString;
  serializeJson(status, jsonString);
  
  Firebase.RTDB.setJSON(&fbdo, "/devices/esp32/status", &status);
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
  StaticJsonDocument<200> doc;
  doc["online"] = true;
  doc["ip"] = WiFi.localIP().toString();
  doc["buzzer_active"] = buzzerActive;
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
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

void tokenStatusCallback(token_info_t info) {
  if (info.status == token_status_ready) {
    Serial.println("[Firebase] Token ready!");
  } else if (info.status == token_status_expired) {
    Serial.println("[Firebase] Token expired, refreshing...");
  }
}
