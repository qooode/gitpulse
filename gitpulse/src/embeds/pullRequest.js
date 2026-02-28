const COLORS = {
    opened: 0x238636,
    merged: 0x8957e5,
    closed: 0xda3633,
    reopened: 0x238636,
    default: 0x5865f2,
};

function build(eventData, aiSummary) {
    const { extra, action } = eventData;
    const isMerged = extra?.merged;

    let emoji = '📋';
    let colorKey = action;

    if (isMerged) {
        emoji = '🔀';
        colorKey = 'merged';
    } else if (action === 'opened') {
        emoji = '✨';
    } else if (action === 'closed') {
        emoji = '❌';
    }

    const color = COLORS[colorKey] || COLORS.default;

    const fields = [];

    if (extra?.changedFiles) {
        fields.push({
            name: '📁 Files Changed',
            value: `${extra.changedFiles}`,
            inline: true,
        });
    }

    if (extra?.additions !== undefined || extra?.deletions !== undefined) {
        fields.push({
            name: '📊 Changes',
            value: `+${extra.additions || 0} / -${extra.deletions || 0}`,
            inline: true,
        });
    }

    if (extra?.baseBranch && extra?.headBranch) {
        fields.push({
            name: '🌿 Branch',
            value: `\`${extra.headBranch}\` → \`${extra.baseBranch}\``,
            inline: true,
        });
    }

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
        title: `${emoji} PR #${extra?.number || ''} ${action}: ${eventData.title}`,
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
