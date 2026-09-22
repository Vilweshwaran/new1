/**
 * Data Service
 * Handles fetching data from the real ESP8266 API or generating mock data.
 */

// Initial mock state
let mockData = {
    air: 350,
    temperature: 28.5,
    humidity: 55.0,
    status: "GOOD"
};

/**
 * Generate realistic shifting mock data for demo mode
 */
function generateMockData() {
    // Random walk for values
    mockData.air += Math.floor(Math.random() * 41) - 15; // Shift by -15 to +25
    mockData.temperature += (Math.random() * 1.0) - 0.5;
    mockData.humidity += (Math.random() * 2.0) - 1.0;

    // Bounds checking
    if (mockData.air < 0) mockData.air = 0;
    if (mockData.air > 1023) mockData.air = 1023;
    
    if (mockData.temperature < 15) mockData.temperature = 15;
    if (mockData.temperature > 40) mockData.temperature = 40;
    
    if (mockData.humidity < 20) mockData.humidity = 20;
    if (mockData.humidity > 95) mockData.humidity = 95;

    // Apply threshold logic
    mockData.status = (mockData.air >= CONFIG.MQ135_THRESHOLD) ? "POOR" : "GOOD";

    // Format numbers
    return {
        air: Math.floor(mockData.air),
        temperature: parseFloat(mockData.temperature.toFixed(1)),
        humidity: Math.floor(mockData.humidity),
        status: mockData.status
    };
}

/**
 * Fetch sensor data
 * Returns a promise that resolves to the data object
 */
async function fetchSensorData() {
    if (CONFIG.USE_MOCK_DATA) {
        return new Promise((resolve) => {
            // Simulate network delay
            setTimeout(() => {
                resolve(generateMockData());
            }, 300);
        });
    } else {
        try {
            const response = await fetch(CONFIG.ESP8266_API_URL, {
                method: 'GET',
                // Important for cross-origin if frontend is hosted separately
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch from ESP8266:", error);
            throw error; // Let app.js handle the error
        }
    }
}
