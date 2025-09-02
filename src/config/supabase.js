const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL ERROR: Missing required environment variables');
  console.error('Please ensure the following environment variables are set:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  supabase,
  testConnection
};
