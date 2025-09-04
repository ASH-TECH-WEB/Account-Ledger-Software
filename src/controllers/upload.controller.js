/**
 * Upload Controller
 * 
 * Handles file upload operations for the Account Ledger Software.
 * 
 * Features:
 * - Profile image upload to Supabase Storage
 * - File validation and processing
 * - Error handling and logging
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - using service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL || 'https://fwbizsvzkwzfahvgnegr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Supabase Config Check:', {
  hasUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  console.error('Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Upload profile image
 * 
 * @route POST /api/upload/profile-image
 * @access Private
 */
const uploadProfileImage = async (req, res) => {
  try {
    const { fileName, base64Data, userId } = req.body;

    // Validate required fields
    if (!fileName || !base64Data || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fileName, base64Data, userId'
      });
    }

    // Validate base64 data
    if (!base64Data.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image data format'
      });
    }

    // Convert base64 to buffer
    const base64String = base64Data.split(',')[1];
    const buffer = Buffer.from(base64String, 'base64');

    // Validate file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }

    // Create file path
    const filePath = `profile-images/${fileName}`;

    console.log('🔄 Uploading profile image:', {
      fileName,
      userId,
      fileSize: buffer.length,
      filePath
    });

    // Upload to Supabase Storage using service role key
    console.log('🔄 Uploading to Supabase Storage:', {
      bucket: 'profile-images',
      filePath,
      bufferSize: buffer.length,
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'
    });

    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase upload error:', {
        error: error.message,
        statusCode: error.statusCode,
        errorCode: error.error,
        details: error
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to storage',
        error: error.message,
        details: error.error || error.statusCode
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    console.log('✅ Profile image uploaded successfully:', urlData.publicUrl);

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      url: urlData.publicUrl,
      fileName: data.path
    });

  } catch (error) {
    console.error('❌ Upload controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Delete profile image
 * 
 * @route DELETE /api/upload/profile-image
 * @access Private
 */
const deleteProfileImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(-2).join('/'); // Get 'profile-images/filename'

    console.log('🔄 Deleting profile image:', filePath);

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath]);

    if (error) {
      console.error('❌ Supabase delete error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete image from storage',
        error: error.message
      });
    }

    console.log('✅ Profile image deleted successfully');

    res.json({
      success: true,
      message: 'Profile image deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  uploadProfileImage,
  deleteProfileImage
};
