/**
 * AI Insight Service
 * Manages on-demand AI air quality analysis via the /api/ai-insight endpoint.
 *
 * SECURITY: This module NEVER contains or exposes the OpenAI API key.
 * All AI calls go through the /api/ai-insight Vercel serverless function.
 */

const AIInsight = (() => {
    // ── Configuration ────────────────────────────────────────────────────────
    const API_ENDPOINT = '/api/ai-insight';
    const MAX_READINGS = 10;           // Rolling buffer size for trend analysis
    const COOLDOWN_MS  = 60 * 1000;   // 60-second cooldown between AI requests

    // ── State ─────────────────────────────────────────────────────────────────
    let recentReadings  = [];    // Rolling buffer of sensor snapshots
    let lastRequestTime = 0;     // Epoch ms of last successful AI request start
    let isLoading       = false; // Guard against double-click while fetching
    let cooldownTimer   = null;  // setInterval reference for countdown

    // ── DOM References (populated in init) ────────────────────────────────────
    let elements = {};

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Add a sensor reading snapshot to the rolling buffer */
    function addReading(data) {
        if (!data || data.air === undefined) return;
        recentReadings.push({
            air:         data.air,
            temperature: data.temperature,
            humidity:    data.humidity
        });
        if (recentReadings.length > MAX_READINGS) {
            recentReadings.shift();
        }
    }

    /** Seconds remaining in cooldown (0 if elapsed) */
    function cooldownSecondsLeft() {
        const elapsed = Date.now() - lastRequestTime;
        return Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
    }

    /** Format a timestamp into a human-readable "HH:MM:SS" string */
    function formatTime(isoString) {
        try {
            return new Date(isoString).toLocaleTimeString();
        } catch {
            return '';
        }
    }

    // ── UI State Renderers ────────────────────────────────────────────────────

    function showLoading() {
        elements.contentArea.innerHTML = `
            <div class="ai-loading">
                <div class="ai-spinner"></div>
                <span>Analyzing air quality data…</span>
            </div>`;
        elements.generateBtn.disabled = true;
        elements.generateBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Analyzing…';
    }

    function showError(message) {
        elements.contentArea.innerHTML = `
            <div class="ai-error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>${message}</span>
            </div>`;
        resetButton();
    }

    function showInsight(insight) {
        const assessmentClass = insight.assessment.toLowerCase().replace(/\s+/g, '-');

        const trendHtml = insight.trend
            ? `<div class="ai-insight-section">
                   <div class="ai-insight-label"><i class="fa-solid fa-chart-line"></i> Trend</div>
                   <div class="ai-insight-text trend-text">${escapeHtml(insight.trend)}</div>
               </div>`
            : '';

        elements.contentArea.innerHTML = `
            <div class="ai-insight-grid">
                <div class="ai-insight-section ai-insight-section--assessment">
                    <div class="ai-insight-label"><i class="fa-solid fa-circle-dot"></i> Assessment</div>
                    <div class="ai-assessment ${assessmentClass}">${escapeHtml(insight.assessment)}</div>
                </div>
                <div class="ai-insight-section">
                    <div class="ai-insight-label"><i class="fa-solid fa-circle-info"></i> Explanation</div>
                    <div class="ai-insight-text">${escapeHtml(insight.explanation)}</div>
                </div>
                <div class="ai-insight-section">
                    <div class="ai-insight-label"><i class="fa-solid fa-lightbulb"></i> Recommendation</div>
                    <div class="ai-insight-text">${escapeHtml(insight.recommendation)}</div>
                </div>
                ${trendHtml}
            </div>`;

        if (insight.generatedAt) {
            elements.lastGenerated.textContent = `Last analysed: ${formatTime(insight.generatedAt)}`;
            elements.lastGenerated.classList.remove('hidden');
        }
    }

    function resetButton() {
        isLoading = false;
        elements.generateBtn.innerHTML = '<i class="fa-solid fa-robot"></i> Generate AI Insight';
        elements.generateBtn.disabled = cooldownSecondsLeft() > 0;
    }

    /** Start the cooldown countdown shown below the button */
    function startCooldownDisplay() {
        clearInterval(cooldownTimer);
        cooldownTimer = setInterval(() => {
            const secs = cooldownSecondsLeft();
            if (secs <= 0) {
                clearInterval(cooldownTimer);
                elements.cooldownLabel.textContent = '';
                elements.cooldownLabel.classList.add('hidden');
                elements.generateBtn.disabled = false;
            } else {
                elements.cooldownLabel.textContent = `Next analysis available in ${secs}s`;
                elements.cooldownLabel.classList.remove('hidden');
                elements.generateBtn.disabled = true;
            }
        }, 1000);
    }

    /** Simple HTML entity escaping to prevent XSS from AI response */
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ── Core Request Logic ────────────────────────────────────────────────────

    async function requestInsight(currentData) {
        if (isLoading) return;

        // Cooldown guard
        const secsLeft = cooldownSecondsLeft();
        if (secsLeft > 0) {
            elements.cooldownLabel.textContent = `Next analysis available in ${secsLeft}s`;
            elements.cooldownLabel.classList.remove('hidden');
            return;
        }

        if (!currentData || currentData.air === undefined) {
            showError('No sensor data available. Please wait for the sensor to connect.');
            return;
        }

        isLoading = true;
        lastRequestTime = Date.now();
        showLoading();

        try {
            const payload = {
                air:            currentData.air,
                temperature:    currentData.temperature,
                humidity:       currentData.humidity,
                status:         currentData.status,
                recentReadings: [...recentReadings]
            };

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'AI insight temporarily unavailable.');
            }

            showInsight(result);
            startCooldownDisplay();

        } catch (err) {
            console.error('[AIInsight] Request failed:', err.message);
            showError(err.message || 'AI insight temporarily unavailable.');
            // Reset cooldown so user can retry immediately after an error
            lastRequestTime = 0;
            resetButton();
        } finally {
            isLoading = false;
            if (!elements.generateBtn.disabled) {
                elements.generateBtn.disabled = false;
                elements.generateBtn.innerHTML = '<i class="fa-solid fa-robot"></i> Generate AI Insight';
            }
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    function init() {
        elements = {
            generateBtn:   document.getElementById('generate-ai-insight-btn'),
            contentArea:   document.getElementById('ai-insight-content'),
            lastGenerated: document.getElementById('ai-last-generated'),
            cooldownLabel: document.getElementById('ai-cooldown-label')
        };

        // Guard: if AI card is missing from DOM, silently do nothing
        if (!elements.generateBtn || !elements.contentArea) {
            console.warn('[AIInsight] AI card elements not found in DOM — skipping init.');
            return;
        }

        // Track current data for the button click
        let latestData = null;

        // Expose a setter so app.js can pass latest sensor data
        AIInsight._setLatestData = (data) => { latestData = data; };

        elements.generateBtn.addEventListener('click', () => {
            requestInsight(latestData);
        });

        console.log('[AIInsight] Initialized. Click "Generate AI Insight" to analyse sensor data.');
    }

    // Public surface
    return {
        init,
        addReading,
        /** Called by app.js after every successful sensor poll */
        onNewData(data) {
            addReading(data);
            if (typeof AIInsight._setLatestData === 'function') {
                AIInsight._setLatestData(data);
            }
        }
    };
})();
