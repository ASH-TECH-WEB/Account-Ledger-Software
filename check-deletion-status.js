const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeletionStatus() {
  try {
    console.log('🔍 Checking Deletion Status...\n');

    // 1. Check total ledger entries
    const { count: totalEntries, error: countError } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    console.log(`📊 Total ledger entries: ${totalEntries}`);

    if (totalEntries === 0) {
      console.log('✅ No entries found - database is clean');
      return;
    }

    // 2. Get all entries for New party
    const { data: newPartyEntries, error: partyError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('party_name', 'New')
      .order('created_at', { ascending: true });

    if (partyError) throw partyError;

    console.log(`📊 Found ${newPartyEntries.length} entries for New party`);

    // 3. Separate current and old records
    const currentEntries = newPartyEntries.filter(entry => !entry.is_old_record);
    const oldRecords = newPartyEntries.filter(entry => entry.is_old_record);

    console.log(`📊 Current entries: ${currentEntries.length}, Old records: ${oldRecords.length}`);

    // 4. Check Monday Final entries
    const mondayFinalEntries = newPartyEntries.filter(entry => 
      entry.remarks?.includes('Monday Final Settlement')
    );

    console.log(`📊 Monday Final entries: ${mondayFinalEntries.length}`);

    // 5. Display current entries
    if (currentEntries.length > 0) {
      console.log('\n📋 Current Entries (Unsettled):');
      currentEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
        console.log(`     Amount: ₹${entry.credit || entry.debit || 0}, Remarks: ${entry.remarks}`);
        console.log(`     ID: ${entry.id}, Created: ${entry.created_at}`);
        console.log(`     Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
        console.log('');
      });
    } else {
      console.log('\n📋 Current Entries: None (all settled)');
    }

    // 6. Display old records
    if (oldRecords.length > 0) {
      console.log('\n📋 Old Records (Settled):');
      oldRecords.forEach((entry, index) => {
        console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
        console.log(`     Amount: ₹${entry.credit || entry.debit || 0}, Remarks: ${entry.remarks}`);
        console.log(`     ID: ${entry.id}, Created: ${entry.created_at}`);
        console.log(`     Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
        console.log('');
      });
    }

    // 7. Check Monday Final details
    if (mondayFinalEntries.length > 0) {
      console.log('\n📋 Monday Final Entries:');
      mondayFinalEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
        console.log(`     Remarks: ${entry.remarks}`);
        console.log(`     ID: ${entry.id}, Created: ${entry.created_at}`);
        console.log(`     Is Old Record: ${entry.is_old_record}`);
        console.log(`     Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
        console.log('');
      });
    }

    // 8. Check for any orphaned entries
    const orphanedEntries = newPartyEntries.filter(entry => 
      entry.settlement_monday_final_id && 
      !mondayFinalEntries.find(mf => mf.id === entry.settlement_monday_final_id)
    );

    if (orphanedEntries.length > 0) {
      console.log('\n⚠️ Orphaned Entries (linked to non-existent Monday Final):');
      orphanedEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
        console.log(`     Remarks: ${entry.remarks}`);
        console.log(`     Settlement ID: ${entry.settlement_monday_final_id}`);
        console.log('');
      });
    }

    console.log('\n✅ Deletion status check completed!');

  } catch (error) {
    console.error('❌ Error checking deletion status:', error);
  }
}

checkDeletionStatus();
