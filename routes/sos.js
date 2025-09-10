// const express = require('express');
// const router = express.Router();
// const sosController = require('../controllers/sosController');
// const { authenticate } = require('../middleware/auth');

// // @route   POST /api/sos/alert
// // @desc    Create SOS alert
// // @access  Private
// router.post('/alert', authenticate, sosController.createSOSAlert);

// // @route   GET /api/sos/:sosId
// // @desc    Get SOS alert details
// // @access  Private
// router.get('/:sosId', authenticate, sosController.getSOSAlert);

// // @route   DELETE /api/sos/:sosId/cancel
// // @desc    Cancel SOS alert
// // @access  Private
// router.delete('/:sosId/cancel', authenticate, sosController.cancelSOSAlert);

// module.exports = router;

const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { authenticate } = require('../middleware/auth');

// @route   POST /api/sos/alert
// @desc    Create SOS emergency alert (matches Flutter SOS button)
router.post('/alert', authenticate, sosController.createSOSAlert);

// @route   GET /api/sos/:sosId
// @desc    Get SOS alert details
router.get('/:sosId', authenticate, sosController.getSOSAlert);

// @route   PUT /api/sos/:sosId/status
// @desc    Update SOS status
router.put('/:sosId/status', authenticate, sosController.updateSOSStatus);

// @route   DELETE /api/sos/:sosId/cancel
// @desc    Cancel SOS alert
router.delete('/:sosId/cancel', authenticate, sosController.cancelSOSAlert);

// @route   GET /api/sos/history
// @desc    Get user's SOS history
router.get('/', authenticate, sosController.getSOSHistory);

module.exports = router;
