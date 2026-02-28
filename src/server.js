const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { createAuthMiddleware } = require('./middleware/auth');
const { createWebhookVerifier } = require('./middleware/githubVerify');
const { createWebhookRouter } = require('./routes/webhook');
const { createDashboardRouter } = require('./routes/dashboard');

function createServer(config) {
    const app = express();

    // ─── Security ───
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'https:', 'data:'],
                },
            },
        })
    );

    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    // ─── Raw body capture for webhook signature verification ───
    app.use('/api/webhook', express.json({
        limit: '1mb',
        verify: (req, _res, buf) => {
            req.rawBody = buf.toString();
        },
    }));

    // ─── Body parsing for dashboard ───
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: false, limit: '100kb' }));

    // ─── Sessions ───
    app.use(
        session({
            secret: config.dashboard.sessionSecret,
            resave: false,
            saveUninitialized: false,
            name: 'gitpulse.sid',
            cookie: {
                httpOnly: true,
                secure: config.isProd,
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
            },
        })
    );

    // ─── Rate limiting ───
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: 'Too many login attempts. Try again in 15 minutes.',
        standardHeaders: true,
        legacyHeaders: false,
    });

    const webhookLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
    });

    // ─── Views ───
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '..', 'views'));

    // ─── Static files ───
    app.use(express.static(path.join(__dirname, '..', 'public')));

    // ─── Auth middleware ───
    const auth = createAuthMiddleware(config);
    const verifyWebhook = createWebhookVerifier(config);

    // ─── Health check ───
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // ─── Routes ───
    app.post('/login', loginLimiter);
    app.use('/api', webhookLimiter, createWebhookRouter(config, verifyWebhook));
    app.use('/', createDashboardRouter(config, auth));

    // ─── 404 ───
    app.use((_req, res) => {
        res.redirect('/login');
    });

    // ─── Error handler ───
    app.use((err, _req, res, _next) => {
        console.error('[Server] Unhandled error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    return app;
}

module.exports = { createServer };
