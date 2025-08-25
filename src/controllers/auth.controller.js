const jwt = require('jsonwebtoken');
const User = require('../models/supabase/User');
const bcrypt = require('bcryptjs'); // Added bcrypt for password comparison

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Register user (supports both email and Google)
const register = async (req, res) => {
  try {
    const { fullname, email, phone, password, googleId, profilePicture } = req.body;

    console.log('📝 Registration attempt for:', email, 'Google ID:', googleId);

    // Validation based on auth type
    if (googleId) {
      // Google user validation
      if (!fullname || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required for Google users'
        });
      }
    } else {
      // Regular user validation
      if (!fullname || !email || !phone || !password) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required for regular registration'
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    let userData;

    if (googleId) {
      // Google user registration
      userData = {
        name: fullname,
        email: email.toLowerCase(),
        google_id: googleId,
        profile_picture: profilePicture,
        auth_provider: 'google',
        email_verified: true,
        phone: '', // Empty for Google users
        password_hash: '', // Empty for Google users
        last_login: new Date().toISOString()
      };
    } else {
      // Regular user registration
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      userData = {
        name: fullname,
        email: email.toLowerCase(),
        phone,
        password_hash: hashedPassword,
        auth_provider: 'email',
        email_verified: false
      };
    }

    console.log('🗄️ Creating user in database...');
    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user.id);

    console.log('✅ User registered successfully:', user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          fullname: user.name,
          email: user.email,
          phone: user.phone || '',
          role: 'user',
          googleId: user.google_id,
          profilePicture: user.profile_picture,
          authProvider: user.auth_provider
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    
    // Provide specific error messages
    if (error.message.includes('duplicate key')) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    } else if (error.message.includes('violates row-level security')) {
      res.status(500).json({
        success: false,
        message: 'Database security policy error. Please contact support.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.',
        error: error.message
      });
    }
  }
};

// Google Login/Registration
const googleLogin = async (req, res) => {
  try {
    const { email, googleId, fullname, profilePicture } = req.body;

    console.log('🔐 Google authentication attempt for:', email, 'Google ID:', googleId);

    if (!email || !googleId || !fullname) {
      return res.status(400).json({
        success: false,
        message: 'Email, Google ID, and fullname are required'
      });
    }

    // Use the new method to find or create Google user
    const user = await User.findOrCreateGoogleUser({
      email,
      googleId,
      fullname,
      profilePicture
    });

    // Generate token
    const token = generateToken(user.id);

    console.log('✅ Google authentication successful:', user.id);

    res.json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: {
          id: user.id,
          fullname: user.name,
          email: user.email,
          phone: user.phone || '',
          role: 'user',
          googleId: user.google_id,
          profilePicture: user.profile_picture,
          authProvider: user.auth_provider
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      error: error.message
    });
  }
};

// Login (updated to handle Google users)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log('🔐 Login attempt for:', email);

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'User is not registered'
      });
    }

    // Check if user is Google-only
    if (user.auth_provider === 'google' && !user.password_hash) {
      console.log('❌ Google user trying to login with password:', email);
      return res.status(401).json({
        success: false,
        message: 'This account was created with Google. Please use Google login.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Update last login
    await User.update(user.id, { last_login: new Date().toISOString() });

    // Generate token
    const token = generateToken(user.id);

    console.log('✅ Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          fullname: user.name,
          email: user.email,
          phone: user.phone,
          role: 'user',
          googleId: user.google_id,
          profilePicture: user.profile_picture,
          authProvider: user.auth_provider
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Get user profile (updated to include Google fields)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove sensitive information
    const userProfile = {
      id: user.id,
      fullname: user.name,
      email: user.email,
      phone: user.phone,
      role: 'user',
      googleId: user.google_id,
      profilePicture: user.profile_picture,
      authProvider: user.auth_provider,
      emailVerified: user.email_verified,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    res.json({
      success: true,
      data: userProfile
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Update user profile (updated to handle Google users)
const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phone } = req.body;
    const updates = {};

    if (fullname) updates.name = fullname;
    if (email) updates.email = email.toLowerCase();
    
    // Only allow phone update for email users
    if (phone && req.user.authProvider === 'email') {
      updates.phone = phone;
    }

    const user = await User.update(req.user.userId, updates);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        fullname: user.name,
        email: user.email,
        phone: user.phone,
        role: 'user',
        googleId: user.google_id,
        profilePicture: user.profile_picture,
        authProvider: user.auth_provider
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Change password (only for email users)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Check if user can use password authentication
    const canUsePassword = await User.canUsePassword(req.user.userId);
    if (!canUsePassword) {
      return res.status(400).json({
        success: false,
        message: 'Password change not available for Google users'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await User.update(req.user.userId, { password_hash: hashedNewPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // You could implement a blacklist here if needed
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

module.exports = {
  register,
  googleLogin,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
}; 