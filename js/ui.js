/**
 * UI Service
 * Handles updating DOM elements, gauges, and status states
 */

const UI = {
    elements: {
        demoBadge: document.getElementById('demo-mode-badge'),
        connIndicator: document.getElementById('connection-indicator'),
        connText: document.getElementById('connection-text'),
        lastUpdated: document.getElementById('last-updated'),
        
        mq135Value: document.getElementById('mq135-value'),
        airStatusBadge: document.getElementById('air-status-badge'),
        airStatusText: document.getElementById('air-status-text'),
        gaugeFill: document.getElementById('gauge-fill'),
        airErrorMsg: document.getElementById('air-error-msg'),
        
        tempValue: document.getElementById('temp-value'),
        tempErrorMsg: document.getElementById('temp-error-msg'),
        
        humValue: document.getElementById('hum-value'),
        humErrorMsg: document.getElementById('hum-error-msg')
    },
    
    // SVG Gauge path length is approx 125.6
    GAUGE_PATH_LENGTH: 125.6,

    init() {
        if (CONFIG.USE_MOCK_DATA) {
            this.elements.demoBadge.classList.remove('hidden');
        }
    },

    updateConnectionStatus(connected) {
        if (connected) {
            this.elements.connIndicator.classList.remove('disconnected');
            this.elements.connIndicator.classList.add('connected');
            this.elements.connText.textContent = "ESP8266: CONNECTED";
        } else {
            this.elements.connIndicator.classList.remove('connected');
            this.elements.connIndicator.classList.add('disconnected');
            this.elements.connText.textContent = "ESP8266: DISCONNECTED";
            this.showGlobalError();
        }
    },

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        this.elements.lastUpdated.textContent = `Last Updated: ${timeString}`;
    },

    updateData(data) {
        // Hide any previous errors
        this.elements.airErrorMsg.classList.add('hidden');
        this.elements.tempErrorMsg.classList.add('hidden');
        this.elements.humErrorMsg.classList.add('hidden');

        // Update Air Quality (MQ135)
        if (data.air !== undefined && data.air !== null) {
            this.elements.mq135Value.textContent = data.air;
            this.updateGauge(data.air);
            
            // Status styling
            this.elements.airStatusText.textContent = data.status;
            if (data.status === "POOR") {
                this.elements.airStatusBadge.classList.add('poor');
                this.elements.gaugeFill.style.stroke = "var(--accent-poor)";
            } else {
                this.elements.airStatusBadge.classList.remove('poor');
                this.elements.gaugeFill.style.stroke = "var(--accent-good)";
            }
        } else {
            this.elements.mq135Value.textContent = "--";
            this.elements.airErrorMsg.classList.remove('hidden');
        }

        // Update Temperature
        if (data.temperature !== undefined && data.temperature !== null && !isNaN(data.temperature)) {
            this.elements.tempValue.textContent = data.temperature.toFixed(1);
        } else {
            this.elements.tempValue.textContent = "ERR";
            this.elements.tempErrorMsg.textContent = "Sensor Error";
            this.elements.tempErrorMsg.classList.remove('hidden');
        }

        // Update Humidity
        if (data.humidity !== undefined && data.humidity !== null && !isNaN(data.humidity)) {
            this.elements.humValue.textContent = data.humidity;
        } else {
            this.elements.humValue.textContent = "ERR";
            this.elements.humErrorMsg.textContent = "Sensor Error";
            this.elements.humErrorMsg.classList.remove('hidden');
        }
        
        this.updateLastUpdated();
    },

    updateGauge(value) {
        // Map 0-1023 to stroke-dashoffset (125.6 to 0)
        // 125.6 is empty (stroke offset full), 0 is full (stroke offset 0)
        const constrainedValue = Math.min(Math.max(value, 0), 1023);
        const percentage = constrainedValue / 1023;
        const offset = this.GAUGE_PATH_LENGTH - (percentage * this.GAUGE_PATH_LENGTH);
        
        this.elements.gaugeFill.style.strokeDashoffset = offset;
    },

    showGlobalError() {
        this.elements.mq135Value.textContent = "--";
        this.elements.tempValue.textContent = "--";
        this.elements.humValue.textContent = "--";
        
        this.elements.airStatusText.textContent = "--";
        this.elements.airStatusBadge.classList.remove('poor');
        this.updateGauge(0);
        
        this.elements.airErrorMsg.textContent = "Connection Lost";
        this.elements.airErrorMsg.classList.remove('hidden');
        
        this.elements.tempErrorMsg.textContent = "Connection Lost";
        this.elements.tempErrorMsg.classList.remove('hidden');
        
        this.elements.humErrorMsg.textContent = "Connection Lost";
        this.elements.humErrorMsg.classList.remove('hidden');
    }
};
