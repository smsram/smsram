// app/src/server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Controllers
// 🟢 UPDATED: Imported getProjectConnectionDetails from the database controller group
const { executeQuery, getRows, insertRow, getProjectConnectionDetails } = require('./controllers/dbController');
const { uploadFile, viewFile, deleteFile, previewFileAsHtml } = require('./controllers/storageController');
const { getSystemStats, listAllProjects, listAllFiles, executeAdminQuery, createHubProject, adminUploadFile, adminDeleteFile } = require('./controllers/hubController');
const { getProjectByApiKey, createProject, registryDb } = require('./services/registryService');
const { executeAI, getModelRegistryMap, extractDocumentContent } = require('./controllers/aiController');
const { loginAdmin } = require('./controllers/authController');

// PaaS controllers
const { 
    deployApp, stopApp, restartAllActiveApps, listApps, 
    toggleSleepMode, getAppLogs, deleteApp, handleGithubWebhook 
} = require('./controllers/paasController');

const app = express();
app.use(cors());

// --- PAAS REVERSE PROXY LAYER ENGINE ---
app.use('/projects/:appName', async (req, res, next) => {
    const { appName } = req.params;
    
    try {
        const appConfig = registryDb.prepare('SELECT internal_port, status FROM platform_apps WHERE name = ?').get(appName);
        
        if (!appConfig) {
            return res.status(404).json({ error: `PaaS App space route '/projects/${appName}' is not registered.` });
        }
        if (appConfig.status !== 'running') {
            return res.status(503).json({ error: `Application /projects/${appName} is offline or sleeping.` });
        }

        registryDb.prepare('UPDATE platform_apps SET last_accessed = CURRENT_TIMESTAMP WHERE name = ?').run(appName);

        return createProxyMiddleware({
            target: `http://127.0.0.1:${appConfig.internal_port}`,
            changeOrigin: true,
            pathRewrite: (pathStr) => {
                const baseSegment = `/projects/${appName}`;
                let remaining = pathStr.startsWith(baseSegment) ? pathStr.substring(baseSegment.length) : pathStr;
                return remaining.startsWith('/') ? remaining : '/' + remaining;
            },
            logLevel: 'silent',
            onError: (err, proxyReq, proxyRes) => {
                if (!proxyRes.headersSent) {
                    proxyRes.status(502).json({ error: "Bad Gateway: Remote process unreachable or starting up." });
                }
            }
        })(req, res, next);

    } catch (e) {
        next();
    }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const upload = multer({ storage: multer.memoryStorage() });

const JWT_SECRET = process.env.JWT_SECRET;

// --- SEED INITIAL PROJECTS REMOVED ---
// Hardcoded definitions for CodeScript and LocalMiles have been cleared from this block.

// --- MIDDLEWARE ---
const requireProjectKey = (req, res, next) => {
    const key = req.headers.authorization?.split(' ')[1];
    const project = getProjectByApiKey(key);
    if (!project) return res.status(403).json({ error: 'Invalid Project API Key' });
    req.project = project;
    next();
};

const requireHubAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Valid Session Token Required' });
    if (!JWT_SECRET) return res.status(500).json({ error: 'Server Error: JWT_SECRET variable is missing' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') throw new Error('Unauthorized role');
        next();
    } catch (err) {
        res.status(403).json({ error: 'Session expired or invalid. Please log in again.' });
    }
};

const requireProjectKeyOrAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication token required' });

    if (JWT_SECRET) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.role === 'admin') {
                req.isAdmin = true;
                return next();
            }
        } catch (err) { /* Fall through */ }
    }

    const project = getProjectByApiKey(token);
    if (!project) return res.status(403).json({ error: 'Invalid API Key or Admin Session' });
    req.project = project;
    next();
};

// --- ROUTES ---
app.post('/api/auth/login', loginAdmin);
app.get('/api/registry', requireProjectKeyOrAdmin, getModelRegistryMap);

// Public CI/CD Webhook Endpoint
app.post('/api/webhooks/github', handleGithubWebhook);

// File System
const fsRouter = express.Router();
fsRouter.post('/upload', requireProjectKey, upload.single('file'), uploadFile);
fsRouter.delete('/delete/:id', requireProjectKey, deleteFile);
fsRouter.get('/view/:id', viewFile);
fsRouter.get('/preview/:id', previewFileAsHtml);
app.use('/api/fs', fsRouter);

// Database (Raw Queries)
const dbRouter = express.Router();
dbRouter.post('/query', requireProjectKey, executeQuery);
app.use('/api/db', dbRouter);

// REST Table Router
const tableRouter = express.Router();
tableRouter.get('/:tableName', requireProjectKey, getRows);
tableRouter.post('/:tableName', requireProjectKey, insertRow);
app.use('/api/tables', tableRouter);

// AI Proxy
const aiRouter = express.Router();
aiRouter.get('/models', getModelRegistryMap); 
aiRouter.post('/generate', requireProjectKeyOrAdmin, executeAI);
aiRouter.post('/extract-doc', requireProjectKeyOrAdmin, upload.single('file'), extractDocumentContent);
app.use('/api/ai', aiRouter);

// Hub Admin (Secure Workspace Mapping Contexts)
const hubRouter = express.Router();
hubRouter.use(requireHubAdmin); 
hubRouter.post('/files/upload', upload.single('file'), adminUploadFile);
hubRouter.delete('/files/delete/:id', adminDeleteFile);
hubRouter.get('/verify', (req, res) => res.json({ success: true, role: 'admin' }));
hubRouter.get('/stats', getSystemStats);
hubRouter.get('/projects', listAllProjects);
hubRouter.get('/files', listAllFiles);
hubRouter.post('/admin-query', executeAdminQuery);
hubRouter.post('/create-project', createHubProject);

// Private PaaS Channels
hubRouter.post('/paas/deploy', deployApp);
hubRouter.post('/paas/stop', stopApp);
hubRouter.get('/paas/apps', listApps);
hubRouter.post('/paas/sleep', toggleSleepMode);
hubRouter.get('/paas/logs/:name', getAppLogs);
hubRouter.delete('/paas/delete/:name', deleteApp);

// 🟢 NEW: Secure endpoint providing SDK connection string templates and keys to the frontend panel
hubRouter.get('/paas/project-connection/:name', getProjectConnectionDetails);

app.use('/hub', hubRouter);

app.get('/api/health', (req, res) => {
    return res.status(200).json({
        success: true,
        status: "UPTIME_OK",
        timestamp: new Date().toISOString()
    });
});

// Place it directly ABOVE this existing block:
const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`🚀 SMSRam BaaS API successfully running on port ${PORT}`);
    try {
        restartAllActiveApps();
    } catch (e) {
        console.error("[PaaS Bootstrap Check Failure]:", e.message);
    }
});