const User = require('../models/User');
const AnomalyAlert = require('../models/AnomalyAlert');
const aiAnomalyService = require('../services/aiAnomalyService');
const sosService = require('../services/sosService');
const notificationService = require('../services/notificationService');
const { formatError, formatSuccess } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Manual anomaly detection endpoint
const detectAnomalies = catchAsync(async (req, res) => {
  const { latitude, longitude, address } = req.body;
  const touristId = req.touristId;
  const userId = req.userId;

  if (!latitude || !longitude) {
    return res.status(400).json(formatError('Location coordinates required', 'MISSING_COORDINATES'));
  }

  try {
    // Run anomaly detection
    const anomalyResult = await aiAnomalyService.detectAnomalies(touristId, {
      latitude,
      longitude,
      timestamp: new Date(),
      address
    });

    if (anomalyResult.hasAnomalies) {
      // Save anomaly alerts to database
      for (const anomaly of anomalyResult.anomalies) {
        await saveAnomalyAlert(userId, touristId, anomaly);
      }

      // Update user safety status if critical
      if (anomalyResult.riskLevel === 'CRITICAL') {
        await User.findByIdAndUpdate(userId, {
          safetyStatus: 'DANGER'
        });

        // Auto-trigger SOS if multiple critical anomalies
        const criticalAnomalies = anomalyResult.anomalies.filter(a => a.severity === 'CRITICAL');
        if (criticalAnomalies.length > 1) {
          await autoTriggerSOS(userId, touristId, latitude, longitude, anomalyResult);
        }
      }

      // Broadcast real-time alerts
      const io = req.app.get('io');
      if (io) {
        io.emit('anomalyDetected', {
          touristId,
          anomalies: anomalyResult.anomalies,
          riskLevel: anomalyResult.riskLevel,
          location: { latitude, longitude },
          timestamp: new Date()
        });

        // Send to specific user
        io.to(touristId).emit('personalAnomalyAlert', {
          message: 'Unusual activity detected. Please confirm you are safe.',
          anomalies: anomalyResult.anomalies,
          riskLevel: anomalyResult.riskLevel
        });
      }

      // Send notifications for high-risk anomalies
      if (anomalyResult.riskLevel === 'HIGH' || anomalyResult.riskLevel === 'CRITICAL') {
        const user = await User.findById(userId);
        await sendAnomalyNotifications(user, anomalyResult);
      }
    }

    logger.info('Anomaly detection completed:', {
      touristId,
      hasAnomalies: anomalyResult.hasAnomalies,
      riskLevel: anomalyResult.riskLevel,
      anomalyCount: anomalyResult.totalAnomalies
    });

    res.status(200).json(formatSuccess({
      hasAnomalies: anomalyResult.hasAnomalies,
      riskLevel: anomalyResult.riskLevel,
      anomalies: anomalyResult.anomalies,
      totalAnomalies: anomalyResult.totalAnomalies,
      recommendations: getRecommendations(anomalyResult)
    }, 'Anomaly detection completed'));

  } catch (error) {
    logger.error('Anomaly detection error:', { error: error.message, touristId });
    res.status(500).json(formatError('Anomaly detection failed', 'ANOMALY_DETECTION_ERROR'));
  }
});

// Get anomaly history
const getAnomalyHistory = catchAsync(async (req, res) => {
  const { limit = 10, page = 1, severity } = req.query;
  const userId = req.userId;

  let filter = { userId };
  if (severity) filter.severity = severity;

  const anomalies = await AnomalyAlert.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await AnomalyAlert.countDocuments(filter);

  res.status(200).json(formatSuccess({
    anomalies,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / parseInt(limit)),
      count: anomalies.length,
      totalRecords: total
    }
  }));
});

// Get real-time anomaly status
const getAnomalyStatus = catchAsync(async (req, res) => {
  const userId = req.userId;

  // Get recent anomalies (last 24 hours)
  const recentAnomalies = await AnomalyAlert.find({
    userId,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }).sort({ createdAt: -1 });

  const criticalCount = recentAnomalies.filter(a => a.severity === 'CRITICAL').length;
  const highCount = recentAnomalies.filter(a => a.severity === 'HIGH').length;

  const overallStatus = criticalCount > 0 ? 'CRITICAL' : 
                       highCount > 2 ? 'HIGH' : 
                       recentAnomalies.length > 5 ? 'MEDIUM' : 'SAFE';

  res.status(200).json(formatSuccess({
    overallStatus,
    recentAnomalies: recentAnomalies.slice(0, 5),
    stats: {
      last24Hours: recentAnomalies.length,
      critical: criticalCount,
      high: highCount,
      medium: recentAnomalies.filter(a => a.severity === 'MEDIUM').length,
      low: recentAnomalies.filter(a => a.severity === 'LOW').length
    }
  }));
});

// Helper functions
async function saveAnomalyAlert(userId, touristId, anomaly) {
  const anomalyAlert = new AnomalyAlert({
    userId,
    touristId,
    type: anomaly.type,
    severity: anomaly.severity,
    location: {
      type: 'Point',
      coordinates: [anomaly.location.longitude, anomaly.location.latitude]
    },
    details: anomaly.details,
    resolved: false
  });

  await anomalyAlert.save();
  return anomalyAlert;
}

async function autoTriggerSOS(userId, touristId, latitude, longitude, anomalyResult) {
  try {
    // Auto-create SOS alert for critical anomalies
    const description = `AUTO-SOS: Multiple critical anomalies detected - ${anomalyResult.anomalies.map(a => a.type).join(', ')}`;
    
    // This would call your existing SOS creation logic
    logger.error('AUTO-SOS triggered due to anomalies:', { touristId, anomalies: anomalyResult.anomalies });
    
  } catch (error) {
    logger.error('Auto-SOS trigger failed:', error);
  }
}

async function sendAnomalyNotifications(user, anomalyResult) {
  try {
    const message = `ALERT: Unusual activity detected for ${user.fullName}. Risk Level: ${anomalyResult.riskLevel}. Please check immediately.`;
    
    await notificationService.sendEmergencyNotification({
      type: 'EMAIL',
      recipient: user.emergencyContactPhone, // Assuming email for emergency contact
      message,
      sosId: 'ANOMALY_ALERT'
    });

  } catch (error) {
    logger.warn('Anomaly notification failed:', error);
  }
}

function getRecommendations(anomalyResult) {
  const recommendations = [];
  
  anomalyResult.anomalies.forEach(anomaly => {
    switch (anomaly.type) {
      case 'COORDINATE_ANOMALY':
        recommendations.push('Verify your current location is correct');
        break;
      case 'SPEED_ANOMALY':
        recommendations.push('Check if you are traveling in a safe manner');
        break;
      case 'ROUTE_DEVIATION':
        recommendations.push('Confirm your travel route and destination');
        break;
      case 'PROLONGED_INACTIVITY':
        recommendations.push('Please update your location to confirm safety');
        break;
      case 'GEOFENCE_VIOLATION':
        recommendations.push('You have entered a restricted area - please move to a safe location');
        break;
    }
  });

  if (anomalyResult.riskLevel === 'CRITICAL') {
    recommendations.push('Consider using the SOS feature if you need immediate help');
  }

  return recommendations;
}

module.exports = {
  detectAnomalies,
  getAnomalyHistory,
  getAnomalyStatus
};
