const SOS = require('../models/SOS');
const User = require('../models/User');
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

  // Get user details for emergency notifications
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  // Create SOS alert
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
      allergies: user.allergies || [],
      conditions: user.medicalConditions.map(c => c.condition) || [],
      insuranceInfo: user.insuranceCompany || null
    }
  });

  await sosAlert.save();

  // Update user's safety status to SOS
  user.safetyStatus = 'SOS';
  user.lastKnownLocation = {
    latitude,
    longitude,
    timestamp: new Date()
  };
  await user.save();

  // Emit real-time alert via Socket.IO
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

  // Send notifications to emergency contacts
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
  const { sosId } = req.params;
  
  const sosAlert = await SOS.findById(sosId)
    .populate('userId', 'fullName touristId mobileNumber emergencyContactName emergencyContactPhone nationality');
  
  if (!sosAlert) {
    return res.status(404).json(formatError('SOS alert not found', 'SOS_NOT_FOUND'));
  }

  // Check if user has permission to view this SOS
  if (sosAlert.userId._id.toString() !== req.userId.toString()) {
    return res.status(403).json(formatError('Access denied', 'ACCESS_DENIED'));
  }

  res.status(200).json(formatSuccess({
    sos: {
      id: sosAlert._id,
      alertType: sosAlert.alertType,
      severity: sosAlert.severity,
      status: sosAlert.status,
      location: {
        latitude: sosAlert.location.coordinates[1],
        longitude: sosAlert.location.coordinates[0]
      },
      description: sosAlert.description,
      emergencyCode: sosAlert.emergencyCode,
      createdAt: sosAlert.createdAt,
      resolvedAt: sosAlert.resolvedAt,
      responseTime: sosAlert.responseTime,
      user: sosAlert.userId,
      notifications: sosAlert.notificationsSent.length
    }
  }));
});

// Update SOS status (for emergency responders)
const updateSOSStatus = catchAsync(async (req, res) => {
  const { sosId } = req.params;
  const { status, notes, acknowledgedBy, respondingUnits } = req.body;

  const sosAlert = await SOS.findById(sosId);
  
  if (!sosAlert) {
    return res.status(404).json(formatError('SOS alert not found', 'SOS_NOT_FOUND'));
  }

  const oldStatus = sosAlert.status;

  switch (status) {
    case 'ACKNOWLEDGED':
      await sosAlert.acknowledge(acknowledgedBy);
      break;
    case 'RESPONDING':
      await sosAlert.markResponding(respondingUnits);
      break;
    case 'RESOLVED':
      await sosAlert.resolve('HELP_ARRIVED', notes);
      // Update user safety status back to SAFE
      await User.findByIdAndUpdate(sosAlert.userId, { 
        $set: { safetyStatus: 'SAFE' } 
      });
      break;
    default:
      sosAlert.status = status;
      if (notes) sosAlert.resolutionNotes = notes;
      await sosAlert.save();
  }

  // Emit status update via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.emit('sosStatusUpdate', {
      sosId: sosAlert._id,
      oldStatus,
      newStatus: sosAlert.status,
      timestamp: new Date()
    });
  }

  logger.info(`SOS status updated: ${sosId} from ${oldStatus} to ${sosAlert.status}`);

  res.status(200).json(formatSuccess({
    sosId: sosAlert._id,
    status: sosAlert.status,
    updatedAt: new Date(),
    responseTime: sosAlert.responseTime
  }, 'SOS status updated successfully'));
});

// Cancel SOS alert
const cancelSOSAlert = catchAsync(async (req, res) => {
  const { sosId } = req.params;
  const { reason = 'Cancelled by user' } = req.body;

  const sosAlert = await SOS.findById(sosId);
  
  if (!sosAlert) {
    return res.status(404).json(formatError('SOS alert not found', 'SOS_NOT_FOUND'));
  }

  // Check if user has permission to cancel this SOS
  if (sosAlert.userId.toString() !== req.userId.toString()) {
    return res.status(403).json(formatError('Access denied', 'ACCESS_DENIED'));
  }

  if (!sosAlert.isActive) {
    return res.status(400).json(formatError('SOS alert is already resolved', 'SOS_NOT_ACTIVE'));
  }

  await sosAlert.cancel(reason);

  // Update user safety status back to SAFE
  await User.findByIdAndUpdate(req.userId, { 
    $set: { safetyStatus: 'SAFE' } 
  });

  // Emit cancellation via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.emit('sosCancelled', {
      sosId: sosAlert._id,
      touristId: sosAlert.touristId,
      timestamp: sosAlert.resolvedAt,
      reason
    });
  }

  logger.info(`SOS alert cancelled: ${sosId} by user ${req.touristId}`);

  res.status(200).json(formatSuccess({
    sosId: sosAlert._id,
    status: 'CANCELLED',
    cancelledAt: sosAlert.resolvedAt,
    reason
  }, 'SOS alert cancelled successfully'));
});

// Get SOS history for user
const getSOSHistory = catchAsync(async (req, res) => {
  const { limit = 10, page = 1 } = req.query;
  
  const sosAlerts = await SOS.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .select('alertType severity status location createdAt resolvedAt emergencyCode responseTime');

  const total = await SOS.countDocuments({ userId: req.userId });

  const formattedAlerts = sosAlerts.map(alert => ({
    id: alert._id,
    alertType: alert.alertType,
    severity: alert.severity,
    status: alert.status,
    location: {
      latitude: alert.location.coordinates[1],
      longitude: alert.location.coordinates[0]
    },
    createdAt: alert.createdAt,
    resolvedAt: alert.resolvedAt,
    emergencyCode: alert.emergencyCode,
    responseTime: alert.responseTime
  }));

  res.status(200).json(formatSuccess({
    alerts: formattedAlerts,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / parseInt(limit)),
      count: formattedAlerts.length,
      totalRecords: total
    }
  }));
});

module.exports = {
  createSOSAlert,
  getSOSAlert,
  updateSOSStatus,
  cancelSOSAlert,
  getSOSHistory
};
