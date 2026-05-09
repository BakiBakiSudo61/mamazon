import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/product/ProductCard';
import type { Product } from '../types';
import styles from './Search.module.css';

export const Search: React.FC = () => {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const c = params.get('c') ?? '';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    productsApi.list({ q: q || undefined, category: c || undefined, limit: 48 })
      .then((r) => setProducts(r.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [q, c]);

  const titleText = c ? `「${c}」の商品` : q ? `「${q}」の検索結果` : 'すべての商品';

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>
          {titleText}
          {!loading && <span className={styles.count}>{products.length}件</span>}
        </h1>
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className={styles.empty}>「{q || c}」に一致する商品が見つかりませんでした</p>
        ) : (
          <div className={styles.grid}>
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
};
