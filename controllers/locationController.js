const User = require('../models/User');
const aiAnomalyService = require('../services/aiAnomalyService');
const { formatError, formatSuccess, parseCoordinates } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Enhanced location tracking with AI anomaly detection
const updateLocation = catchAsync(async (req, res) => {
  const { latitude, longitude, address } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json(formatError('Location coordinates are required', 'MISSING_COORDINATES'));
  }

  try {
    // Validate coordinates
    const coords = parseCoordinates(latitude, longitude);
    
    // Update user's location
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          'lastKnownLocation.latitude': parseFloat(latitude),
          'lastKnownLocation.longitude': parseFloat(longitude),
          'lastKnownLocation.timestamp': new Date(),
          'lastKnownLocation.address': address || ''
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
    }

    // Run AI anomaly detection
    const anomalyResult = await aiAnomalyService.detectAnomalies(user.touristId, {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date(),
      address: address || ''
    });

    // Emit location update with anomaly info via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const locationUpdate = {
        touristId: user.touristId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date(),
        address: address || '',
        anomalyDetected: anomalyResult.hasAnomalies,
        riskLevel: anomalyResult.riskLevel || 'SAFE'
      };

      io.to(user.touristId).emit('locationUpdate', locationUpdate);
      
      // Broadcast to monitoring systems
      io.emit('touristLocationUpdate', locationUpdate);

      // Send anomaly alerts if detected
      if (anomalyResult.hasAnomalies) {
        io.emit('anomalyDetected', {
          touristId: user.touristId,
          anomalies: anomalyResult.anomalies,
          riskLevel: anomalyResult.riskLevel,
          location: { latitude, longitude },
          timestamp: new Date()
        });
      }
    }

    logger.info('Location updated with anomaly check:', {
      touristId: user.touristId,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      anomaliesDetected: anomalyResult.hasAnomalies,
      riskLevel: anomalyResult.riskLevel
    });

    res.status(200).json(formatSuccess({
      location: user.lastKnownLocation,
      anomalyDetection: {
        checked: true,
        hasAnomalies: anomalyResult.hasAnomalies,
        riskLevel: anomalyResult.riskLevel || 'SAFE',
        anomalyCount: anomalyResult.totalAnomalies || 0
      }
    }, 'Location updated successfully'));

  } catch (error) {
    logger.error('Location update error:', { error: error.message, userId: req.userId });
    res.status(400).json(formatError(error.message, 'LOCATION_UPDATE_ERROR'));
  }
});

// Rest of the existing location controller code...
const getCurrentLocation = catchAsync(async (req, res) => {
  const user = await User.findById(req.userId).select('lastKnownLocation');
  
  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  if (!user.lastKnownLocation || !user.lastKnownLocation.latitude) {
    return res.status(404).json(formatError('No location data available', 'NO_LOCATION_DATA'));
  }

  res.status(200).json(formatSuccess({
    location: user.lastKnownLocation
  }));
});

module.exports = {
  updateLocation,
  getCurrentLocation
};
