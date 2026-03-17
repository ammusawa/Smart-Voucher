-- Migration script to add subscription tables to existing database
-- Run this if you already have a database without subscription tables

-- Subscription Plans Table
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

-- Customer Subscriptions Table
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

