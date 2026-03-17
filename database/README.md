# Database Schema Documentation

This folder contains the complete database schema for the Baze Smart Voucher system.

## Files

- **`schema.sql`** - Complete database schema with all tables, indexes, and foreign keys
- **`README.md`** - This documentation file

## Database Structure

### Tables Overview

The database consists of **9 main tables**:

1. **users** - User accounts (customers, restaurant owners, admins, staff)
2. **restaurants** - Restaurant information
3. **restaurant_staff** - Staff members and permissions
4. **menu_items** - Menu items for each restaurant
5. **transactions** - Financial transaction records
6. **restaurant_orders** - Order information (digital, cash, transfer)
7. **subscription_plans** - Restaurant subscription plans
8. **customer_subscriptions** - Customer subscription records
9. **topup_requests** - Customer top-up requests with payment proof

## Table Details

### 1. users
Stores all user accounts in the system.

**Columns:**
- `id` - Primary key
- `name` - User's full name
- `email` - Unique email address
- `password` - Hashed password (bcrypt)
- `role` - User role: 'user', 'restaurant', 'admin', 'staff'
- `balance` - Account balance (for customers)
- `createdAt`, `updatedAt` - Timestamps

**Indexes:**
- `idx_email` - On email (for fast lookups)
- `idx_role` - On role (for filtering by role)

### 2. restaurants
Stores restaurant information and owner details.

**Columns:**
- `id` - Primary key
- `ownerId` - Foreign key to users (restaurant owner)
- `name` - Restaurant name
- `location` - Location description
- `description` - Restaurant description
- `phone`, `email`, `address` - Contact information
- `openingHours` - Opening hours
- `website` - Website URL
- `logoUrl` - Logo image URL
- `isApproved` - Approval status (admin must approve)
- `qrCodeUrl` - QR code for restaurant
- `bankName`, `accountNumber`, `accountName` - Bank account details
- `createdAt`, `updatedAt` - Timestamps

**Foreign Keys:**
- `ownerId` → `users.id` (CASCADE on delete)

**Indexes:**
- `idx_owner` - On ownerId
- `idx_approved` - On isApproved

### 3. restaurant_staff
Manages staff members and their permissions for each restaurant.

**Columns:**
- `id` - Primary key
- `restaurantId` - Foreign key to restaurants
- `userId` - Foreign key to users
- `role` - Staff role: 'manager', 'staff', 'cashier', 'chef'
- `isActive` - Whether staff member is active
- `canCreateOrders` - Permission to create orders
- `canManageMenu` - Permission to manage menu
- `canViewReports` - Permission to view reports
- `createdAt`, `updatedAt` - Timestamps

**Foreign Keys:**
- `restaurantId` → `restaurants.id` (CASCADE)
- `userId` → `users.id` (CASCADE)

**Unique Constraint:**
- `unique_restaurant_user` - One user can only be staff at a restaurant once

**Indexes:**
- `idx_restaurant` - On restaurantId
- `idx_user` - On userId
- `idx_active` - On isActive

### 4. menu_items
Stores menu items for each restaurant.

**Columns:**
- `id` - Primary key
- `restaurantId` - Foreign key to restaurants
- `name` - Item name
- `price` - Item price (DECIMAL 10,2)
- `stock` - Available stock quantity
- `description` - Item description
- `imageUrl` - Item image URL
- `createdAt`, `updatedAt` - Timestamps

**Foreign Keys:**
- `restaurantId` → `restaurants.id` (CASCADE)

**Indexes:**
- `idx_restaurant` - On restaurantId
- `idx_stock` - On stock

### 5. transactions
Records all financial transactions (payments).

**Columns:**
- `id` - Primary key
- `userId` - Foreign key to users (customer)
- `restaurantId` - Foreign key to restaurants
- `totalAmount` - Transaction amount
- `items` - JSON array of items purchased
- `timestamp` - Transaction timestamp

**Foreign Keys:**
- `userId` → `users.id` (CASCADE)
- `restaurantId` → `restaurants.id` (CASCADE)

**Indexes:**
- `idx_user` - On userId
- `idx_restaurant` - On restaurantId
- `idx_timestamp` - On timestamp

### 6. restaurant_orders
Stores order information including digital, cash, and transfer orders.

**Columns:**
- `id` - Primary key
- `transactionId` - Foreign key to transactions (nullable)
- `restaurantId` - Foreign key to restaurants
- `userId` - Foreign key to users (nullable - for walk-in customers)
- `customerName` - Customer name (for walk-in orders)
- `createdBy` - Foreign key to users (staff who created order)
- `preparedBy` - Foreign key to users (staff who prepared order)
- `status` - Order status: 'Pending', 'Paid', 'Completed'
- `paymentMethod` - Payment method: 'digital', 'cash', 'transfer'
- `items` - JSON array of order items
- `totalAmount` - Order total amount
- `qrCode` - QR code for digital payment
- `timestamp`, `updatedAt` - Timestamps

**Foreign Keys:**
- `transactionId` → `transactions.id` (SET NULL)
- `restaurantId` → `restaurants.id` (CASCADE)
- `userId` → `users.id` (CASCADE)
- `createdBy` → `users.id` (SET NULL)
- `preparedBy` → `users.id` (SET NULL)

**Indexes:**
- `idx_transaction` - On transactionId
- `idx_restaurant` - On restaurantId
- `idx_user` - On userId
- `idx_created_by` - On createdBy
- `idx_prepared_by` - On preparedBy
- `idx_status` - On status
- `idx_payment_method` - On paymentMethod

### 7. subscription_plans
Stores subscription plans offered by restaurants.

**Columns:**
- `id` - Primary key
- `restaurantId` - Foreign key to restaurants
- `name` - Plan name
- `description` - Plan description
- `price` - Plan price
- `durationDays` - Duration in days
- `isActive` - Whether plan is active
- `createdAt`, `updatedAt` - Timestamps

**Foreign Keys:**
- `restaurantId` → `restaurants.id` (CASCADE)

**Indexes:**
- `idx_restaurant` - On restaurantId
- `idx_active` - On isActive

### 8. customer_subscriptions
Tracks customer subscriptions to restaurant plans.

**Columns:**
- `id` - Primary key
- `userId` - Foreign key to users
- `restaurantId` - Foreign key to restaurants
- `planId` - Foreign key to subscription_plans
- `status` - Subscription status: 'Pending', 'Active', 'Expired', 'Cancelled'
- `amount` - Subscription amount paid
- `startDate` - Subscription start date
- `endDate` - Subscription end date
- `paymentProof` - Payment proof image URL
- `paymentStatus` - Payment verification status: 'Pending', 'Verified', 'Rejected'
- `createdAt`, `updatedAt` - Timestamps

**Foreign Keys:**
- `userId` → `users.id` (CASCADE)
- `restaurantId` → `restaurants.id` (CASCADE)
- `planId` → `subscription_plans.id` (CASCADE)

**Indexes:**
- `idx_user` - On userId
- `idx_restaurant` - On restaurantId
- `idx_plan` - On planId
- `idx_status` - On status
- `idx_payment_status` - On paymentStatus

### 9. topup_requests
Stores customer top-up requests with payment proof.

**Columns:**
- `id` - Primary key
- `userId` - Foreign key to users
- `amount` - Top-up amount requested
- `paymentProof` - Payment proof image URL
- `paymentStatus` - Status: 'Pending', 'Verified', 'Rejected'
- `verifiedBy` - Foreign key to users (admin/restaurant who verified)
- `notes` - Admin notes
- `createdAt`, `updatedAt` - Timestamps

**Foreign Keys:**
- `userId` → `users.id` (CASCADE)
- `verifiedBy` → `users.id` (SET NULL)

**Indexes:**
- `idx_user` - On userId
- `idx_payment_status` - On paymentStatus
- `idx_created_at` - On createdAt

## Default Data

The schema includes a default admin user:
- **Email:** admin@baze.edu
- **Password:** admin123
- **Role:** admin

⚠️ **IMPORTANT:** Change the admin password after first login!

## Setup

To set up the database:

```bash
npm run setup:db
```

This will:
1. Create the database if it doesn't exist
2. Create all tables with proper indexes and foreign keys
3. Insert the default admin user
4. Verify all tables, indexes, and foreign keys

## Seed Data

To populate the database with sample data:

```bash
# Seed restaurants (Brim and Terminal)
npm run seed:restaurants

# Seed comprehensive Brim restaurant data
npm run seed:brim
```

See `seed/README.md` for more information about seed scripts.

## Relationships

```
users (1) ──< (many) restaurants
users (1) ──< (many) restaurant_staff
restaurants (1) ──< (many) restaurant_staff
restaurants (1) ──< (many) menu_items
restaurants (1) ──< (many) subscription_plans
restaurants (1) ──< (many) restaurant_orders
restaurants (1) ──< (many) transactions
users (1) ──< (many) transactions
users (1) ──< (many) restaurant_orders
users (1) ──< (many) customer_subscriptions
users (1) ──< (many) topup_requests
subscription_plans (1) ──< (many) customer_subscriptions
transactions (1) ──< (many) restaurant_orders
```

## Notes

- All timestamps use MySQL's `TIMESTAMP` type with automatic defaults
- JSON fields are used for flexible data storage (items arrays)
- Foreign keys use CASCADE or SET NULL based on business logic
- Indexes are created on frequently queried columns
- ENUM types are used for status fields to ensure data integrity

