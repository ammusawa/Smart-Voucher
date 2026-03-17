-- Migration script to allow NULL userId in restaurant_orders table
-- This allows orders to be created without a customer ID (for QR code scanning)

-- Modify the userId column to allow NULL
ALTER TABLE restaurant_orders MODIFY COLUMN userId INT NULL;

