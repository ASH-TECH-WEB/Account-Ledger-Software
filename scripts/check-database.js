const { supabase } = require('../src/config/supabase');

async function checkDatabase() {
  console.log('🔍 Checking Supabase Database...\n');

  try {
    // Check users table
    console.log('👥 Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.log('❌ Error checking users:', usersError.message);
    } else {
      console.log(`✅ Users found: ${users.length}`);
      if (users.length > 0) {
        console.log('📋 Users:', users.map(u => ({ id: u.id, email: u.email, name: u.name })));
      }
    }

    // Check parties table
    console.log('\n🏢 Checking parties table...');
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('*');
    
    if (partiesError) {
      console.log('❌ Error checking parties:', partiesError.message);
    } else {
      console.log(`✅ Parties found: ${parties.length}`);
      if (parties.length > 0) {
        console.log('📋 Parties:', parties.map(p => ({ id: p.id, party_name: p.party_name, sr_no: p.sr_no })));
      }
    }

    // Check ledger_entries table
    console.log('\n📊 Checking ledger_entries table...');
    const { data: entries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('*');
    
    if (entriesError) {
      console.log('❌ Error checking ledger entries:', entriesError.message);
    } else {
      console.log(`✅ Ledger entries found: ${entries.length}`);
      if (entries.length > 0) {
        console.log('📋 Sample entries:', entries.slice(0, 3).map(e => ({ 
          id: e.id, 
          party_name: e.party_name, 
          date: e.date, 
          debit: e.debit, 
          credit: e.credit 
        })));
      }
    }

    // Summary
    console.log('\n📊 DATABASE SUMMARY:');
    console.log(`   👥 Users: ${users?.length || 0}`);
    console.log(`   🏢 Parties: ${parties?.length || 0}`);
    console.log(`   📊 Ledger Entries: ${entries?.length || 0}`);

    if ((users?.length || 0) === 0 && (parties?.length || 0) === 0 && (entries?.length || 0) === 0) {
      console.log('\n💡 Database is empty. You can:');
      console.log('   1. Register a new user via API');
      console.log('   2. Create test data manually');
      console.log('   3. Import data from MongoDB (if available)');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabase();
