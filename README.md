# Smart Air Quality Monitoring System

A professional, modern, and responsive web dashboard designed for an ESP8266-based IoT project. This dashboard visualizes real-time data from an MQ135 air quality sensor and a DHT11 temperature/humidity sensor.

## 🌟 Features
- **Real-Time Sensor Visualization**: Displays Temperature, Humidity, and MQ135 Raw Values.
- **Air Quality Gauge**: A custom SVG meter mapping the raw MQ135 0-1023 ADC reading to a visual gauge.
- **Live History Chart**: Tracks Temperature and Humidity using Chart.js.
- **Responsive Dark Mode UI**: A premium glassmorphism dashboard layout built with Vanilla HTML/CSS that works seamlessly on desktop and mobile.
- **Demo / Mock Mode**: A built-in data simulator for college presentations when the physical hardware is unavailable.
- **QR Code Access**: Instantly generates a QR code for your configured dashboard URL to scan and view on a mobile device.

## 🛠️ Technology Used
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No React/Webpack required).
- **Libraries (via CDN)**: 
  - [Chart.js](https://www.chartjs.org/) for history graphs.
  - [QRCode.js](https://davidshimjs.github.io/qrcodejs/) for QR code generation.
  - [FontAwesome](https://fontawesome.com/) for icons.

## 📂 Project Structure
```text
smart-air-quality-monitor/
├── index.html        # Main dashboard structure
├── css/
│   └── styles.css    # Premium dark mode and responsive grid styles
├── js/
│   ├── config.js     # Central configuration (API URL, Mock Mode, etc.)
│   ├── dataService.js# API fetching and mock data generation logic
│   ├── ui.js         # DOM updates and gauge rendering
│   ├── charts.js     # Chart.js integration for history
│   ├── qr.js         # QRCode.js integration
│   └── app.js        # Main initialization and polling loop
└── README.md         # Documentation
```

## 🚀 How to Run Locally
Because this project uses vanilla web technologies and CDNs, no complex build steps are required.

1. **Directly in Browser**: You can double-click `index.html` to open it. (Note: Some browsers restrict fetching data from `file://` URLs, so running a local server is recommended).
2. **Local HTTP Server** (Recommended):
   - Using Python: Run `python -m http.server 8000` in the project directory, then visit `http://localhost:8000`
   - Using Node.js: Run `npx serve` in the project directory.

## 🧪 How Mock / Demo Mode Works
By default, the dashboard is configured to use Mock Data. This allows you to demonstrate the UI (e.g., during a viva) even if the ESP8266 is disconnected.
- It generates realistic, slightly shifting temperature, humidity, and MQ135 values every 2 seconds.
- A "DEMO MODE" badge is displayed in the top right.

**To toggle Demo Mode:**
Open `js/config.js` and change:
```javascript
USE_MOCK_DATA: true,  // Change to false to connect to the real ESP8266
```

## 🔌 Connecting to the ESP8266
When you are ready to connect to the real hardware:
1. Ensure your ESP8266 is running a web server that responds to `GET /api/data`.
2. Open `js/config.js` and set:
   ```javascript
   USE_MOCK_DATA: false,
   ESP8266_API_URL: 'http://<YOUR_ESP8266_IP>/api/data',
   ```
3. Ensure your laptop/phone running the dashboard is on the **same Wi-Fi network** as the ESP8266.

### Expected `/api/data` JSON Format
Your ESP8266 Arduino code should output a JSON string exactly like this:
```json
{
  "air": 628,
  "temperature": 29.0,
  "humidity": 61.0,
  "status": "POOR"
}
```

**Required ESP8266 Firmware Modification:**
If your ESP8266 currently only serves an HTML string, you need to add an endpoint. In Arduino IDE using `ESP8266WebServer`, add:
```cpp
// Add this in your setup() function:
server.on("/api/data", HTTP_GET, []() {
  int rawAir = analogRead(A0);
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  // Status logic (Threshold = 600)
  String status = (rawAir < 600) ? "GOOD" : "POOR";
  
  // Optional: You can control the hardware based on the reading here
  // digitalWrite(D5, (status == "GOOD") ? HIGH : LOW); // Green LED
  // digitalWrite(D6, (status == "POOR") ? HIGH : LOW); // Red LED
  // if(status == "POOR") tone(D7, 1000, 500); // Buzzer

  // Handle DHT11 errors (isnan checks if the float is 'Not a Number')
  String tempStr = isnan(temp) ? "null" : String(temp);
  String humStr = isnan(hum) ? "null" : String(hum);

  String json = "{";
  json += "\"air\":" + String(rawAir) + ",";
  json += "\"temperature\":" + tempStr + ",";
  json += "\"humidity\":" + humStr + ",";
  json += "\"status\":\"" + status + "\"";
  json += "}";
  
  // Important: Add CORS header if the dashboard is hosted separately
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
});
```

## 📱 How the QR Code Works
The QR code lets evaluators easily open the dashboard on their phones.
To configure the URL it points to, open `js/config.js` and edit:
```javascript
DASHBOARD_URL: 'http://192.168.x.x/', // Set this to the IP where the dashboard is hosted
```
- If you host this dashboard directly on the ESP8266 (SPIFFS), set it to the ESP8266 IP.
- If you run this dashboard on your laptop (e.g., via `python -m http.server`), set it to your laptop's local IP address (e.g., `http://192.168.1.50:8000/`). Your phone must be on the same Wi-Fi network.

## ⚠️ Important Note About MQ135 Readings
This dashboard labels the MQ135 data explicitly as **"Raw Sensor Value (0-1023)"**. 
A raw ADC value from the MQ135 is **not** equivalent to a standardized official Air Quality Index (AQI). Calculating official AQI requires complex calibration, load resistors, and specific environmental baselines. The GOOD/POOR threshold (currently 400) is a project-specific baseline set for demonstration purposes.
