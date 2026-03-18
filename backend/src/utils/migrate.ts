import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    // Look for migrations locally
    const migrationPath = path.resolve(__dirname, '../../../database/migrations/001_initial_schema.sql');

    console.log('📂 Looking for migration file at:', migrationPath);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running database migration...');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();