const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOrphanedTransactions() {
  try {
    console.log('🔧 Fixing Orphaned Transactions...\n');

    // 1. Find all entries linked to the deleted Monday Final 2
    const deletedMondayFinalId = '84521d4a-a583-4ebf-b280-70740275eaf0';
    
    console.log(`🔍 Looking for transactions linked to deleted Monday Final: ${deletedMondayFinalId}`);

    const { data: orphanedEntries, error: orphanedError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('settlement_monday_final_id', deletedMondayFinalId);

    if (orphanedError) throw orphanedError;

    console.log(`📊 Found ${orphanedEntries.length} orphaned transactions`);

    if (orphanedEntries.length === 0) {
      console.log('✅ No orphaned transactions found');
      return;
    }

    // 2. Display orphaned transactions
    console.log('\n📋 Orphaned Transactions:');
    orphanedEntries.forEach((entry, index) => {
      console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
      console.log(`     Amount: ₹${entry.credit || entry.debit || 0}, Remarks: ${entry.remarks}`);
      console.log(`     ID: ${entry.id}, Is Old Record: ${entry.is_old_record}`);
      console.log('');
    });

    // 3. Fix orphaned transactions
    console.log('🔧 Fixing orphaned transactions...');
    
    const fixPromises = orphanedEntries.map(entry => {
      // Skip Monday Final entries - only unsettle regular transactions
      if (entry.remarks?.includes('Monday Final Settlement')) {
        console.log(`📝 Skipping Monday Final entry: ${entry.id}`);
        return Promise.resolve();
      }

      console.log(`🔧 Unsettling transaction: ${entry.id} - ${entry.remarks}`);
      
      return supabase
        .from('ledger_entries')
        .update({
          is_old_record: false,
          settlement_date: null,
          settlement_monday_final_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', entry.id);
    });

    // Execute all fixes
    const results = await Promise.all(fixPromises);
    
    // Check for errors
    const errors = results.filter(result => result && result.error);
    if (errors.length > 0) {
      console.log('⚠️ Some fixes failed:');
      errors.forEach(error => console.log(`   - ${error.error.message}`));
    }

    console.log(`✅ Fixed ${orphanedEntries.length - errors.length} transactions`);

    // 4. Verify the fix
    console.log('\n🔍 Verifying the fix...');
    
    const { data: currentEntries, error: currentError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('party_name', 'New')
      .eq('is_old_record', false);

    if (currentError) throw currentError;

    const { data: oldRecords, error: oldError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('party_name', 'New')
      .eq('is_old_record', true);

    if (oldError) throw oldError;

    console.log(`📊 Current entries: ${currentEntries.length}, Old records: ${oldRecords.length}`);

    if (currentEntries.length > 0) {
      console.log('\n📋 Current Entries (Unsettled):');
      currentEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
        console.log(`     Amount: ₹${entry.credit || entry.debit || 0}, Remarks: ${entry.remarks}`);
        console.log(`     Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
        console.log('');
      });
    }

    if (oldRecords.length > 0) {
      console.log('\n📋 Old Records (Still Settled):');
      oldRecords.forEach((entry, index) => {
        console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
        console.log(`     Amount: ₹${entry.credit || entry.debit || 0}, Remarks: ${entry.remarks}`);
        console.log(`     Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
        console.log('');
      });
    }

    console.log('\n✅ Fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing orphaned transactions:', error);
  }
}

fixOrphanedTransactions();
