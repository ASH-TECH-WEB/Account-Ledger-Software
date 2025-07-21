// src/middlewares/errorHandler.js

export default function errorHandler(err, req, res, next) {
    console.error('Error Message:', err.message);
    console.error('Stack Trace:', err.stack);
  
    const statusCode = err.statusCode || 500;
  
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
  