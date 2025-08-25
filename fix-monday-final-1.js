const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMondayFinal1() {
  try {
    console.log('🔧 Fixing Monday Final 1 Status...\n');

    // 1. Find Monday Final 1 entry
    const mondayFinal1Id = 'e675c4ee-42f0-40f2-b769-5ed1d48caa20';
    
    console.log(`🔍 Looking for Monday Final 1: ${mondayFinal1Id}`);

    const { data: mondayFinal1, error: mfError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('id', mondayFinal1Id)
      .single();

    if (mfError) throw mfError;

    console.log('📋 Monday Final 1 Details:');
    console.log(`   Date: ${mondayFinal1.date}, Type: ${mondayFinal1.tns_type}`);
    console.log(`   Remarks: ${mondayFinal1.remarks}`);
    console.log(`   Is Old Record: ${mondayFinal1.is_old_record}`);
    console.log(`   Settlement ID: ${mondayFinal1.settlement_monday_final_id || 'None'}`);

    // 2. Check current status
    if (mondayFinal1.is_old_record) {
      console.log('✅ Monday Final 1 is already properly settled');
    } else {
      console.log('❌ Monday Final 1 is unsettled - needs to be settled');
      
      // Settle Monday Final 1
      const { error: updateError } = await supabase
        .from('ledger_entries')
        .update({
          is_old_record: true,
          settlement_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', mondayFinal1Id);

      if (updateError) throw updateError;
      console.log('✅ Monday Final 1 settled successfully');
    }

    // 3. Check all entries for New party
    const { data: allEntries, error: allError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('party_name', 'New')
      .order('created_at', { ascending: true });

    if (allError) throw allError;

    // 4. Separate current and old records
    const currentEntries = allEntries.filter(entry => !entry.is_old_record);
    const oldRecords = allEntries.filter(entry => entry.is_old_record);

    console.log(`\n📊 Current entries: ${currentEntries.length}, Old records: ${oldRecords.length}`);

    // 5. Display current entries
    if (currentEntries.length > 0) {
      console.log('\n📋 Current Entries (Unsettled):');
      currentEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. Date: ${entry.date}, Type: ${entry.tns_type}`);
        console.log(`     Amount: ₹${entry.credit || entry.debit || 0}, Remarks: ${entry.remarks}`);
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
        console.log(`     Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
        console.log('');
      });
    }

    // 7. Verify proper hierarchy
    console.log('\n🔍 Verifying Settlement Hierarchy:');
    
    // Find Monday Final entries
    const mondayFinals = oldRecords.filter(entry => 
      entry.remarks?.includes('Monday Final Settlement')
    );

    if (mondayFinals.length > 0) {
      console.log(`📊 Found ${mondayFinals.length} Monday Final entries:`);
      mondayFinals.forEach((mf, index) => {
        console.log(`   ${index + 1}. ${mf.remarks}`);
        console.log(`      ID: ${mf.id}, Settlement ID: ${mf.settlement_monday_final_id || 'None'}`);
        
        // Find transactions settled by this Monday Final
        const settledTransactions = oldRecords.filter(entry => 
          entry.settlement_monday_final_id === mf.id
        );
        
        console.log(`      Settled ${settledTransactions.length} transactions`);
      });
    }

    console.log('\n✅ Monday Final 1 fix completed!');

  } catch (error) {
    console.error('❌ Error fixing Monday Final 1:', error);
  }
}

fixMondayFinal1();
