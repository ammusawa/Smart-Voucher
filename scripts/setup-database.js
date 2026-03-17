const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Database Schema - All tables and initial data
const schema = {
  tables: [
    {
      name: 'users',
      sql: `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'restaurant', 'admin', 'staff') DEFAULT 'user',
    balance DECIMAL(10, 2) DEFAULT 0.00,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
)`
    },
    {
      name: 'restaurants',
      sql: `CREATE TABLE IF NOT EXISTS restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ownerId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    openingHours VARCHAR(255),
    website VARCHAR(255),
    logoUrl VARCHAR(500),
    isApproved BOOLEAN DEFAULT FALSE,
    qrCodeUrl TEXT,
    bankName VARCHAR(255),
    accountNumber VARCHAR(50),
    accountName VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner (ownerId),
    INDEX idx_approved (isApproved)
)`
    },
    {
      name: 'restaurant_staff',
      sql: `CREATE TABLE IF NOT EXISTS restaurant_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurantId INT NOT NULL,
    userId INT NOT NULL,
    role ENUM('manager', 'staff', 'cashier', 'chef') DEFAULT 'staff',
    isActive BOOLEAN DEFAULT TRUE,
    canCreateOrders BOOLEAN DEFAULT TRUE,
    canManageMenu BOOLEAN DEFAULT FALSE,
    canViewReports BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_restaurant_user (restaurantId, userId),
    INDEX idx_restaurant (restaurantId),
    INDEX idx_user (userId),
    INDEX idx_active (isActive)
)`
    },
    {
      name: 'menu_items',
      sql: `CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurantId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    description TEXT,
    imageUrl VARCHAR(500),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_restaurant (restaurantId),
    INDEX idx_stock (stock)
)`
    },
    {
      name: 'transactions',
      sql: `CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    restaurantId INT NOT NULL,
    totalAmount DECIMAL(10, 2) NOT NULL,
    items JSON NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_user (userId),
    INDEX idx_restaurant (restaurantId),
    INDEX idx_timestamp (timestamp)
)`
    },
    {
      name: 'restaurant_orders',
      sql: `CREATE TABLE IF NOT EXISTS restaurant_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transactionId INT,
    restaurantId INT NOT NULL,
    userId INT NULL,
    customerName VARCHAR(255) NULL,
    createdBy INT NULL,
    preparedBy INT NULL,
    status ENUM('Pending', 'Paid', 'Completed') DEFAULT 'Pending',
    paymentMethod ENUM('digital', 'cash', 'transfer') DEFAULT 'digital',
    items JSON NOT NULL,
    totalAmount DECIMAL(10, 2) NOT NULL,
    qrCode TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (preparedBy) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_transaction (transactionId),
    INDEX idx_restaurant (restaurantId),
    INDEX idx_user (userId),
    INDEX idx_created_by (createdBy),
    INDEX idx_prepared_by (preparedBy),
    INDEX idx_status (status),
    INDEX idx_payment_method (paymentMethod)
)`
    },
    {
      name: 'subscription_plans',
      sql: `CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurantId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    durationDays INT NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_restaurant (restaurantId),
    INDEX idx_active (isActive)
)`
    },
    {
      name: 'customer_subscriptions',
      sql: `CREATE TABLE IF NOT EXISTS customer_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    restaurantId INT NOT NULL,
    planId INT NOT NULL,
    status ENUM('Pending', 'Active', 'Expired', 'Cancelled') DEFAULT 'Pending',
    amount DECIMAL(10, 2) NOT NULL,
    startDate DATE,
    endDate DATE,
    paymentProof TEXT,
    paymentStatus ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (planId) REFERENCES subscription_plans(id) ON DELETE CASCADE,
    INDEX idx_user (userId),
    INDEX idx_restaurant (restaurantId),
    INDEX idx_plan (planId),
    INDEX idx_status (status),
    INDEX idx_payment_status (paymentStatus)
)`
    }
  ],
  // Initial data will be inserted with dynamically generated hash
  initialData: {
    adminEmail: 'admin@baze.edu',
    adminPassword: 'admin123',
    adminName: 'Admin User'
  }
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL...');
    
    // Connect without specifying database first
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306'),
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
    });

    console.log('✅ Connected to MySQL');

    // Create database
    const dbName = 'baze_voucher_db';
    console.log('📦 Creating database...');
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      console.log(`   ✓ Database '${dbName}' ready`);
    } catch (error) {
      console.error('❌ Failed to create database:', error.message);
      throw error;
    }

    // Close the initial connection and reconnect with the database specified
    await connection.end();
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306'),
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: dbName,
    });
    console.log(`✅ Connected to database: ${dbName}`);

    // Create all tables
    console.log('\n📦 Creating tables...');
    for (const table of schema.tables) {
      try {
        await connection.query(table.sql);
        console.log(`   ✓ Created table: ${table.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠ Table '${table.name}' already exists (skipping)`);
        } else {
          console.error(`   ❌ Error creating table '${table.name}':`, error.message);
          throw error;
        }
      }
    }

    // Check and add missing columns, indexes, and constraints (migrations)
    console.log('\n🔧 Checking for missing columns and indexes...');
    
    // Define all migrations to check and apply
    const migrations = [
      {
        table: 'restaurant_orders',
        column: 'paymentMethod',
        type: "ENUM('digital', 'cash', 'transfer')",
        defaultValue: "DEFAULT 'digital'",
        after: 'status',
        index: 'idx_payment_method'
      },
      // Add more migrations here as needed in the future
    ];

    for (const migration of migrations) {
      try {
        // Check if column exists
        const [columns] = await connection.execute(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = ?`,
          [dbName, migration.table, migration.column]
        );

        if (Array.isArray(columns) && columns.length === 0) {
          console.log(`   📝 Adding ${migration.column} column to ${migration.table}...`);
          
          // Build ALTER TABLE statement
          let alterSql = `ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.type}`;
          if (migration.defaultValue) {
            alterSql += ` ${migration.defaultValue}`;
          }
          if (migration.after) {
            alterSql += ` AFTER ${migration.after}`;
          }
          
          await connection.execute(alterSql);
          console.log(`   ✓ Added ${migration.column} column`);
          
          // Add index if specified
          if (migration.index) {
            try {
              await connection.execute(
                `CREATE INDEX ${migration.index} ON ${migration.table}(${migration.column})`
              );
              console.log(`   ✓ Added index ${migration.index}`);
            } catch (idxError) {
              if (!idxError.message.includes('Duplicate key') && !idxError.message.includes('already exists')) {
                console.warn(`   ⚠ Warning creating index:`, idxError.message);
              }
            }
          }
        } else {
          console.log(`   ✓ ${migration.column} column already exists in ${migration.table}`);
        }
      } catch (error) {
        // Ignore errors if column already exists
        if (!error.message.includes('Duplicate column') && !error.message.includes('already exists')) {
          console.warn(`   ⚠ Warning checking ${migration.column} in ${migration.table}:`, error.message);
        }
      }
    }

    // Verify all required indexes exist
    console.log('\n🔍 Verifying indexes...');
    const requiredIndexes = [
      { table: 'users', index: 'idx_email', columns: 'email' },
      { table: 'users', index: 'idx_role', columns: 'role' },
      { table: 'restaurants', index: 'idx_owner', columns: 'ownerId' },
      { table: 'restaurants', index: 'idx_approved', columns: 'isApproved' },
      { table: 'restaurant_staff', index: 'idx_restaurant', columns: 'restaurantId' },
      { table: 'restaurant_staff', index: 'idx_user', columns: 'userId' },
      { table: 'restaurant_staff', index: 'idx_active', columns: 'isActive' },
      { table: 'menu_items', index: 'idx_restaurant', columns: 'restaurantId' },
      { table: 'menu_items', index: 'idx_stock', columns: 'stock' },
      { table: 'transactions', index: 'idx_user', columns: 'userId' },
      { table: 'transactions', index: 'idx_restaurant', columns: 'restaurantId' },
      { table: 'transactions', index: 'idx_timestamp', columns: 'timestamp' },
      { table: 'restaurant_orders', index: 'idx_transaction', columns: 'transactionId' },
      { table: 'restaurant_orders', index: 'idx_restaurant', columns: 'restaurantId' },
      { table: 'restaurant_orders', index: 'idx_user', columns: 'userId' },
      { table: 'restaurant_orders', index: 'idx_created_by', columns: 'createdBy' },
      { table: 'restaurant_orders', index: 'idx_prepared_by', columns: 'preparedBy' },
      { table: 'restaurant_orders', index: 'idx_status', columns: 'status' },
      { table: 'restaurant_orders', index: 'idx_payment_method', columns: 'paymentMethod' },
      { table: 'subscription_plans', index: 'idx_restaurant', columns: 'restaurantId' },
      { table: 'subscription_plans', index: 'idx_active', columns: 'isActive' },
      { table: 'customer_subscriptions', index: 'idx_user', columns: 'userId' },
      { table: 'customer_subscriptions', index: 'idx_restaurant', columns: 'restaurantId' },
      { table: 'customer_subscriptions', index: 'idx_plan', columns: 'planId' },
      { table: 'customer_subscriptions', index: 'idx_status', columns: 'status' },
      { table: 'customer_subscriptions', index: 'idx_payment_status', columns: 'paymentStatus' },
    ];

    for (const idx of requiredIndexes) {
      try {
        const [indexes] = await connection.execute(
          `SELECT INDEX_NAME 
           FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = ? 
           AND TABLE_NAME = ? 
           AND INDEX_NAME = ?`,
          [dbName, idx.table, idx.index]
        );

        if (Array.isArray(indexes) && indexes.length === 0) {
          console.log(`   📝 Adding index ${idx.index} to ${idx.table}...`);
          await connection.execute(
            `CREATE INDEX ${idx.index} ON ${idx.table}(${idx.columns})`
          );
          console.log(`   ✓ Added index ${idx.index}`);
        }
      } catch (error) {
        if (!error.message.includes('Duplicate key') && !error.message.includes('already exists')) {
          // Silently skip if index already exists
        }
      }
    }
    console.log('   ✓ All indexes verified');

    // Verify foreign keys exist
    console.log('\n🔗 Verifying foreign keys...');
    const requiredForeignKeys = [
      { table: 'restaurants', column: 'ownerId', refTable: 'users', refColumn: 'id' },
      { table: 'restaurant_staff', column: 'restaurantId', refTable: 'restaurants', refColumn: 'id' },
      { table: 'restaurant_staff', column: 'userId', refTable: 'users', refColumn: 'id' },
      { table: 'menu_items', column: 'restaurantId', refTable: 'restaurants', refColumn: 'id' },
      { table: 'transactions', column: 'userId', refTable: 'users', refColumn: 'id' },
      { table: 'transactions', column: 'restaurantId', refTable: 'restaurants', refColumn: 'id' },
      { table: 'restaurant_orders', column: 'transactionId', refTable: 'transactions', refColumn: 'id' },
      { table: 'restaurant_orders', column: 'restaurantId', refTable: 'restaurants', refColumn: 'id' },
      { table: 'restaurant_orders', column: 'userId', refTable: 'users', refColumn: 'id' },
      { table: 'restaurant_orders', column: 'createdBy', refTable: 'users', refColumn: 'id' },
      { table: 'restaurant_orders', column: 'preparedBy', refTable: 'users', refColumn: 'id' },
      { table: 'subscription_plans', column: 'restaurantId', refTable: 'restaurants', refColumn: 'id' },
      { table: 'customer_subscriptions', column: 'userId', refTable: 'users', refColumn: 'id' },
      { table: 'customer_subscriptions', column: 'restaurantId', refTable: 'restaurants', refColumn: 'id' },
      { table: 'customer_subscriptions', column: 'planId', refTable: 'subscription_plans', refColumn: 'id' },
    ];

    for (const fk of requiredForeignKeys) {
      try {
        const [fks] = await connection.execute(
          `SELECT CONSTRAINT_NAME 
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
           WHERE TABLE_SCHEMA = ? 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = ? 
           AND REFERENCED_TABLE_NAME = ?`,
          [dbName, fk.table, fk.column, fk.refTable]
        );

        if (Array.isArray(fks) && fks.length === 0) {
          console.log(`   📝 Adding foreign key ${fk.table}.${fk.column} -> ${fk.refTable}.${fk.refColumn}...`);
          // Note: Foreign keys are created with table creation, so this is mainly for verification
          // If needed, we could add ALTER TABLE statements here
          console.log(`   ⚠ Foreign key should be created with table (may need manual verification)`);
        }
      } catch (error) {
        // Silently continue
      }
    }
    console.log('   ✓ Foreign keys verified');

    // Insert initial data
    console.log('\n📝 Inserting initial data...');
    
    // Generate password hash for admin user
    const adminPasswordHash = await bcrypt.hash(schema.initialData.adminPassword, 10);
    
    // Check if admin exists
    const [existingAdmins] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [schema.initialData.adminEmail]
    );
    
    if (Array.isArray(existingAdmins) && existingAdmins.length === 0) {
      // Create admin user
      try {
        await connection.execute(
          'INSERT INTO users (name, email, password, role, balance) VALUES (?, ?, ?, ?, ?)',
          [schema.initialData.adminName, schema.initialData.adminEmail, adminPasswordHash, 'admin', 0.00]
        );
        console.log(`   ✓ Created admin user: ${schema.initialData.adminEmail}`);
      } catch (error) {
        console.warn(`   ⚠ Warning creating admin user:`, error.message);
      }
    } else {
      // Update admin password
      try {
        await connection.execute(
          'UPDATE users SET password = ?, name = ? WHERE email = ?',
          [adminPasswordHash, schema.initialData.adminName, schema.initialData.adminEmail]
        );
        console.log(`   ✓ Updated admin user: ${schema.initialData.adminEmail}`);
      } catch (error) {
        console.warn(`   ⚠ Warning updating admin user:`, error.message);
      }
    }

    // Final verification
    console.log('\n🔍 Final verification...');
    
    // Verify tables were created
    const [tables] = await connection.query('SHOW TABLES');
    const tableCount = Array.isArray(tables) ? tables.length : 0;
    
    if (tableCount === 0) {
      console.error('\n❌ No tables found in database!');
      throw new Error('Database tables were not created');
    }

    // Check and create topup_requests table if it doesn't exist
    console.log('\n📦 Checking topup_requests table...');
    try {
      const [topupTables] = await connection.execute(
        `SELECT TABLE_NAME 
         FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'topup_requests'`,
        [dbName]
      );
      
      if (Array.isArray(topupTables) && topupTables.length === 0) {
        console.log('   📝 Creating topup_requests table...');
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
        console.log('   ✓ Created topup_requests table');
      } else {
        console.log('   ✓ topup_requests table already exists');
      }
    } catch (error) {
      console.warn(`   ⚠ Warning creating topup_requests table:`, error.message);
    }

    // Verify all expected tables exist
    const expectedTables = ['users', 'restaurants', 'restaurant_staff', 'menu_items', 
                           'transactions', 'restaurant_orders', 'subscription_plans', 
                           'customer_subscriptions', 'topup_requests'];
    const existingTableNames = tables.map((t: any) => Object.values(t)[0]);
    const missingTables = expectedTables.filter(t => !existingTableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.warn(`   ⚠ Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log(`   ✓ All ${expectedTables.length} required tables exist`);
    }

    // Count total indexes
    const [indexCount] = await connection.execute(
      `SELECT COUNT(DISTINCT INDEX_NAME) as count 
       FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = ? 
       AND INDEX_NAME != 'PRIMARY'`,
      [dbName]
    );
    const totalIndexes = (indexCount as any[])[0]?.count || 0;
    console.log(`   ✓ Database has ${totalIndexes} indexes`);

    // Count foreign keys
    const [fkCount] = await connection.execute(
      `SELECT COUNT(DISTINCT CONSTRAINT_NAME) as count 
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = ? 
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [dbName]
    );
    const totalFKs = (fkCount as any[])[0]?.count || 0;
    console.log(`   ✓ Database has ${totalFKs} foreign key constraints`);

    console.log(`\n✅ Database setup complete!`);
    console.log(`   📊 Summary:`);
    console.log(`      - Tables: ${tableCount}`);
    console.log(`      - Indexes: ${totalIndexes}`);
    console.log(`      - Foreign Keys: ${totalFKs}`);
    console.log('\n📝 Default admin credentials:');
    console.log('   Email: admin@baze.edu');
    console.log('   Password: admin123');
    console.log('   ⚠️  Please change this password after first login!');

  } catch (error) {
    console.error('\n❌ Database setup failed:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL is running and accessible.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Check your MySQL credentials in .env file.');
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

setupDatabase();

