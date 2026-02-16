#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22

#define TRIG 5
#define ECHO 18

#define FAN 27
#define LIGHT 26
#define LIGHT2 25

#define LED_WIFI 2
#define LED_ALERT 15

const char* server = "http://192.168.1.187:3000";

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastReconnectAttempt = 0;
bool serverConnected = true;

// ===== Ultrasonic =====
float getDistance() {

  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duration = pulseIn(ECHO, HIGH, 30000);
  return duration * 0.034 / 2;
}

// ===== LOCAL FALLBACK (ใช้เมื่อ server ล่ม) =====
void localControl(float t, float h, float d) {

  if (d > 0 && d < 100) {
    digitalWrite(LIGHT, HIGH);
  } else {
    digitalWrite(LIGHT, LOW);
  }

  if (t > 35 || h > 80) {
    digitalWrite(FAN, HIGH);
    digitalWrite(LIGHT2, HIGH);
    digitalWrite(LED_ALERT, HIGH);
  } else {
    digitalWrite(FAN, LOW);
    digitalWrite(LIGHT2, LOW);
    digitalWrite(LED_ALERT, LOW);
  }
}

// ===== ส่ง Sensor ไป Server =====
void sendSensor(float t, float h, float d) {

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(server) + "/api/sensor");
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["temp"] = t;
  doc["humidity"] = h;
  doc["distance"] = d;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);

  if (httpCode <= 0) {
    serverConnected = false;
  } else {
    serverConnected = true;
  }

  http.end();
}

// ===== ดึงคำสั่งจาก Server =====
void getCommand() {

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(server) + "/api/device");

  int code = http.GET();

  if (code == 200) {

    String payload = http.getString();

    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {

      bool fan = doc["fan"];
      bool light = doc["light"];
      bool light2 = doc["light2"];
      String mode = doc["mode"];   // ✅ อ่าน mode

      // ===== ถ้าเป็น MANUAL ให้ทำตามเว็บ =====
      if (mode == "MANUAL") {

        digitalWrite(FAN, fan);
        digitalWrite(LIGHT, light);
        digitalWrite(LIGHT2, light2);

      }
      // ===== ถ้าเป็น AUTO ก็ทำตาม server ที่คำนวณไว้แล้ว =====
      else if (mode == "AUTO") {

        digitalWrite(FAN, fan);
        digitalWrite(LIGHT, light);
        digitalWrite(LIGHT2, light2);

      }

      serverConnected = true;
    }

  } else {
    serverConnected = false;
  }

  http.end();
}

// ===== WiFi reconnect =====
void checkWiFi() {

  if (WiFi.status() != WL_CONNECTED) {

    if (millis() - lastReconnectAttempt > 10000) {
      WiFi.reconnect();
      lastReconnectAttempt = millis();
    }
  }
}

void setup() {

  Serial.begin(115200);

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  pinMode(FAN, OUTPUT);
  pinMode(LIGHT, OUTPUT);
  pinMode(LIGHT2, OUTPUT);

  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_ALERT, OUTPUT);

  WiFiManager wm;
  wm.autoConnect("BathroomSetup");

  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_WIFI, HIGH);
    delay(300);
    digitalWrite(LED_WIFI, LOW);
    delay(300);
  }

  dht.begin();
}

void loop() {

  checkWiFi();

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  float d = getDistance();

  if (isnan(t) || isnan(h)) {
    delay(2000);
    return;
  }

  // ส่งข้อมูลขึ้น Server
  sendSensor(t, h, d);

  // ถ้า Server ปกติ → ใช้ค่าจาก DB
  if (serverConnected) {
    getCommand();
  } 
  // ถ้า Server ล่ม → ใช้ Local Auto
  else {
    localControl(t, h, d);
  }

  delay(5000);
}
