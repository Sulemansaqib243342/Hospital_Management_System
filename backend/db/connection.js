const oracledb = require('oracledb');

const dbConfig = {
  user: process.env.DB_USER || 'hms_user',
  password: process.env.DB_PASSWORD || 'hms_password',
  connectString: process.env.DB_CONNECT || 'localhost:1521/ORCL',
};

async function getConnection() {
  return await oracledb.getConnection(dbConfig);
}

let poolPromise = null;

async function initPool() {
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
    try {
      const existingPool = oracledb.getPool();
      if (existingPool) return existingPool;
    } catch (e) {
      // Pool not yet created, proceed to create
    }

    try {
      await oracledb.createPool({
        ...dbConfig,
        poolMin: 0,
        poolMax: 10,
        poolIncrement: 1,
      });
      console.log('Oracle DB connection pool created');
    } catch (err) {
      poolPromise = null;
      throw err;
    }
  })();

  return poolPromise;
}

module.exports = { getConnection, initPool };
