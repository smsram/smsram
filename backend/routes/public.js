const express = require('express');

const router = express.Router();
const { 
    getPublicProjectMeta, 
    fetchPublicSharedAsset, 
    handlePublicFormSubmission, 
    getLiveHealthStatus,
    getPublicTelemetryMetrics 
} = require('../controllers/publicController');

// All routes mounted here run open without requiring session tokens or admin keys
router.get('/status', getLiveHealthStatus);
router.get('/project/:slug', getPublicProjectMeta);
router.get('/assets/shared/:id', fetchPublicSharedAsset);
router.post('/forms/submit', handlePublicFormSubmission);
router.get('/telemetry/dashboard', getPublicTelemetryMetrics);

module.exports = router;