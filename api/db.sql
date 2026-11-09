-- =======================================================
-- IHA ONLINE SHOP — DATABASE SCHEMA
-- Import this file via phpMyAdmin (cPanel/Hostinger) into
-- the empty database you created for this project.
-- =======================================================

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  image VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(20) PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_address TEXT NOT NULL,
  customer_email VARCHAR(150) DEFAULT '',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  payment_method VARCHAR(30) NOT NULL DEFAULT 'COD',
  payment_reference VARCHAR(100) DEFAULT '',
  payment_screenshot VARCHAR(255) DEFAULT '',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(20) NOT NULL,
  product_id INT,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  qty INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

-- ---------- seed products ----------
INSERT INTO products (name, category, price, stock, image) VALUES
('Gold Halo Ring', 'Jewelry', 120.00, 8, 'assets/images/products/ring.svg'),
('Diamond Drop Earrings', 'Jewelry', 95.00, 5, 'assets/images/products/earrings.svg'),
('Rose Pendant Necklace', 'Jewelry', 150.00, 3, 'assets/images/products/necklace.svg'),
('Silver Chain Bracelet', 'Jewelry', 78.00, 10, 'assets/images/products/necklace.svg'),
('Pearl Stud Earrings', 'Jewelry', 65.00, 12, 'assets/images/products/earrings.svg'),

('Ceramic Storage Jar Set', 'Household', 35.00, 20, 'assets/images/products/jars.svg'),
('Bamboo Cutting Board', 'Household', 22.00, 15, 'assets/images/products/board.svg'),
('Linen Table Runner', 'Household', 28.00, 10, 'assets/images/products/linen.svg'),
('Cotton Bath Towel Set', 'Household', 30.00, 18, 'assets/images/products/linen.svg'),
('Glass Spice Jar Set', 'Household', 26.00, 14, 'assets/images/products/jars.svg'),

('Wireless Charging Pad', 'Gadgets', 40.00, 12, 'assets/images/products/charger.svg'),
('Mini Bluetooth Speaker', 'Gadgets', 55.00, 9, 'assets/images/products/speaker.svg'),
('Smart LED Desk Lamp', 'Gadgets', 60.00, 6, 'assets/images/products/lamp.svg'),
('Portable Power Bank', 'Gadgets', 32.00, 16, 'assets/images/products/charger.svg'),
('Smart Plug', 'Gadgets', 24.00, 20, 'assets/images/products/lamp.svg'),

('Floral Toddler Sweater Set', 'Dresses', 32.00, 14, 'assets/images/dress-hero.png'),
('Sunday Linen Dress', 'Dresses', 48.00, 7, 'assets/images/products/dress-linen.svg'),
('Pastel Knit Cardigan', 'Dresses', 38.00, 11, 'assets/images/products/dress-cardigan.svg'),
('Denim Overall Set', 'Dresses', 42.00, 9, 'assets/images/products/dress-cardigan.svg'),
('Cotton Summer Frock', 'Dresses', 36.00, 13, 'assets/images/products/dress-linen.svg');
