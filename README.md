🛡️ Smart Tourist Safety Monitor - Backend API
![Socket.io](https://img.shields.io/badge/Socket.io safety monitoring with real-time emergency alerts, blockchain identity verification, and GPS tracking.

🌟 Features
🔐 Email OTP Authentication - Secure registration with auto-generated Tourist IDs

🚨 Real-time SOS System - Instant emergency alerts with Socket.IO

📍 GPS Location Tracking - Live location sharing and monitoring

⛓️ Blockchain Integration - Ethereum-based identity verification

📧 Emergency Notifications - SMS/Email alerts to emergency contacts

🏥 Medical Info Storage - Critical health information for emergencies

📊 Safety Analytics - Tourist safety status monitoring

🚀 Quick Start
Prerequisites
bash
Node.js >= 18.0.0
MongoDB >= 6.0
Git
Installation
bash
# 1. Clone the repository
git clone https://github.com/your-username/smart-tourist-backend.git
cd smart-tourist-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configurations

# 4. Start MongoDB (if local)
mongod

# 5. Run the application
npm run dev
Environment Setup
Create .env file with:

text
# Database
MONGODB_URI=mongodb://localhost:27017/smart_tourist
NODE_ENV=development
PORT=5000

# Security
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Blockchain (Optional - Sepolia Testnet)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
CONTRACT_ADDRESS=0x1Bd0f52Bb46ee6F92A66329DeF060ef8a613B879
OWNER_PRIVATE_KEY=your_private_key_here
🏗️ Architecture
text
┌─────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                   │
│         Flutter App • Web Dashboard • Admin Panel       │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API + Socket.IO
┌─────────────────────▼───────────────────────────────────┐
│                  EXPRESS.JS SERVER                      │
├─────────────────────────────────────────────────────────┤
│ Auth Controller │ SOS Controller │ Location Controller  │
│ • Registration  │ • Emergency    │ • GPS Tracking      │
│ • OTP Verify    │ • Real-time    │ • Location Share    │
│ • JWT Auth      │ • Notifications│ • Geofencing       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   DATA LAYER                            │
│ MongoDB Database │ Socket.IO │ Blockchain │ Email SMTP │
│ • User Profiles  │ • Real-    │ • Identity │ • OTP      │
│ • SOS Alerts     │   time     │ • Smart    │ • Emergency│
│ • Locations      │   Events   │   Contract │ • Alerts   │
└─────────────────────────────────────────────────────────┘
📋 Project Structure
text
smart-tourist-backend/
├── config/
│   ├── database.js          # MongoDB connection
│   └── contractABI.json     # Blockchain smart contract ABI
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── sosController.js     # Emergency SOS system
│   └── locationController.js # GPS tracking
├── models/
│   ├── User.js             # User schema
│   └── SOS.js              # Emergency alert schema
├── routes/
│   ├── auth.js             # Auth endpoints
│   ├── sos.js              # SOS endpoints
│   ├── location.js         # Location endpoints
│   └── user.js             # User management
├── services/
│   ├── blockchainService.js # Ethereum integration
│   └── notificationService.js # Email/SMS service
├── middleware/
│   ├── auth.js             # JWT authentication
│   ├── validation.js       # Input validation
│   └── errorHandler.js     # Error management
├── utils/
│   ├── helpers.js          # Utility functions
│   └── logger.js           # Logging service
├── .env                    # Environment variables
├── server.js               # Main application file
└── package.json
🔄 API Flow
Authentication Flow
text
1. POST /api/auth/register     → Send OTP to email
2. POST /api/auth/verify-otp   → Verify OTP → Get Tourist ID
3. POST /api/auth/login        → Login with Tourist ID
4. Access all protected routes with JWT token
Emergency Flow
text
1. POST /api/sos/alert         → Create emergency alert
2. Socket.IO broadcasts        → Real-time notifications
3. Email/SMS sent              → Emergency contacts notified
4. Location tracked            → Authorities dispatched
🛠️ How to Contribute
We welcome contributions! Here's how to get started:

🔧 Development Setup
bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/smart-tourist-backend.git
cd smart-tourist-backend

# 3. Create a feature branch
git checkout -b feature/your-feature-name

# 4. Install dependencies
npm install

# 5. Set up your development environment
cp .env.example .env
# Configure your .env file

# 6. Start development server
npm run dev
🧪 Running Tests
bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
📝 Making Changes
Create an Issue - Describe the bug or feature request

Fork & Branch - Create a feature branch from main

Code - Make your changes following our coding standards

Test - Add tests for new features and ensure existing tests pass

Document - Update documentation if needed

Commit - Use conventional commit messages

Push & PR - Submit a pull request

💻 Coding Standards
javascript
// ✅ Good: Use meaningful names
const createEmergencyAlert = async (userData) => {
  // Implementation
};

// ✅ Good: Add error handling
try {
  const result = await apiCall();
  return formatSuccess(result);
} catch (error) {
  logger.error('API call failed:', error);
  throw formatError('Operation failed', 'API_ERROR');
}

// ✅ Good: Add JSDoc comments
/**
 * Creates a new SOS alert
 * @param {Object} alertData - Emergency alert information
 * @param {number} alertData.latitude - GPS latitude
 * @param {number} alertData.longitude - GPS longitude
 * @returns {Promise<Object>} Created SOS alert
 */
🎯 Contribution Areas
Area	Description	Difficulty
🔐 Authentication	Email OTP, JWT, Session management	Beginner
🚨 Emergency System	SOS alerts, Real-time notifications	Intermediate
📍 Location Services	GPS tracking, Geofencing	Intermediate
⛓️ Blockchain	Smart contracts, Web3 integration	Advanced
📧 Notifications	Email/SMS services, Push notifications	Beginner
🧪 Testing	Unit tests, Integration tests, E2E tests	All levels
📚 Documentation	API docs, Guides, Examples	Beginner
🎨 UI/UX	Admin dashboard, Monitoring tools	Intermediate
🚀 Feature Requests
Have an idea? Open an issue with the enhancement label and include:

Problem Description - What problem does this solve?

Proposed Solution - How would you implement it?

Alternatives - Any alternative approaches considered?

Impact - Who would benefit from this feature?

📡 API Endpoints
Authentication
bash
POST   /api/auth/register      # Register user & send OTP
POST   /api/auth/verify-otp    # Verify OTP & get Tourist ID
POST   /api/auth/resend-otp    # Resend OTP email
POST   /api/auth/login         # Login with Tourist ID
GET    /api/auth/profile       # Get user profile
PUT    /api/auth/profile       # Update profile
POST   /api/auth/refresh       # Refresh JWT token
POST   /api/auth/logout        # Logout user
Emergency SOS
bash
POST   /api/sos/alert          # Create emergency alert
GET    /api/sos/:id            # Get SOS alert details
DELETE /api/sos/:id/cancel     # Cancel SOS alert
GET    /api/sos                # Get SOS history
Location Services
bash
POST   /api/location/track     # Update GPS location
GET    /api/location/current   # Get current location
Real-time Events (Socket.IO)
javascript
// Client events
socket.emit('join', touristId);
socket.emit('locationUpdate', locationData);
socket.emit('sosAlert', emergencyData);

// Server events
socket.on('emergencyAlert', alertData);
socket.on('locationUpdate', locationData);
socket.on('sosStatusUpdate', statusData);
🧪 Testing Your Changes
Test Registration Flow
bash
# 1. Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "mobileNumber": "+919999999999",
    "nationality": "Indian",
    "age": "25",
    "gender": "Male",
    "emergencyContactName": "Emergency Contact",
    "emergencyContactPhone": "+919999999998",
    "emergencyContactRelation": "Family",
    "aadharNumber": "1234-5678-9012"
  }'

# 2. Check email for OTP and verify
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'

# 3. Login with received Tourist ID
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "touristId": "ST25123456"
  }'
Test SOS System
bash
# Create emergency alert (use token from login)
curl -X POST http://localhost:5000/api/sos/alert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "latitude": 12.9716,
    "longitude": 77.5946,
    "alertType": "PANIC",
    "severity": "HIGH",
    "description": "Test emergency"
  }'
🚀 Deployment
Docker Setup
text
# Create Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
Production Deployment
bash
# Build and deploy
docker build -t smart-tourist-api .
docker run -d -p 5000:5000 --env-file .env smart-tourist-api

# Or use docker-compose
docker-compose up -d
🛡️ Security
Authentication: JWT tokens with expiration

Input Validation: All inputs validated and sanitized

Rate Limiting: API rate limiting implemented

CORS: Cross-origin request protection

Environment Variables: Sensitive data in environment variables

Error Handling: No sensitive information in error responses

📊 Monitoring & Logging
The application includes comprehensive logging:

bash
# View logs in development
npm run dev

# Production logging with PM2
pm2 start server.js --name smart-tourist-api
pm2 logs smart-tourist-api
🤝 Community
Issues: Report bugs or request features

Discussions: Join community discussions

Pull Requests: Submit your contributions

📜 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Contributors
Thanks to all contributors who help make this project better!

<!-- Add contributor images here -->
📞 Support
Need help? Here's how to get support:

Documentation: Check this README and inline code comments

Issues: Create an issue for bugs or feature requests

Email: Contact the maintainers at support@smarttourist.com

Community: Join our discussions for general questions

Made with ❤️ for Tourist Safety | Star ⭐ this repo if you find it helpful!
