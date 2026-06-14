// app/src/controllers/dbController.js
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Global connection cache to prevent breaking file locks and transaction boundaries
const dbCache = {};

// Helper utility to resolve and establish stable connection instances with WAL support
const getProjectDatabaseInstance = (project) => {
    if (!dbCache[project.name]) {
        // Correctly maps path relative to controllers directory layout matching your project directory
        const dbPath = path.join(__dirname, `../../../data/${project.db_filename}`);
        dbCache[project.name] = new Database(dbPath);
        dbCache[project.name].pragma('journal_mode = WAL');
        console.log(`[BaaS Engine] Opened connection to ${project.name} DB (WAL Mode Active)`);
    }
    return dbCache[project.name];
};

// 1. Existing Legacy Core: Runs raw SQL query scripts
const executeQuery = (req, res) => {
    const { sql, params = [] } = req.body;
    const project = req.project; 

    try {
        const db = getProjectDatabaseInstance(project);
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
        
        let result;
        if (isSelect) {
            result = db.prepare(sql).all(...params);
        } else {
            result = db.prepare(sql).run(...params);
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error(`DB Error (${project.name}):`, error.message);
        res.status(400).json({ success: false, error: error.message });
    }
};

// 2. New REST Extension: Handles GET /api/tables/:tableName
const getRows = (req, res) => {
    const { tableName } = req.params;
    const project = req.project; // Attached by requireProjectKey middleware

    try {
        const db = getProjectDatabaseInstance(project);

        // Auto-Provision Schema: Safely verify table structure exists before reading
        db.prepare(`
            CREATE TABLE IF NOT EXISTS "${tableName}" (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // Fetch dataset collection ordered sequentially from newest down to oldest
        const rows = db.prepare(`SELECT * FROM "${tableName}" ORDER BY created_at DESC`).all();
        
        // Parse the stored JSON text column blocks back into valid JavaScript objects for your client
        const parsedData = rows.map(row => {
            try {
                return { id: row.id, ...JSON.parse(row.data), created_at: row.created_at };
            } catch (e) {
                return { id: row.id, raw_content: row.data, created_at: row.created_at };
            }
        });

        return res.json(parsedData);
    } catch (error) {
        console.error(`[REST DB READ ERROR] ${project.name} -> ${tableName}:`, error.message);
        return res.status(400).json({ success: false, error: error.message });
    }
};

// 3. New REST Extension: Handles POST /api/tables/:tableName
const insertRow = (req, res) => {
    const { tableName } = req.params;
    const project = req.project;
    const payloadData = req.body;

    try {
        const db = getProjectDatabaseInstance(project);

        // Auto-Provision Schema: Safely build table workspace parameters if first boot write occurs
        db.prepare(`
            CREATE TABLE IF NOT EXISTS "${tableName}" (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // Generate clean unique alphanumeric UUID fallback string
        const generatedUuid = crypto.randomUUID();
        const stringifiedPayload = JSON.stringify(payloadData);
        
        db.prepare(`INSERT INTO "${tableName}" (id, data) VALUES (?, ?)`).run(generatedUuid, stringifiedPayload);

        return res.json({ 
            success: true, 
            message: `Data row safely committed to ${tableName}.`, 
            id: generatedUuid 
        });
    } catch (error) {
        console.error(`[REST DB WRITE ERROR] ${project.name} -> ${tableName}:`, error.message);
        return res.status(400).json({ success: false, error: error.message });
    }
};

// Add this to your existing app/src/controllers/dbController.js file

// 🟢 NEW: Fetches secure connection key and format strings for a specific database workspace
const getProjectConnectionDetails = (req, res) => {
    const { name } = req.params;
    try {
        // Retrieve the private project key securely from the master tracking database registry
        const { registryDb } = require('../services/registryService');
        const project = registryDb.prepare('SELECT name, api_key, db_filename FROM projects WHERE name = ?').get(name);
        
        if (!project) {
            return res.status(404).json({ success: false, error: "Target database registry space not found." });
        }

        // Construct standardized, copy-pasteable endpoint connectivity blueprints
        const hostUrl = process.env.PUBLIC_URL || `https://${req.get('host')}`;
        
        return res.json({
            success: true,
            details: {
                name: project.name,
                apiKey: project.api_key,
                filename: project.db_filename,
                restEndpoint: `${hostUrl}/api/tables/{tableName}`,
                sqlEndpoint: `${hostUrl}/api/db/query`
            }
        });
    } catch (err) {
        console.error("Failed to compile connection blueprint strings:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Append getProjectConnectionDetails to your module.exports map
module.exports = { executeQuery, getRows, insertRow, getProjectConnectionDetails };