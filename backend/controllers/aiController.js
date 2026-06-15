// Native fetch — requires Node.js 18+. No extra packages needed.
const BAAS_API_URL = process.env.BAAS_API_URL;
const BAAS_TOKEN = process.env.BAAS_TOKEN;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractGitHubRepo(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  return m ? { owner: m[1], repo: m[2].replace(/\.git$/, '') } : null;
}

function detectLinkType(url) {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/.test(url)) return 'VIDEO';
  if (/github\.com/.test(url)) return 'SOURCE';
  return null;
}

// ─── Bulletproof AI response parser ─────────────────────────────────────────
// Handles perfect JSON, Markdown-fenced JSON, and heavily Truncated/Broken JSON.

function parseAIResponse(raw) {
  if (!raw || typeof raw !== 'string') return { summary: '', content: '', techStack: '' };

  // Strip markdown formatting fences
  let text = raw.replace(/^```[a-zA-Z]*\n?/g, '').replace(/```$/g, '').trim();
  
  const startIdx = text.indexOf('{');
  if (startIdx !== -1) text = text.slice(startIdx);

  // Strategy 1: Attempt standard Parse
  try {
    const parsed = JSON.parse(text);
    if (parsed.summary !== undefined || parsed.content !== undefined) return parsed;
  } catch (e) {}

  // Strategy 2: Mathematical JSON Repair (closes missing quotes/brackets from truncated AI responses)
  let repaired = text;
  // Count unescaped quotes to see if string was left open
  const quoteCount = (repaired.replace(/\\"/g, '').match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) repaired += '"';
  if (!repaired.trim().endsWith('}')) repaired += '}';

  try {
    const parsed = JSON.parse(repaired);
    if (parsed.summary !== undefined || parsed.content !== undefined) return parsed;
  } catch (e) {}

  // Strategy 3: Hard Regex Extraction (Last resort for severely mangled generation)
  console.warn("JSON Repair failed. Using regex extraction for truncated AI response.");
  const safeExtract = (key) => {
    const regex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?="\\s*,\\s*"\\w+"\\s*:|"\\s*\\}|$)`);
    const match = text.match(regex);
    if (!match) return '';
    let val = match[1];
    
    // Clean up a hanging quote if truncated exactly at end
    if (val.endsWith('"') && !val.endsWith('\\"')) val = val.slice(0, -1);
    
    return val.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
  };

  return {
    summary: safeExtract('summary'),
    content: safeExtract('content'),
    techStack: safeExtract('techStack') || safeExtract('techstack')
  };
}

function normalizeAIResult(obj) {
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    out[key] = typeof val === 'string'
      ? val.replace(/\\n/g, '\n').trim()
      : val;
  }
  return out;
}

// ─── YouTube metadata fetch ──────────────────────────────────────────────────

async function fetchYouTubeMetadata(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const item = data?.items?.[0];
  if (!item) throw new Error('YouTube video not found');

  const snippet = item.snippet;
  const duration = item.contentDetails?.duration || '';

  const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  let readableDuration = '';
  if (durationMatch) {
    const h = durationMatch[1] ? `${durationMatch[1]}h ` : '';
    const m = durationMatch[2] ? `${durationMatch[2]}m ` : '';
    const s = durationMatch[3] ? `${durationMatch[3]}s` : '';
    readableDuration = `${h}${m}${s}`.trim();
  }

  return {
    title: snippet.title,
    channelTitle: snippet.channelTitle,
    publishedAt: snippet.publishedAt?.split('T')[0],
    description: snippet.description?.slice(0, 1500) || '',
    tags: (snippet.tags || []).slice(0, 10),
    duration: readableDuration,
    videoId,
  };
}

// ─── GitHub metadata fetch ───────────────────────────────────────────────────

async function fetchGitHubMetadata(owner, repo) {
  const headers = {
    Accept: 'application/vnd.github+json',
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
  };

  const [repoRes, readmeRes, langsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers }),
  ]);

  const repoData = await repoRes.json();
  const langsData = langsRes.ok ? await langsRes.json() : {};

  let readmeContent = '';
  if (readmeRes.ok) {
    const readmeJson = await readmeRes.json();
    if (readmeJson.content) {
      readmeContent = Buffer.from(readmeJson.content, 'base64').toString('utf-8').slice(0, 4000);
    }
  }

  const topLanguages = Object.keys(langsData).slice(0, 6);

  return {
    title: repoData.full_name || `${owner}/${repo}`,
    description: repoData.description || '',
    stars: repoData.stargazers_count || 0,
    forks: repoData.forks_count || 0,
    language: repoData.language || '',
    topics: (repoData.topics || []).slice(0, 10),
    homepage: repoData.homepage || '',
    pushedAt: repoData.pushed_at?.split('T')[0],
    repoUrl: repoData.html_url,
    languages: topLanguages,
    readme: readmeContent,
  };
}

// ─── AI generation via BAAS ─────────────────────────────────────────────────

async function callBaasAI(prompt) {
  const res = await fetch(BAAS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BAAS_TOKEN}`,
    },
    body: JSON.stringify({
      task: 'text',
      mode: 'auto',
      modelOverride: null,
      avoidModels: ['gemma-2b-it-lora'],
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BAAS AI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.success) throw new Error('BAAS AI returned failure');

  console.log("=== API NETWORK RESPONSE BODY ===\n", data);

  return data.content;
}

// ─── Build prompts (With strict JSON enforcement) ────────────────────────────

function buildYouTubePrompt(meta, userPrompt, targetType) {
  return `You are an automated, strict JSON-only serialization engine. Based on the YouTube video details below, generate structured content for a ${targetType || 'VIDEO'} portfolio entry.

VIDEO DETAILS:
- Title: ${meta.title}
- Channel: ${meta.channelTitle}
- Published: ${meta.publishedAt}
- Duration: ${meta.duration}
- Description: ${meta.description}

${userPrompt ? `ADDITIONAL CONTEXT FROM USER: ${userPrompt}` : ''}

CRITICAL INSTRUCTIONS:
- You must output exactly one valid JSON object. 
- Do NOT include any introductory sentences (e.g., "Here is the generated content:").
- Do NOT wrap the JSON inside markdown code blocks or backticks (e.g., \`\`\`json ... \`\`\`).
- Your entire response must begin with the character '{' and end with the character '}'.

JSON Schema Structure:
{
  "summary": "2-3 sentence plain description of what the video covers.",
  "content": "Rich Markdown body with ## headings and bullet points covering key topics. Format specifically for a ${targetType || 'VIDEO'} asset entrance.",
  "techStack": "Comma-separated technologies/tools shown in the video. Empty string if none."
}`;
}

function buildGitHubPrompt(meta, userPrompt, targetType) {
  return `You are an automated, strict JSON-only serialization engine. Based on the GitHub repository details below, generate structured content for a ${targetType || 'SOURCE'} portfolio entry.

REPOSITORY DETAILS:
- Name: ${meta.title}
- Description: ${meta.description}
- Primary Language: ${meta.language}
- All Languages: ${meta.languages.join(', ')}
- Topics: ${meta.topics.join(', ')}
- Stars: ${meta.stars} | Forks: ${meta.forks}
- Last Pushed: ${meta.pushedAt}

README CONTENT:
${meta.readme || 'No README available.'}

${userPrompt ? `ADDITIONAL CONTEXT FROM USER: ${userPrompt}` : ''}

CRITICAL INSTRUCTIONS:
- You must output exactly one valid JSON object. 
- Do NOT include any introductory sentences (e.g., "Here is the generated content:").
- Do NOT wrap the JSON inside markdown code blocks or backticks (e.g., \`\`\`json ... \`\`\`).
- Your entire response must begin with the character '{' and end with the character '}'.

JSON Schema Structure:
{
  "summary": "2-3 sentence plain description of what the project does and who it is for.",
  "content": "Rich Markdown write-up with ## headings (Overview, Features, Architecture/Usage). Synthesize and rewrite information from the README. Format specifically for a ${targetType || 'SOURCE'} asset entrance.",
  "techStack": "Comma-separated technologies, frameworks, and tools used."
}`;
}

// ─── Main controller exports ─────────────────────────────────────────────────

exports.analyzeLink = async (req, res) => {
  const { url, prompt: userPrompt, targetType } = req.body || {};

  if (!url) {
    return res.status(400).json({ success: false, message: 'URL is required.' });
  }

  try {
    const detectedType = detectLinkType(url);

    if (!detectedType) {
      return res.status(400).json({
        success: false,
        message: 'Only YouTube and GitHub URLs are supported for AI analysis.',
      });
    }

    let metadata = null;
    let aiPrompt = '';
    let prefill = {};
    
    // Override the detected type if user explicitly selected a different category in form
    const finalType = targetType || detectedType;

    if (detectedType === 'VIDEO') {
      const videoId = extractYouTubeId(url);
      if (!videoId) return res.status(400).json({ success: false, message: 'Could not extract YouTube video ID.' });

      metadata = await fetchYouTubeMetadata(videoId);
      aiPrompt = buildYouTubePrompt(metadata, userPrompt, finalType);

      prefill = {
        type: finalType,
        title: metadata.title,
        metaDynamic: {
          youtube_id: metadata.videoId,
          duration: metadata.duration,
        },
      };
    } else if (detectedType === 'SOURCE') {
      const repoInfo = extractGitHubRepo(url);
      if (!repoInfo) return res.status(400).json({ success: false, message: 'Could not extract GitHub repo info.' });

      metadata = await fetchGitHubMetadata(repoInfo.owner, repoInfo.repo);
      aiPrompt = buildGitHubPrompt(metadata, userPrompt, finalType);

      prefill = {
        type: finalType,
        title: metadata.title.split('/')[1] || metadata.title,
        metaDynamic: {
          repo_url: metadata.repoUrl,
          language: metadata.language,
        },
      };
    }

    const aiRawContent = await callBaasAI(aiPrompt);

    // Bulletproof JSON Parsing Call
    const aiResult = normalizeAIResult(parseAIResponse(aiRawContent));

    return res.json({
      success: true,
      detectedType,
      prefill: {
        ...prefill,
        summary: aiResult.summary || '',
        content: aiResult.content || '',
        tagsRaw: aiResult.techStack || '',
      },
    });
  } catch (err) {
    console.error('AI analyze error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'AI analysis failed.',
    });
  }
};

exports.detectType = async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ success: false, message: 'URL is required.' });

  const detectedType = detectLinkType(url);
  return res.json({ success: true, detectedType });
};