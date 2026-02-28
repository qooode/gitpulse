const crypto = require('crypto');

const REQUIRED_VARS = [
  'DASHBOARD_USERNAME',
  'DASHBOARD_PASSWORD',
  'SESSION_SECRET',
  'GITHUB_WEBHOOK_SECRET',
  'DISCORD_WEBHOOK_URL',
  'OPENROUTER_API_KEY',
];

function loadConfig() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n╔══════════════════════════════════════════════════╗');
    console.error('║  ❌  GitPulse — Missing required env variables   ║');
    console.error('╠══════════════════════════════════════════════════╣');
    missing.forEach((key) => {
      console.error(`║  • ${key.padEnd(45)}║`);
    });
    console.error('╠══════════════════════════════════════════════════╣');
    console.error('║  Copy .env.example to .env and fill in values   ║');
    console.error('╚══════════════════════════════════════════════════╝\n');
    process.exit(1);
  }

  if (process.env.DASHBOARD_PASSWORD.length < 8) {
    console.error('\n❌  DASHBOARD_PASSWORD must be at least 8 characters.\n');
    process.exit(1);
  }

  if (process.env.SESSION_SECRET.length < 32) {
    console.error('\n❌  SESSION_SECRET must be at least 32 characters.\n');
    process.exit(1);
  }

  if (!process.env.DISCORD_WEBHOOK_URL.startsWith('https://discord.com/api/webhooks/')) {
    console.error('\n❌  DISCORD_WEBHOOK_URL must be a valid Discord webhook URL.\n');
    process.exit(1);
  }

  return Object.freeze({
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProd: process.env.NODE_ENV === 'production',

    dashboard: {
      username: process.env.DASHBOARD_USERNAME,
      passwordHash: crypto.scryptSync(process.env.DASHBOARD_PASSWORD, process.env.SESSION_SECRET, 64),
      sessionSecret: process.env.SESSION_SECRET,
    },

    github: {
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    },

    discord: {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    },

    ai: {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
    },
  });
}

module.exports = { loadConfig };
