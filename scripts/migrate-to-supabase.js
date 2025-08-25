/**
 * Migration Script: MongoDB to Supabase
 * 
 * This script migrates data from MongoDB to Supabase
 * Run this after setting up Supabase database
 */

const mongoose = require('mongoose');
const { supabase } = require('../src/config/supabase');
require('dotenv').config();

// MongoDB Models (for reading existing data)
// Note: Legacy User model removed, migration script needs update
const NewParty = require('../src/models/NewParty');
const LedgerEntry = require('../src/models/LedgerEntry');

const migrateData = async () => {
  try {
    console.log('🚀 Starting migration from MongoDB to Supabase...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError.message);
      return;
    }
    console.log('✅ Connected to Supabase');

    // Migrate Users
    console.log('\n📦 Migrating users...');
    const users = await User.find({});
    let migratedUsers = 0;
    
    for (const user of users) {
      try {
        const { error } = await supabase
          .from('users')
          .insert([{
            id: user._id.toString(),
            email: user.email,
            password_hash: user.password,
            name: user.name,
            phone: user.phone,
            created_at: user.createdAt,
            updated_at: user.updatedAt
          }]);

        if (!error) {
          migratedUsers++;
          console.log(`✅ Migrated user: ${user.email}`);
        }
      } catch (error) {
        console.log(`⚠️ Skipped user ${user.email}: ${error.message}`);
      }
    }
    console.log(`✅ Migrated ${migratedUsers} users`);

    // Migrate Parties
    console.log('\n📦 Migrating parties...');
    const parties = await NewParty.find({});
    let migratedParties = 0;
    
    for (const party of parties) {
      try {
        const { error } = await supabase
          .from('parties')
          .insert([{
            id: party._id.toString(),
            user_id: party.userId,
            party_name: party.partyName,
            sr_no: party.srNo,
            address: party.address,
            phone: party.phone,
            email: party.email,
            created_at: party.createdAt,
            updated_at: party.updatedAt
          }]);

        if (!error) {
          migratedParties++;
          console.log(`✅ Migrated party: ${party.partyName}`);
        }
      } catch (error) {
        console.log(`⚠️ Skipped party ${party.partyName}: ${error.message}`);
      }
    }
    console.log(`✅ Migrated ${migratedParties} parties`);

    // Migrate Ledger Entries
    console.log('\n📦 Migrating ledger entries...');
    const entries = await LedgerEntry.find({});
    let migratedEntries = 0;
    
    for (const entry of entries) {
      try {
        const { error } = await supabase
          .from('ledger_entries')
          .insert([{
            id: entry._id.toString(),
            user_id: entry.userId,
            party_name: entry.partyName,
            date: entry.date,
            remarks: entry.remarks,
            tns_type: entry.tnsType,
            debit: entry.debit || 0,
            credit: entry.credit || 0,
            balance: entry.balance || 0,
            chk: entry.chk || false,
            ti: entry.ti,
            is_old_record: entry.isOldRecord || false,
            settlement_date: entry.settlementDate,
            settlement_monday_final_id: entry.settlementMondayFinalId,
            created_at: entry.createdAt,
            updated_at: entry.updatedAt
          }]);

        if (!error) {
          migratedEntries++;
          if (migratedEntries % 100 === 0) {
            console.log(`✅ Migrated ${migratedEntries} entries...`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Skipped entry ${entry._id}: ${error.message}`);
      }
    }
    console.log(`✅ Migrated ${migratedEntries} ledger entries`);

    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${migratedUsers}`);
    console.log(`   - Parties: ${migratedParties}`);
    console.log(`   - Ledger Entries: ${migratedEntries}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };
