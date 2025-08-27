const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    return false;
  }
};

// Get connection from pool
const getConnection = async () => {
  try {
    return await pool.connect();
  } catch (error) {
    throw error;
  }
};

// Execute query with automatic connection management
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Close pool
const closePool = async () => {
  await pool.end();
};

module.exports = {
  pool,
  testConnection,
  getConnection,
  query,
  closePool
};
