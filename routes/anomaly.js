const express = require('express');
const router = express.Router();
const anomalyController = require('../controllers/anomalyController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Validation middleware for anomaly detection
const validateAnomalyDetection = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  handleValidationErrors
];

// @route   POST /api/anomaly/detect
// @desc    Manual anomaly detection for specific location
// @access  Private
router.post('/detect', authenticate, validateAnomalyDetection, anomalyController.detectAnomalies);

// @route   GET /api/anomaly/history
// @desc    Get anomaly detection history
// @access  Private
router.get('/history', authenticate, anomalyController.getAnomalyHistory);

// @route   GET /api/anomaly/status
// @desc    Get current anomaly status for user
// @access  Private
router.get('/status', authenticate, anomalyController.getAnomalyStatus);

module.exports = router;
