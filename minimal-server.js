const express = require('express');
const app = express();

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.json({
    status: 'OK',
    message: 'Minimal server is working',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Minimal health check',
    timestamp: new Date().toISOString()
  });
});

// Handle all other routes
app.get('*', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Minimal server catchall',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});

module.exports = app;
