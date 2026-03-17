-- ============================================================================
-- Baze Smart Voucher - Complete Database Schema
-- ============================================================================
-- This file contains the complete database schema for the Baze Smart Voucher system.
-- Run this to create all tables from scratch.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS baze_voucher_db;
USE baze_voucher_db;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores all user accounts: customers, restaurant owners, admins, and staff
CREATE TABLE IF NOT EXISTS users (
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
);

-- ============================================================================
-- RESTAURANTS TABLE
-- ============================================================================
-- Stores restaurant information and owner details
CREATE TABLE IF NOT EXISTS restaurants (
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
    -- Account Details for Transactions
    bankName VARCHAR(255),
    accountNumber VARCHAR(50),
    accountName VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner (ownerId),
    INDEX idx_approved (isApproved)
);

-- ============================================================================
-- RESTAURANT STAFF TABLE
-- ============================================================================
-- Manages staff members and their permissions for each restaurant
CREATE TABLE IF NOT EXISTS restaurant_staff (
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
);

-- ============================================================================
-- MENU ITEMS TABLE
-- ============================================================================
-- Stores menu items for each restaurant
CREATE TABLE IF NOT EXISTS menu_items (
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
);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
-- Records all financial transactions (payments)
CREATE TABLE IF NOT EXISTS transactions (
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
);

-- ============================================================================
-- RESTAURANT ORDERS TABLE
-- ============================================================================
-- Stores order information including digital, cash, and transfer orders
CREATE TABLE IF NOT EXISTS restaurant_orders (
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
);

-- ============================================================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================================================
-- Stores subscription plans offered by restaurants
CREATE TABLE IF NOT EXISTS subscription_plans (
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
);

-- ============================================================================
-- CUSTOMER SUBSCRIPTIONS TABLE
-- ============================================================================
-- Tracks customer subscriptions to restaurant plans
CREATE TABLE IF NOT EXISTS customer_subscriptions (
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
);

-- ============================================================================
-- TOP-UP REQUESTS TABLE
-- ============================================================================
-- Stores customer top-up requests with payment proof
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
);

-- ============================================================================
-- DEFAULT ADMIN USER
-- ============================================================================
-- Insert default admin user (password: admin123 - CHANGE THIS IN PRODUCTION!)
-- Password hash for 'admin123' using bcrypt (10 rounds)
INSERT INTO users (name, email, password, role, balance) 
VALUES ('Admin User', 'admin@baze.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 0.00)
ON DUPLICATE KEY UPDATE name=name;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
