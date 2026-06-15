// app/src/controllers/aiController.js
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const pdfImgConvert = require('pdf-img-convert');
const Tesseract = require('tesseract.js');
const crypto = require('crypto');

const PROVIDER_POOL = {
    default: [
        { name: 'Cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', model: 'llama3.1-8b', token: 'CEREBRAS_API_KEY', maxOutput: 8192, supportsVision: false },
        { name: 'Cloudflare', url: `https://api.cloudflare.com/client/v4/accounts/{{ACCOUNT_ID}}/ai/run/@cf/google/gemma-2b-it-lora`, model: '@cf/google/gemma-2-2b-it-lora', token: 'CF_API_TOKEN', maxOutput: 4096, isCloudflare: true, supportsVision: false },
        { name: 'Cloudflare Vision', url: `https://api.cloudflare.com/client/v4/accounts/{{ACCOUNT_ID}}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`, model: '@cf/meta/llama-3.2-11b-vision-instruct', token: 'CF_API_TOKEN', maxOutput: 4096, isCloudflare: true, supportsVision: true },
        { name: 'Mistral', url: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-small-latest', token: 'MISTRAL_API_KEY', maxOutput: 8192, supportsVision: true }
    ],
    thinking: [
        { name: 'Mistral', url: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-large-latest', token: 'MISTRAL_API_KEY', maxOutput: 8192, supportsVision: true }
    ],
    pro: [
        { name: 'Cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', model: 'gpt-oss-120b', token: 'CEREBRAS_API_KEY', maxOutput: 8192, supportsVision: false },
        { name: 'Cloudflare', url: `https://api.cloudflare.com/client/v4/accounts/{{ACCOUNT_ID}}/ai/run/@cf/google/gemma-4-26b-a4b-it`, model: '@cf/google/gemma-4-26b-a4b-it', token: 'CF_API_TOKEN', maxOutput: 4096, isCloudflare: true, supportsVision: true },
        { name: 'Mistral', url: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-large-latest', token: 'MISTRAL_API_KEY', maxOutput: 8192, supportsVision: true }
    ],
    embeddings: [
        { name: 'Cloudflare', url: 'https://api.cloudflare.com/client/v4/accounts/{{ACCOUNT_ID}}/ai/run/@cf/baai/bge-large-en-v1.5', token: 'CF_API_TOKEN', isCloudflare: true }
    ],
    cloudflare_vision: [
        { name: 'Cloudflare', url: 'https://api.cloudflare.com/client/v4/accounts/{{ACCOUNT_ID}}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct', token: 'CF_API_TOKEN', maxOutput: 4096, isCloudflare: true }
    ],
    image_generation: [
        { name: 'Cloudflare Flux', url: 'https://api.cloudflare.com/client/v4/accounts/{{ACCOUNT_ID}}/ai/run/@cf/black-forest-labs/flux-1-schnell', model: '@cf/black-forest-labs/flux-1-schnell', token: 'CF_API_TOKEN', isCloudflare: true, isImage: true },
        { name: 'Cloudflare SDXL Lightning', url: 'https://api.cloudflare.com/client/v4/accounts/{{ACCOUNT_ID}}/ai/run/@cf/stabilityai/stable-diffusion-xl-lightning', model: '@cf/stabilityai/stable-diffusion-xl-lightning', token: 'CF_API_TOKEN', isCloudflare: true, isImage: true }
    ]
};

const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const getValidCredentialSet = (target) => {
    const rawKeys = process.env[target.token];
    if (!rawKeys) return null;
    const keyPool = rawKeys.split(',').map(k => k.trim()).filter(Boolean);
    if (keyPool.length === 0) return null;

    const selectedKeyIndex = Math.floor(Math.random() * keyPool.length);
    const activeKey = keyPool[selectedKeyIndex];

    if (target.isCloudflare) {
        const rawAccounts = process.env.CF_ACCOUNT_ID;
        if (!rawAccounts) return null;
        const accountPool = rawAccounts.split(',').map(a => a.trim()).filter(Boolean);
        const activeAccount = accountPool[selectedKeyIndex] || accountPool[0];
        return { apiKey: activeKey, accountId: activeAccount };
    }
    return { apiKey: activeKey };
};

const createEmbeddingsVector = async (text) => {
    const target = PROVIDER_POOL.embeddings[0];
    const credentials = getValidCredentialSet(target);
    if (!credentials) throw new Error("Missing Cloudflare Embedding Credentials.");

    const targetUrl = target.url.replace('{{ACCOUNT_ID}}', credentials.accountId);
    const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${credentials.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [text] })
    });

    if (!response.ok) throw new Error(`Embedding generation rejected with status ${response.status}`);
    const data = await response.json();
    return data.result?.data?.[0] || [];
};

const executeCloudflareVisionExtraction = async (base64Image, customPrompt) => {
    const target = PROVIDER_POOL.cloudflare_vision[0];
    const credentials = getValidCredentialSet(target);
    if (!credentials) throw new Error("Missing Cloudflare API Credentials for Vision Parsing.");

    const nativeUrl = target.url.replace('{{ACCOUNT_ID}}', credentials.accountId);

    const makeRequest = (promptText, imgBase64) => {
        const payload = { prompt: promptText, max_tokens: 3000 };
        if (imgBase64) payload.image = [...Buffer.from(imgBase64, 'base64')];
        
        return fetch(nativeUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${credentials.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    };

    let response = await makeRequest(customPrompt, base64Image);
    let data = await response.json().catch(() => ({}));
    let dataStr = JSON.stringify(data);

    if (!response.ok || data.success === false) {
        if (dataStr.includes('5016') || dataStr.includes('agree')) {
            const agreeRes = await makeRequest("agree", null);
            const agreeData = await agreeRes.json().catch(() => ({}));
            
            if (JSON.stringify(agreeData).includes('Thank you') || agreeRes.ok) {
                response = await makeRequest(customPrompt, base64Image);
                data = await response.json().catch(() => ({}));
                if (!response.ok || data.success === false) throw new Error(`Cloudflare Vision Retry Failed: ${JSON.stringify(data)}`);
            } else {
                throw new Error(`Failed to accept Meta License: ${JSON.stringify(agreeData)}`);
            }
        } else {
            throw new Error(`Cloudflare Vision Error: ${dataStr}`);
        }
    }
    
    return data.result?.response || data.result?.description || '';
};

const checkDuplicateVisualResponse = (newText, cacheMap, currentPageIndex) => {
    if (!newText || newText.length < 20) return { isDuplicate: false };
    const fingerprint = newText.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 300);
    if (cacheMap.has(fingerprint)) {
        return { isDuplicate: true, referencePage: cacheMap.get(fingerprint) };
    }
    cacheMap.set(fingerprint, currentPageIndex + 1);
    return { isDuplicate: false };
};

const getModelRegistryMap = async (req, res) => {
    return res.json({
        success: true,
        modes: ['auto', 'default', 'thinking', 'pro', 'image_generation'],
        registry: PROVIDER_POOL
    });
};

const executeAI = async (req, res) => {
    const { messages, mode = 'auto', modelOverride, stream = false, generateEmbeddings = false, avoidModels, task = 'text' } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array context payload is required." });
    }

    const modelsToAvoid = [];
    if (avoidModels) {
        const structuralList = Array.isArray(avoidModels) ? avoidModels : [avoidModels];
        structuralList.forEach(item => {
            if (typeof item === 'string' && item.trim()) modelsToAvoid.push(item.trim().toLowerCase());
        });
    }

    let containsImages = false;
    for (const msg of messages) {
        if (Array.isArray(msg.content)) {
            containsImages = msg.content.some(item => item.type === 'image_url');
        } else if (typeof msg.content === 'string' && msg.content.includes('data:image')) {
            containsImages = true;
        }
    }

    const sanitizedMessages = messages.map(msg => {
        let cleanContent = msg.content;
        if (Array.isArray(msg.content) && !containsImages) {
            cleanContent = msg.content.map(part => part.text || '').join('\n');
        }
        return { role: msg.role, content: cleanContent || '' };
    });

    let targetTier = mode;
    let targetList = [];
    
    // 1. ROUTING ALLOCATION PHASE
    if (task === 'image_generation') {
        if (modelOverride && modelOverride !== 'auto') {
            const found = PROVIDER_POOL.image_generation.find(p => p.model === modelOverride);
            if (found) targetList.push(found);
        }
        if (targetList.length === 0) {
            targetList = [...PROVIDER_POOL.image_generation];
        }
        targetTier = 'image_generation';
    } else {
        if (modelOverride && modelOverride !== 'auto') {
            const isOverriddenModelBlocked = modelsToAvoid.some(avoid => modelOverride.toLowerCase().includes(avoid));
            if (isOverriddenModelBlocked) {
                return res.status(400).json({ success: false, error: `Requested model '${modelOverride}' cannot be executed due to avoidModels settings.` });
            }

            for (const tier of ['thinking', 'pro', 'default']) {
                const found = PROVIDER_POOL[tier].find(p => p.model === modelOverride);
                if (found) { targetList.push(found); targetTier = tier; }
            }
        } else if (mode === 'pro' || mode === 'high') {
            targetList = PROVIDER_POOL.pro;
        } else if (mode === 'thinking') {
            targetList = PROVIDER_POOL.thinking;
        } else {
            targetList = shuffleArray(PROVIDER_POOL.default); 
            targetTier = 'default';
        }

        if (targetList.length === 0) {
            targetList = [...PROVIDER_POOL.default, ...PROVIDER_POOL.pro, ...PROVIDER_POOL.thinking];
            targetTier = 'auto';
        }
    }

    targetList = targetList.filter(target => {
        const fullModelIdentifier = (target.model || '').toLowerCase();
        const fullUrlIdentifier = (target.url || '').toLowerCase();
        return !modelsToAvoid.some(avoidToken => fullModelIdentifier.includes(avoidToken) || fullUrlIdentifier.includes(avoidToken));
    });

    if (targetList.length === 0) {
        return res.status(422).json({ success: false, error: "Exhausted all available engine routing pools. Your avoidModels filter parameters eliminated all target tier endpoints." });
    }

    let lastError = null;

    // 2. ACTIVE FAILOVER LOOP OPERATION
    for (let i = 0; i < targetList.length; i++) {
        const target = targetList[i];
        const credentials = getValidCredentialSet(target);
        if (!credentials) continue; 
        
        if (containsImages && !target.supportsVision && !target.isImage) continue;

        if (!containsImages && target.supportsVision && i < targetList.length - 1) {
            continue;
        }

        try {
            const headers = { 'Authorization': `Bearer ${credentials.apiKey}`, 'Content-Type': 'application/json' };
            const targetUrl = target.isCloudflare ? target.url.replace('{{ACCOUNT_ID}}', credentials.accountId) : target.url;

            let payload;
            
            if (target.isImage) {
                const promptText = sanitizedMessages.map(m => m.content).join(' ');
                payload = { prompt: promptText };
            } else if (target.isCloudflare) {
                payload = { messages: sanitizedMessages, stream };
                
                if (containsImages && target.supportsVision) {
                    let extractedBase64 = null;
                    const cfMessages = messages.map(msg => {
                        if (Array.isArray(msg.content)) {
                            const textParts = [];
                            for (const part of msg.content) {
                                if (part.type === 'text') textParts.push(part.text);
                                else if (part.type === 'image_url') {
                                    const url = part.image_url.url;
                                    if (url.startsWith('data:image')) extractedBase64 = url.split(',')[1];
                                }
                            }
                            return { role: msg.role, content: textParts.join('\n') };
                        } else if (typeof msg.content === 'string' && msg.content.includes('data:image')) {
                            const match = msg.content.match(/data:image\/[a-zA-Z]+;base64,([^"'\s]+)/);
                            if (match) extractedBase64 = match[1];
                            return { role: msg.role, content: msg.content.replace(/data:image\/[a-zA-Z]+;base64,[^"'\s]+/g, '[IMAGE_ATTACHED]') };
                        }
                        return { role: msg.role, content: msg.content };
                    });
                    
                    payload.messages = cfMessages;
                    if (extractedBase64) payload.image = [...Buffer.from(extractedBase64, 'base64')];
                }
            } else {
                payload = { model: target.model, messages: sanitizedMessages, stream };
            }

            // 🟢 DYNAMIC MAX TOKENS: Reads exactly what the provider officially supports 
            // Falls back to a safe 4096 tokens if the property is somehow missing.
            if (!target.isImage) {
                payload.max_tokens = target.maxOutput || 4096;
            }

            if (target.extraBody) payload = { ...payload, ...target.extraBody };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), target.isImage ? 30000 : 20000); 

            console.log(`[AI Broker] Attempting delivery route matrix on target: ${target.name} (${target.model}) | Output Ceiling: ${payload.max_tokens}`);
            
            const response = await fetch(targetUrl, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP Error Status ${response.status} from model endpoint target cluster channel.`);
            }

            if (target.isImage) {
                const contentType = response.headers.get('content-type') || '';
                
                if (contentType.includes('application/json')) {
                    const jsonResponse = await response.json();
                    let cleanBase64 = jsonResponse.result?.image || jsonResponse.image || '';
                    if (!cleanBase64 && jsonResponse.result) cleanBase64 = jsonResponse.result;
                    if (cleanBase64.startsWith('data:')) cleanBase64 = cleanBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

                    return res.json({
                        success: true,
                        provider: target.name,
                        model: target.model,
                        mode: targetTier,
                        task: 'image_generation',
                        thinking: '',
                        content: `data:image/jpeg;base64,${cleanBase64}`,
                        embeddings: []
                    });
                } else {
                    const arrayBuffer = await response.arrayBuffer();
                    const base64Img = Buffer.from(arrayBuffer).toString('base64');
                    const finalMime = contentType || 'image/jpeg';
                    
                    return res.json({
                        success: true,
                        provider: target.name,
                        model: target.model,
                        mode: targetTier,
                        task: 'image_generation',
                        thinking: '',
                        content: `data:${finalMime};base64,${base64Img}`,
                        embeddings: []
                    });
                }
            }

            if (stream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); 

                    for (const line of lines) {
                        const cleanLine = line.trim();
                        if (!cleanLine) continue;
                        
                        let chunkText = '';
                        let thinkingChunk = '';

                        if (cleanLine.startsWith('data:')) {
                            const rawJson = cleanLine.slice(5).trim();
                            if (rawJson === '[DONE]') continue;
                            
                            try {
                                const parsed = JSON.parse(rawJson);
                                const delta = parsed.choices?.[0]?.delta || {};
                                chunkText = delta.content || parsed.response || '';
                                thinkingChunk = delta.reasoning_content || delta.thinking || parsed.reasoning_content || '';
                            } catch (e) {}
                        }

                        if (chunkText || thinkingChunk) {
                            res.write(`data: ${JSON.stringify({
                                provider: target.name,
                                model: target.model,
                                mode: targetTier,
                                thinking: thinkingChunk,
                                content: chunkText
                            })}\n\n`);
                        }
                    }
                }
                res.write('data: [DONE]\n\n');
                return res.end();
            }

            const data = await response.json();
            const choice = data.choices?.[0]?.message || {};
            const finalContent = choice.content || data.result?.response || data.response || '';
            const finalThinking = choice.reasoning_content || choice.thinking || data.result?.reasoning_content || '';

            let vectors = [];
            if (generateEmbeddings && finalContent) {
                try { vectors = await createEmbeddingsVector(finalContent); } catch (e) { console.error(e); }
            }

            return res.json({
                success: true,
                provider: target.name,
                model: target.model,
                mode: targetTier,
                thinking: finalThinking,
                content: finalContent,
                embeddings: vectors
            });

        } catch (err) {
            console.warn(`[AI Cluster Failover] Intercepted break on ${target.name} (${target.model}): ${err.message}`);
            lastError = err;
        }
    }

    return res.status(503).json({ success: false, error: "Active network token pools exhausted.", details: lastError?.message });
};

// --- DYNAMIC SPATIAL INLINE EXTRACTION ENGINE ---
const extractDocumentContent = async (req, res) => {
    let isSSE = req.headers.accept === 'text/event-stream' || req.body.stream === 'true';
    let fullCompiledText = '';
    let globalVectors = [];
    const globalVisionCacheMap = new Map();

    try {
        if (!req.file) {
            if (isSSE) { res.setHeader('Content-Type', 'text/event-stream'); res.write(`event: error\ndata: ${JSON.stringify({ error: "No file." })}\n\n`); return res.end(); }
            return res.status(400).json({ success: false, error: "No file content payload." });
        }

        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        const generateEmbeddings = req.body.generateEmbeddings === 'true';
        const extractImages = req.body.extractImages === 'true';
        const enableImageEmbeddings = req.body.enableImageEmbeddings === 'true';

        if (isSSE) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();
            res.write(`event: init\ndata: ${JSON.stringify({ fileName, fileType: fileExtension })}\n\n`);
        }

        if (['txt', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(fileExtension)) {
            let textOutput = '';
            if (fileExtension === 'txt') textOutput = fileBuffer.toString('utf8');
            else if (['docx', 'doc'].includes(fileExtension)) { textOutput = (await mammoth.extractRawText({ buffer: fileBuffer })).value; }
            else {
                const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
                workbook.SheetNames.forEach(s => { textOutput += `\n--- Sheet: ${s} ---\n${xlsx.utils.sheet_to_txt(workbook.Sheets[s])}`; });
            }

            if (generateEmbeddings && textOutput.trim()) {
                try { globalVectors = await createEmbeddingsVector(textOutput); } catch (e) {}
            }

            if (isSSE) {
                res.write(`event: batch\ndata: ${JSON.stringify({ chunkIndex: 1, totalChunks: 1, content: textOutput.trim(), embeddings: globalVectors })}\n\n`);
                res.write(`event: done\ndata: ${JSON.stringify({ success: true })}\n\n`);
                return res.end();
            }
            return res.json({ success: true, fileName, fileType: fileExtension, content: textOutput.trim(), embeddings: globalVectors });
        }

        if (fileExtension === 'pdf') {
            const pageTexts = [];
            const render_page = async (pageData) => {
                const textContent = await pageData.getTextContent();
                let text = '';
                let lastY = -1;
                for (let item of textContent.items) {
                    if (lastY == item.transform[5] || lastY == -1){ text += item.str; } 
                    else { text += '\n' + item.str; }
                    lastY = item.transform[5];
                }
                pageTexts[pageData.pageIndex] = text;
                return text;
            };
            
            await pdfParse(fileBuffer, { pagerender: render_page });

            const pagesBase64 = await pdfImgConvert.convert(fileBuffer, { base64: true, scale: 1.2 });
            const totalPages = pagesBase64.length;

            const BATCH_SIZE = 3;
            const pageIndices = Array.from({ length: totalPages }, (_, i) => i);
            const batches = chunkArray(pageIndices, BATCH_SIZE);

            if (isSSE) res.write(`event: status\ndata: ${JSON.stringify({ message: `Executing Interleaved Extraction across ${batches.length} compute windows.` })}\n\n`);

            for (let bIdx = 0; bIdx < batches.length; bIdx++) {
                const currentBatchPages = batches[bIdx];
                let batchCombinedText = '';
                let embeddingTextAccumulator = '';

                const batchPromises = currentBatchPages.map(async (pageIndex) => {
                    const nativeText = pageTexts[pageIndex] || '';
                    let pageContentBlock = `\n--- Page ${pageIndex + 1} ---\n`;
                    let embeddingContentBlock = `\n--- Page ${pageIndex + 1} ---\n`;

                    if (nativeText.trim().length > 40) {
                        embeddingContentBlock += nativeText.trim();

                        if (extractImages) {
                            const spatialInterleavePrompt = `You are an advanced layout mapping script. Look at this document page image layout for Page ${pageIndex + 1}.
Task: Locate any floating diagrams, tree structures, graphs, flowcharts, or sketches on the canvas layout.
I have already natively extracted the text layout from this file:
"""
${nativeText.trim()}
"""
Rules:
1. Provide a detailed, technical description of the diagram, its components, labels, nodes, and connectivity flow.
2. Completely IGNORE all standard written paragraphs, text blocks, headers, and footers visible on the page canvas. Do not transcribe them.
3. Return the exact native text provided above verbatim, but insert your visual diagram analysis block directly at its corresponding spatial paragraph layout location.
4. You must wrap the visual block exactly with this tag: '::DIAGRAM_START [Page ${pageIndex + 1}]::' and end it with '::DIAGRAM_END::'.
5. If the page contains absolutely NO drawings, flowcharts, schemas, or diagrams, return the native text verbatim without creating a diagram block.`;

                            try {
                                const interwovenOutput = await executeCloudflareVisionExtraction(pagesBase64[pageIndex], spatialInterleavePrompt);
                                
                                if (interwovenOutput && !interwovenOutput.includes('AiError')) {
                                    let validatedContent = interwovenOutput;
                                    
                                    const diagramMatches = interwovenOutput.match(/::DIAGRAM_START[\s\S]*?::DIAGRAM_END::/g);
                                    if (diagramMatches) {
                                        for (let block of diagramMatches) {
                                            const coreText = block.replace(/::DIAGRAM_START.*?::/g, '').replace('::DIAGRAM_END::', '').trim();
                                            const cacheStatus = checkDuplicateVisualResponse(coreText, globalVisionCacheMap, pageIndex);
                                            
                                            if (cacheStatus.isDuplicate) {
                                                const shortHash = crypto.createHash('md5').update(coreText).digest('hex').substring(0, 6).toUpperCase();
                                                validatedContent = validatedContent.replace(block, `\n\n::DIAGRAM_START [Page ${pageIndex + 1}] [REF_ID_${shortHash}]::\n*Refer to corresponding Diagram structure context described inline on Page ${cacheStatus.referencePage}*\n::DIAGRAM_END::\n\n`);
                                            } else {
                                                const shortHash = crypto.createHash('md5').update(coreText).digest('hex').substring(0, 6).toUpperCase();
                                                validatedContent = validatedContent.replace(block, block.replace(`::DIAGRAM_START [Page ${pageIndex + 1}]::`, `::DIAGRAM_START [Page ${pageIndex + 1}] [ID_${shortHash}]::`));
                                            }
                                        }
                                    }
                                    pageContentBlock += validatedContent.trim();
                                    if (enableImageEmbeddings) embeddingContentBlock = `\n--- Page ${pageIndex + 1} ---\n` + validatedContent.trim();
                                } else {
                                    pageContentBlock += nativeText.trim();
                                }
                            } catch (err) {
                                console.warn(`[Layout Error Switch] Skipping vision mapping on page ${pageIndex + 1}: ${err.message}`);
                                pageContentBlock += nativeText.trim();
                            }
                        } else {
                            pageContentBlock += nativeText.trim();
                        }
                    } 
                    else {
                        const scanPrompt = `Transcribe this scanned page completely into structured Markdown text. If you encounter any structural drawings, schemas, or flowcharts, extract their elements directly inline. Wrap drawing descriptions inside a '::DIAGRAM_START [Page ${pageIndex + 1}]::' block tag container and close it with '::DIAGRAM_END::'. Do not write greeting or conversational remarks.`;
                        try {
                            const visionTranscribedText = await executeCloudflareVisionExtraction(pagesBase64[pageIndex], scanPrompt);
                            let finalScannedOutput = visionTranscribedText.trim();
                            
                            const diagramMatches = finalScannedOutput.match(/::DIAGRAM_START[\s\S]*?::DIAGRAM_END::/g);
                            if (diagramMatches) {
                                for (let block of diagramMatches) {
                                    const coreText = block.replace(/::DIAGRAM_START.*?::/g, '').replace('::DIAGRAM_END::', '').trim();
                                    const cacheStatus = checkDuplicateVisualResponse(coreText, globalVisionCacheMap, pageIndex);
                                    
                                    if (cacheStatus.isDuplicate) {
                                        const shortHash = crypto.createHash('md5').update(coreText).digest('hex').substring(0, 6).toUpperCase();
                                        finalScannedOutput = finalScannedOutput.replace(block, `\n\n::DIAGRAM_START [Page ${pageIndex + 1}] [REF_ID_${shortHash}]::\n*Refer to duplicate Diagram description extracted on Page ${cacheStatus.referencePage}*\n::DIAGRAM_END::\n\n`);
                                    } else {
                                        const shortHash = crypto.createHash('md5').update(coreText).digest('hex').substring(0, 6).toUpperCase();
                                        finalScannedOutput = finalScannedOutput.replace(block, block.replace(`::DIAGRAM_START [Page ${pageIndex + 1}]::`, `::DIAGRAM_START [Page ${pageIndex + 1}] [ID_${shortHash}]::`));
                                    }
                                }
                            }
                            pageContentBlock += finalScannedOutput;
                            embeddingContentBlock += finalScannedOutput;
                        } catch (vlmErr) {
                            const pageImgBuffer = Buffer.from(pagesBase64[pageIndex], 'base64');
                            const ocrResult = await Tesseract.recognize(pageImgBuffer, 'eng');
                            pageContentBlock += `\n--- [Fallback Basic OCR Output] ---\n${ocrResult.data.text}`;
                            embeddingContentBlock += `\n--- [Fallback Basic OCR Output] ---\n${ocrResult.data.text}`;
                        }
                    }
                    return { pageContentBlock, embeddingContentBlock };
                });

                const completedPagesData = await Promise.all(batchPromises);
                completedPagesData.forEach(resObj => { 
                    batchCombinedText += resObj.pageContentBlock; 
                    embeddingTextAccumulator += resObj.embeddingContentBlock;
                });

                let batchVectors = [];
                const textToVectorize = enableImageEmbeddings ? batchCombinedText : embeddingTextAccumulator;

                if (generateEmbeddings && textToVectorize.trim()) {
                    try { batchVectors = await createEmbeddingsVector(textToVectorize); } catch (e) {}
                }

                if (isSSE) {
                    res.write(`event: batch\ndata: ${JSON.stringify({ chunkIndex: bIdx + 1, totalChunks: batches.length, content: batchCombinedText.trim(), embeddings: batchVectors })}\n\n`);
                } else {
                    fullCompiledText += batchCombinedText;
                    if (batchVectors.length > 0) globalVectors = batchVectors;
                }

                batchCombinedText = null;
                embeddingTextAccumulator = null;
                await new Promise(r => setTimeout(r, 100)); 
            }

            if (isSSE) {
                res.write(`event: done\ndata: ${JSON.stringify({ success: true })}\n\n`);
                return res.end();
            }
            return res.json({ success: true, fileName, fileType: fileExtension, content: fullCompiledText.trim(), embeddings: globalVectors });
        }

        return res.status(400).json({ success: false, error: "Unsupported layout matrix configuration properties." });

    } catch (err) {
        console.error("Critical routing fault caught:", err);
        if (isSSE) { res.write(`event: error\ndata: ${JSON.stringify({ details: err.message })}\n\n`); return res.end(); }
        return res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { executeAI, getModelRegistryMap, extractDocumentContent };