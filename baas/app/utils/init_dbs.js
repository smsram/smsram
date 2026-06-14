const fs = require('fs');
const { execSync } = require('child_process');

const dbPath = '/app/data/master_registry.db';
// Write to the /app folder where User 1000 has full permission
const configPath = '/app/litestream-dynamic.yml';

// This is the starting configuration for the Master Registry (with optimization parameters)
let dynamicYaml = `access-key-id: \${B2_KEY_ID}
secret-access-key: \${B2_APPLICATION_KEY}

dbs:
  - path: /app/data/master_registry.db
    replicas:
      - type: s3
        endpoint: \${B2_ENDPOINT}
        bucket: \${B2_BUCKET}
        path: master_registry.db
        sync-interval: 1s
        checkpoint-interval: 5m
`;

try {
    // If the master registry exists, let's look inside it
    if (fs.existsSync(dbPath)) {
        const Database = require('better-sqlite3');
        const db = new Database(dbPath, { fileMustExist: true });
        
        // Find all project databases
        const projects = db.prepare('SELECT db_filename FROM projects').all();
        db.close();

        // Add each project to the Litestream configuration dynamically
        for (const project of projects) {
            const filename = project.db_filename;
            dynamicYaml += `  - path: /app/data/${filename}
    replicas:
      - type: s3
        endpoint: \${B2_ENDPOINT}
        bucket: \${B2_BUCKET}
        path: ${filename}
        sync-interval: 1s
        checkpoint-interval: 5m
`;
        }

        // Overwrite the YAML file with our new dynamic config
        fs.writeFileSync(configPath, dynamicYaml);
        console.log("✅ Litestream config dynamically generated from Master Registry.");

        // Automatically run RESTORE for all project databases found
        for (const project of projects) {
            console.log(`📥 Restoring project DB: ${project.db_filename}...`);
            try {
                // Pass the -config flag so it knows where to look
                execSync(`litestream restore -config ${configPath} -if-db-not-exists -if-replica-exists /app/data/${project.db_filename}`, { stdio: 'inherit' });
            } catch (restoreErr) {
                console.log(`⚠️ Note: ${project.db_filename} not found in B2 yet (This is normal for new databases).`);
            }
        }
    } else {
        console.log("ℹ️ First boot: Master Registry not found yet. Using base config.");
        fs.writeFileSync(configPath, dynamicYaml);
    }
} catch (err) {
    console.error("❌ Error setting up dynamic databases:", err.message);
    fs.writeFileSync(configPath, dynamicYaml); // Fallback to base config
}