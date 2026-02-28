const pushEmbed = require('./push');
const pullRequestEmbed = require('./pullRequest');
const releaseEmbed = require('./release');
const issueEmbed = require('./issue');
const starEmbed = require('./star');
const eventStore = require('../services/eventStore');

const EMBED_BUILDERS = {
    push: pushEmbed.build,
    pull_request: pullRequestEmbed.build,
    release: releaseEmbed.build,
    issues: issueEmbed.build,
    star: starEmbed.build,
    watch: starEmbed.build,
};

// Events that don't benefit from AI translation
const SKIP_AI = new Set(['star', 'watch', 'fork']);

function getEmbedBuilder(eventType) {
    return EMBED_BUILDERS[eventType] || null;
}

function shouldTranslate(eventType) {
    return !SKIP_AI.has(eventType);
}

function stripLinks(embed) {
    const hideLinks = eventStore.getSetting('hide_repo_links') === 'true';
    if (!hideLinks) return embed;

    const cleaned = { ...embed };

    // Remove embed-level URL (clickable title link)
    delete cleaned.url;

    // Remove author profile URL
    if (cleaned.author) {
        cleaned.author = { ...cleaned.author };
        delete cleaned.author.url;
    }

    // Strip markdown links from fields (commit links etc.)
    if (cleaned.fields) {
        cleaned.fields = cleaned.fields.map((f) => ({
            ...f,
            // Turn [` sha`](url) message → `sha` message
            value: f.value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
        }));
    }

    return cleaned;
}

function buildFallbackEmbed(eventData, aiSummary) {
    const embed = {
        color: 0x5865f2,
        author: {
            name: eventData.sender,
            icon_url: eventData.senderAvatar,
            url: `https://github.com/${eventData.sender}`,
        },
        title: `📌 ${eventData.type}: ${eventData.title || eventData.action || 'Update'}`,
        url: eventData.url,
        description:
            aiSummary || eventData.originalSummary || 'An event occurred.',
        footer: {
            text: `${eventData.repo} • GitPulse`,
        },
        timestamp: new Date().toISOString(),
    };
    return stripLinks(embed);
}

module.exports = { getEmbedBuilder, shouldTranslate, buildFallbackEmbed, stripLinks };
