#!/bin/bash
set -e

echo "--- STARTING SMSRam BaaS CLUSTER ---"
mkdir -p /app/data
mkdir -p /tmp/apps

# 1. SYSTEM RESTORATION LOGIC OVERHAUL
if [ -f "/app/data/master_registry.db" ]; then
    echo "Local Master Registry detected. Checking cloud integrity status..."
    FILESIZE=$(stat -c%s "/app/data/master_registry.db")
    if [ "$FILESIZE" -lt 25000 ]; then
        echo "⚠️ Found small placeholder database file ($FILESIZE bytes). Moving to backup to force cloud restoration..."
        mv /app/data/master_registry.db /app/data/master_registry.db.placeholder
    fi
fi

echo "Checking Backblaze B2 for Master Registry..."

# 🟢 PERMANENT CONFIG: Removed the hardcoded -generation flag!
# Litestream will now automatically locate and download the MOST RECENT backup on boot.
litestream restore -config /app/litestream.yml -if-db-not-exists -if-replica-exists /app/data/master_registry.db

# 2. Run the Dynamic Database Configurator
echo "Running Dynamic Litestream Configurator..."
/usr/local/bin/node /app/app/utils/init_dbs.js || echo "Warning: init_dbs.js failed, skipping dynamic config"

# 3. LIFECYCLE HOOK TRAP: Executed on stops, sleeps, restarts, or evictions
cleanup() {
    echo "🚨 SHUTDOWN SIGNAL DETECTED: Space is stopping, restarting, or sleeping!"
    echo "🔄 Flushing all pending WAL logs across your database fleet to Backblaze B2..."
    
    if litestream sync -config /app/litestream.yml; then
        echo "✅ Fleet successfully synchronized to the cloud. Safe to stop."
    else
        echo "❌ Critical: Failed to flush local changes to cloud during shutdown sequence."
    fi
    exit 0
}

# Trap SIGTERM (Hugging Face space sleep/stop) and SIGINT (manual cancellation commands)
trap 'cleanup' SIGTERM SIGINT

# 4. Start Litestream Replication & API Core Server
echo "Starting Litestream active replication folder watching engine..."
if [ -f "/app/litestream-dynamic.yml" ]; then
    litestream replicate -config /app/litestream-dynamic.yml -exec "/usr/local/bin/node --max-old-space-size=4096 /app/app/src/server.js" &
else
    litestream replicate -config /app/litestream.yml -exec "/usr/local/bin/node --max-old-space-size=4096 /app/app/src/server.js" &
fi

# Capture the background replication task process ID and wait on it
LITESTREAM_PID=$!
wait $LITESTREAM_PID