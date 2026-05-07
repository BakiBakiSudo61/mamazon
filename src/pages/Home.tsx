import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/product/ProductCard';
import type { Product } from '../types';
import styles from './Home.module.css';

const CATEGORIES = ['すべて', '電子機器', '衣類', '本', 'スポーツ', 'おもちゃ', 'インテリア', '食品', 'その他'];

export const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [category, setCategory] = useState('すべて');
  const [sort, setSort] = useState<string>('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    productsApi
      .list({
        category: category === 'すべて' ? undefined : category,
        sort: sort as never,
        limit: 24,
      })
      .then((res) => setProducts(res.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, sort]);

  useEffect(() => {
    productsApi
      .list({ limit: 4 })
      .then((res) => {
        const f = res.products.filter((p) => p.is_featured === 1).slice(0, 4);
        setFeatured(f.length ? f : res.products.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      {/* Hero Banner */}
      <section className={styles.banner}>
        <div className={styles.bannerContent}>
          <h1>架空のショッピングを楽しもう</h1>
          <p>リアルな決済なし・発送なし。ロールプレイングECサイト</p>
          <Link to="/search" className={styles.bannerBtn}>商品を探す</Link>
        </div>
      </section>

      <div className={styles.inner}>
        {/* Featured */}
        {featured.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>注目の商品</h2>
            <div className={styles.grid}>
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Category & Sort */}
        <div className={styles.controls}>
          <div className={styles.categories}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={[styles.catBtn, category === c ? styles.active : ''].join(' ')}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <select
            className={styles.sortSelect}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">新着順</option>
            <option value="price_asc">価格（安い順）</option>
            <option value="price_desc">価格（高い順）</option>
            <option value="rating">評価順</option>
          </select>
        </div>

        {/* Product Grid */}
        <section className={styles.section}>
          {loading ? (
            <div className={styles.loading}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className={styles.empty}>商品が見つかりませんでした</p>
          ) : (
            <div className={styles.grid}>
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
