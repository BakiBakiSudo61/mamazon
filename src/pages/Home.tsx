import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, TrendingUp, Sparkles, Clock, ShoppingBag, LogIn } from 'lucide-react';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/product/ProductCard';
import { useAuthStore } from '../stores/authStore';
import type { Product } from '../types';
import styles from './Home.module.css';

const CATEGORIES = [
  { name: '電子機器', emoji: '📱' },
  { name: '衣類', emoji: '👕' },
  { name: '本', emoji: '📚' },
  { name: 'スポーツ', emoji: '⚽' },
  { name: 'おもちゃ', emoji: '🎮' },
  { name: 'インテリア', emoji: '🛋️' },
  { name: '食品', emoji: '🍱' },
  { name: 'その他', emoji: '📦' },
];

const HERO_SLIDES = [
  { title: 'Mamazon へようこそ', sub: '架空のショッピングを楽しもう', cta: '商品を探す', link: '/search', bg: 'linear-gradient(135deg, #232f3e 0%, #37475a 100%)' },
  { title: '💰 Mamazon Finance', sub: 'カジノ・投資・マイニングで資産を増やそう', cta: 'ファイナンスへ', link: '/finance', bg: 'linear-gradient(135deg, #1a0a3e 0%, #2d1b69 100%)' },
  { title: '🏪 出品者募集中', sub: 'あなたもMamazonで商品を販売しませんか？', cta: '出品を始める', link: '/seller/register', bg: 'linear-gradient(135deg, #0a3d2e 0%, #1a6b4a 100%)' },
];

/* Horizontal scroll product row */
const ProductRow: React.FC<{ products: Product[] }> = ({ products }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };
  if (!products.length) return null;
  return (
    <div className={styles.rowWrap}>
      <button className={`${styles.rowArrow} ${styles.rowArrowLeft}`} onClick={() => scroll(-1)}><ChevronLeft size={20} /></button>
      <div className={styles.row} ref={ref}>
        {products.map((p) => (
          <div key={p.id} className={styles.rowItem}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      <button className={`${styles.rowArrow} ${styles.rowArrowRight}`} onClick={() => scroll(1)}><ChevronRight size={20} /></button>
    </div>
  );
};

/* Mini grid image helper - extracts first image */
function firstImg(p: Product): string {
  try { return p.images_json ? JSON.parse(p.images_json)[0] : ''; }
  catch { return ''; }
}

export const Home: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [newest, setNewest] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Carousel
  const [slide, setSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const nextSlide = useCallback(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), []);
  const prevSlide = useCallback(() => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length), []);

  useEffect(() => {
    timerRef.current = setInterval(nextSlide, 5000);
    return () => clearInterval(timerRef.current);
  }, [nextSlide]);

  // Category filter for all-products section
  const [category, setCategory] = useState('すべて');
  const [sort, setSort] = useState('newest');

  // Load all products only when user opens the section
  useEffect(() => {
    if (!showAll) return;
    setLoading(true);
    productsApi
      .list({ category: category === 'すべて' ? undefined : category, sort: sort as never, limit: 24 })
      .then((res) => setAllProducts(res.products))
      .catch(() => setAllProducts([]))
      .finally(() => setLoading(false));
  }, [category, sort, showAll]);

  // Single batch load for featured sections (3 calls merged with Promise.all)
  useEffect(() => {
    Promise.all([
      productsApi.list({ limit: 10, sort: 'recent_bought' as never }),
      productsApi.list({ limit: 10, sort: 'rating' as never }),
      productsApi.list({ limit: 10, sort: 'newest' as never }),
    ]).then(([featRes, popRes, newRes]) => {
      setFeatured(featRes.products.length > 0 ? featRes.products : newRes.products);
      setPopular(popRes.products);
      setNewest(newRes.products);
    }).catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      {/* === Hero Carousel === */}
      <section className={styles.hero}>
        {HERO_SLIDES.map((s, i) => (
          <div key={i} className={`${styles.heroSlide} ${i === slide ? styles.heroActive : ''}`} style={{ background: s.bg }}>
            <div className={styles.heroContent}>
              <h1>{s.title}</h1>
              <p>{s.sub}</p>
              <Link to={s.link} className={styles.heroCta}>{s.cta}</Link>
            </div>
          </div>
        ))}
        <button className={`${styles.heroArrow} ${styles.heroLeft}`} onClick={prevSlide}><ChevronLeft size={36} /></button>
        <button className={`${styles.heroArrow} ${styles.heroRight}`} onClick={nextSlide}><ChevronRight size={36} /></button>
        <div className={styles.heroDots}>
          {HERO_SLIDES.map((_, i) => (
            <button key={i} className={`${styles.heroDot} ${i === slide ? styles.heroDotActive : ''}`} onClick={() => setSlide(i)} />
          ))}
        </div>
        <div className={styles.heroFade} />
      </section>

      <div className={styles.inner}>
        {/* === Category Cards === */}
        <section className={styles.catGrid}>
          {CATEGORIES.map((c) => (
            <Link key={c.name} to={`/search?c=${c.name}`} className={styles.catCard}>
              <span className={styles.catEmoji}>{c.emoji}</span>
              <span className={styles.catName}>{c.name}</span>
            </Link>
          ))}
        </section>

        {/* === Sign-in Banner (non-logged-in) === */}
        {!user && (
          <div className={styles.signInBanner}>
            <LogIn size={20} />
            <p>ログインしてパーソナライズされたおすすめを見る</p>
            <Link to="/" className={styles.signInBtn}>ログイン</Link>
          </div>
        )}

        {/* === Multi-Section Layout === */}
        <div className={styles.multiGrid}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}><TrendingUp size={20} /> 注目の商品</h2>
            <div className={styles.miniGrid}>
              {featured.slice(0, 4).map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className={styles.miniItem}>
                  <img src={firstImg(p)} alt={p.name} loading="lazy" />
                  <span>{p.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}><Sparkles size={20} /> 人気ランキング</h2>
            <div className={styles.miniGrid}>
              {popular.slice(0, 4).map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className={styles.miniItem}>
                  <img src={firstImg(p)} alt={p.name} loading="lazy" />
                  <span>{p.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}><Clock size={20} /> 新着商品</h2>
            <div className={styles.miniGrid}>
              {newest.slice(0, 4).map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className={styles.miniItem}>
                  <img src={firstImg(p)} alt={p.name} loading="lazy" />
                  <span>{p.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* === Horizontal Scroll Sections === */}
        {featured.length > 0 && (
          <section className={styles.scrollSection}>
            <h2 className={styles.scrollTitle}><ShoppingBag size={20} /> 最近購入された商品</h2>
            <ProductRow products={featured} />
          </section>
        )}

        {popular.length > 0 && (
          <section className={styles.scrollSection}>
            <h2 className={styles.scrollTitle}><Sparkles size={20} /> 高評価の商品</h2>
            <ProductRow products={popular} />
          </section>
        )}

        {/* === All Products (lazy loaded) === */}
        {!showAll ? (
          <button className={styles.showAllBtn} onClick={() => setShowAll(true)}>
            すべての商品を表示する
          </button>
        ) : (
          <section className={styles.allSection}>
            <div className={styles.controls}>
              <div className={styles.categories}>
                {['すべて', ...CATEGORIES.map((c) => c.name)].map((c) => (
                  <button key={c} className={`${styles.catBtn} ${category === c ? styles.catBtnActive : ''}`} onClick={() => setCategory(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <select className={styles.sortSelect} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">新着順</option>
                <option value="price_asc">価格（安い順）</option>
                <option value="price_desc">価格（高い順）</option>
                <option value="rating">評価順</option>
              </select>
            </div>

            {loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : allProducts.length === 0 ? (
              <p className={styles.empty}>商品が見つかりませんでした</p>
            ) : (
              <div className={styles.grid}>
                {allProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
