const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ ERROR AL CONECTAR CON POSTGRESQL:', err.message);
  } else {
    console.log('✅ Base de datos conectada correctamente a las:', res.rows[0].now);
  }
});

module.exports = pool;