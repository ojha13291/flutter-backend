// const User = require('../models/User');
// const blockchainService = require('../services/blockchainService');
// const { generateToken, sanitizeUser, formatError, formatSuccess } = require('../utils/helpers');
// const { catchAsync } = require('../middleware/errorHandler');
// const logger = require('../utils/logger');

// // Login with blockchain ID
// const login = catchAsync(async (req, res) => {
//   const { touristId } = req.body;

//   if (!touristId) {
//     return res.status(400).json(formatError('Tourist ID is required', 'MISSING_TOURIST_ID'));
//   }

//   // Check if user exists in database
//   let user = await User.findOne({ touristId });
  
//   if (!user) {
//     // If user doesn't exist, create a basic profile
//     user = new User({
//       touristId,
//       fullName: '', // Will be updated in profile
//       email: `${touristId}@temp.smarttourist.com`, // Temporary email
//       mobileNumber: '', // Will be updated
//       nationality: '',
//       age: '',
//       gender: 'Other',
//       emergencyContactName: '',
//       emergencyContactPhone: '+1234567890', // Temporary
//       emergencyContactRelation: ''
//     });
    
//     await user.save();
//     logger.info('New user created with blockchain ID:', { touristId });
//   }

//   // Verify blockchain status
//   try {
//     const blockchainStatus = await blockchainService.getVerificationStatus(touristId);
    
//     // Update blockchain status in user profile
//     user.blockchainStatus = blockchainStatus;
//     user.deviceInfo.lastActiveAt = new Date();
//     await user.save();
    
//     logger.info('User blockchain verification checked:', { touristId, status: blockchainStatus });
//   } catch (error) {
//     logger.warn('Blockchain verification failed:', { touristId, error: error.message });
//     // Continue with login even if blockchain check fails
//   }

//   // Generate JWT token
//   const token = generateToken({ id: user._id, touristId: user.touristId });

//   res.status(200).json(formatSuccess({
//     user: sanitizeUser(user),
//     token,
//     expiresIn: process.env.JWT_EXPIRES_IN || '7d'
//   }, 'Login successful'));
// });

// // Register new tourist (create profile after blockchain registration)
// const register = catchAsync(async (req, res) => {
//   const {
//     touristId,
//     fullName,
//     email,
//     mobileNumber,
//     nationality,
//     age,
//     gender,
//     emergencyContactName,
//     emergencyContactPhone,
//     emergencyContactRelation,
//     hotelAddress,
//     localGuideContact,
//     insuranceCompany,
//     insurancePolicyNumber
//   } = req.body;

//   // Check if user already exists
//   const existingUser = await User.findOne({ 
//     $or: [{ touristId }, { email }]
//   });

//   if (existingUser) {
//     return res.status(409).json(formatError(
//       'User already exists with this tourist ID or email',
//       'USER_ALREADY_EXISTS'
//     ));
//   }

//   // Create new user
//   const user = new User({
//     touristId,
//     fullName,
//     email,
//     mobileNumber,
//     nationality,
//     age,
//     gender,
//     emergencyContactName,
//     emergencyContactPhone,
//     emergencyContactRelation,
//     hotelAddress,
//     localGuideContact,
//     insuranceCompany,
//     insurancePolicyNumber
//   });

//   await user.save();

//   // Try to verify blockchain status
//   try {
//     const blockchainStatus = await blockchainService.getVerificationStatus(touristId);
//     user.blockchainStatus = blockchainStatus;
//     await user.save();
//   } catch (error) {
//     logger.warn('Blockchain verification failed during registration:', { touristId, error: error.message });
//   }

//   // Generate JWT token
//   const token = generateToken({ id: user._id, touristId: user.touristId });

//   logger.info('New user registered:', { touristId, email });

//   res.status(201).json(formatSuccess({
//     user: sanitizeUser(user),
//     token,
//     expiresIn: process.env.JWT_EXPIRES_IN || '7d'
//   }, 'Registration successful'));
// });

// // Get current user profile
// const getProfile = catchAsync(async (req, res) => {
//   const user = await User.findById(req.userId);
  
//   if (!user) {
//     return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
//   }

//   res.status(200).json(formatSuccess({
//     user: sanitizeUser(user)
//   }));
// });

// // Update user profile
// const updateProfile = catchAsync(async (req, res) => {
//   const userId = req.userId;
//   const updateData = req.body;

//   // Remove fields that shouldn't be updated directly
//   delete updateData.touristId;
//   delete updateData._id;
//   delete updateData.createdAt;
//   delete updateData.updatedAt;

//   const user = await User.findByIdAndUpdate(
//     userId, 
//     { 
//       ...updateData,
//       'deviceInfo.lastActiveAt': new Date()
//     }, 
//     { 
//       new: true, 
//       runValidators: true 
//     }
//   );

//   if (!user) {
//     return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
//   }

//   logger.info('User profile updated:', { touristId: user.touristId });

//   res.status(200).json(formatSuccess({
//     user: sanitizeUser(user)
//   }, 'Profile updated successfully'));
// });

// // Refresh token
// const refreshToken = catchAsync(async (req, res) => {
//   const user = await User.findById(req.userId);
  
//   if (!user || !user.isActive) {
//     return res.status(401).json(formatError('User not found or inactive', 'INVALID_USER'));
//   }

//   // Update last active timestamp
//   user.deviceInfo.lastActiveAt = new Date();
//   await user.save();

//   const token = generateToken({ id: user._id, touristId: user.touristId });

//   res.status(200).json(formatSuccess({
//     token,
//     expiresIn: process.env.JWT_EXPIRES_IN || '7d',
//     user: sanitizeUser(user)
//   }, 'Token refreshed successfully'));
// });

// // Logout (client-side token removal, server-side we just log it)
// const logout = catchAsync(async (req, res) => {
//   logger.info('User logged out:', { touristId: req.touristId });
  
//   res.status(200).json(formatSuccess(null, 'Logged out successfully'));
// });

// // Verify blockchain status
// const verifyBlockchain = catchAsync(async (req, res) => {
//   const { touristId } = req.params;
  
//   try {
//     const blockchainStatus = await blockchainService.getVerificationStatus(touristId);
//     const details = await blockchainService.getTouristDetails(touristId);
    
//     res.status(200).json(formatSuccess({
//       touristId,
//       status: blockchainStatus,
//       details,
//       verified: blockchainStatus === 'VALID'
//     }));
//   } catch (error) {
//     logger.error('Blockchain verification error:', { touristId, error: error.message });
//     res.status(500).json(formatError('Blockchain verification failed', 'BLOCKCHAIN_ERROR'));
//   }
// });

// module.exports = {
//   login,
//   register,
//   getProfile,
//   updateProfile,
//   refreshToken,
//   logout,
//   verifyBlockchain
// };


// const User = require('../models/User');
// const blockchainService = require('../services/blockchainService');
// const notificationService = require('../services/notificationService');
// const { generateToken, sanitizeUser, formatError, formatSuccess, hashString } = require('../utils/helpers');
// const { catchAsync } = require('../middleware/errorHandler');
// const logger = require('../utils/logger');

// // Login - Only for KYC verified users
// const login = catchAsync(async (req, res) => {
//   const { touristId } = req.body;

//   if (!touristId) {
//     return res.status(400).json(formatError('Tourist ID is required', 'MISSING_TOURIST_ID'));
//   }

//   // Check if user exists and is verified
//   const user = await User.findOne({ touristId });
  
//   if (!user) {
//     return res.status(404).json(formatError(
//       'User not found. Please register first with KYC verification.',
//       'USER_NOT_REGISTERED',
//       {
//         registrationRequired: true,
//         message: 'Complete KYC registration before login',
//         registrationUrl: '/api/auth/register'
//       }
//     ));
//   }

//   // Check if user KYC is approved
//   if (user.kycDetails.status !== 'APPROVED') {
//     return res.status(403).json(formatError(
//       'KYC verification pending or rejected. Please wait for approval.',
//       'KYC_NOT_APPROVED',
//       {
//         touristId: user.touristId,
//         kycStatus: user.kycDetails.status,
//         submittedAt: user.kycDetails.submittedAt,
//         message: user.kycDetails.status === 'REJECTED' ? 
//           `KYC rejected: ${user.kycDetails.rejectionReason}` : 
//           'KYC verification in progress'
//       }
//     ));
//   }

//   // Check if blockchain verification is complete
//   if (user.blockchainStatus !== 'VERIFIED' && user.blockchainStatus !== 'VALID') {
//     return res.status(403).json(formatError(
//       'Blockchain verification not complete. Please wait for verification.',
//       'BLOCKCHAIN_NOT_VERIFIED',
//       {
//         touristId: user.touristId,
//         blockchainStatus: user.blockchainStatus,
//         kycStatus: user.kycDetails.status
//       }
//     ));
//   }

//   // Check if account is active
//   if (!user.isActive || !user.canLogin) {
//     return res.status(403).json(formatError(
//       'Account access denied. Please contact support.',
//       'ACCOUNT_ACCESS_DENIED'
//     ));
//   }

//   // Update last active and blockchain status
//   user.deviceInfo.lastActiveAt = new Date();
//   await user.save();

//   // Generate JWT token
//   const token = generateToken({ id: user._id, touristId: user.touristId });

//   logger.info('User logged in successfully:', { touristId: user.touristId });

//   res.status(200).json(formatSuccess({
//     user: sanitizeUser(user),
//     token,
//     expiresIn: process.env.JWT_EXPIRES_IN || '7d'
//   }, 'Login successful'));
// });

// // Register with KYC verification
// const register = catchAsync(async (req, res) => {
//   const {
//     touristId,
//     fullName,
//     email,
//     mobileNumber,
//     nationality,
//     age,
//     gender,
//     emergencyContactName,
//     emergencyContactPhone,
//     emergencyContactRelation,
//     hotelAddress,
//     localGuideContact,
//     insuranceCompany,
//     insurancePolicyNumber,
//     // KYC specific fields
//     aadharNumber,
//     passportNumber,
//     govIdType,
//     govIdNumber
//   } = req.body;

//   // Check if user already exists
//   const existingUser = await User.findOne({ 
//     $or: [{ touristId }, { email }, { 'kycDetails.aadharNumber': aadharNumber }]
//   });

//   if (existingUser) {
//     let existingField = 'unknown';
//     if (existingUser.touristId === touristId) existingField = 'touristId';
//     else if (existingUser.email === email) existingField = 'email';
//     else if (existingUser.kycDetails?.aadharNumber === aadharNumber) existingField = 'aadharNumber';

//     return res.status(409).json(formatError(
//       'User already exists with this information',
//       'USER_ALREADY_EXISTS',
//       {
//         existingField,
//         message: `A user with this ${existingField} already exists`
//       }
//     ));
//   }

//   // Create new user with KYC pending status
//   const user = new User({
//     touristId,
//     fullName,
//     email,
//     mobileNumber,
//     nationality,
//     age,
//     gender,
//     emergencyContactName,
//     emergencyContactPhone,
//     emergencyContactRelation,
//     hotelAddress: hotelAddress || '',
//     localGuideContact: localGuideContact || '',
//     insuranceCompany: insuranceCompany || '',
//     insurancePolicyNumber: insurancePolicyNumber || '',
//     // KYC fields
//     kycDetails: {
//       aadharNumber,
//       passportNumber: passportNumber || '',
//       govIdType,
//       govIdNumber,
//       status: 'PENDING',
//       submittedAt: new Date()
//     },
//     blockchainStatus: 'PENDING',
//     isVerified: false,
//     isActive: false // Inactive until verified
//   });

//   await user.save();

//   // Initiate blockchain verification process
//   try {
//     // Note: Implement actual blockchain service
//     // For now, we'll simulate the process
//     user.blockchainStatus = 'PROCESSING';
//     await user.save();
    
//     logger.info('Blockchain registration initiated:', { touristId });
//   } catch (error) {
//     logger.error('Blockchain registration failed:', { touristId, error: error.message });
//     user.blockchainStatus = 'FAILED';
//     await user.save();
//   }

//   // Send verification email
//   try {
//     await notificationService.sendEmergencyNotification({
//       type: 'EMAIL',
//       recipient: email,
//       message: `Dear ${fullName}, your KYC verification has been submitted successfully. Tourist ID: ${touristId}. You will receive an update within 24-48 hours.`,
//       sosId: 'KYC_VERIFICATION'
//     });
//   } catch (emailError) {
//     logger.warn('Verification email failed:', emailError);
//   }

//   logger.info('New user registered for KYC verification:', { touristId, email });

//   res.status(201).json(formatSuccess({
//     touristId,
//     fullName,
//     email,
//     kycStatus: 'PENDING',
//     blockchainStatus: 'PROCESSING',
//     message: 'Registration successful. KYC verification is in progress.',
//     estimatedVerificationTime: '24-48 hours',
//     nextSteps: [
//       'Wait for KYC document verification',
//       'Check email for updates',
//       'Login will be enabled after verification'
//     ]
//   }, 'Registration successful. KYC verification initiated.'));
// });

// // Check KYC verification status
// const checkKYCStatus = catchAsync(async (req, res) => {
//   const { touristId } = req.params;

//   const user = await User.findOne({ touristId })
//     .select('touristId fullName kycDetails blockchainStatus isVerified isActive');

//   if (!user) {
//     return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
//   }

//   const statusResponse = {
//     touristId: user.touristId,
//     fullName: user.fullName,
//     kycStatus: user.kycDetails?.status || 'NOT_SUBMITTED',
//     blockchainStatus: user.blockchainStatus,
//     isVerified: user.isVerified,
//     canLogin: user.canLogin,
//     submittedAt: user.kycDetails?.submittedAt,
//     verifiedAt: user.kycDetails?.verifiedAt,
//     overallStatus: user.canLogin ? 'READY' : 'PENDING',
//     message: user.canLogin ? 
//       'Verification complete. You can now login.' :
//       user.kycDetails?.status === 'REJECTED' ?
//       `KYC rejected: ${user.kycDetails.rejectionReason}` :
//       'Verification in progress. Please wait.'
//   };

//   res.status(200).json(formatSuccess(statusResponse));
// });

// // Get current user profile
// const getProfile = catchAsync(async (req, res) => {
//   const user = await User.findById(req.userId);
  
//   if (!user) {
//     return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
//   }

//   res.status(200).json(formatSuccess({
//     user: sanitizeUser(user)
//   }));
// });

// // Update user profile
// const updateProfile = catchAsync(async (req, res) => {
//   const userId = req.userId;
//   const updateData = req.body;

//   // Remove fields that shouldn't be updated directly
//   delete updateData.touristId;
//   delete updateData.kycDetails;
//   delete updateData.blockchainStatus;
//   delete updateData.isActive;
//   delete updateData.isVerified;
//   delete updateData._id;
//   delete updateData.createdAt;
//   delete updateData.updatedAt;

//   const user = await User.findByIdAndUpdate(
//     userId, 
//     { 
//       ...updateData,
//       'deviceInfo.lastActiveAt': new Date()
//     }, 
//     { 
//       new: true, 
//       runValidators: true 
//     }
//   );

//   if (!user) {
//     return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
//   }

//   logger.info('User profile updated:', { touristId: user.touristId });

//   res.status(200).json(formatSuccess({
//     user: sanitizeUser(user)
//   }, 'Profile updated successfully'));
// });

// // Refresh token
// const refreshToken = catchAsync(async (req, res) => {
//   const user = await User.findById(req.userId);
  
//   if (!user || !user.isActive || !user.canLogin) {
//     return res.status(401).json(formatError('Session expired or account access revoked', 'INVALID_SESSION'));
//   }

//   // Update last active timestamp
//   user.deviceInfo.lastActiveAt = new Date();
//   await user.save();

//   const token = generateToken({ id: user._id, touristId: user.touristId });

//   res.status(200).json(formatSuccess({
//     token,
//     expiresIn: process.env.JWT_EXPIRES_IN || '7d',
//     user: sanitizeUser(user)
//   }, 'Token refreshed successfully'));
// });

// // Logout
// const logout = catchAsync(async (req, res) => {
//   logger.info('User logged out:', { touristId: req.touristId });
  
//   res.status(200).json(formatSuccess(null, 'Logged out successfully'));
// });

// // Verify blockchain status
// const verifyBlockchain = catchAsync(async (req, res) => {
//   const { touristId } = req.params;
  
//   try {
//     // Note: Implement actual blockchain verification
//     const blockchainStatus = 'VALID'; // Simulated response
//     const details = {
//       touristId,
//       verified: true,
//       validFrom: new Date(),
//       validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
//     };
    
//     res.status(200).json(formatSuccess({
//       touristId,
//       status: blockchainStatus,
//       details,
//       verified: blockchainStatus === 'VALID'
//     }));
//   } catch (error) {
//     logger.error('Blockchain verification error:', { touristId, error: error.message });
//     res.status(500).json(formatError('Blockchain verification failed', 'BLOCKCHAIN_ERROR'));
//   }
// });

// module.exports = {
//   login,
//   register,
//   checkKYCStatus,
//   getProfile,
//   updateProfile,
//   refreshToken,
//   logout,
//   verifyBlockchain
// };


const User = require('../models/User');
const blockchainService = require('../services/blockchainService');
const notificationService = require('../services/notificationService');
const { generateToken, sanitizeUser, formatError, formatSuccess, hashString } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Step 1: Register user and send OTP
const register = catchAsync(async (req, res) => {
  const {
    fullName,
    email,
    mobileNumber,
    nationality,
    age,
    gender,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
    aadharNumber,
    govIdType = 'AADHAR',
    currentDestination,
    hotelAddress,
    insuranceCompany
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [{ email }, { 'kycDetails.aadharNumber': aadharNumber }]
  });

  if (existingUser) {
    if (existingUser.emailVerification.isVerified) {
      return res.status(409).json(formatError(
        'User already exists and is verified',
        'USER_ALREADY_EXISTS'
      ));
    } else {
      // User exists but not verified, resend OTP
      const otp = existingUser.generateOTP();
      await existingUser.save();
      
      await notificationService.sendOTPEmail(email, otp, fullName);
      
      return res.status(200).json(formatSuccess({
        message: 'OTP resent to your email',
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        nextStep: 'verify_otp'
      }));
    }
  }

  // Create new user
  const user = new User({
    fullName,
    email,
    mobileNumber,
    nationality,
    age,
    gender,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
    kycDetails: {
      aadharNumber,
      govIdType
    },
    currentDestination: currentDestination || '',
    hotelAddress: hotelAddress || '',
    insuranceCompany: insuranceCompany || ''
  });

  // Generate and send OTP
  const otp = user.generateOTP();
  await user.save();

  // Send OTP email
  try {
    await notificationService.sendOTPEmail(email, otp, fullName);
  } catch (error) {
    logger.error('Failed to send OTP email:', error);
    return res.status(500).json(formatError('Failed to send OTP. Please try again.', 'OTP_SEND_FAILED'));
  }

  logger.info('User registered, OTP sent:', { email });

  res.status(201).json(formatSuccess({
    message: 'Registration successful! Please check your email for OTP.',
    email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    nextStep: 'verify_otp',
    expiresIn: '10 minutes'
  }));
});

// Step 2: Verify OTP and assign Blockchain ID
const verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json(formatError('Email and OTP are required', 'MISSING_CREDENTIALS'));
  }

  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  if (user.emailVerification.isVerified) {
    return res.status(400).json(formatError('Email already verified', 'ALREADY_VERIFIED'));
  }

  if (user.emailVerification.attempts >= 5) {
    return res.status(429).json(formatError('Too many failed attempts. Please register again.', 'MAX_ATTEMPTS_EXCEEDED'));
  }

  // Verify OTP
  const isValidOTP = user.verifyOTP(otp);
  
  if (!isValidOTP) {
    await user.save(); // Save attempt count
    const remainingAttempts = 5 - user.emailVerification.attempts;
    return res.status(400).json(formatError(
      `Invalid or expired OTP. ${remainingAttempts} attempts remaining.`,
      'INVALID_OTP',
      { remainingAttempts }
    ));
  }

  // Generate Tourist ID
  const touristId = user.generateTouristId();
  user.touristId = touristId;
  
  // Register on blockchain
  try {
    const txHash = await blockchainService.registerTourist({
      name: user.fullName,
      aadharHash: hashString(user.kycDetails.aadharNumber),
      tripId: `TRIP_${touristId}`,
      touristId: touristId
    });
    
    user.blockchainTransactionHash = txHash;
    user.blockchainStatus = 'ASSIGNED';
  } catch (error) {
    logger.error('Blockchain registration failed:', error);
    user.blockchainStatus = 'FAILED';
  }

  await user.save();

  // Generate JWT token
  const token = generateToken({ id: user._id, touristId: user.touristId });

  // Send welcome email
  try {
    await notificationService.sendWelcomeEmail(user.email, user.fullName, touristId);
  } catch (error) {
    logger.warn('Welcome email failed:', error);
  }

  logger.info('User verified and Tourist ID assigned:', { touristId, email });

  res.status(200).json(formatSuccess({
    message: 'Email verified successfully! Welcome to Smart Tourist Safety.',
    user: sanitizeUser(user),
    touristId,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }));
});

// Step 3: Login with Tourist ID
const login = catchAsync(async (req, res) => {
  const { touristId } = req.body;

  if (!touristId) {
    return res.status(400).json(formatError('Tourist ID is required', 'MISSING_TOURIST_ID'));
  }

  const user = await User.findOne({ touristId });
  
  if (!user) {
    return res.status(404).json(formatError(
      'Tourist ID not found. Please register first.',
      'USER_NOT_FOUND'
    ));
  }

  if (!user.canLogin) {
    return res.status(403).json(formatError(
      'Account not verified or inactive. Please complete registration.',
      'ACCOUNT_NOT_READY',
      {
        isVerified: user.emailVerification.isVerified,
        isActive: user.isActive,
        hasTouristId: !!user.touristId
      }
    ));
  }

  // Update last active
  user.deviceInfo.lastActiveAt = new Date();
  await user.save();

  const token = generateToken({ id: user._id, touristId: user.touristId });

  logger.info('User logged in successfully:', { touristId });

  res.status(200).json(formatSuccess({
    user: sanitizeUser(user),
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }, 'Login successful'));
});

// Resend OTP
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

  // Reset attempts if last attempt was more than 1 hour ago
  if (user.emailVerification.otpExpiry && new Date() - user.emailVerification.otpExpiry > 3600000) {
    user.emailVerification.attempts = 0;
  }

  if (user.emailVerification.attempts >= 5) {
    return res.status(429).json(formatError('Too many attempts. Please try again after 1 hour.', 'MAX_ATTEMPTS_EXCEEDED'));
  }

  const otp = user.generateOTP();
  await user.save();

  try {
    await notificationService.sendOTPEmail(email, otp, user.fullName);
  } catch (error) {
    return res.status(500).json(formatError('Failed to send OTP', 'OTP_SEND_FAILED'));
  }

  res.status(200).json(formatSuccess({
    message: 'OTP sent to your email',
    email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    expiresIn: '10 minutes'
  }));
});

// Get profile
const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.userId);
  
  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  res.status(200).json(formatSuccess({
    user: sanitizeUser(user)
  }));
});

// Update profile
const updateProfile = catchAsync(async (req, res) => {
  const userId = req.userId;
  const updateData = req.body;

  // Remove protected fields
  delete updateData.touristId;
  delete updateData.email;
  delete updateData.emailVerification;
  delete updateData.kycDetails;
  delete updateData.blockchainStatus;
  delete updateData.isActive;

  const user = await User.findByIdAndUpdate(
    userId, 
    { 
      ...updateData,
      'deviceInfo.lastActiveAt': new Date()
    }, 
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json(formatError('User not found', 'USER_NOT_FOUND'));
  }

  res.status(200).json(formatSuccess({
    user: sanitizeUser(user)
  }, 'Profile updated successfully'));
});

// Refresh token
const refreshToken = catchAsync(async (req, res) => {
  const user = await User.findById(req.userId);
  
  if (!user || !user.canLogin) {
    return res.status(401).json(formatError('Invalid session', 'INVALID_SESSION'));
  }

  user.deviceInfo.lastActiveAt = new Date();
  await user.save();

  const token = generateToken({ id: user._id, touristId: user.touristId });

  res.status(200).json(formatSuccess({
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }));
});

// Logout
const logout = catchAsync(async (req, res) => {
  logger.info('User logged out:', { touristId: req.touristId });
  res.status(200).json(formatSuccess(null, 'Logged out successfully'));
});

// Add this function to controllers/authController.js before module.exports

// Verify blockchain status
const verifyBlockchain = catchAsync(async (req, res) => {
  const { touristId } = req.params;
  
  if (!touristId) {
    return res.status(400).json(formatError('Tourist ID is required', 'MISSING_TOURIST_ID'));
  }

  try {
    const user = await User.findOne({ touristId });
    
    if (!user) {
      return res.status(404).json(formatError('Tourist ID not found', 'USER_NOT_FOUND'));
    }

    // Get blockchain status
    const blockchainStatus = await blockchainService.getVerificationStatus(touristId);
    const details = await blockchainService.getTouristDetails(touristId);
    
    res.status(200).json(formatSuccess({
      touristId,
      status: blockchainStatus,
      details,
      verified: blockchainStatus === 'VALID' || blockchainStatus === 'ASSIGNED',
      user: {
        fullName: user.fullName,
        email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        isActive: user.isActive,
        blockchainStatus: user.blockchainStatus
      }
    }));
  } catch (error) {
    logger.error('Blockchain verification error:', { touristId, error: error.message });
    res.status(500).json(formatError('Blockchain verification failed', 'BLOCKCHAIN_ERROR'));
  }
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
  verifyBlockchain  // ✅ Add this line
};

