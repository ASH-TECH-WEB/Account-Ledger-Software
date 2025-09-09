const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkAllUsersTrialBalance() {
  try {
    console.log('🔍 Checking Final Trial Balance for all users...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, email')
      .order('email');
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`👥 Found ${users.length} users\n`);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.email} (${user.user_id})`);
      console.log('='.repeat(60));
      
      // Get all ledger entries for this user
      const { data: allEntries, error: entriesError } = await supabase
        .from('ledger_entries')
        .select('party_name, credit, debit, remarks, tns_type, balance')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: true });
      
      if (entriesError) {
        console.error(`❌ Error fetching entries for ${user.email}:`, entriesError);
        continue;
      }
      
      console.log(`📋 Total entries: ${allEntries.length}`);
      
      // Calculate party-wise closing balances
      const partyBalances = new Map();
      let totalCredit = 0;
      let totalDebit = 0;
      
      allEntries.forEach(entry => {
        const partyName = entry.party_name;
        const credit = parseFloat(entry.credit || 0);
        const debit = parseFloat(entry.debit || 0);
        const remarks = entry.remarks || '';
        
        // Skip Monday Final Settlement entries
        if (remarks.includes('Monday Final Settlement') || remarks.includes('Monday Settlement')) {
          return;
        }
        
        // Skip company name transactions
        if (remarks === 'New Comapany' || remarks === 'Commission') {
          return;
        }
        
        // Initialize party balance if not exists
        if (!partyBalances.has(partyName)) {
          partyBalances.set(partyName, {
            name: partyName,
            creditTotal: 0,
            debitTotal: 0,
            closingBalance: 0,
            entryCount: 0
          });
        }
        
        const partyEntry = partyBalances.get(partyName);
        partyEntry.entryCount++;
        
        // Add to party totals
        if (entry.tns_type === 'CR') {
          partyEntry.creditTotal += credit;
          totalCredit += credit;
        } else if (entry.tns_type === 'DR') {
          partyEntry.debitTotal += debit;
          totalDebit += debit;
        }
        
        // Calculate closing balance
        partyEntry.closingBalance = partyEntry.creditTotal - partyEntry.debitTotal;
      });
      
      // Display party-wise balances
      const creditEntries = [];
      const debitEntries = [];
      
      partyBalances.forEach((balance, partyName) => {
        if (balance.closingBalance !== 0) {
          if (balance.closingBalance > 0) {
            creditEntries.push(balance);
          } else {
            debitEntries.push(balance);
          }
        }
      });
      
      // Calculate totals
      const creditTotal = creditEntries.reduce((sum, entry) => sum + entry.closingBalance, 0);
      const debitTotal = Math.abs(debitEntries.reduce((sum, entry) => sum + entry.closingBalance, 0));
      const balanceDifference = creditTotal - debitTotal;
      
      console.log(`📊 Final Trial Balance:`);
      console.log(`  Total Credit: ₹${creditTotal.toLocaleString()}`);
      console.log(`  Total Debit: ₹${debitTotal.toLocaleString()}`);
      console.log(`  Balance Difference: ₹${balanceDifference.toLocaleString()}`);
      
      if (balanceDifference === 0) {
        console.log(`  ✅ Balanced`);
      } else if (balanceDifference > 0) {
        console.log(`  ⚠️ Credit Higher by ₹${balanceDifference.toLocaleString()}`);
      } else {
        console.log(`  ⚠️ Debit Higher by ₹${Math.abs(balanceDifference).toLocaleString()}`);
      }
      
      // Show party details if not balanced
      if (balanceDifference !== 0) {
        console.log(`\n📋 Party Details:`);
        partyBalances.forEach((balance, partyName) => {
          if (balance.closingBalance !== 0) {
            console.log(`  ${partyName}: ${balance.closingBalance > 0 ? 'Credit' : 'Debit'} ₹${Math.abs(balance.closingBalance).toLocaleString()} (${balance.entryCount} entries)`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
checkAllUsersTrialBalance();
