const mysql = require('mysql2/promise');
require('dotenv').config();

async function addPaymentMethodColumn() {
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

    // Check if column already exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'restaurant_orders' 
       AND COLUMN_NAME = 'paymentMethod'`,
      [process.env.DATABASE_NAME || 'baze_voucher_db']
    );

    if (Array.isArray(columns) && columns.length > 0) {
      console.log('⚠️  paymentMethod column already exists. Skipping migration.');
      return;
    }

    // Add paymentMethod column
    console.log('📦 Adding paymentMethod column to restaurant_orders table...');
    await connection.execute(
      `ALTER TABLE restaurant_orders 
       ADD COLUMN paymentMethod ENUM('digital', 'cash', 'transfer') DEFAULT 'digital' 
       AFTER status`
    );

    // Add index for paymentMethod
    await connection.execute(
      'CREATE INDEX idx_payment_method ON restaurant_orders(paymentMethod)'
    );

    console.log('✅ Migration complete! paymentMethod column added successfully.');

  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL is running and accessible.');
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

addPaymentMethodColumn();

