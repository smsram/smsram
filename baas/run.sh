#!/bin/bash
set -e

echo "--- STARTING SMSRam BaaS CLUSTER ---"
mkdir -p /app/data
mkdir -p /tmp/apps

# 1. ANTI-ROLLBACK PURGE
# Ephemeral containers preserve files copied during the image build stage.
# We remove any stale database files baked in by the Docker build process 
# to guarantee Litestream pulls the absolute latest production state from the cloud.
echo "Clearing stale container build artifacts to ensure clean cloud restoration..."
rm -f /app/data/*.db
rm -f /app/data/*.db-wal
rm -f /app/data/*.db-shm

echo "Checking Backblaze B2 for Master Registry..."
# Restore the master registry directly from the cloud replica target
litestream restore -config /app/litestream.yml -if-replica-exists /app/data/master_registry.db

# 2. DYNAMIC SUB-DATABASE TENANT RESTORATION
if [ -f "/app/data/master_registry.db" ]; then
    echo "Master Registry successfully restored. Discovering registered sub-databases..."
    
    # Query your project records using an inline Node utility script to identify valid tenant databases
    TENANT_DBS=$(/usr/local/bin/node -e "
        try {
            const Database = require('better-sqlite3');
            const db = new Database('/app/data/master_registry.db');
            const rows = db.prepare('SELECT db_filename FROM projects').all();
            console.log(rows.map(r => r.db_filename).join(' '));
        } catch(e) {
            console.error('Failed to parse tenant data structures:', e.message);
            process.exit(0);
        }
    " 2>/dev/null || echo "")

    for DB_FILE in $TENANT_DBS; do
        if [ -n "$DB_FILE" ]; then
            echo "🔄 Restoring tenant database from cloud replica: /app/data/$DB_FILE"
            litestream restore -config /app/litestream.yml -if-replica-exists "/app/data/$DB_FILE" || echo "No remote replica found for $DB_FILE. Initializing fresh."
        fi
    done
else
    echo "No Master Registry found in cloud storage. Initializing a fresh cluster deployment profile..."
fi

# 3. RUN THE DYNAMIC DATABASE CONFIGURATOR
echo "Running Dynamic Litestream Configurator..."
/usr/local/bin/node /app/app/utils/init_dbs.js || echo "Warning: init_dbs.js failed, skipping dynamic config"

# 4. LIFECYCLE HOOK TRAP (Handles restarts, sleeps, and terminations safely)
cleanup() {
    echo "🚨 SHUTDOWN SIGNAL DETECTED: Cluster container is stopping or restarting!"
    
    # Determine the correct runtime configuration context mapping
    ACTIVE_CONFIG="/app/litestream.yml"
    if [ -f "/app/litestream-dynamic.yml" ]; then
        ACTIVE_CONFIG="/app/litestream-dynamic.yml"
    fi
    
    echo "🔄 Requesting clean exit from replication daemon process (PID: $LITESTREAM_PID)..."
    kill -15 "$LITESTREAM_PID" 2>/dev/null || true
    wait "$LITESTREAM_PID" 2>/dev/null || true
    
    echo "🔄 Executing absolute final log flush pass to Backblaze B2 using configuration: $ACTIVE_CONFIG..."
    if litestream sync -config "$ACTIVE_CONFIG"; then
        echo "✅ Cluster fleet successfully synchronized to cloud storage. Safe to terminate."
    else
        echo "❌ Critical: Final sync verification pass failed to clear local journal logs."
    fi
    exit 0
}

# Capture system signals from host container infrastructure
trap 'cleanup' SIGTERM SIGINT

# 5. EXECUTE REPLICATION ENGINE WITH FORWARDED SUBPROCESS
echo "Launching Litestream folder-watching engine and application core..."
if [ -f "/app/litestream-dynamic.yml" ]; then
    litestream replicate -config /app/litestream-dynamic.yml -exec "/usr/local/bin/node --max-old-space-size=4096 /app/app/src/server.js" &
else
    litestream replicate -config /app/litestream.yml -exec "/usr/local/bin/node --max-old-space-size=4096 /app/app/src/server.js" &
fi

LITESTREAM_PID=$!
wait $LITESTREAM_PID