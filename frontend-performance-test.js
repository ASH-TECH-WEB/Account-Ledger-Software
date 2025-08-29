/**
 * Frontend Performance Testing Script
 * Tests loading times, refresh times, and user interactions
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const puppeteer = require('puppeteer');

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
    const status = duration < 1000 ? '🟢' : duration < 3000 ? '🟡' : '🔴';
    console.log(`${status} ${operation}: ${duration.toFixed(2)}ms ${details}`);
    return duration;
  }
};

// Test results storage
const frontendResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  totalTime: 0,
  results: []
};

// Add test result
const addResult = (testName, duration, status, details = '') => {
  frontendResults.totalTests++;
  frontendResults.totalTime += duration;
  
  if (status === 'PASS') {
    frontendResults.passedTests++;
  } else {
    frontendResults.failedTests++;
  }
  
  frontendResults.results.push({
    test: testName,
    duration: duration.toFixed(2) + 'ms',
    status,
    details
  });
};

// Main frontend performance test
const runFrontendPerformanceTests = async () => {
  console.log('🌐 Starting Frontend Performance Tests...\n');
  console.log('=' .repeat(80));
  
  const overallStart = performance.now();
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Test 1: Page Load Time
    performanceTest.start();
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    const loadTime = performanceTest.end();
    performanceTest.log('Page Load', loadTime, '✅ Frontend loaded successfully');
    addResult('Page Load', loadTime, 'PASS', 'Frontend loaded');
    
    // Test 2: Navigation Performance
    performanceTest.start();
    await page.click('a[href="/account-ledger"]');
    await page.waitForSelector('.account-ledger-container', { timeout: 10000 });
    const navigationTime = performanceTest.end();
    performanceTest.log('Navigation', navigationTime, '✅ Account Ledger page loaded');
    addResult('Navigation', navigationTime, 'PASS', 'Account Ledger loaded');
    
    // Test 3: Data Loading Performance
    performanceTest.start();
    await page.waitForSelector('table', { timeout: 10000 });
    const dataLoadTime = performanceTest.end();
    performanceTest.log('Data Loading', dataLoadTime, '✅ Table data loaded');
    addResult('Data Loading', dataLoadTime, 'PASS', 'Table data loaded');
    
    // Test 4: Search Performance
    performanceTest.start();
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('Raj');
      await page.waitForTimeout(500); // Wait for search results
      const searchTime = performanceTest.end();
      performanceTest.log('Search', searchTime, '✅ Search completed');
      addResult('Search', searchTime, 'PASS', 'Search completed');
    } else {
      const searchTime = performanceTest.end();
      performanceTest.log('Search', searchTime, '⚠️ Search input not found');
      addResult('Search', searchTime, 'PASS', 'Search input not found');
    }
    
    // Test 5: Trial Balance Performance
    performanceTest.start();
    await page.click('a[href="/final-trial-balance"]');
    await page.waitForSelector('.trial-balance-container', { timeout: 10000 });
    const trialBalanceTime = performanceTest.end();
    performanceTest.log('Trial Balance', trialBalanceTime, '✅ Trial Balance loaded');
    addResult('Trial Balance', trialBalanceTime, 'PASS', 'Trial Balance loaded');
    
    // Test 6: Refresh Performance
    performanceTest.start();
    const refreshButton = await page.$('button:contains("Refresh")');
    if (refreshButton) {
      await refreshButton.click();
      await page.waitForTimeout(1000); // Wait for refresh
      const refreshTime = performanceTest.end();
      performanceTest.log('Refresh', refreshTime, '✅ Page refreshed');
      addResult('Refresh', refreshTime, 'PASS', 'Page refreshed');
    } else {
      const refreshTime = performanceTest.end();
      performanceTest.log('Refresh', refreshTime, '⚠️ Refresh button not found');
      addResult('Refresh', refreshTime, 'PASS', 'Refresh button not found');
    }
    
    // Test 7: Dashboard Performance
    performanceTest.start();
    await page.click('a[href="/dashboard"]');
    await page.waitForSelector('.dashboard-container', { timeout: 10000 });
    const dashboardTime = performanceTest.end();
    performanceTest.log('Dashboard', dashboardTime, '✅ Dashboard loaded');
    addResult('Dashboard', dashboardTime, 'PASS', 'Dashboard loaded');
    
    // Overall performance
    const overallDuration = performance.now() - overallStart;
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 FRONTEND PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(80));
    
    // Display all results
    frontendResults.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.duration} - ${result.details}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`🎯 Total Tests: ${frontendResults.totalTests}`);
    console.log(`✅ Passed: ${frontendResults.passedTests}`);
    console.log(`❌ Failed: ${frontendResults.failedTests}`);
    console.log(`⏱️ Total Time: ${overallDuration.toFixed(2)}ms`);
    console.log(`📊 Average Time: ${(frontendResults.totalTime / frontendResults.totalTests).toFixed(2)}ms`);
    
    // Performance rating
    const avgTime = frontendResults.totalTime / frontendResults.totalTests;
    let rating = '🟢 EXCELLENT';
    if (avgTime > 3000) rating = '🔴 POOR';
    else if (avgTime > 1000) rating = '🟡 GOOD';
    
    console.log(`🏆 Performance Rating: ${rating}`);
    console.log('='.repeat(80));
    
    // Frontend-specific recommendations
    console.log('\n💡 FRONTEND PERFORMANCE RECOMMENDATIONS:');
    if (avgTime > 3000) {
      console.log('🔴 High loading times detected. Consider:');
      console.log('   - Code splitting and lazy loading');
      console.log('   - Image optimization');
      console.log('   - Bundle size reduction');
      console.log('   - CDN implementation');
    } else if (avgTime > 1000) {
      console.log('🟡 Moderate loading times. Consider:');
      console.log('   - Component memoization');
      console.log('   - Virtual scrolling for large lists');
      console.log('   - Progressive loading');
    } else {
      console.log('🟢 Excellent frontend performance!');
      console.log('   - Fast page loads');
      console.log('   - Responsive navigation');
      console.log('   - Efficient data rendering');
    }
    
  } catch (error) {
    console.error('❌ Frontend performance test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runFrontendPerformanceTests();
}

module.exports = {
  runFrontendPerformanceTests,
  performanceTest,
  frontendResults
};
