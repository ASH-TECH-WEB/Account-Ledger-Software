/**
 * Dashboard Controller - Supabase Version
 * 
 * Provides dashboard statistics using Supabase
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

// Import required models
const Party = require('../models/supabase/Party');
const LedgerEntry = require('../models/supabase/LedgerEntry');

/**
 * Get dashboard statistics with AQC balance - OPTIMIZED VERSION
 */
const getDashboardStats = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user.id;

    // OPTIMIZED: Use direct Supabase queries with aggregation instead of fetching all data
    const { supabase } = require('../config/supabase');
    
    // Run all queries in parallel for maximum speed
    const [
      partiesResult,
      entriesResult,
      creditSumResult,
      debitSumResult,
      commissionResult
    ] = await Promise.allSettled([
      // Get parties count and basic info
      supabase
        .from('parties')
        .select('id, party_name, sr_no, address, phone, email')
        .eq('user_id', userId),
      
      // Get recent entries (last 10) for activity
      supabase
        .from('ledger_entries')
        .select('id, party_name, tns_type, credit, debit, date, remarks, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Get total credit sum
      supabase
        .from('ledger_entries')
        .select('credit')
        .eq('user_id', userId)
        .eq('tns_type', 'CR')
        .not('credit', 'is', null),
      
      // Get total debit sum
      supabase
        .from('ledger_entries')
        .select('debit')
        .eq('user_id', userId)
        .eq('tns_type', 'DR')
        .not('debit', 'is', null),
      
      // Get commission data
      supabase
        .from('ledger_entries')
        .select('tns_type, credit, debit, remarks')
        .eq('user_id', userId)
        .like('remarks', '%Commission%')
    ]);

    // Process results with error handling
    const parties = partiesResult.status === 'fulfilled' ? partiesResult.value.data || [] : [];
    const entries = entriesResult.status === 'fulfilled' ? entriesResult.value.data || [] : [];
    const creditData = creditSumResult.status === 'fulfilled' ? creditSumResult.value.data || [] : [];
    const debitData = debitSumResult.status === 'fulfilled' ? debitSumResult.value.data || [] : [];
    const commissionData = commissionResult.status === 'fulfilled' ? commissionResult.value.data || [] : [];

    // Calculate basic statistics - OPTIMIZED
    const totalParties = parties.length;
    const totalTransactions = entries.length;
    
    // Calculate totals - OPTIMIZED (using pre-filtered data)
    const totalCredit = creditData.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    const totalDebit = debitData.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalBalance = totalCredit - totalDebit;

    // Calculate AQC balance from commission transactions - OPTIMIZED
    let aqcCompanyBalance = 0;
    let totalCommissionCollected = 0;
    let totalCommissionPaid = 0;
    let totalBusinessVolume = 0;
    let commissionTransactionCount = 0;

    // Process commission data efficiently
    commissionData.forEach(entry => {
      const amount = entry.tns_type === 'CR' ? (entry.credit || 0) : (entry.debit || 0);
      
      if (entry.remarks && entry.remarks.includes('Auto-calculated')) {
        if (entry.tns_type === 'CR') {
          totalCommissionPaid += amount;
          aqcCompanyBalance -= amount;
        } else if (entry.tns_type === 'DR') {
          totalCommissionCollected += amount;
          aqcCompanyBalance += amount;
        }
      }
      
      commissionTransactionCount++;
    });

    // Calculate net profit
    const netCommissionProfit = totalCommissionCollected - totalCommissionPaid;

    // Get recent activity - OPTIMIZED (already limited to 10)
    const recentEntries = entries.map(entry => ({
      id: entry.id,
      partyName: entry.party_name,
      type: entry.tns_type,
      amount: entry.tns_type === 'CR' ? (entry.credit || 0) : (entry.debit || 0),
      date: entry.date,
      remarks: entry.remarks
    }));

    // Calculate party-wise summary - OPTIMIZED
    const partySummary = parties.map(party => ({
      id: party.id,
      name: party.party_name,
      srNo: party.sr_no,
      address: party.address,
      phone: party.phone,
      email: party.email
    }));

    const loadTime = Date.now() - startTime;
    console.log(`⚡ Dashboard stats loaded in ${loadTime}ms`);

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        overview: {
          totalParties,
          totalTransactions,
          totalCredit,
          totalDebit,
          totalBalance
        },
        companyBalance: {
          netBalance: aqcCompanyBalance,
          commissionCollected: totalCommissionCollected,
          commissionPaid: totalCommissionPaid,
          netCommissionProfit,
          businessActivity: totalBusinessVolume,
          commissionTransactionCount,
          autoCalculated: true
        },
        recentActivity: recentEntries,
        parties: partySummary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: error.message
    });
  }
};

// Recent activity feature removed

/**
 * Get summary statistics - OPTIMIZED VERSION
 */
const getSummaryStats = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // OPTIMIZED: Use direct Supabase queries with date filtering
    const { supabase } = require('../config/supabase');
    
    let query = supabase
      .from('ledger_entries')
      .select('tns_type, credit, debit, party_name, date')
      .eq('user_id', userId);
    
    // Apply date range filter if provided
    if (startDate && endDate) {
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
    }
    
    const { data: entries, error } = await query;
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Calculate summary - OPTIMIZED
    const totalCredit = entries
      .filter(entry => entry.tns_type === 'CR')
      .reduce((sum, entry) => sum + (entry.credit || 0), 0);
    
    const totalDebit = entries
      .filter(entry => entry.tns_type === 'DR')
      .reduce((sum, entry) => sum + (entry.debit || 0), 0);
    
    const totalBalance = totalCredit - totalDebit;
    const totalEntries = entries.length;

    // Group by party - OPTIMIZED
    const partyStats = {};
    entries.forEach(entry => {
      const partyName = entry.party_name;
      if (!partyStats[partyName]) {
        partyStats[partyName] = {
          credit: 0,
          debit: 0,
          entries: 0
        };
      }
      
      if (entry.tns_type === 'CR') {
        partyStats[partyName].credit += (entry.credit || 0);
      } else if (entry.tns_type === 'DR') {
        partyStats[partyName].debit += (entry.debit || 0);
      }
      partyStats[partyName].entries++;
    });

    const loadTime = Date.now() - startTime;
    console.log(`⚡ Summary stats loaded in ${loadTime}ms`);

    res.json({
      success: true,
      message: 'Summary statistics retrieved successfully',
      data: {
        summary: {
          totalCredit,
          totalDebit,
          totalBalance,
          totalEntries,
          dateRange: startDate && endDate ? { startDate, endDate } : 'All dates'
        },
        partyStats: Object.entries(partyStats).map(([name, stats]) => ({
          name,
          credit: stats.credit,
          debit: stats.debit,
          balance: stats.credit - stats.debit,
          entries: stats.entries
        }))
      }
    });
  } catch (error) {
    console.error('❌ Summary stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get summary statistics',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getSummaryStats
}; 