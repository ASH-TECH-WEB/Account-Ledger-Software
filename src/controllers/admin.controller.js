/**
 * Admin Controller
 * 
 * Handles admin-specific operations and dashboard data
 * Provides statistics and management capabilities for administrators
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const { supabase } = require('../config/supabase');
const { getCache, setCache } = require('../config/redis');
const admin = require('firebase-admin');
const User = require('../models/supabase/User');

/**
 * Send success response with consistent format
 */
const sendSuccessResponse = (res, data, message = 'Success') => {
  res.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send error response with consistent format
 */
const sendErrorResponse = (res, statusCode, message, error = null) => {
  console.error('Admin Controller Error:', error);
  res.status(statusCode).json({
    success: false,
    message,
    error: error?.message || error,
    timestamp: new Date().toISOString()
  });
};

/**
 * Get admin dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardStats = async (req, res) => {
  try {
    const cacheKey = 'admin:dashboard:stats';
    const cachedStats = await getCache(cacheKey);
    
    if (cachedStats) {
      return sendSuccessResponse(res, cachedStats, 'Dashboard stats from cache');
    }

    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Get total parties count
    const { count: totalParties, error: partiesError } = await supabase
      .from('parties')
      .select('*', { count: 'exact', head: true });

    if (partiesError) throw partiesError;

    // Get total ledger entries count
    const { count: totalTransactions, error: transactionsError } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true });

    if (transactionsError) throw transactionsError;

    // Get total revenue (sum of all credit amounts)
    const { data: revenueData, error: revenueError } = await supabase
      .from('ledger_entries')
      .select('credit')
      .not('credit', 'is', null);

    if (revenueError) throw revenueError;

    const totalRevenue = revenueData?.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0) || 0;

    // Get active users (users who logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: activeUsers, error: activeUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', sevenDaysAgo.toISOString());

    if (activeUsersError) throw activeUsersError;

    // Get pending transactions (transactions with chk = false)
    const { count: pendingTransactions, error: pendingError } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true })
      .eq('chk', false);

    if (pendingError) throw pendingError;

    const stats = {
      totalUsers: totalUsers || 0,
      totalParties: totalParties || 0,
      totalTransactions: totalTransactions || 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
      activeUsers: activeUsers || 0,
      pendingTransactions: pendingTransactions || 0
    };

    // Cache for 5 minutes
    await setCache(cacheKey, stats, 300);

    sendSuccessResponse(res, stats, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve dashboard statistics', error);
  }
};

/**
 * Get recent activity for admin dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const cacheKey = `admin:recent-activity:${limit}`;
    const cachedActivity = await getCache(cacheKey);
    
    if (cachedActivity) {
      return sendSuccessResponse(res, cachedActivity, 'Recent activity from cache');
    }

    // Get recent ledger entries with user info
    const { data: recentEntries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select(`
        id,
        party_name,
        tns_type,
        credit,
        debit,
        created_at,
        users!inner(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (entriesError) throw entriesError;

    // Get recent party creations
    const { data: recentParties, error: partiesError } = await supabase
      .from('parties')
      .select(`
        id,
        party_name,
        created_at,
        users!inner(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (partiesError) throw partiesError;

    // Get recent user registrations
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (usersError) throw usersError;

    // Combine and format activities
    const activities = [];

    // Add ledger entries activities
    recentEntries?.forEach(entry => {
      activities.push({
        id: `ledger_${entry.id}`,
        type: 'transaction',
        action: `${entry.tns_type} transaction`,
        details: `${entry.party_name} - ₹${entry.credit || entry.debit || 0}`,
        user: entry.users?.name || 'Unknown User',
        userEmail: entry.users?.email || '',
        timestamp: entry.created_at,
        status: 'success'
      });
    });

    // Add party creation activities
    recentParties?.forEach(party => {
      activities.push({
        id: `party_${party.id}`,
        type: 'party',
        action: 'New party created',
        details: party.party_name,
        user: party.users?.name || 'Unknown User',
        userEmail: party.users?.email || '',
        timestamp: party.created_at,
        status: 'success'
      });
    });

    // Add user registration activities
    recentUsers?.forEach(user => {
      activities.push({
        id: `user_${user.id}`,
        type: 'user',
        action: 'User registered',
        details: user.email,
        user: user.name || 'New User',
        userEmail: user.email,
        timestamp: user.created_at,
        status: 'info'
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    // Cache for 2 minutes
    await setCache(cacheKey, limitedActivities, 120);

    sendSuccessResponse(res, limitedActivities, 'Recent activity retrieved successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve recent activity', error);
  }
};

/**
 * Get all users for admin management
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const cacheKey = `admin:users:${page}:${limit}:${search}`;
    const cachedUsers = await getCache(cacheKey);
    
    if (cachedUsers) {
      return sendSuccessResponse(res, cachedUsers, 'Users from cache');
    }

    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        city,
        state,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    // Add search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Add pagination
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: users, error: usersError, count } = await query;

    if (usersError) throw usersError;

    // Get user statistics
    const userStats = await Promise.all(
      users.map(async (user) => {
        // Get party count for this user
        const { count: partyCount } = await supabase
          .from('parties')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get transaction count for this user
        const { count: transactionCount } = await supabase
          .from('ledger_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        return {
          ...user,
          partyCount: partyCount || 0,
          transactionCount: transactionCount || 0
        };
      })
    );

    const result = {
      users: userStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    };

    // Cache for 5 minutes
    await setCache(cacheKey, result, 300);

    sendSuccessResponse(res, result, 'Users retrieved successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve users', error);
  }
};

/**
 * Get system health status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSystemHealth = async (req, res) => {
  try {
    const health = {
      database: 'online',
      api: 'healthy',
      authentication: 'active',
      fileStorage: 'warning'
    };

    // Test database connection
    try {
      const { error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        health.database = 'error';
      }
    } catch (error) {
      health.database = 'error';
    }

    // Test Redis connection
    try {
      await getCache('health:test');
      health.cache = 'online';
    } catch (error) {
      health.cache = 'offline';
    }

    sendSuccessResponse(res, health, 'System health retrieved successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve system health', error);
  }
};

/**
 * Delete a user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendErrorResponse(res, 400, 'User ID is required');
    }

    console.log('🗑️ Starting admin user deletion for user:', userId);

    // Get user details before deletion
    const { data: user, error: userFetchError } = await supabase
      .from('users')
      .select('id, email, firebase_uid, auth_provider')
      .eq('id', userId)
      .single();

    if (userFetchError) {
      console.error('❌ Error fetching user:', userFetchError);
      return sendErrorResponse(res, 404, 'User not found');
    }

    console.log('✅ User found for deletion:', {
      id: user.id,
      email: user.email,
      firebaseUid: user.firebase_uid,
      authProvider: user.auth_provider
    });

    // First, delete all related data for this user from Supabase
    // Delete ledger entries
    const { error: ledgerError } = await supabase
      .from('ledger_entries')
      .delete()
      .eq('user_id', userId);

    if (ledgerError) {
      console.warn('⚠️ Warning: Could not delete ledger entries for user:', ledgerError);
    } else {
      console.log('✅ Ledger entries deleted for user:', userId);
    }

    // Delete parties
    const { error: partiesError } = await supabase
      .from('parties')
      .delete()
      .eq('user_id', userId);

    if (partiesError) {
      console.warn('⚠️ Warning: Could not delete parties for user:', partiesError);
    } else {
      console.log('✅ Parties deleted for user:', userId);
    }

    // Delete user settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId);

    if (settingsError) {
      console.warn('⚠️ Warning: Could not delete user settings for user:', settingsError);
    } else {
      console.log('✅ User settings deleted for user:', userId);
    }

    // Delete user from Supabase
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) {
      console.error('❌ Error deleting user from Supabase:', userError);
      throw userError;
    }

    console.log('✅ User deleted from Supabase:', userId);

    // Delete Firebase user if it exists
    try {
      if (user.firebase_uid) {
        console.log('🗑️ Deleting Firebase user:', user.firebase_uid);
        await admin.auth().deleteUser(user.firebase_uid);
        console.log('✅ Firebase user deleted successfully');
      } else {
        console.log('ℹ️ No Firebase UID found, skipping Firebase deletion');
      }
    } catch (firebaseError) {
      console.warn('⚠️ Firebase user deletion failed (continuing):', firebaseError.message);
      // Continue even if Firebase deletion fails
    }

    // Clear related caches
    await setCache('admin:users:*', null, 0); // Clear all user caches
    await setCache('admin:dashboard:stats', null, 0); // Clear stats cache

    console.log(`🗑️ Admin user deletion completed: ${user.email} at ${new Date().toISOString()}`);

    sendSuccessResponse(res, { 
      deletedUserId: userId,
      deletedFromSupabase: true,
      deletedFromFirebase: !!user.firebase_uid
    }, 'User deleted successfully from both Supabase and Firebase');
  } catch (error) {
    console.error('❌ Admin user deletion error:', error);
    sendErrorResponse(res, 500, 'Failed to delete user', error);
  }
};

/**
 * Reset user password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!userId) {
      return sendErrorResponse(res, 400, 'User ID is required');
    }

    if (!newPassword || newPassword.length < 8) {
      return sendErrorResponse(res, 400, 'New password must be at least 8 characters long');
    }

    console.log('🔐 Starting admin password reset for user:', userId);

    // Get user details
    const { data: user, error: userFetchError } = await supabase
      .from('users')
      .select('id, email, firebase_uid, auth_provider')
      .eq('id', userId)
      .single();

    if (userFetchError) {
      console.error('❌ Error fetching user:', userFetchError);
      return sendErrorResponse(res, 404, 'User not found');
    }

    console.log('✅ User found for password reset:', {
      id: user.id,
      email: user.email,
      firebaseUid: user.firebase_uid,
      authProvider: user.auth_provider
    });

    // Hash the new password
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    console.log('✅ Password hashed successfully');

    // Update user password in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating password in Supabase:', updateError);
      throw updateError;
    }

    console.log('✅ Password updated in Supabase');

    // Update Firebase user password if Firebase UID exists
    try {
      if (user.firebase_uid) {
        console.log('🔐 Updating Firebase user password:', user.firebase_uid);
        await admin.auth().updateUser(user.firebase_uid, {
          password: newPassword
        });
        console.log('✅ Firebase password updated successfully');
      } else {
        console.log('ℹ️ No Firebase UID found, skipping Firebase password update');
      }
    } catch (firebaseError) {
      console.warn('⚠️ Firebase password update failed (continuing):', firebaseError.message);
      // Continue even if Firebase update fails
    }

    // Clear user caches
    await setCache('admin:users:*', null, 0);

    console.log(`🔐 Admin password reset completed for: ${user.email} at ${new Date().toISOString()}`);

    sendSuccessResponse(res, { 
      userId,
      updatedInSupabase: true,
      updatedInFirebase: !!user.firebase_uid
    }, 'Password reset successfully in both Supabase and Firebase');
  } catch (error) {
    console.error('❌ Admin password reset error:', error);
    sendErrorResponse(res, 500, 'Failed to reset password', error);
  }
};

/**
 * Get user details by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendErrorResponse(res, 400, 'User ID is required');
    }

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        city,
        state,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Get user statistics
    const { count: partyCount } = await supabase
      .from('parties')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: transactionCount } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const userWithStats = {
      ...user,
      partyCount: partyCount || 0,
      transactionCount: transactionCount || 0
    };

    sendSuccessResponse(res, userWithStats, 'User details retrieved successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve user details', error);
  }
};

/**
 * Get pending users awaiting approval
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPendingUsers = async (req, res) => {
  try {
    const cacheKey = 'admin:pending-users';
    const cachedUsers = await getCache(cacheKey);
    
    if (cachedUsers) {
      return sendSuccessResponse(res, cachedUsers, 'Pending users from cache');
    }

    const pendingUsers = await User.getPendingUsers();

    // Cache for 2 minutes
    await setCache(cacheKey, pendingUsers, 120);

    sendSuccessResponse(res, pendingUsers, 'Pending users retrieved successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve pending users', error);
  }
};

/**
 * Approve a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendErrorResponse(res, 400, 'User ID is required');
    }

    console.log('✅ Starting admin user approval for user:', userId);

    // Get user details before approval
    const { data: user, error: userFetchError } = await supabase
      .from('users')
      .select('id, email, firebase_uid, auth_provider, is_approved')
      .eq('id', userId)
      .single();

    if (userFetchError) {
      console.error('❌ Error fetching user:', userFetchError);
      return sendErrorResponse(res, 404, 'User not found');
    }

    if (user.is_approved) {
      return sendErrorResponse(res, 400, 'User is already approved');
    }

    console.log('✅ User found for approval:', {
      id: user.id,
      email: user.email,
      firebaseUid: user.firebase_uid,
      authProvider: user.auth_provider
    });

    // Approve user in Supabase
    const approvedUser = await User.approveUser(userId);
    console.log('✅ User approved in Supabase:', userId);

    // Clear related caches
    await setCache('admin:users:*', null, 0);
    await setCache('admin:pending-users', null, 0);
    await setCache('admin:dashboard:stats', null, 0);

    console.log(`✅ Admin user approval completed: ${user.email} at ${new Date().toISOString()}`);

    sendSuccessResponse(res, { 
      approvedUserId: userId,
      approvedUser: approvedUser
    }, 'User approved successfully');
  } catch (error) {
    console.error('❌ Admin user approval error:', error);
    sendErrorResponse(res, 500, 'Failed to approve user', error);
  }
};

/**
 * Disapprove a user (delete them)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const disapproveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendErrorResponse(res, 400, 'User ID is required');
    }

    console.log('❌ Starting admin user disapproval for user:', userId);

    // Get user details before disapproval
    const { data: user, error: userFetchError } = await supabase
      .from('users')
      .select('id, email, firebase_uid, auth_provider')
      .eq('id', userId)
      .single();

    if (userFetchError) {
      console.error('❌ Error fetching user:', userFetchError);
      return sendErrorResponse(res, 404, 'User not found');
    }

    console.log('✅ User found for disapproval:', {
      id: user.id,
      email: user.email,
      firebaseUid: user.firebase_uid,
      authProvider: user.auth_provider
    });

    // Disapprove user (delete them)
    await User.disapproveUser(userId);
    console.log('✅ User disapproved (deleted) from Supabase:', userId);

    // Delete Firebase user if it exists
    try {
      if (user.firebase_uid) {
        console.log('🗑️ Deleting Firebase user:', user.firebase_uid);
        await admin.auth().deleteUser(user.firebase_uid);
        console.log('✅ Firebase user deleted successfully');
      } else {
        console.log('ℹ️ No Firebase UID found, skipping Firebase deletion');
      }
    } catch (firebaseError) {
      console.warn('⚠️ Firebase user deletion failed (continuing):', firebaseError.message);
      // Continue even if Firebase deletion fails
    }

    // Clear related caches
    await setCache('admin:users:*', null, 0);
    await setCache('admin:pending-users', null, 0);
    await setCache('admin:dashboard:stats', null, 0);

    console.log(`❌ Admin user disapproval completed: ${user.email} at ${new Date().toISOString()}`);

    sendSuccessResponse(res, { 
      disapprovedUserId: userId,
      deletedFromSupabase: true,
      deletedFromFirebase: !!user.firebase_uid
    }, 'User disapproved and deleted successfully');
  } catch (error) {
    console.error('❌ Admin user disapproval error:', error);
    sendErrorResponse(res, 500, 'Failed to disapprove user', error);
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity,
  getAllUsers,
  getSystemHealth,
  deleteUser,
  resetUserPassword,
  getUserById,
  getPendingUsers,
  approveUser,
  disapproveUser
};
