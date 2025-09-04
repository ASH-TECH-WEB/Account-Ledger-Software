/**
 * Upload Routes
 * 
 * Defines API endpoints for file upload operations
 * in the Account Ledger Software.
 * 
 * Endpoints:
 * - POST /upload/profile-image - Upload profile image
 * - DELETE /upload/profile-image - Delete profile image
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  uploadProfileImage,
  deleteProfileImage
} = require('../controllers/upload.controller');

// Protected routes
router.post('/profile-image', authenticateToken, uploadProfileImage);
router.delete('/profile-image', authenticateToken, deleteProfileImage);

// Health check
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Upload service is running',
    endpoints: {
      uploadProfileImage: 'POST /upload/profile-image (protected)',
      deleteProfileImage: 'DELETE /upload/profile-image (protected)'
    }
  });
});

module.exports = router;
