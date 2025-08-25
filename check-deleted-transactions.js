const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDeletedTransactions() {
  try {
    console.log('🔍 Checking Why Deleted Transactions Are Still Showing...\n');

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check ALL entries in database
    console.log('📊 Checking ALL Database Entries...');
    const { data: allEntries, error: allError } = await supabase
      .from('ledger_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error fetching entries:', allError.message);
      return;
    }

    console.log(`✅ Total entries in database: ${allEntries.length}`);

    // 2. Show all entries with details
    console.log('\n📋 ALL ENTRIES IN DATABASE:');
    allEntries.forEach((entry, index) => {
      console.log(`\n   ${index + 1}. Entry ID: ${entry.id}`);
      console.log(`      Party: ${entry.party_name}`);
      console.log(`      Type: ${entry.tns_type}`);
      console.log(`      Amount: ₹${entry.credit || entry.debit || 0}`);
      console.log(`      Remarks: ${entry.remarks}`);
      console.log(`      Date: ${entry.date}`);
      console.log(`      Is Old Record: ${entry.is_old_record}`);
      console.log(`      Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
      console.log(`      Created: ${entry.created_at}`);
      console.log(`      Updated: ${entry.updated_at || 'Never'}`);
    });

    // 3. Check if there are any soft-deleted entries
    console.log('\n🔍 Checking for soft-deleted entries...');
    const softDeleted = allEntries.filter(entry => 
      entry.deleted_at || entry.is_deleted || entry.status === 'deleted'
    );

    if (softDeleted.length > 0) {
      console.log(`⚠️ Found ${softDeleted.length} soft-deleted entries:`);
      softDeleted.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.party_name}: ${entry.remarks}`);
        console.log(`      Deleted at: ${entry.deleted_at || 'Unknown'}`);
      });
    } else {
      console.log('✅ No soft-deleted entries found');
    }

    // 4. Check if frontend is filtering correctly
    console.log('\n💡 FRONTEND FILTERING ANALYSIS:');
    console.log('   If frontend shows "No entries" but database has entries:');
    console.log('   1. Frontend might be filtering by date range');
    console.log('   2. Frontend might be filtering by party name');
    console.log('   3. Frontend might be filtering by transaction type');
    console.log('   4. Frontend might have pagination issues');
    console.log('   5. Frontend might be caching old data');

    // 5. Check specific party entries
    const parties = [...new Set(allEntries.map(entry => entry.party_name))];
    console.log(`\n🏢 PARTIES IN DATABASE: ${parties.join(', ')}`);
    
    parties.forEach(partyName => {
      const partyEntries = allEntries.filter(entry => entry.party_name === partyName);
      const current = partyEntries.filter(e => !e.is_old_record);
      const old = partyEntries.filter(e => e.is_old_record);
      
      console.log(`\n   🏢 ${partyName}:`);
      console.log(`      📈 Current entries: ${current.length}`);
      console.log(`      📚 Old records: ${old.length}`);
      
      if (current.length > 0) {
        console.log(`      📋 Current entries:`);
        current.forEach((entry, idx) => {
          console.log(`         ${idx + 1}. ${entry.tns_type} ₹${entry.credit || entry.debit || 0} - ${entry.remarks}`);
        });
      }
      
      if (old.length > 0) {
        console.log(`      📚 Old records:`);
        old.forEach((entry, idx) => {
          console.log(`         ${idx + 1}. ${entry.tns_type} ₹${entry.credit || entry.debit || 0} - ${entry.remarks}`);
        });
      }
    });

    // 6. Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (allEntries.length > 0) {
      console.log('🚨 ISSUE: Database still has entries after frontend deletion!');
      console.log('💡 Possible causes:');
      console.log('   1. Frontend delete not calling backend API');
      console.log('   2. Backend delete API not working');
      console.log('   3. Frontend filtering issues');
      console.log('   4. Database constraints preventing deletion');
      console.log('   5. Soft delete vs hard delete confusion');
      
      console.log('\n🔧 To fix this:');
      console.log('   1. Check frontend delete button implementation');
      console.log('   2. Check backend delete API endpoint');
      console.log('   3. Check browser console for errors');
      console.log('   4. Check network tab for API calls');
      console.log('   5. Verify database permissions');
    } else {
      console.log('✅ Database is empty - no entries found');
      console.log('💡 Frontend deletion worked correctly');
    }

  } catch (error) {
    console.error('❌ Error checking deleted transactions:', error.message);
  }
}

checkDeletedTransactions();
