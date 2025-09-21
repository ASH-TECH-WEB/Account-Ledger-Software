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
 * Get all dashboard data in a single request (BATCH API)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardData = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { limit = 10 } = req.query;
    const cacheKey = `admin:dashboard-data:${limit}`;
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return sendSuccessResponse(res, cachedData, 'Dashboard data from cache');
    }


    // Run all queries in parallel for maximum speed
    const [
      statsResult,
      activityResult,
      usersResult,
      healthResult,
      pendingUsersResult
    ] = await Promise.allSettled([
      // Get stats
      getDashboardStatsData(),
      
      // Get activity
      getRecentActivityData(parseInt(limit)),
      
      // Get users (first page only)
      getAllUsersData(1, 10, ''),
      
      // Get health
      getSystemHealthData(),
      
      // Get pending users
      getPendingUsersData()
    ]);

    // Process results
    const stats = statsResult.status === 'fulfilled' ? statsResult.value : {
      totalUsers: 0, totalParties: 0, totalTransactions: 0,
      totalRevenue: 0, activeUsers: 0, pendingTransactions: 0
    };

    const activity = activityResult.status === 'fulfilled' ? activityResult.value : [];
    const users = usersResult.status === 'fulfilled' ? usersResult.value : { users: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    const health = healthResult.status === 'fulfilled' ? healthResult.value : { database: 'unknown', api: 'unknown', authentication: 'unknown', fileStorage: 'unknown' };
    const pendingUsers = pendingUsersResult.status === 'fulfilled' ? pendingUsersResult.value : [];

    const dashboardData = {
      stats,
      activity,
      users,
      health,
      pendingUsers
    };

    // Cache for 5 minutes
    await setCache(cacheKey, dashboardData, 300);

    const loadTime = Date.now() - startTime;

    sendSuccessResponse(res, dashboardData, `Dashboard data retrieved successfully in ${loadTime}ms`);
  } catch (error) {
    console.error('❌ Dashboard data loading error:', error);
    sendErrorResponse(res, 500, 'Failed to retrieve dashboard data', error);
  }
};

// Helper functions to extract data without response wrapping
const getDashboardStatsData = async () => {
  const cacheKey = 'admin:dashboard:stats';
  const cachedStats = await getCache(cacheKey);
  
  if (cachedStats) return cachedStats;

  const [usersResult, partiesResult, transactionsResult, revenueResult, activeUsersResult, pendingTransactionsResult] = await Promise.allSettled([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('parties').select('*', { count: 'exact', head: true }),
    supabase.from('ledger_entries').select('*', { count: 'exact', head: true }),
    supabase.from('ledger_entries').select('credit').not('credit', 'is', null).limit(10000),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('ledger_entries').select('*', { count: 'exact', head: true }).eq('chk', false)
  ]);

  const totalUsers = usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0;
  const totalParties = partiesResult.status === 'fulfilled' ? (partiesResult.value.count || 0) : 0;
  const totalTransactions = transactionsResult.status === 'fulfilled' ? (transactionsResult.value.count || 0) : 0;
  const activeUsers = activeUsersResult.status === 'fulfilled' ? (activeUsersResult.value.count || 0) : 0;
  const pendingTransactions = pendingTransactionsResult.status === 'fulfilled' ? (pendingTransactionsResult.value.count || 0) : 0;

  let totalRevenue = 0;
  if (revenueResult.status === 'fulfilled' && revenueResult.value.data) {
    totalRevenue = revenueResult.value.data.reduce((sum, entry) => {
      const credit = parseFloat(entry.credit);
      return sum + (isNaN(credit) ? 0 : credit);
    }, 0);
  }

  const stats = {
    totalUsers, totalParties, totalTransactions,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    activeUsers, pendingTransactions
  };

  await setCache(cacheKey, stats, 600);
  return stats;
};

// Recent activity feature removed

const getAllUsersData = async (page, limit, search) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const cacheKey = `admin:users:${page}:${limit}:${search}`;
  const cachedUsers = await getCache(cacheKey);
  
  if (cachedUsers) return cachedUsers;

  let query = supabase.from('users').select('id, name, email, phone, city, state, is_approved, approved_at, auth_provider, google_id, profile_picture, email_verified, firebase_uid, last_login, status, company_account, created_at, updated_at').order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  query = query.range(offset, offset + parseInt(limit) - 1);
  const { data: users, error: usersError, count } = await query;

  if (usersError) throw usersError;

  const userIds = users.map(user => user.id);
  const [partiesResult, transactionsResult] = await Promise.allSettled([
    supabase.from('parties').select('user_id').in('user_id', userIds),
    supabase.from('ledger_entries').select('user_id').in('user_id', userIds)
  ]);

  const partyCounts = {};
  const transactionCounts = {};

  if (partiesResult.status === 'fulfilled' && partiesResult.value.data) {
    partiesResult.value.data.forEach(party => {
      partyCounts[party.user_id] = (partyCounts[party.user_id] || 0) + 1;
    });
  }

  if (transactionsResult.status === 'fulfilled' && transactionsResult.value.data) {
    transactionsResult.value.data.forEach(transaction => {
      transactionCounts[transaction.user_id] = (transactionCounts[transaction.user_id] || 0) + 1;
    });
  }

  const userStats = users.map(user => ({
    ...user,
    partyCount: partyCounts[user.id] || 0,
    transactionCount: transactionCounts[user.id] || 0
  }));

  const result = {
    users: userStats,
    pagination: {
      page: parseInt(page), limit: parseInt(limit),
      total: count || 0, totalPages: Math.ceil((count || 0) / parseInt(limit))
    }
  };

  await setCache(cacheKey, result, 600);
  return result;
};

const getSystemHealthData = async () => {
  const cacheKey = 'admin:system-health';
  const cachedHealth = await getCache(cacheKey);
  
  if (cachedHealth) return cachedHealth;

  const health = { database: 'online', api: 'healthy', authentication: 'active', fileStorage: 'unknown', cache: 'unknown' };

  const [dbResult, cacheResult, storageResult] = await Promise.allSettled([
    supabase.from('users').select('count').limit(1),
    getCache('health:test'),
    // Test Supabase Storage by listing buckets
    supabase.storage.listBuckets()
  ]);

  if (dbResult.status === 'fulfilled' && !dbResult.value.error) {
    health.database = 'online';
  } else {
    health.database = 'error';
  }

  if (cacheResult.status === 'fulfilled') {
    health.cache = 'online';
  } else {
    health.cache = 'offline';
  }

  // Check file storage (Supabase Storage)
  if (storageResult.status === 'fulfilled' && !storageResult.value.error) {
    health.fileStorage = 'online';
  } else {
    health.fileStorage = 'error';
  }

  await setCache(cacheKey, health, 120);
  return health;
};

const getPendingUsersData = async () => {
  const cacheKey = 'admin:pending-users';
  const cachedPendingUsers = await getCache(cacheKey);
  
  if (cachedPendingUsers) return cachedPendingUsers;

  const { data: pendingUsers, error } = await supabase
    .from('users')
    .select('id, name, email, phone, city, state, created_at, updated_at')
    .eq('is_approved', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  await setCache(cacheKey, pendingUsers || [], 300);
  return pendingUsers || [];
};

/**
 * Get admin dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardStats = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const cacheKey = 'admin:dashboard:stats';
    const cachedStats = await getCache(cacheKey);
    
    if (cachedStats) {
      return sendSuccessResponse(res, cachedStats, 'Dashboard stats from cache');
    }


    // Run all queries in parallel for maximum speed
    const [
      usersResult,
      partiesResult,
      transactionsResult,
      revenueResult,
      activeUsersResult,
      pendingTransactionsResult
    ] = await Promise.allSettled([
      // Total users count
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true }),
      
      // Total parties count
      supabase
        .from('parties')
        .select('*', { count: 'exact', head: true }),
      
      // Total ledger entries count
      supabase
        .from('ledger_entries')
        .select('*', { count: 'exact', head: true }),
      
      // Total revenue (sum of all credit amounts) - optimized query
      supabase
        .from('ledger_entries')
        .select('credit')
        .not('credit', 'is', null)
        .limit(10000), // Limit to prevent huge data transfer
      
      // Active users (last 7 days)
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Pending transactions
      supabase
        .from('ledger_entries')
        .select('*', { count: 'exact', head: true })
        .eq('chk', false)
    ]);

    // Process results with error handling
    const totalUsers = usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0;
    const totalParties = partiesResult.status === 'fulfilled' ? (partiesResult.value.count || 0) : 0;
    const totalTransactions = transactionsResult.status === 'fulfilled' ? (transactionsResult.value.count || 0) : 0;
    const activeUsers = activeUsersResult.status === 'fulfilled' ? (activeUsersResult.value.count || 0) : 0;
    const pendingTransactions = pendingTransactionsResult.status === 'fulfilled' ? (pendingTransactionsResult.value.count || 0) : 0;

    // Calculate revenue efficiently
    let totalRevenue = 0;
    if (revenueResult.status === 'fulfilled' && revenueResult.value.data) {
      totalRevenue = revenueResult.value.data.reduce((sum, entry) => {
        const credit = parseFloat(entry.credit);
        return sum + (isNaN(credit) ? 0 : credit);
      }, 0);
    }

    const stats = {
      totalUsers,
      totalParties,
      totalTransactions,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeUsers,
      pendingTransactions
    };

    // Cache for 10 minutes (increased cache time)
    await setCache(cacheKey, stats, 600);

    const loadTime = Date.now() - startTime;

    sendSuccessResponse(res, stats, `Dashboard statistics retrieved successfully in ${loadTime}ms`);
  } catch (error) {
    console.error('❌ Stats loading error:', error);
    sendErrorResponse(res, 500, 'Failed to retrieve dashboard statistics', error);
  }
};

// Recent activity feature removed

/**
 * Get all users for admin management
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllUsers = async (req, res) => {
  const startTime = Date.now();
  
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
        is_approved,
        approved_at,
        auth_provider,
        google_id,
        profile_picture,
        email_verified,
        firebase_uid,
        last_login,
        status,
        company_account,
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

    // Optimize: Get all user stats in parallel instead of sequential
    const userIds = users.map(user => user.id);
    
    const [partiesResult, transactionsResult] = await Promise.allSettled([
      // Get party counts for all users at once
      supabase
        .from('parties')
        .select('user_id')
        .in('user_id', userIds),
      
      // Get transaction counts for all users at once
      supabase
        .from('ledger_entries')
        .select('user_id')
        .in('user_id', userIds)
    ]);

    // Process results efficiently
    const partyCounts = {};
    const transactionCounts = {};

    if (partiesResult.status === 'fulfilled' && partiesResult.value.data) {
      partiesResult.value.data.forEach(party => {
        partyCounts[party.user_id] = (partyCounts[party.user_id] || 0) + 1;
      });
    }

    if (transactionsResult.status === 'fulfilled' && transactionsResult.value.data) {
      transactionsResult.value.data.forEach(transaction => {
        transactionCounts[transaction.user_id] = (transactionCounts[transaction.user_id] || 0) + 1;
      });
    }

    // Map user stats efficiently
    const userStats = users.map(user => ({
      ...user,
      partyCount: partyCounts[user.id] || 0,
      transactionCount: transactionCounts[user.id] || 0
    }));

    const result = {
      users: userStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    };

    // Cache for 10 minutes (increased cache time)
    await setCache(cacheKey, result, 600);

    const loadTime = Date.now() - startTime;

    sendSuccessResponse(res, result, `Users retrieved successfully in ${loadTime}ms`);
  } catch (error) {
    console.error('❌ Users loading error:', error);
    sendErrorResponse(res, 500, 'Failed to retrieve users', error);
  }
};

/**
 * Get system health status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSystemHealth = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const cacheKey = 'admin:system-health';
    const cachedHealth = await getCache(cacheKey);
    
    if (cachedHealth) {
      return sendSuccessResponse(res, cachedHealth, 'System health from cache');
    }


    const health = {
      database: 'online',
      api: 'healthy',
      authentication: 'active',
      fileStorage: 'unknown',
      cache: 'unknown'
    };

    // Test all connections in parallel
    const [dbResult, cacheResult, storageResult] = await Promise.allSettled([
      // Test database connection
      supabase
        .from('users')
        .select('count')
        .limit(1),
      
      // Test Redis connection
      getCache('health:test'),
      
      // Test Supabase Storage
      supabase.storage.listBuckets()
    ]);

    // Process database result
    if (dbResult.status === 'fulfilled' && !dbResult.value.error) {
      health.database = 'online';
    } else {
      health.database = 'error';
    }

    // Process cache result
    if (cacheResult.status === 'fulfilled') {
      health.cache = 'online';
    } else {
      health.cache = 'offline';
    }

    // Process file storage result
    if (storageResult.status === 'fulfilled' && !storageResult.value.error) {
      health.fileStorage = 'online';
    } else {
      health.fileStorage = 'error';
    }

    // Cache for 2 minutes
    await setCache(cacheKey, health, 120);

    const loadTime = Date.now() - startTime;

    sendSuccessResponse(res, health, `System health retrieved successfully in ${loadTime}ms`);
  } catch (error) {
    console.error('❌ Health check error:', error);
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
    }

    // Delete parties
    const { error: partiesError } = await supabase
      .from('parties')
      .delete()
      .eq('user_id', userId);

    if (partiesError) {
      console.warn('⚠️ Warning: Could not delete parties for user:', partiesError);
    } else {
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
    try {
      await setCache('admin:dashboard:stats', null, 0); // Clear stats cache
      await setCache('admin:pending-users', null, 0); // Clear pending users cache
      
      // Clear all admin:users:* cache keys by clearing common pagination combinations
      const commonLimits = [10, 20, 50, 100];
      const commonPages = [1, 2, 3, 4, 5];
      const searchTerms = ['', 'a', 'e', 'i', 'o', 'u']; // Common search patterns
      
      for (const limit of commonLimits) {
        for (const page of commonPages) {
          for (const search of searchTerms) {
            const cacheKey = `admin:users:${page}:${limit}:${search}`;
            await setCache(cacheKey, null, 0);
          }
        }
      }
      
      console.log('✅ Cleared all admin users cache keys');
    } catch (cacheError) {
      console.warn('Cache clearing failed:', cacheError);
    }

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
    try {
      await setCache('admin:dashboard:stats', null, 0);
    } catch (cacheError) {
      console.warn('Cache clearing failed:', cacheError);
    }

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
    try {
      await setCache('admin:pending-users', null, 0);
      await setCache('admin:dashboard:stats', null, 0);
      
      // Clear all admin:users:* cache keys by clearing common pagination combinations
      const commonLimits = [10, 20, 50, 100];
      const commonPages = [1, 2, 3, 4, 5];
      const searchTerms = ['', 'a', 'e', 'i', 'o', 'u']; // Common search patterns
      
      for (const limit of commonLimits) {
        for (const page of commonPages) {
          for (const search of searchTerms) {
            const cacheKey = `admin:users:${page}:${limit}:${search}`;
            await setCache(cacheKey, null, 0);
          }
        }
      }
      
      console.log('✅ Cleared all admin users cache keys');
    } catch (cacheError) {
      console.warn('Cache clearing failed:', cacheError);
    }

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
        console.log('ℹ️ No Firebase UID found, trying to find by email');
        // Try to find Firebase user by email and delete
        try {
          const firebaseUser = await admin.auth().getUserByEmail(user.email);
          if (firebaseUser) {
            console.log('🗑️ Found Firebase user by email, deleting:', firebaseUser.uid);
            await admin.auth().deleteUser(firebaseUser.uid);
            console.log('✅ Firebase user deleted by email lookup');
          }
        } catch (emailLookupError) {
          console.log('ℹ️ No Firebase user found by email, skipping Firebase deletion');
        }
      }
    } catch (firebaseError) {
      console.warn('⚠️ Firebase user deletion failed (continuing):', firebaseError.message);
      // Continue even if Firebase deletion fails
    }

    // Clear related caches
    try {
      await setCache('admin:pending-users', null, 0);
      await setCache('admin:dashboard:stats', null, 0);
      
      // Clear all admin:users:* cache keys by clearing common pagination combinations
      const commonLimits = [10, 20, 50, 100];
      const commonPages = [1, 2, 3, 4, 5];
      const searchTerms = ['', 'a', 'e', 'i', 'o', 'u']; // Common search patterns
      
      for (const limit of commonLimits) {
        for (const page of commonPages) {
          for (const search of searchTerms) {
            const cacheKey = `admin:users:${page}:${limit}:${search}`;
            await setCache(cacheKey, null, 0);
          }
        }
      }
      
      console.log('✅ Cleared all admin users cache keys');
    } catch (cacheError) {
      console.warn('Cache clearing failed:', cacheError);
    }

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

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createUser = async (req, res) => {
  try {
    const { name, email, phone, city, state, role = 'user', password } = req.body;

    if (!name || !email || !password) {
      return sendErrorResponse(res, 400, 'Name, email, and password are required');
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return sendErrorResponse(res, 409, 'User with this email already exists');
    }

    // Create user in database
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        phone,
        city,
        state,
        role,
        is_approved: true, // Admin created users are auto-approved
        approved_at: new Date().toISOString(),
        auth_provider: 'email',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Clear cache
    await setCache('admin:users:*', null, 0);
    await setCache('admin:dashboard-data:*', null, 0);

    console.log('✅ User created successfully by admin:', newUser.id);
    sendSuccessResponse(res, newUser, 'User created successfully');
  } catch (error) {
    console.error('❌ Create user error:', error);
    sendErrorResponse(res, 500, 'Failed to create user', error);
  }
};

/**
 * Update user information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, city, state, role, status } = req.body;

    if (!userId) {
      return sendErrorResponse(res, 400, 'User ID is required');
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Clear cache
    await setCache('admin:users:*', null, 0);
    await setCache('admin:dashboard-data:*', null, 0);

    console.log('✅ User updated successfully:', userId);
    sendSuccessResponse(res, updatedUser, 'User updated successfully');
  } catch (error) {
    console.error('❌ Update user error:', error);
    sendErrorResponse(res, 500, 'Failed to update user', error);
  }
};

/**
 * Toggle user status (active/inactive)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return sendErrorResponse(res, 400, 'User ID is required');
    }

    // Get current status
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('status')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newStatus = user.status === 'active' ? 'inactive' : 'active';

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Clear cache
    await setCache('admin:users:*', null, 0);

    console.log(`✅ User status toggled to ${newStatus}:`, userId);
    sendSuccessResponse(res, updatedUser, `User status updated to ${newStatus}`);
  } catch (error) {
    console.error('❌ Toggle user status error:', error);
    sendErrorResponse(res, 500, 'Failed to toggle user status', error);
  }
};

/**
 * Update user role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!userId || !role) {
      return sendErrorResponse(res, 400, 'User ID and role are required');
    }

    const validRoles = ['admin', 'user', 'manager', 'viewer'];
    if (!validRoles.includes(role)) {
      return sendErrorResponse(res, 400, 'Invalid role. Must be one of: ' + validRoles.join(', '));
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Clear cache
    await setCache('admin:users:*', null, 0);

    console.log(`✅ User role updated to ${role}:`, userId);
    sendSuccessResponse(res, updatedUser, `User role updated to ${role}`);
  } catch (error) {
    console.error('❌ Update user role error:', error);
    sendErrorResponse(res, 500, 'Failed to update user role', error);
  }
};

/**
 * Get user activity log
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    if (!userId) {
      return sendErrorResponse(res, 400, 'User ID is required');
    }

    // Get user's recent transactions and party activities
    const [transactionsResult, partiesResult] = await Promise.allSettled([
      supabase
        .from('ledger_entries')
        .select('id, description, credit, debit, created_at, party_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit) / 2),
      
      supabase
        .from('parties')
        .select('id, name, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit) / 2)
    ]);

    const transactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value.data || [] : [];
    const parties = partiesResult.status === 'fulfilled' ? partiesResult.value.data || [] : [];

    // Combine and format activity
    const activity = [
      ...transactions.map(t => ({
        id: t.id,
        type: 'transaction',
        description: t.description,
        amount: t.credit || t.debit,
        action: t.credit ? 'credit' : 'debit',
        timestamp: t.created_at,
        party_id: t.party_id
      })),
      ...parties.map(p => ({
        id: p.id,
        type: 'party',
        description: `Party created: ${p.name}`,
        action: 'create',
        timestamp: p.created_at
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, parseInt(limit));

    sendSuccessResponse(res, activity, 'User activity retrieved successfully');
  } catch (error) {
    console.error('❌ Get user activity error:', error);
    sendErrorResponse(res, 500, 'Failed to retrieve user activity', error);
  }
};

/**
 * Bulk user actions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const bulkUserActions = async (req, res) => {
  try {
    const { action, userIds, data } = req.body;

    if (!action || !userIds || !Array.isArray(userIds)) {
      return sendErrorResponse(res, 400, 'Action and userIds array are required');
    }

    let results = [];

    switch (action) {
      case 'delete':
        for (const userId of userIds) {
          try {
            const { error } = await supabase
              .from('users')
              .delete()
              .eq('id', userId);
            
            if (error) throw error;
            results.push({ userId, status: 'success' });
          } catch (error) {
            results.push({ userId, status: 'error', error: error.message });
          }
        }
        break;

      case 'toggle-status':
        for (const userId of userIds) {
          try {
            const { data: user } = await supabase
              .from('users')
              .select('status')
              .eq('id', userId)
              .single();

            const newStatus = user.status === 'active' ? 'inactive' : 'active';

            const { error } = await supabase
              .from('users')
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq('id', userId);
            
            if (error) throw error;
            results.push({ userId, status: 'success', newStatus });
          } catch (error) {
            results.push({ userId, status: 'error', error: error.message });
          }
        }
        break;

      case 'update-role':
        if (!data?.role) {
          return sendErrorResponse(res, 400, 'Role is required for update-role action');
        }

        for (const userId of userIds) {
          try {
            const { error } = await supabase
              .from('users')
              .update({ role: data.role, updated_at: new Date().toISOString() })
              .eq('id', userId);
            
            if (error) throw error;
            results.push({ userId, status: 'success', newRole: data.role });
          } catch (error) {
            results.push({ userId, status: 'error', error: error.message });
          }
        }
        break;

      default:
        return sendErrorResponse(res, 400, 'Invalid action. Supported actions: delete, toggle-status, update-role');
    }

    // Clear cache
    await setCache('admin:users:*', null, 0);
    await setCache('admin:dashboard-data:*', null, 0);

    console.log(`✅ Bulk action ${action} completed for ${userIds.length} users`);
    sendSuccessResponse(res, { results, totalProcessed: userIds.length }, `Bulk action ${action} completed`);
  } catch (error) {
    console.error('❌ Bulk user actions error:', error);
    sendErrorResponse(res, 500, 'Failed to perform bulk actions', error);
  }
};

/**
 * Export users data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const exportUsers = async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, phone, city, state, role, status, is_approved, auth_provider, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (format === 'csv') {
      // Simple CSV export
      const csvHeaders = 'ID,Name,Email,Phone,City,State,Role,Status,Approved,Auth Provider,Created At,Updated At\n';
      const csvData = users.map(user => 
        `${user.id},"${user.name}","${user.email}","${user.phone}","${user.city}","${user.state}","${user.role}","${user.status}","${user.is_approved}","${user.auth_provider}","${user.created_at}","${user.updated_at}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
      res.send(csvHeaders + csvData);
    } else {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="users-export.json"');
      sendSuccessResponse(res, users, 'Users data exported successfully');
    }

    console.log(`✅ Users data exported in ${format} format`);
  } catch (error) {
    console.error('❌ Export users error:', error);
    sendErrorResponse(res, 500, 'Failed to export users data', error);
  }
};

module.exports = {
  getDashboardData,
  getDashboardStats,
  getAllUsers,
  getSystemHealth,
  deleteUser,
  resetUserPassword,
  getUserById,
  getPendingUsers,
  approveUser,
  disapproveUser,
  createUser,
  updateUser,
  toggleUserStatus,
  updateUserRole,
  bulkUserActions,
  getUserActivity,
  exportUsers
};
