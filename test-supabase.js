require('dotenv').config();

console.log('🔍 Environment Variables Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not Set');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not Set');

const { createClient } = require('@supabase/supabase-js');

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  console.log('\n🔗 Testing Supabase Connection...');
  
  supabase
    .from('users')
    .select('count')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Supabase Error:', error.message);
      } else {
        console.log('✅ Supabase Connected Successfully!');
        console.log('Data:', data);
      }
    })
    .catch(err => {
      console.log('❌ Supabase Connection Failed:', err.message);
    });
} else {
  console.log('\n❌ Missing required environment variables');
}
