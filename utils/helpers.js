const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT token
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash string using SHA256
const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

// Hash password using bcrypt
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password with hash
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate unique ID with prefix
const generateUniqueId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}${random}`.toUpperCase();
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Convert meters to human-readable distance
const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)}km`;
  } else {
    return `${Math.round(meters / 1000)}km`;
  }
};

// Parse and validate coordinates
const parseCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid coordinates: must be valid numbers');
  }

  if (lat < -90 || lat > 90) {
    throw new Error('Invalid latitude: must be between -90 and 90');
  }

  if (lng < -180 || lng > 180) {
    throw new Error('Invalid longitude: must be between -180 and 180');
  }

  return [lng, lat]; // GeoJSON format [longitude, latitude]
};

// Sanitize user data for response (remove sensitive fields)
const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;

  // Remove sensitive fields
  delete userObj.password;
  delete userObj.__v;
  delete userObj.blockchainTransactionHash; // Keep this internal

  return userObj;
};

// Format error response
const formatError = (message, code = null, details = null) => {
  const error = { error: message };
  if (code) error.code = code;
  if (details) error.details = details;
  error.timestamp = new Date().toISOString();
  return error;
};

// Format success response
const formatSuccess = (data, message = null, meta = null) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  if (meta) response.meta = meta;
  response.timestamp = new Date().toISOString();
  return response;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number format
const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Generate emergency code for SOS alerts
const generateEmergencyCode = () => {
  const prefix = 'SOS';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Format timestamp to human-readable string
const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toISOString().replace('T', ' ').substr(0, 19);
};

// Get time elapsed since timestamp
const getTimeElapsed = (timestamp) => {
  const now = Date.now();
  const elapsed = now - new Date(timestamp).getTime();
  
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// Validate and sanitize input
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
  }
  return input;
};

// Generate API key
const generateApiKey = () => {
  return 'sk-' + crypto.randomBytes(32).toString('hex');
};

// Check if coordinates are within a bounding box
const isWithinBounds = (lat, lng, bounds) => {
  const { north, south, east, west } = bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
};

// Convert object to URL query parameters
const objectToQueryString = (obj) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      params.append(key, value.toString());
    }
  }
  return params.toString();
};

// Debounce function for rate limiting
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

module.exports = {
  generateToken,
  verifyToken,
  generateRandomString,
  hashString,
  hashPassword,
  comparePassword,
  generateUniqueId,
  calculateDistance,
  formatDistance,
  parseCoordinates,
  sanitizeUser,
  formatError,
  formatSuccess,
  isValidEmail,
  isValidPhone,
  generateEmergencyCode,
  formatTimestamp,
  getTimeElapsed,
  sanitizeInput,
  generateApiKey,
  isWithinBounds,
  objectToQueryString,
  debounce
};
