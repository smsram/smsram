const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Define endpoints
router.post('/login', adminController.loginHandshake);
router.get('/verify', adminController.verifySession);

// CRITICAL FIX: This must be present!
module.exports = router;