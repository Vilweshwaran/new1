#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// ==========================================
// CONFIGURATION
// ==========================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ==========================================
// HARDWARE PIN DEFINITIONS
// ==========================================
#define MQ135_PIN A0
#define DHTPIN 2      // D4 on NodeMCU is GPIO 2
#define DHTTYPE DHT11

#define GREEN_LED 14  // D5 on NodeMCU is GPIO 14
#define RED_LED 12    // D6 on NodeMCU is GPIO 12
#define BUZZER 13     // D7 on NodeMCU is GPIO 13

// OLED displays on NodeMCU typically use I2C pins D1 (SCL) and D2 (SDA) automatically
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

// ==========================================
// GLOBAL OBJECTS
// ==========================================
DHT dht(DHTPIN, DHTTYPE);
ESP8266WebServer server(80);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ==========================================
// GLOBAL VARIABLES
// ==========================================
int rawAir = 0;
float temperature = 0.0;
float humidity = 0.0;
String statusMsg = "GOOD";
unsigned long lastUpdate = 0;
const long updateInterval = 2000; // Read sensors every 2 seconds

// ==========================================
// 1. YOUR EXISTING ROOT WEBSITE
// ==========================================
void handleRoot() {
  String html = "<html><head><title>Smart Air Quality Monitor</title></head><body style='font-family:sans-serif;'>";
  html += "<h1>Smart Air Quality Monitor</h1>";
  html += "<p><strong>Air Quality (Raw):</strong> " + String(rawAir) + " [" + statusMsg + "]</p>";
  html += "<p><strong>Temperature:</strong> " + String(temperature) + " &deg;C</p>";
  html += "<p><strong>Humidity:</strong> " + String(humidity) + " %</p>";
  html += "<p><a href='/api/data'>View JSON API</a></p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

// ==========================================
// 2. NEW DASHBOARD API ENDPOINT
// ==========================================
void handleApiData() {
  // Check if DHT readings are valid to prevent JSON errors
  String tempStr = isnan(temperature) ? "null" : String(temperature);
  String humStr = isnan(humidity) ? "null" : String(humidity);

  // Construct JSON manually
  String json = "{";
  json += "\"air\":" + String(rawAir) + ",";
  json += "\"temperature\":" + tempStr + ",";
  json += "\"humidity\":" + humStr + ",";
  json += "\"status\":\"" + statusMsg + "\"";
  json += "}";
  
  // MUST INCLUDE CORS so the modern web dashboard can read it from a different origin!
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // 1. Initialize Outputs
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  // 2. Initialize DHT11
  dht.begin();

  // 3. Initialize OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Initializing...");
    display.display();
  }

  // 4. Initialize WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP Address: ");
  Serial.println(WiFi.localIP());

  // 5. Start Web Server
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/data", HTTP_GET, handleApiData); // <-- NEW DASHBOARD ROUTE
  server.begin();
  Serial.println("HTTP server started.");
}

// ==========================================
// LOOP
// ==========================================
void loop() {
  // Listen for incoming web requests
  server.handleClient();
  
  // Update sensors every 2 seconds without blocking (no delay())
  unsigned long currentMillis = millis();
  if (currentMillis - lastUpdate >= updateInterval) {
    lastUpdate = currentMillis;
    
    // Read Sensors
    rawAir = analogRead(MQ135_PIN);
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    
    // Only overwrite DHT variables if readings were successful
    if (!isnan(t)) temperature = t;
    if (!isnan(h)) humidity = h;
    
    // Threshold Logic & Hardware Control
    if (rawAir < 600) {
      statusMsg = "GOOD";
      digitalWrite(GREEN_LED, HIGH);
      digitalWrite(RED_LED, LOW);
      digitalWrite(BUZZER, LOW);
    } else {
      statusMsg = "POOR";
      digitalWrite(GREEN_LED, LOW);
      digitalWrite(RED_LED, HIGH);
      // Short buzzer beep
      tone(BUZZER, 1000, 200); 
    }
    
    // Update OLED Screen
    display.clearDisplay();
    display.setCursor(0,0);
    
    display.println("WIFI: CONNECTED");
    display.print("IP: ");
    display.println(WiFi.localIP());
    display.println("-----------------");
    
    display.print("MQ135: ");
    display.print(rawAir);
    display.print(" (");
    display.print(statusMsg);
    display.println(")");
    
    display.print("Temp:  ");
    display.print(temperature);
    display.println(" C");
    
    display.print("Hum:   ");
    display.print(humidity);
    display.println(" %");
    
    display.display();
  }
}
