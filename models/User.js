// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//   // Basic Information
//   touristId: {
//     type: String,
//     required: true,
//     unique: true,
//     index: true,
//     trim: true
//   },
//   fullName: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 100
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true,
//     match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
//   },
//   mobileNumber: {
//     type: String,
//     required: true,
//     trim: true,
//     match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid mobile number']
//   },
  
//   // Personal Details
//   nationality: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 50
//   },
//   age: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   gender: {
//     type: String,
//     required: true,
//     enum: ['Male', 'Female', 'Other'],
//     trim: true
//   },
  
//   // Travel Information
//   currentDestination: {
//     type: String,
//     trim: true,
//     maxlength: 100,
//     default: ''
//   },
//   hotelAddress: {
//     type: String,
//     trim: true,
//     maxlength: 200,
//     default: ''
//   },
//   localGuideContact: {
//     type: String,
//     trim: true,
//     maxlength: 20,
//     default: ''
//   },
  
//   // Emergency Contact Details (matching your Flutter UserModel exactly)
//   emergencyContact: {
//     type: String,
//     trim: true,
//     default: ''
//   },
//   emergencyContactName: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 100
//   },
//   emergencyContactPhone: {
//     type: String,
//     required: true,
//     trim: true,
//     match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid emergency contact number']
//   },
//   emergencyContactRelation: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 50
//   },
  
//   // Insurance Information
//   insuranceCompany: {
//     type: String,
//     trim: true,
//     maxlength: 100,
//     default: ''
//   },
//   insurancePolicyNumber: {
//     type: String,
//     trim: true,
//     maxlength: 50,
//     default: ''
//   },
  
//   // Medical Information
//   medicalConditions: [{
//     condition: String,
//     severity: {
//       type: String,
//       enum: ['Low', 'Medium', 'High', 'Critical']
//     },
//     medications: [String]
//   }],
  
//   bloodGroup: {
//     type: String,
//     enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
//     trim: true,
//     default: ''
//   },
  
//   allergies: [String],
  
//   // Profile and Security
//   profilePhoto: {
//     type: String, // URL to uploaded photo
//     default: null
//   },
  
//   isActive: {
//     type: Boolean,
//     default: true
//   },
  
//   isVerified: {
//     type: Boolean,
//     default: false
//   },
  
//   // Blockchain Integration
//   blockchainStatus: {
//     type: String,
//     enum: ['PENDING', 'VERIFIED', 'EXPIRED', 'INVALID', 'VALID'],
//     default: 'PENDING'
//   },
  
//   blockchainTransactionHash: {
//     type: String,
//     default: null
//   },
  
//   // Location and Safety
//   lastKnownLocation: {
//     latitude: {
//       type: Number,
//       min: -90,
//       max: 90
//     },
//     longitude: {
//       type: Number,
//       min: -180,
//       max: 180
//     },
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     address: String
//   },
  
//   safetyStatus: {
//     type: String,
//     enum: ['SAFE', 'WARNING', 'DANGER', 'SOS'],
//     default: 'SAFE'
//   },
  
//   // Trip Information
//   currentTrip: {
//     tripId: String,
//     startDate: Date,
//     endDate: Date,
//     destinations: [String],
//     status: {
//       type: String,
//       enum: ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
//       default: 'PLANNED'
//     }
//   },
  
//   // Device and Session Information
//   deviceInfo: {
//     platform: String,
//     appVersion: String,
//     lastActiveAt: {
//       type: Date,
//       default: Date.now
//     }
//   }
// }, {
//   timestamps: true,
//   toJSON: { 
//     virtuals: true,
//     transform: function(doc, ret) {
//       delete ret.password;
//       delete ret.__v;
//       return ret;
//     }
//   },
//   toObject: { virtuals: true }
// });

// // Indexes for better performance
// UserSchema.index({ email: 1, touristId: 1 });
// UserSchema.index({ currentDestination: 1 });
// UserSchema.index({ safetyStatus: 1 });
// UserSchema.index({ 'lastKnownLocation.timestamp': -1 });
// UserSchema.index({ blockchainStatus: 1 });
// UserSchema.index({ isActive: 1 });

// // Virtual for full emergency contact (for backward compatibility)
// UserSchema.virtual('emergencyContactFull').get(function() {
//   return {
//     name: this.emergencyContactName,
//     phone: this.emergencyContactPhone,
//     relation: this.emergencyContactRelation
//   };
// });

// // Method to check if user is currently traveling
// UserSchema.methods.isCurrentlyTraveling = function() {
//   if (!this.currentTrip) return false;
//   const now = new Date();
//   return this.currentTrip.status === 'ACTIVE' && 
//          this.currentTrip.startDate <= now && 
//          this.currentTrip.endDate >= now;
// };

// // Method to update last active timestamp
// UserSchema.methods.updateLastActive = function() {
//   this.deviceInfo.lastActiveAt = new Date();
//   return this.save();
// };

// // Method to check if user needs emergency attention
// UserSchema.methods.needsEmergencyAttention = function() {
//   return this.safetyStatus === 'SOS' || this.safetyStatus === 'DANGER';
// };

// // Pre-save middleware
// UserSchema.pre('save', function(next) {
//   // Update verification status based on blockchain status
//   if (this.blockchainStatus === 'VERIFIED' || this.blockchainStatus === 'VALID') {
//     this.isVerified = true;
//   }
  
//   // Ensure emergency contact field is populated for backward compatibility
//   if (!this.emergencyContact && this.emergencyContactName) {
//     this.emergencyContact = `${this.emergencyContactName} (${this.emergencyContactRelation}) - ${this.emergencyContactPhone}`;
//   }
  
//   next();
// });

// // Static method to find users by location
// UserSchema.statics.findNearbyUsers = function(longitude, latitude, maxDistance = 5000) {
//   return this.find({
//     'lastKnownLocation.latitude': { $exists: true },
//     'lastKnownLocation.longitude': { $exists: true },
//     isActive: true
//   }).where('lastKnownLocation').near({
//     center: [longitude, latitude],
//     maxDistance: maxDistance / 6371000 // Convert to radians
//   });
// };

// // Static method to find users in emergency
// UserSchema.statics.findUsersInEmergency = function() {
//   return this.find({
//     safetyStatus: { $in: ['SOS', 'DANGER'] },
//     isActive: true
//   }).sort({ 'lastKnownLocation.timestamp': -1 });
// };

// module.exports = mongoose.model('User', UserSchema);


// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//   // Basic Information
//   touristId: {
//     type: String,
//     required: true,
//     unique: true,
//     index: true,
//     trim: true
//   },
//   fullName: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 100
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true,
//     match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
//   },
//   mobileNumber: {
//     type: String,
//     required: true,
//     trim: true,
//     match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid mobile number']
//   },
  
//   // Personal Details
//   nationality: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 50
//   },
//   age: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   gender: {
//     type: String,
//     required: true,
//     enum: ['Male', 'Female', 'Other'],
//     trim: true
//   },
  
//   // Travel Information
//   currentDestination: {
//     type: String,
//     trim: true,
//     maxlength: 100,
//     default: ''
//   },
//   hotelAddress: {
//     type: String,
//     trim: true,
//     maxlength: 200,
//     default: ''
//   },
//   localGuideContact: {
//     type: String,
//     trim: true,
//     maxlength: 20,
//     default: ''
//   },
  
//   // Emergency Contact Details
//   emergencyContact: {
//     type: String,
//     trim: true,
//     default: ''
//   },
//   emergencyContactName: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 100
//   },
//   emergencyContactPhone: {
//     type: String,
//     required: true,
//     trim: true,
//     match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid emergency contact number']
//   },
//   emergencyContactRelation: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 50
//   },
  
//   // Insurance Information
//   insuranceCompany: {
//     type: String,
//     trim: true,
//     maxlength: 100,
//     default: ''
//   },
//   insurancePolicyNumber: {
//     type: String,
//     trim: true,
//     maxlength: 50,
//     default: ''
//   },
  
//   // KYC Verification Details
//   kycDetails: {
//     aadharNumber: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true
//     },
//     passportNumber: {
//       type: String,
//       trim: true,
//       default: ''
//     },
//     govIdType: {
//       type: String,
//       enum: ['AADHAR', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE'],
//       required: true
//     },
//     govIdNumber: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     documents: [{
//       type: {
//         type: String,
//         enum: ['AADHAR_FRONT', 'AADHAR_BACK', 'PASSPORT', 'PHOTO', 'ADDRESS_PROOF']
//       },
//       url: String,
//       uploadedAt: {
//         type: Date,
//         default: Date.now
//       }
//     }],
//     status: {
//       type: String,
//       enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'],
//       default: 'PENDING'
//     },
//     submittedAt: {
//       type: Date,
//       default: Date.now
//     },
//     verifiedAt: Date,
//     verifiedBy: String,
//     rejectionReason: String
//   },
  
//   // Medical Information
//   medicalConditions: [{
//     condition: String,
//     severity: {
//       type: String,
//       enum: ['Low', 'Medium', 'High', 'Critical']
//     },
//     medications: [String]
//   }],
  
//   bloodGroup: {
//     type: String,
//     enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
//     trim: true,
//     default: ''
//   },
  
//   allergies: [String],
  
//   // Profile and Security
//   profilePhoto: {
//     type: String,
//     default: null
//   },
  
//   isActive: {
//     type: Boolean,
//     default: false // Inactive until KYC verified
//   },
  
//   isVerified: {
//     type: Boolean,
//     default: false
//   },
  
//   // Blockchain Integration
//   blockchainStatus: {
//     type: String,
//     enum: ['PENDING', 'PROCESSING', 'VERIFIED', 'EXPIRED', 'INVALID', 'VALID', 'FAILED'],
//     default: 'PENDING'
//   },
  
//   blockchainTransactionHash: {
//     type: String,
//     default: null
//   },
  
//   // Location and Safety
//   lastKnownLocation: {
//     latitude: {
//       type: Number,
//       min: -90,
//       max: 90
//     },
//     longitude: {
//       type: Number,
//       min: -180,
//       max: 180
//     },
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     address: String
//   },
  
//   safetyStatus: {
//     type: String,
//     enum: ['SAFE', 'WARNING', 'DANGER', 'SOS'],
//     default: 'SAFE'
//   },
  
//   // Trip Information
//   currentTrip: {
//     tripId: String,
//     startDate: Date,
//     endDate: Date,
//     destinations: [String],
//     status: {
//       type: String,
//       enum: ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
//       default: 'PLANNED'
//     }
//   },
  
//   // Device and Session Information
//   deviceInfo: {
//     platform: String,
//     appVersion: String,
//     lastActiveAt: {
//       type: Date,
//       default: Date.now
//     }
//   }
// }, {
//   timestamps: true,
//   toJSON: { 
//     virtuals: true,
//     transform: function(doc, ret) {
//       delete ret.__v;
//       delete ret.blockchainTransactionHash;
//       // Hide sensitive KYC data
//       if (ret.kycDetails && ret.kycDetails.aadharNumber) {
//         ret.kycDetails.aadharNumber = ret.kycDetails.aadharNumber.replace(/\d(?=\d{4})/g, '*');
//       }
//       return ret;
//     }
//   },
//   toObject: { virtuals: true }
// });

// // Indexes for better performance
// UserSchema.index({ email: 1, touristId: 1 });
// UserSchema.index({ 'kycDetails.aadharNumber': 1 });
// UserSchema.index({ blockchainStatus: 1, isActive: 1 });
// UserSchema.index({ 'kycDetails.status': 1 });
// UserSchema.index({ safetyStatus: 1 });

// // Virtual for KYC verification status
// UserSchema.virtual('canLogin').get(function() {
//   return this.isActive && this.isVerified && 
//          (this.blockchainStatus === 'VERIFIED' || this.blockchainStatus === 'VALID');
// });

// // Method to check if user can access app
// UserSchema.methods.hasAccessPermission = function() {
//   return this.canLogin;
// };

// // Pre-save middleware
// UserSchema.pre('save', function(next) {
//   // Update verification status based on blockchain and KYC status
//   if ((this.blockchainStatus === 'VERIFIED' || this.blockchainStatus === 'VALID') && 
//       this.kycDetails.status === 'APPROVED') {
//     this.isVerified = true;
//     this.isActive = true;
//   }
  
//   // Ensure emergency contact field is populated
//   if (!this.emergencyContact && this.emergencyContactName) {
//     this.emergencyContact = `${this.emergencyContactName} (${this.emergencyContactRelation}) - ${this.emergencyContactPhone}`;
//   }
  
//   next();
// });

// module.exports = mongoose.model('User', UserSchema);


const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Basic Information
  touristId: {
    type: String,
    unique: true,
    sparse: true, // Auto-generated after OTP verification
    trim: true
  },
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
  nationality: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  age: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other'],
    trim: true
  },
  
  // Emergency Contact Details
  emergencyContactName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  emergencyContactPhone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid emergency contact number']
  },
  emergencyContactRelation: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  // Travel Information (Optional)
  currentDestination: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  hotelAddress: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  insuranceCompany: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  
  // KYC Information
  kycDetails: {
    aadharNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    govIdType: {
      type: String,
      enum: ['AADHAR', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE'],
      required: true,
      default: 'AADHAR'
    }
  },
  
  // Email Verification
  emailVerification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    otp: {
      type: String,
      default: null
    },
    otpExpiry: {
      type: Date,
      default: null
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: false // Activated after OTP verification
  },
  
  // Blockchain Integration
  blockchainStatus: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'VERIFIED', 'FAILED'],
    default: 'PENDING'
  },
  
  blockchainTransactionHash: {
    type: String,
    default: null
  },
  
  // Location and Safety
  lastKnownLocation: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    address: String
  },
  
  safetyStatus: {
    type: String,
    enum: ['SAFE', 'WARNING', 'DANGER', 'SOS'],
    default: 'SAFE'
  },
  
  // Device Info
  deviceInfo: {
    platform: String,
    appVersion: String,
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.emailVerification.otp;
      delete ret.blockchainTransactionHash;
      // Mask Aadhar number
      if (ret.kycDetails && ret.kycDetails.aadharNumber) {
        ret.kycDetails.aadharNumber = ret.kycDetails.aadharNumber.replace(/\d(?=\d{4})/g, '*');
      }
      return ret;
    }
  }
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ touristId: 1 });
UserSchema.index({ 'kycDetails.aadharNumber': 1 });
UserSchema.index({ 'emailVerification.isVerified': 1 });

// Virtual for login eligibility
UserSchema.virtual('canLogin').get(function() {
  return this.emailVerification.isVerified && this.isActive && this.touristId;
});

// Method to generate OTP
UserSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.emailVerification.otp = otp;
  this.emailVerification.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// Method to verify OTP
UserSchema.methods.verifyOTP = function(inputOTP) {
  if (!this.emailVerification.otp) return false;
  if (new Date() > this.emailVerification.otpExpiry) return false;
  if (this.emailVerification.attempts >= 5) return false;
  
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

// Method to generate Tourist ID
UserSchema.methods.generateTouristId = function() {
  const prefix = 'ST'; // Smart Tourist
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${year}${random}`;
};

module.exports = mongoose.model('User', UserSchema);
