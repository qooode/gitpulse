const { loadConfig } = require('./config');
const { createServer } = require('./server');
const eventStore = require('./services/eventStore');

function main() {
    console.log('');
    console.log('  ╔════════════════════════════════════╗');
    console.log('  ║        ⚡ GitPulse v1.0.0          ║');
    console.log('  ║  GitHub → Discord Webhook Relay    ║');
    console.log('  ╚════════════════════════════════════╝');
    console.log('');

    // Load and validate config
    const config = loadConfig();

    // Initialize database
    eventStore.init();
    eventStore.pruneOldEvents();
    console.log('  ✅ Database initialized');

    // Create and start server
    const app = createServer(config);

    app.listen(config.port, () => {
        console.log(`  ✅ Server running on port ${config.port}`);
        console.log(`  ✅ Dashboard: http://localhost:${config.port}`);
        console.log(`  ✅ Webhook URL: http://localhost:${config.port}/api/webhook`);
        console.log(`  ✅ AI Model: ${config.ai.model}`);
        console.log('');
        console.log('  Ready to relay! 🚀');
        console.log('');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('\n  Shutting down gracefully...');
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('\n  Shutting down...');
        process.exit(0);
    });
}

main();
