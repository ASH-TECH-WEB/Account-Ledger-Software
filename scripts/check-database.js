const { supabase } = require('../src/config/supabase');

async function checkDatabase() {
  try {
    console.log('🔍 Checking Database Users...\n');

    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
    } else {
      console.log(`📊 Total Users in Database: ${users?.length || 0}`);
      if (users && users.length > 0) {
        console.log('\n👥 Database Users:');
        users.forEach((user, index) => {
          console.log(`${index + 1}. Email: ${user.email}`);
          console.log(`   Name: ${user.name || 'N/A'}`);
          console.log(`   Phone: ${user.phone || 'N/A'}`);
          console.log(`   Created: ${user.created_at}`);
          console.log(`   Auth Provider: ${user.auth_provider || 'email'}`);
          console.log(`   Has Password: ${user.password_hash ? 'Yes' : 'No'}`);
          console.log('   ---');
        });
      }
    }

    // Check parties table
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('*');
    
    if (partiesError) {
      console.error('❌ Error fetching parties:', partiesError.message);
    } else {
      console.log(`\n📊 Total Parties in Database: ${parties?.length || 0}`);
      if (parties && parties.length > 0) {
        console.log('\n🏢 Database Parties:');
        parties.slice(0, 5).forEach((party, index) => {
          console.log(`${index + 1}. Name: ${party.name}`);
          console.log(`   Email: ${party.email || 'N/A'}`);
          console.log(`   Phone: ${party.phone || 'N/A'}`);
          console.log('   ---');
        });
        if (parties.length > 5) {
          console.log(`... and ${parties.length - 5} more parties`);
        }
      }
    }

    // Check ledger_entries table
    const { data: entries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('*');
    
    if (entriesError) {
      console.error('❌ Error fetching ledger entries:', entriesError.message);
    } else {
      console.log(`\n📊 Total Ledger Entries in Database: ${entries?.length || 0}`);
      if (entries && entries.length > 0) {
        console.log('\n📝 Recent Ledger Entries:');
        entries.slice(0, 3).forEach((entry, index) => {
          console.log(`${index + 1}. Party: ${entry.party_name}`);
          console.log(`   Date: ${entry.date}`);
          console.log(`   Debit: ${entry.debit || 0}`);
          console.log(`   Credit: ${entry.credit || 0}`);
          console.log('   ---');
        });
        if (entries.length > 3) {
          console.log(`... and ${entries.length - 3} more entries`);
        }
      }
    }

    // Summary
    if ((users?.length || 0) === 0 && (parties?.length || 0) === 0 && (entries?.length || 0) === 0) {
      console.log('\n📭 Database is empty - no data found');
    } else {
      console.log('\n✅ Database check completed successfully');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabase();