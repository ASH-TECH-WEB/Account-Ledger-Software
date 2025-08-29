/**
 * 📊 Performance Monitoring Configuration
 * Import this file to enable performance monitoring without changing existing code
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

// Performance monitoring configuration
export const MONITORING_CONFIG = {
  // 🎯 Metrics Collection
  metrics: {
    // Frontend metrics
    frontend: {
      renderTime: true,
      componentMount: true,
      memoryUsage: true,
      bundleSize: true,
      apiCallTime: true
    },
    
    // Backend metrics
    backend: {
      responseTime: true,
      databaseQueryTime: true,
      memoryUsage: true,
      cpuUsage: true,
      cacheHitRate: true
    },
    
    // Database metrics
    database: {
      connectionTime: true,
      queryTime: true,
      connectionPool: true,
      slowQueries: true
    }
  },

  // 📊 Performance Thresholds
  thresholds: {
    // Frontend thresholds
    frontend: {
      slowRender: 100,      // 100ms
      slowComponent: 50,    // 50ms
      highMemory: 100,      // 100MB
      slowAPI: 1000        // 1 second
    },
    
    // Backend thresholds
    backend: {
      slowResponse: 2000,   // 2 seconds
      slowDatabase: 5000,   // 5 seconds
      highMemory: 200,      // 200MB
      highCPU: 80          // 80%
    },
    
    // Database thresholds
    database: {
      slowConnection: 1000, // 1 second
      slowQuery: 3000,      // 3 seconds
      maxConnections: 20    // 20 connections
    }
  },

  // 📈 Reporting Configuration
  reporting: {
    // Real-time monitoring
    realtime: {
      enabled: true,
      interval: 5000,       // 5 seconds
      maxDataPoints: 1000   // Keep last 1000 data points
    },
    
    // Performance alerts
    alerts: {
      enabled: true,
      email: false,
      console: true,
      slack: false
    },
    
    // Performance reports
    reports: {
      daily: true,
      weekly: true,
      monthly: true,
      custom: true
    }
  },

  // 🔍 Data Collection
  collection: {
    // Sampling rate
    sampling: {
      enabled: true,
      rate: 0.1,            // Collect 10% of all metrics
      adaptive: true         // Adjust based on performance
    },
    
    // Data retention
    retention: {
      realtime: 24 * 60 * 60 * 1000,    // 24 hours
      daily: 30 * 24 * 60 * 60 * 1000,  // 30 days
      weekly: 12 * 7 * 24 * 60 * 60 * 1000, // 12 weeks
      monthly: 12 * 30 * 24 * 60 * 60 * 1000 // 12 months
    }
  }
};

// Performance dashboard configuration
export const DASHBOARD_CONFIG = {
  // 📊 Dashboard views
  views: {
    overview: {
      enabled: true,
      refreshInterval: 10000, // 10 seconds
      metrics: ['responseTime', 'memoryUsage', 'cpuUsage']
    },
    
    frontend: {
      enabled: true,
      refreshInterval: 5000,  // 5 seconds
      metrics: ['renderTime', 'componentMount', 'apiCallTime']
    },
    
    backend: {
      enabled: true,
      refreshInterval: 10000, // 10 seconds
      metrics: ['responseTime', 'databaseQueryTime', 'cacheHitRate']
    },
    
    database: {
      enabled: true,
      refreshInterval: 15000, // 15 seconds
      metrics: ['connectionTime', 'queryTime', 'connectionPool']
    }
  },

  // 📈 Charts and graphs
  charts: {
    lineCharts: true,
    barCharts: true,
    pieCharts: true,
    heatmaps: true,
    realtimeUpdates: true
  }
};

// Performance optimization suggestions
export const OPTIMIZATION_SUGGESTIONS = {
  // 🚀 Frontend optimizations
  frontend: {
    renderTime: {
      slow: 'Consider using React.memo and useMemo',
      verySlow: 'Implement virtual scrolling for large lists'
    },
    memoryUsage: {
      high: 'Check for memory leaks in useEffect',
      veryHigh: 'Implement component lazy loading'
    }
  },
  
  // 🗄️ Backend optimizations
  backend: {
    responseTime: {
      slow: 'Add database indexes',
      verySlow: 'Implement Redis caching'
    },
    memoryUsage: {
      high: 'Check for memory leaks',
      veryHigh: 'Implement garbage collection'
    }
  },
  
  // 🗄️ Database optimizations
  database: {
    queryTime: {
      slow: 'Add database indexes',
      verySlow: 'Optimize query structure'
    },
    connectionTime: {
      slow: 'Implement connection pooling',
      verySlow: 'Check network latency'
    }
  }
};

// Export all configurations
export default {
  MONITORING_CONFIG,
  DASHBOARD_CONFIG,
  OPTIMIZATION_SUGGESTIONS
};

// Usage example:
// import { MONITORING_CONFIG } from './performance-monitoring.config.js';
// 
// if (MONITORING_CONFIG.metrics.frontend.renderTime) {
//   // Monitor render time
// }
// 
// if (MONITORING_CONFIG.thresholds.frontend.slowRender) {
//   // Set slow render threshold
// }
