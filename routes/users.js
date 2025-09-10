// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');
// const { authenticate } = require('../middleware/auth');

// // @route   PUT /api/users/profile
// // @desc    Update user profile (matches Flutter profile save)
// router.put('/profile', authenticate, authController.updateProfile);

// // @route   GET /api/users/profile
// // @desc    Get user profile
// router.get('/profile', authenticate, authController.getProfile);

// module.exports = router;


const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { formatError, formatSuccess, sanitizeUser } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status, kycStatus } = req.query;
  
  let filter = {};
  if (status) filter.blockchainStatus = status;
  if (kycStatus) filter['kycDetails.status'] = kycStatus;

  const users = await User.find(filter)
    .select('-kycDetails.aadharNumber -blockchainTransactionHash')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(filter);

  res.status(200).json(formatSuccess({
    users: users.map(user => sanitizeUser(user)),
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: users.length,
      totalRecords: total
    }
  }));
}));

// @route   GET /api/users/:touristId
// @desc    Get user by tourist ID
// @access  Private
router.get('/:touristId', authenticate, catchAsync(async (req, res) => {
  const { touristId } = req.params;
  
  // Users can only view their own profile, admins can view any
  if (req.user.role !== 'admin' && req.touristId !== touristId) {
    return res.status(403).json(formatError('Access denied', 'ACCESS_DENIED'));
  }

  const user = await User.findOne({ touristId });
  
  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  res.status(200).json(formatSuccess({
    user: sanitizeUser(user)
  }));
}));

// @route   PUT /api/users/:touristId/kyc-status
// @desc    Update KYC status (Admin only)
// @access  Private/Admin
router.put('/:touristId/kyc-status', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const { touristId } = req.params;
  const { status, rejectionReason, verifiedBy } = req.body;

  if (!['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json(formatError('Invalid KYC status', 'INVALID_STATUS'));
  }

  const updateData = {
    'kycDetails.status': status,
    'kycDetails.verifiedBy': verifiedBy || req.user.fullName
  };

  if (status === 'APPROVED') {
    updateData['kycDetails.verifiedAt'] = new Date();
    updateData['isActive'] = true;
  }

  if (status === 'REJECTED' && rejectionReason) {
    updateData['kycDetails.rejectionReason'] = rejectionReason;
  }

  const user = await User.findOneAndUpdate(
    { touristId },
    { $set: updateData },
    { new: true }
  );

  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  logger.info('KYC status updated:', { touristId, status, updatedBy: verifiedBy });

  res.status(200).json(formatSuccess({
    touristId,
    kycStatus: status,
    updatedAt: new Date(),
    message: `KYC status updated to ${status}`
  }));
}));

// @route   GET /api/users/emergency/active
// @desc    Get users in emergency state
// @access  Private/Admin
router.get('/emergency/active', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const emergencyUsers = await User.find({
    safetyStatus: { $in: ['SOS', 'DANGER'] },
    isActive: true
  })
  .select('touristId fullName safetyStatus lastKnownLocation emergencyContactName emergencyContactPhone')
  .sort({ 'lastKnownLocation.timestamp': -1 });

  res.status(200).json(formatSuccess({
    emergencyUsers,
    count: emergencyUsers.length,
    message: `Found ${emergencyUsers.length} users in emergency state`
  }));
}));

// @route   GET /api/users/stats/overview
// @desc    Get user statistics overview
// @access  Private/Admin
router.get('/stats/overview', authenticate, requireAdmin, catchAsync(async (req, res) => {
  const stats = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ 'kycDetails.status': 'PENDING' }),
    User.countDocuments({ 'kycDetails.status': 'APPROVED' }),
    User.countDocuments({ safetyStatus: 'SOS' }),
    User.countDocuments({ blockchainStatus: 'VERIFIED' })
  ]);

  const overview = {
    total: stats[0],
    active: stats[1],
    kycPending: stats[2],
    kycApproved: stats[3],
    emergencyActive: stats[4],
    blockchainVerified: stats[5]
  };

  res.status(200).json(formatSuccess({
    overview,
    timestamp: new Date()
  }));
}));

module.exports = router;
