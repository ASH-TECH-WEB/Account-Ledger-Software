/**
 * Create All Related Entries Script
 * 
 * This script will:
 * 1. Get all users and their existing transactions
 * 2. For each transaction, create missing related entries:
 *    - If transaction is with Take/Give party, create opposite entry in other party
 *    - Create Commission entry (3% of transaction amount)
 *    - Create Company entry (opposite transaction type)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function to create related entries for a transaction
const createRelatedEntries = async (userId, transaction, companyName) => {
  const results = {
    commissionCreated: false,
    companyCreated: false,
    oppositePartyCreated: false
  };

  try {
    const amount = transaction.tns_type === 'CR' ? transaction.credit : transaction.debit;
    const partyName = transaction.party_name;
    
    // Skip if it's already a Commission or Company transaction
    if (partyName === 'Commission' || partyName === companyName) {
      return results;
    }

    // Skip settlement transactions
    if (transaction.remarks && (
      transaction.remarks.includes('Monday Final Settlement') ||
      transaction.remarks.includes('Monday Settlement') ||
      transaction.remarks.includes('Settlement')
    )) {
      return results;
    }

    // 1. Create Commission entry (3% of transaction amount)
    const commissionAmount = (amount * 3) / 100;
    const commissionTnsType = transaction.tns_type === 'CR' ? 'CR' : 'DR';
    
    const commissionEntry = {
      user_id: userId,
      party_name: 'Commission',
      remarks: `Commission Auto-calculated (3%) - ${transaction.remarks || 'Transaction'}`,
      tns_type: commissionTnsType,
      credit: commissionTnsType === 'CR' ? commissionAmount : 0,
      debit: commissionTnsType === 'DR' ? commissionAmount : 0,
      balance: 0,
      date: transaction.date,
      ti: `${Date.now() + Math.random()}::`,
      chk: false,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: commissionError } = await supabase
      .from('ledger_entries')
      .insert([commissionEntry]);

    if (!commissionError) {
      results.commissionCreated = true;
      console.log(`✅ Created commission entry: ₹${commissionAmount}`);
    } else {
      console.error(`❌ Error creating commission entry:`, commissionError);
    }

    // 2. Create Company entry (opposite transaction type)
    const companyEntry = {
      user_id: userId,
      party_name: companyName,
      remarks: `Transaction with ${partyName}`,
      tns_type: transaction.tns_type === 'CR' ? 'DR' : 'CR',
      credit: transaction.tns_type === 'CR' ? 0 : amount,
      debit: transaction.tns_type === 'CR' ? amount : 0,
      balance: 0,
      date: transaction.date,
      ti: `${Date.now() + Math.random() + 1}::`,
      chk: false,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: companyError } = await supabase
      .from('ledger_entries')
      .insert([companyEntry]);

    if (!companyError) {
      results.companyCreated = true;
      console.log(`✅ Created company entry: ₹${amount}`);
    } else {
      console.error(`❌ Error creating company entry:`, companyError);
    }

    // 3. Create opposite party entry if it's Take/Give transaction
    if (partyName === 'Take' || partyName === 'Give') {
      const oppositePartyName = partyName === 'Take' ? 'Give' : 'Take';
      
      const oppositeEntry = {
        user_id: userId,
        party_name: oppositePartyName,
        remarks: `Transaction with ${partyName}`,
        tns_type: transaction.tns_type === 'CR' ? 'DR' : 'CR',
        credit: transaction.tns_type === 'CR' ? 0 : amount,
        debit: transaction.tns_type === 'CR' ? amount : 0,
        balance: 0,
        date: transaction.date,
        ti: `${Date.now() + Math.random() + 2}::`,
        chk: false,
        is_old_record: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: oppositeError } = await supabase
        .from('ledger_entries')
        .insert([oppositeEntry]);

      if (!oppositeError) {
        results.oppositePartyCreated = true;
        console.log(`✅ Created opposite party entry: ${oppositePartyName} - ₹${amount}`);
      } else {
        console.error(`❌ Error creating opposite party entry:`, oppositeError);
      }
    }

  } catch (error) {
    console.error(`❌ Error creating related entries for transaction ${transaction.id}:`, error);
  }

  return results;
};

// Main function to process all users
const createAllRelatedEntries = async () => {
  console.log('🚀 Starting to create all related entries...');
  
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, company_account')
      .eq('is_approved', true);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`📊 Found ${users.length} approved users`);

    let totalProcessed = 0;
    let totalCommissionEntries = 0;
    let totalCompanyEntries = 0;
    let totalOppositeEntries = 0;

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.name} (${user.email})`);
      
      const companyName = user.company_account || 'AQC';
      
      // Get user's existing transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_old_record', false)
        .order('created_at', { ascending: true });

      if (transactionsError) {
        console.error(`❌ Error fetching transactions for user ${user.id}:`, transactionsError);
        continue;
      }

      console.log(`📊 Found ${transactions.length} transactions for user ${user.name}`);

      // Process each transaction
      for (const transaction of transactions) {
        console.log(`\n📝 Processing transaction: ${transaction.party_name} - ₹${transaction.tns_type === 'CR' ? transaction.credit : transaction.debit}`);
        
        const results = await createRelatedEntries(user.id, transaction, companyName);
        
        if (results.commissionCreated) totalCommissionEntries++;
        if (results.companyCreated) totalCompanyEntries++;
        if (results.oppositePartyCreated) totalOppositeEntries++;
      }

      totalProcessed++;
      console.log(`✅ Completed processing user ${user.name}`);
    }

    console.log('\n🎉 Script completed successfully!');
    console.log(`📊 Total users processed: ${totalProcessed}`);
    console.log(`📊 Total Commission entries created: ${totalCommissionEntries}`);
    console.log(`📊 Total Company entries created: ${totalCompanyEntries}`);
    console.log(`📊 Total Opposite party entries created: ${totalOppositeEntries}`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
};

// Run the script
createAllRelatedEntries()
  .then(() => {
    console.log('✅ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
