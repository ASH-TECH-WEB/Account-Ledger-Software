const UserSettings = require('../models/supabase/UserSettings');

// Get user settings
const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    let settings = await UserSettings.findByUserId(userId);
    
    if (!settings) {
      // Create default settings if none exist
      settings = await UserSettings.findOrCreate(userId, { email: req.user.email });
    }

    res.json({
      success: true,
      message: 'User settings retrieved successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user settings'
    });
  }
};

// Create user settings
const createUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settingsData = { ...req.body, user_id: userId };

    // Check if settings already exist
    const existingSettings = await UserSettings.findByUserId(userId);
    if (existingSettings) {
      return res.status(400).json({
        success: false,
        message: 'User settings already exist'
      });
    }

    const settings = await UserSettings.create(settingsData);

    res.status(201).json({
      success: true,
      message: 'User settings created successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error creating user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user settings'
    });
  }
};

// Update user settings
const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    let settings = await UserSettings.findByUserId(userId);
    
    if (!settings) {
      // Create settings if they don't exist
      settings = await UserSettings.create({ user_id: userId, ...updateData });
    } else {
      // Update existing settings
      settings = await UserSettings.update(userId, updateData);
    }

    res.json({
      success: true,
      message: 'User settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user settings'
    });
  }
};

// Delete user settings
const deleteUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await UserSettings.findByUserId(userId);
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'User settings not found'
      });
    }

    await UserSettings.delete(userId);

    res.json({
      success: true,
      message: 'User settings deleted successfully',
      data: { deleted: true }
    });
  } catch (error) {
    console.error('Error deleting user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user settings'
    });
  }
};

module.exports = {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
  deleteUserSettings
}; 