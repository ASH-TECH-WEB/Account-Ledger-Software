// Vercel Serverless Function Entry Point
// This file handles all API routes for Vercel deployment

const app = require('../server.js');

// Export the Express app for Vercel
module.exports = app;
