require('dotenv').config();
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing in .env file!');
}

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  prepare: false, 
});

module.exports = sql;