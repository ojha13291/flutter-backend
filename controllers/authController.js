const User = require('../models/User');
const blockchainService = require('../services/blockchainService');
const notificationService = require('../services/notificationService');
const { generateToken, sanitizeUser, formatError, formatSuccess, hashString } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

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
    // FINAL FIX: Store the timestamps as plain numbers, exactly as they come from the request.
    tripDetails: {
      validFrom: validFrom ? parseInt(validFrom, 10) : null,
      validTo: validTo ? parseInt(validTo, 10) : null,
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
  res.status(existingUser ? 200 : 201).json(formatSuccess({
    message: existingUser ? 'OTP resent to your email' : 'Registration successful! Please check your email for OTP.',
    email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    nextStep: 'verify_otp'
  }));
});

const verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  if (user.emailVerification.isVerified) return res.status(400).json(formatError('Email already verified', 'ALREADY_VERIFIED'));

  if (!user.verifyOTP(otp)) {
    await user.save();
    return res.status(400).json(formatError('Invalid or expired OTP.', 'INVALID_OTP'));
  }
  
  const touristId = user.generateTouristId();
  user.touristId = touristId;
  
  try {
    if (!user.tripDetails || !user.tripDetails.validFrom || !user.tripDetails.validTo) {
      throw new Error('Trip details missing from user record.');
    }

    // FINAL FIX: The values are now stored as numbers, so no conversion is needed. Pass them directly.
    const txHash = await blockchainService.registerTourist({
      name: user.fullName,
      aadharHash: hashString(user.kycDetails.aadharNumber),
      tripId: `TRIP_${touristId}`,
      validFrom: user.tripDetails.validFrom,
      validTo: user.tripDetails.validTo
    });
    
    user.blockchainTransactionHash = txHash;
    user.blockchainStatus = 'ASSIGNED';
  } catch (error) {
    logger.error('Blockchain registration failed during OTP verification:', error);
    user.blockchainStatus = 'FAILED';
  }

  await user.save();

  const token = generateToken({ id: user._id, touristId: user.touristId });
  await notificationService.sendWelcomeEmail(user.email, user.fullName, touristId);

  logger.info('User verified and Tourist ID assigned:', { touristId, email });
  res.status(200).json(formatSuccess({
    message: 'Email verified successfully!',
    user: sanitizeUser(user),
    token,
  }));
});

// ... (rest of the file remains the same, no changes needed below this line)

const login = catchAsync(async (req, res) => {
  const { touristId } = req.body;

  if (!touristId) {
    return res.status(400).json(formatError('Tourist ID is required', 'MISSING_TOURIST_ID'));
  }

  const user = await User.findOne({ touristId });
  
  if (!user) {
    return res.status(404).json(formatError('Tourist ID not found. Please register first.','USER_NOT_FOUND'));
  }

  if (!user.canLogin) {
    return res.status(403).json(formatError('Account not verified or inactive.','ACCOUNT_NOT_READY'));
  }

  user.deviceInfo.lastActiveAt = new Date();
  await user.save();

  const token = generateToken({ id: user._id, touristId: user.touristId });

  logger.info('User logged in successfully:', { touristId });

  res.status(200).json(formatSuccess({
    user: sanitizeUser(user),
    token,
  }, 'Login successful'));
});

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

  res.status(200).json(formatSuccess({
    message: 'OTP sent to your email',
    email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
  }));
});

const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.userId).select('-emailVerification.otp');
  
  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  res.status(200).json(formatSuccess({ user: sanitizeUser(user) }));
});

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

  res.status(200).json(formatSuccess({ user: sanitizeUser(user) }, 'Profile updated successfully'));
});

const refreshToken = catchAsync(async (req, res) => {
  const user = await User.findById(req.userId);
  
  if (!user || !user.canLogin) {
    return res.status(401).json(formatError('Invalid session', 'INVALID_SESSION'));
  }

  user.deviceInfo.lastActiveAt = new Date();
  await user.save();

  const token = generateToken({ id: user._id, touristId: user.touristId });

  res.status(200).json(formatSuccess({ token }));
});

const logout = catchAsync(async (req, res) => {
  logger.info('User logged out:', { touristId: req.touristId });
  res.status(200).json(formatSuccess(null, 'Logged out successfully'));
});

const verifyBlockchain = catchAsync(async (req, res) => {
  const { touristId } = req.params;
  
  if (!touristId) {
    return res.status(400).json(formatError('Tourist ID is required', 'MISSING_TOURIST_ID'));
  }

  const user = await User.findOne({ touristId });
  if (!user) return res.status(404).json(formatError('Tourist ID not found', 'USER_NOT_FOUND'));

  const blockchainStatus = await blockchainService.getVerificationStatus(touristId);
  const details = await blockchainService.getTouristDetails(touristId);
  
  res.status(200).json(formatSuccess({
    touristId,
    status: blockchainStatus,
    details,
  }));
});

module.exports = {
  register,
  verifyOTP,
  login,
  resendOTP,
  getProfile,
  updateProfile,
  refreshToken,
  logout,
  verifyBlockchain
};

