/**
 * Simple Authentication Test
 * Tests the basic authentication endpoints
 */

const axios = require('axios');

const testSimpleAuth = async () => {
  console.log('🧪 Testing Simple Authentication...\n');
  
  try {
    // Test 1: Basic GET to auth endpoint
    console.log('1. Testing GET /api/authentication...');
    try {
      const response = await axios.get('http://localhost:5000/api/authentication');
      console.log('✅ GET /api/authentication working:', response.status);
      console.log('   Response:', response.data.message);
    } catch (error) {
      console.log('❌ GET /api/authentication failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 2: Test auth status endpoint
    console.log('\n2. Testing GET /api/authentication/status...');
    try {
      const response = await axios.get('http://localhost:5000/api/authentication/status');
      console.log('✅ GET /api/authentication/status working:', response.status);
      console.log('   Response:', response.data.message);
    } catch (error) {
      console.log('❌ GET /api/authentication/status failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 3: Test login POST
    console.log('\n3. Testing POST /api/authentication/login...');
    try {
      const response = await axios.post('http://localhost:5000/api/authentication/login', {
        email: 'test@example.com',
        password: 'testpassword'
      });
      console.log('✅ POST /api/authentication/login working:', response.status);
    } catch (error) {
      if (error.response) {
        console.log('✅ POST /api/authentication/login responding:', error.response.status, error.response.data?.message || 'No message');
      } else {
        console.log('❌ POST /api/authentication/login failed:', error.message);
      }
    }
    
    console.log('\n🔍 Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run test
testSimpleAuth();
