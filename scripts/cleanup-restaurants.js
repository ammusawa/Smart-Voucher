const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  let connection;

  try {
    console.log('🔌 Connecting to MySQL...');
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306', 10),
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'baze_voucher_db',
      multipleStatements: false,
    });
    console.log('✅ Connected to MySQL\n');

    const [restaurants] = await connection.execute(
      'SELECT id, name FROM restaurants ORDER BY id'
    );
    const [restaurantUsers] = await connection.execute(
      `SELECT id, email FROM users WHERE role = 'restaurant' ORDER BY id`
    );

    if (restaurants.length === 0 && restaurantUsers.length === 0) {
      console.log('ℹ️  No restaurants or restaurant users found. Nothing to delete.');
      return;
    }

    console.log(
      `🧹 Preparing to delete ${restaurants.length} restaurant(s) and ${restaurantUsers.length} restaurant user(s)...`
    );

    await connection.beginTransaction();

    try {
      if (restaurants.length > 0) {
        const restaurantIds = restaurants.map((r) => r.id);
        console.log('   🗑  Removing restaurants:', restaurants.map((r) => r.name).join(', ') || '-');
        await connection.execute(
          `DELETE FROM restaurants WHERE id IN (${restaurantIds.map(() => '?').join(',')})`,
          restaurantIds
        );
      }

      if (restaurantUsers.length > 0) {
        const userIds = restaurantUsers.map((u) => u.id);
        console.log(
          '   🗑  Removing restaurant users:',
          restaurantUsers.map((u) => u.email).join(', ') || '-'
        );
        await connection.execute(
          `DELETE FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`,
          userIds
        );
      }

      await connection.commit();
      console.log('\n✅ All restaurants and restaurant users removed successfully.');
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();


