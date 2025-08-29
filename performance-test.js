/**
 * Comprehensive Performance Testing Script
 * Tests loading times, refresh times, and all major functions
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test user ID (replace with actual user ID for testing)
const TEST_USER_ID = 'bbe8425d-6c26-435e-babf-1c0e023b8d3e';

// Performance testing utilities
const performanceTest = {
  startTime: 0,
  endTime: 0,
  
  start() {
    this.startTime = performance.now();
    return this.startTime;
  },
  
  end() {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  },
  
  log(operation, duration, details = '') {
    const status = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴';
    console.log(`${status} ${operation}: ${duration.toFixed(2)}ms ${details}`);
    return duration;
  }
};

// Test results storage
const testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  totalTime: 0,
  results: []
};

// Add test result
const addResult = (testName, duration, status, details = '') => {
  testResults.totalTests++;
  testResults.totalTime += duration;
  
  if (status === 'PASS') {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  
  testResults.results.push({
    test: testName,
    duration: duration.toFixed(2) + 'ms',
    status,
    details
  });
};

// Database connection test
const testDatabaseConnection = async () => {
  performanceTest.start();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    const duration = performanceTest.end();
    performanceTest.log('Database Connection', duration, '✅ Connected successfully');
    addResult('Database Connection', duration, 'PASS', 'Connected to Supabase');
    return true;
  } catch (error) {
    const duration = performanceTest.end();
    performanceTest.log('Database Connection', duration, '❌ Connection failed');
    addResult('Database Connection', duration, 'FAIL', error.message);
    return false;
  }
};

// User settings test
const testUserSettings = async () => {
  performanceTest.start();
  
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .single();
    
    if (error) throw error;
    
    const duration = performanceTest.end();
    performanceTest.log('User Settings', duration, `✅ Company: ${data.company_account || 'Not set'}`);
    addResult('User Settings', duration, 'PASS', `Company: ${data.company_account || 'Not set'}`);
    return data;
  } catch (error) {
    const duration = performanceTest.end();
    performanceTest.log('User Settings', duration, '❌ Failed to fetch');
    addResult('User Settings', duration, 'FAIL', error.message);
    return null;
  }
};

// Parties test
const testParties = async () => {
  performanceTest.start();
  
  try {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('user_id', TEST_USER_ID);
    
    if (error) throw error;
    
    const duration = performanceTest.end();
    performanceTest.log('Parties Fetch', duration, `✅ ${data.length} parties found`);
    addResult('Parties Fetch', duration, 'PASS', `${data.length} parties`);
    return data;
  } catch (error) {
    const duration = performanceTest.end();
    performanceTest.log('Parties Fetch', duration, '❌ Failed to fetch');
    addResult('Parties Fetch', duration, 'FAIL', error.message);
    return [];
  }
};

// Ledger entries test
const testLedgerEntries = async () => {
  performanceTest.start();
  
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    const duration = performanceTest.end();
    performanceTest.log('Ledger Entries', duration, `✅ ${data.length} entries found`);
    addResult('Ledger Entries', duration, 'PASS', `${data.length} entries`);
    return data;
  } catch (error) {
    const duration = performanceTest.end();
    performanceTest.log('Ledger Entries', duration, '❌ Failed to fetch');
    addResult('Ledger Entries', duration, 'FAIL', error.message);
    return [];
  }
};

// Dashboard calculations test
const testDashboardCalculations = async (entries) => {
  performanceTest.start();
  
  try {
    // Simulate dashboard calculations
    const totalCredit = entries
      .filter(entry => entry.tns_type === 'CR')
      .reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0);
    
    const totalDebit = entries
      .filter(entry => entry.tns_type === 'DR')
      .reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);
    
    const totalBalance = totalCredit - totalDebit;
    
    // Commission calculations
    let totalCommissionCollected = 0;
    let totalCommissionPaid = 0;
    
    entries.forEach(entry => {
      if (entry.remarks.includes('Commission')) {
        const amount = entry.tns_type === 'CR' ? parseFloat(entry.credit) : parseFloat(entry.debit);
        if (entry.tns_type === 'CR') {
          totalCommissionPaid += amount;
        } else {
          totalCommissionCollected += amount;
        }
      }
    });
    
    const duration = performanceTest.end();
    performanceTest.log('Dashboard Calculations', duration, `✅ Credit: ₹${totalCredit.toLocaleString()}, Debit: ₹${totalDebit.toLocaleString()}`);
    addResult('Dashboard Calculations', duration, 'PASS', `Credit: ₹${totalCredit.toLocaleString()}, Debit: ₹${totalDebit.toLocaleString()}`);
    
    return {
      totalCredit,
      totalDebit,
      totalBalance,
      totalCommissionCollected,
      totalCommissionPaid
    };
  } catch (error) {
    const duration = performanceTest.end();
    performanceTest.log('Dashboard Calculations', duration, '❌ Calculation failed');
    addResult('Dashboard Calculations', duration, 'FAIL', error.message);
    return null;
  }
};

// Trial balance test
const testTrialBalance = async (entries) => {
  performanceTest.start();
  
  try {
    // Simulate trial balance calculations
    const partyTransactions = new Map();
    
    entries.forEach(entry => {
      const partyName = entry.party_name;
      const credit = parseFloat(entry.credit) || 0;
      const debit = parseFloat(entry.debit) || 0;
      const remarks = entry.remarks || '';
      
      // Check for virtual parties
      const isCommission = remarks.toLowerCase().includes('commission');
      const isComp = remarks.toLowerCase().includes('comp');
      
      let displayName = partyName;
      if (isCommission) {
        displayName = 'Commission';
      } else if (isComp) {
        displayName = 'Comp';
      }
      
      if (!partyTransactions.has(displayName)) {
        partyTransactions.set(displayName, {
          name: displayName,
          creditTotal: 0,
          debitTotal: 0,
          balance: 0
        });
      }
      
      const partyEntry = partyTransactions.get(displayName);
      partyEntry.creditTotal += credit;
      partyEntry.debitTotal += debit;
      partyEntry.balance = partyEntry.creditTotal - partyEntry.debitTotal;
    });
    
    const trialBalance = Array.from(partyTransactions.values())
      .filter(party => party.creditTotal > 0 || party.debitTotal > 0);
    
    const duration = performanceTest.end();
    performanceTest.log('Trial Balance', duration, `✅ ${trialBalance.length} parties processed`);
    addResult('Trial Balance', duration, 'PASS', `${trialBalance.length} parties`);
    
    return trialBalance;
  } catch (error) {
    const duration = performanceTest.end();
    performanceTest.log('Trial Balance', duration, '❌ Calculation failed');
    addResult('Trial Balance', duration, 'FAIL', error.message);
    return [];
  }
};

// Cache performance test
const testCachePerformance = async () => {
  performanceTest.start();
  
  try {
    // Simulate cache operations
    const cache = new Map();
    const testData = { test: 'data', timestamp: Date.now() };
    
    // Set cache
    cache.set('test_key', testData);
    
    // Get cache
    const cachedData = cache.get('test_key');
    
    // Delete cache
    cache.delete('test_key');
    
    const duration = performanceTest.end();
    performanceTest.log('Cache Operations', duration, '✅ Set, Get, Delete operations');
    addResult('Cache Operations', duration, 'PASS', 'Cache operations successful');
    
    return true;
  } catch (error) {
    const duration = performanceTest.end();
    performanceTest.log('Cache Operations', duration, '❌ Cache operations failed');
    addResult('Cache Operations', duration, 'FAIL', error.message);
    return false;
  }
};

// Main performance test runner
const runPerformanceTests = async () => {
  console.log('🚀 Starting Comprehensive Performance Tests...\n');
  console.log('=' .repeat(80));
  
  const overallStart = performance.now();
  
  try {
    // Test 1: Database Connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.log('❌ Database connection failed. Stopping tests.');
      return;
    }
    
    console.log('\n📊 Testing Core Functions...\n');
    
    // Test 2: User Settings
    const userSettings = await testUserSettings();
    
    // Test 3: Parties
    const parties = await testParties();
    
    // Test 4: Ledger Entries
    const entries = await testLedgerEntries();
    
    console.log('\n🧮 Testing Calculations...\n');
    
    // Test 5: Dashboard Calculations
    const dashboardData = await testDashboardCalculations(entries);
    
    // Test 6: Trial Balance
    const trialBalance = await testTrialBalance(entries);
    
    console.log('\n⚡ Testing Performance Features...\n');
    
    // Test 7: Cache Performance
    await testCachePerformance();
    
    // Overall performance
    const overallDuration = performance.now() - overallStart;
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(80));
    
    // Display all results
    testResults.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.duration} - ${result.details}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`🎯 Total Tests: ${testResults.totalTests}`);
    console.log(`✅ Passed: ${testResults.passedTests}`);
    console.log(`❌ Failed: ${testResults.failedTests}`);
    console.log(`⏱️ Total Time: ${overallDuration.toFixed(2)}ms`);
    console.log(`📊 Average Time: ${(testResults.totalTime / testResults.totalTests).toFixed(2)}ms`);
    
    // Performance rating
    const avgTime = testResults.totalTime / testResults.totalTests;
    let rating = '🟢 EXCELLENT';
    if (avgTime > 500) rating = '🔴 POOR';
    else if (avgTime > 200) rating = '🟡 GOOD';
    
    console.log(`🏆 Performance Rating: ${rating}`);
    console.log('='.repeat(80));
    
    // Recommendations
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
    if (avgTime > 500) {
      console.log('🔴 High response times detected. Consider:');
      console.log('   - Database query optimization');
      console.log('   - Caching implementation');
      console.log('   - Code optimization');
    } else if (avgTime > 200) {
      console.log('🟡 Moderate response times. Consider:');
      console.log('   - Light caching for frequently accessed data');
      console.log('   - Query optimization for large datasets');
    } else {
      console.log('🟢 Excellent performance! System is well-optimized.');
    }
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runPerformanceTests();
}

module.exports = {
  runPerformanceTests,
  performanceTest,
  testResults
};
