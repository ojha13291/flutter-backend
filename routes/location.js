// const express = require('express');
// const router = express.Router();
// const locationController = require('../controllers/locationController');
// const { authenticate } = require('../middleware/auth');

// // @route   POST /api/location/track
// // @desc    Update user's GPS location
// // @access  Private
// router.post('/track', authenticate, locationController.updateLocation);

// // @route   GET /api/location/current
// // @desc    Get user's current location
// // @access  Private
// router.get('/current', authenticate, locationController.getCurrentLocation);

// module.exports = router;


const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate } = require('../middleware/auth');

// @route   POST /api/location/track
// @desc    Update user location (matches Flutter MapView)
router.post('/track', authenticate, locationController.updateLocation);

// @route   GET /api/location/current
// @desc    Get user's current location
router.get('/current', authenticate, locationController.getCurrentLocation);

module.exports = router;
