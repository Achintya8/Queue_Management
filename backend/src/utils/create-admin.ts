import { pool } from '../config/database';
import { hashPassword } from './auth';

/**
* Create default admin user
* Email: admin@queue.com
* Password: admin123
*/
async function createAdmin() {
  try {
    console.log('🔐 Creating default admin user...');

    const email = 'admin@queue.com';
    const password = 'admin123';
    const name = 'System Admin';

    // Check if admin already exists
    const existing = await pool.query(
      'SELECT staff_id FROM staff WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email: admin@queue.com');
      console.log('🔑 Password: admin123');
      await pool.end();
      process.exit(0);
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Insert admin
    const result = await pool.query(
      `INSERT INTO staff (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING staff_id, name, email, role`,
      [name, email, password_hash, 'admin', true]
    );

    const admin = result.rows[0];

    console.log('✅ Admin user created successfully!');
    console.log('\n📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', admin.name);
    console.log('🎭 Role:', admin.role);
    console.log('\n⚠️  Please change the password after first login!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();