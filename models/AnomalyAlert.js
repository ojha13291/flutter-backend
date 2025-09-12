const mongoose = require('mongoose');

const AnomalyAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  touristId: {
    type: String,
    required: true,
    index: true
  },
  
  type: {
    type: String,
    enum: ['COORDINATE_ANOMALY', 'SPEED_ANOMALY', 'ROUTE_DEVIATION', 'PROLONGED_INACTIVITY', 'GEOFENCE_VIOLATION'],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  
  details: {
    type: mongoose.Schema.Types.Mixed, // Store any anomaly-specific data
    required: true
  },
  
  resolved: {
    type: Boolean,
    default: false
  },
  
  resolvedAt: {
    type: Date
  },
  
  resolvedBy: {
    type: String
  },
  
  actions: [{
    action: {
      type: String,
      enum: ['NOTIFICATION_SENT', 'SOS_TRIGGERED', 'MANUAL_REVIEW', 'AUTO_RESOLVED']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.latitude = ret.location.coordinates[1];
      ret.longitude = ret.location.coordinates[0];
      return ret;
    }
  }
});

// Indexes for performance
AnomalyAlertSchema.index({ location: '2dsphere' });
AnomalyAlertSchema.index({ userId: 1, createdAt: -1 });
AnomalyAlertSchema.index({ type: 1, severity: 1 });
AnomalyAlertSchema.index({ resolved: 1 });

module.exports = mongoose.model('AnomalyAlert', AnomalyAlertSchema);
