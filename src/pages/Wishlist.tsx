import React from 'react';
import { useWishlistStore } from '../stores/wishlistStore';
import { ProductCard } from '../components/product/ProductCard';
import styles from './List.module.css';

export const Wishlist: React.FC = () => {
  const items = useWishlistStore((s) => s.items);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>欲しいものリスト</h1>
      {items.length === 0 ? (
        <div className={styles.empty}>欲しいものリストには何もありません。</div>
      ) : (
        <div className={styles.grid}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};
