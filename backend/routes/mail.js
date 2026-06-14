const express = require('express');
const router = express.Router();
const mailController = require('../controllers/mailController');

// Clean, segmented mapping vectors
router.post('/contact', mailController.sendContactMail);

module.exports = router;