-- サンプルストア
INSERT OR IGNORE INTO users (id, email, display_name, avatar_url, role, balance)
VALUES ('demo-seller-1', 'shop@example.com', 'デモショップ', null, 'seller', 500000);

INSERT OR IGNORE INTO stores (id, owner_user_id, store_name, description, rating, sales_count)
VALUES ('store-1', 'demo-seller-1', 'テックショップ東京', '最新の電子機器を取り扱うストアです', 4.5, 128);

INSERT OR IGNORE INTO stores (id, owner_user_id, store_name, description, rating, sales_count)
VALUES ('store-2', 'demo-seller-1', 'ファッションハウス', 'トレンドを先取りするファッションストア', 4.2, 89);

-- サンプル商品（電子機器）
INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-1', 'store-1', 'ワイヤレスイヤホン ProX', '高音質・ノイズキャンセリング搭載のワイヤレスイヤホン。最大30時間再生可能。', 12800, 50, '電子機器', 'new', 4.5, 23, 1, '["https://placehold.co/600x500/1a2e4a/e0e0ff?text=Earphone+ProX"]');

INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-2', 'store-1', 'スマートウォッチ V3', '心拍数・血中酸素・睡眠モニタリング対応。防水IP68。', 28500, 30, '電子機器', 'new', 4.3, 15, 1, '["https://placehold.co/600x500/2e1a4a/e0d0ff?text=Smart+Watch+V3"]');

INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-3', 'store-1', 'メカニカルキーボード RGB', 'Cherry MX青軸採用。フルRGBバックライト。テンキーレス。', 9800, 20, '電子機器', 'new', 4.7, 42, 0, '["https://placehold.co/600x500/1a3a2e/d0ffe0?text=Keyboard+RGB"]');

INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-4', 'store-1', 'USB-C ハブ 7in1', 'HDMI 4K・USB3.0×3・SD/microSD・PD100W対応。アルミ製。', 4200, 100, '電子機器', 'new', 4.1, 67, 0, '["https://placehold.co/600x500/2a2a1a/ffffe0?text=USB-C+Hub"]');

INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-5', 'store-1', '27インチ 4Kモニター', 'IPS液晶・144Hz・HDR400対応。エルゴノミクススタンド付き。', 68000, 8, '電子機器', 'new', 4.8, 11, 1, '["https://placehold.co/600x500/1a1a4a/d0d0ff?text=4K+Monitor+27"]');

-- サンプル商品（衣類）
INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-6', 'store-2', 'オーバーサイズTシャツ', '100%オーガニックコットン。ユニセックスデザイン。S〜XL展開。', 3980, 200, '衣類', 'new', 4.0, 35, 0, '["https://placehold.co/600x500/4a1a2e/ffd0e0?text=Oversized+Tee"]');

INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-7', 'store-2', 'デニムジャケット クラシック', 'ヴィンテージウォッシュ加工。ストレッチデニム使用。', 12000, 45, '衣類', 'new', 4.4, 18, 1, '["https://placehold.co/600x500/1a2a4a/d0e0ff?text=Denim+Jacket"]');

-- サンプル商品（本）
INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-8', 'store-1', 'Clean Code 日本語版', '良いコードを書くための実践的ガイド。ソフトウェア開発者必読の1冊。', 3200, 60, '本', 'new', 4.9, 88, 0, '["https://placehold.co/600x500/2a4a1a/d0ffd0?text=Clean+Code"]');

INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-9', 'store-1', 'デザインパターン入門', 'GoFパターン23種を実例で解説。TypeScript対応サンプルコード付き。', 2800, 40, '本', 'new', 4.6, 54, 0, '["https://placehold.co/600x500/4a3a1a/fff0d0?text=Design+Patterns"]');

-- サンプル商品（インテリア）
INSERT OR IGNORE INTO products (id, store_id, name, description, price, stock, category, condition, rating, review_count, is_featured, images_json)
VALUES ('prod-10', 'store-2', '北欧スタイル デスクライト', 'LED・調光調色機能付き。USB充電ポート搭載。ミニマルデザイン。', 6800, 35, 'インテリア', 'new', 4.3, 27, 1, '["https://placehold.co/600x500/4a4a1a/ffffe0?text=Desk+Light"]');
