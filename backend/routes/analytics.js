const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

// Secure consolidated dashboard overview payload endpoint
router.get('/dashboard-summary', authMiddleware, analyticsController.getDashboardSummary);

module.exports = router;