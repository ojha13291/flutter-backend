const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users'); // ✅ FIXED: Changed from 'users' to 'user'
const locationRoutes = require('./routes/location');
const sosRoutes = require('./routes/sos');
const blockchainRoutes = require('./routes/blockchain');
const anomalyRoutes = require('./routes/anomaly'); // ✅ MOVED: Better organization

// Import middleware
const { globalErrorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL
            : "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Database connection
const connectDB = require('./config/database');
connectDB();

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security and middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('combined', { stream: logger.stream }));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for deployment behind reverse proxy
app.set('trust proxy', 1);

// Make Socket.IO available to routes (MOVED UP)
app.set('io', io);

// ✅ FIXED: Complete Socket.IO Implementation
io.on('connection', (socket) => {
    logger.info('Client connected:', { socketId: socket.id });

    // Join room based on tourist ID for targeted notifications
    socket.on('join', (touristId) => {
        if (touristId) {
            socket.join(touristId);
            socket.touristId = touristId;
            logger.info('Tourist joined room:', { touristId, socketId: socket.id });
        }
    });

    // Handle location updates
    socket.on('locationUpdate', (data) => {
        if (data && data.touristId && data.latitude && data.longitude) {
            logger.info('Location update received:', {
                touristId: data.touristId,
                location: { lat: data.latitude, lng: data.longitude }
            });

            // Broadcast to emergency contacts or monitoring systems
            socket.to(data.touristId).emit('locationUpdate', {
                ...data,
                timestamp: new Date()
            });

            // Broadcast to admin/emergency responders
            socket.broadcast.emit('touristLocationUpdate', data);
        }
    });

    // Handle SOS alerts
    socket.on('sosAlert', (data) => {
        if (data && data.touristId) {
            logger.error('SOS Alert received via socket:', {
                touristId: data.touristId,
                alertType: data.alertType,
                severity: data.severity
            });

            // Broadcast SOS alert to all emergency services and connected clients
            io.emit('emergencyAlert', {
                ...data,
                timestamp: new Date(),
                severity: data.severity || 'CRITICAL',
                source: 'socket'
            });
        }
    });

    // Handle emergency response
    socket.on('emergencyResponse', (data) => {
        if (data && data.sosId) {
            logger.info('Emergency response received:', data);

            // Notify the specific tourist
            if (data.touristId) {
                socket.to(data.touristId).emit('emergencyResponse', {
                    ...data,
                    timestamp: new Date()
                });
            }
        }
    });

    // ✅ FIXED: Anomaly acknowledgment handler (MOVED INSIDE CONNECTION)
    socket.on('acknowledgeAnomaly', (data) => {
        if (data && data.touristId && data.anomalyId) {
            logger.info('Anomaly acknowledged by user:', data);

            // Broadcast acknowledgment to monitoring systems
            socket.broadcast.emit('anomalyAcknowledged', {
                touristId: data.touristId,
                anomalyId: data.anomalyId,
                userResponse: data.response,
                timestamp: new Date()
            });
        }
    });

    // ✅ FIXED: Safety confirmation handler (MOVED INSIDE CONNECTION)
    socket.on('confirmSafety', (data) => {
        if (data && data.touristId) {
            logger.info('Safety confirmed by user:', data);

            // Broadcast safety confirmation
            io.emit('safetyConfirmed', {
                touristId: data.touristId,
                message: data.message || 'User confirmed they are safe',
                timestamp: new Date()
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        logger.info('Client disconnected:', {
            socketId: socket.id,
            touristId: socket.touristId
        });
    });

    // Handle connection errors
    socket.on('error', (error) => {
        logger.error('Socket error:', {
            socketId: socket.id,
            error: error.message
        });
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        services: {
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            socketIO: 'active'
        }
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Smart Tourist Safety Monitor API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            users: '/api/users',
            sos: '/api/sos',
            location: '/api/location',
            blockchain: '/api/blockchain',
            anomaly: '/api/anomaly' // ✅ ADDED: Anomaly endpoint documentation
        },
        documentation: '/api/docs'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // This will now work with user.js
app.use('/api/location', locationRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/anomaly', anomalyRoutes); // ✅ MOVED: Better organization

// Welcome endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Smart Tourist Safety Monitor API',
        version: '1.0.0',
        status: 'active',
        documentation: '/api',
        health: '/health',
        websocket: 'enabled'
    });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The requested route ${req.method} ${req.originalUrl} does not exist.`,
        code: 'ROUTE_NOT_FOUND'
    });
});

// Global error handler
app.use(globalErrorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Smart Tourist API Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📡 Socket.IO enabled for real-time communication`);
    console.log(`🛡️  Security features: Rate limiting, CORS, Helmet`);
});

// ✅ IMPROVED: Enhanced graceful shutdown
const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
        logger.info('HTTP server closed.');

        try {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed.');
            process.exit(0);
        } catch (error) {
            logger.error('Error closing MongoDB connection:', error);
            process.exit(1);
        }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandled**Rejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;
