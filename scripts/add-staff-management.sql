-- Migration script to add staff management system
-- Run this if you already have a database without staff tables

-- Restaurant Staff Table
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

-- Add createdBy and preparedBy to restaurant_orders
ALTER TABLE restaurant_orders 
ADD COLUMN createdBy INT NULL AFTER customerName,
ADD COLUMN preparedBy INT NULL AFTER createdBy,
ADD FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL,
ADD FOREIGN KEY (preparedBy) REFERENCES users(id) ON DELETE SET NULL,
ADD INDEX idx_created_by (createdBy),
ADD INDEX idx_prepared_by (preparedBy);

