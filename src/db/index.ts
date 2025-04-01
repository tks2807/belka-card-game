import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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