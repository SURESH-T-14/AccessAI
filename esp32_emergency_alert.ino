#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "Ragunathan_5G";
const char* password = "19930303";
const int BUZZER = 5;

WebServer server(80);
unsigned long buzzerEndTime = 0;
bool buzzerActive = false;

void startBuzzer(int duration) {
  digitalWrite(BUZZER, HIGH);
  buzzerActive = true;
  buzzerEndTime = millis() + duration;
  Serial.print("[BUZZER] Started for ");
  Serial.print(duration / 1000);
  Serial.println(" seconds");
}

void stopBuzzer() {
  if (buzzerActive) {
    digitalWrite(BUZZER, LOW);
    buzzerActive = false;
    Serial.println("[BUZZER] Stopped");
  }
}

void handleAlert() {
  Serial.println("[ALERT] Emergency Alert Received!");
  startBuzzer(120000);
  server.send(200, "text/plain", "Alert Triggered");
}

void handleStatus() {
  String status = "{\"status\":\"online\",\"buzzer\":" + String(buzzerActive ? "true" : "false") + "}";
  server.send(200, "application/json", status);
}

void handleTrigger() {
  if (!server.hasArg("duration")) {
    server.send(400, "text/plain", "Missing duration");
    return;
  }
  int duration = server.arg("duration").toInt();
  startBuzzer(duration);
  server.send(200, "text/plain", "Triggered");
}

void handleStop() {
  stopBuzzer();
  server.send(200, "text/plain", "Stopped");
}

void handleNotFound() {
  server.send(404, "text/plain", "Not found");
}

void setup() {
  Serial.begin(115200);
  delay(100);
  
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);
  
  Serial.println("[SETUP] Starting");
  
  WiFi.begin(ssid, password);
  Serial.print("[WiFi] Connecting");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] Connected - IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WiFi] Failed");
  }
  
  server.on("/alert", handleAlert);
  server.on("/status", handleStatus);
  server.on("/trigger", handleTrigger);
  server.on("/stop", handleStop);
  server.onNotFound(handleNotFound);
  
  server.begin();
  Serial.println("[SERVER] Started on port 80");
}

void loop() {
  server.handleClient();
  
  if (buzzerActive && millis() >= buzzerEndTime) {
    stopBuzzer();
  }
  
  delay(10);
}
