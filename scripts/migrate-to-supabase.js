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
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    // Test Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError.message);
      return;
    }
    // Migrate Users
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
          }
      } catch (error) {
        }
    }
    // Migrate Parties
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
          }
      } catch (error) {
        }
    }
    // Migrate Ledger Entries
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
            }
        }
      } catch (error) {
        }
    }
    } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await mongoose.disconnect();
    }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };
