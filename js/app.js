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
    AeraPup.init();
    AIInsight.init();
    
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

            // Update Mascot
            AeraPup.update(data);
            
            // Update Chart
            HistoryChart.update(data.temperature, data.humidity);

            // Feed latest reading into AI insight module (maintains trend buffer
            // and tracks current data for the "Generate AI Insight" button).
            // This does NOT trigger an AI API call — that only happens on user click.
            AIInsight.onNewData(data);
            
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
