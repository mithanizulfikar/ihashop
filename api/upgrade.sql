-- =======================================================
-- UPGRADE SCRIPT — only needed if you already imported an
-- earlier version of db.sql. Run this once in phpMyAdmin's
-- SQL tab. Safe to skip if you're importing db.sql fresh.
-- =======================================================

-- Note: "ADD COLUMN IF NOT EXISTS" requires MySQL 8.0.29+ / recent MariaDB.
-- If your host's MySQL is older and this errors, remove "IF NOT EXISTS"
-- from the three ADD COLUMN lines below and run again.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NOT NULL DEFAULT 'COD' AFTER status,
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100) DEFAULT '' AFTER payment_method,
  ADD COLUMN IF NOT EXISTS payment_screenshot VARCHAR(255) DEFAULT '' AFTER payment_reference,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid' AFTER payment_screenshot;

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  subject VARCHAR(200) DEFAULT '',
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rate_limit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  identifier VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action_identifier_time (action, identifier, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
