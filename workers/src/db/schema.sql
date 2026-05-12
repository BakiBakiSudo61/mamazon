-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  address_json  TEXT,
  role          TEXT DEFAULT 'buyer',
  balance       TEXT DEFAULT '1000000',
  points        TEXT DEFAULT '0',
  finance_balance TEXT DEFAULT '10000',
  created_at    TEXT DEFAULT (datetime('now'))
);

-- ストアテーブル
CREATE TABLE IF NOT EXISTS stores (
  id               TEXT PRIMARY KEY,
  owner_user_id    TEXT NOT NULL REFERENCES users(id),
  store_name       TEXT NOT NULL,
  description      TEXT,
  logo_url         TEXT,
  brand_color      TEXT,
  rating           REAL DEFAULT 3.5,
  sales_count      INTEGER DEFAULT 0,
  created_at       TEXT DEFAULT (datetime('now'))
);

-- 商品テーブル
CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,
  store_id      TEXT NOT NULL REFERENCES stores(id),
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

-- 注文テーブル
CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  buyer_user_id   TEXT NOT NULL REFERENCES users(id),
  total_amount    TEXT NOT NULL,
  payment_method  TEXT NOT NULL,
  shipping_addr   TEXT NOT NULL,
  status          TEXT DEFAULT 'ordered',
  earned_points   TEXT DEFAULT '0',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- 注文明細テーブル
CREATE TABLE IF NOT EXISTS order_items (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id),
  product_id  TEXT NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL,
  unit_price  TEXT NOT NULL
);

-- レビューテーブル
CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  order_id    TEXT NOT NULL REFERENCES orders(id),
  rating      INTEGER NOT NULL,
  title       TEXT,
  body        TEXT,
  helpful     INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ユーザー保有アセットテーブル（株・仮想通貨など）
CREATE TABLE IF NOT EXISTS user_assets (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  asset_id        TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 0,
  avg_buy_price   REAL NOT NULL DEFAULT 0,
  updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_assets_user_asset ON user_assets(user_id, asset_id);
