/**
 * Real-Time Performance Testing Script
 * Tests actual API endpoints and measures real response times
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_USER_ID = 'bbe8425d-6c26-435e-babf-1c0e023b8d3e';

// Performance testing utilities
const performanceTest = {
  startTime: 0,
  endTime: 0,
  
  start() {
    this.startTime = Date.now();
    return this.startTime;
  },
  
  end() {
    this.endTime = Date.now();
    return this.endTime - this.startTime;
  },
  
  log(operation, duration, details = '') {
    const status = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴';
    console.log(`${status} ${operation}: ${duration}ms ${details}`);
    return duration;
  }
};

// Test results storage
const realTimeResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  totalTime: 0,
  results: [],
  apiTests: []
};

// Add test result
const addResult = (testName, duration, status, details = '', apiEndpoint = '') => {
  realTimeResults.totalTests++;
  realTimeResults.totalTime += duration;
  
  if (status === 'PASS') {
    realTimeResults.passedTests++;
  } else {
    realTimeResults.failedTests++;
  }
  
  const result = {
    test: testName,
    duration: duration + 'ms',
    status,
    details,
    apiEndpoint
  };
  
  realTimeResults.results.push(result);
  if (apiEndpoint) {
    realTimeResults.apiTests.push(result);
  }
};

// Test API endpoint performance
const testAPIEndpoint = async (endpoint, method = 'GET', data = null, description = '') => {
  performanceTest.start();
  
  try {
    const config = {
      method: method.toLowerCase(),
      url: `${BASE_URL}${endpoint}`,
      timeout: 10000
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    const duration = performanceTest.end();
    const status = response.status === 200 || response.status === 201 ? 'PASS' : 'FAIL';
    
    performanceTest.log(`${method} ${endpoint}`, duration, `✅ Status: ${response.status}`);
    addResult(`${method} ${endpoint}`, duration, status, description, endpoint);
    
    return {
      success: true,
      duration,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    const duration = performanceTest.end();
    const errorMessage = error.response?.data?.message || error.message;
    
    performanceTest.log(`${method} ${endpoint}`, duration, `❌ Error: ${errorMessage}`);
    addResult(`${method} ${endpoint}`, duration, 'FAIL', `Error: ${errorMessage}`, endpoint);
    
    return {
      success: false,
      duration,
      error: errorMessage
    };
  }
};

// Test specific API endpoints
const testAuthEndpoints = async () => {
  console.log('\n🔐 Testing Authentication Endpoints...\n');
  
  // Test health check
  await testAPIEndpoint('/health', 'GET', null, 'Health check endpoint');
  
  // Test login endpoint (without actual credentials)
  await testAPIEndpoint('/auth/login', 'POST', {
    email: 'test@example.com',
    password: 'testpassword'
  }, 'Login endpoint (expected to fail with invalid credentials)');
};

const testDashboardEndpoints = async () => {
  console.log('\n📊 Testing Dashboard Endpoints...\n');
  
  // Test dashboard data
  await testAPIEndpoint('/dashboard', 'GET', null, 'Dashboard data fetch');
  
  // Test dashboard with user ID
  await testAPIEndpoint(`/dashboard/${TEST_USER_ID}`, 'GET', null, 'Dashboard data for specific user');
};

const testPartyEndpoints = async () => {
  console.log('\n👥 Testing Party Endpoints...\n');
  
  // Test get all parties
  await testAPIEndpoint('/parties', 'GET', null, 'Get all parties');
  
  // Test get parties for specific user
  await testAPIEndpoint(`/parties/${TEST_USER_ID}`, 'GET', null, 'Get parties for specific user');
  
  // Test party ledger
  await testAPIEndpoint(`/party-ledger/Raj`, 'GET', null, 'Party ledger for Raj');
};

const testLedgerEndpoints = async () => {
  console.log('\n📝 Testing Ledger Endpoints...\n');
  
  // Test get all ledger entries
  await testAPIEndpoint('/ledger-entries', 'GET', null, 'Get all ledger entries');
  
  // Test get ledger entries for specific user
  await testAPIEndpoint(`/ledger-entries/${TEST_USER_ID}`, 'GET', null, 'Get ledger entries for specific user');
};

const testTrialBalanceEndpoints = async () => {
  console.log('\n⚖️ Testing Trial Balance Endpoints...\n');
  
  // Test get trial balance
  await testAPIEndpoint('/final-trial-balance', 'GET', null, 'Get trial balance');
  
  // Test get trial balance for specific user
  await testAPIEndpoint(`/final-trial-balance/${TEST_USER_ID}`, 'GET', null, 'Get trial balance for specific user');
  
  // Test force refresh
  await testAPIEndpoint('/final-trial-balance/refresh', 'GET', null, 'Force refresh trial balance');
  
  // Test performance metrics
  await testAPIEndpoint('/final-trial-balance/performance', 'GET', null, 'Get performance metrics');
};

const testUserSettingsEndpoints = async () => {
  console.log('\n⚙️ Testing User Settings Endpoints...\n');
  
  // Test get user settings
  await testAPIEndpoint(`/user-settings/${TEST_USER_ID}`, 'GET', null, 'Get user settings');
};

// Load testing function
const loadTest = async (endpoint, method = 'GET', iterations = 10) => {
  console.log(`\n🚀 Load Testing: ${method} ${endpoint} (${iterations} iterations)...\n`);
  
  const times = [];
  const errors = [];
  
  for (let i = 0; i < iterations; i++) {
    performanceTest.start();
    
    try {
      const config = {
        method: method.toLowerCase(),
        url: `${BASE_URL}${endpoint}`,
        timeout: 10000
      };
      
      const response = await axios(config);
      const duration = performanceTest.end();
      
      times.push(duration);
      process.stdout.write(`\r🔄 Iteration ${i + 1}/${iterations} - ${duration}ms`);
      
    } catch (error) {
      const duration = performanceTest.end();
      times.push(duration);
      errors.push(error.message);
      process.stdout.write(`\r🔄 Iteration ${i + 1}/${iterations} - ${duration}ms (ERROR)`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n');
  
  // Calculate statistics
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const errorRate = (errors.length / iterations) * 100;
  
  console.log(`📊 Load Test Results for ${method} ${endpoint}:`);
  console.log(`   Average Time: ${avgTime.toFixed(2)}ms`);
  console.log(`   Min Time: ${minTime}ms`);
  console.log(`   Max Time: ${maxTime}ms`);
  console.log(`   Error Rate: ${errorRate.toFixed(1)}%`);
  console.log(`   Total Requests: ${iterations}`);
  console.log(`   Successful: ${iterations - errors.length}`);
  console.log(`   Failed: ${errors.length}`);
  
  return { avgTime, minTime, maxTime, errorRate, times, errors };
};

// Main performance test runner
const runRealTimePerformanceTests = async () => {
  console.log('🚀 Starting Real-Time Performance Tests...\n');
  console.log('=' .repeat(80));
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`👤 Test User ID: ${TEST_USER_ID}`);
  console.log('=' .repeat(80));
  
  const overallStart = performance.now();
  
  try {
    // Test all API endpoints
    await testAuthEndpoints();
    await testDashboardEndpoints();
    await testPartyEndpoints();
    await testLedgerEndpoints();
    await testTrialBalanceEndpoints();
    await testUserSettingsEndpoints();
    
    // Load testing for critical endpoints
    console.log('\n🔥 Load Testing Critical Endpoints...\n');
    
    await loadTest('/dashboard', 'GET', 15);
    await loadTest('/final-trial-balance', 'GET', 15);
    await loadTest('/ledger-entries', 'GET', 15);
    
    // Overall performance
    const overallDuration = performance.now() - overallStart;
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 REAL-TIME PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(80));
    
    // Display all results
    realTimeResults.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.duration} - ${result.details}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`🎯 Total Tests: ${realTimeResults.totalTests}`);
    console.log(`✅ Passed: ${realTimeResults.passedTests}`);
    console.log(`❌ Failed: ${realTimeResults.failedTests}`);
    console.log(`⏱️ Total Time: ${overallDuration.toFixed(2)}ms`);
    console.log(`📊 Average Time: ${(realTimeResults.totalTime / realTimeResults.totalTests).toFixed(2)}ms`);
    
    // Performance rating
    const avgTime = realTimeResults.totalTime / realTimeResults.totalTests;
    let rating = '🟢 EXCELLENT';
    if (avgTime > 500) rating = '🔴 POOR';
    else if (avgTime > 200) rating = '🟡 GOOD';
    
    console.log(`🏆 Performance Rating: ${rating}`);
    console.log('='.repeat(80));
    
    // API-specific analysis
    console.log('\n🔍 API PERFORMANCE ANALYSIS:');
    const apiPerformance = {};
    
    realTimeResults.apiTests.forEach(test => {
      const endpoint = test.apiEndpoint;
      if (!apiPerformance[endpoint]) {
        apiPerformance[endpoint] = { total: 0, count: 0, errors: 0 };
      }
      
      const duration = parseInt(test.duration);
      apiPerformance[endpoint].total += duration;
      apiPerformance[endpoint].count += 1;
      
      if (test.status === 'FAIL') {
        apiPerformance[endpoint].errors += 1;
      }
    });
    
    Object.entries(apiPerformance).forEach(([endpoint, stats]) => {
      const avgTime = stats.total / stats.count;
      const errorRate = (stats.errors / stats.count) * 100;
      const status = avgTime < 200 ? '🟢' : avgTime < 500 ? '🟡' : '🔴';
      
      console.log(`${status} ${endpoint}: ${avgTime.toFixed(0)}ms avg, ${errorRate.toFixed(1)}% error rate`);
    });
    
    // Recommendations
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
    if (avgTime > 500) {
      console.log('🔴 High response times detected. Consider:');
      console.log('   - Database query optimization');
      console.log('   - Caching implementation');
      console.log('   - Code optimization');
      console.log('   - Load balancing');
    } else if (avgTime > 200) {
      console.log('🟡 Moderate response times. Consider:');
      console.log('   - Light caching for frequently accessed data');
      console.log('   - Query optimization for large datasets');
      console.log('   - Connection pooling');
    } else {
      console.log('🟢 Excellent performance! System is well-optimized.');
      console.log('   - Fast API responses');
      console.log('   - Efficient data processing');
      console.log('   - Good error handling');
    }
    
  } catch (error) {
    console.error('❌ Real-time performance test failed:', error.message);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runRealTimePerformanceTests();
}

module.exports = {
  runRealTimePerformanceTests,
  performanceTest,
  realTimeResults,
  loadTest
};
