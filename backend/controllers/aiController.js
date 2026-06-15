// Native fetch — requires Node.js 18+. No extra packages needed.
const BAAS_API_URL = process.env.BAAS_API_URL;
const BAAS_TOKEN = process.env.BAAS_TOKEN;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const MAX_SCRAPE_CHARS = 5000; // Limits scraped text to stay within AI token limits

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
  return 'WEB'; // Fallback for all other URLs
}

// ─── Bulletproof AI response parser ─────────────────────────────────────────

function parseAIResponse(raw) {
  if (!raw || typeof raw !== 'string') return { summary: '', content: '', techStack: '' };

  let text = raw.replace(/^```[a-zA-Z]*\n?/g, '').replace(/```$/g, '').trim();
  const startIdx = text.indexOf('{');
  if (startIdx !== -1) text = text.slice(startIdx);

  try {
    const parsed = JSON.parse(text);
    if (parsed.summary !== undefined || parsed.content !== undefined) return parsed;
  } catch (e) {}

  let repaired = text;
  const quoteCount = (repaired.replace(/\\"/g, '').match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) repaired += '"';
  if (!repaired.trim().endsWith('}')) repaired += '}';

  try {
    const parsed = JSON.parse(repaired);
    if (parsed.summary !== undefined || parsed.content !== undefined) return parsed;
  } catch (e) {}

  console.warn("JSON Repair failed. Using regex extraction for truncated AI response.");
  const safeExtract = (key) => {
    const regex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?="\\s*,\\s*"\\w+"\\s*:|"\\s*\\}|$)`);
    const match = text.match(regex);
    if (!match) return '';
    let val = match[1];
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
    out[key] = typeof val === 'string' ? val.replace(/\\n/g, '\n').trim() : val;
  }
  return out;
}

// ─── Native Web Scraper ──────────────────────────────────────────────────────

async function fetchGenericWebsite(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    
    const html = await res.text();
    
    // Extract basic title if present
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    // Strip out heavy junk tags, scripts, and styles, then remove all HTML tags
    let cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ') // Remove remaining HTML tags
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();

    // Compress to fit token limits
    if (cleanText.length > MAX_SCRAPE_CHARS) {
      cleanText = cleanText.substring(0, MAX_SCRAPE_CHARS) + "\n...[TRUNCATED TO FIT LIMITS]";
    }

    return { title, url, text: cleanText || "No readable text found on the page." };
  } catch (err) {
    console.warn(`Scraping failed for ${url}:`, err.message);
    return { title: new URL(url).hostname, url, text: "Content could not be automatically scraped. Generate based on URL context." };
  }
}

// ─── YouTube & GitHub Fetchers ───────────────────────────────────────────────

async function fetchYouTubeMetadata(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const item = data?.items?.[0];
  if (!item) throw new Error('YouTube video not found');
  const snippet = item.snippet;
  return { title: snippet.title, channelTitle: snippet.channelTitle, description: snippet.description?.slice(0, 1500) || '', videoId };
}

async function fetchGitHubMetadata(owner, repo) {
  const headers = { Accept: 'application/vnd.github+json', ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}) };
  const [repoRes, readmeRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }),
  ]);
  const repoData = await repoRes.json();
  let readmeContent = '';
  if (readmeRes.ok) {
    const readmeJson = await readmeRes.json();
    if (readmeJson.content) readmeContent = Buffer.from(readmeJson.content, 'base64').toString('utf-8').slice(0, 4000);
  }
  return { title: repoData.full_name || `${owner}/${repo}`, description: repoData.description || '', language: repoData.language || '', repoUrl: repoData.html_url, readme: readmeContent };
}

// ─── AI generation via BAAS ─────────────────────────────────────────────────

async function callBaasAI(prompt) {
  const res = await fetch(BAAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BAAS_TOKEN}` },
    body: JSON.stringify({ task: 'text', mode: 'auto', modelOverride: null, avoidModels: ['gemma-2b-it-lora'], stream: false, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`BAAS AI error ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error('BAAS AI returned failure');
  return data.content;
}

// ─── Build Universal Strict Prompts ──────────────────────────────────────────

function buildUniversalPrompt(contextBlock, userPrompt, targetType) {
  return `You are an automated, strict JSON-only serialization engine. Based on the scraped context below, generate structured content for a ${targetType} portfolio entry.

SOURCE CONTEXT:
${contextBlock}

${userPrompt ? `ADDITIONAL CONTEXT FROM USER: ${userPrompt}` : ''}

CRITICAL INSTRUCTIONS:
- You must output exactly one valid JSON object. 
- Do NOT include any introductory sentences.
- Do NOT wrap the JSON inside markdown code blocks or backticks.
- Your entire response must begin with '{' and end with '}'.

JSON Schema Structure:
{
  "summary": "2-3 sentence plain description of the item.",
  "content": "Rich Markdown write-up with ## headings and bullet points. Format and structure this specifically from the perspective of a ${targetType} asset.",
  "techStack": "Comma-separated technologies, frameworks, and tools. Empty string if none."
}`;
}

// ─── Main controller exports ─────────────────────────────────────────────────

exports.analyzeLink = async (req, res) => {
  const { url, prompt: userPrompt, targetType } = req.body || {};

  if (!url) return res.status(400).json({ success: false, message: 'URL is required.' });

  try {
    const detectedType = detectLinkType(url);
    const finalType = targetType || (detectedType === 'WEB' ? 'PROJECT' : detectedType);

    let contextBlock = '';
    let prefill = { type: finalType };

    if (detectedType === 'VIDEO') {
      const videoId = extractYouTubeId(url);
      if (!videoId) throw new Error('Could not extract YouTube video ID.');
      const metadata = await fetchYouTubeMetadata(videoId);
      contextBlock = `- Title: ${metadata.title}\n- Channel: ${metadata.channelTitle}\n- Description: ${metadata.description}`;
      prefill.title = metadata.title;
      prefill.metaDynamic = { youtube_id: metadata.videoId };

    } else if (detectedType === 'SOURCE') {
      const repoInfo = extractGitHubRepo(url);
      if (!repoInfo) throw new Error('Could not extract GitHub repo info.');
      const metadata = await fetchGitHubMetadata(repoInfo.owner, repoInfo.repo);
      contextBlock = `- Name: ${metadata.title}\n- Description: ${metadata.description}\n- Primary Language: ${metadata.language}\n- README: ${metadata.readme}`;
      prefill.title = metadata.title.split('/')[1] || metadata.title;
      prefill.metaDynamic = { repo_url: metadata.repoUrl, language: metadata.language };

    } else {
      // Scrape Generic Web Link
      const metadata = await fetchGenericWebsite(url);
      contextBlock = `- Title: ${metadata.title}\n- URL: ${metadata.url}\n- Scraped Text: ${metadata.text}`;
      prefill.title = metadata.title;
      
      // ✅ Dynamic Conditional Fix: Populates only the matching schema parameters
      prefill.metaDynamic = {};
      if (finalType === 'SERVICE') {
        prefill.metaDynamic.endpoint_url = url;
      } else if (finalType === 'PROJECT') {
        prefill.metaDynamic.website_url = url;
      } else {
        prefill.metaDynamic.website_url = url;
      }
    }

    const aiPrompt = buildUniversalPrompt(contextBlock, userPrompt, finalType);
    const aiRawContent = await callBaasAI(aiPrompt);
    console.log("=== RAW AI OUTPUT TRANSMISSION ===\n", aiRawContent);
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
    return res.status(500).json({ success: false, message: err.message || 'AI analysis failed.' });
  }
};

exports.detectType = async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ success: false, message: 'URL is required.' });
  return res.json({ success: true, detectedType: detectLinkType(url) });
};