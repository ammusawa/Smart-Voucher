-- Migration script to add imageUrl column to existing menu_items table
-- Run this if you already have menu_items table without imageUrl column

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS imageUrl VARCHAR(500) AFTER description;

