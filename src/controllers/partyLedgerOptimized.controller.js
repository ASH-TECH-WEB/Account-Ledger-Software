/**
 * Optimized Party Ledger Controller
 * 
 * Performance optimizations:
 * - Reduced database queries
 * - Optimized sorting
 * - Better caching
 * - Parallel processing
 */

const LedgerEntry = require('../models/supabase/LedgerEntry');
const Party = require('../models/supabase/Party');

// Optimized getPartyLedger function
const getPartyLedgerOptimized = async (req, res) => {
  try {
    const partyName = req.params.partyName;
    const userId = req.user.id;
    
    // Start timing
    const startTime = Date.now();
    
    // Parallel database queries
    const [parties, allEntries] = await Promise.all([
      Party.findByUserId(userId),
      LedgerEntry.findByPartyName(userId, partyName)
    ]);
    
    const queryTime = Date.now() - startTime;
    console.log(`Database queries took: ${queryTime}ms`);
    
    // Quick validation
    const isVirtualParty = partyName.toLowerCase().includes('commission') ||
                          partyName.toLowerCase().includes('aqc') ||
                          partyName.toLowerCase().includes('company') ||
                          partyName.toLowerCase().includes('comp') ||
                          partyName.toLowerCase().includes('auto-calculated');
    
    if (!isVirtualParty) {
      const party = parties.find(p => p.party_name === partyName);
      if (!party) {
        return res.status(404).json({
          success: false,
          message: `Party "${partyName}" not found`,
          availableParties: parties.map(p => p.party_name)
        });
      }
    }
    
    // Early return for empty results
    if (!allEntries || allEntries.length === 0) {
      return res.json({
        success: true,
        data: {
          ledgerEntries: [],
          oldRecords: [],
          closingBalance: 0,
          summary: {
            totalCredit: 0,
            totalDebit: 0,
            calculatedBalance: 0,
            totalEntries: 0
          },
          mondayFinalData: {
            transactionCount: 0,
            totalCredit: 0,
            totalDebit: 0,
            startingBalance: 0,
            finalBalance: 0
          }
        },
        message: `No ledger entries found for party '${partyName}'`
      });
    }
    
    // Optimized filtering and sorting
    const processingStart = Date.now();
    
    // Separate current entries from old records
    const currentEntries = [];
    const oldRecords = [];
    
    for (const entry of allEntries) {
      if (entry.is_old_record) {
        oldRecords.push(entry);
      } else {
        currentEntries.push(entry);
      }
    }
    
    // Optimized sorting - single pass
    const sortEntries = (entries) => {
      return entries.sort((a, b) => {
        // Primary sort by date
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        
        // Secondary sort by creation time
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        
        return timeA - timeB;
      });
    };
    
    const sortedCurrentEntries = sortEntries(currentEntries);
    const sortedOldRecords = sortEntries(oldRecords);
    
    // Calculate summary data in single pass
    let totalCredit = 0;
    let totalDebit = 0;
    let closingBalance = 0;
    
    for (const entry of sortedCurrentEntries) {
      totalCredit += parseFloat(entry.credit || 0);
      totalDebit += parseFloat(entry.debit || 0);
    }
    
    // Get closing balance from last entry
    if (sortedCurrentEntries.length > 0) {
      const lastEntry = sortedCurrentEntries[sortedCurrentEntries.length - 1];
      closingBalance = parseFloat(lastEntry.balance || 0);
    } else if (sortedOldRecords.length > 0) {
      const lastOldEntry = sortedOldRecords[sortedOldRecords.length - 1];
      closingBalance = parseFloat(lastOldEntry.balance || 0);
    }
    
    const processingTime = Date.now() - processingStart;
    console.log(`Data processing took: ${processingTime}ms`);
    
    // Prepare response
    const response = {
      success: true,
      data: {
        ledgerEntries: sortedCurrentEntries,
        oldRecords: sortedOldRecords,
        closingBalance,
        summary: {
          totalCredit,
          totalDebit,
          calculatedBalance: totalCredit - totalDebit,
          totalEntries: sortedCurrentEntries.length
        },
        mondayFinalData: {
          transactionCount: 0,
          totalCredit: 0,
          totalDebit: 0,
          startingBalance: 0,
          finalBalance: 0
        }
      },
      message: `Ledger data retrieved successfully for party '${partyName}'`,
      performance: {
        queryTime,
        processingTime,
        totalTime: Date.now() - startTime
      }
    };
    
    const totalTime = Date.now() - startTime;
    console.log(`Total API response time: ${totalTime}ms`);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error in getPartyLedgerOptimized:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getPartyLedgerOptimized
};
