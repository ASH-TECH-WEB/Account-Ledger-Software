/**
 * Redis Configuration for Vercel Backend
 * 
 * Provides Redis client configuration with fallback to in-memory cache
 * for development and when Redis is not available.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const redis = require('redis');

// Redis configuration
const REDIS_CONFIG = {
  // Use Upstash Redis URL for Vercel deployment
  url: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL,
  // Fallback configuration for development
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  // Connection settings
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  // Timeout settings
  connectTimeout: 10000,
  commandTimeout: 5000
};

// In-memory fallback cache
const fallbackCache = new Map();
const FALLBACK_CONFIG = {
  TTL: 30 * 1000, // 30 seconds
  MAX_SIZE: 1000,
  CLEANUP_INTERVAL: 5 * 60 * 1000 // 5 minutes
};

// Cleanup old entries from fallback cache
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of fallbackCache.entries()) {
    if (now - value.timestamp > FALLBACK_CONFIG.TTL) {
      fallbackCache.delete(key);
    }
  }
}, FALLBACK_CONFIG.CLEANUP_INTERVAL);

let redisClient = null;
let isRedisConnected = false;

/**
 * Initialize Redis client
 */
const initializeRedis = async () => {
  try {
    if (redisClient) {
      return redisClient;
    }

    // Check if Redis URL is available
    if (!REDIS_CONFIG.url && !REDIS_CONFIG.host) {
      console.log('⚠️ Redis not configured, using in-memory fallback cache');
      return null;
    }

    // Create Redis client
    if (REDIS_CONFIG.url) {
      // Production: Use Redis URL (Upstash, Redis Cloud, etc.)
      redisClient = redis.createClient({
        url: REDIS_CONFIG.url,
        retryDelayOnFailover: REDIS_CONFIG.retryDelayOnFailover,
        maxRetriesPerRequest: REDIS_CONFIG.maxRetriesPerRequest,
        lazyConnect: REDIS_CONFIG.lazyConnect
      });
    } else {
      // Development: Use host/port
      redisClient = redis.createClient({
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
        password: REDIS_CONFIG.password,
        retryDelayOnFailover: REDIS_CONFIG.retryDelayOnFailover,
        maxRetriesPerRequest: REDIS_CONFIG.maxRetriesPerRequest,
        lazyConnect: REDIS_CONFIG.lazyConnect
      });
    }

    // Event handlers
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      isRedisConnected = true;
    });

    redisClient.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      isRedisConnected = false;
    });

    redisClient.on('end', () => {
      console.log('🔌 Redis connection ended');
      isRedisConnected = false;
    });

    // Connect to Redis
    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error.message);
    isRedisConnected = false;
    return null;
  }
};

/**
 * Get value from cache (Redis or fallback)
 */
const getCache = async (key) => {
  try {
    // Try Redis first
    if (redisClient && isRedisConnected) {
      const value = await redisClient.get(key);
      if (value) {
        return JSON.parse(value);
      }
    }
  } catch (error) {
    console.warn('⚠️ Redis get error, using fallback:', error.message);
  }

  // Fallback to in-memory cache
  const fallbackValue = fallbackCache.get(key);
  if (fallbackValue && (Date.now() - fallbackValue.timestamp) < FALLBACK_CONFIG.TTL) {
    return fallbackValue.data;
  }

  return null;
};

/**
 * Set value in cache (Redis or fallback)
 */
const setCache = async (key, value, ttlSeconds = 30) => {
  try {
    // Try Redis first
    if (redisClient && isRedisConnected) {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    }
  } catch (error) {
    console.warn('⚠️ Redis set error, using fallback:', error.message);
  }

  // Fallback to in-memory cache
  fallbackCache.set(key, {
    data: value,
    timestamp: Date.now()
  });

  // Limit cache size
  if (fallbackCache.size > FALLBACK_CONFIG.MAX_SIZE) {
    const firstKey = fallbackCache.keys().next().value;
    fallbackCache.delete(firstKey);
  }

  return true;
};

/**
 * Delete value from cache (Redis or fallback)
 */
const deleteCache = async (key) => {
  try {
    // Try Redis first
    if (redisClient && isRedisConnected) {
      await redisClient.del(key);
    }
  } catch (error) {
    console.warn('⚠️ Redis delete error, using fallback:', error.message);
  }

  // Fallback to in-memory cache
  fallbackCache.delete(key);
  return true;
};

/**
 * Delete multiple keys with pattern
 */
const deleteCachePattern = async (pattern) => {
  try {
    // Try Redis first
    if (redisClient && isRedisConnected) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    }
  } catch (error) {
    console.warn('⚠️ Redis pattern delete error, using fallback:', error.message);
  }

  // Fallback to in-memory cache
  let deletedCount = 0;
  for (const key of fallbackCache.keys()) {
    if (key.includes(pattern.replace('*', ''))) {
      fallbackCache.delete(key);
      deletedCount++;
    }
  }
  return deletedCount;
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
  return {
    redisConnected: isRedisConnected,
    fallbackCacheSize: fallbackCache.size,
    fallbackCacheMaxSize: FALLBACK_CONFIG.MAX_SIZE,
    fallbackCacheTTL: FALLBACK_CONFIG.TTL
  };
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient && isRedisConnected) {
    try {
      await redisClient.quit();
      console.log('🔌 Redis connection closed');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error.message);
    }
  }
};

// Initialize Redis on module load
initializeRedis();

module.exports = {
  initializeRedis,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  getCacheStats,
  closeRedis,
  isRedisConnected: () => isRedisConnected
};
