import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Calendar, Sparkles } from 'lucide-react';
import { ordersApi } from '../api/orders';
import type { Product } from '../types';
import styles from './Collection.module.css';

interface CollectionItem extends Product {
  purchased_at: string;
  total_qty: number;
}

export const Collection: React.FC = () => {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.getCollection()
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">読み込み中...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>MY COLLECTION</h1>
        <p className={styles.subtitle}>あなたがこれまでに手に入れた、特別なアイテムたち</p>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <Crown size={64} className={styles.emptyIcon} />
          <h2>まだコレクションがありません</h2>
          <p>お気に入りの商品を見つけて、あなただけのコレクションを作りましょう</p>
          <div style={{ marginTop: 24 }}>
            <Link to="/home" className="btn btn-primary" style={{ padding: '12px 24px', textDecoration: 'none', color: '#fff', background: 'var(--accent)', borderRadius: '8px' }}>
              商品を探す
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.showcase}>
          {items.map((item) => {
            const images = item.images_json ? JSON.parse(item.images_json) : [];
            const image = images[0] || 'https://placehold.co/400x300/1a1a2e/e0e0e0?text=No+Image';
            const date = new Date(item.purchased_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });

            return (
              <Link to={`/product/${item.id}`} key={item.id} className={styles.itemCard}>
                <div className={styles.imageWrap}>
                  <div className={styles.pedestal} />
                  <img src={image} alt={item.name} className={styles.image} loading="lazy" />
                  <div className={styles.badge}>
                    <Sparkles size={14} />
                    <span>OWNED</span>
                  </div>
                </div>
                <div className={styles.info}>
                  <h3 className={styles.name}>{item.name}</h3>
                  <p className={styles.brand}>{item.store_name || 'Unknown Brand'}</p>
                  
                  <div className={styles.meta}>
                    <div className={styles.date}>
                      <Calendar size={14} />
                      <span>{date} 取得</span>
                    </div>
                    <div className={styles.qty}>
                      所持数: {item.total_qty}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
