import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function runSeed() {
  try {
    const seedPath = path.resolve(__dirname, '../../../database/seeds/001_initial_data.sql');

    console.log('📂 Looking for seed file at:', seedPath);

    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at: ${seedPath}`);
    }

    const sql = fs.readFileSync(seedPath, 'utf8');

    console.log('🌱 Seeding database...');
    await pool.query(sql);
    console.log('✅ Seed completed successfully!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runSeed();