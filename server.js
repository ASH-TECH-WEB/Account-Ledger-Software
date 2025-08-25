/**
 * Account Ledger Software - Backend Server
 * 
 * 🔧 TROUBLESHOOTING GUIDE:
 * =========================
 * 
 * 1. SERVER STARTUP ISSUES:
 *    - Check if port 5000 is available
 *    - Verify Supabase connection string
 *    - Check environment variables
 * 
 * 2. CORS ISSUES:
 *    - Check allowed origins in CORS configuration
 *    - Verify frontend URL is in allowed list
 *    - Check browser console for CORS errors
 * 
 * 3. DATABASE ISSUES:
 *    - Check Supabase connection string
 *    - Verify database credentials
 *    - Check network connectivity to Supabase
 * 
 * 4. AUTHENTICATION ISSUES:
 *    - Check JWT_SECRET environment variable
 *    - Verify token expiration settings
 *    - Check user exists in database
 * 
 * 5. PERFORMANCE ISSUES:
 *    - Monitor request processing time
 *    - Check database query performance
 *    - Verify rate limiting settings
 * 
 * 6. COMMON ERROR CODES:
 *    - 500: Internal Server Error (check server logs)
 *    - 404: Route not found (check endpoint URL)
 *    - 401: Unauthorized (check authentication)
 *    - 400: Bad Request (check request data)
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

// Core dependencies
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Database and route imports
const { testConnection: testSupabaseConnection } = require('./src/config/supabase');
const { testConnection: testPostgresConnection } = require('./src/config/postgres');
const authRoutes = require('./src/routes/auth.routes');
const newPartyRoutes = require('./src/routes/newParty.routes');
const partyLedgerRoutes = require('./src/routes/partyLedger.routes');
const finalTrialBalanceRoutes = require('./src/routes/FinalTrialBalance.routes');
const userSettingsRoutes = require('./src/routes/userSettings.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const commissionTransactionRoutes = require('./src/routes/commissionTransaction.routes');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

/**
 * 🔧 Trust Proxy Configuration
 * 
 * Configure Express to trust the proxy headers from Render.
 * This is required for proper rate limiting behind a proxy.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If rate limiting not working: Check proxy configuration
 * - If IP detection wrong: Verify trust proxy settings
 */
app.set('trust proxy', 1);

/**
 * 🗄️ Database Configuration
 * 
 * Database is configured using Supabase and PostgreSQL.
 * Connection testing is done during server startup.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If connection fails: Check Supabase credentials
 * - If queries slow: Check database indexes
 */

/**
 * 📊 Performance Monitoring Middleware
 * 
 * Logs request processing time for performance analysis.
 * Only logs in development or for specific endpoints.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If requests are slow: Check database queries
 * - If server unresponsive: Check server resources
 * - Monitor login and health endpoint performance
 */
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isLoginEndpoint = req.path.includes('/login');
    const isHealthEndpoint = req.path === '/health';
    
    // Log performance for login and health endpoints
    if (isLoginEndpoint || isHealthEndpoint) {
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      
      // Warn for slow requests
      if (duration > 5000) {
        console.warn(`🐌 Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }
    }
  });
  
  next();
};

/**
 * 🗄️ Database Connection
 * 
 * Database connections are handled by Supabase and PostgreSQL clients.
 * Connection testing is done during server startup.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If connection fails: Check Supabase credentials
 * - If connection slow: Check network latency
 * - If connection drops: Check Supabase project status
 */

/**
 * 🌐 CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * Enables cross-origin requests from the frontend application.
 * Configures allowed origins, methods, and headers for security.
 * Must be applied before Helmet to ensure proper header handling.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If CORS errors: Check allowed origins list
 * - If requests blocked: Verify frontend URL
 * - If preflight fails: Check CORS configuration
 */
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://property-flow-design.vercel.app',
      'https://escrow-account-ledger.web.app', // Firebase hosting
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5000',
      'http://localhost:4173', // Vite preview port
      'http://127.0.0.1:4173',
      'http://localhost:5004'  // Vite preview port
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      console.log('💡 Add this origin to allowedOrigins array if needed');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

/**
 * 🛡️ Security Middleware Configuration
 * 
 * Helmet provides various HTTP headers to help protect the app
 * from well-known web vulnerabilities.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If security headers missing: Check Helmet configuration
 * - If CSP errors: Adjust content security policy
 * - If HSTS issues: Configure HSTS settings
 */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  // Reduced security headers for faster processing
  contentSecurityPolicy: false,
  hsts: false
}));

/**
 * 🔄 Preflight Request Handler
 * 
 * Handles OPTIONS requests for CORS preflight checks.
 * Ensures proper CORS headers are sent for all preflight requests.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If preflight fails: Check CORS configuration
 * - If OPTIONS requests blocked: Verify preflight handler
 */
app.options('*', cors());

/**
 * 🌐 Additional CORS Headers Middleware
 * 
 * Ensures CORS headers are properly set for all responses.
 * This is a backup to the main CORS middleware.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If CORS still failing: Check this middleware
 * - If headers missing: Verify header configuration
 */
app.use((req, res, next) => {
  // Allow multiple origins including localhost
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://property-flow-design.vercel.app',
    'https://escrow-account-ledger.web.app', // Firebase hosting
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://localhost:5000'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

/**
 * ⏰ Request Timeout Middleware
 * 
 * Implements request timeout to prevent hanging requests.
 * Automatically cancels requests that take too long to process.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If requests timeout: Check database performance
 * - If timeout too short: Increase timeout duration
 * - If server unresponsive: Check for hanging connections
 */
const timeout = require('connect-timeout');

// Set timeout for all requests
app.use(timeout('30s')); // 30 second timeout

// Handle timeout errors
app.use((req, res, next) => {
  if (!req.timedout) {
    next();
  } else {
    console.error('⏰ Request timeout:', req.method, req.path);
    res.status(408).json({
      success: false,
      message: 'Request timeout. Please try again.'
    });
  }
});

/**
 * 📊 Performance Monitoring
 * 
 * Add performance monitoring before other middleware
 */
app.use(performanceMonitor);

/**
 * 📦 Compression Middleware Configuration
 * 
 * Compresses response bodies for all requests that pass through the middleware.
 * Uses aggressive compression settings for optimal performance:
 * - Level 2: Reduced compression for faster processing
 * - Threshold: Only compress responses larger than 4KB
 * - Filter: Skip compression for specific headers
 * 
 * 🔧 TROUBLESHOOTING:
 * - If compression not working: Check compression settings
 * - If responses slow: Adjust compression level
 * - If memory issues: Increase compression threshold
 */
app.use(compression({
  level: 2, // Reduced compression level for faster processing
  threshold: 4096, // Increased threshold
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

/**
 * 🚦 Advanced Rate Limiting Configuration
 * 
 * Implements multiple rate limiting strategies:
 * 1. General API rate limiting
 * 2. Authentication-specific rate limiting (stricter)
 * 3. Database operation rate limiting
 * 4. Throttling for heavy operations
 * 
 * 🔧 TROUBLESHOOTING:
 * - If requests blocked: Check rate limit settings
 * - If too many requests: Increase limit or window
 * - If rate limiting not working: Check proxy configuration
 */

// General API rate limiting (more lenient)
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300, // Increased for better UX
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health'
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health'
});

// Rate limiting for database-heavy operations
const dbOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 database operations per minute
  message: {
    success: false,
    message: 'Too many database operations. Please slow down your requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health'
});

/**
 * 🚦 Throttling Middleware
 * 
 * Implements request throttling to prevent server overload.
 * Limits concurrent requests and implements backoff strategy.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If requests throttled: Check server load
 * - If throttling too aggressive: Adjust limits
 * - If performance issues: Monitor server resources
 */
const throttlingMiddleware = (req, res, next) => {
  // Simple in-memory throttling (for production, use Redis)
  const clientIP = req.ip;
  const now = Date.now();
  
  // Initialize request tracking for this IP
  if (!req.app.locals.requestTracking) {
    req.app.locals.requestTracking = new Map();
  }
  
  const tracking = req.app.locals.requestTracking;
  const clientData = tracking.get(clientIP) || { count: 0, resetTime: now + 60000 };
  
  // Reset counter if window has passed
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + 60000; // 1 minute window
  }
  
  // Check if client has exceeded limit
  const maxRequestsPerMinute = 60;
  if (clientData.count >= maxRequestsPerMinute) {
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
    res.set('Retry-After', retryAfter);
    return res.status(429).json({
      success: false,
      message: `Too many requests. Please try again in ${retryAfter} seconds.`
    });
  }
  
  // Increment counter
  clientData.count++;
  tracking.set(clientIP, clientData);
  
  next();
};

// Apply rate limiting based on endpoint type
app.use('/api/authentication', authLimiter);
app.use('/api/party-ledger', dbOperationLimiter);
app.use('/api/new-party', dbOperationLimiter);
app.use('/api/', generalLimiter);

// Apply throttling to all API routes
app.use('/api/', throttlingMiddleware);

/**
 * 📝 Body Parsing Middleware Configuration
 * 
 * Parses incoming request bodies and makes them available in req.body.
 * Optimized settings for performance and security:
 * - JSON parsing with 2MB limit and strict mode
 * - URL-encoded parsing with extended mode
 * - Parameter limit to prevent abuse
 * 
 * 🔧 TROUBLESHOOTING:
 * - If request body empty: Check content-type header
 * - If payload too large: Increase limit
 * - If parsing fails: Check request format
 */
app.use(express.json({ 
  limit: '2mb', // Reduced limit for faster processing
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '2mb', // Reduced limit
  parameterLimit: 500 // Reduced parameter limit
}));

/**
 * 📋 Logging Middleware Configuration
 * 
 * Logs HTTP requests in development environment only.
 * Uses 'combined' format for detailed request logging.
 * Disabled in production for performance optimization.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If no logs: Check NODE_ENV setting
 * - If logs too verbose: Adjust log format
 * - If performance issues: Disable in production
 */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
}

/**
 * 🏥 Health Check Endpoint
 * 
 * Provides server status information for monitoring and deployment checks.
 * Returns server uptime, environment, and timestamp.
 * Used by deployment platforms to verify server health.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If health check fails: Server is down
 * - If uptime wrong: Check server restart
 * - If environment wrong: Check NODE_ENV
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

/**
 * 🛣️ API Route Configuration
 * 
 * Mounts all API routes with their respective prefixes.
 * Each route module handles specific functionality:
 * - /api/authentication: User login, registration, profile management
 * - /api/new-party: Party creation and management
 * - /api/party-ledger: Ledger entries and transactions
 * - /api/final-trial-balance: Trial balance reports
 * - /api/settings: User settings and preferences
 * - /api/dashboard: Dashboard statistics and analytics
 * 
 * 🔧 TROUBLESHOOTING:
 * - If route not found: Check route mounting
 * - If route not working: Check route handler
 * - If authentication fails: Check middleware
 */
app.use('/api/authentication', authRoutes);
app.use('/api/parties', partyLedgerRoutes); // Add direct parties route
app.use('/api/new-party', newPartyRoutes);
app.use('/api/party-ledger', partyLedgerRoutes);
app.use('/api/final-trial-balance', finalTrialBalanceRoutes);
app.use('/api/settings', userSettingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/commission-transactions', commissionTransactionRoutes);

/**
 * ❌ 404 Error Handler
 * 
 * Catches all unmatched routes and returns a 404 error.
 * This middleware should be placed after all other routes.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If 404 errors: Check route URL
 * - If route not found: Verify route exists
 * - If wrong response: Check error handler
 */
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/**
 * 🚨 Global Error Handler
 * 
 * Centralized error handling for all application errors.
 * Handles different types of errors with appropriate HTTP status codes:
 * - ValidationError: Supabase validation errors (400)
 * - CastError: Invalid UUID format (400)
 * - DuplicateKeyError: Supabase duplicate key errors (400)
 * - Generic errors: Internal server error (500)
 * 
 * 🔧 TROUBLESHOOTING:
 * - If 500 errors: Check server logs
 * - If validation errors: Check request data
 * - If database errors: Check Supabase connection
 */
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err);
  console.error('📍 URL:', req.originalUrl);
  console.error('📋 Method:', req.method);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value'
    });
  }
  
  // Supabase specific errors
  if (err.code === 'PGRST116') {
    return res.status(404).json({
      success: false,
      message: 'Record not found'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

/**
 * 🚀 Server Startup
 * 
 * Starts the Express server on the specified port.
 * Logs server startup information and handles startup errors.
 * 
 * 🔧 TROUBLESHOOTING:
 * - If server won't start: Check port availability
 * - If startup fails: Check environment variables
 * - If connection fails: Check database connection
 */
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API base URL: http://localhost:${PORT}/api`);
  
  // Test database connections
  const supabaseConnected = await testSupabaseConnection();
  const postgresConnected = await testPostgresConnection();
  console.log(`🗄️ Supabase: ${supabaseConnected ? 'Connected' : 'Failed'}`);
  console.log(`🗄️ PostgreSQL: ${postgresConnected ? 'Connected' : 'Failed'}`);
  console.log(`🛡️ CORS: Enabled for localhost origins`);
  console.log(`📦 Compression: Enabled (level 2)`);
  
  // Performance & Security Features Status
  console.log(`\n🛡️ PERFORMANCE & SECURITY FEATURES:`);
  console.log(`   🚦 Rate Limiting: Enabled`);
  console.log(`      ├─ General API: ${parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300} requests per ${parseInt(process.env.RATE_LIMIT_WINDOW_MS) / (1000 * 60) || 15} minutes`);
  console.log(`      ├─ Authentication: 10 requests per 15 minutes`);
  console.log(`      └─ Database Operations: 30 requests per minute`);
  console.log(`   ⏱️ Request Timeout: 30 seconds`);
  console.log(`   🔄 Throttling: 60 requests per minute per IP`);
  console.log(`   🛡️ Helmet Security: Enabled`);
  console.log(`   📊 Performance Monitoring: Enabled`);
  console.log(`   🔐 JWT Authentication: Enabled`);
  console.log(`   🗄️ User Data Isolation: Enabled (per userId)`);
});

module.exports = app; 