-- =======================================================
-- OPTIONAL: EXTRA DEMO PRODUCTS
-- Only needed if you already imported an older db.sql and want the
-- extra sample products too (for more items to test Add to Cart with).
-- Safe to skip if you're importing db.sql fresh, or if you've already
-- added your own real products and don't want more demo clutter.
-- =======================================================

INSERT INTO products (name, category, price, stock, image) VALUES
('Silver Chain Bracelet', 'Jewelry', 78.00, 10, 'assets/images/products/necklace.svg'),
('Pearl Stud Earrings', 'Jewelry', 65.00, 12, 'assets/images/products/earrings.svg'),
('Cotton Bath Towel Set', 'Household', 30.00, 18, 'assets/images/products/linen.svg'),
('Glass Spice Jar Set', 'Household', 26.00, 14, 'assets/images/products/jars.svg'),
('Portable Power Bank', 'Gadgets', 32.00, 16, 'assets/images/products/charger.svg'),
('Smart Plug', 'Gadgets', 24.00, 20, 'assets/images/products/lamp.svg'),
('Denim Overall Set', 'Dresses', 42.00, 9, 'assets/images/products/dress-cardigan.svg'),
('Cotton Summer Frock', 'Dresses', 36.00, 13, 'assets/images/products/dress-linen.svg');
