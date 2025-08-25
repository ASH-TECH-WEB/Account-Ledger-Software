/**
 * Commission Transaction Controller - Supabase Version
 * 
 * Handles commission transactions using Supabase
 * Implements AQC Company waterfall commission model:
 * 1. Client pays to AQC (with commission deduction)
 * 2. AQC pays to Vendor (net amount)
 * 3. Vendor pays back to AQC (full amount)
 * 4. AQC pays incentive to Vendor
 * 
 * @author Account Ledger Team
 * @version 2.1.0
 */

// Import required models
const LedgerEntry = require('../models/supabase/LedgerEntry');
const Party = require('../models/supabase/Party');

/**
 * Generate unique transaction ID
 */
const generateTransactionId = (prefix = 'CT') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}${timestamp}${random}`;
};

/**
 * Create commission transaction - AQC Waterfall Model
 */
const createCommissionTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      clientName,
      vendorName,
      originalAmount,
      clientCommissionRate = 3, // Default 3% from client
      vendorCommissionRate = 1, // Default 1% to vendor
      remarks = '',
      transactionDate = new Date().toISOString().split('T')[0]
    } = req.body;

    // Validate required fields
    if (!clientName || !vendorName || !originalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Client name, vendor name, and original amount are required'
      });
    }

    // Validate amounts
    if (originalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Original amount must be greater than 0'
      });
    }

    // Calculate commission amounts according to AQC model
    const clientCommissionAmount = Math.round((originalAmount * clientCommissionRate) / 100);
    const vendorCommissionAmount = Math.round((originalAmount * vendorCommissionRate) / 100);
    const netAmountToVendor = originalAmount - clientCommissionAmount;
    const netProfit = clientCommissionAmount - vendorCommissionAmount;

    // Create transaction ID
    const transactionId = generateTransactionId();

    // Create ledger entries for AQC waterfall commission transaction
    const entries = [];

    // PHASE 1: Client → AQC Company (Forward Flow)
    // Entry 1: Client pays to AQC Company (DR from client perspective)
    const clientEntry = {
      user_id: userId,
      party_name: clientName,
      date: transactionDate,
      remarks: `Commission Transaction ${transactionId}: Payment to AQC for ${vendorName} - Amount: ₹${originalAmount}, Commission: ₹${clientCommissionAmount}`,
      tns_type: 'DR',
      debit: originalAmount,
      credit: 0,
      balance: 0,
      chk: false,
      ti: transactionId,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Entry 2: AQC Company receives from client (CR to AQC)
    const aqcReceiveEntry = {
      user_id: userId,
      party_name: 'AQC Company',
      date: transactionDate,
      remarks: `Commission Transaction ${transactionId}: Received from ${clientName} for ${vendorName} - Gross: ₹${originalAmount}, Commission: ₹${clientCommissionAmount}`,
      tns_type: 'CR',
      debit: 0,
      credit: originalAmount,
      balance: 0,
      chk: false,
      ti: transactionId,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Entry 3: AQC Company pays to vendor (DR from AQC)
    const vendorEntry = {
      user_id: userId,
      party_name: vendorName,
      date: transactionDate,
      remarks: `Commission Transaction ${transactionId}: Payment from AQC on behalf of ${clientName} - Net Amount: ₹${netAmountToVendor}`,
      tns_type: 'CR',
      debit: 0,
      credit: netAmountToVendor,
      balance: 0,
      chk: false,
      ti: transactionId,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Entry 4: Vendor receives from AQC Company (CR to vendor)
    const vendorReceiveEntry = {
      user_id: userId,
      party_name: 'AQC Company',
      date: transactionDate,
      remarks: `Commission Transaction ${transactionId}: Paid to ${vendorName} on behalf of ${clientName} - Net: ₹${netAmountToVendor}`,
      tns_type: 'DR',
      debit: netAmountToVendor,
      credit: 0,
      balance: 0,
      chk: false,
      ti: transactionId,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // PHASE 2: Vendor → AQC Company (Backward Flow)
    // Entry 5: Vendor pays back to AQC Company (DR from vendor)
    const vendorPaybackEntry = {
      user_id: userId,
      party_name: vendorName,
      date: transactionDate,
      remarks: `Commission Transaction ${transactionId}: Payment back to AQC - Full Amount: ₹${originalAmount}`,
      tns_type: 'DR',
      debit: originalAmount,
      credit: 0,
      balance: 0,
      chk: false,
      ti: transactionId,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Entry 6: AQC Company receives from vendor (CR to AQC)
    const aqcReceiveVendorEntry = {
      user_id: userId,
      party_name: 'AQC Company',
      date: transactionDate,
      remarks: `Commission Transaction ${transactionId}: Received from ${vendorName} - Full Amount: ₹${originalAmount}`,
      tns_type: 'CR',
      debit: 0,
      credit: originalAmount,
      balance: 0,
      chk: false,
      ti: transactionId,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Entry 7: AQC Company pays incentive to vendor (DR from AQC)
    const vendorIncentiveEntry = {
      user_id: userId,
      party_name: vendorName,
      date: transactionDate,
      remarks: `Commission Transaction ${transactionId}: Incentive payment to ${vendorName} - Commission: ₹${vendorCommissionAmount}`,
      tns_type: 'CR',
      debit: 0,
      credit: vendorCommissionAmount,
      balance: 0,
      chk: false,
      ti: transactionId,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Entry 8: Vendor receives incentive from AQC (CR to vendor)
    const vendorIncentiveReceiveEntry = {
      user_id: userId,
      party_name: 'AQC Company',
      date: transactionDate,
      remarks: `Commission Transaction ${transactionId}: Paid incentive to ${vendorName} - Amount: ₹${vendorCommissionAmount}`,
      tns_type: 'DR',
      debit: vendorCommissionAmount,
      credit: 0,
      balance: 0,
      chk: false,
      ti: transactionId,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create all entries in sequence
    const createdEntries = [];
    
    // Phase 1: Forward Flow
    createdEntries.push(await LedgerEntry.create(clientEntry));
    createdEntries.push(await LedgerEntry.create(aqcReceiveEntry));
    createdEntries.push(await LedgerEntry.create(vendorEntry));
    createdEntries.push(await LedgerEntry.create(vendorReceiveEntry));
    
    // Phase 2: Backward Flow
    createdEntries.push(await LedgerEntry.create(vendorPaybackEntry));
    createdEntries.push(await LedgerEntry.create(aqcReceiveVendorEntry));
    createdEntries.push(await LedgerEntry.create(vendorIncentiveEntry));
    createdEntries.push(await LedgerEntry.create(vendorIncentiveReceiveEntry));

    // Calculate final balances for AQC Company
    const aqcNetBalance = originalAmount - netAmountToVendor + originalAmount - vendorCommissionAmount;
    const aqcNetProfit = clientCommissionAmount - vendorCommissionAmount;

    res.status(201).json({
      success: true,
      message: 'AQC Commission Transaction created successfully',
      data: {
        transactionId,
        clientName,
        vendorName,
        originalAmount,
        clientCommissionRate: `${clientCommissionRate}%`,
        vendorCommissionRate: `${vendorCommissionRate}%`,
        clientCommissionAmount,
        vendorCommissionAmount,
        netAmountToVendor,
        netProfit: aqcNetProfit,
        aqcNetBalance,
        transactionDate,
        remarks,
        entries: createdEntries,
        summary: {
          phase1: 'Client → AQC → Vendor (Forward Flow)',
          phase2: 'Vendor → AQC (Backward Flow)',
          totalEntries: createdEntries.length,
          aqcProfit: aqcNetProfit
        }
      }
    });
  } catch (error) {
    console.error('Error creating commission transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create commission transaction',
      error: error.message
    });
  }
};

/**
 * Get all commission transactions
 */
const getAllCommissionTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Get all ledger entries for user
    const entries = await LedgerEntry.findByUserId(userId);
    
    // Filter commission transactions
    const commissionEntries = entries.filter(entry => 
      entry.remarks && entry.remarks.includes('Commission Transaction')
    );

    // Group by transaction ID
    const transactions = {};
    commissionEntries.forEach(entry => {
      const match = entry.remarks.match(/Commission Transaction (CT\d+)/);
      if (match) {
        const transactionId = match[1];
        if (!transactions[transactionId]) {
          transactions[transactionId] = {
            id: transactionId,
            entries: [],
            totalAmount: 0,
            createdAt: entry.created_at
          };
        }
        transactions[transactionId].entries.push(entry);
        transactions[transactionId].totalAmount += entry.credit || entry.debit || 0;
      }
    });

    // Convert to array and paginate
    const transactionArray = Object.values(transactions);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTransactions = transactionArray.slice(startIndex, endIndex);

    res.json({
      success: true,
      message: 'Commission transactions retrieved successfully',
      data: {
        transactions: paginatedTransactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(transactionArray.length / limit),
          totalTransactions: transactionArray.length,
          hasNext: endIndex < transactionArray.length,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting commission transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get commission transactions'
    });
  }
};

/**
 * Get commission transaction by ID
 */
const getCommissionTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;

    // Get all ledger entries for user
    const entries = await LedgerEntry.findByUserId(userId);
    
    // Filter by transaction ID
    const transactionEntries = entries.filter(entry => 
      entry.remarks && entry.remarks.includes(`Commission Transaction ${transactionId}`)
    );

    if (transactionEntries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commission transaction not found'
      });
    }

    // Calculate transaction summary
    let totalAmount = 0;
    let clientName = '';
    let vendorName = '';

    transactionEntries.forEach(entry => {
      totalAmount += entry.credit || entry.debit || 0;
      
      // Extract client and vendor names
      if (entry.remarks.includes('Received from')) {
        const match = entry.remarks.match(/Received from (.+)/);
        if (match) clientName = match[1];
      }
      if (entry.remarks.includes('Paid to')) {
        const match = entry.remarks.match(/Paid to (.+)/);
        if (match) vendorName = match[1];
      }
    });

    res.json({
      success: true,
      message: 'Commission transaction retrieved successfully',
      data: {
        transactionId,
        clientName,
        vendorName,
        totalAmount,
        entries: transactionEntries
      }
    });
  } catch (error) {
    console.error('Error getting commission transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get commission transaction'
    });
  }
};

/**
 * Get commission transaction summary with AQC Company balance
 */
const getCommissionTransactionSummary = async (req, res) => {
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

    // Filter commission transactions
    const commissionEntries = entries.filter(entry => 
      entry.remarks && entry.remarks.includes('Commission Transaction')
    );

    // Calculate AQC Company balance from commission transactions
    let aqcCompanyBalance = 0;
    let totalCommissionCollected = 0;
    let totalCommissionPaid = 0;
    let totalBusinessVolume = 0;
    let commissionTransactionCount = 0;

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

    // Group by month for trends
    const monthlyStats = {};
    commissionEntries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          transactions: 0,
          volume: 0,
          commissionCollected: 0,
          commissionPaid: 0,
          netProfit: 0
        };
      }
      
      // Extract amounts from remarks
      if (entry.remarks.includes('Amount: ₹')) {
        const amountMatch = entry.remarks.match(/Amount: ₹(\d+)/);
        if (amountMatch) {
          monthlyStats[monthKey].volume += parseInt(amountMatch[1]);
        }
      }
      
      if (entry.remarks.includes('Commission: ₹')) {
        const commissionMatch = entry.remarks.match(/Commission: ₹(\d+)/);
        if (commissionMatch) {
          const amount = parseInt(commissionMatch[1]);
          if (entry.remarks.includes('Received from') && entry.party_name === 'AQC Company') {
            monthlyStats[monthKey].commissionCollected += amount;
          } else if (entry.remarks.includes('Incentive payment to') && entry.party_name === 'AQC Company') {
            monthlyStats[monthKey].commissionPaid += amount;
          }
        }
      }
    });

    // Calculate monthly net profit
    Object.values(monthlyStats).forEach(month => {
      month.netProfit = month.commissionCollected - month.commissionPaid;
    });

    // Count transactions per month
    Object.values(transactionGroups).forEach(transactionEntries => {
      if (transactionEntries.length > 0) {
        const date = new Date(transactionEntries[0].date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyStats[monthKey]) {
          monthlyStats[monthKey].transactions++;
        }
      }
    });

    res.json({
      success: true,
      message: 'Commission transaction summary retrieved successfully',
      data: {
        summary: {
          totalTransactions: commissionTransactionCount,
          totalBusinessVolume,
          totalCommissionCollected,
          totalCommissionPaid,
          netCommissionProfit,
          aqcCompanyBalance,
          dateRange: startDate && endDate ? { startDate, endDate } : 'All dates'
        },
        monthlyStats: Object.values(monthlyStats),
        aqcCompanyBalance: {
          netBalance: aqcCompanyBalance,
          commissionCollected: totalCommissionCollected,
          commissionPaid: totalCommissionPaid,
          netCommissionProfit,
          businessActivity: totalBusinessVolume,
          commissionTransactionCount
        }
      }
    });
  } catch (error) {
    console.error('Error getting commission transaction summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get commission transaction summary',
      error: error.message
    });
  }
};

/**
 * Cancel commission transaction
 */
const cancelCommissionTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;

    // Get all ledger entries for user
    const entries = await LedgerEntry.findByUserId(userId);
    
    // Find entries for this transaction
    const transactionEntries = entries.filter(entry => 
      entry.remarks && entry.remarks.includes(`Commission Transaction ${transactionId}`)
    );

    if (transactionEntries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commission transaction not found'
      });
    }

    // Create reversal entries
    const reversalEntries = [];
    
    for (const entry of transactionEntries) {
      const reversalEntry = {
        user_id: userId,
        party_name: entry.party_name,
        date: new Date().toISOString().split('T')[0],
        remarks: `CANCELLED: ${entry.remarks}`,
        tns_type: entry.tns_type === 'CR' ? 'DR' : 'CR',
        debit: entry.tns_type === 'CR' ? entry.credit : 0,
        credit: entry.tns_type === 'DR' ? entry.debit : 0,
        balance: 0,
        chk: false,
        ti: '',
        is_old_record: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      reversalEntries.push(await LedgerEntry.create(reversalEntry));
    }

    res.json({
      success: true,
      message: 'Commission transaction cancelled successfully',
      data: {
        transactionId,
        cancelledEntries: reversalEntries
      }
    });
  } catch (error) {
    console.error('Error cancelling commission transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel commission transaction'
    });
  }
};

module.exports = {
  createCommissionTransaction,
  getAllCommissionTransactions,
  getCommissionTransaction,
  getCommissionTransactionSummary,
  cancelCommissionTransaction
}; 