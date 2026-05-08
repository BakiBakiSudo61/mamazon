import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Package } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sellerApi } from '../api/seller';
import { ProductCard } from '../components/product/ProductCard';
import type { Store as StoreType, Product } from '../types';
import styles from './Store.module.css';

/** 明るい色かどうかを判定して、テキストカラーを返す */
function getContrastColor(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h.padEnd(6, '0');
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // WCAG relative luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 140 ? '#111111' : '#ffffff';
}

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

  const bg = store.brand_color || undefined;
  const fg = bg ? getContrastColor(bg) : undefined;

  return (
    <div className={styles.page}>
      <div
        className={styles.header}
        style={bg ? { background: bg, borderBottomColor: 'transparent' } : undefined}
      >
        <div className={styles.headerInner}>
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.store_name} className={styles.logo} />
          ) : (
            <div
              className={styles.logoPlaceholder}
              style={bg ? { background: `${fg === '#ffffff' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`, color: fg } : undefined}
            >
              <Package size={32} />
            </div>
          )}
          <div style={fg ? { color: fg } : undefined}>
            <h1 className={styles.storeName}>{store.store_name}</h1>
            <div className={styles.meta} style={fg ? { color: `${fg}cc` } : undefined}>
              <Star size={14} fill="currentColor" style={{ color: fg ? '#ffdd77' : '#ffb400' }} />
              <span>{store.rating.toFixed(1)}</span>
              <span className={styles.dot}>·</span>
              <span>{store.sales_count}件の販売</span>
            </div>
            {store.description && (
              <div
                className={styles.desc}
                style={fg ? { color: `${fg}cc` } : undefined}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{store.description}</ReactMarkdown>
              </div>
            )}
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
