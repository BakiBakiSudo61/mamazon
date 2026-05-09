import React from 'react';
import { useFavoriteStore } from '../stores/favoriteStore';
import { ProductCard } from '../components/product/ProductCard';
import styles from './List.module.css';

export const Favorites: React.FC = () => {
  const items = useFavoriteStore((s) => s.items);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>お気に入り</h1>
      {items.length === 0 ? (
        <div className={styles.empty}>お気に入りには何もありません。</div>
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
