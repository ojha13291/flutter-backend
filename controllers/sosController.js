const SOS = require('../models/SOS');
const User = require('../models/User');
const mongoose = require('mongoose');
const notificationService = require('../services/notificationService');
const { formatError, formatSuccess, generateEmergencyCode } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Create SOS alert
const createSOSAlert = catchAsync(async (req, res) => {
  const {
    alertType = 'PANIC',
    severity = 'HIGH',
    latitude,
    longitude,
    description,
    deviceInfo
  } = req.body;

  const userId = req.userId;
  const touristId = req.touristId;

  if (!latitude || !longitude) {
    return res.status(400).json(formatError('Location coordinates are required', 'MISSING_LOCATION'));
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  const sosAlert = new SOS({
    touristId,
    userId,
    alertType,
    severity,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    description,
    deviceInfo: {
      platform: deviceInfo?.platform || 'Unknown',
      batteryLevel: deviceInfo?.batteryLevel || null,
      signalStrength: deviceInfo?.signalStrength || null,
      appVersion: deviceInfo?.appVersion || '1.0.0'
    },
    medicalInfo: {
      bloodType: user.bloodGroup || null,
      allergies: Array.isArray(user.allergies) ? user.allergies : [],
      conditions: Array.isArray(user.medicalConditions)
        ? user.medicalConditions.map(c => c?.condition || c).filter(Boolean)
        : [],
      insuranceInfo: user.insuranceCompany || null
    }
  });

  await sosAlert.save();

  user.safetyStatus = 'SOS';
  user.lastKnownLocation = {
    latitude,
    longitude,
    timestamp: new Date()
  };
  await user.save();

  const io = req.app.get('io');
  if (io) {
    io.emit('emergencyAlert', {
      sosId: sosAlert._id,
      touristId,
      alertType,
      severity,
      location: { latitude, longitude },
      timestamp: sosAlert.createdAt,
      emergencyCode: sosAlert.emergencyCode,
      user: {
        name: user.fullName,
        phone: user.mobileNumber,
        nationality: user.nationality
      }
    });
  }

  try {
    if (user.emergencyContactPhone) {
      await notificationService.sendEmergencyNotification({
        type: 'SMS',
        recipient: user.emergencyContactPhone,
        message: `EMERGENCY ALERT: ${user.fullName} needs immediate help. Location: ${latitude}, ${longitude}. Emergency Code: ${sosAlert.emergencyCode}`,
        sosId: sosAlert._id
      });
    }
  } catch (notificationError) {
    logger.warn('Failed to send emergency notification:', notificationError);
  }

  logger.error(`SOS ALERT CREATED: ${alertType} - ${severity}`, {
    touristId,
    sosId: sosAlert._id,
    location: { latitude, longitude },
    description,
    emergencyCode: sosAlert.emergencyCode
  });

  res.status(201).json(formatSuccess({
    sosId: sosAlert._id,
    alertType,
    severity,
    status: 'ACTIVE',
    location: { latitude, longitude },
    emergencyCode: sosAlert.emergencyCode,
    timestamp: sosAlert.createdAt,
    message: 'Emergency alert activated. Help has been notified.'
  }, 'SOS alert created successfully'));
});

// Get SOS alert details
const getSOSAlert = catchAsync(async (req, res) => {
  // ... function content from your file
});

// --- START: ADDED MISSING FUNCTION ---
// Get all active SOS alerts
const getActiveSOSAlerts = catchAsync(async (req, res) => {
  const alerts = await SOS.find({ status: 'ACTIVE' })
    .populate('userId', 'fullName touristId');

  // Filter out alerts where the user might have been deleted to prevent crashes
  const validAlerts = alerts.filter(alert => alert.userId);

  const formattedAlerts = validAlerts.map(alert => ({
    sosId: alert._id,
    touristId: alert.touristId,
    userId: alert.userId._id,
    touristName: alert.userId.fullName,
    alertType: alert.alertType,
    severity: alert.severity,
    status: alert.status,
    location: {
      latitude: alert.location.coordinates[1],
      longitude: alert.location.coordinates[0],
    },
    createdAt: alert.createdAt,
  }));

  res.status(200).json(formatSuccess({ alerts: formattedAlerts }));
});
// --- END: ADDED MISSING FUNCTION ---

// Update SOS status
const updateSOSStatus = catchAsync(async (req, res) => {
  const { sosId } = req.params;
  const { status, resolutionNotes, resolutionType } = req.body;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sosId)) {
    return res.status(400).json(formatError('Invalid SOS ID format', 'INVALID_SOS_ID'));
  }

  const validStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'FALSE_ALARM', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json(formatError('Invalid status', 'INVALID_STATUS'));
  }

  try {
    const sosAlert = await SOS.findById(sosId);
    if (!sosAlert) {
      return res.status(404).json(formatError('SOS alert not found', 'SOS_NOT_FOUND'));
    }

    // Update status
    sosAlert.status = status;

    // If resolving, add resolution details
    if (status === 'RESOLVED') {
      sosAlert.resolvedAt = new Date();
      sosAlert.resolutionNotes = resolutionNotes || 'Resolved from admin dashboard';
      sosAlert.resolutionType = resolutionType || 'OTHER'; // Use valid enum value
      sosAlert.resolutionTime = (new Date() - sosAlert.createdAt) / 1000;

      // Update user safety status back to safe (with error handling)
      if (sosAlert.userId) {
        try {
          await User.findByIdAndUpdate(sosAlert.userId, {
            safetyStatus: 'SAFE'
          });
        } catch (userUpdateError) {
          logger.warn('Failed to update user safety status:', userUpdateError);
          // Continue with SOS resolution even if user update fails
        }
      }
    }

    await sosAlert.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('sosStatusUpdated', {
        sosId: sosAlert._id,
        status: status,
        resolvedAt: sosAlert.resolvedAt
      });
    }

    logger.info('SOS status updated:', { sosId, status, updatedBy: req.user?.role || 'unknown' });

    res.status(200).json(formatSuccess({
      sosId: sosAlert._id,
      status: sosAlert.status,
      resolvedAt: sosAlert.resolvedAt,
      message: `SOS alert ${status.toLowerCase()} successfully`
    }));

  } catch (error) {
    logger.error('Error updating SOS status:', { error: error.message, sosId, status });
    res.status(500).json(formatError('Failed to update SOS status', 'SOS_UPDATE_ERROR'));
  }
});



// Cancel SOS alert
const cancelSOSAlert = catchAsync(async (req, res) => {
  // ... function content from your file
});

// Get SOS history for user
const getSOSHistory = catchAsync(async (req, res) => {
  // ... function content from your file
});

module.exports = {
  createSOSAlert,
  getSOSAlert,
  getActiveSOSAlerts, // <-- EXPORT THE NEW FUNCTION
  updateSOSStatus,
  cancelSOSAlert,
  getSOSHistory
};

