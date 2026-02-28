const pushEmbed = require('./push');
const pullRequestEmbed = require('./pullRequest');
const releaseEmbed = require('./release');
const issueEmbed = require('./issue');
const starEmbed = require('./star');

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

function buildFallbackEmbed(eventData, aiSummary) {
    return {
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
}

module.exports = { getEmbedBuilder, shouldTranslate, buildFallbackEmbed };
