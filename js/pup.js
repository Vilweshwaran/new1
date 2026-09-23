/**
 * Aera the Pup - Animated Companion Service
 *
 * Updates the puppy mascot's visual expressions, animations, and status captions
 * in real-time based on live environmental sensor data.
 */

const AeraPup = (() => {
    let containerEl = null;
    let statusTextEl = null;
    let currentMood = 'good';

    /**
     * Determines mood based on air quality, temperature, and humidity.
     * Thresholds:
     *   - Air < 300: GOOD (Happy and healthy!)
     *   - Air 300 - 550: MODERATE (Smells okay...)
     *   - Air 550 - 750 (or Temp > 33°C): POOR (*pant pant*)
     *   - Air > 750 (or Temp > 38°C): HAZARDOUS (*cough cough*)
     */
    function calculateMood(air, temp, humidity, status) {
        const airVal = Number(air);
        const tempVal = Number(temp);

        // Hazardous: extremely high gas reading
        if (airVal >= 750 || (status && String(status).toUpperCase() === 'HAZARDOUS')) {
            return {
                mood: 'hazardous',
                text: '*cough cough*',
                colorClass: 'pup-hazardous'
            };
        }

        // Poor: high gas or very hot
        if (airVal >= 550 || tempVal > 33 || (status && String(status).toUpperCase() === 'POOR')) {
            return {
                mood: 'poor',
                text: '*pant pant*',
                colorClass: 'pup-poor'
            };
        }

        // Moderate: slight elevation
        if (airVal >= 300) {
            return {
                mood: 'moderate',
                text: 'Smells okay...',
                colorClass: 'pup-moderate'
            };
        }

        // Good: clean air & pleasant temperature
        return {
            mood: 'good',
            text: 'Happy and healthy!',
            colorClass: 'pup-good'
        };
    }

    function update(data) {
        if (!containerEl || !statusTextEl || !data) return;

        const air = data.air !== undefined ? data.air : 200;
        const temp = data.temperature !== undefined ? data.temperature : 25;
        const humidity = data.humidity !== undefined ? data.humidity : 50;
        const status = data.status || 'GOOD';

        const { mood, text, colorClass } = calculateMood(air, temp, humidity, status);

        if (currentMood !== mood) {
            containerEl.classList.remove('pup-state-good', 'pup-state-moderate', 'pup-state-poor', 'pup-state-hazardous');
            containerEl.classList.add(`pup-state-${mood}`);
            currentMood = mood;
        }

        statusTextEl.textContent = text;
        statusTextEl.className = `pup-status-text ${colorClass}`;
    }

    function init() {
        containerEl = document.getElementById('pup-avatar-container');
        statusTextEl = document.getElementById('pup-status-text');

        if (!containerEl || !statusTextEl) {
            console.warn('[AeraPup] Mascot elements not found in DOM.');
            return;
        }

        // Set default state
        containerEl.classList.add('pup-state-good');
        statusTextEl.textContent = 'Happy and healthy!';
        statusTextEl.className = 'pup-status-text pup-good';
    }

    return {
        init,
        update
    };
})();
