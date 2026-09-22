/**
 * Main Application Logic
 * Orchestrates the initialization and polling loop
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Smart Air Quality Monitor Initializing...");
    
    // Initialize UI Components
    UI.init();
    HistoryChart.init();
    QRService.init();
    
    // Polling interval reference
    let pollInterval;
    let failCount = 0;

    async function pollData() {
        try {
            // Fetch data from service layer
            const data = await fetchSensorData();
            
            // Successfully got data, reset fail count
            failCount = 0;
            
            // Update UI
            UI.updateConnectionStatus(true);
            UI.updateData(data);
            
            // Update Chart
            HistoryChart.update(data.temperature, data.humidity);
            
        } catch (error) {
            failCount++;
            console.error("Data poll failed:", error);
            
            // If failed multiple times, show connection lost
            if (failCount >= 2) {
                UI.updateConnectionStatus(false);
            }
        }
    }

    // Initial fetch
    pollData();
    
    // Start polling loop
    pollInterval = setInterval(pollData, CONFIG.REFRESH_INTERVAL_MS);
});
