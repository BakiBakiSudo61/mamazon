-- 受注生産フラグを products テーブルに追加
ALTER TABLE products ADD COLUMN made_to_order INTEGER DEFAULT 0;
