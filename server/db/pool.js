// Database pool module
// Centralizes PostgreSQL connection management with proper error handling

const { Pool } = require('pg');

/**
 * Creates a PostgreSQL connection pool with error handling
 * @param {string} connectionString - DATABASE_URL connection string
 * @param {boolean} isProduction - Whether running in production mode
 * @returns {Pool|null} - Pool instance or null if no connection string
 */
function createPool(connectionString, isProduction = false) {
  if (!connectionString) {
    return null;
  }

  const pool = new Pool({
    connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });

  // Handle pool errors to prevent crashes - pool manages reconnection automatically
  pool.on('error', (err) => {
    console.error('Database pool error:', err.message);
  });

  return pool;
}

module.exports = { createPool };
