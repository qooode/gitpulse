function build(eventData) {
    const { extra, action } = eventData;

    if (action === 'deleted') {
        return {
            color: 0x8b8d97,
            description: `💫 **${eventData.sender}** unstarred **${eventData.repo}** (${extra?.starCount || '?'} ⭐)`,
            footer: { text: 'GitPulse' },
            timestamp: new Date().toISOString(),
        };
    }

    return {
        color: 0xe3b341,
        author: {
            name: eventData.sender,
            icon_url: eventData.senderAvatar,
            url: `https://github.com/${eventData.sender}`,
        },
        title: `⭐ New Star!`,
        url: eventData.url,
        description: `**${eventData.sender}** starred **${eventData.repo}**!\n\nTotal stars: **${extra?.starCount || '?'}** ⭐`,
        footer: {
            text: `${eventData.repo} • GitPulse`,
        },
        timestamp: new Date().toISOString(),
    };
}

module.exports = { build };
