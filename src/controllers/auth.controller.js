/**
 * Authentication Controller - Enhanced Version
 * 
 * Handles user authentication, registration, and profile management
 * with enhanced security, validation, and error handling.
 * 
 * @author Account Ledger Team
 * @version 3.0.0
 * @since 2024-01-01
 */

const jwt = require('jsonwebtoken');
const User = require('../models/supabase/User');
const bcrypt = require('bcryptjs');

// Security constants
const SECURITY_CONFIG = {
  SALT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS_PER_WINDOW: 10
};

// Input validation utilities
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new Error('Invalid email format');
  }
  
  return email.toLowerCase().trim();
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required and must be a string');
  }
  
  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (password.length > SECURITY_CONFIG.PASSWORD_MAX_LENGTH) {
    throw new Error(`Password cannot exceed ${SECURITY_CONFIG.PASSWORD_MAX_LENGTH} characters`);
  }
  
  // Basic password strength validation
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }
  
  return password;
};

const validateFullName = (fullname) => {
  if (!fullname || typeof fullname !== 'string') {
    throw new Error('Full name is required and must be a string');
  }
  
  const trimmedName = fullname.trim();
  if (trimmedName.length === 0) {
    throw new Error('Full name cannot be empty');
  }
  
  if (trimmedName.length > 100) {
    throw new Error('Full name cannot exceed 100 characters');
  }
  
  return trimmedName;
};

const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Phone number is required and must be a string');
  }
  
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone.trim())) {
    throw new Error('Invalid phone number format');
  }
  
  return phone.trim();
};

const validateGoogleId = (googleId) => {
  if (!googleId || typeof googleId !== 'string') {
    throw new Error('Google ID is required and must be a string');
  }
  
  if (googleId.length > 100) {
    throw new Error('Google ID cannot exceed 100 characters');
  }
  
  return googleId;
};

// Rate limiting utility (simple in-memory implementation)
const loginAttempts = new Map();
const rateLimitMap = new Map();

const checkRateLimit = (identifier, maxRequests = SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW) => {
  const now = Date.now();
  const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }
  
  const requests = rateLimitMap.get(identifier);
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);
  return true; // Within rate limit
};

const checkLoginAttempts = (email) => {
  const now = Date.now();
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  
  // Check if account is locked
  if (attempts.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
    const timeSinceLastAttempt = now - attempts.lastAttempt;
    if (timeSinceLastAttempt < SECURITY_CONFIG.LOCKOUT_DURATION) {
      const remainingTime = Math.ceil((SECURITY_CONFIG.LOCKOUT_DURATION - timeSinceLastAttempt) / 1000 / 60);
      throw new Error(`Account temporarily locked due to too many failed attempts. Try again in ${remainingTime} minutes.`);
    }
    // Reset attempts after lockout period
    attempts.count = 0;
  }
  
  return attempts;
};

const recordLoginAttempt = (email, success) => {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  
  if (success) {
    attempts.count = 0; // Reset on successful login
  } else {
    attempts.count++;
  }
  
  attempts.lastAttempt = Date.now();
  loginAttempts.set(email, attempts);
};

// Response utilities
const sendSuccessResponse = (res, data, message = 'Operation completed successfully', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const sendErrorResponse = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: res.req?.originalUrl || 'unknown'
  };
  
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message;
    response.stack = error.stack;
  }
  
  res.status(statusCode).json(response);
};

// Generate JWT token with enhanced security
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  
  return jwt.sign(
    { 
      userId,
      iat: Math.floor(Date.now() / 1000),
      type: 'access'
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: SECURITY_CONFIG.JWT_EXPIRES_IN,
      issuer: 'account-ledger-api',
      audience: 'account-ledger-users'
    }
  );
};

// Register user with enhanced validation and security
const register = async (req, res) => {
  try {
    const { fullname, email, phone, password, googleId, profilePicture } = req.body;

    // Check rate limiting
    if (!checkRateLimit(req.ip, 3)) { // 3 registration attempts per window
      return sendErrorResponse(res, 429, 'Too many registration attempts. Please try again later.');
    }

    // Validate inputs based on auth type
    if (googleId) {
      // Google user validation
      const validatedFullName = validateFullName(fullname);
      const validatedEmail = validateEmail(email);
      const validatedGoogleId = validateGoogleId(googleId);
      
      // Validate profile picture URL if provided
      if (profilePicture && typeof profilePicture === 'string') {
        try {
          new URL(profilePicture);
        } catch {
          return sendErrorResponse(res, 400, 'Invalid profile picture URL');
        }
      }
    } else {
      // Regular user validation
      const validatedFullName = validateFullName(fullname);
      const validatedEmail = validateEmail(email);
      const validatedPhone = validatePhone(phone);
      const validatedPassword = validatePassword(password);
      
      // Additional password strength check
      if (validatedPassword.includes('password') || validatedPassword.includes('123')) {
        return sendErrorResponse(res, 400, 'Password is too weak. Please choose a stronger password.');
      }
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return sendErrorResponse(res, 400, 'User with this email already exists');
    }

    let userData;

    if (googleId) {
      // Google user registration
      userData = {
        name: fullname,
        email: email.toLowerCase(),
        google_id: googleId,
        profile_picture: profilePicture || null,
        auth_provider: 'google',
        email_verified: true,
        phone: '',
        password_hash: '',
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else {
      // Regular user registration with enhanced security
      const salt = await bcrypt.genSalt(SECURITY_CONFIG.SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(password, salt);

      userData = {
        name: fullname,
        email: email.toLowerCase(),
        phone,
        password_hash: hashedPassword,
        auth_provider: 'email',
        email_verified: false,
        google_id: null,
        profile_picture: null,
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // Create user in database
    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user.id);

    // Log successful registration
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ User registered successfully: ${email} at ${new Date().toISOString()}`);
    }

    sendSuccessResponse(res, {
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
    }, 'User registered successfully', 201);

  } catch (error) {
    // Provide specific error messages
    if (error.message.includes('duplicate key')) {
      sendErrorResponse(res, 400, 'User with this email already exists');
    } else if (error.message.includes('violates row-level security')) {
      sendErrorResponse(res, 500, 'Database security policy error. Please contact support.');
    } else if (error.message.includes('rate limit')) {
      sendErrorResponse(res, 429, 'Too many requests. Please try again later.');
    } else {
      sendErrorResponse(res, 500, 'Registration failed. Please try again.', error);
    }
  }
};

// Google Login/Registration with enhanced security
const googleLogin = async (req, res) => {
  try {
    const { email, googleId, fullname, profilePicture } = req.body;

    // Check rate limiting
    if (!checkRateLimit(req.ip, 5)) { // 5 Google auth attempts per window
      return sendErrorResponse(res, 429, 'Too many authentication attempts. Please try again later.');
    }

    // Validate required fields
    const validatedEmail = validateEmail(email);
    const validatedGoogleId = validateGoogleId(googleId);
    const validatedFullName = validateFullName(fullname);

    // Validate profile picture URL if provided
    if (profilePicture && typeof profilePicture === 'string') {
      try {
        new URL(profilePicture);
      } catch {
        return sendErrorResponse(res, 400, 'Invalid profile picture URL');
      }
    }

    // Use the method to find or create Google user
    const user = await User.findOrCreateGoogleUser({
      email: validatedEmail,
      googleId: validatedGoogleId,
      fullname: validatedFullName,
      profilePicture: profilePicture || null
    });

    // Generate token
    const token = generateToken(user.id);

    // Log successful Google authentication
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Google authentication successful: ${email} at ${new Date().toISOString()}`);
    }

    sendSuccessResponse(res, {
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
    }, 'Google authentication successful');

  } catch (error) {
    sendErrorResponse(res, 500, 'Google authentication failed', error);
  }
};

// Login with enhanced security and rate limiting
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check rate limiting
    if (!checkRateLimit(req.ip, 10)) { // 10 login attempts per window
      return sendErrorResponse(res, 429, 'Too many login attempts. Please try again later.');
    }

    // Validate inputs
    const validatedEmail = validateEmail(email);
    const validatedPassword = validatePassword(password);

    // Check login attempts
    const attempts = checkLoginAttempts(validatedEmail);

    // Find user
    const user = await User.findByEmail(validatedEmail);
    if (!user) {
      recordLoginAttempt(validatedEmail, false);
      return sendErrorResponse(res, 401, 'Invalid email or password');
    }

    // Check if user is Google-only
    if (user.auth_provider === 'google' && !user.password_hash) {
      recordLoginAttempt(validatedEmail, false);
      return sendErrorResponse(res, 401, 'This account was created with Google. Please use Google login.');
    }

    // Verify password with timing attack protection
    const startTime = Date.now();
    const isPasswordValid = await bcrypt.compare(validatedPassword, user.password_hash);
    const verificationTime = Date.now() - startTime;
    
    // Add minimum delay to prevent timing attacks
    if (verificationTime < 100) {
      await new Promise(resolve => setTimeout(resolve, 100 - verificationTime));
    }

    if (!isPasswordValid) {
      recordLoginAttempt(validatedEmail, false);
      return sendErrorResponse(res, 401, 'Invalid email or password');
    }

    // Successful login - reset attempts
    recordLoginAttempt(validatedEmail, true);

    // Update last login
    await User.update(user.id, { 
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Generate token
    const token = generateToken(user.id);

    // Log successful login
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ User login successful: ${email} at ${new Date().toISOString()}, IP: ${req.ip}`);
    }

    sendSuccessResponse(res, {
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
    }, 'Login successful');

  } catch (error) {
    if (error.message.includes('rate limit')) {
      sendErrorResponse(res, 429, 'Too many requests. Please try again later.');
    } else if (error.message.includes('locked')) {
      sendErrorResponse(res, 423, error.message);
    } else {
      sendErrorResponse(res, 500, 'Login failed', error);
    }
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
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Forgot password - initiate password reset
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return sendErrorResponse(res, 400, 'Email is required');
    }

    const validatedEmail = validateEmail(email);

    // Check if user exists
    const user = await User.findByEmail(validatedEmail);
    if (!user) {
      // For security, don't reveal if email exists or not
      return sendSuccessResponse(res, null, 'If an account with that email exists, a password reset link has been sent');
    }

    // Check if user can use password authentication (not Google-only)
    if (user.auth_provider === 'google' && !user.password_hash) {
      return sendErrorResponse(res, 400, 'This account was created with Google. Please use Google login or contact support.');
    }

    // In a real implementation, you would:
    // 1. Generate a secure reset token
    // 2. Store it in database with expiration
    // 3. Send email with reset link
    // 4. For now, we'll just return success since Firebase handles the email sending

    // Log password reset request
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Password reset requested for: ${validatedEmail} at ${new Date().toISOString()}`);
    }

    sendSuccessResponse(res, null, 'If an account with that email exists, a password reset link has been sent');

  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to process password reset request', error);
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return sendErrorResponse(res, 400, 'Reset token and new password are required');
    }

    // Validate new password
    const validatedPassword = validatePassword(newPassword);

    // In a real implementation, you would:
    // 1. Verify the reset token
    // 2. Check if token is not expired
    // 3. Get user from token
    // 4. Hash new password
    // 5. Update user password
    // 6. Invalidate the token

    // For now, we'll return an error since this should be handled by Firebase
    return sendErrorResponse(res, 400, 'Password reset should be completed through the email link sent to you');

  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to reset password', error);
  }
};

// Delete account permanently
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user details before deletion for logging
    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }

    // Delete user from database (this will cascade delete related data)
    const deleted = await User.delete(userId);
    
    if (!deleted) {
      return sendErrorResponse(res, 500, 'Failed to delete account');
    }

    // Log account deletion
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗑️ Account deleted permanently: ${user.email} at ${new Date().toISOString()}`);
    }

    sendSuccessResponse(res, null, 'Account deleted successfully');

  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete account', error);
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
  forgotPassword,
  resetPassword,
  deleteAccount,
  logout
}; 