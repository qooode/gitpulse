# GitPulse

GitHub → Discord webhook relay. Receives GitHub events, optionally rewrites them with AI via [OpenRouter](https://openrouter.ai), and forwards them as clean Discord embeds.

## Features

- **AI summaries** — Rewrites commit messages, PR descriptions, and release notes into readable English (via OpenRouter)
- **Discord embeds** — Color-coded, structured embeds per event type
- **Admin dashboard** — Password-protected panel for monitoring events and tweaking settings
- **Event filtering** — Toggle which GitHub events get forwarded
- **Docker-ready** — Single container, works with Coolify, Railway, etc.
- **Lightweight** — Express, SQLite, native `fetch()`. No bloat.

## Supported Events

| Event | What it does |
|---|---|
| `push` | Summarizes pushed commits |
| `pull_request` | Explains opened/merged/closed PRs |
| `issues` | Formats new or closed issues |
| `release` | Announces new releases |
| `star` | Notifies on new stars |
| `fork` | Notifies on forks |

## Quick Start

**Requirements:** Node.js 20+ (or Docker), a [Discord webhook URL](https://support.discord.com/hc/en-us/articles/228383668), and an [OpenRouter API key](https://openrouter.ai/keys).

```bash
git clone https://github.com/YOUR_USERNAME/gitpulse.git
cd gitpulse
npm install
cp .env.example .env   # fill in your values
npm run dev
```

Or with Docker:

```bash
docker compose up -d
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DASHBOARD_USERNAME` | Yes | Dashboard login username |
| `DASHBOARD_PASSWORD` | Yes | Dashboard login password (min 8 chars) |
| `SESSION_SECRET` | Yes | Session encryption key (min 32 chars) |
| `GITHUB_WEBHOOK_SECRET` | Yes | Secret for webhook signature verification |
| `DISCORD_WEBHOOK_URL` | Yes | Discord webhook URL |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `OPENROUTER_MODEL` | No | AI model (default: `google/gemini-2.0-flash-001`) |
| `PORT` | No | Server port (default: `3000`) |
| `NODE_ENV` | No | `production` or `development` (default: `development`) |

### Dashboard Settings

Configurable at runtime without restarting:

- **AI Tone** — Professional, Casual, or Fun
- **Custom Prompt** — Override the default AI system prompt
- **Event Toggles** — Enable/disable specific event types

## GitHub Webhook Setup

1. Repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL:** `https://your-domain.com/api/webhook`
3. **Content type:** `application/json`
4. **Secret:** Same value as your `GITHUB_WEBHOOK_SECRET`
5. **Events:** Select the ones you want, or "Send me everything"

## Deployment

### Coolify

1. Connect your repo
2. Build pack: **Dockerfile**
3. Add environment variables
4. Deploy

### Railway / Render

1. Connect your repo
2. Set environment variables
3. Deploy — the `/health` endpoint handles health checks automatically

### Manual Docker

```bash
docker run -d \
  --name gitpulse \
  -p 3000:3000 \
  -e DASHBOARD_USERNAME=admin \
  -e DASHBOARD_PASSWORD=your-secure-password \
  -e SESSION_SECRET=$(openssl rand -hex 48) \
  -e GITHUB_WEBHOOK_SECRET=your-github-secret \
  -e DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  -v gitpulse-data:/app/data \
  --restart unless-stopped \
  gitpulse
```

## Security

- HMAC SHA-256 webhook signature verification
- Timing-safe password comparison (`crypto.timingSafeEqual`)
- Rate limiting (10 login attempts / 15min, 60 webhooks / min)
- HTTP-only, same-site session cookies
- Security headers via Helmet (CSP included)
- Refuses to start without all required secrets configured

## License

MIT
