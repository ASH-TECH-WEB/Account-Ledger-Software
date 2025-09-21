const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ WARNING: Missing required environment variables');
  console.error('Please ensure the following environment variables are set:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_ANON_KEY');
  console.error('Database operations will fail until these are configured.');
}

// Create Supabase client (only if we have the required environment variables)
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Test connection
const testConnection = async () => {
  try {
    if (!supabase) {
      console.log('Supabase client not initialized - missing environment variables');
      return false;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

module.exports = {
  supabase,
  testConnection
};
