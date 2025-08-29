/**
 * 🚀 Server Performance Optimization Configuration
 * Import this file to enable server optimizations without changing existing code
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

// Server performance configuration
export const SERVER_CONFIG = {
  // 🗄️ Database Optimization
  database: {
    connectionPool: {
      enabled: true,
      min: 5,
      max: 20,
      idleTimeout: 30000,
      connectionTimeout: 2000
    },
    query: {
      timeout: 10000,
      maxConcurrent: 50,
      retryAttempts: 3,
      retryDelay: 1000
    },
    cache: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 60000
    }
  },

  // 🌐 API Optimization
  api: {
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return true;
      }
    },
    response: {
      cacheControl: 'public, max-age=300',
      etag: true,
      lastModified: true
    },
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: 'Too many requests, please try again later.'
    }
  },

  // 💾 Memory Optimization
  memory: {
    garbageCollection: {
      enabled: true,
      interval: 300000, // 5 minutes
      threshold: 100 * 1024 * 1024 // 100MB
    },
    cache: {
      enabled: true,
      maxSize: 100 * 1024 * 1024, // 100MB
      cleanupInterval: 60000 // 1 minute
    }
  },

  // 📊 Monitoring & Logging
  monitoring: {
    performance: {
      enabled: true,
      slowQueryThreshold: 1000, // 1 second
      memoryThreshold: 200 * 1024 * 1024, // 200MB
      cpuThreshold: 80 // 80%
    },
    logging: {
      level: 'info',
      format: 'combined',
      rotation: {
        enabled: true,
        maxSize: '10m',
        maxFiles: 5
      }
    }
  },

  // 🔒 Security Optimization
  security: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    },
    cors: {
      enabled: true,
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  }
};

// Cache configuration
export const CACHE_CONFIG = {
  redis: {
    enabled: false, // Set to true if Redis is available
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'account_ledger:'
  },
  memory: {
    enabled: true,
    maxSize: 1000,
    ttl: 300000, // 5 minutes
    cleanupInterval: 60000 // 1 minute
  }
};

// Performance monitoring configuration
export const PERFORMANCE_CONFIG = {
  metrics: {
    responseTime: true,
    memoryUsage: true,
    cpuUsage: true,
    databaseQueries: true,
    cacheHits: true
  },
  alerts: {
    slowResponse: 2000, // 2 seconds
    highMemory: 200 * 1024 * 1024, // 200MB
    highCPU: 80, // 80%
    databaseSlow: 5000 // 5 seconds
  },
  reporting: {
    console: true,
    file: true,
    external: false
  }
};

// Export all configurations
export default {
  SERVER_CONFIG,
  CACHE_CONFIG,
  PERFORMANCE_CONFIG
};

// Usage example (add to your server.js):
// import { SERVER_CONFIG } from './server-optimization.config.js';
// 
// if (SERVER_CONFIG.database.connectionPool.enabled) {
//   // Enable connection pooling
// }
// 
// if (SERVER_CONFIG.api.compression.enabled) {
//   // Enable compression
// }
