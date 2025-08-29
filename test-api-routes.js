/**
 * API Route Test Script
 * Tests the fixed API endpoints to ensure they're working correctly
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  results: []
};

// Add test result
const addResult = (endpoint, status, details) => {
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  testResults.results.push({
    endpoint,
    status,
    details
  });
  
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${endpoint}: ${details}`);
};

// Test API endpoint
const testEndpoint = async (endpoint, expectedStatus = 200, description = '') => {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      timeout: 5000
    });
    
    if (response.status === expectedStatus) {
      addResult(endpoint, 'PASS', `Status: ${response.status} - ${description}`);
    } else {
      addResult(endpoint, 'FAIL', `Expected ${expectedStatus}, got ${response.status} - ${description}`);
    }
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      if (error.response.status === expectedStatus) {
        addResult(endpoint, 'PASS', `Expected ${expectedStatus}, got ${error.response.status} - ${description}`);
      } else {
        addResult(endpoint, 'FAIL', `Expected ${expectedStatus}, got ${error.response.status} - ${error.response.data?.message || 'Error'} - ${description}`);
      }
    } else {
      // Network error or timeout
      addResult(endpoint, 'FAIL', `Network error: ${error.message} - ${description}`);
    }
  }
};

// Main test runner
const runTests = async () => {
  console.log('🧪 Testing Fixed API Routes...\n');
  console.log('=' .repeat(60));
  
  // Test health endpoints
  console.log('\n🏥 Testing Health Endpoints...\n');
  await testEndpoint('/health', 200, 'Main health check');
  await testEndpoint('/api/health', 200, 'API health check');
  
  // Test authentication endpoints (should return 401 without token)
  console.log('\n🔐 Testing Authentication Endpoints...\n');
  await testEndpoint('/api/authentication/login', 401, 'Login endpoint (no token)');
  await testEndpoint('/api/auth/login', 401, 'Alternative auth endpoint (no token)');
  
  // Test authentication endpoints with correct paths
  console.log('\n🔐 Testing Authentication Endpoints (Correct Paths)...\n');
  await testEndpoint('/api/authentication/login', 401, 'Login endpoint (no token)');
  await testEndpoint('/api/auth/login', 401, 'Alternative auth endpoint (no token)');
  
  // Test POST methods for login (should work)
  console.log('\n🔐 Testing Authentication POST Endpoints...\n');
  try {
    const response = await axios.post(`${BASE_URL}/api/authentication/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    }, { timeout: 5000 });
    addResult('/api/authentication/login (POST)', 'PASS', `Status: ${response.status} - Login endpoint working`);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      addResult('/api/authentication/login (POST)', 'PASS', `Status: ${error.response.status} - Login endpoint working (invalid credentials)`);
    } else {
      addResult('/api/authentication/login (POST)', 'FAIL', `Error: ${error.message}`);
    }
  }
  
  // Test dashboard endpoints (should return 401 without token)
  console.log('\n📊 Testing Dashboard Endpoints...\n');
  await testEndpoint('/api/dashboard', 401, 'Main dashboard endpoint (no token)');
  await testEndpoint('/api/dashboard/stats', 401, 'Dashboard stats (no token)');
  
  // Test party endpoints (should return 401 without token)
  console.log('\n👥 Testing Party Endpoints...\n');
  await testEndpoint('/api/parties', 401, 'Parties endpoint (no token)');
  await testEndpoint('/api/party-ledger', 401, 'Party ledger endpoint (no token)');
  
  // Test trial balance endpoints (should return 401 without token)
  console.log('\n⚖️ Testing Trial Balance Endpoints...\n');
  await testEndpoint('/api/final-trial-balance', 401, 'Trial balance endpoint (no token)');
  await testEndpoint('/api/final-trial-balance/refresh', 401, 'Trial balance refresh (no token)');
  
  // Test user settings endpoints (should return 401 without token)
  console.log('\n⚙️ Testing User Settings Endpoints...\n');
  await testEndpoint('/api/settings', 401, 'User settings endpoint (no token)');
  await testEndpoint('/api/user-settings', 401, 'Alternative user settings endpoint (no token)');
  
  // Test ledger entries endpoints (should return 401 without token)
  console.log('\n📝 Testing Ledger Endpoints...\n');
  await testEndpoint('/api/ledger-entries', 401, 'Ledger entries endpoint (no token)');
  
  // Test non-existent endpoints (should return 404)
  console.log('\n❌ Testing Non-existent Endpoints...\n');
  await testEndpoint('/api/non-existent', 404, 'Non-existent endpoint');
  await testEndpoint('/api/random/route', 404, 'Random route');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`🎯 Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  console.log('\n🔍 Detailed Results:');
  testResults.results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.endpoint}: ${result.details}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (testResults.failed === 0) {
    console.log('🎉 All tests passed! API routes are working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the details above.');
  }
  
  console.log('='.repeat(60));
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testResults
};
