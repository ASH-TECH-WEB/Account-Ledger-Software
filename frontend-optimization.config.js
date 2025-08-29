/**
 * 🚀 Frontend Performance Optimization Configuration
 * Import this file to enable optimizations without changing existing code
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

// Performance optimization configuration
export const PERFORMANCE_CONFIG = {
  // 🎯 Component Optimization
  component: {
    memoization: true,
    lazyLoading: true,
    virtualScrolling: true,
    debounceDelay: 300,
    throttleDelay: 100
  },

  // 🗄️ Data Management
  data: {
    paginationSize: 50,
    maxCacheSize: 1000,
    cacheTTL: 300000, // 5 minutes
    prefetchThreshold: 0.8
  },

  // 🔍 Search Optimization
  search: {
    debounceMs: 300,
    minSearchLength: 2,
    maxResults: 100,
    highlightMatches: true
  },

  // 📊 Table Optimization
  table: {
    virtualScrolling: true,
    rowHeight: 50,
    visibleRows: 20,
    preloadRows: 10
  },

  // 🖼️ Image Optimization
  images: {
    lazyLoading: true,
    webpSupport: true,
    compression: true,
    placeholder: true
  },

  // 📦 Bundle Optimization
  bundle: {
    codeSplitting: true,
    treeShaking: true,
    minification: true,
    gzipCompression: true
  }
};

// Performance monitoring configuration
export const MONITORING_CONFIG = {
  enabled: true,
  metrics: {
    renderTime: true,
    apiResponseTime: true,
    memoryUsage: true,
    bundleSize: true
  },
  thresholds: {
    slowRender: 100, // ms
    slowAPI: 1000,   // ms
    highMemory: 100  // MB
  },
  reporting: {
    console: true,
    analytics: false,
    alerts: true
  }
};

// Cache configuration
export const CACHE_CONFIG = {
  localStorage: {
    enabled: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    expiration: 24 * 60 * 60 * 1000 // 24 hours
  },
  sessionStorage: {
    enabled: true,
    maxSize: 5 * 1024 * 1024, // 5MB
    expiration: 60 * 60 * 1000 // 1 hour
  },
  memory: {
    enabled: true,
    maxSize: 1000,
    expiration: 5 * 60 * 1000 // 5 minutes
  }
};

// API optimization configuration
export const API_CONFIG = {
  retry: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000
  },
  caching: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 100
  },
  compression: {
    enabled: true,
    gzip: true,
    brotli: true
  }
};

// Export all configurations
export default {
  PERFORMANCE_CONFIG,
  MONITORING_CONFIG,
  CACHE_CONFIG,
  API_CONFIG
};

// Usage example (add to your main App.tsx or index.tsx):
// import { PERFORMANCE_CONFIG } from './frontend-optimization.config.js';
// 
// if (PERFORMANCE_CONFIG.component.memoization) {
//   // Enable React.memo optimizations
// }
// 
// if (PERFORMANCE_CONFIG.data.paginationSize) {
//   // Set pagination size
// }
