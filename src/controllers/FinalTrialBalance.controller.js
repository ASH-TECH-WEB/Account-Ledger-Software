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

/**
 * Get final trial balance
 */
const getFinalTrialBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName } = req.query;

    // Get all ledger entries for user
    let entries = await LedgerEntry.findByUserId(userId);
    
    // Filter by party name if provided
    if (partyName) {
      entries = entries.filter(entry => 
        entry.party_name.toLowerCase().includes(partyName.toLowerCase())
      );
    }

    // Group entries by party and calculate totals
    const partyBalances = new Map();

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
      
      if (entry.tns_type === 'CR' && entry.credit > 0) {
        party.creditTotal += entry.credit;
      } else if (entry.tns_type === 'DR' && entry.debit > 0) {
        party.debitTotal += entry.debit;
      }
    });

    // Convert Map to array and calculate balances
    const trialBalance = Array.from(partyBalances.values()).map(party => ({
      ...party,
      balance: party.creditTotal - party.debitTotal
    }));

    // Calculate totals
    const totalCredit = trialBalance.reduce((sum, party) => sum + party.creditTotal, 0);
    const totalDebit = trialBalance.reduce((sum, party) => sum + party.debitTotal, 0);
    const totalBalance = totalCredit - totalDebit;

    res.json({
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
    });
  } catch (error) {
    console.error('Error getting trial balance:', error);
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

module.exports = {
  getFinalTrialBalance,
  getPartyBalance,
  generateReport
}; 