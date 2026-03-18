const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'queue_db',
});

async function migrate() {
  try {
    // Add column if not exists
    await pool.query('ALTER TABLE counters ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES service_types(service_id)');
    
    // Fetch distinct
    const sRes = await pool.query('SELECT service_id, service_name FROM service_types ORDER BY service_id ASC');
    const cRes = await pool.query('SELECT counter_id FROM counters ORDER BY counter_id ASC');
    
    // Sync names
    for (let i = 0; i < cRes.rows.length; i++) {
       if (sRes.rows[i]) {
           await pool.query('UPDATE counters SET service_id = $1, counter_name = $2 WHERE counter_id = $3', 
           [sRes.rows[i].service_id, sRes.rows[i].service_name, cRes.rows[i].counter_id]);
       }
    }
    console.log('Migration complete');
  } catch(e) {
    console.error('Migration error:', e);
  } finally {
    process.exit(0);
  }
}
migrate();
