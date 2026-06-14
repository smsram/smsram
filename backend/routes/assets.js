const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const authMiddleware = require('../middleware/authMiddleware');

// 🟢 PUBLIC READ CHANNELS (No login required - Used by your frontend pages)
router.get('/', assetController.getAssets);
router.get('/:slug', assetController.getAssetBySlug);

// 🔴 PROTECTED WRITE CHANNELS (Requires Admin Token)
router.post('/', authMiddleware, assetController.createAsset);
router.put('/:id', authMiddleware, assetController.updateAsset);
router.delete('/:id', authMiddleware, assetController.deleteAsset);

module.exports = router;