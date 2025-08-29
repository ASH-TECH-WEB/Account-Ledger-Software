/**
 * Debug Authentication Routes
 * Tests the exact route paths to identify the authentication issue
 */

const axios = require('axios');

const debugAuthRoutes = async () => {
  console.log('🔍 Debugging Authentication Routes...\n');
  console.log('=' .repeat(60));
  
  const baseURL = 'http://localhost:5000';
  
  // Test 1: Check if server is running
  console.log('1. Server Health Check...');
  try {
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Server running, health status:', healthResponse.status);
  } catch (error) {
    console.log('❌ Server not running:', error.message);
    return;
  }
  
  // Test 2: Check API health
  console.log('\n2. API Health Check...');
  try {
    const apiHealthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ API health working, status:', apiHealthResponse.status);
  } catch (error) {
    console.log('❌ API health failed:', error.response?.status || error.message);
  }
  
  // Test 3: Test exact auth route paths
  console.log('\n3. Testing Exact Auth Route Paths...');
  
  const authPaths = [
    '/api/authentication',
    '/api/authentication/login',
    '/api/auth',
    '/api/auth/login'
  ];
  
  for (const path of authPaths) {
    try {
      console.log(`\n   Testing: ${path}`);
      const response = await axios.get(`${baseURL}${path}`);
      console.log(`   ✅ GET ${path}: Status ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ GET ${path}: Status ${error.response.status} - ${error.response.data?.message || 'No message'}`);
      } else {
        console.log(`   ❌ GET ${path}: Network error - ${error.message}`);
      }
    }
  }
  
  // Test 4: Test POST to login
  console.log('\n4. Testing Login POST...');
  try {
    const loginResponse = await axios.post(`${baseURL}/api/authentication/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    });
    console.log('✅ Login POST working:', loginResponse.status);
  } catch (error) {
    if (error.response) {
      console.log('✅ Login POST responding (expected error):', error.response.status, error.response.data?.message || 'No message');
    } else {
      console.log('❌ Login POST network error:', error.message);
    }
  }
  
  // Test 5: Check route mounting
  console.log('\n5. Route Mounting Check...');
  console.log('   Backend routes should be mounted at:');
  console.log('   - /api/authentication/*');
  console.log('   - /api/auth/*');
  console.log('   Frontend calls: /authentication/login');
  console.log('   Full URL: http://localhost:5000/api/authentication/login');
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Debug Complete!');
  console.log('='.repeat(60));
};

// Run debug
debugAuthRoutes().catch(console.error);
