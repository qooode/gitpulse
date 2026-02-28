const eventStore = require('./eventStore');

const TONES = {
    professional: `You are a professional project update writer. Write concise, clear summaries that anyone can understand. Focus on WHAT changed and WHY it matters. Avoid technical jargon. 2-3 sentences maximum.`,
    casual: `You are a friendly project update writer. Write casual, easy-to-read summaries like you're telling a friend what happened. Keep it short and approachable. 2-3 sentences max. Use a light emoji here and there.`,
    fun: `You are an enthusiastic project update writer with personality! Make updates feel exciting and engaging. Use emojis sparingly but effectively. Keep it brief — 2-3 sentences. Make even bug fixes sound cool.`,
};

async function translate(eventData, config) {
    const aiEnabled = eventStore.getSetting('ai_enabled');
    if (aiEnabled === 'false') {
        return null;
    }

    const tone = eventStore.getSetting('ai_tone') || 'professional';
    const customPrompt = eventStore.getSetting('ai_custom_prompt');

    const systemPrompt =
        customPrompt && customPrompt.trim().length > 0
            ? customPrompt.trim()
            : TONES[tone] || TONES.professional;

    const userMessage = buildUserMessage(eventData);

    try {
        const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.ai.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/gitpulse',
                    'X-Title': 'GitPulse',
                },
                body: JSON.stringify({
                    model: config.ai.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage },
                    ],
                    max_tokens: 200,
                    temperature: 0.7,
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[AI] OpenRouter error ${response.status}: ${errText.substring(0, 200)}`);
            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error('[AI] No content in response:', JSON.stringify(data));
            return null;
        }

        return content.trim();
    } catch (err) {
        console.error('[AI] Translation failed:', err.message);
        return null;
    }
}

function buildUserMessage(eventData) {
    const parts = [`GitHub Event: ${eventData.type}`];

    if (eventData.action) parts.push(`Action: ${eventData.action}`);
    if (eventData.repo) parts.push(`Repository: ${eventData.repo}`);
    if (eventData.sender) parts.push(`By: ${eventData.sender}`);
    if (eventData.title) parts.push(`Title: ${eventData.title}`);
    if (eventData.originalSummary)
        parts.push(`Details: ${eventData.originalSummary}`);

    parts.push(
        '\nSummarize this update for non-technical people. What happened and why might it matter?'
    );

    return parts.join('\n');
}

module.exports = { translate };
