const Database = require('better-sqlite3');
const path = require('path');

let db;

function init() {
    const dbPath = path.join(process.cwd(), 'data', 'gitpulse.db');

    const fs = require('fs');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    db = new Database(dbPath);

    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');

    db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      action TEXT DEFAULT '',
      repo TEXT NOT NULL,
      sender TEXT NOT NULL,
      sender_avatar TEXT DEFAULT '',
      title TEXT DEFAULT '',
      original_summary TEXT DEFAULT '',
      ai_summary TEXT DEFAULT '',
      url TEXT DEFAULT '',
      discord_sent INTEGER DEFAULT 0,
      error TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  `);

    const defaults = {
        ai_enabled: 'true',
        ai_tone: 'professional',
        ai_custom_prompt: '',
        hide_repo_links: 'false',
        event_push: 'true',
        event_pull_request: 'true',
        event_issues: 'true',
        event_release: 'true',
        event_star: 'true',
        event_fork: 'true',
    };

    const insertSetting = db.prepare(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
    );

    const setDefaults = db.transaction(() => {
        for (const [key, value] of Object.entries(defaults)) {
            insertSetting.run(key, value);
        }
    });

    setDefaults();
}

function saveEvent(event) {
    const stmt = db.prepare(`
    INSERT INTO events (type, action, repo, sender, sender_avatar, title, original_summary, ai_summary, url, discord_sent, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    return stmt.run(
        event.type,
        event.action || '',
        event.repo,
        event.sender,
        event.senderAvatar || '',
        event.title || '',
        event.originalSummary || '',
        event.aiSummary || '',
        event.url || '',
        event.discordSent ? 1 : 0,
        event.error || ''
    );
}

function getEvents(limit = 50, offset = 0) {
    return db
        .prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(limit, offset);
}

function getEventById(id) {
    return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

function updateEventDiscordStatus(id, sent, error) {
    db.prepare('UPDATE events SET discord_sent = ?, error = ? WHERE id = ?').run(sent ? 1 : 0, error || '', id);
}

function getEventCount() {
    return db.prepare('SELECT COUNT(*) as count FROM events').get().count;
}

function getStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM events').get().count;

    const today = db
        .prepare(
            "SELECT COUNT(*) as count FROM events WHERE date(created_at) = date('now')"
        )
        .get().count;

    const aiTranslated = db
        .prepare(
            "SELECT COUNT(*) as count FROM events WHERE ai_summary != '' AND ai_summary IS NOT NULL"
        )
        .get().count;

    const sent = db
        .prepare('SELECT COUNT(*) as count FROM events WHERE discord_sent = 1')
        .get().count;

    const failed = db
        .prepare(
            "SELECT COUNT(*) as count FROM events WHERE error != '' AND error IS NOT NULL"
        )
        .get().count;

    const byType = db
        .prepare(
            'SELECT type, COUNT(*) as count FROM events GROUP BY type ORDER BY count DESC'
        )
        .all();

    return { total, today, aiTranslated, sent, failed, byType };
}

function getSetting(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
}

function getAllSettings() {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const row of rows) {
        settings[row.key] = row.value;
    }
    return settings;
}

function setSetting(key, value) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        key,
        String(value)
    );
}

function isEventEnabled(eventType) {
    const key = `event_${eventType}`;
    const val = getSetting(key);
    return val === null || val === 'true';
}

function pruneOldEvents(days = 90) {
    const modifier = `-${days} days`;
    return db.prepare("DELETE FROM events WHERE created_at < datetime('now', ?)").run(modifier);
}

module.exports = {
    init,
    saveEvent,
    getEvents,
    getEventById,
    updateEventDiscordStatus,
    getEventCount,
    getStats,
    getSetting,
    getAllSettings,
    setSetting,
    isEventEnabled,
    pruneOldEvents,
};
