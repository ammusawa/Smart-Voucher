const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixAdminPassword() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL...');
    
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306'),
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'baze_voucher_db',
    });

    console.log('✅ Connected to MySQL');

    // Generate new hash for admin123
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('🔑 Updating admin password...');
    console.log('   Email: admin@baze.edu');
    console.log('   Password: admin123');
    console.log('   New Hash:', hash);

    // Update admin password
    const [result] = await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hash, 'admin@baze.edu']
    );

    // Check if admin exists, if not create it
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@baze.edu']
    );

    if (Array.isArray(users) && users.length === 0) {
      console.log('📝 Admin user not found, creating...');
      await connection.execute(
        'INSERT INTO users (name, email, password, role, balance) VALUES (?, ?, ?, ?, ?)',
        ['Admin User', 'admin@baze.edu', hash, 'admin', 0.00]
      );
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin password updated');
    }

    console.log('\n🎉 Admin credentials:');
    console.log('   Email: admin@baze.edu');
    console.log('   Password: admin123');
    console.log('   ⚠️  Please change this password after first login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL is running and database is set up.');
      console.error('   Run: npm run setup:db');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Check your MySQL credentials in .env file.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist. Run: npm run setup:db');
    } else {
      console.error('\n💡 Error details:', error);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAdminPassword();

