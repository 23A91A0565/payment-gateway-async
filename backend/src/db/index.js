const { Pool } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://gateway_user:gateway_pass@localhost:5432/payment_gateway';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

module.exports = pool;
