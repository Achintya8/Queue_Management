const { Pool } = require('pg');
const pool = new Pool({
  database: 'queuedb',
  user: 'queueuser',
  password: 'queuepass',
  host: 'localhost',
  port: 5432
});

async function migrate() {
  try {
    console.log("Dropping column if exists...");
    await pool.query('ALTER TABLE counters DROP COLUMN IF EXISTS service_id;');
    console.log("Adding column...");
    await pool.query('ALTER TABLE counters ADD COLUMN service_id INTEGER REFERENCES service_types(service_id);');

    console.log("Fetching services and counters...");
    const sRes = await pool.query('SELECT service_id, service_name FROM service_types ORDER BY service_id ASC;');
    const cRes = await pool.query('SELECT counter_id FROM counters ORDER BY counter_id ASC;');

    console.log("Updating counters...");
    for (let i = 0; i < cRes.rows.length; i++) {
       if (sRes.rows[i]) {
           await pool.query('UPDATE counters SET service_id = $1, counter_name = $2 WHERE counter_id = $3;',
           [sRes.rows[i].service_id, sRes.rows[i].service_name, cRes.rows[i].counter_id]);
       }
    }
    console.log('Migration complete');
  } catch(e) {
    console.error('Migration error:', e.message);
  } finally {
    process.exit(0);
  }
}
migrate();
