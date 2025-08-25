/**
 * Party Ledger Controller - Supabase Version
 * 
 * Handles party ledger operations using Supabase
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

// Import required models
const LedgerEntry = require('../models/supabase/LedgerEntry');
const Party = require('../models/supabase/Party');

/**
 * Get all parties for user
 */
const getAllParties = async (req, res) => {
  try {
    const userId = req.user.id;
    const parties = await Party.findByUserId(userId);
    
    // Transform data for frontend compatibility with complete business fields
    const transformedParties = parties.map(party => ({
      id: party.id,
      name: party.party_name, // Frontend expects 'name'
      party_name: party.party_name, // Keep original for compatibility
      sr_no: party.sr_no,
      address: party.address,
      phone: party.phone,
      email: party.email,
      companyName: party.company_name || party.party_name,
      status: party.status || 'A',
      mondayFinal: party.monday_final || 'No', // Frontend expects 'mondayFinal'
      commiSystem: party.commi_system || 'Take',
      balanceLimit: party.balance_limit || '0',
      mCommission: party.m_commission || 'No Commission',
      rate: party.rate || '0',
      // Commission structure
      selfLD: party.self_ld || { M: '', S: '', A: '', T: '', C: '' },
      agentLD: party.agent_ld || { name: '', M: '', S: '', A: '', T: '', C: '' },
      thirdPartyLD: party.third_party_ld || { name: '', M: '', S: '', A: '', T: '', C: '' },
      selfCommission: party.self_commission || { M: '', S: '' },
      agentCommission: party.agent_commission || { M: '', S: '' },
      thirdPartyCommission: party.third_party_commission || { M: '', S: '' },
      created_at: party.created_at,
      updated_at: party.updated_at
    }));

    res.json({
      success: true,
      message: 'Parties retrieved successfully',
      data: transformedParties
    });
  } catch (error) {
    console.error('Error getting parties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parties'
    });
  }
};

/**
 * Get party ledger entries
 */
const getPartyLedger = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName } = req.params; // Changed from req.query to req.params
    
    if (!partyName) {
      return res.status(400).json({
        success: false,
        message: 'Party name is required'
      });
    }

    console.log(`🔍 Getting ledger for party: ${partyName} (User: ${userId})`);

    const allEntries = await LedgerEntry.findByPartyName(userId, partyName);
    
    console.log(`📊 Found ${allEntries?.length || 0} total ledger entries for party: ${partyName}`);
    console.log('🔍 Raw entries data:', JSON.stringify(allEntries, null, 2));
    
    // Separate current entries and old records
    const currentEntries = allEntries.filter(entry => !entry.is_old_record);
    const oldRecords = allEntries.filter(entry => entry.is_old_record);
    
    console.log(`📊 Current entries: ${currentEntries.length}, Old records: ${oldRecords.length}`);
    console.log('🔍 Current entries:', JSON.stringify(currentEntries, null, 2));
    console.log('🔍 Old records:', JSON.stringify(oldRecords, null, 2));
    
    // Sort entries to maintain original transaction order
    const sortEntriesByOriginalOrder = (entries) => {
      return entries.sort((a, b) => {
        // First sort by date
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB; // Oldest date first
        }
        
        // If same date, sort by creation time (original order)
        // Handle both timestamp and time string formats
        let timeA = 0;
        let timeB = 0;
        
        if (a.created_at) {
          // If created_at is a full timestamp (e.g., "2025-08-19T06:17:16.389+00:00")
          if (a.created_at.includes('T')) {
            timeA = new Date(a.created_at).getTime();
          } else {
            // If created_at is just time (e.g., "06:17:16")
            timeA = new Date('1970-01-01T' + a.created_at).getTime();
          }
        }
        
        if (b.created_at) {
          // If created_at is a full timestamp (e.g., "2025-08-19T06:17:16.389+00:00")
          if (b.created_at.includes('T')) {
            timeB = new Date(b.created_at).getTime();
          } else {
            // If created_at is just time (e.g., "06:17:16")
            timeB = new Date('1970-01-01T' + b.created_at).getTime();
          }
        }
        
        return timeA - timeB; // Earlier creation time first (original order)
      });
    };
    
    // Sort both arrays to maintain original transaction order
    const sortedCurrentEntries = sortEntriesByOriginalOrder(currentEntries);
    const sortedOldRecords = sortEntriesByOriginalOrder(oldRecords);
    
    console.log(`📊 Sorted current entries: ${sortedCurrentEntries.length}, Sorted old records: ${sortedOldRecords.length}`);
    
    // Log the order of old records for debugging
    console.log('🔍 Old records in original order:');
    sortedOldRecords.forEach((entry, index) => {
      const createdTime = entry.created_at;
      let timeDisplay = 'N/A';
      let sortValue = 0;
      
      if (createdTime) {
        if (createdTime.includes('T')) {
          // Full timestamp
          const timestamp = new Date(createdTime);
          timeDisplay = timestamp.toLocaleTimeString();
          sortValue = timestamp.getTime();
        } else {
          // Just time
          timeDisplay = createdTime;
          sortValue = new Date('1970-01-01T' + createdTime).getTime();
        }
      }
      
      console.log(`  ${index + 1}. Date: ${entry.date}, Time: ${timeDisplay}, Sort Value: ${sortValue}, Type: ${entry.tns_type}, Amount: ${entry.credit || entry.debit}, Remarks: ${entry.remarks}`);
    });
    
    // Calculate closing balance from current entries
    let closingBalance = 0;
    let totalCredit = 0;
    let totalDebit = 0;
    
    // Use the last transaction's balance as closing balance
    if (sortedCurrentEntries.length > 0) {
      const lastEntry = sortedCurrentEntries[sortedCurrentEntries.length - 1];
      closingBalance = parseFloat(lastEntry.balance || 0);
      console.log(`💰 Using last transaction balance as closing balance: ₹${closingBalance}`);
    }
    
    // Calculate totals for summary (excluding Monday Final settlements)
    sortedCurrentEntries.forEach((entry, index) => {
      // Skip Monday Final settlement entries for totals
      if (entry.remarks?.includes('Monday Final Settlement')) {
        console.log(`📝 Entry ${index + 1}: ${entry.tns_type} - SKIPPED for totals (Monday Final Settlement)`);
        return;
      }
      
      const entryCredit = parseFloat(entry.credit || 0);
      const entryDebit = parseFloat(entry.debit || 0);
      
      if (entry.tns_type === 'CR') {
        totalCredit += entryCredit;
      } else if (entry.tns_type === 'DR') {
        totalDebit += entryDebit;
      }
      
      console.log(`📝 Entry ${index + 1}: ${entry.tns_type} - Credit: ${entryCredit}, Debit: ${entryDebit}, Balance: ${entry.balance || 0}`);
    });
    
    console.log(`💰 Final calculations for ${partyName}:`, {
      totalCredit,
      totalDebit,
      closingBalance,
      currentEntriesCount: sortedCurrentEntries.length,
      oldRecordsCount: sortedOldRecords.length
    });
    
    // Transform data to match frontend expected structure
    const transformedData = {
      ledgerEntries: sortedCurrentEntries || [],
      oldRecords: sortedOldRecords || [],
      closingBalance: closingBalance,
      summary: {
        totalCredit: totalCredit,
        totalDebit: totalDebit,
        calculatedBalance: closingBalance,
        totalEntries: sortedCurrentEntries.length,
        totalOldRecords: sortedOldRecords.length
      },
      mondayFinalData: {
        transactionCount: sortedOldRecords.length,
        totalCredit: sortedOldRecords.reduce((sum, entry) => sum + parseFloat(entry.credit || 0), 0),
        totalDebit: sortedOldRecords.reduce((sum, entry) => sum + parseFloat(entry.debit || 0), 0),
        startingBalance: 0, // Can be calculated if needed
        finalBalance: closingBalance
      }
    };

    res.json({
      success: true,
      message: 'Ledger entries retrieved successfully',
      data: transformedData
    });
  } catch (error) {
    console.error('Error getting ledger entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ledger entries'
    });
  }
};

/**
 * Calculate running balance for a party
 */
const calculateRunningBalance = async (userId, partyName, currentAmount, tnsType) => {
  try {
    console.log(`🧮 Calculating running balance for ${partyName}:`, {
      userId,
      currentAmount,
      tnsType
    });

    // Get all previous entries for this party (excluding current entry)
    const previousEntries = await LedgerEntry.findByPartyAndUser(userId, partyName);
    
    console.log(`📊 Found ${previousEntries.length} previous entries for ${partyName}`);
    
    let runningBalance = 0;
    
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
    
    // Calculate running balance from previous entries in chronological order
    sortedEntries.forEach((entry, index) => {
      // Skip Monday Final settlement entries - they don't affect balance
      if (entry.remarks?.includes('Monday Final Settlement')) {
        console.log(`📝 Entry ${index + 1}: ${entry.tns_type} - SKIPPED (Monday Final Settlement) - Balance unchanged: ${runningBalance}`);
        return;
      }
      
      const entryCredit = parseFloat(entry.credit || 0);
      const entryDebit = parseFloat(entry.debit || 0);
      
      if (entry.tns_type === 'CR') {
        runningBalance += entryCredit;
      } else if (entry.tns_type === 'DR') {
        runningBalance -= entryDebit;
      }
      
      console.log(`📝 Entry ${index + 1}: ${entry.tns_type} - Credit: ${entryCredit}, Debit: ${entryDebit}, Running Balance: ${runningBalance}`);
    });
    
    // Add current transaction to running balance
    if (tnsType === 'CR') {
      runningBalance += parseFloat(currentAmount || 0);
    } else if (tnsType === 'DR') {
      runningBalance -= parseFloat(currentAmount || 0);
    }
    
    console.log(`💰 Final running balance for ${partyName}: ${runningBalance}`);
    
    return runningBalance;
  } catch (error) {
    console.error(`❌ Error calculating running balance for ${partyName}:`, error);
    // Return 0 as fallback to prevent transaction failure
    return 0;
  }
};

/**
 * Add ledger entry with automatic balance calculation
 */
const addEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName, date, remarks, tnsType, debit, credit, balance } = req.body;

    // Validate required fields
    if (!partyName || !date || !tnsType) {
      return res.status(400).json({
        success: false,
        message: 'Party name, date, and transaction type are required'
      });
    }

    // Check if party exists
    const parties = await Party.findByUserId(userId);
    console.log('🔍 All parties for user:', parties.map(p => ({ id: p.id, name: p.party_name })));
    
    const party = parties.find(p => p.party_name === partyName);
    console.log('🔍 Party lookup result:', { 
      searchedFor: partyName, 
      found: party ? { id: party.id, name: party.party_name } : null,
      allPartyNames: parties.map(p => p.party_name)
    });
    
    if (!party) {
      console.log('❌ Party not found:', { partyName, availableParties: parties.map(p => p.party_name) });
      return res.status(404).json({
        success: false,
        message: `Party "${partyName}" not found. Available parties: ${parties.map(p => p.party_name).join(', ')}`
      });
    }

    // Validate transaction amounts
    const debitAmount = parseFloat(debit || 0);
    const creditAmount = parseFloat(credit || 0);
    
    if (tnsType === 'CR' && creditAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Credit amount must be greater than 0 for CR transactions'
      });
    }
    
    if (tnsType === 'DR' && debitAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Debit amount must be greater than 0 for DR transactions'
      });
    }

    // Calculate current transaction amount
    const currentAmount = tnsType === 'CR' ? creditAmount : debitAmount;
    
    // Calculate running balance automatically
    const calculatedBalance = await calculateRunningBalance(userId, partyName, currentAmount, tnsType);
    
    console.log(`💰 Balance calculation for ${partyName}:`, {
      tnsType,
      currentAmount,
      calculatedBalance,
      debitAmount,
      creditAmount,
      previousEntries: 'calculated from database'
    });

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

    console.log('📝 Creating ledger entry:', entryData);

    const entry = await LedgerEntry.create(entryData);
    
    console.log('✅ Ledger entry created successfully:', entry.id);
    
    // Update all subsequent entries' balances for this party
    await updateSubsequentBalances(userId, partyName, entry.id);
    
    res.status(201).json({
      success: true,
      message: `Ledger entry added successfully for ${partyName}`,
      data: {
        ...entry,
        calculatedBalance,
        partyName,
        transactionType: tnsType,
        amount: currentAmount
      }
    });
  } catch (error) {
    console.error('❌ Error adding ledger entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add ledger entry',
      error: error.message
    });
  }
};

/**
 * Update balances for all subsequent entries after a new entry
 */
const updateSubsequentBalances = async (userId, partyName, currentEntryId) => {
  try {
    console.log(`🔄 Updating subsequent balances for ${partyName} after entry ${currentEntryId}`);
    
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
    
    console.log(`📊 Total entries for ${partyName}: ${sortedEntries.length}`);
    
    let runningBalance = 0;
    
    // Recalculate balance for ALL entries in chronological order
    for (const entry of sortedEntries) {
      // Skip Monday Final settlement entries - they don't affect balance
      if (entry.remarks?.includes('Monday Final Settlement')) {
        console.log(`📝 Entry ${entry.id}: ${entry.tns_type} - SKIPPED (Monday Final Settlement) - Balance unchanged: ${runningBalance}`);
        continue;
      }
      
      const entryCredit = parseFloat(entry.credit || 0);
      const entryDebit = parseFloat(entry.debit || 0);
      
      if (entry.tns_type === 'CR') {
        runningBalance += entryCredit;
      } else if (entry.tns_type === 'DR') {
        runningBalance -= entryDebit;
      }
      
      console.log(`📝 Entry ${entry.id}: ${entry.tns_type} - Credit: ${entryCredit}, Debit: ${entryDebit}, New Balance: ${runningBalance}`);
      
      // Update entry with new balance
      await LedgerEntry.update(entry.id, {
        balance: runningBalance,
        updated_at: new Date().toISOString()
      });
    }
    
    console.log(`✅ Final running balance for ${partyName}: ${runningBalance}`);
    
  } catch (error) {
    console.error(`❌ Error updating subsequent balances for ${partyName}:`, error);
  }
};

/**
 * Update ledger entry with balance recalculation
 */
const updateEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('🔍 Update Entry Request:', { id, updateData, userId });

    // Check if entry exists and belongs to user
    const entry = await LedgerEntry.findById(id);
    if (!entry || entry.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
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
    
    console.log('🔍 Original Entry:', entry);
    console.log('🔍 Transformed Data:', supabaseData);

    const updatedEntry = await LedgerEntry.update(id, supabaseData);
    
    // Recalculate balances for all entries of this party after update
    await recalculateAllBalancesForParty(userId, entry.party_name);
    
    res.json({
      success: true,
      message: 'Entry updated successfully with balance recalculation',
      data: updatedEntry
    });
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({
          success: false,
      message: 'Failed to update entry'
    });
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
        console.log(`📝 Entry ${entry.id}: ${entry.tns_type} - SKIPPED (Monday Final Settlement) - Balance unchanged: ${runningBalance}`);
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
    
    console.log(`🔄 Recalculated balances for ${sortedEntries.length} entries for ${partyName}. Final balance: ${runningBalance}`);
  } catch (error) {
    console.error('Error recalculating balances for party:', error);
  }
};

/**
 * Recalculate all balances for a party (utility function)
 */
const recalculatePartyBalances = async (userId, partyName) => {
  try {
    console.log(`🔄 Recalculating all balances for ${partyName}`);
    
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
    
    console.log(`📊 Found ${sortedEntries.length} entries for ${partyName}`);
    
    let runningBalance = 0;
    
    // Recalculate balance for all entries in chronological order
    for (const entry of sortedEntries) {
      // Skip Monday Final settlement entries - they don't affect balance
      if (entry.remarks?.includes('Monday Final Settlement')) {
        console.log(`📝 Entry ${entry.id}: ${entry.tns_type} - SKIPPED (Monday Final Settlement) - Balance unchanged: ${runningBalance}`);
        continue;
      }
      
      const entryCredit = parseFloat(entry.credit || 0);
      const entryDebit = parseFloat(entry.debit || 0);
      
      if (entry.tns_type === 'CR') {
        runningBalance += entryCredit;
      } else if (entry.tns_type === 'DR') {
        runningBalance -= entryDebit;
      }
      
      console.log(`📝 Entry ${entry.id}: ${entry.tns_type} - Credit: ${entryCredit}, Debit: ${entryDebit}, New Balance: ${runningBalance}`);
      
      // Update entry with new balance
      await LedgerEntry.update(entry.id, {
        balance: runningBalance,
        updated_at: new Date().toISOString()
      });
    }
    
    console.log(`✅ Final balance for ${partyName}: ${runningBalance}`);
    return runningBalance;
    
  } catch (error) {
    console.error(`❌ Error recalculating balances for ${partyName}:`, error);
    throw error;
  }
};

/**
 * Utility function to recalculate all balances for all parties (admin function)
 */
const recalculateAllBalances = async (req, res) => {
  try {
    const userId = req.user.id;
    
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
          console.log(`📝 Entry ${entry.id}: ${entry.tns_type} - SKIPPED (Monday Final Settlement) - Balance unchanged: ${runningBalance}`);
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
      
      console.log(`🔄 Recalculated balances for ${sortedEntries.length} entries for ${party.party_name}. Final balance: ${runningBalance}`);
    }

    res.json({
      success: true,
      message: `All balances recalculated successfully for ${parties.length} parties`,
      data: {
        partiesProcessed: parties.length,
        totalEntriesUpdated,
        message: 'All existing balances have been recalculated and updated'
      }
    });
  } catch (error) {
    console.error('Error recalculating all balances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate all balances'
    });
  }
};

/**
 * Delete ledger entry with balance recalculation
 */
const deleteEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if entry exists and belongs to user
    const entry = await LedgerEntry.findById(id);
    if (!entry || entry.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Store party name before deletion for balance recalculation
    const partyName = entry.party_name;

    await LedgerEntry.delete(id);
    
    // Recalculate balances for all remaining entries of this party
    await recalculateAllBalancesForParty(userId, partyName);

    res.json({
      success: true,
      message: 'Entry deleted successfully with balance recalculation',
      data: { deleted: true }
    });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete entry'
    });
  }
};

/**
 * Delete parties and their ledger entries
 */
const deleteParties = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyNames } = req.body;

    if (!partyNames || !Array.isArray(partyNames)) {
      return res.status(400).json({
        success: false,
        message: 'Party names array is required'
      });
    }

    // Get all user parties
    const allParties = await Party.findByUserId(userId);
    const validPartyNames = partyNames.filter(name => 
      allParties.some(p => p.party_name === name)
    );

    if (validPartyNames.length === 0) {
      return res.status(400).json({
          success: false,
        message: 'No valid parties found for deletion'
      });
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

    res.json({
      success: true,
      message: `${validPartyNames.length} parties and their entries deleted successfully`,
      data: { deletedCount: validPartyNames.length }
    });
  } catch (error) {
    console.error('Error deleting parties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete parties'
    });
  }
};

/**
 * Unsettle transactions for Monday Final
 */
const unsettleTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName, settlementDate } = req.body;

    if (!partyName || !settlementDate) {
      return res.status(400).json({
        success: false,
        message: 'Party name and settlement date are required'
      });
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

    res.json({
      success: true,
      message: 'Transactions unsettled successfully',
      data: { unsettledCount: unsettledEntries.length }
    });
  } catch (error) {
    console.error('Error unsettling transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsettle transactions'
    });
  }
};

/**
 * Update Monday Final status for parties and settle transactions
 */
const updateMondayFinal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyNames } = req.body;

    if (!partyNames || !Array.isArray(partyNames)) {
      return res.status(400).json({
        success: false,
        message: 'Party names array is required'
      });
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
          
          console.log(`🔍 Settlement Analysis for ${partyName}:`);
          console.log(`   - Existing Monday Finals to settle: ${existingMondayFinals.length}`);
          console.log(`   - Regular transactions to settle: ${regularTransactions.length}`);
          
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
            console.log(`🔗 Linking ${unsettledEntries.length} transactions to Monday Final: ${mondayFinalId}`);
            
            const linkPromises = unsettledEntries.map(entry => 
              LedgerEntry.update(entry.id, {
                settlement_monday_final_id: createdSettlementEntry.id, // Use actual entry ID (UUID)
                updated_at: new Date().toISOString()
              })
            );
            
            await Promise.all(linkPromises);
            console.log(`✅ Linked ${unsettledEntries.length} transactions to Monday Final entry ID: ${createdSettlementEntry.id}`);
            
            // Update total count
            totalSettledEntries += unsettledEntries.length;
          }
        }

        console.log(`✅ Monday Final completed for ${partyName}: ${totalSettledEntries} transactions settled`);
      }
    }

    res.json({
      success: true,
      message: `Monday Final status updated successfully. ${totalSettledEntries} transactions settled.`,
      data: {
        updatedCount: partyNames.length,
        settledEntries: totalSettledEntries,
        updatedParties: partyNames,
        settlementDetails: partyNames.map(partyName => ({
          partyName,
          status: 'Settled',
          settlementDate: new Date().toISOString().split('T')[0]
        }))
      }
    });
  } catch (error) {
    console.error('Error updating Monday Final status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Monday Final status'
    });
  }
};

/**
 * Delete Monday Final entry and unsettle only its settled transactions
 */
const deleteMondayFinalEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { entryId } = req.params;

    // 1. Find the Monday Final entry
    const mondayFinalEntry = await LedgerEntry.findById(entryId);
    
    if (!mondayFinalEntry || mondayFinalEntry.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Monday Final entry not found'
      });
    }

    // 2. Check if it's actually a Monday Final entry
    if (!mondayFinalEntry.remarks?.includes('Monday Final Settlement')) {
      return res.status(400).json({
        success: false,
        message: 'This is not a Monday Final entry'
      });
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

    res.json({
      success: true,
      message: 'Monday Final entry deleted and transactions unsettled successfully',
      data: {
        deletedEntryId: entryId,
        unsettledTransactions: entriesToUnsettle.length,
        partyName,
        settlementDate
      }
    });

  } catch (error) {
    console.error('❌ Error deleting Monday Final entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Monday Final entry',
      error: error.message
    });
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