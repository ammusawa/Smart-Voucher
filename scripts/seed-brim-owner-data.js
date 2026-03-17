const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
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
    });
    console.log('✅ Connected to MySQL\n');

    const ownerId = await ensureBrimOwner(connection);
    const restaurantId = await ensureBrimRestaurant(connection, ownerId);
    await ensureRestaurantStaff(connection, restaurantId);
    await seedMenuItems(connection, restaurantId);
    const planMap = await seedSubscriptionPlans(connection, restaurantId);
    const customerIds = await ensureCustomers(connection);
    await seedCustomerSubscriptions(connection, planMap, customerIds, restaurantId);
    await seedOrders(connection, restaurantId, ownerId, customerIds);

    console.log('\n🎉 Brim restaurant, staff, menu, and sample data seeded successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function ensureBrimOwner(connection) {
  console.log('👤 Ensuring Brim owner user exists...');
  const owner = {
    name: 'Brim Owner',
    email: 'brim@restaurant.com',
    password: 'brim123',
  };

  const [existing] = await connection.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [owner.email]
  );

  if (Array.isArray(existing) && existing.length > 0) {
    await connection.execute(
      `UPDATE users SET name = ?, role = 'restaurant', updatedAt = NOW()
       WHERE id = ?`,
      [owner.name, existing[0].id]
    );
    console.log(`   ℹ️  Owner already exists (user ID: ${existing[0].id})`);
    return existing[0].id;
  }

  const passwordHash = await bcrypt.hash(owner.password, 10);
  const [result] = await connection.execute(
    `INSERT INTO users (name, email, password, role, balance)
     VALUES (?, ?, ?, 'restaurant', 0.00)`,
    [owner.name, owner.email, passwordHash]
  );
  console.log(`   ➕ Created owner user (ID: ${result.insertId})`);
  return result.insertId;
}

async function ensureBrimRestaurant(connection, ownerId) {
  console.log('\n🏪 Ensuring Brim restaurant exists...');
  const restaurant = {
    name: 'Brim',
    location: 'Around Sports Center',
    description:
      'Authentic Nigerian cuisine served fresh daily with focus on traditional meals.',
    phone: '+234 801 234 5678',
    email: 'brim@baze.edu',
    address: 'Around Sports Center, Baze University',
    openingHours: 'Mon-Sat: 8:00 AM - 8:00 PM',
    website: '',
    bankName: 'Access Bank',
    accountNumber: '1234567890',
    accountName: 'Brim Restaurant',
  };

  const [existing] = await connection.execute(
    'SELECT id FROM restaurants WHERE ownerId = ? OR name = ? LIMIT 1',
    [ownerId, restaurant.name]
  );

  if (Array.isArray(existing) && existing.length > 0) {
    await connection.execute(
      `UPDATE restaurants SET
        ownerId = ?, location = ?, description = ?, phone = ?, email = ?, address = ?,
        openingHours = ?, website = ?, bankName = ?, accountNumber = ?, accountName = ?,
        isApproved = TRUE, updatedAt = NOW()
       WHERE id = ?`,
      [
        ownerId,
        restaurant.location,
        restaurant.description,
        restaurant.phone,
        restaurant.email,
        restaurant.address,
        restaurant.openingHours,
        restaurant.website || null,
        restaurant.bankName,
        restaurant.accountNumber,
        restaurant.accountName,
        existing[0].id,
      ]
    );
    console.log(`   ✏️  Updated Brim record (ID: ${existing[0].id})`);
    return existing[0].id;
  }

  const [result] = await connection.execute(
    `INSERT INTO restaurants
     (ownerId, name, location, description, phone, email, address, openingHours,
      website, bankName, accountNumber, accountName, isApproved)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      ownerId,
      restaurant.name,
      restaurant.location,
      restaurant.description,
      restaurant.phone,
      restaurant.email,
      restaurant.address,
      restaurant.openingHours,
      restaurant.website || null,
      restaurant.bankName,
      restaurant.accountNumber,
      restaurant.accountName,
    ]
  );
  console.log(`   ➕ Created Brim restaurant (ID: ${result.insertId})`);
  return result.insertId;
}

async function ensureRestaurantStaff(connection, restaurantId) {
  console.log('\n👥 Ensuring staff members exist...');
  const staffMembers = [
    {
      name: 'Chidinma Okafor',
      email: 'chidinma.okafor@brim.com',
      password: 'staff123',
      role: 'manager',
      permissions: { canCreateOrders: true, canManageMenu: true, canViewReports: true },
    },
    {
      name: 'Tunde Balogun',
      email: 'tunde.balogun@brim.com',
      password: 'staff123',
      role: 'cashier',
      permissions: { canCreateOrders: true, canManageMenu: false, canViewReports: false },
    },
    {
      name: 'Hauwa Garba',
      email: 'hauwa.garba@brim.com',
      password: 'staff123',
      role: 'staff',
      permissions: { canCreateOrders: true, canManageMenu: false, canViewReports: false },
    },
  ];

  for (const staff of staffMembers) {
    const userId = await ensureStaffUser(connection, staff);
    await ensureRestaurantStaffLink(connection, restaurantId, userId, staff);
  }
}

async function ensureStaffUser(connection, staff) {
  const [existing] = await connection.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [staff.email]
  );

  if (Array.isArray(existing) && existing.length > 0) {
    await connection.execute(
      `UPDATE users SET name = ?, role = 'restaurant', updatedAt = NOW()
       WHERE id = ?`,
      [staff.name, existing[0].id]
    );
    console.log(`   ℹ️  Staff user already exists: ${staff.email}`);
    return existing[0].id;
  }

  const passwordHash = await bcrypt.hash(staff.password, 10);
  const [result] = await connection.execute(
    `INSERT INTO users (name, email, password, role, balance)
     VALUES (?, ?, ?, 'restaurant', 0.00)`,
    [staff.name, staff.email, passwordHash]
  );
  console.log(`   ➕ Created staff user: ${staff.email}`);
  return result.insertId;
}

async function ensureRestaurantStaffLink(connection, restaurantId, userId, staff) {
  const [existing] = await connection.execute(
    `SELECT id FROM restaurant_staff
     WHERE restaurantId = ? AND userId = ? LIMIT 1`,
    [restaurantId, userId]
  );

  const { permissions = {} } = staff;
  const canCreateOrders = permissions.canCreateOrders ?? true;
  const canManageMenu = permissions.canManageMenu ?? false;
  const canViewReports = permissions.canViewReports ?? false;

  if (Array.isArray(existing) && existing.length > 0) {
    await connection.execute(
      `UPDATE restaurant_staff
       SET role = ?, isActive = TRUE, canCreateOrders = ?, canManageMenu = ?, canViewReports = ?, updatedAt = NOW()
       WHERE id = ?`,
      [staff.role || 'staff', canCreateOrders, canManageMenu, canViewReports, existing[0].id]
    );
    console.log(`   ✏️  Updated staff link for ${staff.email}`);
  } else {
    await connection.execute(
      `INSERT INTO restaurant_staff
       (restaurantId, userId, role, canCreateOrders, canManageMenu, canViewReports, isActive)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [restaurantId, userId, staff.role || 'staff', canCreateOrders, canManageMenu, canViewReports]
    );
    console.log(`   ➕ Added staff link for ${staff.email}`);
  }
}

async function seedMenuItems(connection, restaurantId) {
  const menuItems = [
    {
      name: 'Brim Breakfast Combo',
      price: 2200,
      stock: 35,
      description: 'Akara, pap, boiled egg, and fruit cup.',
    },
    {
      name: 'Grilled Chicken Salad',
      price: 2600,
      stock: 25,
      description: 'Fresh greens, grilled chicken strips, vinaigrette dressing.',
    },
    {
      name: 'Plantain Boat Deluxe',
      price: 1800,
      stock: 40,
      description: 'Stuffed ripe plantain with minced beef and veggies.',
    },
    {
      name: 'Executive Lunch Platter',
      price: 3500,
      stock: 20,
      description: 'Chef selection of soup, swallow, protein, and dessert.',
    },
    {
      name: 'Fresh Tiger Nut Smoothie',
      price: 1200,
      stock: 60,
      description: 'Rich tiger nut blend with coconut milk and dates.',
    },
    {
      name: 'Suya Fiesta Bowl',
      price: 2400,
      stock: 30,
      description: 'Peppered suya served with jollof rice and coleslaw.',
    },
    {
      name: 'Chef Special Egusi',
      price: 2800,
      stock: 30,
      description: 'Egusi soup with assorted meat and pounded yam.',
    },
    {
      name: 'Lemon Peppered Grilled Fish',
      price: 3200,
      stock: 18,
      description: 'Whole grilled fish with lemon pepper sauce and sides.',
    },
  ];

  console.log('\n🍽  Upserting menu items...');

  for (const item of menuItems) {
    const [existing] = await connection.execute(
      'SELECT id FROM menu_items WHERE restaurantId = ? AND name = ? LIMIT 1',
      [restaurantId, item.name]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      await connection.execute(
        `UPDATE menu_items SET price = ?, stock = ?, description = ?, updatedAt = NOW()
         WHERE id = ?`,
        [item.price, item.stock, item.description, existing[0].id]
      );
      console.log(`   ✏️  Updated menu item: ${item.name}`);
    } else {
      await connection.execute(
        `INSERT INTO menu_items (restaurantId, name, price, stock, description)
         VALUES (?, ?, ?, ?, ?)`,
        [restaurantId, item.name, item.price, item.stock, item.description]
      );
      console.log(`   ➕ Added menu item: ${item.name}`);
    }
  }
}

async function seedSubscriptionPlans(connection, restaurantId) {
  const plans = [
    {
      name: 'Brim Weekly Saver',
      description: '5 meals per week with priority service.',
      price: 9000,
      durationDays: 7,
    },
    {
      name: 'Brim Flexi Lunch',
      description: '10 lunch meals valid for 30 days.',
      price: 17000,
      durationDays: 30,
    },
    {
      name: 'Brim Premium Semester',
      description: 'Unlimited weekday meals for 16 weeks.',
      price: 180000,
      durationDays: 112,
    },
  ];

  console.log('\n📦 Seeding subscription plans...');
  const planMap = {};

  for (const plan of plans) {
    const [existing] = await connection.execute(
      `SELECT id FROM subscription_plans
       WHERE restaurantId = ? AND name = ? LIMIT 1`,
      [restaurantId, plan.name]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      await connection.execute(
        `UPDATE subscription_plans
         SET description = ?, price = ?, durationDays = ?, isActive = TRUE, updatedAt = NOW()
         WHERE id = ?`,
        [plan.description, plan.price, plan.durationDays, existing[0].id]
      );
      planMap[plan.name] = { id: existing[0].id, price: plan.price };
      console.log(`   ✏️  Updated plan: ${plan.name}`);
    } else {
      const [result] = await connection.execute(
        `INSERT INTO subscription_plans
         (restaurantId, name, description, price, durationDays, isActive)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [restaurantId, plan.name, plan.description, plan.price, plan.durationDays]
      );
      planMap[plan.name] = { id: result.insertId, price: plan.price };
      console.log(`   ➕ Added plan: ${plan.name}`);
    }
  }

  return planMap;
}

async function ensureCustomers(connection) {
  console.log('\n👥 Ensuring sample customers exist...');
  const customers = [
    {
      name: 'Amaka Obi',
      email: 'amaka.obi@baze.edu',
      password: 'password123',
      balance: 50000,
    },
    {
      name: 'David Musa',
      email: 'david.musa@baze.edu',
      password: 'password123',
      balance: 30000,
    },
  ];

  const idMap = {};

  for (const customer of customers) {
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [customer.email]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      idMap[customer.email] = existing[0].id;
      console.log(`   ℹ️  Customer already exists: ${customer.email}`);
    } else {
      const passwordHash = await bcrypt.hash(customer.password, 10);
      const [result] = await connection.execute(
        `INSERT INTO users (name, email, password, role, balance)
         VALUES (?, ?, ?, 'user', ?)`,
        [customer.name, customer.email, passwordHash, customer.balance]
      );
      idMap[customer.email] = result.insertId;
      console.log(`   ➕ Created customer: ${customer.email}`);
    }
  }

  return idMap;
}

async function seedCustomerSubscriptions(connection, planMap, customerIds, restaurantId) {
  console.log('\n📝 Seeding customer subscriptions...');
  const subscriptions = [
    {
      email: 'amaka.obi@baze.edu',
      planName: 'Brim Premium Semester',
      status: 'Active',
      paymentStatus: 'Verified',
      startOffsetDays: -14,
      durationDays: 112,
    },
    {
      email: 'david.musa@baze.edu',
      planName: 'Brim Weekly Saver',
      status: 'Active',
      paymentStatus: 'Verified',
      startOffsetDays: -3,
      durationDays: 7,
    },
  ];

  for (const sub of subscriptions) {
    const userId = customerIds[sub.email];
    const planInfo = planMap[sub.planName];

    if (!userId || !planInfo) {
      console.warn(`   ⚠️  Skipping subscription for ${sub.email}; missing plan or user.`);
      continue;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + sub.startOffsetDays);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + sub.durationDays);

    const [existing] = await connection.execute(
      `SELECT id FROM customer_subscriptions
       WHERE userId = ? AND planId = ? LIMIT 1`,
      [userId, planInfo.id]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      await connection.execute(
        `UPDATE customer_subscriptions
         SET status = ?, paymentStatus = ?, amount = ?, startDate = ?, endDate = ?, updatedAt = NOW()
         WHERE id = ?`,
        [
          sub.status,
          sub.paymentStatus,
          planInfo.price,
          formatDate(startDate),
          formatDate(endDate),
          existing[0].id,
        ]
      );
      console.log(`   ✏️  Updated subscription for ${sub.email} (${sub.planName})`);
    } else {
      await connection.execute(
        `INSERT INTO customer_subscriptions
         (userId, restaurantId, planId, status, amount, startDate, endDate, paymentStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          restaurantId,
          planInfo.id,
          sub.status,
          planInfo.price,
          formatDate(startDate),
          formatDate(endDate),
          sub.paymentStatus,
        ]
      );
      console.log(`   ➕ Added subscription for ${sub.email} (${sub.planName})`);
    }
  }
}

async function seedOrders(connection, restaurantId, ownerId, customerIds) {
  console.log('\n🍽  Creating sample orders...');
  const orders = [
    {
      email: 'amaka.obi@baze.edu',
      items: [
        { name: 'Brim Breakfast Combo', price: 2200, quantity: 1 },
        { name: 'Fresh Tiger Nut Smoothie', price: 1200, quantity: 1 },
      ],
      status: 'Completed',
    },
    {
      email: 'david.musa@baze.edu',
      items: [
        { name: 'Executive Lunch Platter', price: 3500, quantity: 1 },
        { name: 'Plantain Boat Deluxe', price: 1800, quantity: 1 },
      ],
      status: 'Paid',
    },
  ];

  for (const order of orders) {
    const userId = customerIds[order.email];
    if (!userId) {
      console.warn(`   ⚠️  Skipping order for ${order.email}; user missing.`);
      continue;
    }

    const totalAmount = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const itemsJson = JSON.stringify(order.items);

    const [transactionResult] = await connection.execute(
      `INSERT INTO transactions (userId, restaurantId, totalAmount, items)
       VALUES (?, ?, ?, ?)`,
      [userId, restaurantId, totalAmount, itemsJson]
    );

    const transactionId = transactionResult.insertId;

    await connection.execute(
      `INSERT INTO restaurant_orders
       (transactionId, restaurantId, userId, createdBy, status, items, totalAmount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        restaurantId,
        userId,
        ownerId,
        order.status,
        itemsJson,
        totalAmount,
      ]
    );

    console.log(
      `   ➕ Added ${order.status} order for ${order.email} (₦${totalAmount})`
    );
  }
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

main();
