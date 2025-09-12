// controllers/authController.js

const User = require('../models/User');
const blockchainService = require('../services/blockchainService');
const notificationService = require('../services/notificationService');
const { generateToken, sanitizeUser, formatError, formatSuccess, hashString } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// POST /api/auth/register
const register = catchAsync(async (req, res) => {
  const {
    fullName, email, mobileNumber, nationality, age, gender,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    aadharNumber, govIdType = 'AADHAR', validFrom, validTo
  } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { 'kycDetails.aadharNumber': aadharNumber }]
  });

  if (existingUser && existingUser.emailVerification.isVerified) {
    return res.status(409).json(formatError('User already exists and is verified', 'USER_ALREADY_EXISTS'));
  }

  const otp = existingUser ? existingUser.generateOTP() : new User().generateOTP();

  const newUserDetails = {
    fullName, email, mobileNumber, nationality, age, gender,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    kycDetails: { aadharNumber, govIdType },
    'emailVerification.otp': otp,
    'emailVerification.otpExpiry': new Date(Date.now() + 10 * 60 * 1000),
    'emailVerification.isVerified': false,
    // store ms in DB; convert to seconds only for the contract
    tripDetails: {
      validFrom: validFrom ? parseInt(validFrom, 10) : null,
      validTo: validTo ? parseInt(validTo, 10) : null
    }
  };

  if (!existingUser) {
    newUserDetails['emailVerification.attempts'] = 0;
  }

  const user = await User.findOneAndUpdate(
    { email },
    { $set: newUserDetails },
    { new: true, upsert: true, runValidators: true }
  );

  await notificationService.sendOTPEmail(email, otp, fullName);

  logger.info('User registration/OTP request successful:', { email });

  return res
    .status(existingUser ? 200 : 201)
    .json(formatSuccess({
      message: existingUser ? 'OTP resent to your email' : 'Registration successful! Please check your email for OTP.',
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      nextStep: 'verify_otp'
    }));
});

// POST /api/auth/verify-otp
const verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  if (user.emailVerification.isVerified) return res.status(400).json(formatError('Email already verified', 'ALREADY_VERIFIED'));

  if (!user.verifyOTP(otp)) {
    await user.save();
    return res.status(400).json(formatError('Invalid or expired OTP.', 'INVALID_OTP'));
  }

  // Assign Tourist ID
  const touristId = user.generateTouristId();
  user.touristId = touristId;

  // Ensure trip window (ms) for downstream features; does not block login anymore
  if (!user.tripDetails || !user.tripDetails.validFrom || !user.tripDetails.validTo) {
    const now = Date.now();
    user.tripDetails = {
      validFrom: now,
      validTo: now + 30 * 24 * 60 * 60 * 1000
    };
  }

  // Register on-chain (seconds)
  try {
    const validFromSec = Math.floor(user.tripDetails.validFrom / 1000);
    const validToSec = Math.floor(user.tripDetails.validTo / 1000);

    const txHash = await blockchainService.registerTourist({
      name: user.fullName,
      aadharHash: hashString(user.kycDetails.aadharNumber),
      tripId: `TRIP_${touristId}`,
      validFrom: validFromSec,
      validTo: validToSec
    });

    user.blockchainTransactionHash = txHash;
    user.blockchainStatus = 'ASSIGNED';
  } catch (error) {
    logger.error('Blockchain registration failed during OTP verification:', error);
    user.blockchainStatus = 'FAILED';
  }

  // Persist flags atomically
  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    {
      $set: {
        touristId: user.touristId,
        'emailVerification.isVerified': true,
        isVerified: true,
        isActive: true,
        'emailVerification.verifiedAt': new Date(),
        'deviceInfo.lastActiveAt': new Date(),
        blockchainTransactionHash: user.blockchainTransactionHash || null,
        blockchainStatus: user.blockchainStatus,
        'tripDetails.validFrom': user.tripDetails.validFrom,
        'tripDetails.validTo': user.tripDetails.validTo
      },
      $unset: {
        'emailVerification.otp': '',
        'emailVerification.otpExpiry': ''
      }
    },
    { new: true, runValidators: true }
  );

  const token = generateToken({ id: updatedUser._id, touristId: updatedUser.touristId });

  // Welcome delivery with fallbacks
  let welcomeEmailSent = false;
  let simpleEmailSent = false;
  let smsBackupSent = false;

  try {
    await notificationService.sendWelcomeEmail(updatedUser.email, updatedUser.fullName, touristId);
    welcomeEmailSent = true;
  } catch {
    try {
      await notificationService.sendSimpleTouristIdEmail(updatedUser.email, updatedUser.fullName, touristId);
      simpleEmailSent = true;
    } catch {}
    if (!welcomeEmailSent && !simpleEmailSent && updatedUser.mobileNumber) {
      try {
        await notificationService.sendWelcomeSMS(updatedUser.mobileNumber, updatedUser.fullName, touristId);
        smsBackupSent = true;
      } catch {}
    }
  }

  return res.status(200).json(formatSuccess({
    message: 'Email verified successfully!',
    user: sanitizeUser(updatedUser),
    token,
    deliveryStatus: {
      welcomeEmail: welcomeEmailSent,
      simpleEmail: simpleEmailSent,
      smsBackup: smsBackupSent,
      touristId,
      deliverySuccess: welcomeEmailSent || simpleEmailSent || smsBackupSent,
      blockchainStatus: updatedUser.blockchainStatus
    }
  }));
});

// POST /api/auth/login
// PROTOTYPE: trip window check removed; only verified + active + touristId required
const login = catchAsync(async (req, res) => {
  const { touristId } = req.body;

  if (!touristId) {
    return res.status(400).json(formatError('Tourist ID is required', 'MISSING_TOURIST_ID'));
  }

  const user = await User.findOne({ touristId });
  if (!user) {
    return res.status(404).json(formatError('Tourist ID not found. Please register first.', 'USER_NOT_FOUND'));
  }

  // Prototype readiness: do not block on trip dates; keep minimal server-side checks
  const ready =
    Boolean(user.touristId) &&
    user.emailVerification?.isVerified === true &&
    user.isActive === true;

  if (!ready) {
    return res.status(403).json(formatError('Account not verified or inactive.', 'ACCOUNT_NOT_READY'));
  }

  user.deviceInfo.lastActiveAt = new Date();
  await user.save();

  const token = generateToken({ id: user._id, touristId: user.touristId });

  return res.status(200).json(formatSuccess({
    user: sanitizeUser(user),
    token
  }, 'Login successful'));
});

// POST /api/auth/resend-otp
const resendOTP = catchAsync(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json(formatError('Email is required', 'MISSING_EMAIL'));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  if (user.emailVerification.isVerified) {
    return res.status(400).json(formatError('Email already verified', 'ALREADY_VERIFIED'));
  }

  const otp = user.generateOTP();
  await user.save();

  await notificationService.sendOTPEmail(email, otp, user.fullName);

  return res.status(200).json(formatSuccess({
    message: 'OTP sent to your email',
    email: email.replace(/(.{2}).*(@.*)/, '$1***$2')
  }));
});

// POST /api/auth/recover-tourist-id
const recoverTouristId = catchAsync(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json(formatError('Email is required', 'MISSING_EMAIL'));
  }

  const user = await User.findOne({ email, 'emailVerification.isVerified': true });

  if (!user || !user.touristId) {
    return res.status(200).json(formatSuccess({
      message: 'If an account exists with this email, your Tourist ID has been sent.',
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2')
    }));
  }

  let emailSent = false;
  let smsSent = false;

  try {
    await notificationService.sendWelcomeEmail(user.email, user.fullName, user.touristId);
    emailSent = true;
  } catch {
    try {
      await notificationService.sendSimpleTouristIdEmail(user.email, user.fullName, user.touristId);
      emailSent = true;
    } catch {}
  }

  if (!emailSent && user.mobileNumber) {
    try {
      await notificationService.sendWelcomeSMS(user.mobileNumber, user.fullName, user.touristId);
      smsSent = true;
    } catch {}
  }

  return res.status(200).json(formatSuccess({
    message: 'If an account exists with this email, your Tourist ID has been sent.',
    email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    deliveryMethods: { email: emailSent, sms: smsSent }
  }));
});

// GET /api/auth/profile
const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.userId).select('-emailVerification.otp');
  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }
  return res.status(200).json(formatSuccess({ user: sanitizeUser(user) }));
});

// PUT /api/auth/profile
const updateProfile = catchAsync(async (req, res) => {
  const userId = req.userId;
  const {
    fullName, mobileNumber, nationality, age, gender,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    currentDestination, hotelAddress, insuranceCompany
  } = req.body;

  const allowedUpdates = {
    fullName, mobileNumber, nationality, age, gender,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    currentDestination, hotelAddress, insuranceCompany,
    'deviceInfo.lastActiveAt': new Date()
  };

  Object.keys(allowedUpdates).forEach(key => allowedUpdates[key] === undefined && delete allowedUpdates[key]);

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  return res.status(200).json(formatSuccess({ user: sanitizeUser(user) }, 'Profile updated successfully'));
});

// POST /api/auth/refresh
const refreshToken = catchAsync(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user || !user.isActive || !user.emailVerification?.isVerified) {
    return res.status(401).json(formatError('Invalid session', 'INVALID_SESSION'));
  }
  user.deviceInfo.lastActiveAt = new Date();
  await user.save();
  const token = generateToken({ id: user._id, touristId: user.touristId });
  return res.status(200).json(formatSuccess({ token }));
});

// POST /api/auth/logout
const logout = catchAsync(async (req, res) => {
  logger.info('User logged out:', { touristId: req.touristId });
  return res.status(200).json(formatSuccess(null, 'Logged out successfully'));
});

// GET /api/auth/verify-blockchain/:touristId
const verifyBlockchain = catchAsync(async (req, res) => {
  const { touristId } = req.params;
  if (!touristId) {
    return res.status(400).json(formatError('Tourist ID is required', 'MISSING_TOURIST_ID'));
  }
  const user = await User.findOne({ touristId });
  if (!user) return res.status(404).json(formatError('Tourist ID not found', 'USER_NOT_FOUND'));

  const status = await blockchainService.getVerificationStatus(touristId);
  const details = await blockchainService.getTouristDetails(touristId);

  return res.status(200).json(formatSuccess({ touristId, status, details }));
});

module.exports = {
  register,
  verifyOTP,
  login,
  resendOTP,
  recoverTouristId,
  getProfile,
  updateProfile,
  refreshToken,
  logout,
  verifyBlockchain
};
