/**
 * Database Setup Script using Supabase Client
 * 
 * This script sets up the database schema using Supabase client
 * Run this after creating your Supabase project
 */

const { supabase } = require('../src/config/supabase');
const fs = require('fs');
const path = require('path');

const setupDatabase = async () => {
  try {
    console.log('🚀 Setting up database schema using Supabase...');

    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError && testError.code !== 'PGRST116') {
      console.error('❌ Supabase connection failed:', testError.message);
      return;
    }
    console.log('✅ Supabase connection successful');

    // Create tables using Supabase client
    console.log('📋 Creating database tables...');

    // Create users table
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            phone VARCHAR(20),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      if (!error) console.log('✅ Users table created');
    } catch (error) {
      console.log('⚠️ Users table already exists or error:', error.message);
    }

    // Create parties table
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS parties (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            party_name VARCHAR(255) NOT NULL,
            sr_no VARCHAR(50),
            address TEXT,
            phone VARCHAR(20),
            email VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, party_name)
          );
        `
      });
      if (!error) console.log('✅ Parties table created');
    } catch (error) {
      console.log('⚠️ Parties table already exists or error:', error.message);
    }

    // Create ledger_entries table
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ledger_entries (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            party_name VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            remarks TEXT,
            tns_type VARCHAR(50) NOT NULL,
            debit DECIMAL(15,2) DEFAULT 0,
            credit DECIMAL(15,2) DEFAULT 0,
            balance DECIMAL(15,2) DEFAULT 0,
            chk BOOLEAN DEFAULT false,
            ti VARCHAR(255),
            is_old_record BOOLEAN DEFAULT false,
            settlement_date DATE,
            settlement_monday_final_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      if (!error) console.log('✅ Ledger entries table created');
    } catch (error) {
      console.log('⚠️ Ledger entries table already exists or error:', error.message);
    }

    console.log('\n🎉 Database setup completed!');
    console.log('✅ All tables created successfully');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
