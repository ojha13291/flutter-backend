// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');

// // @route   GET /api/blockchain/verify/:touristId
// // @desc    Verify tourist blockchain status
// // @access  Public (for verification purposes)
// router.get('/verify/:touristId', authController.verifyBlockchain);

// module.exports = router;


const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @route   GET /api/blockchain/verify/:touristId
// @desc    Verify blockchain status
router.get('/verify/:touristId', authController.verifyBlockchain);

module.exports = router;
