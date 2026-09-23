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
     * Determines mood based ONLY on air quality value (4-tier system).
     * The ESP's 2-tier "GOOD/POOR" status is ignored — we use our own thresholds.
     *
     * Thresholds:
     *   - Air < 300:       GOOD     (Happy and healthy!)  — happy ^_^ eyes, smile, bouncing
     *   - Air 300 - 500:   MODERATE (Smells okay...)      — dot eyes, neutral mouth, gentle sway
     *   - Air 500 - 700:   POOR     (Feeling sick...)     — sad crying eyes, frown, tears
     *   - Air >= 700:      HAZARDOUS (*cough cough*)      — squinting X_X, cough, shaking
     */
    function calculateMood(air, temp, humidity) {
        const airVal = Number(air);
        const tempVal = Number(temp);

        // Hazardous: extremely high gas reading or extreme heat
        if (airVal >= 700 || tempVal > 38) {
            return {
                mood: 'hazardous',
                text: '*cough cough*',
                colorClass: 'pup-hazardous'
            };
        }

        // Poor: bad air or very hot — puppy is SAD/CRYING
        if (airVal >= 500 || tempVal > 33) {
            return {
                mood: 'poor',
                text: 'Feeling sick...',
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

        // Good: clean air & pleasant temperature — puppy is HAPPY
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

        // We intentionally do NOT use data.status — only air/temp values
        const { mood, text, colorClass } = calculateMood(air, temp, humidity);

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
