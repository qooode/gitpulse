const COLORS = {
    push: 0x5865f2,
    pull_request_opened: 0x238636,
    pull_request_merged: 0x8957e5,
    pull_request_closed: 0xda3633,
    issues_opened: 0x238636,
    issues_closed: 0x8957e5,
    release: 0xf0883e,
    star: 0xe3b341,
    fork: 0x58a6ff,
    default: 0x5865f2,
};

function buildPushEmbed(eventData, aiSummary) {
    const { extra } = eventData;
    const commitList = (extra?.commits || [])
        .map((c) => `[\`${c.sha}\`](${c.url}) ${c.message}`)
        .join('\n');

    return {
        color: COLORS.push,
        author: {
            name: eventData.sender,
            icon_url: eventData.senderAvatar,
            url: `https://github.com/${eventData.sender}`,
        },
        title: `🚀 ${eventData.title}`,
        url: eventData.url,
        description:
            aiSummary || eventData.originalSummary || 'No details available',
        fields: [
            ...(commitList
                ? [
                    {
                        name: `📝 Commits`,
                        value:
                            commitList.length > 1024
                                ? commitList.substring(0, 1021) + '...'
                                : commitList,
                    },
                ]
                : []),
            ...(extra?.filesChanged
                ? [
                    {
                        name: '📁 Files Changed',
                        value: `${extra.filesChanged}`,
                        inline: true,
                    },
                ]
                : []),
            ...(extra?.branch
                ? [
                    {
                        name: '🌿 Branch',
                        value: `\`${extra.branch}\``,
                        inline: true,
                    },
                ]
                : []),
        ],
        footer: {
            text: `${eventData.repo} • GitPulse`,
        },
        timestamp: new Date().toISOString(),
    };
}

module.exports = { build: buildPushEmbed, COLORS };
