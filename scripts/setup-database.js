/**
 * Database Setup Script
 * 
 * This script sets up the database schema in Supabase
 * Run this after creating your Supabase project
 */

const { query } = require('../src/config/postgres');
const fs = require('fs');
const path = require('path');

const setupDatabase = async () => {
  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '../supabase-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split the SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await query(statement);
        successCount++;
        } catch (error) {
        errorCount++;
        }
    }

    if (errorCount === 0) {
      } else {
      }

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
