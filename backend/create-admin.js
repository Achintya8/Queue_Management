/**
 * Creates a default admin staff account.
 * Run with: node create-admin.js
 */
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'queuedb',
    user: process.env.DATABASE_USER || 'queueuser',
    password: process.env.DATABASE_PASSWORD || 'queuepass',
});

async function createAdmin() {
    const name = 'Admin';
    const email = 'admin@queueflow.com';
    const password = 'Admin@123';
    const role = 'admin';

    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const result = await pool.query(
            `INSERT INTO staff (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3, is_active = true
       RETURNING staff_id, name, email, role`,
            [name, email, passwordHash, role]
        );

        console.log('\n✅ Admin staff account ready:');
        console.log('   Email   :', email);
        console.log('   Password:', password);
        console.log('   Role    :', role);
        console.log('   ID      :', result.rows[0].staff_id);
        console.log('\nLogin at: http://localhost:4000/staff-login.html\n');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

createAdmin();
