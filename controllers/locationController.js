const User = require('../models/User');
const { formatError, formatSuccess, parseCoordinates } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Update user's GPS location
const updateLocation = catchAsync(async (req, res) => {
  const { latitude, longitude, address } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json(formatError('Location coordinates are required', 'MISSING_COORDINATES'));
  }

  try {
    // Validate coordinates
    const coords = parseCoordinates(latitude, longitude);
    
    // Update user's last known location
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

    // Emit location update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(user.touristId).emit('locationUpdate', {
        touristId: user.touristId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date(),
        address: address || ''
      });
    }

    logger.info('Location updated:', {
      touristId: user.touristId,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    });

    res.status(200).json(formatSuccess({
      location: user.lastKnownLocation
    }, 'Location updated successfully'));

  } catch (error) {
    logger.error('Location update error:', { error: error.message, userId: req.userId });
    res.status(400).json(formatError(error.message, 'INVALID_LOCATION'));
  }
});

// Get user's current location
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
