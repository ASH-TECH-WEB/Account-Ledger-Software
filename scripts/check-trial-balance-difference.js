const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkTrialBalanceDifference() {
  try {
    console.log('🔍 Checking Final Trial Balance difference for thakuraadarsh1@gmail.com...');
    
    // Get user ID for thakuraadarsh1@gmail.com
    const { data: user, error: userError } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('email', 'thakuraadarsh1@gmail.com')
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return;
    }
    
    const userId = user.user_id;
    console.log(`👤 User ID: ${userId}`);
    
    // Get all parties for this user
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('party_name, status')
      .eq('user_id', userId);
    
    if (partiesError) {
      console.error('❌ Error fetching parties:', partiesError);
      return;
    }
    
    console.log(`\n📊 Found ${parties.length} parties:`);
    parties.forEach(party => {
      console.log(`  - ${party.party_name} (Status: ${party.status})`);
    });
    
    // Get all ledger entries for this user
    const { data: allEntries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('party_name, credit, debit, remarks, tns_type, balance')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (entriesError) {
      console.error('❌ Error fetching entries:', entriesError);
      return;
    }
    
    console.log(`\n📋 Found ${allEntries.length} total ledger entries`);
    
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
    console.log('\n📊 Party-wise Closing Balances:');
    const creditEntries = [];
    const debitEntries = [];
    
    partyBalances.forEach((balance, partyName) => {
      if (balance.closingBalance !== 0) {
        if (balance.closingBalance > 0) {
          creditEntries.push(balance);
        } else {
          debitEntries.push(balance);
        }
        
        console.log(`  ${partyName}: ${balance.closingBalance > 0 ? 'Credit' : 'Debit'} ₹${Math.abs(balance.closingBalance).toLocaleString()} (${balance.entryCount} entries)`);
      }
    });
    
    // Calculate totals
    const creditTotal = creditEntries.reduce((sum, entry) => sum + entry.closingBalance, 0);
    const debitTotal = Math.abs(debitEntries.reduce((sum, entry) => sum + entry.closingBalance, 0));
    const balanceDifference = creditTotal - debitTotal;
    
    console.log('\n📊 Final Trial Balance Summary:');
    console.log(`  Total Credit: ₹${creditTotal.toLocaleString()}`);
    console.log(`  Total Debit: ₹${debitTotal.toLocaleString()}`);
    console.log(`  Balance Difference: ₹${balanceDifference.toLocaleString()}`);
    
    if (balanceDifference > 0) {
      console.log(`  📈 Credit Higher by ₹${balanceDifference.toLocaleString()}`);
    } else if (balanceDifference < 0) {
      console.log(`  📉 Debit Higher by ₹${Math.abs(balanceDifference).toLocaleString()}`);
    } else {
      console.log(`  ✅ Balanced`);
    }
    
    // Check if Commission party is causing the difference
    const commissionBalance = partyBalances.get('Commission');
    if (commissionBalance) {
      console.log(`\n💰 Commission Party Details:`);
      console.log(`  Credit Total: ₹${commissionBalance.creditTotal.toLocaleString()}`);
      console.log(`  Debit Total: ₹${commissionBalance.debitTotal.toLocaleString()}`);
      console.log(`  Closing Balance: ₹${commissionBalance.closingBalance.toLocaleString()}`);
      console.log(`  Entry Count: ${commissionBalance.entryCount}`);
      
      if (commissionBalance.closingBalance === -200) {
        console.log(`  🎯 This is the source of the ₹200 difference!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
checkTrialBalanceDifference();
