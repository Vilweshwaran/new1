# Smart Air Quality Monitoring System

A professional, modern, and responsive web dashboard designed for an ESP8266-based IoT project. This dashboard visualizes real-time data from an MQ135 air quality sensor and a DHT11 temperature/humidity sensor.

## 🌟 Features
- **Real-Time Sensor Visualization**: Displays Temperature, Humidity, and MQ135 Raw Values.
- **Air Quality Gauge**: A custom SVG meter mapping the raw MQ135 0-1023 ADC reading to a visual gauge.
- **Live History Chart**: Tracks Temperature and Humidity using Chart.js.
- **Responsive Dark Mode UI**: A premium glassmorphism dashboard layout built with Vanilla HTML/CSS that works seamlessly on desktop and mobile.
- **Demo / Mock Mode**: A built-in data simulator for college presentations when the physical hardware is unavailable.
- **QR Code Access**: Instantly generates a QR code for your configured dashboard URL to scan and view on a mobile device.
- **🤖 AI Air Quality Insight**: On-demand AI-powered analysis of sensor readings via a secure Vercel serverless endpoint. The OpenAI API key is **never** exposed to the browser.


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
├── vercel.json       # Vercel deployment config (routes API + static files)
├── api/
│   └── ai-insight.js # Vercel serverless function — calls OpenAI (server-side only)
├── css/
│   └── styles.css    # Premium dark mode and responsive grid styles
├── js/
│   ├── config.js     # Central configuration (API URL, Mock Mode, etc.)
│   ├── dataService.js# API fetching and mock data generation logic
│   ├── ui.js         # DOM updates and gauge rendering
│   ├── charts.js     # Chart.js integration for history
│   ├── qr.js         # QRCode.js integration
│   ├── aiInsight.js  # AI insight client module (no API key — calls /api/ai-insight)
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
A raw ADC value from the MQ135 is **not** equivalent to a standardized official Air Quality Index (AQI). Calculating official AQI requires complex calibration, load resistors, and specific environmental baselines. The GOOD/POOR threshold (currently 600) is a project-specific baseline set for demonstration purposes.

---

## 🤖 AI Air Quality Insight (Vercel + OpenAI)

### How it Works

The AI insight feature uses a **secure server-side architecture** to protect your OpenAI API key:

```
Browser Dashboard
      ↓  (POST /api/ai-insight with sensor readings)
Vercel Serverless Function  ← reads OPENAI_API_KEY from env
      ↓  (calls OpenAI API)
OpenAI gpt-4o-mini
      ↓  (returns structured JSON insight)
Dashboard "🤖 AI Air Quality Insight" card
```

> **Security guarantee**: The `OPENAI_API_KEY` is stored exclusively as a Vercel environment variable. It is **never** included in any file in this repository and is **never** sent to the browser.

---

### Step 1 — Get an OpenAI API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Copy the key (starts with `sk-...`)

---

### Step 2 — Add the Key to Vercel

1. Open your project in the [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to **Settings → Environment Variables**
3. Click **Add New**
4. Fill in:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: paste your key (e.g. `sk-proj-...`)
   - **Environment**: select ✅ Production, ✅ Preview, ✅ Development
5. Click **Save**

> ⚠️ **Never** paste your API key into any `.js`, `.json`, or `.env` file that is committed to Git. The key must only live in Vercel's environment settings.

---

### Step 3 — Redeploy

After adding the environment variable, trigger a fresh deployment:

```bash
# Option A: Push any commit to your Git branch
git commit --allow-empty -m "chore: trigger redeploy for OPENAI_API_KEY env var"
git push

# Option B: Use the Vercel dashboard
# Go to your project → Deployments → click "Redeploy" on the latest deployment
```

---

### Step 4 — Test the AI Endpoint

After deployment, you can test the endpoint directly:

```bash
curl -X POST https://your-project.vercel.app/api/ai-insight \
  -H "Content-Type: application/json" \
  -d '{"air": 420, "temperature": 28.5, "humidity": 62, "status": "GOOD"}'
```

**Expected successful response:**
```json
{
  "assessment": "Good",
  "explanation": "The MQ135 raw sensor reading of 420 is below the project threshold of 600, indicating acceptable air quality conditions in this environment.",
  "recommendation": "Air quality appears acceptable. Continue monitoring and ensure good ventilation is maintained.",
  "trend": null,
  "generatedAt": "2026-09-23T04:00:00.000Z"
}
```

**Expected error response (missing/invalid key):**
```json
{ "error": "AI insight temporarily unavailable." }
```

---

### Local Development with Vercel CLI

To test the serverless function locally before deploying:

```bash
# Install Vercel CLI
npm install -g vercel

# Log in
vercel login

# Create a local .env.local file (NEVER commit this file)
echo "OPENAI_API_KEY=sk-your-key-here" > .env.local

# Make sure .env.local is in .gitignore
echo ".env.local" >> .gitignore

# Run the local dev server (serves both static files and /api/* functions)
vercel dev
```

Then open `http://localhost:3000` and click **Generate AI Insight**.

---

### AI Insight Behaviour

| Scenario | Result |
|---|---|
| Click "Generate AI Insight" | AI analysis runs, card shows Assessment / Explanation / Recommendation / Trend |
| Click again within 60 seconds | Cooldown message shown, no API call made |
| OpenAI unavailable / key missing | Card shows "AI insight temporarily unavailable." |
| Sensor not yet connected | Card shows "No sensor data available" |
| Sensor polling (every 2 s) | Continues normally — completely independent of AI requests |

---

### What the AI Is (and Isn't) Told

The prompt explicitly informs the model:
- The MQ135 value is a **raw ADC reading (0–1023)**, not official AQI
- The project threshold is **600** (below = GOOD, at/above = POOR)
- Temperature and humidity are contextual DHT11 readings
- Responses must be **cautious and non-medical**

The AI model used is **`gpt-4o-mini`** — fast, cost-efficient, and well-suited for this short analytical task.
