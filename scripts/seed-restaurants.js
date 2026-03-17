const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Seed data for restaurants
const restaurants = [
  {
    name: 'Brim',
    location: 'Around Sports Center',
    description: 'Authentic Nigerian cuisine served fresh daily. Specializing in traditional dishes and local favorites.',
    phone: '+234 801 234 5678',
    email: 'brim@baze.edu',
    address: 'Around Sports Center, Baze University',
    openingHours: 'Mon-Sat: 8:00 AM - 8:00 PM',
    website: '',
    bankName: 'Access Bank',
    accountNumber: '1234567890',
    accountName: 'Brim Restaurant',
    owner: {
      name: 'Brim Owner',
      email: 'brim@restaurant.com',
      password: 'brim123',
    },
    menuItems: [
      { name: 'Jollof Rice', price: 1500, stock: 50, description: 'Classic Nigerian jollof rice with chicken or beef' },
      { name: 'Fried Rice', price: 1500, stock: 50, description: 'Delicious fried rice with mixed vegetables and choice of protein' },
      { name: 'White Rice & Stew', price: 1200, stock: 50, description: 'Steamed white rice served with rich tomato stew' },
      { name: 'Pounded Yam & Egusi', price: 2000, stock: 40, description: 'Traditional pounded yam with egusi soup and assorted meat' },
      { name: 'Pounded Yam & Vegetable', price: 1800, stock: 40, description: 'Pounded yam with vegetable soup' },
      { name: 'Fufu & Egusi', price: 2000, stock: 40, description: 'Fufu with egusi soup and assorted meat' },
      { name: 'Fufu & Okro', price: 1800, stock: 40, description: 'Fufu with okro soup' },
      { name: 'Amala & Ewedu', price: 1500, stock: 35, description: 'Amala with ewedu soup and gbegiri' },
      { name: 'Eba & Egusi', price: 2000, stock: 40, description: 'Eba (garri) with egusi soup' },
      { name: 'Pepper Soup', price: 2500, stock: 30, description: 'Spicy pepper soup with fish or goat meat' },
      { name: 'Suya', price: 800, stock: 60, description: 'Grilled spicy beef suya with onions and tomatoes' },
      { name: 'Grilled Fish', price: 3000, stock: 25, description: 'Fresh grilled fish with pepper sauce' },
      { name: 'Chicken & Chips', price: 2000, stock: 40, description: 'Fried chicken with french fries' },
      { name: 'Beef & Chips', price: 1800, stock: 40, description: 'Grilled beef with french fries' },
      { name: 'Moi Moi', price: 500, stock: 80, description: 'Steamed bean pudding' },
      { name: 'Akara', price: 300, stock: 100, description: 'Fried bean cakes (3 pieces)' },
      { name: 'Buns', price: 200, stock: 100, description: 'Sweet Nigerian buns' },
      { name: 'Puff Puff', price: 200, stock: 100, description: 'Sweet fried dough balls (5 pieces)' },
      { name: 'Chicken Pie', price: 500, stock: 60, description: 'Flaky pastry filled with spiced chicken' },
      { name: 'Meat Pie', price: 400, stock: 60, description: 'Flaky pastry filled with minced meat' },
    ]
  },
  {
    name: 'Terminal',
    location: 'Behind Senate Building',
    description: 'Your go-to spot for delicious Nigerian meals. Quick service, great prices, authentic taste.',
    phone: '+234 802 345 6789',
    email: 'terminal@baze.edu',
    address: 'Behind Senate Building, Baze University',
    openingHours: 'Mon-Sat: 7:00 AM - 9:00 PM',
    website: '',
    bankName: 'GTBank',
    accountNumber: '0987654321',
    accountName: 'Terminal Restaurant',
    owner: {
      name: 'Terminal Owner',
      email: 'terminal@restaurant.com',
      password: 'terminal123',
    },
    menuItems: [
      { name: 'Jollof Rice', price: 1400, stock: 50, description: 'Classic Nigerian jollof rice with chicken or beef' },
      { name: 'Fried Rice', price: 1400, stock: 50, description: 'Delicious fried rice with mixed vegetables and choice of protein' },
      { name: 'White Rice & Stew', price: 1100, stock: 50, description: 'Steamed white rice served with rich tomato stew' },
      { name: 'Coconut Rice', price: 1600, stock: 40, description: 'Fragrant coconut rice with curry and spices' },
      { name: 'Ofada Rice & Stew', price: 1800, stock: 35, description: 'Local ofada rice with spicy palm oil stew' },
      { name: 'Pounded Yam & Egusi', price: 1900, stock: 40, description: 'Traditional pounded yam with egusi soup and assorted meat' },
      { name: 'Pounded Yam & Vegetable', price: 1700, stock: 40, description: 'Pounded yam with vegetable soup' },
      { name: 'Fufu & Egusi', price: 1900, stock: 40, description: 'Fufu with egusi soup and assorted meat' },
      { name: 'Fufu & Okro', price: 1700, stock: 40, description: 'Fufu with okro soup' },
      { name: 'Amala & Ewedu', price: 1400, stock: 35, description: 'Amala with ewedu soup and gbegiri' },
      { name: 'Eba & Egusi', price: 1900, stock: 40, description: 'Eba (garri) with egusi soup' },
      { name: 'Eba & Okro', price: 1700, stock: 40, description: 'Eba with okro soup' },
      { name: 'Pepper Soup', price: 2400, stock: 30, description: 'Spicy pepper soup with fish or goat meat' },
      { name: 'Suya', price: 750, stock: 60, description: 'Grilled spicy beef suya with onions and tomatoes' },
      { name: 'Grilled Fish', price: 2800, stock: 25, description: 'Fresh grilled fish with pepper sauce' },
      { name: 'Chicken & Chips', price: 1900, stock: 40, description: 'Fried chicken with french fries' },
      { name: 'Beef & Chips', price: 1700, stock: 40, description: 'Grilled beef with french fries' },
      { name: 'Moi Moi', price: 450, stock: 80, description: 'Steamed bean pudding' },
      { name: 'Akara', price: 250, stock: 100, description: 'Fried bean cakes (3 pieces)' },
      { name: 'Buns', price: 150, stock: 100, description: 'Sweet Nigerian buns' },
      { name: 'Puff Puff', price: 150, stock: 100, description: 'Sweet fried dough balls (5 pieces)' },
      { name: 'Chicken Pie', price: 450, stock: 60, description: 'Flaky pastry filled with spiced chicken' },
      { name: 'Meat Pie', price: 350, stock: 60, description: 'Flaky pastry filled with minced meat' },
      { name: 'Doughnut', price: 200, stock: 80, description: 'Sweet glazed doughnut' },
      { name: 'Sausage Roll', price: 300, stock: 70, description: 'Flaky pastry with sausage' },
    ]
  }
];

async function seedRestaurants() {
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

    console.log('✅ Connected to MySQL\n');

    for (const restaurantData of restaurants) {
      console.log(`📦 Seeding ${restaurantData.name}...`);

      // Check if restaurant owner already exists
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [restaurantData.owner.email]
      );

      let ownerId;
      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        ownerId = existingUsers[0].id;
        console.log(`   ⚠ Owner user already exists, using existing user ID: ${ownerId}`);
      } else {
        // Create restaurant owner user
        const ownerPasswordHash = await bcrypt.hash(restaurantData.owner.password, 10);
        const [userResult] = await connection.execute(
          'INSERT INTO users (name, email, password, role, balance) VALUES (?, ?, ?, ?, ?)',
          [restaurantData.owner.name, restaurantData.owner.email, ownerPasswordHash, 'restaurant', 0.00]
        );
        ownerId = userResult.insertId;
        console.log(`   ✓ Created owner user: ${restaurantData.owner.email} (ID: ${ownerId})`);
      }

      // Check if restaurant already exists
      const [existingRestaurants] = await connection.execute(
        'SELECT id FROM restaurants WHERE name = ?',
        [restaurantData.name]
      );

      let restaurantId;
      if (Array.isArray(existingRestaurants) && existingRestaurants.length > 0) {
        restaurantId = existingRestaurants[0].id;
        console.log(`   ⚠ Restaurant already exists, updating...`);
        
        // Update restaurant details
        await connection.execute(
          `UPDATE restaurants SET 
           location = ?, description = ?, phone = ?, email = ?, address = ?, 
           openingHours = ?, website = ?, bankName = ?, accountNumber = ?, 
           accountName = ?, isApproved = ? 
           WHERE id = ?`,
          [
            restaurantData.location,
            restaurantData.description,
            restaurantData.phone,
            restaurantData.email,
            restaurantData.address,
            restaurantData.openingHours,
            restaurantData.website || null,
            restaurantData.bankName,
            restaurantData.accountNumber,
            restaurantData.accountName,
            true, // Auto-approve
            restaurantId
          ]
        );
      } else {
        // Create restaurant
        const [restaurantResult] = await connection.execute(
          `INSERT INTO restaurants 
           (ownerId, name, location, description, phone, email, address, openingHours, website, 
            bankName, accountNumber, accountName, isApproved) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ownerId,
            restaurantData.name,
            restaurantData.location,
            restaurantData.description,
            restaurantData.phone,
            restaurantData.email,
            restaurantData.address,
            restaurantData.openingHours,
            restaurantData.website || null,
            restaurantData.bankName,
            restaurantData.accountNumber,
            restaurantData.accountName,
            true // Auto-approve
          ]
        );
        restaurantId = restaurantResult.insertId;
        console.log(`   ✓ Created restaurant: ${restaurantData.name} (ID: ${restaurantId})`);
      }

      // Clear existing menu items for this restaurant (optional - comment out if you want to keep existing items)
      await connection.execute(
        'DELETE FROM menu_items WHERE restaurantId = ?',
        [restaurantId]
      );

      // Insert menu items
      console.log(`   📝 Adding ${restaurantData.menuItems.length} menu items...`);
      for (const item of restaurantData.menuItems) {
        await connection.execute(
          'INSERT INTO menu_items (restaurantId, name, price, stock, description) VALUES (?, ?, ?, ?, ?)',
          [restaurantId, item.name, item.price, item.stock, item.description]
        );
      }
      console.log(`   ✓ Added ${restaurantData.menuItems.length} menu items`);

      console.log(`✅ ${restaurantData.name} seeded successfully!\n`);
    }

    console.log('🎉 All restaurants seeded successfully!');
    console.log('\n📝 Restaurant Owner Credentials:');
    console.log('   Brim:');
    console.log('     Email: brim@restaurant.com');
    console.log('     Password: brim123');
    console.log('   Terminal:');
    console.log('     Email: terminal@restaurant.com');
    console.log('     Password: terminal123');

  } catch (error) {
    console.error('\n❌ Seeding failed:');
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

seedRestaurants();

