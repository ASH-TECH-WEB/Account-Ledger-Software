const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeMondayFinalHierarchy() {
  try {
    console.log('🔍 Analyzing Monday Final Hierarchy...\n');

    // 1. Get all Monday Final entries with their details
    console.log('📊 1. All Monday Final Entries:');
    const { data: allMondayFinals, error: mfError } = await supabase
      .from('ledger_entries')
      .select('*')
      .ilike('remarks', '%Monday Final Settlement%')
      .order('created_at', { ascending: true });

    if (mfError) throw mfError;

    console.log(`   Found ${allMondayFinals.length} Monday Final entries total`);
    
    allMondayFinals.forEach((mf, index) => {
      console.log(`   ${index + 1}. ID: ${mf.id}`);
      console.log(`      Party: ${mf.party_name}`);
      console.log(`      Date: ${mf.date}`);
      console.log(`      Created: ${mf.created_at}`);
      console.log(`      Is Old Record: ${mf.is_old_record}`);
      console.log(`      Settlement Date: ${mf.settlement_date || 'N/A'}`);
      console.log(`      Settlement Monday Final ID: ${mf.settlement_monday_final_id || 'N/A'}`);
      console.log(`      Transaction ID: ${mf.ti}`);
      console.log('');
    });

    // 2. Get all transactions for New party to see the full picture
    console.log('📋 2. All Transactions for New Party:');
    const { data: allTransactions, error: transError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('party_name', 'New')
      .order('created_at', { ascending: true });

    if (transError) throw transError;

    console.log(`   Total transactions for New party: ${allTransactions.length}`);
    
    allTransactions.forEach((trans, index) => {
      const type = trans.tns_type;
      const amount = trans.credit || trans.debit || 0;
      const balance = trans.balance || 0;
      const isOld = trans.is_old_record;
      const settlementId = trans.settlement_monday_final_id;
      
      console.log(`   ${index + 1}. ${trans.date} | ${trans.remarks}`);
      console.log(`      ${type} ₹${amount} | Balance: ₹${balance} | Old: ${isOld} | Settlement: ${settlementId || 'None'}`);
      console.log(`      ID: ${trans.id} | Created: ${trans.created_at}`);
      console.log('');
    });

    // 3. Analyze the hierarchy issue
    console.log('🔍 3. Hierarchy Analysis:');
    
    // Find unsettled Monday Finals
    const unsettledMondayFinals = allMondayFinals.filter(mf => !mf.is_old_record);
    console.log(`   Unsettled Monday Finals: ${unsettledMondayFinals.length}`);
    
    if (unsettledMondayFinals.length > 0) {
      console.log('   These Monday Finals are still unsettled:');
      unsettledMondayFinals.forEach(mf => {
        console.log(`     - ${mf.id} (${mf.ti}) created at ${mf.created_at}`);
      });
    }

    // Find transactions that should be settled but aren't
    const shouldBeSettled = allTransactions.filter(trans => 
      !trans.is_old_record && 
      !trans.remarks.includes('Monday Final Settlement') &&
      trans.created_at < allMondayFinals[allMondayFinals.length - 1]?.created_at
    );

    console.log(`   Transactions that should be settled: ${shouldBeSettled.length}`);
    if (shouldBeSettled.length > 0) {
      console.log('   These transactions should be settled:');
      shouldBeSettled.forEach(trans => {
        console.log(`     - ${trans.remarks} (${trans.created_at})`);
      });
    }

    // 4. Check for orphaned Monday Finals
    console.log('\n🔍 4. Orphaned Monday Final Check:');
    const orphanedMondayFinals = allMondayFinals.filter(mf => 
      !mf.settlement_monday_final_id && mf.id !== allMondayFinals[allMondayFinals.length - 1]?.id
    );

    console.log(`   Orphaned Monday Finals: ${orphanedMondayFinals.length}`);
    if (orphanedMondayFinals.length > 0) {
      console.log('   These Monday Finals are not linked to any parent:');
      orphanedMondayFinals.forEach(mf => {
        console.log(`     - ${mf.id} (${mf.ti})`);
      });
    }

    console.log('\n✅ Analysis completed!');
    console.log('\n🎯 Summary of Issues:');
    console.log(`   - Total Monday Finals: ${allMondayFinals.length}`);
    console.log(`   - Unsettled Monday Finals: ${unsettledMondayFinals.length}`);
    console.log(`   - Transactions needing settlement: ${shouldBeSettled.length}`);
    console.log(`   - Orphaned Monday Finals: ${orphanedMondayFinals.length}`);

  } catch (error) {
    console.error('❌ Error analyzing database:', error);
  }
}

analyzeMondayFinalHierarchy();
