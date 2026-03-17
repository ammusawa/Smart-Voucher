-- Migration script to add customerName column to restaurant_orders table
-- This allows orders to have an optional customer name for identification

-- Add customerName column
ALTER TABLE restaurant_orders ADD COLUMN customerName VARCHAR(255) NULL AFTER userId;

