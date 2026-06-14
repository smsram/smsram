const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

// 🔴 PROTECTED — Requires Admin Token
// POST /api/ai/analyze  — Fetch metadata + generate AI content from a URL
router.post('/analyze', authMiddleware, aiController.analyzeLink);

// POST /api/ai/detect   — Quickly detect link type (YouTube / GitHub)
router.post('/detect', authMiddleware, aiController.detectType);

module.exports = router;