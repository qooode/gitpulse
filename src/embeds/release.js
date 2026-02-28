function build(eventData, aiSummary) {
    const { extra } = eventData;

    const emoji = extra?.prerelease ? '🧪' : '🎉';
    const label = extra?.prerelease ? 'Pre-release' : 'Release';

    return {
        color: 0xf0883e,
        author: {
            name: eventData.sender,
            icon_url: eventData.senderAvatar,
            url: `https://github.com/${eventData.sender}`,
        },
        title: `${emoji} ${label}: ${eventData.title}`,
        url: eventData.url,
        description:
            aiSummary || eventData.originalSummary || 'No release notes provided',
        fields: [
            ...(extra?.tagName
                ? [{ name: '🏷️ Tag', value: `\`${extra.tagName}\``, inline: true }]
                : []),
        ],
        footer: {
            text: `${eventData.repo} • GitPulse`,
        },
        timestamp: new Date().toISOString(),
    };
}

module.exports = { build };
