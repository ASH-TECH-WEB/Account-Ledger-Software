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
 * Get dashboard statistics with AQC Company balance
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

    // Calculate AQC Company balance from commission transactions
    let aqcCompanyBalance = 0;
    let totalCommissionCollected = 0;
    let totalCommissionPaid = 0;
    let totalBusinessVolume = 0;
    let commissionTransactionCount = 0;

    // Filter commission transactions
    const commissionEntries = entries.filter(entry => 
      entry.remarks && entry.remarks.includes('Commission Transaction')
    );

    // Group entries by transaction ID
    const transactionGroups = {};
    commissionEntries.forEach(entry => {
      const match = entry.remarks.match(/Commission Transaction (CT\d+)/);
      if (match) {
        const transactionId = match[1];
        if (!transactionGroups[transactionId]) {
          transactionGroups[transactionId] = [];
        }
        transactionGroups[transactionId].push(entry);
      }
    });

    // Calculate balance for each transaction
    Object.values(transactionGroups).forEach(transactionEntries => {
      let transactionBalance = 0;
      let transactionVolume = 0;
      let clientCommission = 0;
      let vendorCommission = 0;

      transactionEntries.forEach(entry => {
        if (entry.party_name === 'AQC Company') {
          if (entry.tns_type === 'CR') {
            transactionBalance += entry.credit;
          } else if (entry.tns_type === 'DR') {
            transactionBalance -= entry.debit;
          }
        }

        // Extract commission amounts from remarks
        if (entry.remarks.includes('Commission:')) {
          const commissionMatch = entry.remarks.match(/Commission: ₹(\d+)/);
          if (commissionMatch) {
            const amount = parseInt(commissionMatch[1]);
            if (entry.remarks.includes('Received from') && entry.party_name === 'AQC Company') {
              clientCommission = amount;
            } else if (entry.remarks.includes('Incentive payment to') && entry.party_name === 'AQC Company') {
              vendorCommission = amount;
            }
          }
        }

        // Extract original amount
        if (entry.remarks.includes('Amount: ₹')) {
          const amountMatch = entry.remarks.match(/Amount: ₹(\d+)/);
          if (amountMatch && !transactionVolume) {
            transactionVolume = parseInt(amountMatch[1]);
          }
        }
      });

      aqcCompanyBalance += transactionBalance;
      totalBusinessVolume += transactionVolume;
      totalCommissionCollected += clientCommission;
      totalCommissionPaid += vendorCommission;
      commissionTransactionCount++;
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
    console.error('Error getting dashboard stats:', error);
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
    console.error('Error getting recent activity:', error);
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
    console.error('Error getting summary stats:', error);
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