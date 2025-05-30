import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Log environment variables for debugging
console.log('Database connection settings:');
console.log('DB_HOST:', process.env['DB_HOST']);
console.log('DB_PORT:', process.env['DB_PORT']);
console.log('DB_NAME:', process.env['DB_NAME']);
console.log('DB_USER:', process.env['DB_USER']);

// Create database connection pool
const pool = new Pool({
  user: process.env['DB_USER'] || 'postgres',
  host: process.env['DB_HOST'] || '127.0.0.1',
  database: process.env['DB_NAME'] || 'belka_game',
  password: process.env['DB_PASSWORD'] || 'postgres',
  port: parseInt(process.env['DB_PORT'] || '5432'),
});

// Test connection
pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('Error connecting to PostgreSQL database:', err);
  });

export default pool; 