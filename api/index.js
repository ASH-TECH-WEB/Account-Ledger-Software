// Vercel Serverless Function Entry Point
// This file handles all API routes for Vercel deployment

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Database and route imports
const { testConnection: testSupabaseConnection } = require('../src/config/supabase');
const authRoutes = require('../src/routes/auth.routes');
const newPartyRoutes = require('../src/routes/newParty.routes');
const partyLedgerRoutes = require('../src/routes/partyLedger.routes');
const finalTrialBalanceRoutes = require('../src/routes/FinalTrialBalance.routes');
const userSettingsRoutes = require('../src/routes/userSettings.routes');
const dashboardRoutes = require('../src/routes/dashboard.routes');
const commissionTransactionRoutes = require('../src/routes/commissionTransaction.routes');

// Initialize Express application
const app = express();

// Trust proxy configuration
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: [
    'https://escrow-account-ledger.web.app',
    'https://account-ledger-software.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Account Ledger Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Account Ledger Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parties', newPartyRoutes);
app.use('/api/ledger', partyLedgerRoutes);
app.use('/api/final-trial-balance', finalTrialBalanceRoutes);
app.use('/api/user-settings', userSettingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/commission', commissionTransactionRoutes);

// Catch-all route for any unmatched requests
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Export for Vercel
module.exports = app;
