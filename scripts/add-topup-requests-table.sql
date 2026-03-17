-- Migration script to add top-up requests table
-- Run this to enable customer top-up requests with payment proof

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

