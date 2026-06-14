// app/src/controllers/paasController.js
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { registryDb } = require('../services/registryService');

const runningProcesses = {};

const deployApp = async (req, res) => {
    const { name, runtime, sourceType, repositoryUrl, startCommand, entryPath = ".", envVars = "", autoPull = true } = req.body;
    
    try {
        if (runningProcesses[name]) {
            try { if (runningProcesses[name].pid) process.kill(-runningProcesses[name].pid); } 
            catch (e) { try { runningProcesses[name].kill(); } catch (err) {} }
            delete runningProcesses[name];
        }

        let existingApp = registryDb.prepare('SELECT internal_port, id FROM platform_apps WHERE name = ?').get(name);
        const assignedPort = existingApp ? existingApp.internal_port : Math.floor(Math.random() * 1000) + 9000;
        const appId = existingApp ? existingApp.id : crypto.randomUUID();
        
        const baseDeployPath = path.join('/tmp/apps', name);
        const repoPath = path.join(baseDeployPath, 'repo'); 
        const logPath = path.join(baseDeployPath, 'app.log');

        const autoPullFlag = (autoPull === true || autoPull === 1 || autoPull === 'true') ? 1 : 0;

        registryDb.prepare(`
            INSERT OR REPLACE INTO platform_apps (id, name, runtime, source_type, repository_url, entry_path, start_command, internal_port, status, auto_sleep, env_vars, auto_pull)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'building', COALESCE((SELECT auto_sleep FROM platform_apps WHERE name = ?), 0), ?, ?)
        `).run(appId, name, runtime, sourceType, repositoryUrl, entryPath, startCommand, assignedPort, name, envVars, autoPullFlag);

        if (!res.headersSent) {
            res.json({ success: true, message: `Deployment pipeline initiated for /projects/${name}`, internal_port: assignedPort });
        }

        fs.mkdirSync(baseDeployPath, { recursive: true });

        if (fs.existsSync(repoPath) && !fs.existsSync(path.join(repoPath, '.git'))) {
            console.log(`⚠️ Orphaned repo path folder collision caught for ${name}. Executing file system clear state...`);
            fs.rmSync(repoPath, { recursive: true, force: true });
        }

        const logStream = fs.createWriteStream(logPath, { flags: 'a' });
        const workingDir = path.join(repoPath, entryPath);

        if (fs.existsSync(path.join(repoPath, '.git'))) {
            logStream.write(`\n[System] Project repository framework found intact. Triggering continuous auto-pull pass...\n`);
            
            exec(`git pull`, { cwd: repoPath }, (pullErr, stdout, stderr) => {
                logStream.write(stdout || '');
                if (pullErr) logStream.write(`[Warning] Auto-pull skipped or delayed: ${stderr || pullErr.message}\n`);
                
                triggerDependenciesAndStart(name, runtime, workingDir, startCommand, assignedPort, envVars, logStream);
            });
        } else {
            logStream.write(`\n[System] Target space validated. Initializing clean Git Clone for repository: ${repositoryUrl}\n`);
            
            exec(`git clone ${repositoryUrl} ${repoPath}`, (cloneErr) => {
                if (cloneErr) {
                    logStream.write(`[Error] Clone Pipeline failed: ${cloneErr.message}\n`);
                    return updateAppStatus(name, 'error');
                }
                triggerDependenciesAndStart(name, runtime, workingDir, startCommand, assignedPort, envVars, logStream);
            });
        }

    } catch (err) {
        console.error("PaaS execution failure caught:", err.message);
        if (res && !res.headersSent) res.status(400).json({ success: false, error: err.message });
    }
};

const triggerDependenciesAndStart = (name, runtime, workingDir, startCommand, port, envVars, logStream) => {
    let installCmd = '';
    if (runtime === 'nodejs') installCmd = 'npm install';
    else if (runtime === 'python') installCmd = 'pip install -r requirements.txt';
    else if (runtime === 'static') installCmd = 'echo "Static Frontend detected. No dependencies required."';

    logStream.write(`[System] Executing dependency installation tracking matrix: ${installCmd}\n`);
    
    exec(installCmd, { cwd: workingDir }, (err, stdout, stderr) => {
        if (stdout) logStream.write(stdout);
        if (err && runtime !== 'static') {
            logStream.write(`[Error] Dependencies compilation breakdown: ${stderr || err.message}\n`);
            return updateAppStatus(name, 'error');
        }
        logStream.write(`[System] Application layers validated successfully. Booting instance...\n`);
        startChildProcess(name, workingDir, startCommand, port, envVars);
    });
};

const wakeAppProcessDirectly = (appName) => {
    const app = registryDb.prepare('SELECT * FROM platform_apps WHERE name = ?').get(appName);
    if (!app || runningProcesses[appName]) return false;

    const baseDeployPath = path.join('/tmp/apps', app.name);
    const repoPath = path.join(baseDeployPath, 'repo');
    const workingDir = path.join(repoPath, app.entry_path || ".");

    updateAppStatus(appName, 'building');

    if (!fs.existsSync(workingDir) || !fs.existsSync(path.join(repoPath, '.git'))) {
        console.log(`[PaaS Boot Repair] Rebuilding missing file tree mappings dynamically for: ${appName}`);
        const mockReq = { body: { name: app.name, runtime: app.runtime, sourceType: app.source_type, repositoryUrl: app.repository_url, startCommand: app.start_command, entryPath: app.entry_path, envVars: app.env_vars, autoPull: app.auto_pull === 1 } };
        const mockRes = { json: () => {}, status: () => ({ json: () => {} }), headersSent: true };
        deployApp(mockReq, mockRes);
        return true;
    }

    startChildProcess(app.name, workingDir, app.start_command, app.internal_port, app.env_vars);
    return true;
};

const startChildProcess = (name, workingDir, startCommand, port, envVarsString = "") => {
    if (runningProcesses[name]) return;

    const cmdArgs = startCommand.split(' ');
    let runner = cmdArgs.shift();

    const customEnv = {};
    if (envVarsString) {
        envVarsString.split('\n').forEach(line => {
            const [key, ...val] = line.split('=');
            if (key && val.length > 0) customEnv[key.trim()] = val.join('=').trim();
        });
    }

    const childEnv = { 
        ...process.env, 
        ...customEnv, 
        PORT: port, 
        INTERNAL_PORT: port,
        HOST: '0.0.0.0',                      
        VITE_PORT: port,                      
        PUBLIC_URL: `/projects/${name}`,      
        BASE_URL: `/projects/${name}`         
    };

    const baseDeployPath = path.join('/tmp/apps', name);
    fs.mkdirSync(baseDeployPath, { recursive: true });
    const logStream = fs.createWriteStream(path.join(baseDeployPath, 'app.log'), { flags: 'a' });

    try {
        const child = spawn(runner, cmdArgs, {
            cwd: workingDir,
            env: childEnv,
            detached: true,
            shell: true 
        });

        runningProcesses[name] = child;
        updateAppStatus(name, 'running');

        child.stdout.pipe(logStream);
        child.stderr.pipe(logStream);

        child.on('error', (err) => {
            logStream.write(`\n[Fatal Process Spawn Fault]: ${err.message}\n`);
            updateAppStatus(name, 'error');
            delete runningProcesses[name];
        });

        child.on('close', (code) => {
            logStream.write(`\n[System] Sub-process terminated with operational return flag code: ${code}\n`);
            delete runningProcesses[name];
            const current = registryDb.prepare('SELECT status FROM platform_apps WHERE name = ?').get(name);
            if (current && current.status !== 'building' && current.status !== 'error') {
                updateAppStatus(name, 'stopped');
            }
        });
    } catch (spawnError) {
        logStream.write(`\n[Fatal Catch Layer Process Spawn Failure]: ${spawnError.message}\n`);
        updateAppStatus(name, 'error');
    }
};

const stopApp = (req, res) => {
    const { name } = req.body;
    if (runningProcesses[name]) {
        try { if (runningProcesses[name].pid) process.kill(-runningProcesses[name].pid); } 
        catch (e) { try { runningProcesses[name].kill(); } catch (err) {} }
        delete runningProcesses[name];
    }
    updateAppStatus(name, 'stopped');
    return res.json({ success: true, message: `Application ${name} stopped successfully.` });
};

const getAppLogs = (req, res) => {
    const { name } = req.params;
    const logPath = path.join('/tmp/apps', name, 'app.log');
    
    if (!fs.existsSync(logPath)) {
        return res.json({ success: true, logs: "[System Logs Engine] Initializing track buffer. Awaiting incoming build signals..." });
    }

    try {
        const stats = fs.statSync(logPath);
        const chunkSize = Math.min(120000, stats.size);
        const fd = fs.openSync(logPath, 'r');
        const buffer = Buffer.alloc(chunkSize);
        fs.readSync(fd, buffer, 0, chunkSize, stats.size - chunkSize);
        fs.closeSync(fd);
        
        res.json({ success: true, logs: buffer.toString('utf8') });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
};

const deleteApp = (req, res) => {
    const { name } = req.params;
    if (runningProcesses[name]) {
        try { process.kill(-runningProcesses[name].pid); } catch (e) { runningProcesses[name].kill(); }
        delete runningProcesses[name];
    }
    registryDb.prepare('DELETE FROM platform_apps WHERE name = ?').run(name);
    const baseDeployPath = path.join('/tmp/apps', name);
    if (fs.existsSync(baseDeployPath)) {
        fs.rmSync(baseDeployPath, { recursive: true, force: true });
    }
    res.json({ success: true, message: "Application data and processes completely erased." });
};

const updateAppStatus = (name, status) => {
    registryDb.prepare('UPDATE platform_apps SET status = ?, last_accessed = CURRENT_TIMESTAMP WHERE name = ?').run(status, name);
};

const restartAllActiveApps = () => {
    const activeApps = registryDb.prepare("SELECT * FROM platform_apps WHERE status IN ('running', 'building')").all();
    activeApps.forEach(app => {
        console.log(`[PaaS Startup Validation] Restoring active runtime process: ${app.name}`);
        wakeAppProcessDirectly(app.name);
    });
};

const listApps = (req, res) => {
    try {
        const apps = registryDb.prepare('SELECT * FROM platform_apps ORDER BY name ASC').all();
        res.json({ success: true, apps });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const toggleSleepMode = (req, res) => {
    const { name, auto_sleep } = req.body;
    try {
        registryDb.prepare('UPDATE platform_apps SET auto_sleep = ? WHERE name = ?').run(auto_sleep, name);
        res.json({ success: true, message: `Application ${name} sleep parameters updated.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🟢 NEW FEATURE: Public Webhook Hook catch mechanism (Runs completely out of token sessions)
const handleGithubWebhook = (req, res) => {
    const repoPayloadUrl = req.body.repository?.html_url || req.body.repository?.clone_url;
    
    if (!repoPayloadUrl) {
        return res.status(400).json({ success: false, message: 'Invalid or missing Git tracking repository data structures.' });
    }

    res.status(200).json({ success: true, message: 'Webhook registered. Evaluating automation maps...' });

    const cleanUrl = repoPayloadUrl.replace('.git', '');
    const appsToUpdate = registryDb.prepare(`
        SELECT * FROM platform_apps WHERE repository_url LIKE ? AND auto_pull = 1
    `).all(`${cleanUrl}%`);

    appsToUpdate.forEach(app => {
        console.log(`[Webhook Trigger] Automated rebuild triggered for /projects/${app.name}`);
        const mockReq = { body: { name: app.name, runtime: app.runtime, sourceType: app.source_type, repositoryUrl: app.repository_url, startCommand: app.start_command, entryPath: app.entry_path, envVars: app.env_vars, autoPull: true } };
        const mockRes = { json: () => {}, status: () => ({ json: () => {} }), headersSent: true };
        deployApp(mockReq, mockRes);
    });
};

setInterval(() => {
    try {
        const expiredApps = registryDb.prepare(`
            SELECT name FROM platform_apps 
            WHERE auto_sleep = 1 AND status = 'running' AND last_accessed < datetime('now', '-15 minutes')
        `).all();

        expiredApps.forEach(app => {
            if (runningProcesses[app.name]) {
                try { process.kill(-runningProcesses[app.name].pid); } catch (e) { runningProcesses[app.name].kill(); }
                delete runningProcesses[app.name];
            }
            registryDb.prepare("UPDATE platform_apps SET status = 'sleeping' WHERE name = ?").run(app.name);
        });
    } catch (err) {}
}, 60 * 1000);

module.exports = { 
    deployApp, stopApp, restartAllActiveApps, listApps, 
    toggleSleepMode, wakeAppProcessDirectly, getAppLogs, 
    deleteApp, handleGithubWebhook
};