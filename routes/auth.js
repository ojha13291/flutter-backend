// // const express = require('express');
// // const router = express.Router();

// // const authController = require('../controllers/authController');
// // const { authenticate } = require('../middleware/auth');
// // const { validateUserRegistration } = require('../middleware/validation');

// // // @route   POST /api/auth/login
// // // @desc    Login with blockchain tourist ID
// // // @access  Public
// // router.post('/login', authController.login);

// // // @route   POST /api/auth/register  
// // // @desc    Register new user with complete profile
// // // @access  Public
// // router.post('/register', validateUserRegistration, authController.register);

// // // @route   GET /api/auth/profile
// // // @desc    Get current user profile
// // // @access  Private
// // router.get('/profile', authenticate, authController.getProfile);

// // // @route   POST /api/auth/refresh
// // // @desc    Refresh JWT token
// // // @access  Private
// // router.post('/refresh', authenticate, authController.refreshToken);

// // // @route   POST /api/auth/logout
// // // @desc    Logout user
// // // @access  Private
// // router.post('/logout', authenticate, authController.logout);

// // module.exports = router;


// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');
// const { authenticate } = require('../middleware/auth');
// const { validateUserRegistration } = require('../middleware/validation');

// // @route   POST /api/auth/login
// // @desc    Login with blockchain ID (matches Flutter login)
// router.post('/login', authController.login);

// // @route   POST /api/auth/register  
// // @desc    Register new user
// router.post('/register', validateUserRegistration, authController.register);

// // @route   GET /api/auth/profile
// // @desc    Get current user profile  
// router.get('/profile', authenticate, authController.getProfile);

// // @route   POST /api/auth/refresh
// // @desc    Refresh JWT token
// router.post('/refresh', authenticate, authController.refreshToken);

// // @route   POST /api/auth/logout
// // @desc    Logout user
// router.post('/logout', authenticate, authController.logout);

// module.exports = router;


// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');
// const { authenticate } = require('../middleware/auth');
// const { validateUserRegistration } = require('../middleware/validation');

// // @route   POST /api/auth/register
// // @desc    Register new user with KYC verification
// // @access  Public
// router.post('/register', validateUserRegistration, authController.register);

// // @route   POST /api/auth/login
// // @desc    Login with verified tourist ID
// // @access  Public
// router.post('/login', authController.login);

// // @route   GET /api/auth/kyc-status/:touristId
// // @desc    Check KYC verification status
// // @access  Public
// router.get('/kyc-status/:touristId', authController.checkKYCStatus);

// // @route   GET /api/auth/profile
// // @desc    Get current user profile  
// // @access  Private
// router.get('/profile', authenticate, authController.getProfile);

// // @route   PUT /api/auth/profile
// // @desc    Update user profile
// // @access  Private
// router.put('/profile', authenticate, authController.updateProfile);

// // @route   POST /api/auth/refresh
// // @desc    Refresh JWT token
// // @access  Private
// router.post('/refresh', authenticate, authController.refreshToken);

// // @route   POST /api/auth/logout
// // @desc    Logout user
// // @access  Private
// router.post('/logout', authenticate, authController.logout);

// module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateUserRegistration, validateOTPVerification, validateLogin } = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Register user and send OTP
// @access  Public
router.post('/register', validateUserRegistration, authController.register);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and assign Tourist ID
// @access  Public
router.post('/verify-otp', validateOTPVerification, authController.verifyOTP);

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP to email
// @access  Public
router.post('/resend-otp', authController.resendOTP);

// @route   POST /api/auth/login
// @desc    Login with Tourist ID
// @access  Public
router.post('/login', validateLogin, authController.login);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticate, authController.getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, authController.updateProfile);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authenticate, authController.refreshToken);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, authController.logout);

module.exports = router;

