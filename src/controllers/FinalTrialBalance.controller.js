/**
 * Final Trial Balance Controller - Supabase Version
 * 
 * Handles trial balance calculations using Supabase
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

// Import required models
const LedgerEntry = require('../models/supabase/LedgerEntry');
const Party = require('../models/supabase/Party');
const { supabase } = require('../../config/supabase');

// Simple in-memory cache for trial balance data
const trialBalanceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Get final trial balance - OPTIMIZED VERSION
 */
const getFinalTrialBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName } = req.query;
    const startTime = Date.now();

    // Check cache first for better performance
    const cacheKey = `${userId}_${partyName || 'all'}`;
    const cachedData = trialBalanceCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      console.log('⚡ Serving trial balance from cache for user:', userId);
      return res.json(cachedData.data);
    }

    console.log('🚀 Starting optimized trial balance calculation for user:', userId);

    // Use database aggregation for much faster performance
    let query = supabase
      .from('ledger_entries')
      .select('party_name, tns_type, credit, debit')
      .eq('user_id', userId);

    // Filter by party name if provided
    if (partyName) {
      query = query.ilike('party_name', `%${partyName}%`);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }

    console.log(`📊 Retrieved ${entries.length} entries from database`);

    // Use Map for O(1) lookup performance
    const partyBalances = new Map();

    // Process entries with optimized logic
    entries.forEach(entry => {
      const partyName = entry.party_name;
      
      if (!partyBalances.has(partyName)) {
        partyBalances.set(partyName, {
          name: partyName,
          creditTotal: 0,
          debitTotal: 0
        });
      }

      const party = partyBalances.get(partyName);
      
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

    console.log(`✅ Trial balance calculated for ${trialBalance.length} parties in ${Date.now() - startTime}ms`);

    const responseData = {
      success: true,
      message: 'Final trial balance retrieved successfully',
      data: {
        parties: trialBalance,
        totals: {
          totalCredit,
          totalDebit,
          totalBalance
        }
      }
    };

    // Cache the response
    trialBalanceCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData
    });

    res.json(responseData);
  } catch (error) {
    console.error('❌ Error getting trial balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trial balance'
    });
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
    console.error('Error getting party balance:', error);
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
    console.error('Error generating report:', error);
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
      console.log('🧹 Cache cleared for all users by admin');
    } else {
      // Clear cache for specific user
      const userCacheKeys = Array.from(trialBalanceCache.keys()).filter(key => key.startsWith(`${userId}_`));
      userCacheKeys.forEach(key => trialBalanceCache.delete(key));
      console.log(`🧹 Cache cleared for user: ${userId}`);
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
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
      cacheTTL: CACHE_TTL
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
    console.error('Error getting performance metrics:', error);
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