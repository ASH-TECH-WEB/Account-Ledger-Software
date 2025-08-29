/**
 * Simple Authentication Test
 * Tests basic authentication functionality to identify the issue
 */

const axios = require('axios');

const testAuth = async () => {
  console.log('🧪 Testing Basic Authentication...\n');
  
  try {
    // Test 1: Basic health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('✅ Health endpoint working:', healthResponse.status);
    
    // Test 2: API health check
    console.log('\n2. Testing API health endpoint...');
    const apiHealthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ API health endpoint working:', apiHealthResponse.status);
    
    // Test 3: Try to access auth endpoint
    console.log('\n3. Testing auth endpoint...');
    try {
      const authResponse = await axios.get('http://localhost:5000/api/authentication');
      console.log('✅ Auth endpoint accessible:', authResponse.status);
    } catch (error) {
      console.log('❌ Auth endpoint error:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 4: Try POST to login
    console.log('\n4. Testing login POST...');
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/authentication/login', {
        email: 'test@example.com',
        password: 'testpassword'
      });
      console.log('✅ Login endpoint working:', loginResponse.status);
    } catch (error) {
      if (error.response) {
        console.log('✅ Login endpoint responding (expected error):', error.response.status, error.response.data?.message || 'No message');
      } else {
        console.log('❌ Login endpoint network error:', error.message);
      }
    }
    
    // Test 5: Check server logs
    console.log('\n5. Server status check...');
    console.log('Server should be running on port 5000');
    console.log('Check server console for any error messages');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run test
testAuth();
