const express = require('express');
const eventParser = require('../services/eventParser');
const aiTranslator = require('../services/aiTranslator');
const discordSender = require('../services/discordSender');
const eventStore = require('../services/eventStore');
const embeds = require('../embeds');

function createWebhookRouter(config, verifyWebhook) {
    const router = express.Router();

    router.post('/webhook', verifyWebhook, async (req, res) => {
        const eventType = req.headers['x-github-event'];
        const deliveryId = req.headers['x-github-delivery'];

        if (!eventType) {
            return res.status(400).json({ error: 'Missing X-GitHub-Event header' });
        }

        // GitHub sends a ping on webhook creation
        if (eventType === 'ping') {
            console.log(`[Webhook] Ping received! Zen: "${req.body.zen}"`);
            return res.json({ message: 'pong 🏓' });
        }

        // Check if this event type is enabled
        if (!eventStore.isEventEnabled(eventType)) {
            console.log(`[Webhook] Event type "${eventType}" is disabled, skipping`);
            return res.json({ message: 'Event type disabled' });
        }

        console.log(
            `[Webhook] Received ${eventType} event (delivery: ${deliveryId})`
        );

        // Respond immediately — process async
        res.json({ message: 'Event received' });

        try {
            // 1. Parse the event
            const eventData = eventParser.parse(eventType, req.body);

            // 2. AI translation (if applicable)
            let aiSummary = null;
            if (embeds.shouldTranslate(eventType)) {
                aiSummary = await aiTranslator.translate(eventData, config);
            }

            // 3. Build Discord embed
            const embedBuilder = embeds.getEmbedBuilder(eventType);
            const embed = embedBuilder
                ? embedBuilder(eventData, aiSummary)
                : embeds.buildFallbackEmbed(eventData, aiSummary);

            // 4. Send to Discord
            const payload = discordSender.buildPayload(embed);
            const result = await discordSender.send(
                config.discord.webhookUrl,
                payload
            );

            // 5. Save to database
            eventStore.saveEvent({
                ...eventData,
                aiSummary: aiSummary || '',
                discordSent: result.success,
                error: result.error || '',
            });

            if (result.success) {
                console.log(`[Webhook] ✅ ${eventType} event processed and sent to Discord`);
            } else {
                console.error(`[Webhook] ❌ Discord send failed: ${result.error}`);
            }
        } catch (err) {
            console.error(`[Webhook] Processing error:`, err);

            eventStore.saveEvent({
                type: eventType,
                repo: req.body.repository?.full_name || 'unknown',
                sender: req.body.sender?.login || 'unknown',
                senderAvatar: req.body.sender?.avatar_url || '',
                title: 'Processing error',
                originalSummary: err.message,
                aiSummary: '',
                discordSent: false,
                error: err.message,
            });
        }
    });

    return router;
}

module.exports = { createWebhookRouter };
