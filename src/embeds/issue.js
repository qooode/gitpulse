const COLORS = {
    opened: 0x238636,
    closed: 0x8957e5,
    reopened: 0x238636,
    default: 0x5865f2,
};

function build(eventData, aiSummary) {
    const { extra, action } = eventData;

    let emoji = '📋';
    if (action === 'opened') emoji = '🐛';
    else if (action === 'closed') emoji = '✅';
    else if (action === 'reopened') emoji = '🔄';

    const color = COLORS[action] || COLORS.default;

    const fields = [];

    if (extra?.labels?.length) {
        fields.push({
            name: '🏷️ Labels',
            value: extra.labels.map((l) => `\`${l}\``).join(' '),
        });
    }

    return {
        color,
        author: {
            name: eventData.sender,
            icon_url: eventData.senderAvatar,
            url: `https://github.com/${eventData.sender}`,
        },
        title: `${emoji} Issue #${extra?.number || ''} ${action}: ${eventData.title}`,
        url: eventData.url,
        description:
            aiSummary || eventData.originalSummary || 'No description provided',
        fields,
        footer: {
            text: `${eventData.repo} • GitPulse`,
        },
        timestamp: new Date().toISOString(),
    };
}

module.exports = { build };
