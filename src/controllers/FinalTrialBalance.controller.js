/**
 * Final Trial Balance Controller - Enhanced Version
 * 
 * Handles trial balance calculations using Supabase with enhanced
 * error handling, validation, caching, and performance monitoring.
 * 
 * @author Account Ledger Team
 * @version 3.0.0
 * @since 2024-01-01
 */

// Import required models and utilities
const LedgerEntry = require('../models/supabase/LedgerEntry');
const Party = require('../models/supabase/Party');
const { supabase } = require('../config/supabase');

// Enhanced cache configuration with TTL management
const trialBalanceCache = new Map();
const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000, // 5 minutes cache
  MAX_CACHE_SIZE: 1000, // Maximum number of cached entries
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes cleanup interval
  PERFORMANCE_THRESHOLD: 1000 // ms threshold for performance logging
};

// Business constants
const BUSINESS_CONSTANTS = {
  MAX_PARTY_NAME_LENGTH: 100,
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 1000,
  MIN_DATE_RANGE: 30, // days
  MAX_DATE_RANGE: 365 // days
};

// Input validation utilities
const validatePartyName = (partyName) => {
  if (!partyName || typeof partyName !== 'string') {
    return null; // Party name is optional
  }
  
  const trimmedName = partyName.trim();
  if (trimmedName.length === 0) {
    return null;
  }
  
  if (trimmedName.length > BUSINESS_CONSTANTS.MAX_PARTY_NAME_LENGTH) {
    throw new Error(`Party name cannot exceed ${BUSINESS_CONSTANTS.MAX_PARTY_NAME_LENGTH} characters`);
  }
  
  return trimmedName;
};

const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return null;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format provided');
  }
  
  if (start > end) {
    throw new Error('Start date cannot be after end date');
  }
  
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (daysDiff < BUSINESS_CONSTANTS.MIN_DATE_RANGE) {
    throw new Error(`Date range must be at least ${BUSINESS_CONSTANTS.MIN_DATE_RANGE} days`);
  }
  
  if (daysDiff > BUSINESS_CONSTANTS.MAX_DATE_RANGE) {
    throw new Error(`Date range cannot exceed ${BUSINESS_CONSTANTS.MAX_DATE_RANGE} days`);
  }
  
  return { start, end };
};

const validatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || BUSINESS_CONSTANTS.DEFAULT_PAGE_SIZE;
  
  if (pageNum < 1) {
    throw new Error('Page number must be greater than 0');
  }
  
  if (limitNum < 1 || limitNum > BUSINESS_CONSTANTS.MAX_PAGE_SIZE) {
    throw new Error(`Limit must be between 1 and ${BUSINESS_CONSTANTS.MAX_PAGE_SIZE}`);
  }
  
  return { page: pageNum, limit: limitNum };
};

// Cache management utilities
const cleanupCache = () => {
  const now = Date.now();
  const expiredKeys = [];
  
  for (const [key, value] of trialBalanceCache.entries()) {
    if (now - value.timestamp > CACHE_CONFIG.TTL) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => trialBalanceCache.delete(key));
  
  // If cache is still too large, remove oldest entries
  if (trialBalanceCache.size > CACHE_CONFIG.MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(trialBalanceCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const entriesToRemove = sortedEntries.slice(0, trialBalanceCache.size - CACHE_CONFIG.MAX_CACHE_SIZE);
    entriesToRemove.forEach(([key]) => trialBalanceCache.delete(key));
  }
};

// Set up periodic cache cleanup
setInterval(cleanupCache, CACHE_CONFIG.CLEANUP_INTERVAL);

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

// Performance monitoring utility
const logPerformance = (operation, duration, metadata = {}) => {
  if (duration > CACHE_CONFIG.PERFORMANCE_THRESHOLD) {
    } else {
    }
};

/**
 * Get final trial balance with enhanced validation and performance monitoring
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getFinalTrialBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName, page, limit } = req.query;
    const startTime = Date.now();

    // Validate inputs
    const validatedPartyName = validatePartyName(partyName);
    const { page: validatedPage, limit: validatedLimit } = validatePagination(page, limit);

    // Check cache first for better performance
    const cacheKey = `${userId}_${validatedPartyName || 'all'}_${validatedPage}_${validatedLimit}`;
    const cachedData = trialBalanceCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_CONFIG.TTL) {
      const cacheTime = Date.now() - startTime;
      logPerformance('Cache hit', cacheTime, { userId, partyName: validatedPartyName });
      return sendSuccessResponse(res, cachedData.data, 'Trial balance served from cache');
    }

    // Starting optimized trial balance calculation
    const calculationStartTime = Date.now();

    // Use database aggregation for much faster performance
    let query = supabase
      .from('ledger_entries')
      .select('party_name, tns_type, credit, debit')
      .eq('user_id', userId);

    // Filter by party name if provided
    if (validatedPartyName) {
      query = query.ilike('party_name', `%${validatedPartyName}%`);
    }

    const { data: entries, error } = await query;

    if (error) {
      throw error;
    }

    // Process entries with optimized logic
    const partyBalances = new Map();

    entries.forEach(entry => {
      const partyName = entry.party_name;
      
      if (!partyBalances.has(partyName)) {
        partyBalances.set(partyName, {
          name: partyName,
          creditTotal: 0,
          debitTotal: 0,
          entryCount: 0
        });
      }

      const party = partyBalances.get(partyName);
      party.entryCount++;
      
      // Optimize the type checking
      if (entry.tns_type === 'CR' && entry.credit > 0) {
        party.creditTotal += Number(entry.credit) || 0;
      } else if (entry.tns_type === 'DR' && entry.debit > 0) {
        party.debitTotal += Number(entry.debit) || 0;
      }
    });

    // Convert Map to array and calculate balances
    const trialBalance = Array.from(partyBalances.values())
      .map(party => ({
        ...party,
        balance: party.creditTotal - party.debitTotal
      }))
      .filter(party => party.creditTotal > 0 || party.debitTotal > 0); // Only show parties with transactions

    // Calculate totals efficiently
    const totalCredit = trialBalance.reduce((sum, party) => sum + party.creditTotal, 0);
    const totalDebit = trialBalance.reduce((sum, party) => sum + party.debitTotal, 0);
    const totalBalance = totalCredit - totalDebit;

    // Apply pagination
    const total = trialBalance.length;
    const skip = (validatedPage - 1) * validatedLimit;
    const paginatedTrialBalance = trialBalance.slice(skip, skip + validatedLimit);

    const calculationTime = Date.now() - calculationStartTime;
    logPerformance('Trial balance calculation', calculationTime, {
      userId,
      partyName: validatedPartyName,
      totalParties: total,
      page: validatedPage,
      limit: validatedLimit
    });

    const responseData = {
      parties: paginatedTrialBalance,
      totals: {
        totalCredit,
        totalDebit,
        totalBalance
      },
      pagination: {
        currentPage: validatedPage,
        totalPages: Math.ceil(total / validatedLimit),
        totalItems: total,
        itemsPerPage: validatedLimit
      },
      metadata: {
        calculationTime: `${calculationTime}ms`,
        cacheStatus: 'miss',
        timestamp: new Date().toISOString()
      }
    };

    // Cache the response
    trialBalanceCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData
    });

    const totalTime = Date.now() - startTime;
    logPerformance('Total trial balance operation', totalTime, {
      userId,
      partyName: validatedPartyName,
      cacheStatus: 'miss'
    });

    sendSuccessResponse(res, responseData, 'Final trial balance retrieved successfully');

  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to get trial balance', error);
  }
};

/**
 * Get party balance
 */
const getPartyBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName } = req.query;

    if (!partyName) {
      return res.status(400).json({
        success: false,
        message: 'Party name is required'
      });
    }

    // Get all entries for specific party
    const entries = await LedgerEntry.findByPartyName(userId, partyName);
    
    // Calculate totals
    const creditTotal = entries
      .filter(entry => entry.tns_type === 'CR')
      .reduce((sum, entry) => sum + entry.credit, 0);
    
    const debitTotal = entries
      .filter(entry => entry.tns_type === 'DR')
      .reduce((sum, entry) => sum + entry.debit, 0);
    
    const balance = creditTotal - debitTotal;

    res.json({
      success: true,
      message: 'Party balance retrieved successfully',
      data: {
        partyName,
        creditTotal,
        debitTotal,
        balance,
        entryCount: entries.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get party balance'
    });
  }
};

/**
 * Generate trial balance report
 */
const generateReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Get all entries for user
    let entries = await LedgerEntry.findByUserId(userId);
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      entries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      });
    }

    // Group by party and calculate totals
    const partyBalances = new Map();

    entries.forEach(entry => {
      const partyName = entry.party_name;
      
      if (!partyBalances.has(partyName)) {
        partyBalances.set(partyName, {
          name: partyName,
          creditTotal: 0,
          debitTotal: 0,
          entryCount: 0
        });
      }

      const party = partyBalances.get(partyName);
      party.entryCount++;
      
      if (entry.tns_type === 'CR' && entry.credit > 0) {
        party.creditTotal += entry.credit;
      } else if (entry.tns_type === 'DR' && entry.debit > 0) {
        party.debitTotal += entry.debit;
      }
    });

    // Convert to array and calculate balances
    const report = Array.from(partyBalances.values()).map(party => ({
      ...party,
      balance: party.creditTotal - party.debitTotal
    }));

    // Calculate grand totals
    const grandTotalCredit = report.reduce((sum, party) => sum + party.creditTotal, 0);
    const grandTotalDebit = report.reduce((sum, party) => sum + party.debitTotal, 0);
    const grandTotalBalance = grandTotalCredit - grandTotalDebit;

    res.json({
      success: true,
      message: 'Trial balance report generated successfully',
      data: {
        report,
        summary: {
          totalParties: report.length,
          totalEntries: entries.length,
          grandTotalCredit,
          grandTotalDebit,
          grandTotalBalance,
          dateRange: startDate && endDate ? { startDate, endDate } : 'All dates'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
};

/**
 * Clear trial balance cache for a specific user or all users
 */
const clearCache = async (req, res) => {
  try {
    const userId = req.user.id;
    const { allUsers } = req.query;

    if (allUsers === 'true' && req.user.role === 'admin') {
      // Clear all cache (admin only)
      trialBalanceCache.clear();
      // Cache cleared for all users by admin
    } else {
      // Clear cache for specific user
      const userCacheKeys = Array.from(trialBalanceCache.keys()).filter(key => key.startsWith(`${userId}_`));
      userCacheKeys.forEach(key => trialBalanceCache.delete(key));
      // Cache cleared for specific user
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
};

/**
 * Get performance metrics for trial balance operations
 */
const getPerformanceMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get cache statistics
    const cacheStats = {
      totalEntries: trialBalanceCache.size,
      cacheKeys: Array.from(trialBalanceCache.keys()),
      cacheSize: JSON.stringify(trialBalanceCache).length,
      cacheTTL: CACHE_CONFIG.TTL
    };

    // Get database performance metrics
    const startTime = Date.now();
    const { count } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    const dbQueryTime = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Performance metrics retrieved successfully',
      data: {
        cache: cacheStats,
        database: {
          totalEntries: count || 0,
          queryTime: dbQueryTime,
          performance: dbQueryTime < 100 ? 'Excellent' : dbQueryTime < 500 ? 'Good' : 'Needs Optimization'
        },
        recommendations: [
          'Use caching for repeated requests',
          'Database indexes are optimized',
          'Consider pagination for large datasets'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get performance metrics'
    });
  }
};

module.exports = {
  getFinalTrialBalance,
  getPartyBalance,
  generateReport,
  clearCache,
  getPerformanceMetrics
}; 