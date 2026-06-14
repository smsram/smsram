// controllers/publicController.js
const { executeQuery } = require('../config/database');
const path = require('path');
const fs = require('fs');

/**
 * Updates existing cached telemetry rows smoothly by locating via platform strings
 */
const updateTelemetryCache = async (platform, key, value) => {
    const query = `
        UPDATE ecosystem_telemetry_cache 
        SET metric_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE platform = ? AND metric_key = ?
    `;
    try {
        await executeQuery(query, [String(value), platform, key]);
    } catch (err) {
        console.error(`[Database Cache Update Error] Platform: ${platform}, Key: ${key} ->`, err.message);
    }
};

/**
 * Pulls fallback values from the local database cache table
 */
const getLocalCacheFallback = async (platform, fallbackMap) => {
    const query = `
        SELECT metric_key, metric_value 
        FROM ecosystem_telemetry_cache 
        WHERE platform = ?
    `;
    try {
        const responsePayload = await executeQuery(query, [platform]);
        const rows = responsePayload?.data || responsePayload?.results || (Array.isArray(responsePayload) ? responsePayload : []);
        
        if (!rows || rows.length === 0) return fallbackMap;

        const cacheMap = {};
        rows.forEach(row => { cacheMap[row.metric_key] = row.metric_value; });
        
        return {
            ...fallbackMap,
            ...cacheMap
        };
    } catch (err) {
        console.error(`[Database Cache Read Error] Platform: ${platform} ->`, err.message);
        return fallbackMap;
    }
};

/**
 * Helper function to bucket raw continuous days into separate months for frontend heatmaps
 */
const formatMonthlyHeatmap = (dailyData) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIndex = new Date().getMonth();
    
    // Only compile months up to the current calendar month progress marker
    const activeMonths = months.slice(0, currentMonthIndex + 1);
    const heatmap = activeMonths.map(month => ({ month, days: [] }));

    dailyData.forEach(day => {
        const dateObj = new Date(day.date);
        const monthIndex = dateObj.getMonth();
        
        if (monthIndex > currentMonthIndex) return;

        let intensity = 0;
        if (day.count > 0 && day.count <= 2) intensity = 1;
        else if (day.count > 2 && day.count <= 5) intensity = 2;
        else if (day.count > 5 && day.count <= 9) intensity = 3;
        else if (day.count >= 10) intensity = 4;

        heatmap[monthIndex].days.push({
            date: day.date,
            count: day.count,
            intensity: intensity
        });
    });

    return heatmap;
};

/**
 * 1. GET /api/public/status
 */
const getLiveHealthStatus = (req, res) => {
    return res.json({
        success: true,
        status: "ONLINE",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
};

/**
 * 2. GET /api/public/project/:slug
 */
const getPublicProjectMeta = (req, res) => {
    return res.status(510).json({ 
        success: false, 
        message: "This endpoint configuration is managed by the main assets/project controller." 
    });
};

/**
 * 3. GET /api/public/assets/shared/:id
 */
const fetchPublicSharedAsset = (req, res) => {
    return res.status(510).json({ 
        success: false, 
        message: "Shared asset serving paths are handled by the main file controller." 
    });
};

/**
 * 4. POST /api/public/forms/submit
 */
const handlePublicFormSubmission = (req, res) => {
    const payload = req.body;

    if (!payload || Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, error: "Cannot process blank telemetry inputs." });
    }

    try {
        console.log(`[Public Ingestion Node] Captured incoming form stream block.`);
        return res.json({
            success: true,
            message: "Payload safely received by open data collection grid nodes.",
            receivedAt: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * 5. GET /api/public/telemetry/dashboard
 * Aggregates live metrics with safe platform update-overwrites and month-truncated heatmaps.
 */
const getPublicTelemetryMetrics = async (req, res) => {
    const currentYear = new Date().getFullYear();
    let aggregatedPayload = { youtube: {}, github: {}, leetcode: {}, latestCommits: [] };

    // --- VECTOR 0: LIVE GITHUB COMMITS INGESTION (Dynamic Mapping) ---
    try {
        const eventsFetch = await fetch(`https://api.github.com/users/${process.env.GITHUB_USERNAME}/events/public`, {
            headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` }
        });
        const events = await eventsFetch.json();
        const pushEvents = Array.isArray(events) ? events.filter(e => e.type === 'PushEvent').slice(0, 4) : [];
        
        aggregatedPayload.latestCommits = pushEvents.map((event, idx) => {
            const repoName = event.repo.name.split('/').pop();
            const message = event.payload.commits?.[0]?.message || "Refactored system build configurations.";
            const eventDate = new Date(event.created_at);
            const diffHours = Math.floor((new Date() - eventDate) / (1000 * 60 * 60));
            
            return {
                id: `live-c-${idx}`,
                repo: repoName,
                message: message,
                time: diffHours < 1 ? "Just now" : `${diffHours} hours ago`,
                slug: repoName.toLowerCase().replace(/[^a-z0-9]/g, '-')
            };
        });
    } catch (e) {
        aggregatedPayload.latestCommits = [
            { id: "c1", repo: "Aegis-Core", message: "feat: implemented remote JWT token handshake validation signature", time: "2 hours ago", slug: "aegis" },
            { id: "c2", repo: "VeriDoc-AI", message: "fix: corrected explainability layer canvas bounding dimension calculation mismatch", time: "5 hours ago", slug: "veridoc-ai" }
        ];
    }

    // --- VECTOR 1: YOUTUBE CORE SYNC ---
    try {
        const ytFetch = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${process.env.YOUTUBE_CHANNEL_ID}&key=${process.env.YOUTUBE_API_KEY}`);
        const ytData = await ytFetch.json();
        
        if (ytData.items && ytData.items.length > 0) {
            const stats = ytData.items[0].statistics;
            aggregatedPayload.youtube = { subs: stats.subscriberCount, videos: stats.videoCount, growth: "+12% this month" };
            
            // Updates using dedicated string match update function
            await updateTelemetryCache('youtube', 'subs', stats.subscriberCount);
            await updateTelemetryCache('youtube', 'videos', stats.videoCount);
        } else throw new Error();
    } catch (e) {
        aggregatedPayload.youtube = await getLocalCacheFallback('youtube', { subs: "4,820", videos: "84 videos", growth: "+12% this month" });
    }

    // --- VECTOR 2: GITHUB CORE SYNC & HEATMAP PROCESSING ---
    try {
        const ghQuery = `query { user(login: "${process.env.GITHUB_USERNAME}") { contributionsCollection(from: "${currentYear}-01-01T00:00:00Z", to: "${currentYear}-12-31T23:59:59Z") { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`;
        const ghFetch = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: ghQuery })
        });
        const ghData = await ghFetch.json();
        
        if (ghData.data && ghData.data.user) {
            const cal = ghData.data.user.contributionsCollection.contributionCalendar;
            let activeDays = 0, streak = 0;
            let rawDays = [];

            cal.weeks.forEach(w => w.contributionDays.forEach(d => {
                rawDays.push({ date: d.date, count: d.contributionCount });
                if (d.contributionCount > 0) {
                    activeDays++;
                    streak++;
                } else if (new Date(d.date) < new Date()) {
                    streak = 0;
                }
            }));

            aggregatedPayload.github = { 
                commits: cal.totalContributions, 
                activeDays: `${activeDays} days`, 
                streak: `${streak} days`,
                heatmap: formatMonthlyHeatmap(rawDays)
            };

            await updateTelemetryCache('github', 'commits', cal.totalContributions);
            await updateTelemetryCache('github', 'active_days', `${activeDays} days`);
            await updateTelemetryCache('github', 'streak', `${streak} days`);
        } else throw new Error();
    } catch (e) {
        const cachedBase = await getLocalCacheFallback('github', { commits: "1,284", activeDays: "242 days", streak: "18 days" });
        aggregatedPayload.github = { ...cachedBase, heatmap: [] };
    }

    // --- VECTOR 3: LEETCODE CORE SYNC & HEATMAP GENERATION ---
    try {
        const lcQuery = `query { matchedUser(username: "${process.env.LEETCODE_USERNAME}") { submitStats { acSubmissionNum { difficulty count } } profile { ranking } userCalendar(year: ${currentYear}) { totalActiveDays streak submissionCalendar } } }`;
        const lcFetch = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: lcQuery })
        });
        const lcData = await lcFetch.json();
        
        if (lcData.data && lcData.data.matchedUser) {
            const user = lcData.data.matchedUser;
            const solved = user.submitStats.acSubmissionNum.find(d => d.difficulty === "All")?.count || 0;
            const rank = `Top ${((user.profile.ranking / 5000000) * 100).toFixed(1)}%`;
            const activeDays = `${user.userCalendar.totalActiveDays} days`;
            const streak = `${user.userCalendar.streak} days`;

            const lcCalendarMap = JSON.parse(user.userCalendar.submissionCalendar || '{}');
            const startOfYear = new Date(`${currentYear}-01-01T00:00:00Z`);
            const endOfYear = new Date(`${currentYear}-12-31T23:59:59Z`);
            let rawLcDays = [];
            
            for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
                const unixTime = Math.floor(d.getTime() / 1000).toString();
                rawLcDays.push({
                    date: d.toISOString().split('T')[0],
                    count: lcCalendarMap[unixTime] || 0
                });
            }

            aggregatedPayload.leetcode = { 
                solved, 
                rank, 
                activeDays, 
                streak,
                heatmap: formatMonthlyHeatmap(rawLcDays)
            };

            await updateTelemetryCache('leetcode', 'solved', solved);
            await updateTelemetryCache('leetcode', 'rank', rank);
            await updateTelemetryCache('leetcode', 'active_days', activeDays);
            await updateTelemetryCache('leetcode', 'streak', streak);
        } else throw new Error();
    } catch (e) {
        const cachedBase = await getLocalCacheFallback('leetcode', { solved: "412", rank: "Top 4.2%", activeDays: "186 days", streak: "0 days" });
        aggregatedPayload.leetcode = { ...cachedBase, heatmap: [] };
    }

    return res.json({ success: true, data: aggregatedPayload });
};

module.exports = {
    getLiveHealthStatus,
    getPublicProjectMeta,
    fetchPublicSharedAsset,
    handlePublicFormSubmission,
    getPublicTelemetryMetrics
};