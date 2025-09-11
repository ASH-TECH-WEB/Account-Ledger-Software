/**
 * Create Missing Commission and Company Entries Script
 * 
 * This script will:
 * 1. Get all users from the database
 * 2. For each user, find their existing transactions
 * 3. Create missing Commission and Company party entries
 * 4. Ensure all related parties have proper entries
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function to create Commission entry
const createCommissionEntry = async (userId, transaction, companyName) => {
  try {
    // Calculate commission amount (3% default)
    const amount = transaction.tns_type === 'CR' ? transaction.credit : transaction.debit;
    const commissionAmount = (amount * 3) / 100;
    
    // Determine commission transaction type
    const commissionTnsType = transaction.tns_type === 'CR' ? 'CR' : 'DR';
    
    const commissionEntry = {
      user_id: userId,
      party_name: 'Commission',
      remarks: `Commission Auto-calculated (3%) - ${transaction.remarks || 'Transaction'}`,
      tns_type: commissionTnsType,
      credit: commissionTnsType === 'CR' ? commissionAmount : 0,
      debit: commissionTnsType === 'DR' ? commissionAmount : 0,
      balance: 0, // Will be calculated by backend
      date: transaction.date,
      ti: `${Date.now() + Math.random()}::`,
      chk: false,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([commissionEntry])
      .select();

    if (error) {
      console.error(`❌ Error creating commission entry for user ${userId}:`, error);
      return false;
    }

    console.log(`✅ Created commission entry for user ${userId}: ₹${commissionAmount}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating commission entry for user ${userId}:`, error);
    return false;
  }
};

// Helper function to create Company entry
const createCompanyEntry = async (userId, transaction, companyName) => {
  try {
    const amount = transaction.tns_type === 'CR' ? transaction.credit : transaction.debit;
    
    const companyEntry = {
      user_id: userId,
      party_name: companyName,
      remarks: `Transaction with ${transaction.party_name}`,
      tns_type: transaction.tns_type === 'CR' ? 'DR' : 'CR', // Opposite transaction type
      credit: transaction.tns_type === 'CR' ? 0 : amount,
      debit: transaction.tns_type === 'CR' ? amount : 0,
      balance: 0, // Will be calculated by backend
      date: transaction.date,
      ti: `${Date.now() + Math.random() + 1}::`,
      chk: false,
      is_old_record: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([companyEntry])
      .select();

    if (error) {
      console.error(`❌ Error creating company entry for user ${userId}:`, error);
      return false;
    }

    console.log(`✅ Created company entry for user ${userId}: ₹${amount}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating company entry for user ${userId}:`, error);
    return false;
  }
};

// Main function to process all users
const createMissingEntries = async () => {
  console.log('🚀 Starting to create missing Commission and Company entries...');
  
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

      // Get existing Commission and Company entries
      const { data: existingEntries, error: entriesError } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', user.id)
        .in('party_name', ['Commission', companyName])
        .eq('is_old_record', false);

      if (entriesError) {
        console.error(`❌ Error fetching existing entries for user ${user.id}:`, entriesError);
        continue;
      }

      const existingCommissionEntries = existingEntries.filter(entry => entry.party_name === 'Commission');
      const existingCompanyEntries = existingEntries.filter(entry => entry.party_name === companyName);

      console.log(`📊 Existing entries - Commission: ${existingCommissionEntries.length}, Company: ${existingCompanyEntries.length}`);

      // Process each transaction
      for (const transaction of transactions) {
        // Skip if it's already a Commission or Company transaction
        if (transaction.party_name === 'Commission' || transaction.party_name === companyName) {
          continue;
        }

        // Skip if it's a settlement transaction
        if (transaction.remarks && (
          transaction.remarks.includes('Monday Final Settlement') ||
          transaction.remarks.includes('Monday Settlement') ||
          transaction.remarks.includes('Settlement')
        )) {
          continue;
        }

        // Check if Commission entry already exists for this transaction
        const commissionExists = existingCommissionEntries.some(entry => 
          entry.date === transaction.date && 
          Math.abs(entry.credit - entry.debit) === Math.abs((transaction.credit || 0) - (transaction.debit || 0)) * 0.03
        );

        if (!commissionExists) {
          const success = await createCommissionEntry(user.id, transaction, companyName);
          if (success) {
            totalCommissionEntries++;
          }
        }

        // Check if Company entry already exists for this transaction
        const companyExists = existingCompanyEntries.some(entry => 
          entry.date === transaction.date && 
          Math.abs(entry.credit - entry.debit) === Math.abs((transaction.credit || 0) - (transaction.debit || 0))
        );

        if (!companyExists) {
          const success = await createCompanyEntry(user.id, transaction, companyName);
          if (success) {
            totalCompanyEntries++;
          }
        }
      }

      totalProcessed++;
      console.log(`✅ Completed processing user ${user.name}`);
    }

    console.log('\n🎉 Script completed successfully!');
    console.log(`📊 Total users processed: ${totalProcessed}`);
    console.log(`📊 Total Commission entries created: ${totalCommissionEntries}`);
    console.log(`📊 Total Company entries created: ${totalCompanyEntries}`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
};

// Run the script
createMissingEntries()
  .then(() => {
    console.log('✅ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
