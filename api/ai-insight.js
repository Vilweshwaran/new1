/**
 * Vercel Serverless Function: /api/ai-insight
 *
 * Accepts POST requests from the dashboard with current sensor readings,
 * calls the OpenAI API using a server-side environment variable, and
 * returns a structured AI-generated air quality insight.
 *
 * SECURITY: OPENAI_API_KEY is only read server-side here.
 * It is NEVER sent to or visible in the browser.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const MQ135_THRESHOLD = 600;

/**
 * Build the prompt sent to OpenAI.
 * Carefully instructs the model about what MQ135 raw values mean
 * and what NOT to claim (official AQI, medical advice, etc.)
 */
function buildPrompt(air, temperature, humidity, status, recentReadings) {
    const recentSection = Array.isArray(recentReadings) && recentReadings.length > 1
        ? `
Recent readings (last ${recentReadings.length}, oldest → newest):
${recentReadings.map((r, i) => `  ${i + 1}. MQ135=${r.air}, Temp=${r.temperature}°C, Humidity=${r.humidity}%`).join('\n')}
`
        : 'No recent trend data is available.';

    return `You are an air quality assistant for an ESP8266 IoT project.

IMPORTANT CONTEXT — READ CAREFULLY:
- The "MQ135 value" is a RAW ADC sensor reading from an MQ135 gas sensor, ranging 0 to 1023.
- It is NOT an official Air Quality Index (AQI). Do NOT describe it as AQI.
- The project-specific threshold is ${MQ135_THRESHOLD}: readings BELOW ${MQ135_THRESHOLD} are classified as GOOD, readings AT OR ABOVE ${MQ135_THRESHOLD} are classified as POOR.
- Do NOT make medical claims or official environmental authority statements.
- Temperature and humidity are contextual readings from a DHT11 sensor (they influence gas sensor accuracy).
- Keep your response cautious, helpful, and non-alarmist.

CURRENT SENSOR SNAPSHOT:
- MQ135 raw value: ${air} (threshold: ${MQ135_THRESHOLD})
- Status: ${status}
- Temperature: ${temperature}°C
- Humidity: ${humidity}%

${recentSection}

Respond with ONLY valid JSON in this exact structure (no markdown, no extra text):
{
  "assessment": "Good" or "Poor" or "Moderate",
  "explanation": "1-2 sentences explaining what the reading suggests in plain language.",
  "recommendation": "1-2 actionable sentences the user can act on.",
  "trend": "1 sentence about the trend from recent readings, or null if no trend data is available."
}`;
}

/**
 * Main serverless handler
 */
export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Read the API key from server-side environment only
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('[ai-insight] OPENAI_API_KEY environment variable is not set.');
        return res.status(503).json({ error: 'AI insight temporarily unavailable.' });
    }

    // Parse and validate request body
    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body.' });
    }

    const { air, temperature, humidity, status, recentReadings } = body || {};

    // Basic validation
    if (air === undefined || temperature === undefined || humidity === undefined || !status) {
        return res.status(400).json({ error: 'Missing required sensor fields: air, temperature, humidity, status.' });
    }

    const prompt = buildPrompt(
        Number(air),
        Number(temperature),
        Number(humidity),
        String(status),
        Array.isArray(recentReadings) ? recentReadings.slice(-10) : []
    );

    try {
        const openaiResponse = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful IoT air quality assistant. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.4,
                max_tokens: 300
            })
        });

        if (!openaiResponse.ok) {
            // Log the error server-side but do NOT expose details to the browser
            const errText = await openaiResponse.text();
            console.error(`[ai-insight] OpenAI API error ${openaiResponse.status}:`, errText);
            return res.status(503).json({ error: 'AI insight temporarily unavailable.' });
        }

        const openaiData = await openaiResponse.json();
        const rawContent = openaiData?.choices?.[0]?.message?.content?.trim();

        if (!rawContent) {
            console.error('[ai-insight] OpenAI returned empty content.');
            return res.status(503).json({ error: 'AI insight temporarily unavailable.' });
        }

        // Parse the JSON response from the model
        let insight;
        try {
            // Strip markdown code fences if the model added them despite instructions
            const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            insight = JSON.parse(cleaned);
        } catch {
            console.error('[ai-insight] Failed to parse model JSON response:', rawContent);
            return res.status(503).json({ error: 'AI insight temporarily unavailable.' });
        }

        // Validate required fields
        if (!insight.assessment || !insight.explanation || !insight.recommendation) {
            console.error('[ai-insight] Model response missing required fields:', insight);
            return res.status(503).json({ error: 'AI insight temporarily unavailable.' });
        }

        // Return clean insight to the browser — no API key ever included
        return res.status(200).json({
            assessment: String(insight.assessment),
            explanation: String(insight.explanation),
            recommendation: String(insight.recommendation),
            trend: insight.trend ? String(insight.trend) : null,
            generatedAt: new Date().toISOString()
        });

    } catch (networkError) {
        console.error('[ai-insight] Network error calling OpenAI:', networkError);
        return res.status(503).json({ error: 'AI insight temporarily unavailable.' });
    }
}
