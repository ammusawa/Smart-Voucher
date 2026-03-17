-- Migration script to add profile fields to existing restaurants table
-- Run this if you already have restaurants table without profile fields

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS description TEXT AFTER location,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) AFTER description,
ADD COLUMN IF NOT EXISTS email VARCHAR(255) AFTER phone,
ADD COLUMN IF NOT EXISTS address TEXT AFTER email,
ADD COLUMN IF NOT EXISTS openingHours VARCHAR(255) AFTER address,
ADD COLUMN IF NOT EXISTS website VARCHAR(255) AFTER openingHours,
ADD COLUMN IF NOT EXISTS logoUrl VARCHAR(500) AFTER website,
ADD COLUMN IF NOT EXISTS bankName VARCHAR(255) AFTER qrCodeUrl,
ADD COLUMN IF NOT EXISTS accountNumber VARCHAR(50) AFTER bankName,
ADD COLUMN IF NOT EXISTS accountName VARCHAR(255) AFTER accountNumber;

