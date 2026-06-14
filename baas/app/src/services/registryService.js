// app/src/services/registryService.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// 🟢 PATH UNIFICATION: Force exact target location inside the folder Litestream is watching
const dbPath = '/app/data/master_registry.db';

// Ensure the target directory frames exist on the container storage
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Open the localized master registry database connection
const registryDb = new Database(dbPath);

// ⚠️ CRITICAL INTEGRITY REQUIREMENT FOR LITESTREAM FOLDER WATCHING ⚠️
// WAL mode allows the Linux kernel to dispatch inotify file system events 
// cleanly to Litestream once a minute without locking your Node.js processes.
registryDb.pragma('journal_mode = WAL');
registryDb.pragma('synchronous = NORMAL');

// --- 1. INITIALIZE TABLES SCHEMA MATRIX ---
registryDb.exec(`
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        db_filename TEXT NOT NULL,
        visibility TEXT DEFAULT 'private'
    );

    CREATE TABLE IF NOT EXISTS file_metadata (
        id TEXT PRIMARY KEY,
        project_id INTEGER,
        original_name TEXT NOT NULL,
        mime_type TEXT,
        storage_provider TEXT NOT NULL,
        file_path TEXT NOT NULL,
        visibility TEXT DEFAULT 'public',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS platform_apps (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        runtime TEXT NOT NULL,
        source_type TEXT NOT NULL,
        repository_url TEXT,
        entry_path TEXT DEFAULT '.',
        start_command TEXT NOT NULL,
        internal_port INTEGER UNIQUE,
        status TEXT DEFAULT 'stopped',
        auto_sleep INTEGER DEFAULT 0,
        env_vars TEXT DEFAULT '',
        auto_pull INTEGER DEFAULT 1,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// --- 2. AUTOMATED LIVE SCHEMA MIGRATION PASSTHROUGH ---
try {
    const columnCheck = registryDb.prepare("PRAGMA table_info(platform_apps)").all();
    const hasAutoPullColumn = columnCheck.some(col => col.name === 'auto_pull');

    if (!hasAutoPullColumn) {
        console.log("⚠️ Schema migration detected missing 'auto_pull' column. Patching platform_apps table layout...");
        registryDb.exec("ALTER TABLE platform_apps ADD COLUMN auto_pull INTEGER DEFAULT 1;");
        console.log("✅ Schema structure patched smoothly.");
    }
} catch (migrationErr) {
    console.error("❌ Schema migration pass intercepted error:", migrationErr.message);
}

// --- 3. INITIALIZE MASTER ADMIN ---
const adminExists = registryDb.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
const secureAdminKey = process.env.MASTER_ADMIN_KEY || 'admin'; 

if (!adminExists) {
    console.log("Creating default administrator account...");
    const hash = bcrypt.hashSync(secureAdminKey, 10);
    registryDb.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
} else {
    console.log("Synchronizing administrator credentials with environment variable configuration...");
    const hash = bcrypt.hashSync(secureAdminKey, 10);
    registryDb.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(hash, 'admin');
}

// --- 4. ENGINE CORE HELPER FUNCTIONS ---
const getProjectByApiKey = (apiKey) => {
    return registryDb.prepare('SELECT * FROM projects WHERE api_key = ?').get(apiKey);
};

const createProject = (name, apiKey, dbFilename, visibility = 'private') => {
    try {
        registryDb.prepare(`
            INSERT OR IGNORE INTO projects (name, api_key, db_filename, visibility) 
            VALUES (?, ?, ?, ?)
        `).run(name, apiKey, dbFilename, visibility);
    } catch (err) {
        console.error("Error creating project:", err.message);
    }
};

module.exports = { registryDb, getProjectByApiKey, createProject };