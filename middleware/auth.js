const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { formatError } = require('../utils/helpers');

// Verify JWT token and authenticate user
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : null;
    
    if (!token) {
      return res.status(401).json(formatError(
        'Access denied. No token provided.',
        'NO_TOKEN'
      ));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user in database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json(formatError(
        'Invalid token. User not found.',
        'USER_NOT_FOUND'
      ));
    }

    if (!user.isActive) {
      return res.status(401).json(formatError(
        'Account is deactivated.',
        'ACCOUNT_DEACTIVATED'
      ));
    }

    // Add user info to request
    req.user = user;
    req.userId = user._id;
    req.touristId = user.touristId;
    
    // Update last active timestamp
    user.deviceInfo.lastActiveAt = new Date();
    await user.save();
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(formatError(
        'Invalid token.',
        'INVALID_TOKEN'
      ));
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(formatError(
        'Token expired.',
        'TOKEN_EXPIRED',
        { expiredAt: error.expiredAt }
      ));
    }
    
    console.error('Authentication error:', error);
    res.status(500).json(formatError(
      'Internal server error during authentication.',
      'AUTH_ERROR'
    ));
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : null;
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
        req.touristId = user.touristId;
        
        // Update last active timestamp
        user.deviceInfo.lastActiveAt = new Date();
        await user.save();
      }
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

// Check if user is verified
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(formatError(
      'Authentication required.',
      'AUTH_REQUIRED'
    ));
  }

  if (!req.user.isVerified) {
    return res.status(403).json(formatError(
      'Account verification required.',
      'VERIFICATION_REQUIRED',
      {
        touristId: req.user.touristId,
        blockchainStatus: req.user.blockchainStatus
      }
    ));
  }
  
  next();
};

// Check if user has admin privileges (for emergency responders)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(formatError(
      'Authentication required.',
      'AUTH_REQUIRED'
    ));
  }

  // For now, we'll check if user has admin role
  // This could be extended with proper role-based access control
  if (req.user.role !== 'admin' && req.user.role !== 'responder') {
    return res.status(403).json(formatError(
      'Admin access required.',
      'ADMIN_REQUIRED'
    ));
  }
  
  next();
};

// Rate limiting for sensitive operations
const rateLimitSensitive = (req, res, next) => {
  // This could be enhanced with Redis for distributed rate limiting
  // For now, we'll use a simple in-memory approach
  const userKey = req.userId || req.ip;
  const now = Date.now();
  
  if (!req.app.locals.rateLimitStore) {
    req.app.locals.rateLimitStore = new Map();
  }
  
  const userRequests = req.app.locals.rateLimitStore.get(userKey) || [];
  
  // Remove requests older than 1 hour
  const validRequests = userRequests.filter(timestamp => now - timestamp < 3600000);
  
  if (validRequests.length >= 10) { // Max 10 sensitive operations per hour
    return res.status(429).json(formatError(
      'Too many sensitive operations. Please try again later.',
      'RATE_LIMIT_EXCEEDED'
    ));
  }
  
  validRequests.push(now);
  req.app.locals.rateLimitStore.set(userKey, validRequests);
  
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireVerified,
  requireAdmin,
  rateLimitSensitive
};
