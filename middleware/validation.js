// const { body, validationResult } = require('express-validator');

// const handleValidationErrors = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       error: 'Validation failed',
//       code: 'VALIDATION_ERROR',
//       details: errors.array()
//     });
//   }
//   next();
// };

// const validateUserRegistration = [
//   body('touristId').notEmpty().withMessage('Tourist ID is required'),
//   body('fullName').notEmpty().withMessage('Full name is required'),
//   body('email').isEmail().withMessage('Valid email is required'),
//   body('mobileNumber').isMobilePhone().withMessage('Valid mobile number required'),
//   body('emergencyContactName').notEmpty().withMessage('Emergency contact name required'),
//   body('emergencyContactPhone').isMobilePhone().withMessage('Valid emergency contact phone required'),
//   handleValidationErrors
// ];

// module.exports = {
//   validateUserRegistration,
//   handleValidationErrors
// };

// const { body, validationResult } = require('express-validator');

// const handleValidationErrors = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       error: 'Validation failed',
//       code: 'VALIDATION_ERROR',
//       details: errors.array()
//     });
//   }
//   next();
// };

// const validateUserRegistration = [
//   body('touristId')
//     .notEmpty()
//     .withMessage('Tourist ID is required')
//     .isLength({ min: 5, max: 20 })
//     .withMessage('Tourist ID must be between 5-20 characters'),
    
//   body('fullName')
//     .notEmpty()
//     .withMessage('Full name is required')
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Full name must be between 2-100 characters'),
    
//   body('email')
//     .isEmail()
//     .withMessage('Valid email is required')
//     .normalizeEmail(),
    
//   body('mobileNumber')
//     .isMobilePhone()
//     .withMessage('Valid mobile number is required'),
    
//   body('nationality')
//     .notEmpty()
//     .withMessage('Nationality is required'),
    
//   body('age')
//     .isNumeric()
//     .withMessage('Age must be a number')
//     .isInt({ min: 18, max: 100 })
//     .withMessage('Age must be between 18-100'),
    
//   body('gender')
//     .isIn(['Male', 'Female', 'Other'])
//     .withMessage('Gender must be Male, Female, or Other'),
    
//   body('emergencyContactName')
//     .notEmpty()
//     .withMessage('Emergency contact name is required'),
    
//   body('emergencyContactPhone')
//     .isMobilePhone()
//     .withMessage('Valid emergency contact phone is required'),
    
//   body('emergencyContactRelation')
//     .notEmpty()
//     .withMessage('Emergency contact relation is required'),
    
//   // KYC specific validations
//   body('aadharNumber')
//     .notEmpty()
//     .withMessage('Aadhar number is required')
//     .matches(/^\d{4}-?\d{4}-?\d{4}$/)
//     .withMessage('Invalid Aadhar number format'),
    
//   body('govIdType')
//     .isIn(['AADHAR', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE'])
//     .withMessage('Invalid government ID type'),
    
//   body('govIdNumber')
//     .notEmpty()
//     .withMessage('Government ID number is required'),
    
//   handleValidationErrors
// ];

// const validateSOSAlert = [
//   body('latitude')
//     .isFloat({ min: -90, max: 90 })
//     .withMessage('Valid latitude is required'),
    
//   body('longitude')
//     .isFloat({ min: -180, max: 180 })
//     .withMessage('Valid longitude is required'),
    
//   body('alertType')
//     .isIn(['PANIC', 'MEDICAL', 'ACCIDENT', 'CRIME', 'NATURAL_DISASTER', 'LOST', 'OTHER'])
//     .withMessage('Invalid alert type'),
    
//   body('severity')
//     .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
//     .withMessage('Invalid severity level'),
    
//   handleValidationErrors
// ];

// const validateLocationUpdate = [
//   body('latitude')
//     .isFloat({ min: -90, max: 90 })
//     .withMessage('Valid latitude is required'),
    
//   body('longitude')
//     .isFloat({ min: -180, max: 180 })
//     .withMessage('Valid longitude is required'),
    
//   handleValidationErrors
// ];

// module.exports = {
//   validateUserRegistration,
//   validateSOSAlert,
//   validateLocationUpdate,
//   handleValidationErrors
// };


const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

const validateUserRegistration = [
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2-100 characters'),
    
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
    
  body('mobileNumber')
    .isMobilePhone()
    .withMessage('Valid mobile number is required'),
    
  body('nationality')
    .notEmpty()
    .withMessage('Nationality is required'),
    
  body('age')
    .isNumeric()
    .withMessage('Age must be a number')
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18-100'),
    
  body('gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
    
  body('emergencyContactName')
    .notEmpty()
    .withMessage('Emergency contact name is required'),
    
  body('emergencyContactPhone')
    .isMobilePhone()
    .withMessage('Valid emergency contact phone is required'),
    
  body('emergencyContactRelation')
    .notEmpty()
    .withMessage('Emergency contact relation is required'),
    
  body('aadharNumber')
    .notEmpty()
    .withMessage('Aadhar number is required')
    .matches(/^\d{4}-?\d{4}-?\d{4}$/)
    .withMessage('Invalid Aadhar number format'),
    
  handleValidationErrors
];

const validateOTPVerification = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
    
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
    
  handleValidationErrors
];

const validateLogin = [
  body('touristId')
    .notEmpty()
    .withMessage('Tourist ID is required')
    .matches(/^ST\d{8}$/)
    .withMessage('Invalid Tourist ID format'),
    
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateOTPVerification,
  validateLogin,
  handleValidationErrors
};
