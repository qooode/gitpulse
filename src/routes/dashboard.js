const express = require('express');
const crypto = require('crypto');
const eventStore = require('../services/eventStore');
const discordSender = require('../services/discordSender');
const embeds = require('../embeds');

function csrfCheck(req, res, next) {
    if (!req.body._csrf || req.body._csrf !== req.session.csrf) {
        return res.status(403).send('Forbidden');
    }
    next();
}

function createDashboardRouter(config, auth) {
    const router = express.Router();

    // Generate CSRF token for all requests
    router.use((req, res, next) => {
        if (req.session && !req.session.csrf) {
            req.session.csrf = crypto.randomBytes(32).toString('hex');
        }
        res.locals.csrfToken = req.session?.csrf || '';
        next();
    });

    // ─── Login ───
    router.get('/login', (req, res) => {
        if (req.session?.authenticated) return res.redirect('/');
        res.render('login', { error: null });
    });

    router.post('/login', express.urlencoded({ extended: false }), csrfCheck, auth.login);
    router.post('/logout', auth.requireAuth, csrfCheck, auth.logout);

    // ─── Dashboard Pages ───
    router.get('/', auth.requireAuth, (req, res) => {
        const stats = eventStore.getStats();
        const recentEvents = eventStore.getEvents(10);
        res.render('dashboard', { page: 'overview', stats, recentEvents });
    });

    router.get('/events', auth.requireAuth, (req, res) => {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 25;
        const offset = (page - 1) * limit;
        const events = eventStore.getEvents(limit, offset);
        const total = eventStore.getEventCount();
        const totalPages = Math.ceil(total / limit);

        res.render('events', {
            page: 'events',
            events,
            currentPage: page,
            totalPages,
            total,
        });
    });

    router.get('/settings', auth.requireAuth, (req, res) => {
        const settings = eventStore.getAllSettings();
        res.render('settings', {
            page: 'settings',
            settings,
            saved: req.query.saved === '1',
            config: {
                hasDiscord: !!config.discord.webhookUrl,
                hasAI: !!config.ai.apiKey,
                aiModel: config.ai.model,
            },
        });
    });

    router.post(
        '/settings',
        auth.requireAuth,
        express.urlencoded({ extended: false }),
        csrfCheck,
        (req, res) => {
            const allowedKeys = [
                'ai_enabled',
                'ai_tone',
                'ai_custom_prompt',
                'hide_repo_links',
                'event_push',
                'event_pull_request',
                'event_issues',
                'event_release',
                'event_star',
                'event_fork',
            ];

            const checkboxKeys = [
                'ai_enabled',
                'hide_repo_links',
                'event_push',
                'event_pull_request',
                'event_issues',
                'event_release',
                'event_star',
                'event_fork',
            ];

            // Checkboxes: if not in body, set to 'false'
            for (const key of checkboxKeys) {
                eventStore.setSetting(key, req.body[key] === 'on' ? 'true' : 'false');
            }

            // Other fields
            if (req.body.ai_tone) {
                eventStore.setSetting('ai_tone', req.body.ai_tone);
            }
            if (req.body.ai_custom_prompt !== undefined) {
                eventStore.setSetting('ai_custom_prompt', String(req.body.ai_custom_prompt).substring(0, 500));
            }

            res.redirect('/settings?saved=1');
        }
    );

    // ─── API (for dashboard JS) ───
    router.get('/api/stats', auth.requireAuth, (req, res) => {
        res.json(eventStore.getStats());
    });

    router.get('/api/events', auth.requireAuth, (req, res) => {
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const offset = parseInt(req.query.offset) || 0;
        res.json(eventStore.getEvents(limit, offset));
    });

    // ─── Resend event to Discord ───
    router.post('/api/events/:id/resend', auth.requireAuth, async (req, res) => {
        try {
            const event = eventStore.getEventById(parseInt(req.params.id));
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Rebuild the embed from stored event data
            const eventData = {
                type: event.type,
                action: event.action,
                repo: event.repo,
                sender: event.sender,
                senderAvatar: event.sender_avatar,
                title: event.title,
                originalSummary: event.original_summary,
                url: event.url,
            };

            const embedBuilder = embeds.getEmbedBuilder(event.type);
            const rawEmbed = embedBuilder
                ? embedBuilder(eventData, event.ai_summary)
                : embeds.buildFallbackEmbed(eventData, event.ai_summary);
            const embed = embeds.stripLinks(rawEmbed);

            const payload = discordSender.buildPayload(embed);
            const result = await discordSender.send(config.discord.webhookUrl, payload);

            // Update the event status in DB
            eventStore.updateEventDiscordStatus(event.id, result.success, result.error || '');

            if (result.success) {
                res.json({ success: true, message: 'Event resent to Discord' });
            } else {
                res.status(502).json({ success: false, error: result.error });
            }
        } catch (err) {
            console.error('[Dashboard] Resend error:', err);
            res.status(500).json({ error: 'Failed to resend event' });
        }
    });

    return router;
}

module.exports = { createDashboardRouter };
