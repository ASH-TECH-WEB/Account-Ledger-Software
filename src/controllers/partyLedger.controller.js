/**
 * Party Ledger Controller - Supabase Version
 * 
 * Handles party ledger operations using Supabase with enhanced error handling,
 * input validation, and professional logging.
 * 
 * @author Account Ledger Team
 * @version 3.0.0
 * @since 2024-01-01
 */

// Import required models and utilities
const LedgerEntry = require('../models/supabase/LedgerEntry');
const Party = require('../models/supabase/Party');

// Constants for business logic
const BUSINESS_CONSTANTS = {
  DEFAULT_STATUS: 'A',
  DEFAULT_MONDAY_FINAL: 'No',
  DEFAULT_COMMI_SYSTEM: 'Take',
  DEFAULT_BALANCE_LIMIT: '0',
  DEFAULT_COMMISSION: 'No Commission',
  DEFAULT_RATE: '0',
  MAX_PARTY_NAME_LENGTH: 100,
  MAX_ADDRESS_LENGTH: 500,
  MAX_PHONE_LENGTH: 20,
  MAX_EMAIL_LENGTH: 100
};

// Input validation utilities
const validatePartyName = (partyName) => {
  if (!partyName || typeof partyName !== 'string') {
    throw new Error('Party name is required and must be a string');
  }
  if (partyName.trim().length === 0) {
    throw new Error('Party name cannot be empty');
  }
  if (partyName.length > BUSINESS_CONSTANTS.MAX_PARTY_NAME_LENGTH) {
    throw new Error(`Party name cannot exceed ${BUSINESS_CONSTANTS.MAX_PARTY_NAME_LENGTH} characters`);
  }
  return partyName.trim();
};

const validateUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid user ID is required');
  }
  return userId;
};

const sanitizeInput = (input, maxLength = 1000) => {
  if (typeof input !== 'string') return input;
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .substring(0, maxLength);
};

// Error response utility
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

// Success response utility
const sendSuccessResponse = (res, data, message = 'Operation completed successfully') => {
  res.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Get all parties for user with enhanced error handling
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllParties = async (req, res) => {
  try {
    const userId = validateUserId(req.user.id);
    
    // Get parties with error handling
    const parties = await Party.findByUserId(userId);
    
    if (!parties) {
      return sendSuccessResponse(res, [], 'No parties found for user');
    }
    
    // Transform data for frontend compatibility with simplified business fields
    const transformedParties = parties.map(party => ({
      id: party.id,
      srNo: party.sr_no,
      partyName: party.party_name,
      status: party.status || BUSINESS_CONSTANTS.DEFAULT_STATUS,
      mondayFinal: party.monday_final || BUSINESS_CONSTANTS.DEFAULT_MONDAY_FINAL,
      commiSystem: party.commi_system || BUSINESS_CONSTANTS.DEFAULT_COMMI_SYSTEM,
      balanceLimit: party.balance_limit || BUSINESS_CONSTANTS.DEFAULT_BALANCE_LIMIT,
      mCommission: party.m_commission || BUSINESS_CONSTANTS.DEFAULT_COMMISSION,
      rate: party.rate || BUSINESS_CONSTANTS.DEFAULT_RATE,
      createdAt: party.created_at,
      updatedAt: party.updated_at
    }));

    sendSuccessResponse(res, transformedParties, 'Parties retrieved successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve parties', error);
  }
};

/**
 * Get party ledger entries with enhanced validation and error handling
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPartyLedger = async (req, res) => {
  try {
    const partyName = validatePartyName(req.params.partyName);
    const userId = validateUserId(req.user.id);
    
    // Validate party exists
    const party = await Party.findByPartyName(userId, partyName);
    if (!party) {
      return sendErrorResponse(res, 404, `Party '${partyName}' not found`);
    }
    
    // Get all ledger entries for this party
    const allEntries = await LedgerEntry.findByPartyName(userId, partyName);
    
    if (!allEntries || allEntries.length === 0) {
      return sendSuccessResponse(res, {
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
      }, `No ledger entries found for party '${partyName}'`);
    }

    // Separate current entries from old records
    const currentEntries = allEntries.filter(entry => !entry.is_old_record);
    const oldRecords = allEntries.filter(entry => entry.is_old_record);

    // Sort current entries by date and creation time
    const sortedCurrentEntries = currentEntries.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }
      
      const timeA = a.created_at ? new Date('1970-01-01T' + a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date('1970-01-01T' + b.created_at).getTime() : 0;
      
      return timeA - timeB;
    });

    // Sort old records by date and creation time
    const sortedOldRecords = oldRecords.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }
      
      const timeA = a.created_at ? new Date('1970-01-01T' + a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date('1970-01-01T' + b.created_at).getTime() : 0;
      
      return timeA - timeB;
    });

    // Calculate closing balance from last transaction
    let closingBalance = 0;
    if (sortedCurrentEntries.length > 0) {
      const lastEntry = sortedCurrentEntries[sortedCurrentEntries.length - 1];
      closingBalance = parseFloat(lastEntry.balance || 0);
    } else if (sortedOldRecords.length > 0) {
      const lastOldEntry = sortedOldRecords[sortedOldRecords.length - 1];
      closingBalance = parseFloat(lastOldEntry.balance || 0);
    }

    // Calculate summary totals (excluding Monday Final Settlement entries)
    let totalCredit = 0;
    let totalDebit = 0;
    let totalEntries = 0;

    // Process current entries for totals
    sortedCurrentEntries.forEach((entry, index) => {
      if (entry.remarks?.includes('Monday Final Settlement')) {
        return; // Skip settlement entries for totals
      }
      
      const entryCredit = parseFloat(entry.credit || 0);
      const entryDebit = parseFloat(entry.debit || 0);
      const entryBalance = parseFloat(entry.balance || 0);
      
      totalCredit += entryCredit;
      totalDebit += entryDebit;
      totalEntries++;
    });

    // Process old records for totals
    sortedOldRecords.forEach((entry, index) => {
      if (entry.remarks?.includes('Monday Final Settlement')) {
        return; // Skip settlement entries for totals
      }
      
      const entryCredit = parseFloat(entry.credit || 0);
      const entryDebit = parseFloat(entry.debit || 0);
      const entryBalance = parseFloat(entry.balance || 0);
      
      totalCredit += entryCredit;
      totalDebit += entryDebit;
      totalEntries++;
    });

    // Calculate final balance
    const calculatedBalance = totalCredit - totalDebit;

    // Get Monday Final data
    const mondayFinalEntries = allEntries.filter(entry => 
      entry.remarks?.includes('Monday Final Settlement')
    );

    const mondayFinalData = {
      transactionCount: mondayFinalEntries.length,
      totalCredit: mondayFinalEntries.reduce((sum, entry) => sum + parseFloat(entry.credit || 0), 0),
      totalDebit: mondayFinalEntries.reduce((sum, entry) => sum + parseFloat(entry.debit || 0), 0),
      startingBalance: mondayFinalEntries.length > 0 ? parseFloat(mondayFinalEntries[0].balance || 0) : 0,
      finalBalance: mondayFinalEntries.length > 0 ? parseFloat(mondayFinalEntries[mondayFinalEntries.length - 1].balance || 0) : 0
    };

    sendSuccessResponse(res, {
      ledgerEntries: sortedCurrentEntries,
      oldRecords: sortedOldRecords,
      closingBalance,
      summary: {
        totalCredit,
        totalDebit,
        calculatedBalance,
        totalEntries
      },
      mondayFinalData
    });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to get party ledger', error);
  }
};

/**
 * Calculate running balance for a party
 */
const calculateRunningBalance = async (userId, partyName, currentAmount, tnsType) => {
  try {
    // Get all previous entries for this party (excluding current entry)
    const previousEntries = await LedgerEntry.findByPartyAndUser(userId, partyName);
    
    // Sort entries by date and creation time for proper chronological order
    const sortedEntries = previousEntries.sort((a, b) => {
      // First sort by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB; // Oldest date first
      }
      
      // If same date, sort by creation time (original order)
      const timeA = a.created_at ? new Date('1970-01-01T' + a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date('1970-01-01T' + b.created_at).getTime() : 0;
      
      return timeA - timeB; // Earlier creation time first (original order)
    });
    
    let runningBalance = 0;
    
    // Recalculate balance for ALL entries in chronological order
    for (const entry of sortedEntries) {
      // Skip Monday Final settlement entries - they don't affect balance
      if (entry.remarks?.includes('Monday Final Settlement')) {
        continue;
      }
      
      const entryCredit = parseFloat(entry.credit || 0);
      const entryDebit = parseFloat(entry.debit || 0);
      
      if (entry.tns_type === 'CR') {
        runningBalance += entryCredit;
      } else if (entry.tns_type === 'DR') {
        runningBalance -= entryDebit;
      }
    }
    
    // Add current transaction to running balance
    if (tnsType === 'CR') {
      runningBalance += parseFloat(currentAmount || 0);
    } else if (tnsType === 'DR') {
      runningBalance -= parseFloat(currentAmount || 0);
    }
    
    return runningBalance;
  } catch (error) {
    // Return 0 as fallback to prevent transaction failure
    return 0;
  }
};

/**
 * Add ledger entry with automatic balance calculation
 */
const addEntry = async (req, res) => {
  try {
    const userId = validateUserId(req.user.id);
    const { partyName, date, remarks, tnsType, debit, credit, balance } = req.body;

    // Validate required fields
    if (!partyName || !date || !tnsType) {
      return sendErrorResponse(res, 400, 'Party name, date, and transaction type are required');
    }

    // Check if party exists
    const parties = await Party.findByUserId(userId);
    
    const party = parties.find(p => p.party_name === partyName);
    
    if (!party) {
      return sendErrorResponse(res, 404, `Party "${partyName}" not found. Available parties: ${parties.map(p => p.party_name).join(', ')}`);
    }

    // Validate transaction amounts
    const debitAmount = parseFloat(debit || 0);
    const creditAmount = parseFloat(credit || 0);
    
    if (tnsType === 'CR' && creditAmount <= 0) {
      return sendErrorResponse(res, 400, 'Credit amount must be greater than 0 for CR transactions');
    }
    
    if (tnsType === 'DR' && debitAmount <= 0) {
      return sendErrorResponse(res, 400, 'Debit amount must be greater than 0 for DR transactions');
    }

    // Calculate current transaction amount
    const currentAmount = tnsType === 'CR' ? creditAmount : debitAmount;
    
    // Calculate running balance automatically
    const calculatedBalance = await calculateRunningBalance(userId, partyName, currentAmount, tnsType);
    
    // Create ledger entry with calculated balance
    const entryData = {
      user_id: userId,
      party_name: partyName,
      date: new Date(date).toISOString().split('T')[0],
      remarks: remarks || `Transaction: ${tnsType} ${currentAmount}`,
      tns_type: tnsType,
      debit: debitAmount,
      credit: creditAmount,
      balance: calculatedBalance,
      chk: false,
      ti: `TXN_${Date.now()}`,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const entry = await LedgerEntry.create(entryData);
    
    // Update all subsequent entries' balances for this party
    await updateSubsequentBalances(userId, partyName, entry.id);
    
    sendSuccessResponse(res, {
      ...entry,
      calculatedBalance,
      partyName,
      transactionType: tnsType,
      amount: currentAmount
    }, `Ledger entry added successfully for ${partyName}`);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to add ledger entry', error);
  }
};

/**
 * Update balances for all subsequent entries after a new entry
 */
const updateSubsequentBalances = async (userId, partyName, currentEntryId) => {
  try {
    
    // Get ALL entries for this party to recalculate from beginning
    const allEntries = await LedgerEntry.findByPartyName(userId, partyName);
    
    // Sort entries by date and creation time for proper chronological order
    const sortedEntries = allEntries.sort((a, b) => {
      // First sort by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB; // Oldest date first
      }
      
      // If same date, sort by creation time (original order)
      const timeA = a.created_at ? new Date('1970-01-01T' + a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date('1970-01-01T' + b.created_at).getTime() : 0;
      
      return timeA - timeB; // Earlier creation time first (original order)
    });
    
    let runningBalance = 0;
    
    // Recalculate balance for ALL entries in chronological order
    for (const entry of sortedEntries) {
      // Skip Monday Final settlement entries - they don't affect balance
      if (entry.remarks?.includes('Monday Final Settlement')) {
        continue;
      }
      
      const entryCredit = parseFloat(entry.credit || 0);
      const entryDebit = parseFloat(entry.debit || 0);
      
      if (entry.tns_type === 'CR') {
        runningBalance += entryCredit;
      } else if (entry.tns_type === 'DR') {
        runningBalance -= entryDebit;
      }
      
      // Update entry with new balance
      await LedgerEntry.update(entry.id, {
        balance: runningBalance,
        updated_at: new Date().toISOString()
      });
    }
    
  } catch (error) {
    }
};

/**
 * Update ledger entry with balance recalculation
 */
const updateEntry = async (req, res) => {
  try {
    const userId = validateUserId(req.user.id);
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if entry exists and belongs to user
    const entry = await LedgerEntry.findById(id);
    if (!entry || entry.user_id !== userId) {
      return sendErrorResponse(res, 404, 'Entry not found');
    }

    // OLD RECORDS PROTECTION: Prevent modification of old records after Monday Final
    if (entry.is_old_record === true) {
      return sendErrorResponse(res, 403, 'Cannot modify old records. This entry was settled in Monday Final and cannot be changed. Delete the Monday Final entry first to unsettle transactions.', { code: 'OLD_RECORD_PROTECTED' });
    }

    // Transform data for Supabase
    const supabaseData = {
      party_name: updateData.partyName || entry.party_name, // Use existing party_name if not provided
      date: updateData.date ? new Date(updateData.date).toISOString().split('T')[0] : entry.date,
      remarks: updateData.remarks || entry.remarks,
      tns_type: updateData.tnsType || entry.tns_type,
      debit: updateData.debit !== undefined ? updateData.debit : entry.debit,
      credit: updateData.credit !== undefined ? updateData.credit : entry.credit,
      balance: entry.balance, // Keep existing balance, will be recalculated
      chk: updateData.chk !== undefined ? updateData.chk : entry.chk,
      ti: updateData.ti || entry.ti,
      updated_at: new Date().toISOString()
    };

    const updatedEntry = await LedgerEntry.update(id, supabaseData);
    
    // Recalculate balances for all entries of this party after update
    await recalculateAllBalancesForParty(userId, entry.party_name);
    
    sendSuccessResponse(res, updatedEntry, 'Entry updated successfully with balance recalculation');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to update entry', error);
  }
};

/**
 * Recalculate all balances for a party (used after updates/deletes)
 */
const recalculateAllBalancesForParty = async (userId, partyName) => {
  try {
    // Get all entries for this party in chronological order
    const allEntries = await LedgerEntry.findByPartyName(userId, partyName);
    
    // Sort entries by date and creation time for proper chronological order
    const sortedEntries = allEntries.sort((a, b) => {
      // First sort by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB; // Oldest date first
      }
      
      // If same date, sort by creation time (original order)
      const timeA = a.created_at ? new Date('1970-01-01T' + a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date('1970-01-01T' + b.created_at).getTime() : 0;
      
      return timeA - timeB; // Earlier creation time first (original order)
    });
    
    let runningBalance = 0;
    
    // Recalculate balance for all entries in chronological order
    for (const entry of sortedEntries) {
      // Skip Monday Final settlement entries - they don't affect balance
      if (entry.remarks?.includes('Monday Final Settlement')) {
        continue;
      }
      
      if (entry.tns_type === 'CR') {
        runningBalance += parseFloat(entry.credit || 0);
      } else if (entry.tns_type === 'DR') {
        runningBalance -= parseFloat(entry.debit || 0);
      }
      
      // Update entry with new calculated balance
      await LedgerEntry.update(entry.id, {
        balance: runningBalance,
        updated_at: new Date().toISOString()
      });
    }
    
  } catch (error) {
    }
};

/**
 * Recalculate all balances for a party (utility function)
 */
const recalculatePartyBalances = async (userId, partyName) => {
  try {
    
    // Get all entries for this party
    const allEntries = await LedgerEntry.findByPartyName(userId, partyName);
    
    // Sort entries by date and creation time
    const sortedEntries = allEntries.sort((a, b) => {
      // First sort by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB; // Oldest date first
      }
      
      // If same date, sort by creation time (original order)
      const timeA = a.created_at ? new Date('1970-01-01T' + a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date('1970-01-01T' + b.created_at).getTime() : 0;
      
      return timeA - timeB; // Earlier creation time first (original order)
    });
    
    let runningBalance = 0;
    
    // Recalculate balance for all entries in chronological order
    for (const entry of sortedEntries) {
      // Skip Monday Final settlement entries - they don't affect balance
      if (entry.remarks?.includes('Monday Final Settlement')) {
        continue;
      }
      
      const entryCredit = parseFloat(entry.credit || 0);
      const entryDebit = parseFloat(entry.debit || 0);
      
      if (entry.tns_type === 'CR') {
        runningBalance += entryCredit;
      } else if (entry.tns_type === 'DR') {
        runningBalance -= entryDebit;
      }
      
      // Update entry with new balance
      await LedgerEntry.update(entry.id, {
        balance: runningBalance,
        updated_at: new Date().toISOString()
      });
    }
    
    return runningBalance;
    
  } catch (error) {
    throw error;
  }
};

/**
 * Utility function to recalculate all balances for all parties (admin function)
 */
const recalculateAllBalances = async (req, res) => {
  try {
    const userId = validateUserId(req.user.id);
    
    // Get all parties for the user
    const parties = await Party.findByUserId(userId);
    
    let totalEntriesUpdated = 0;
    
    // Recalculate balances for each party
    for (const party of parties) {
      const allEntries = await LedgerEntry.findByPartyAndUser(userId, party.party_name);
      
      // Sort entries by date and creation time for proper chronological order
      const sortedEntries = allEntries.sort((a, b) => {
        // First sort by date
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB; // Oldest date first
        }
        
        // If same date, sort by creation time (original order)
        const timeA = a.created_at ? new Date('1970-01-01T' + a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date('1970-01-01T' + b.created_at).getTime() : 0;
        
        return timeA - timeB; // Earlier creation time first (original order)
      });
      
      let runningBalance = 0;
      
      // Recalculate balance for all entries in chronological order
      for (const entry of sortedEntries) {
        // Skip Monday Final settlement entries - they don't affect balance
        if (entry.remarks?.includes('Monday Final Settlement')) {
          continue;
        }
        
        if (entry.tns_type === 'CR') {
          runningBalance += parseFloat(entry.credit || 0);
        } else if (entry.tns_type === 'DR') {
          runningBalance -= parseFloat(entry.debit || 0);
        }
        
        // Update entry with new calculated balance
        await LedgerEntry.update(entry.id, {
          balance: runningBalance,
          updated_at: new Date().toISOString()
        });
        
        totalEntriesUpdated++;
      }
      
    }

    sendSuccessResponse(res, {
      success: true,
      message: `All balances recalculated successfully for ${parties.length} parties`,
      data: {
        partiesProcessed: parties.length,
        totalEntriesUpdated,
        message: 'All existing balances have been recalculated and updated'
      }
    });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to recalculate all balances', error);
  }
};

/**
 * Delete ledger entry with balance recalculation
 */
const deleteEntry = async (req, res) => {
  try {
    const userId = validateUserId(req.user.id);
    const { id } = req.params;

    // Check if entry exists and belongs to user
    const entry = await LedgerEntry.findById(id);
    if (!entry || entry.user_id !== userId) {
      return sendErrorResponse(res, 404, 'Entry not found');
    }

    // OLD RECORDS PROTECTION: Prevent deletion of old records after Monday Final
    if (entry.is_old_record === true) {
      return sendErrorResponse(res, 403, 'Cannot delete old records. This entry was settled in Monday Final and cannot be deleted. Delete the Monday Final entry first to unsettle transactions.', { code: 'OLD_RECORD_PROTECTED' });
    }

    // Store party name before deletion for balance recalculation
    const partyName = entry.party_name;

    await LedgerEntry.delete(id);
    
    // Recalculate balances for all remaining entries of this party
    await recalculateAllBalancesForParty(userId, partyName);

    sendSuccessResponse(res, { deleted: true }, 'Entry deleted successfully with balance recalculation');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete entry', error);
  }
};

/**
 * Delete parties and their ledger entries
 */
const deleteParties = async (req, res) => {
  try {
    const userId = validateUserId(req.user.id);
    const { partyNames } = req.body;

    if (!partyNames || !Array.isArray(partyNames)) {
      return sendErrorResponse(res, 400, 'Party names array is required');
    }

    // Get all user parties
    const allParties = await Party.findByUserId(userId);
    const validPartyNames = partyNames.filter(name => 
      allParties.some(p => p.party_name === name)
    );

    if (validPartyNames.length === 0) {
      return sendErrorResponse(res, 400, 'No valid parties found for deletion');
    }

    // Check for parties with old records (Monday Final settled transactions)
    const partiesWithOldRecords = [];
    for (const partyName of validPartyNames) {
      const entries = await LedgerEntry.findByPartyName(userId, partyName);
      const hasOldRecords = entries.some(entry => entry.is_old_record === true);
      if (hasOldRecords) {
        partiesWithOldRecords.push(partyName);
      }
    }

    if (partiesWithOldRecords.length > 0) {
      return sendErrorResponse(res, 403, `Cannot delete parties with old records. The following parties have Monday Final settled transactions: ${partiesWithOldRecords.join(', ')}. Delete the Monday Final entries first to unsettle transactions.`, { partiesWithOldRecords });
    }

    // Delete ledger entries for each party
    for (const partyName of validPartyNames) {
      const entries = await LedgerEntry.findByPartyName(userId, partyName);
      for (const entry of entries) {
        await LedgerEntry.delete(entry.id);
      }
    }

    // Delete parties
    for (const partyName of validPartyNames) {
      const party = allParties.find(p => p.party_name === partyName);
      if (party) {
        await Party.delete(party.id);
      }
    }

    sendSuccessResponse(res, { deletedCount: validPartyNames.length }, `${validPartyNames.length} parties and their entries deleted successfully`);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete parties', error);
  }
};

/**
 * Unsettle transactions for Monday Final
 */
const unsettleTransactions = async (req, res) => {
  try {
    const userId = validateUserId(req.user.id);
    const { partyName, settlementDate } = req.body;

    if (!partyName || !settlementDate) {
      return sendErrorResponse(res, 400, 'Party name and settlement date are required');
    }

    // Find and unsettle transactions for the given party and date
    const unsettledEntries = await LedgerEntry.findByPartyName(userId, partyName);
    
    // Mark entries as not settled (remove settlement flags)
    for (const entry of unsettledEntries) {
      if (entry.settlement_date === settlementDate) {
        await LedgerEntry.update(entry.id, {
          settlement_date: null,
          settlement_monday_final_id: null,
          updated_at: new Date().toISOString()
        });
      }
    }

    sendSuccessResponse(res, { unsettledCount: unsettledEntries.length }, 'Transactions unsettled successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to unsettle transactions', error);
  }
};

/**
 * Update Monday Final status for parties and settle transactions
 */
const updateMondayFinal = async (req, res) => {
  try {
    const userId = validateUserId(req.user.id);
    const { partyNames } = req.body;

    if (!partyNames || !Array.isArray(partyNames)) {
      return sendErrorResponse(res, 400, 'Party names array is required');
    }

    let totalSettledEntries = 0;

    // Update Monday Final status and settle transactions for each party
    for (const partyName of partyNames) {
      const party = await Party.findByUserId(userId).then(parties => 
        parties.find(p => p.party_name === partyName)
      );
      
      if (party) {
        // 1. Update party Monday Final status
        await Party.update(party.id, {
          monday_final: 'Yes',
          updated_at: new Date().toISOString()
        });

        // 2. Find all current ledger entries for this party
        const currentEntries = await LedgerEntry.findByPartyName(userId, partyName);
        
        // 3. Check if party needs settlement (has any transactions)
        if (currentEntries.length > 0) {
          // 4. Enhanced settlement - handle multiple Monday Final scenarios
          const unsettledEntries = currentEntries.filter(entry => !entry.is_old_record);
          
          // 4a. Check for existing Monday Final entries that need to be settled first
          const existingMondayFinals = unsettledEntries.filter(entry => 
            entry.remarks?.includes('Monday Final Settlement')
          );
          
          // 4b. Regular transactions (excluding Monday Final entries)
          const regularTransactions = unsettledEntries.filter(entry => 
            !entry.remarks?.includes('Monday Final Settlement')
          );
          
          if (unsettledEntries.length > 0) {
            // Batch update all unsettled entries
            const updatePromises = unsettledEntries.map(entry => 
              LedgerEntry.update(entry.id, {
                is_old_record: true,
                settlement_date: new Date().toISOString(),
                settlement_monday_final_id: null,
                updated_at: new Date().toISOString()
              })
            );
            
            // Execute all updates in parallel for speed
            await Promise.all(updatePromises);
            
            // Get updated entries after marking as old records
            const updatedEntries = await LedgerEntry.findByPartyName(userId, partyName);
            
            // Calculate settlement amounts from updated entries
            const totalSettlementCredit = updatedEntries
              .filter(entry => entry.tns_type === 'CR' && entry.is_old_record)
              .reduce((sum, entry) => sum + parseFloat(entry.credit || 0), 0);
              
            const totalSettlementDebit = updatedEntries
              .filter(entry => entry.tns_type === 'DR' && entry.is_old_record)
              .reduce((sum, entry) => sum + parseFloat(entry.debit || 0), 0);
            
            // 5. Enhanced settlement transaction creation
            const netSettlementAmount = totalSettlementCredit - totalSettlementDebit;
            const settlementType = netSettlementAmount >= 0 ? 'CR' : 'DR';
            const settlementAmount = Math.abs(netSettlementAmount);
            
            // Generate unique Monday Final ID for this settlement
            const mondayFinalId = `monday_final_${Date.now()}`;
            
            // Enhanced remarks to show what was settled
            let settlementRemarks = `Monday Final Settlement - ${unsettledEntries.length} transactions settled`;
            if (existingMondayFinals.length > 0) {
              settlementRemarks += ` (including ${existingMondayFinals.length} previous Monday Final entries)`;
            }
            
            // Settlement entry should NOT change the balance - it's just a record
            // The balance should remain the same as before settlement
            const settlementEntry = {
              user_id: userId,
              party_name: partyName,
              date: new Date().toISOString().split('T')[0],
              remarks: settlementRemarks,
              tns_type: settlementType,
              debit: settlementType === 'DR' ? settlementAmount : 0,
              credit: settlementType === 'CR' ? settlementAmount : 0,
              balance: 0, // No balance change - just a settlement record
              chk: false,
              ti: mondayFinalId,
              is_old_record: false,
              settlement_date: null,
              settlement_monday_final_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            // Create settlement entry
            const createdSettlementEntry = await LedgerEntry.create(settlementEntry);
            
            // 6. Update all settled transactions with this Monday Final ID
            
            const linkPromises = unsettledEntries.map(entry => 
              LedgerEntry.update(entry.id, {
                settlement_monday_final_id: createdSettlementEntry.id, // Use actual entry ID (UUID)
                updated_at: new Date().toISOString()
              })
            );
            
            await Promise.all(linkPromises);
            
            // Update total count
            totalSettledEntries += unsettledEntries.length;
          }
        }

      }
    }

    sendSuccessResponse(res, {
      updatedCount: partyNames.length,
      settledEntries: totalSettledEntries,
      updatedParties: partyNames,
      settlementDetails: partyNames.map(partyName => ({
        partyName,
        status: 'Settled',
        settlementDate: new Date().toISOString().split('T')[0]
      }))
    }, `Monday Final status updated successfully. ${totalSettledEntries} transactions settled.`);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to update Monday Final status', error);
  }
};

/**
 * Delete Monday Final entry and unsettle only its settled transactions
 */
const deleteMondayFinalEntry = async (req, res) => {
  try {
    const userId = validateUserId(req.user.id);
    const { entryId } = req.params;

    // 1. Find the Monday Final entry
    const mondayFinalEntry = await LedgerEntry.findById(entryId);
    
    if (!mondayFinalEntry || mondayFinalEntry.user_id !== userId) {
      return sendErrorResponse(res, 404, 'Monday Final entry not found');
    }

    // 2. Check if it's actually a Monday Final entry
    if (!mondayFinalEntry.remarks?.includes('Monday Final Settlement')) {
      return sendErrorResponse(res, 400, 'This is not a Monday Final entry');
    }

    const partyName = mondayFinalEntry.party_name;
    const settlementDate = mondayFinalEntry.date;
    const mondayFinalId = mondayFinalEntry.ti; // Transaction ID

    // 3. Find transactions that were settled by this Monday Final
    // We need to find entries that were settled on the same date as this Monday Final
    // but BEFORE this Monday Final was created
    const allEntries = await LedgerEntry.findByPartyName(userId, partyName);
    
    // Get the creation time of this Monday Final entry
    const mondayFinalCreatedAt = new Date(mondayFinalEntry.created_at).getTime();
    
    // Find entries that were settled by THIS specific Monday Final
    // Using the new settlement_monday_final_id field for precise tracking
    const entriesToUnsettle = allEntries.filter(entry => {
      // Only unsettle entries that are marked as old records
      if (!entry.is_old_record) return false;
      
      // Only unsettle entries that were settled by THIS Monday Final
      if (entry.settlement_monday_final_id !== mondayFinalEntry.id) return false;
      
      // IMPORTANT: Don't unsettle other Monday Final entries
      // Only unsettle regular transactions, not settlement entries
      if (entry.remarks?.includes('Monday Final Settlement')) {
        return false;
      }
      
      return true;
    });

    // 4. Unsettle the transactions (mark them as current again)
    if (entriesToUnsettle.length > 0) {
      const unsettlePromises = entriesToUnsettle.map(entry => 
        LedgerEntry.update(entry.id, {
          is_old_record: false,
          settlement_date: null,
          settlement_monday_final_id: null, // Clear the settlement tracking
          updated_at: new Date().toISOString()
        })
      );
      
      await Promise.all(unsettlePromises);
      
      // Additional safeguard: Check for any orphaned transactions
      const allPartyEntries = await LedgerEntry.findByPartyName(userId, partyName);
      const orphanedEntries = allPartyEntries.filter(entry => 
        entry.settlement_monday_final_id === mondayFinalEntry.id && 
        entry.is_old_record === true
      );
      
      if (orphanedEntries.length > 0) {
        const fixOrphanedPromises = orphanedEntries.map(entry => 
          LedgerEntry.update(entry.id, {
            is_old_record: false,
            settlement_date: null,
            settlement_monday_final_id: null,
            updated_at: new Date().toISOString()
          })
        );
        await Promise.all(fixOrphanedPromises);
      }
    }

    // 5. Delete the Monday Final entry
    await LedgerEntry.delete(entryId);

    // 6. Recalculate balances for the party
    await recalculateAllBalancesForParty(userId, partyName);

    sendSuccessResponse(res, {
      deletedEntryId: entryId,
      unsettledTransactions: entriesToUnsettle.length,
      partyName,
      settlementDate
    }, 'Monday Final entry deleted and transactions unsettled successfully');

  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete Monday Final entry', error);
  }
};

module.exports = {
  getAllParties,
  getPartyLedger,
  addEntry,
  updateEntry,
  deleteEntry,
  deleteParties,
  recalculateAllBalances,
  unsettleTransactions,
  updateMondayFinal,
  recalculatePartyBalances,
  deleteMondayFinalEntry
}; 