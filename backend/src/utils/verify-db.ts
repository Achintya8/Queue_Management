import { pool } from '../config/database';

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database setup...\n');

    // Check tables
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📊 Tables created:');
    if (tables.rows.length === 0) {
      console.log('   ⚠️  No tables found. Run migration first!');
    } else {
      tables.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
    }

    // Check service types
    const services = await pool.query('SELECT * FROM service_types');
    console.log(`\n🏢 Service Types: ${services.rows.length}`);
    if (services.rows.length === 0) {
      console.log('   ⚠️  No service types found. Run seed first!');
    } else {
      services.rows.forEach(s => console.log(`   ✓ ${s.service_name} (${s.avg_service_time} min)`));
    }

    // Check counters
    const counters = await pool.query('SELECT * FROM counters');
    console.log(`\n🖥️  Counters: ${counters.rows.length}`);
    if (counters.rows.length === 0) {
      console.log('   ⚠️  No counters found. Run seed first!');
    } else {
      counters.rows.forEach(c => console.log(`   ✓ ${c.counter_name} - ${c.status}`));
    }

    console.log('\n✅ Database verification complete!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    await pool.end();
    process.exit(1);
  }
}

verifyDatabase();