function parse(eventType, payload) {
    const repo = payload.repository?.full_name || 'unknown/repo';
    const sender = payload.sender?.login || 'unknown';
    const senderAvatar = payload.sender?.avatar_url || '';

    const base = { type: eventType, repo, sender, senderAvatar, action: '' };

    switch (eventType) {
        case 'push':
            return parsePush(base, payload);
        case 'pull_request':
            return parsePullRequest(base, payload);
        case 'issues':
            return parseIssue(base, payload);
        case 'release':
            return parseRelease(base, payload);
        case 'star':
        case 'watch':
            return parseStar(base, payload);
        case 'fork':
            return parseFork(base, payload);
        default:
            return {
                ...base,
                title: `${eventType} event`,
                originalSummary: `A ${eventType} event occurred on ${repo}`,
                url: payload.repository?.html_url || '',
            };
    }
}

function parsePush(base, payload) {
    const commits = payload.commits || [];
    const branch = (payload.ref || '').replace('refs/heads/', '');
    const commitMessages = commits
        .map((c) => `• ${c.message.split('\n')[0]}`)
        .join('\n');

    const filesChanged = new Set();
    commits.forEach((c) => {
        (c.added || []).forEach((f) => filesChanged.add(f));
        (c.modified || []).forEach((f) => filesChanged.add(f));
        (c.removed || []).forEach((f) => filesChanged.add(f));
    });

    return {
        ...base,
        action: 'pushed',
        title: `${commits.length} commit${commits.length === 1 ? '' : 's'} to ${branch}`,
        originalSummary: commitMessages || 'No commit messages',
        url: payload.compare || payload.repository?.html_url || '',
        extra: {
            branch,
            commitCount: commits.length,
            commits: commits.slice(0, 5).map((c) => ({
                sha: c.id?.substring(0, 7) || '',
                message: c.message.split('\n')[0],
                url: c.url || '',
                author: c.author?.username || c.author?.name || '',
            })),
            filesChanged: filesChanged.size,
            forced: payload.forced || false,
        },
    };
}

function parsePullRequest(base, payload) {
    const pr = payload.pull_request || {};
    const action = payload.action || '';

    return {
        ...base,
        action,
        title: pr.title || 'Pull Request',
        originalSummary: pr.body
            ? pr.body.substring(0, 500)
            : 'No description provided',
        url: pr.html_url || '',
        extra: {
            number: pr.number,
            state: pr.state,
            merged: pr.merged || false,
            additions: pr.additions || 0,
            deletions: pr.deletions || 0,
            changedFiles: pr.changed_files || 0,
            baseBranch: pr.base?.ref || '',
            headBranch: pr.head?.ref || '',
            labels: (pr.labels || []).map((l) => l.name),
        },
    };
}

function parseIssue(base, payload) {
    const issue = payload.issue || {};
    const action = payload.action || '';

    return {
        ...base,
        action,
        title: issue.title || 'Issue',
        originalSummary: issue.body
            ? issue.body.substring(0, 500)
            : 'No description provided',
        url: issue.html_url || '',
        extra: {
            number: issue.number,
            state: issue.state,
            labels: (issue.labels || []).map((l) => l.name),
        },
    };
}

function parseRelease(base, payload) {
    const release = payload.release || {};

    return {
        ...base,
        action: payload.action || 'published',
        title: release.name || release.tag_name || 'New Release',
        originalSummary: release.body
            ? release.body.substring(0, 1000)
            : 'No release notes',
        url: release.html_url || '',
        extra: {
            tagName: release.tag_name || '',
            prerelease: release.prerelease || false,
            draft: release.draft || false,
        },
    };
}

function parseStar(base, payload) {
    const action = payload.action || 'created';
    const starCount = payload.repository?.stargazers_count || 0;

    return {
        ...base,
        action,
        title: action === 'created' ? '⭐ New Star!' : 'Star removed',
        originalSummary: `${base.sender} ${action === 'created' ? 'starred' : 'unstarred'} ${base.repo}. Total stars: ${starCount}`,
        url: payload.repository?.html_url || '',
        extra: { starCount },
    };
}

function parseFork(base, payload) {
    const forkee = payload.forkee || {};

    return {
        ...base,
        action: 'created',
        title: `🍴 New Fork`,
        originalSummary: `${base.sender} forked ${base.repo} to ${forkee.full_name || 'unknown'}`,
        url: forkee.html_url || payload.repository?.html_url || '',
        extra: {
            forkFullName: forkee.full_name || '',
            forkCount: payload.repository?.forks_count || 0,
        },
    };
}

module.exports = { parse };
