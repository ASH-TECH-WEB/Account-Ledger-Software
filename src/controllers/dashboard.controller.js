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
 * Get dashboard statistics with AQC balance
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all parties for user
    const parties = await Party.findByUserId(userId);
    
    // Get all ledger entries for user
    const entries = await LedgerEntry.findByUserId(userId);

    // Calculate basic statistics
    const totalParties = parties.length;
    const totalTransactions = entries.length;
    
    // Calculate totals
    const totalCredit = entries
      .filter(entry => entry.tns_type === 'CR')
      .reduce((sum, entry) => sum + entry.credit, 0);
    
    const totalDebit = entries
      .filter(entry => entry.tns_type === 'DR')
      .reduce((sum, entry) => sum + entry.debit, 0);
    
    const totalBalance = totalCredit - totalDebit;

    // Calculate AQC balance from commission transactions
    let aqcCompanyBalance = 0;
    let totalCommissionCollected = 0;
    let totalCommissionPaid = 0;
    let totalBusinessVolume = 0;
    let commissionTransactionCount = 0;

    // ULTIMATE CORRECTED LOGIC: Commission calculation based on actual transaction direction
    entries.forEach(entry => {
      const amount = entry.tns_type === 'CR' ? entry.credit : entry.debit;
      
      // Calculate commission based on actual transaction direction
      if (entry.remarks.includes('Commission')) {
        if (entry.remarks.includes('Auto-calculated')) {
          // Extract party number from remarks dynamically
          const partyMatch = entry.remarks.match(/\((\d+)\)/);
          if (partyMatch) {
            const partyNumber = parseInt(partyMatch[1]);
            
            // Smart logic: Based on transaction type (CR/DR) for universal compatibility
            if (entry.tns_type === 'CR') {
              // Credit transaction = Company pays commission
              totalCommissionPaid += amount;
              aqcCompanyBalance -= amount;
            } else if (entry.tns_type === 'DR') {
              // Debit transaction = Company receives commission
              totalCommissionCollected += amount;
              aqcCompanyBalance += amount;
            }
          }
        }
      }
      
      // Calculate business volume from main transactions (non-commission)
      if (!entry.remarks.includes('Commission') && !entry.remarks.includes('Auto-calculated')) {
        totalBusinessVolume += amount;
      }
      
      // Count commission transactions
      if (entry.remarks.includes('Commission')) {
        commissionTransactionCount++;
      }
    });

    // Calculate net profit
    const netCommissionProfit = totalCommissionCollected - totalCommissionPaid;

    // Get recent activity (last 10 entries)
    const recentEntries = entries
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(entry => ({
        id: entry.id,
        partyName: entry.party_name,
        type: entry.tns_type,
        amount: entry.tns_type === 'CR' ? entry.credit : entry.debit,
        date: entry.date,
        remarks: entry.remarks
      }));

    // Calculate party-wise summary
    const partySummary = parties.map(party => ({
      id: party.id,
      name: party.party_name,
      srNo: party.sr_no,
      address: party.address,
      phone: party.phone,
      email: party.email
    }));

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

/**
 * Get recent activity
 */
const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    // Get all ledger entries for user
    const entries = await LedgerEntry.findByUserId(userId);
    
    // Sort by creation date and limit results
    const recentEntries = entries
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit))
      .map(entry => ({
        id: entry.id,
        partyName: entry.party_name,
        type: entry.tns_type,
        amount: entry.tns_type === 'CR' ? entry.credit : entry.debit,
        date: entry.date,
        remarks: entry.remarks,
        createdAt: entry.created_at
      }));

    res.json({
      success: true,
      message: 'Recent activity retrieved successfully',
      data: recentEntries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recent activity'
    });
  }
};

/**
 * Get summary statistics
 */
const getSummaryStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Get all ledger entries for user
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

    // Calculate summary
    const totalCredit = entries
      .filter(entry => entry.tns_type === 'CR')
      .reduce((sum, entry) => sum + entry.credit, 0);
    
    const totalDebit = entries
      .filter(entry => entry.tns_type === 'DR')
      .reduce((sum, entry) => sum + entry.debit, 0);
    
    const totalBalance = totalCredit - totalDebit;
    const totalEntries = entries.length;

    // Group by party
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
        partyStats[partyName].credit += entry.credit;
      } else if (entry.tns_type === 'DR') {
        partyStats[partyName].debit += entry.debit;
      }
      partyStats[partyName].entries++;
    });

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
    res.status(500).json({
      success: false,
      message: 'Failed to get summary statistics'
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity,
  getSummaryStats
}; 