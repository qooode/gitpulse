const COLORS = {
    push: 0xd4d4d4,
    pull_request_opened: 0x4ade80,
    pull_request_merged: 0xa3a3a3,
    pull_request_closed: 0xf87171,
    issues_opened: 0x4ade80,
    issues_closed: 0xa3a3a3,
    release: 0xe5e5e5,
    star: 0xfbbf24,
    fork: 0xd4d4d4,
    default: 0xd4d4d4,
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
