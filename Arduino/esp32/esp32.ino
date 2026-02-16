#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>

#define DHTPIN 4
#define DHTTYPE DHT22

#define TRIG 5
#define ECHO 18

#define FAN 27
#define LIGHT 26

#define LED_WIFI 2
#define LED_ALERT 15

const char* server = "http://YOUR_BACKEND_IP:3000";

// ===== Telegram =====
const char* BOT_TOKEN = "YOUR_BOT_TOKEN";
const char* CHAT_ID   = "YOUR_CHAT_ID";

WiFiClientSecure secured_client;
UniversalTelegramBot bot(BOT_TOKEN, secured_client);

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastReconnectAttempt = 0;
bool serverConnected = true;
bool alertSent = false;   // ป้องกันส่งซ้ำ

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

// ===== ส่ง Telegram =====
void sendTelegramAlert(float t, float h){

  String message = "🚨 Smart Bathroom Alert\n";
  message += "Temperature: " + String(t) + " °C\n";
  message += "Humidity: " + String(h) + " %";

  bot.sendMessage(CHAT_ID, message, "");
}

// ===== LOCAL CONTROL =====
void localControl(float t, float h, float d){

  // เปิดไฟเมื่อมีคน
  if(d > 0 && d < 100){
    digitalWrite(LIGHT, HIGH);
  } else {
    digitalWrite(LIGHT, LOW);
  }

  // ตรวจอุณหภูมิ/ความชื้น
  if(t > 35 || h > 80){

    digitalWrite(FAN, HIGH);
    digitalWrite(LED_ALERT, HIGH);

    // ส่ง Telegram แค่ครั้งเดียว
    if(!alertSent && WiFi.status() == WL_CONNECTED){
      sendTelegramAlert(t,h);
      alertSent = true;
    }

  } else {

    digitalWrite(FAN, LOW);
    digitalWrite(LED_ALERT, LOW);

    alertSent = false; // reset เมื่อค่าปกติ
  }
}

// ===== ส่งข้อมูลไป Server =====
void sendSensor(float t, float h, float d){

  if(WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.setTimeout(3000);
  http.begin(String(server)+"/api/sensor");
  http.addHeader("Content-Type","application/json");

  StaticJsonDocument<200> doc;
  doc["temp"] = t;
  doc["humidity"] = h;
  doc["distance"] = d;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);

  if(httpCode <= 0){
    Serial.println("Server not reachable");
    serverConnected = false;
  } else {
    serverConnected = true;
  }

  http.end();
}

// ===== ดึงคำสั่งจาก Server =====
void getCommand(){

  if(WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.setTimeout(3000);
  http.begin(String(server)+"/api/device");

  int code = http.GET();

  if(code == 200){

    String payload = http.getString();

    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc,payload);

    if(!error){
      bool fan = doc["fan"];
      bool light = doc["light"];

      digitalWrite(FAN, fan);
      digitalWrite(LIGHT, light);

      serverConnected = true;
    }

  } else {
    serverConnected = false;
  }

  http.end();
}

// ===== WiFi reconnect =====
void checkWiFi(){

  if(WiFi.status() != WL_CONNECTED){

    if(millis() - lastReconnectAttempt > 10000){
      Serial.println("Reconnecting WiFi...");
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

  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_ALERT, OUTPUT);

  WiFiManager wm;
  wm.autoConnect("BathroomSetup");

  // WiFi Blink
  for(int i=0;i<5;i++){
    digitalWrite(LED_WIFI,HIGH);
    delay(300);
    digitalWrite(LED_WIFI,LOW);
    delay(300);
  }

  secured_client.setInsecure(); // สำหรับ Telegram HTTPS

  dht.begin();
}

void loop(){

  checkWiFi();

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  float d = getDistance();

  // ทำงาน local เสมอ
  localControl(t,h,d);

  // Sync กับ Server ถ้าเชื่อมต่อได้
  sendSensor(t,h,d);

  if(serverConnected){
    getCommand();
  }

  delay(5000);
}
