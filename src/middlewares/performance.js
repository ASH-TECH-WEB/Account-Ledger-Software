/**
 * Performance Monitoring Middleware
 * 
 * Comprehensive performance monitoring for API endpoints with
 * detailed metrics, slow query detection, and optimization recommendations.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const { getCache, setCache } = require('../config/redis');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 100,    // < 100ms
  GOOD: 500,         // < 500ms
  ACCEPTABLE: 1000,  // < 1s
  SLOW: 2000,        // < 2s
  CRITICAL: 5000     // > 5s
};

// Performance metrics storage
const performanceMetrics = {
  requests: new Map(),
  slowQueries: [],
  cacheStats: {
    hits: 0,
    misses: 0,
    totalRequests: 0
  }
};

/**
 * Get performance level based on response time
 */
const getPerformanceLevel = (responseTime) => {
  if (responseTime < PERFORMANCE_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
  if (responseTime < PERFORMANCE_THRESHOLDS.GOOD) return 'GOOD';
  if (responseTime < PERFORMANCE_THRESHOLDS.ACCEPTABLE) return 'ACCEPTABLE';
  if (responseTime < PERFORMANCE_THRESHOLDS.SLOW) return 'SLOW';
  return 'CRITICAL';
};

/**
 * Log performance metrics
 */
const logPerformance = (req, res, responseTime) => {
  const endpoint = `${req.method} ${req.path}`;
  const performanceLevel = getPerformanceLevel(responseTime);
  
  // Store metrics
  if (!performanceMetrics.requests.has(endpoint)) {
    performanceMetrics.requests.set(endpoint, {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      slowRequests: 0
    });
  }
  
  const metrics = performanceMetrics.requests.get(endpoint);
  metrics.count++;
  metrics.totalTime += responseTime;
  metrics.minTime = Math.min(metrics.minTime, responseTime);
  metrics.maxTime = Math.max(metrics.maxTime, responseTime);
  
  if (responseTime > PERFORMANCE_THRESHOLDS.SLOW) {
    metrics.slowRequests++;
    
    // Store slow query details
    performanceMetrics.slowQueries.push({
      endpoint,
      responseTime,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      query: req.query,
      body: req.method === 'POST' ? Object.keys(req.body) : null
    });
    
    // Keep only last 100 slow queries
    if (performanceMetrics.slowQueries.length > 100) {
      performanceMetrics.slowQueries.shift();
    }
  }
  
  // Log based on performance level
  const logMessage = `📊 ${endpoint} - ${responseTime}ms (${performanceLevel})`;
  
  switch (performanceLevel) {
    case 'EXCELLENT':
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ${logMessage}`);
      }
      break;
    case 'GOOD':
      if (process.env.NODE_ENV === 'development') {
        console.log(`👍 ${logMessage}`);
      }
      break;
    case 'ACCEPTABLE':
      console.log(`⚠️ ${logMessage}`);
      break;
    case 'SLOW':
      console.warn(`🐌 ${logMessage}`);
      break;
    case 'CRITICAL':
      console.error(`🚨 ${logMessage}`);
      break;
  }
};

/**
 * Cache performance tracking
 */
const trackCachePerformance = (cacheHit) => {
  performanceMetrics.cacheStats.totalRequests++;
  if (cacheHit) {
    performanceMetrics.cacheStats.hits++;
  } else {
    performanceMetrics.cacheStats.misses++;
  }
};

/**
 * Main performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Track cache performance for specific endpoints
  const originalJson = res.json;
  res.json = function(data) {
    // Check if this was a cached response
    if (data && data.metadata && data.metadata.cacheStatus) {
      trackCachePerformance(data.metadata.cacheStatus === 'hit');
    }
    
    return originalJson.call(this, data);
  };
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logPerformance(req, res, responseTime);
    
    // Add performance headers
    res.set('X-Response-Time', `${responseTime}ms`);
    res.set('X-Performance-Level', getPerformanceLevel(responseTime));
  });
  
  next();
};

/**
 * Get performance statistics
 */
const getPerformanceStats = () => {
  const stats = {
    endpoints: {},
    cacheStats: performanceMetrics.cacheStats,
    slowQueries: performanceMetrics.slowQueries.slice(-10), // Last 10 slow queries
    recommendations: []
  };
  
  // Calculate endpoint statistics
  for (const [endpoint, metrics] of performanceMetrics.requests) {
    stats.endpoints[endpoint] = {
      totalRequests: metrics.count,
      averageResponseTime: Math.round(metrics.totalTime / metrics.count),
      minResponseTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
      maxResponseTime: metrics.maxTime,
      slowRequests: metrics.slowRequests,
      slowRequestPercentage: Math.round((metrics.slowRequests / metrics.count) * 100)
    };
  }
  
  // Generate recommendations
  if (performanceMetrics.cacheStats.totalRequests > 0) {
    const cacheHitRate = (performanceMetrics.cacheStats.hits / performanceMetrics.cacheStats.totalRequests) * 100;
    
    if (cacheHitRate < 50) {
      stats.recommendations.push('Cache hit rate is low. Consider increasing cache TTL or improving cache keys.');
    }
    
    if (cacheHitRate > 80) {
      stats.recommendations.push('Excellent cache performance! Cache is working effectively.');
    }
  }
  
  // Check for slow endpoints
  for (const [endpoint, metrics] of performanceMetrics.requests) {
    const avgTime = metrics.totalTime / metrics.count;
    if (avgTime > PERFORMANCE_THRESHOLDS.SLOW) {
      stats.recommendations.push(`Endpoint ${endpoint} is slow (avg: ${Math.round(avgTime)}ms). Consider optimization.`);
    }
  }
  
  return stats;
};

/**
 * Clear performance metrics
 */
const clearPerformanceMetrics = () => {
  performanceMetrics.requests.clear();
  performanceMetrics.slowQueries.length = 0;
  performanceMetrics.cacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };
};

/**
 * Performance health check
 */
const getPerformanceHealth = () => {
  const stats = getPerformanceStats();
  const totalRequests = Object.values(stats.endpoints).reduce((sum, ep) => sum + ep.totalRequests, 0);
  
  if (totalRequests === 0) {
    return {
      status: 'healthy',
      message: 'No requests processed yet',
      score: 100
    };
  }
  
  // Calculate performance score
  let score = 100;
  let issues = [];
  
  // Check cache performance
  if (stats.cacheStats.totalRequests > 0) {
    const cacheHitRate = (stats.cacheStats.hits / stats.cacheStats.totalRequests) * 100;
    if (cacheHitRate < 50) {
      score -= 20;
      issues.push('Low cache hit rate');
    }
  }
  
  // Check slow endpoints
  for (const [endpoint, metrics] of Object.entries(stats.endpoints)) {
    const avgTime = metrics.averageResponseTime;
    if (avgTime > PERFORMANCE_THRESHOLDS.SLOW) {
      score -= 15;
      issues.push(`Slow endpoint: ${endpoint}`);
    }
    
    if (metrics.slowRequestPercentage > 20) {
      score -= 10;
      issues.push(`High slow request rate: ${endpoint}`);
    }
  }
  
  // Determine health status
  let status = 'healthy';
  if (score < 70) status = 'degraded';
  if (score < 50) status = 'unhealthy';
  
  return {
    status,
    score: Math.max(0, score),
    issues,
    totalRequests,
    recommendations: stats.recommendations
  };
};

module.exports = {
  performanceMonitor,
  getPerformanceStats,
  clearPerformanceMetrics,
  getPerformanceHealth,
  trackCachePerformance,
  getPerformanceLevel
};
