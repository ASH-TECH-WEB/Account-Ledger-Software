/**
 * Set Vercel Environment Variables
 * 
 * This script will set all required environment variables for Vercel deployment
 */

const { execSync } = require('child_process');

const envVars = {
  'SUPABASE_URL': process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
  'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY',
  'POSTGRES_URL': process.env.POSTGRES_URL || 'YOUR_POSTGRES_URL',
  'JWT_SECRET': process.env.JWT_SECRET || 'YOUR_JWT_SECRET',
  'JWT_EXPIRES_IN': process.env.JWT_EXPIRES_IN || '7d',
  'CORS_ORIGIN': process.env.CORS_ORIGIN || 'https://escrow-account-ledger.web.app',
  'NODE_ENV': process.env.NODE_ENV || 'production',
  'PORT': process.env.PORT || '5000'
};

console.log('🔧 Setting Vercel Environment Variables...\n');

Object.entries(envVars).forEach(([key, value]) => {
  try {
    console.log(`Setting ${key}...`);
    const command = `vercel env add ${key} production`;
    execSync(`echo "${value}" | ${command}`, { stdio: 'pipe' });
    console.log(`✅ ${key} set successfully`);
  } catch (error) {
    console.log(`❌ Failed to set ${key}: ${error.message}`);
  }
});

console.log('\n🎉 Environment variables setup completed!');
console.log('Now redeploy the application with: vercel --prod');
