const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // Basic Information
    touristId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    // Medical Information
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
      default: null
    },
    allergies: {
      type: [String], // Array of strings
      default: []
    },
    medicalConditions: [
      {
        condition: { type: String, required: true },
        severity: { type: String, enum: ['MILD', 'MODERATE', 'SEVERE', null], default: 'MILD' },
        medication: String,
        notes: String,
        diagnosedDate: Date
      }
    ],

    // Identity / Profile
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid mobile number']
    },

    // Personal Details
    nationality: { type: String, required: true, trim: true, maxlength: 50 },
    age: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'], trim: true },

    // Emergency Contact Details
    emergencyContactName: { type: String, required: true, trim: true, maxlength: 100 },
    emergencyContactPhone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid emergency contact number']
    },
    emergencyContactRelation: { type: String, required: true, trim: true, maxlength: 50 },

    // Travel Information
    currentDestination: { type: String, trim: true, maxlength: 100, default: '' },
    hotelAddress: { type: String, trim: true, maxlength: 200, default: '' },
    insuranceCompany: { type: String, trim: true, maxlength: 100, default: '' },

    // Store trip details as Numbers (Unix ms)
    tripDetails: {
      validFrom: { type: Number, default: null },
      validTo: { type: Number, default: null }
    },

    // KYC Information
    kycDetails: {
      aadharNumber: { type: String, required: true, unique: true, trim: true },
      govIdType: {
        type: String,
        enum: ['AADHAR', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE'],
        required: true,
        default: 'AADHAR'
      }
    },

    // Email Verification
    emailVerification: {
      isVerified: { type: Boolean, default: false },
      otp: { type: String, default: null },
      otpExpiry: { type: Date, default: null },
      attempts: { type: Number, default: 0, max: 5 },
      verifiedAt: { type: Date, default: null }
    },

    // Account Status
    isActive: { type: Boolean, default: false },

    // Blockchain Integration
    blockchainStatus: {
      type: String,
      enum: ['PENDING', 'ASSIGNED', 'VERIFIED', 'FAILED'],
      default: 'PENDING'
    },
    blockchainTransactionHash: { type: String, default: null },

    // Location and Safety
    lastKnownLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      timestamp: { type: Date, default: Date.now },
      address: String
    },
    safetyStatus: { type: String, enum: ['SAFE', 'WARNING', 'DANGER', 'SOS'], default: 'SAFE' },

    // Device Info
    deviceInfo: {
      platform: String,
      appVersion: String,
      lastActiveAt: { type: Date, default: Date.now }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Methods

// Generate OTP
UserSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerification.otp = otp;
  this.emailVerification.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  // reset attempts when a new OTP is generated
  this.emailVerification.attempts = 0;
  return otp;
};

// Verify OTP
UserSchema.methods.verifyOTP = function (inputOTP) {
  // Guard: OTP missing/expired or too many attempts
  if (
    !this.emailVerification.otp ||
    new Date() > this.emailVerification.otpExpiry ||
    this.emailVerification.attempts >= 5
  ) {
    return false;
  }

  this.emailVerification.attempts += 1;

  if (this.emailVerification.otp === inputOTP) {
    this.emailVerification.isVerified = true;
    this.emailVerification.verifiedAt = new Date();
    this.emailVerification.otp = null;
    this.emailVerification.otpExpiry = null;
    this.isActive = true;
    return true;
  }

  return false;
};

// Generate Tourist ID
UserSchema.methods.generateTouristId = function () {
  const prefix = 'ST';
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${year}${random}`;
};

// Virtuals

// Readiness flag used by login flow
UserSchema.virtual('canLogin').get(function () {
  const now = Date.now();

  // Allow login if either trip bounds are not set, or now is within the window
  const hasTripWindow =
    typeof this.tripDetails?.validFrom === 'number' && typeof this.tripDetails?.validTo === 'number';
  const withinTrip =
    !hasTripWindow || (now >= this.tripDetails.validFrom && now <= this.tripDetails.validTo);

  // Do not hard-block on blockchain status; treat FAILED as allowable for app login
  const chainOk = ['ASSIGNED', 'VERIFIED', 'FAILED'].includes(this.blockchainStatus || 'PENDING');

  return Boolean(this.touristId && this.emailVerification?.isVerified && this.isActive && withinTrip && chainOk);
});

module.exports = mongoose.model('User', UserSchema);
