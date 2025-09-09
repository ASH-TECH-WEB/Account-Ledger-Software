/**
 * Company Name Change Migration Script
 * 
 * This script handles the migration when a user changes their company name:
 * 1. Updates existing company party name
 * 2. Updates all existing transactions with old company name
 * 3. Handles both settled and unsettled transactions
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Migrate company name change for a user
 * @param {string} userId - User ID
 * @param {string} oldCompanyName - Old company name
 * @param {string} newCompanyName - New company name
 */
async function migrateCompanyNameChange(userId, oldCompanyName, newCompanyName) {
  console.log(`🔄 Starting company name migration for user ${userId}`);
  console.log(`📝 Old: "${oldCompanyName}" → New: "${newCompanyName}"`);

  try {
    // Step 1: Update company party name
    console.log('📋 Step 1: Updating company party...');
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('*')
      .eq('user_id', userId)
      .eq('party_name', oldCompanyName);

    if (partiesError) {
      throw new Error(`Failed to fetch parties: ${partiesError.message}`);
    }

    if (parties && parties.length > 0) {
      const companyParty = parties[0];
      console.log(`🏢 Found company party: ${companyParty.party_name} (ID: ${companyParty.id})`);

      // Update company party name
      const { error: updatePartyError } = await supabase
        .from('parties')
        .update({
          party_name: newCompanyName,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyParty.id);

      if (updatePartyError) {
        throw new Error(`Failed to update company party: ${updatePartyError.message}`);
      }

      console.log(`✅ Company party updated: "${oldCompanyName}" → "${newCompanyName}"`);
    } else {
      console.log(`⚠️ No company party found with name: ${oldCompanyName}`);
    }

    // Step 2: Update all ledger entries with old company name
    console.log('📋 Step 2: Updating ledger entries...');
    
    // Get all ledger entries with old company name
    const { data: ledgerEntries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('party_name', oldCompanyName);

    if (entriesError) {
      throw new Error(`Failed to fetch ledger entries: ${entriesError.message}`);
    }

    if (ledgerEntries && ledgerEntries.length > 0) {
      console.log(`📊 Found ${ledgerEntries.length} ledger entries to update`);

      // Update all ledger entries
      const { error: updateEntriesError } = await supabase
        .from('ledger_entries')
        .update({
          party_name: newCompanyName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('party_name', oldCompanyName);

      if (updateEntriesError) {
        throw new Error(`Failed to update ledger entries: ${updateEntriesError.message}`);
      }

      console.log(`✅ Updated ${ledgerEntries.length} ledger entries`);
    } else {
      console.log(`⚠️ No ledger entries found with company name: ${oldCompanyName}`);
    }

    // Step 3: Update remarks that contain old company name
    console.log('📋 Step 3: Updating remarks containing old company name...');
    
    const { data: remarksEntries, error: remarksError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', userId)
      .like('remarks', `%${oldCompanyName}%`);

    if (remarksError) {
      throw new Error(`Failed to fetch entries with remarks: ${remarksError.message}`);
    }

    if (remarksEntries && remarksEntries.length > 0) {
      console.log(`📝 Found ${remarksEntries.length} entries with remarks containing old company name`);

      // Update remarks for each entry
      for (const entry of remarksEntries) {
        const updatedRemarks = entry.remarks.replace(new RegExp(oldCompanyName, 'g'), newCompanyName);
        
        const { error: updateRemarkError } = await supabase
          .from('ledger_entries')
          .update({
            remarks: updatedRemarks,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);

        if (updateRemarkError) {
          console.error(`❌ Failed to update remarks for entry ${entry.id}:`, updateRemarkError.message);
        } else {
          console.log(`✅ Updated remarks for entry ${entry.id}`);
        }
      }
    } else {
      console.log(`⚠️ No entries found with remarks containing old company name`);
    }

    // Step 4: Recalculate balances for all parties (since company name changed)
    console.log('📋 Step 4: Recalculating balances...');
    
    // Get all parties for this user
    const { data: allParties, error: allPartiesError } = await supabase
      .from('parties')
      .select('party_name')
      .eq('user_id', userId);

    if (allPartiesError) {
      throw new Error(`Failed to fetch all parties: ${allPartiesError.message}`);
    }

    if (allParties && allParties.length > 0) {
      console.log(`🔄 Recalculating balances for ${allParties.length} parties...`);
      
      for (const party of allParties) {
        await recalculatePartyBalances(userId, party.party_name);
      }
      
      console.log(`✅ Balances recalculated for all parties`);
    }

    console.log(`🎉 Company name migration completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Company party: Updated`);
    console.log(`   - Ledger entries: ${ledgerEntries?.length || 0} updated`);
    console.log(`   - Remarks: ${remarksEntries?.length || 0} updated`);
    console.log(`   - Balances: Recalculated for all parties`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

/**
 * Recalculate balances for a specific party
 * @param {string} userId - User ID
 * @param {string} partyName - Party name
 */
async function recalculatePartyBalances(userId, partyName) {
  try {
    // Get all entries for this party
    const { data: entries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('party_name', partyName)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

    if (entriesError) {
      throw new Error(`Failed to fetch entries for party ${partyName}: ${entriesError.message}`);
    }

    if (!entries || entries.length === 0) {
      return;
    }

    let runningBalance = 0;

    // Recalculate balance for each entry
    for (const entry of entries) {
      // Skip Monday Final settlement entries
      if (entry.remarks?.includes('Monday Final Settlement')) {
        continue;
      }

      if (entry.tns_type === 'CR') {
        runningBalance += parseFloat(entry.credit || 0);
      } else if (entry.tns_type === 'DR') {
        runningBalance -= parseFloat(entry.debit || 0);
      }

      // Update entry with new balance
      const { error: updateError } = await supabase
        .from('ledger_entries')
        .update({
          balance: runningBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error(`❌ Failed to update balance for entry ${entry.id}:`, updateError.message);
      }
    }

  } catch (error) {
    console.error(`❌ Failed to recalculate balances for party ${partyName}:`, error.message);
    throw error;
  }
}

/**
 * Main function to run the migration
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    console.log('Usage: node migrate-company-name-change.js <userId> <oldCompanyName> <newCompanyName>');
    console.log('Example: node migrate-company-name-change.js "user123" "Old Company" "New Company"');
    process.exit(1);
  }

  const [userId, oldCompanyName, newCompanyName] = args;

  try {
    await migrateCompanyNameChange(userId, oldCompanyName, newCompanyName);
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  migrateCompanyNameChange,
  recalculatePartyBalances
};
