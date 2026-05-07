-- price/unit_price/total_amount/balance を TEXT に移行するマイグレーション
PRAGMA foreign_keys = OFF;

-- 1. order_items テーブル再作成（子から先）
CREATE TABLE IF NOT EXISTS order_items_new (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  quantity    INTEGER NOT NULL,
  unit_price  TEXT NOT NULL
);
INSERT INTO order_items_new SELECT id, order_id, product_id, quantity, CAST(unit_price AS TEXT) FROM order_items;
DROP TABLE order_items;
ALTER TABLE order_items_new RENAME TO order_items;

-- 2. orders テーブル再作成
CREATE TABLE IF NOT EXISTS orders_new (
  id              TEXT PRIMARY KEY,
  buyer_user_id   TEXT NOT NULL,
  total_amount    TEXT NOT NULL,
  payment_method  TEXT NOT NULL,
  shipping_addr   TEXT NOT NULL,
  status          TEXT DEFAULT 'ordered',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
INSERT INTO orders_new SELECT id, buyer_user_id, CAST(total_amount AS TEXT), payment_method, shipping_addr, status, created_at, updated_at FROM orders;
DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

-- 3. products テーブル再作成
CREATE TABLE IF NOT EXISTS products_new (
  id            TEXT PRIMARY KEY,
  store_id      TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  price         TEXT NOT NULL,
  stock         INTEGER DEFAULT 0,
  category      TEXT NOT NULL,
  condition     TEXT DEFAULT 'new',
  rating        REAL DEFAULT 0,
  review_count  INTEGER DEFAULT 0,
  is_featured   INTEGER DEFAULT 0,
  images_json   TEXT,
  tags_json     TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);
INSERT INTO products_new SELECT id, store_id, name, description, CAST(price AS TEXT), stock, category, condition, rating, review_count, is_featured, images_json, tags_json, created_at FROM products;
DROP TABLE products;
ALTER TABLE products_new RENAME TO products;

-- 4. users の balance を TEXT に移行
CREATE TABLE IF NOT EXISTS users_new (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  address_json  TEXT,
  role          TEXT DEFAULT 'buyer',
  balance       TEXT DEFAULT '100000000000',
  created_at    TEXT DEFAULT (datetime('now'))
);
INSERT INTO users_new SELECT id, email, display_name, avatar_url, address_json, role, CAST(balance AS TEXT), created_at FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

PRAGMA foreign_keys = ON;
