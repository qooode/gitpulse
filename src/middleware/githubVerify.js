const crypto = require('crypto');

function createWebhookVerifier(config) {
    return function verifyGitHubWebhook(req, res, next) {
        const signature = req.headers['x-hub-signature-256'];

        if (!signature) {
            console.warn('[Webhook] Request missing X-Hub-Signature-256 header');
            return res.status(401).json({ error: 'Missing signature' });
        }

        const payload =
            typeof req.rawBody === 'string'
                ? req.rawBody
                : JSON.stringify(req.body);

        const expected =
            'sha256=' +
            crypto
                .createHmac('sha256', config.github.webhookSecret)
                .update(payload)
                .digest('hex');

        const sigBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expected);

        if (
            sigBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
        ) {
            console.warn('[Webhook] Invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        next();
    };
}

module.exports = { createWebhookVerifier };
