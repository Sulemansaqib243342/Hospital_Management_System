const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DB_CONNECT || 'postgresql://postgres:postgres@localhost:5432/hms',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let poolPromise = null;

async function initPool() {
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
    try {
      // Test connection
      const client = await pool.connect();
      client.release();
      console.log('PostgreSQL connection pool created');
      return pool;
    } catch (err) {
      poolPromise = null;
      throw err;
    }
  })();

  return poolPromise;
}

async function getConnection() {
  await initPool();
  return await pool.connect();
}

module.exports = { getConnection, initPool, pool };
