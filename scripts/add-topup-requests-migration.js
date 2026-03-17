const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTopUpRequestsTable() {
  let connection;
  
  try {
    process.stdout.write('🔌 Connecting to MySQL...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306', 10),
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'baze_voucher_db',
    });

    process.stdout.write('✅ Connected to MySQL\n\n');

    // Check if table already exists
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'topup_requests'`,
      [process.env.DATABASE_NAME || 'baze_voucher_db']
    );

    if (Array.isArray(tables) && tables.length > 0) {
      process.stdout.write('⚠️  topup_requests table already exists. Skipping migration.\n');
      return;
    }

    // Create topup_requests table
    process.stdout.write('📦 Creating topup_requests table...\n');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS topup_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        paymentProof TEXT,
        paymentStatus ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
        verifiedBy INT NULL,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user (userId),
        INDEX idx_payment_status (paymentStatus),
        INDEX idx_created_at (createdAt)
      )
    `);

    process.stdout.write('✅ Migration complete! topup_requests table created successfully.\n');
    process.stdout.write('\n📋 Table structure:\n');
    process.stdout.write('   - id: Primary key\n');
    process.stdout.write('   - userId: Customer who requested top-up\n');
    process.stdout.write('   - amount: Top-up amount\n');
    process.stdout.write('   - paymentProof: URL to payment proof image\n');
    process.stdout.write('   - paymentStatus: Pending, Verified, or Rejected\n');
    process.stdout.write('   - verifiedBy: Admin/Restaurant who verified\n');
    process.stdout.write('   - notes: Optional notes from verifier\n');
    process.stdout.write('   - createdAt/updatedAt: Timestamps\n');

  } catch (error) {
    process.stderr.write('\n❌ Migration failed:\n');
    process.stderr.write(error.message + '\n');
    
    if (error.code === 'ECONNREFUSED') {
      process.stderr.write('\n💡 Make sure MySQL is running and accessible.\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      process.stderr.write('\n💡 Check your MySQL credentials in .env file.\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      process.stderr.write('\n💡 Database does not exist. Run: npm run setup:db\n');
    } else {
      process.stderr.write('\n💡 Error details: ' + JSON.stringify(error) + '\n');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addTopUpRequestsTable().catch(err => {
  process.stderr.write('Unhandled error: ' + err.message + '\n');
  process.exit(1);
});

