import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import pool from './index';

async function setupDatabase() {
  let client;
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    
    console.log('Connected! Setting up database schema...');
    
    // Read schema file
    const schemaFile = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema from ${schemaFile}`);
    const schema = fs.readFileSync(schemaFile, 'utf8');
    
    // Execute schema
    console.log('Executing schema SQL...');
    await client.query(schema);
    
    console.log('Database schema setup completed!');
    return true;
  } catch (error: any) {
    console.error('Error setting up database schema:', error);
    
    // Проверка типичных проблем
    if (error.code === 'ECONNREFUSED') {
      console.error('\nПОДСКАЗКА: Не удалось подключиться к базе данных PostgreSQL.');
      console.error('Пожалуйста, убедитесь что:');
      console.error('1. PostgreSQL установлен и запущен');
      console.error('2. Параметры подключения в файле .env корректны');
      console.error('3. База данных "belka_game" создана:');
      console.error('   - Откройте pgAdmin');
      console.error('   - Щелкните правой кнопкой на "Databases"');
      console.error('   - Выберите "Create" > "Database"');
      console.error('   - Введите "belka_game" и нажмите "Save"');
    } else if (error.code === '3D000') {
      console.error('\nПОДСКАЗКА: База данных "belka_game" не существует.');
      console.error('Необходимо создать базу данных перед запуском этого скрипта.');
    } else if (error.code === '28P01') {
      console.error('\nПОДСКАЗКА: Неверный пароль для пользователя PostgreSQL.');
      console.error('Проверьте настройки в файле .env');
    }
    
    throw error;
  } finally {
    if (client) client.release();
  }
}

// If this file is run directly (not imported), execute the setup
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database setup completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database setup failed:', err);
      process.exit(1);
    });
}

export default setupDatabase; 