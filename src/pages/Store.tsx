import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Package } from 'lucide-react';
import { sellerApi } from '../api/seller';
import { ProductCard } from '../components/product/ProductCard';
import type { Store as StoreType, Product } from '../types';
import styles from './Store.module.css';

export const Store: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([sellerApi.getStore(id), sellerApi.getStoreProducts(id)])
      .then(([s, p]) => { setStore(s); setProducts(p.products); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.loading}>読み込み中...</div>;
  if (!store) return <div className={styles.loading}>ストアが見つかりませんでした</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.store_name} className={styles.logo} />
          ) : (
            <div className={styles.logoPlaceholder}><Package size={32} /></div>
          )}
          <div>
            <h1 className={styles.storeName}>{store.store_name}</h1>
            <div className={styles.meta}>
              <Star size={14} fill="currentColor" style={{ color: '#ffb400' }} />
              <span>{store.rating.toFixed(1)}</span>
              <span className={styles.dot}>·</span>
              <span>{store.sales_count}件の販売</span>
            </div>
            {store.description && <p className={styles.desc}>{store.description}</p>}
          </div>
        </div>
      </div>

      <div className={styles.inner}>
        <h2 className={styles.sectionTitle}>出品商品（{products.length}件）</h2>
        {products.length === 0 ? (
          <p className={styles.empty}>商品はありません</p>
        ) : (
          <div className={styles.grid}>
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
};
