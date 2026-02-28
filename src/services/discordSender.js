async function send(webhookUrl, payload) {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Discord webhook returned ${response.status}: ${errText}`);
        }

        return { success: true };
    } catch (err) {
        console.error('[Discord] Send failed:', err.message);
        return { success: false, error: err.message };
    }
}

function buildPayload(embed) {
    return {
        username: 'GitPulse',
        avatar_url: 'https://github.githubassets.com/favicons/favicon-dark.svg',
        embeds: [embed],
    };
}

module.exports = { send, buildPayload };
