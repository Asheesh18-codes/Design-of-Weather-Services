/**
 * PostgreSQL Database Connection
 * 
 * Manages connection pooling for the airports database.
 * Uses connection pooling for better performance under load.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Connection pool configuration
// Supports both DATABASE_URL (Render/Aiven) and individual env vars (local dev)
const useSsl = process.env.DB_SSL === 'true' || !!process.env.DATABASE_URL;

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'aviation_weather',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      }
);

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
  process.exit(-1);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Please ensure PostgreSQL is running and credentials are correct');
  } else {
    console.log('✅ Database connected successfully at', res.rows[0].now);
  }
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.warn(`⚠️ Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return res;
  } catch (err) {
    console.error('Database query error:', err.message);
    console.error('Query:', text);
    console.error('Params:', params);
    throw err;
  }
}

/**
 * Get a client from the pool for transactions
 * Remember to release the client when done!
 */
async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);
  
  // Add timeout for queries
  const timeout = setTimeout(() => {
    console.error('❌ Client has been checked out for more than 5 seconds!');
  }, 5000);
  
  // Wrap release to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };
  
  return client;
}

/**
 * Close all database connections (for graceful shutdown)
 */
async function end() {
  await pool.end();
  console.log('📊 Database connection pool closed');
}

module.exports = {
  query,
  getClient,
  end,
  pool
};
