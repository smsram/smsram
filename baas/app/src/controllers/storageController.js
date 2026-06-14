const { StorageFactory } = require('../services/storageFactory');
const { registryDb } = require('../services/registryService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Import your new utils
const { docxToHtml } = require('../../utils/renderDocx');
const { complexDocToHtml } = require('../../utils/renderComplexDoc');

const uploadFile = async (req, res) => {
    const { bucket = 'default', provider = 'hf', visibility = 'public' } = req.body;
    const file = req.file; 
    
    if (!file) return res.status(400).send("No file uploaded");

    const fileId = uuidv4();
    const filename = `${fileId}-${file.originalname}`;

    try {
        const result = await StorageFactory.upload(file.buffer, {
            project_id: req.project.id, bucket, filename
        }, provider);

        registryDb.prepare(`
            INSERT INTO file_metadata (id, project_id, original_name, mime_type, storage_provider, file_path, visibility)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(fileId, req.project.id, file.originalname, file.mimetype, result.provider, result.path, visibility);

        res.json({ success: true, id: fileId, visibility });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const viewFile = async (req, res) => {
    const { id } = req.params;
    const meta = registryDb.prepare('SELECT * FROM file_metadata WHERE id = ?').get(id);

    if (!meta) return res.status(404).send("File not found");

    // PRIVACY CHECK
    if (meta.visibility === 'private') {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(403).send("This file is private. API Key required.");
        
        const apiKey = authHeader.split(' ')[1];
        const project = registryDb.prepare('SELECT * FROM projects WHERE id = ? AND api_key = ?').get(meta.project_id, apiKey);
        if (!project) return res.status(403).send("Invalid API Key for this private file.");
    }

    try {
        const streamResponse = await StorageFactory.getStream(meta.file_path, meta.storage_provider);
        res.setHeader('Content-Type', meta.mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${meta.original_name}"`);
        streamResponse.data.pipe(res);
    } catch (err) {
        res.status(500).send("Storage retrieval error");
    }
};

const deleteFile = async (req, res) => {
    const { id } = req.params;
    const meta = registryDb.prepare('SELECT * FROM file_metadata WHERE id = ? AND project_id = ?').get(id, req.project.id);

    if (!meta) return res.status(404).json({ error: "File not found or unauthorized" });

    // 1. Remove from SQLite Database
    registryDb.prepare('DELETE FROM file_metadata WHERE id = ?').run(id);

    // 2. Note: For a complete system, call StorageFactory.delete(meta.file_path) here.
    // HF Datasets don't support single-file physical REST deletion easily, so we soft-delete.
    
    res.json({ success: true, message: "File removed from registry" });
};

const previewFileAsHtml = async (req, res) => {
    const { id } = req.params;
    const meta = registryDb.prepare('SELECT * FROM file_metadata WHERE id = ?').get(id);

    if (!meta) return res.status(404).send("File not found");

    try {
        const tmpDir = path.join(__dirname, '../../../tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        
        const localTmpPath = path.join(tmpDir, `${meta.id}${path.extname(meta.original_name).toLowerCase()}`);
        const ext = path.extname(meta.original_name).toLowerCase();
        
        const streamResponse = await StorageFactory.getStream(meta.file_path, meta.storage_provider);
        const writer = fs.createWriteStream(localTmpPath);
        streamResponse.data.pipe(writer);

        writer.on('finish', async () => {
            try {
                let renderedHtml = '';

                // Delegate layout generation
                if (ext === '.pdf' || ext === '.pptx' || ext === '.ppt' || ext === '.docx' || ext === '.doc') {
                    renderedHtml = await complexDocToHtml(localTmpPath, ext);
                } else if (ext === '.txt' || ext === '.json' || ext === '.csv') {
                    const text = fs.readFileSync(localTmpPath, 'utf8');
                    renderedHtml = `<pre style="padding: 20px; color: #a6e22e; background: #272822; font-family: monospace; overflow-x: auto; border-radius: 4px;"><code>${text}</code></pre>`;
                } else {
                    renderedHtml = `<div style="display:flex; justify-content:center;"><img src="/api/fs/view/${id}" style="max-width:100%; height:auto; box-shadow:0 4px 20px rgba(0,0,0,0.15); border-radius:4px;"/></div>`;
                }

                fs.unlink(localTmpPath, () => {});

                res.setHeader('Content-Type', 'text/html');
                
                // If it's a direct complex compilation, serve the output straight away to preserve embedded CSS blocks
                if (ext === '.pdf' || ext === '.pptx' || ext === '.ppt' || ext === '.docx' || ext === '.doc') {
                    res.send(renderedHtml);
                } else {
                    res.send(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <style>
                                body { background-color: #f5f5f5; margin: 0; padding: 40px; font-family: system-ui, sans-serif; display: flex; justify-content: center; }
                                ::selection { background: #f57f15; color: white; }
                            </style>
                        </head>
                        <body>
                            <div style="width: 100%; max-width: 900px;">${renderedHtml}</div>
                        </body>
                        </html>
                    `);
                }
            } catch (err) {
                fs.unlink(localTmpPath, () => {});
                res.status(500).send(`Render crash: ${err.message}`);
            }
        });
    } catch (err) {
        res.status(500).send("Storage extraction error");
    }
};

module.exports = { uploadFile, viewFile, deleteFile, previewFileAsHtml };