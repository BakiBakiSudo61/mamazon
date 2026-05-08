-- finance_balance カラムをusersテーブルに追加するマイグレーション
-- (CloudflareD1でのAlter Table対応)
ALTER TABLE users ADD COLUMN finance_balance TEXT DEFAULT '10000';

-- 既存ユーザーにデフォルト値を設定
UPDATE users SET finance_balance = '10000' WHERE finance_balance IS NULL OR finance_balance = '';
