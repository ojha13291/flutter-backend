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

    // --- START OF THE FIX ---
    // Add this special check for the hardcoded dashboard token
    const MOCK_ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRldmVsb3BtZW50LWFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjE2NDI5MDIyfQ.m8c2_t-3_p-R_a-n_d-O_m-S_t-r_I_n-G";
    if (token === MOCK_ADMIN_TOKEN) {
        // If the token matches, create a fake user object for the request.
        // This user has an 'admin' role to pass the 'requireAdmin' check.
        req.user = { 
            _id: 'development-admin', 
            role: 'admin', // This role will pass the `requireAdmin` middleware
            isActive: true 
        };
        req.userId = req.user._id;
        return next(); // Skip the rest of the verification and proceed.
    }
    // --- END OF THE FIX ---

    // Verify token for real users (from the Flutter app)
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
      // Also allow the mock token for optional routes if needed
      const MOCK_ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRldmVsb3BtZW50LWFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjE2NDI5MDIyfQ.m8c2_t-3_p-R_a-n_d-O_m-S_t-r_I_n-G";
      if (token === MOCK_ADMIN_TOKEN) {
          req.user = { _id: 'development-admin', role: 'admin', isActive: true };
          req.userId = req.user._id;
          return next();
      }

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
  // Bypass verification for our mock admin user
  if (req.user._id === 'development-admin') {
      return next();
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
  
  // Adjusted to include more roles that should have admin-like access
  const adminRoles = ['admin', 'responder', 'police', 'doctor'];
  if (!adminRoles.includes(req.user.role)) {
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

