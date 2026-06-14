const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graphController');
const authMiddleware = require('../middleware/authMiddleware');

// 🟢 PUBLIC READ CHANNELS (No login required - Used to show related assets on /[slug] pages)
router.get('/:assetId', graphController.getConnectedGraph);

// 🔴 PROTECTED WRITE CHANNELS (Requires Admin Token)
router.post('/', authMiddleware, graphController.connectAssets);
router.delete('/:assetA/:assetB/:relationType', authMiddleware, graphController.disconnectAssets);

module.exports = router;