const app = require('../server');
const { initPool } = require('../db/connection');

module.exports = async (req, res) => {
  try {
    await initPool();
  } catch (err) {
    console.error('Failed to initialize Oracle DB connection pool in serverless context:', err);
  }
  return app(req, res);
};
