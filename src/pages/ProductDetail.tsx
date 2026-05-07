import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, Store, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { productsApi } from '../api/products';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { Product, Review } from '../types';
import styles from './ProductDetail.module.css';

const PLACEHOLDER = 'https://placehold.co/600x500/1a1a2e/e0e0e0?text=No+Image';

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        fill={n <= Math.round(rating) ? 'currentColor' : 'none'}
        style={{ color: '#ffb400' }}
      />
    ))}
  </div>
);

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [imgIndex, setImgIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingCart, setAddingCart] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      productsApi.get(id),
      productsApi.getReviews(id),
    ])
      .then(([p, r]) => {
        setProduct(p);
        setReviews(r.reviews);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const images = product?.images_json ? JSON.parse(product.images_json) : [PLACEHOLDER];

  const handleAddToCart = async () => {
    if (!user) { addToast({ type: 'info', message: 'ログインが必要です' }); return; }
    setAddingCart(true);
    try {
      await addItem(product!.id, qty);
      addToast({ type: 'success', message: `${qty}点をカートに追加しました` });
    } catch {
      addToast({ type: 'error', message: 'カートへの追加に失敗しました' });
    } finally {
      setAddingCart(false);
    }
  };

  if (loading) return <div className={styles.loading}>読み込み中...</div>;
  if (!product) return <div className={styles.loading}>商品が見つかりませんでした</div>;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link to="/home">ホーム</Link> &rsaquo;
          <span>{product.category}</span> &rsaquo;
          <span>{product.name}</span>
        </nav>

        <div className={styles.main}>
          {/* Gallery */}
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              <img src={images[imgIndex] || PLACEHOLDER} alt={product.name} />
              {images.length > 1 && (
                <>
                  <button className={[styles.navBtn, styles.prev].join(' ')} onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}>
                    <ChevronLeft size={20} />
                  </button>
                  <button className={[styles.navBtn, styles.next].join(' ')} onClick={() => setImgIndex((i) => (i + 1) % images.length)}>
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className={styles.thumbs}>
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    className={[styles.thumb, i === imgIndex ? styles.thumbActive : ''].join(' ')}
                    onClick={() => setImgIndex(i)}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className={styles.info}>
            <div className={styles.badges}>
              <Badge variant="info">{product.category}</Badge>
              {product.condition === 'new' && <Badge variant="success">新品</Badge>}
              {product.is_featured === 1 && <Badge variant="warning">注目</Badge>}
            </div>
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.ratingRow}>
              <StarRating rating={product.rating} />
              <span className={styles.ratingNum}>{product.rating.toFixed(1)}</span>
              <span className={styles.reviewCount}>({product.review_count}件のレビュー)</span>
            </div>
            <div className={styles.price}>¥{product.price.toLocaleString()}</div>

            {product.store && (
              <Link to={`/store/${product.store_id}`} className={styles.storeLink}>
                <Store size={15} />
                {product.store.store_name}
              </Link>
            )}

            <p className={styles.description}>{product.description}</p>

            <div className={styles.stockRow}>
              {product.stock > 0 ? (
                <span className={styles.inStock}>在庫あり（{product.stock}点）</span>
              ) : (
                <span className={styles.outStock}>在庫なし</span>
              )}
            </div>

            {product.stock > 0 && (
              <div className={styles.qtyRow}>
                <label>数量</label>
                <select
                  className={styles.qtySelect}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                >
                  {Array.from({ length: Math.min(product.stock, 10) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}

            <Button
              size="lg"
              fullWidth
              onClick={handleAddToCart}
              loading={addingCart}
              disabled={product.stock === 0}
            >
              <ShoppingCart size={18} />
              {product.stock === 0 ? '在庫なし' : 'カートに追加'}
            </Button>

            <div className={styles.securityNote}>
              <Shield size={14} />
              <span>架空のサイトです。実際の決済は発生しません</span>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section className={styles.reviewSection}>
          <h2>カスタマーレビュー</h2>
          {reviews.length === 0 ? (
            <p className={styles.noReview}>まだレビューはありません</p>
          ) : (
            <div className={styles.reviewList}>
              {reviews.map((r) => (
                <div key={r.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <StarRating rating={r.rating} size={14} />
                    <span className={styles.reviewDate}>
                      {new Date(r.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  {r.title && <h4 className={styles.reviewTitle}>{r.title}</h4>}
                  <p className={styles.reviewBody}>{r.body}</p>
                  <p className={styles.reviewUser}>{r.user?.display_name ?? '匿名'}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
