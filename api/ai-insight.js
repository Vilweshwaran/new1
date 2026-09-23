/**
 * Vercel Serverless Function: /api/ai-insight
 *
 * Accepts POST requests from the dashboard with current sensor readings.
 * Supports multiple providers automatically based on environment variables:
 *   1. Groq (GROQ_API_KEY) - 100% Free at console.groq.com
 *   2. Google Gemini (GEMINI_API_KEY) - 100% Free at aistudio.google.com
 *   3. AWS Bedrock (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)
 *   4. OpenAI (OPENAI_API_KEY)
 *
 * SECURITY: All credentials are read server-side only.
 * They are NEVER exposed or sent to the browser.
 */

const https = require('https');

const MQ135_THRESHOLD = 600;

/**
 * Build the prompt sent to AI.
 */
function buildPrompt(air, temperature, humidity, status, recentReadings) {
    const recentSection =
        Array.isArray(recentReadings) && recentReadings.length > 1
            ? `Recent readings (last ${recentReadings.length}, oldest to newest):\n` +
              recentReadings
                  .map((r, i) => `  ${i + 1}. MQ135=${r.air}, Temp=${r.temperature}C, Humidity=${r.humidity}%`)
                  .join('\n')
            : 'No recent trend data is available.';

    return `You are an air quality assistant for an ESP8266 IoT project.

IMPORTANT CONTEXT - READ CAREFULLY:
- The "MQ135 value" is a RAW ADC sensor reading from an MQ135 gas sensor, ranging 0 to 1023.
- It is NOT an official Air Quality Index (AQI). Do NOT describe it as AQI.
- The project-specific threshold is ${MQ135_THRESHOLD}: readings BELOW ${MQ135_THRESHOLD} are classified as GOOD, readings AT OR ABOVE ${MQ135_THRESHOLD} are classified as POOR.
- Do NOT make medical claims or official environmental authority statements.
- Temperature and humidity are contextual readings from a DHT11 sensor.
- Keep your response cautious, helpful, and non-alarmist.

CURRENT SENSOR SNAPSHOT:
- MQ135 raw value: ${air} (threshold: ${MQ135_THRESHOLD})
- Status: ${status}
- Temperature: ${temperature}C
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
 * Thoroughly sanitize API keys to remove quotes, trailing/leading newlines,
 * spaces, or non-printable characters that trigger Node's "Invalid character in header content" error.
 */
function sanitizeApiKey(raw) {
    if (!raw) return '';
    let key = String(raw).trim();
    // Remove wrapping quotes if entered by user (e.g. "gsk_..." -> gsk_...)
    key = key.replace(/^["']|["']$/g, '').trim();
    // If user accidentally pasted "Bearer gsk_...", remove leading "Bearer "
    key = key.replace(/^Bearer\s+/i, '').trim();
    // Strip all whitespace, newlines, carriage returns, and non-printable characters
    key = key.replace(/[\r\n\t\s]/g, '');
    key = key.replace(/[^\x21-\x7E]/g, '');
    return key;
}

/**
 * Universal OpenAI-compatible HTTPS request helper
 * Works with Groq, Google Gemini, and OpenAI!
 */
function callOpenAICompatible(hostname, path, apiKey, model, messages) {
    return new Promise((resolve, reject) => {
        const cleanKey = sanitizeApiKey(apiKey);
        const body = JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.4,
            max_tokens: 300
        });

        const options = {
            hostname: hostname,
            path:     path,
            method:   'POST',
            headers: {
                'Content-Type':   'application/json',
                'Authorization':  `Bearer ${cleanKey}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body: data });
            });
        });

        req.on('error', reject);
        req.setTimeout(20000, () => {
            req.destroy(new Error('AI request timed out'));
        });
        req.write(body);
        req.end();
    });
}

/**
 * Call AWS Bedrock using Converse API
 */
async function callBedrock(prompt) {
    const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

    const clientConfig = { region };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        clientConfig.credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
            ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN.trim() } : {})
        };
    }

    const client = new BedrockRuntimeClient(clientConfig);
    const command = new ConverseCommand({
        modelId,
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        system: [{ text: 'You are a helpful IoT air quality assistant. Always respond with valid JSON only.' }],
        inferenceConfig: { maxTokens: 300, temperature: 0.4 }
    });

    const response = await client.send(command);
    return response?.output?.message?.content?.[0]?.text;
}

/**
 * Main serverless handler
 */
module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Determine available provider
    const groqKey    = sanitizeApiKey(process.env.GROQ_API_KEY);
    const geminiKey  = sanitizeApiKey(process.env.GEMINI_API_KEY);
    const hasAws     = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    const openaiKey  = sanitizeApiKey(process.env.OPENAI_API_KEY);

    if (!groqKey && !geminiKey && !hasAws && !openaiKey) {
        return res.status(503).json({
            error: 'No AI key configured. Add GROQ_API_KEY (Free at console.groq.com) or GEMINI_API_KEY (Free at aistudio.google.com) in Vercel Environment Variables.'
        });
    }

    // Parse and validate request body
    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body.' });
    }

    const { air, temperature, humidity, status, recentReadings } = body || {};

    if (air === undefined || temperature === undefined || humidity === undefined || !status) {
        return res.status(400).json({
            error: 'Missing required sensor fields: air, temperature, humidity, status.'
        });
    }

    const prompt = buildPrompt(
        Number(air),
        Number(temperature),
        Number(humidity),
        String(status),
        Array.isArray(recentReadings) ? recentReadings.slice(-10) : []
    );

    const messages = [
        {
            role: 'system',
            content: 'You are a helpful IoT air quality assistant. Always respond with valid JSON only.'
        },
        {
            role: 'user',
            content: prompt
        }
    ];

    let rawContent;
    let providerName = '';

    try {
        if (groqKey) {
            // --- 1. Groq (Free, ultra-fast) ---
            providerName = 'Groq (llama-3.1-8b)';
            const { statusCode, body: rawBody } = await callOpenAICompatible(
                'api.groq.com',
                '/openai/v1/chat/completions',
                groqKey,
                process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                messages
            );
            if (statusCode !== 200) {
                return res.status(503).json({ error: `Groq API error (${statusCode}): ${rawBody}` });
            }
            const data = JSON.parse(rawBody);
            rawContent = data?.choices?.[0]?.message?.content?.trim();

        } else if (geminiKey) {
            // --- 2. Google Gemini (Free tier) ---
            providerName = 'Google Gemini';
            const { statusCode, body: rawBody } = await callOpenAICompatible(
                'generativelanguage.googleapis.com',
                '/v1beta/openai/chat/completions',
                geminiKey,
                process.env.GEMINI_MODEL || 'gemini-1.5-flash',
                messages
            );
            if (statusCode !== 200) {
                return res.status(503).json({ error: `Gemini API error (${statusCode}): ${rawBody}` });
            }
            const data = JSON.parse(rawBody);
            rawContent = data?.choices?.[0]?.message?.content?.trim();

        } else if (hasAws) {
            // --- 3. AWS Bedrock ---
            providerName = 'AWS Bedrock';
            rawContent = await callBedrock(prompt);

        } else if (openaiKey) {
            // --- 4. OpenAI ---
            providerName = 'OpenAI';
            const { statusCode, body: rawBody } = await callOpenAICompatible(
                'api.openai.com',
                '/v1/chat/completions',
                openaiKey,
                'gpt-4o-mini',
                messages
            );
            if (statusCode !== 200) {
                let detail = `Status ${statusCode}`;
                try {
                    const parsed = JSON.parse(rawBody);
                    if (parsed?.error?.message) detail = parsed.error.message;
                } catch (_) {}
                return res.status(503).json({ error: `OpenAI API error (${statusCode}): ${detail}` });
            }
            const data = JSON.parse(rawBody);
            rawContent = data?.choices?.[0]?.message?.content?.trim();
        }

    } catch (err) {
        console.error('[ai-insight] Error calling AI provider:', err);
        return res.status(503).json({ error: `AI service error: ${err.message}` });
    }

    if (!rawContent) {
        return res.status(503).json({ error: 'AI returned empty content.' });
    }

    // Parse model JSON response
    let insight;
    try {
        const cleaned = rawContent
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/, '')
            .trim();
        insight = JSON.parse(cleaned);
    } catch {
        console.error('[ai-insight] Failed to parse model JSON:', rawContent);
        return res.status(503).json({ error: 'Failed to parse model insight JSON.' });
    }

    if (!insight.assessment || !insight.explanation || !insight.recommendation) {
        return res.status(503).json({ error: 'Model response missing required fields.' });
    }

    return res.status(200).json({
        assessment:     String(insight.assessment),
        explanation:    String(insight.explanation),
        recommendation: String(insight.recommendation),
        trend:          insight.trend ? String(insight.trend) : null,
        provider:       providerName,
        generatedAt:    new Date().toISOString()
    });
};
