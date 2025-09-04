/**
 * Set Vercel Environment Variables
 * 
 * This script will set all required environment variables for Vercel deployment
 */

const { execSync } = require('child_process');

const envVars = {
  'SUPABASE_URL': 'https://fwbizsvzkwzfahvgnegr.supabase.co',
  'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Yml6c3Z6a3d6ZmFodmduZWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MDYxMzAsImV4cCI6MjA3MDE4MjEzMH0.3cakpeaWMbGpc_S3Ia5ZD444Z5jX6xYHqm8tXmNva7U',
  'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Yml6c3Z6a3d6ZmFodmduZWdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYwNjEzMCwiZXhwIjoyMDcwMTgyMTMwfQ.X0CeWhRaQOwQZMtn0WXb1WW-F5lGD1c1HhOxUXIK4BQ',
  'POSTGRES_URL': 'postgresql://postgres:count123@db.fwbizsvzkwzfahvgnegr.supabase.co:5432/postgres',
  'JWT_SECRET': 'your-super-secret-jwt-key-change-this-in-production-USE-STRONG-SECRET-IN-PRODUCTION',
  'JWT_EXPIRES_IN': '7d',
  'CORS_ORIGIN': 'https://escrow-account-ledger.web.app',
  'NODE_ENV': 'production',
  'PORT': '5000'
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
