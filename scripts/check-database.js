const { supabase } = require('../src/config/supabase');

async function checkDatabase() {
  try {
    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      } else {
      if (users.length > 0) {
        ));
      }
    }

    // Check parties table
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('*');
    
    if (partiesError) {
      } else {
      if (parties.length > 0) {
        ));
      }
    }

    // Check ledger_entries table
    const { data: entries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('*');
    
    if (entriesError) {
      } else {
      if (entries.length > 0) {
        .map(e => ({ 
          id: e.id, 
          party_name: e.party_name, 
          date: e.date, 
          debit: e.debit, 
          credit: e.credit 
        })));
      }
    }

    // Summary
    if ((users?.length || 0) === 0 && (parties?.length || 0) === 0 && (entries?.length || 0) === 0) {
      ');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabase();
