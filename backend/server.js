// Backend server for HMS
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initPool } = require('./db/connection');

const app = express();

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, /http:\/\/localhost:\d+/]
  : [/\.vercel\.app$/, /http:\/\/localhost:\d+/];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/pharmacy', require('./routes/pharmacyRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));

app.get('/', (req, res) => res.json({ message: 'HMS API is running' }));
app.get('/api', (req, res) => res.json({ message: 'HMS API is running' }));

// Auto-initialize DB endpoint
app.get('/api/init-db', async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const { getConnection } = require('./db/connection');
  let conn;
  try {
    conn = await getConnection();
    const schemaSql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    const plsqlSql = fs.readFileSync(path.join(__dirname, 'db', 'plsql_setup.sql'), 'utf8');
    await conn.query(schemaSql);
    await conn.query(plsqlSql);
    res.json({ message: 'Database tables and functions created successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  } finally {
    if (conn) conn.release();
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;

if (require.main === module) {
  initPool()
    .then(() => {
      app.listen(PORT, () => console.log(`HMS Server running on http://localhost:${PORT}`));
    })
    .catch(err => {
      console.error('Failed to connect to Oracle DB:', err);
      process.exit(1);
    });
}

module.exports = app;
