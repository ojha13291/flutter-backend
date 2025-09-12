const axios = require('axios');
const logger = require('../utils/logger');

class AIAnomalyService {
  constructor() {
    // AI Service Configuration
    this.aiServiceUrl = process.env.AI_ANOMALY_SERVICE_URL || 'https://anamoly-prediction.onrender.com/predict';
    this.serviceTimeout = parseInt(process.env.AI_SERVICE_TIMEOUT) || 5000;
    this.retryAttempts = parseInt(process.env.AI_SERVICE_RETRY_ATTEMPTS) || 3;
    this.anomalyDetectionEnabled = process.env.ANOMALY_DETECTION_ENABLED === 'true';
    
    // Thresholds from environment
    this.anomalyThresholds = {
      speed: { 
        min: parseFloat(process.env.MIN_SPEED_THRESHOLD) || 0, 
        max: parseFloat(process.env.MAX_SPEED_THRESHOLD) || 120 
      },
      inactivityTime: (parseInt(process.env.INACTIVITY_THRESHOLD_MINUTES) || 30) * 60 * 1000,
      maxDeviationDistance: parseInt(process.env.ROUTE_DEVIATION_DISTANCE) || 5000,
      geofenceDistance: parseInt(process.env.GEOFENCE_VIOLATION_DISTANCE) || 1000,
    };

    // Risk level thresholds
    this.riskThresholds = {
      low: parseFloat(process.env.LOW_RISK_THRESHOLD) || 0.3,
      medium: parseFloat(process.env.MEDIUM_RISK_THRESHOLD) || 0.6,
      high: parseFloat(process.env.HIGH_RISK_THRESHOLD) || 0.8,
      critical: parseFloat(process.env.CRITICAL_RISK_THRESHOLD) || 0.9
    };

    // Auto-response configuration
    this.autoSosTrigger = process.env.AUTO_SOS_TRIGGER === 'true';
    this.autoSosCriticalCount = parseInt(process.env.AUTO_SOS_CRITICAL_ANOMALY_COUNT) || 2;
    
    // Feature flags
    this.features = {
      coordinateAnomaly: process.env.ENABLE_COORDINATE_ANOMALY !== 'false',
      speedAnomaly: process.env.ENABLE_SPEED_ANOMALY !== 'false',
      routeDeviation: process.env.ENABLE_ROUTE_DEVIATION !== 'false',
      inactivityDetection: process.env.ENABLE_INACTIVITY_DETECTION !== 'false',
      geofenceViolation: process.env.ENABLE_GEOFENCE_VIOLATION !== 'false'
    };

    this.lastLocations = new Map();
    
    logger.info('🤖 AI Anomaly Service initialized:', {
      enabled: this.anomalyDetectionEnabled,
      serviceUrl: this.aiServiceUrl,
      features: this.features,
      thresholds: this.anomalyThresholds
    });
  }

  // Main anomaly detection function
  async detectAnomalies(touristId, locationData) {
    try {
      if (!this.anomalyDetectionEnabled) {
        return {
          hasAnomalies: false,
          anomalies: [],
          totalAnomalies: 0,
          riskLevel: 'SAFE',
          disabled: true
        };
      }

      const { latitude, longitude, timestamp, address } = locationData;
      const previousLocation = this.lastLocations.get(touristId);
      
      const anomalies = [];

      // 1. AI-based coordinate anomaly detection
      if (this.features.coordinateAnomaly) {
        const coordinateAnomaly = await this.detectCoordinateAnomaly(latitude, longitude);
        if (coordinateAnomaly.isAnomaly) {
          anomalies.push({
            type: 'COORDINATE_ANOMALY',
            severity: this.mapRiskToSeverity(coordinateAnomaly.riskScore),
            details: coordinateAnomaly,
            location: { latitude, longitude }
          });
        }
      }

      // 2. Speed-based anomaly detection
      if (this.features.speedAnomaly && previousLocation) {
        const speedAnomaly = this.detectSpeedAnomaly(previousLocation, locationData);
        if (speedAnomaly.isAnomaly) {
          anomalies.push({
            type: 'SPEED_ANOMALY',
            severity: speedAnomaly.severity,
            details: speedAnomaly,
            location: { latitude, longitude }
          });
        }
      }

      // 3. Route deviation detection
      if (this.features.routeDeviation && previousLocation) {
        const routeDeviation = this.detectRouteDeviation(previousLocation, locationData);
        if (routeDeviation.isAnomaly) {
          anomalies.push({
            type: 'ROUTE_DEVIATION',
            severity: 'MEDIUM',
            details: routeDeviation,
            location: { latitude, longitude }
          });
        }
      }

      // 4. Inactivity detection
      if (this.features.inactivityDetection) {
        const inactivityAnomaly = this.detectInactivity(touristId, timestamp);
        if (inactivityAnomaly.isAnomaly) {
          anomalies.push({
            type: 'PROLONGED_INACTIVITY',
            severity: 'MEDIUM',
            details: inactivityAnomaly,
            location: { latitude, longitude }
          });
        }
      }

      // 5. Geofence violation detection
      if (this.features.geofenceViolation) {
        const geofenceAnomaly = await this.detectGeofenceViolation(latitude, longitude);
        if (geofenceAnomaly.isAnomaly) {
          anomalies.push({
            type: 'GEOFENCE_VIOLATION',
            severity: 'HIGH',
            details: geofenceAnomaly,
            location: { latitude, longitude }
          });
        }
      }

      // Update location history
      this.updateLocationHistory(touristId, locationData);

      const result = {
        hasAnomalies: anomalies.length > 0,
        anomalies,
        totalAnomalies: anomalies.length,
        riskLevel: this.calculateRiskLevel(anomalies),
        featuresUsed: Object.keys(this.features).filter(f => this.features[f])
      };

      return result;

    } catch (error) {
      logger.error('Anomaly detection failed:', { error: error.message, touristId });
      return {
        hasAnomalies: false,
        anomalies: [],
        totalAnomalies: 0,
        riskLevel: 'UNKNOWN',
        error: 'Anomaly detection service unavailable'
      };
    }
  }

  // ✅ FIX: AI-based coordinate anomaly detection with timeout handling
  async detectCoordinateAnomaly(latitude, longitude, speed = 0) {
    if (!this.features.coordinateAnomaly || !this.anomalyDetectionEnabled) {
      return { isAnomaly: false, message: 'Coordinate anomaly detection disabled' };
    }

    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        const response = await axios.post(this.aiServiceUrl, {
          lat: parseFloat(latitude),
          lon: parseFloat(longitude),
          speed: parseFloat(speed)
        }, {
          timeout: this.serviceTimeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Smart-Tourist-Backend/1.0'
          }
        });

        const prediction = response.data;
        const isAnomaly = prediction.anomaly === true || prediction.risk_score > this.riskThresholds.medium;
        
        logger.info('🎯 AI anomaly detection result:', {
          latitude, longitude, 
          isAnomaly, 
          confidence: prediction.confidence || 'N/A',
          riskScore: prediction.risk_score || 'N/A',
          attempt: attempt + 1
        });

        return {
          isAnomaly,
          confidence: prediction.confidence || 0,
          riskScore: prediction.risk_score || 0,
          aiResponse: prediction,
          message: isAnomaly ? 'Unusual location pattern detected by AI' : 'Location pattern normal',
          serviceUsed: 'AI_MODEL',
          attemptNumber: attempt + 1
        };

      } catch (error) {
        attempt++;
        logger.warn(`AI service attempt ${attempt}/${this.retryAttempts} failed:`, { 
          error: error.message,
          latitude, 
          longitude 
        });

        if (attempt >= this.retryAttempts) {
          logger.error('All AI service attempts failed, using fallback');
          return this.basicCoordinateValidation(latitude, longitude);
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // ✅ FIX: Speed anomaly detection
  detectSpeedAnomaly(previousLocation, currentLocation) {
    try {
      const timeDiff = new Date(currentLocation.timestamp) - new Date(previousLocation.timestamp);
      const timeDiffHours = timeDiff / (1000 * 60 * 60);

      if (timeDiffHours === 0) {
        return { isAnomaly: false };
      }

      const distance = this.calculateDistance(
        previousLocation.latitude, previousLocation.longitude,
        currentLocation.latitude, currentLocation.longitude
      );

      const speed = distance / timeDiffHours; // km/h

      const isAnomaly = speed > this.anomalyThresholds.speed.max || speed < 0;
      const severity = speed > 100 ? 'CRITICAL' : speed > 80 ? 'HIGH' : 'MEDIUM';

      return {
        isAnomaly,
        severity,
        speed: Math.round(speed * 100) / 100,
        distance: Math.round(distance * 100) / 100,
        timeDiffMinutes: Math.round(timeDiff / (1000 * 60)),
        message: isAnomaly ? `Unusual speed detected: ${Math.round(speed)} km/h` : 'Speed normal'
      };
    } catch (error) {
      logger.warn('Speed anomaly detection failed:', error);
      return { isAnomaly: false, error: error.message };
    }
  }

  // ✅ FIX: Route deviation detection
  detectRouteDeviation(previousLocation, currentLocation) {
    try {
      const distance = this.calculateDistance(
        previousLocation.latitude, previousLocation.longitude,
        currentLocation.latitude, currentLocation.longitude
      );

      const timeDiff = new Date(currentLocation.timestamp) - new Date(previousLocation.timestamp);
      const timeDiffMinutes = timeDiff / (1000 * 60);

      // If user moved too far in short time (possible transportation change)
      const isAnomaly = distance > 10 && timeDiffMinutes < 5; // 10km in 5 minutes

      return {
        isAnomaly,
        distance: Math.round(distance * 100) / 100,
        timeDiffMinutes: Math.round(timeDiffMinutes),
        message: isAnomaly ? 'Sudden location change detected - possible transportation' : 'Route normal'
      };
    } catch (error) {
      logger.warn('Route deviation detection failed:', error);
      return { isAnomaly: false, error: error.message };
    }
  }

  // ✅ FIX: Inactivity detection
  detectInactivity(touristId, currentTimestamp) {
    try {
      const locationHistory = this.lastLocations.get(touristId);
      if (!locationHistory) return { isAnomaly: false };

      const timeDiff = new Date(currentTimestamp) - new Date(locationHistory.timestamp);
      const isAnomaly = timeDiff > this.anomalyThresholds.inactivityTime;

      return {
        isAnomaly,
        inactiveMinutes: Math.round(timeDiff / (1000 * 60)),
        message: isAnomaly ? `Prolonged inactivity: ${Math.round(timeDiff / (1000 * 60))} minutes` : 'Activity normal'
      };
    } catch (error) {
      logger.warn('Inactivity detection failed:', error);
      return { isAnomaly: false, error: error.message };
    }
  }

  // ✅ FIX: Geofence violation detection
  async detectGeofenceViolation(latitude, longitude) {
    try {
      // Define high-risk zones (can be loaded from database)
      const highRiskZones = [
        { name: 'Restricted Area', lat: 12.9500, lon: 77.6000, radius: 1000 }, // 1km radius
        { name: 'Danger Zone', lat: 13.0000, lon: 77.5500, radius: 500 }
      ];

      for (const zone of highRiskZones) {
        const distance = this.calculateDistance(latitude, longitude, zone.lat, zone.lon);
        if (distance * 1000 <= zone.radius) { // Convert km to meters
          return {
            isAnomaly: true,
            zone: zone.name,
            distance: Math.round(distance * 1000),
            message: `Entered high-risk zone: ${zone.name}`
          };
        }
      }

      return { isAnomaly: false, message: 'Location safe' };
    } catch (error) {
      logger.warn('Geofence detection failed:', error);
      return { isAnomaly: false, error: error.message };
    }
  }

  // ✅ FIX: Basic coordinate validation (fallback)
  basicCoordinateValidation(latitude, longitude) {
    try {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      const isAnomaly = lat < -90 || lat > 90 || lon < -180 || lon > 180 ||
                       (lat === 0 && lon === 0); // Null island

      return {
        isAnomaly,
        confidence: isAnomaly ? 0.9 : 0.1,
        riskScore: isAnomaly ? 0.8 : 0.1,
        message: isAnomaly ? 'Invalid coordinates detected' : 'Coordinates valid',
        fallback: true
      };
    } catch (error) {
      logger.warn('Basic coordinate validation failed:', error);
      return { isAnomaly: false, error: error.message };
    }
  }

  // Map AI risk score to severity levels
  mapRiskToSeverity(riskScore) {
    if (riskScore >= this.riskThresholds.critical) return 'CRITICAL';
    if (riskScore >= this.riskThresholds.high) return 'HIGH';
    if (riskScore >= this.riskThresholds.medium) return 'MEDIUM';
    return 'LOW';
  }

  // Calculate risk level with environment thresholds
  calculateRiskLevel(anomalies) {
    if (anomalies.length === 0) return 'SAFE';
    
    const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
    const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
    const mediumCount = anomalies.filter(a => a.severity === 'MEDIUM').length;

    if (criticalCount > 0) return 'CRITICAL';
    if (highCount >= 2 || (highCount >= 1 && mediumCount >= 2)) return 'HIGH';
    if (highCount >= 1 || mediumCount >= 2 || anomalies.length >= 3) return 'MEDIUM';
    return 'LOW';
  }

  // Update location history
  updateLocationHistory(touristId, locationData) {
    this.lastLocations.set(touristId, {
      ...locationData,
      timestamp: new Date()
    });
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // Health check method
  async healthCheck() {
    try {
      const testResponse = await axios.post(this.aiServiceUrl, {
        lat: 12.9716,
        lon: 77.5946,
        speed: 0
      }, {
        timeout: 3000
      });

      return {
        healthy: true,
        responseTime: Date.now(),
        status: 'AI service responding normally'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        status: 'AI service unavailable'
      };
    }
  }
}

module.exports = new AIAnomalyService();
