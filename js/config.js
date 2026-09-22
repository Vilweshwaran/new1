/**
 * Configuration Settings
 * Central place to configure the dashboard
 */

const CONFIG = {
    // Set to true to use generated demo data, false to fetch from real ESP8266
    USE_MOCK_DATA: false,

    // The IP address/URL of the ESP8266 API
    ESP8266_API_URL: 'http://192.168.1.42/api/data',

    // The URL displayed in the QR Code section
    DASHBOARD_URL: 'https://new1-ten-alpha.vercel.app',

    // How often to update the dashboard (in milliseconds)
    REFRESH_INTERVAL_MS: 2000,

    // Threshold for Air Quality classification
    // Readings >= this value will be classified as POOR
    MQ135_THRESHOLD: 600
};
