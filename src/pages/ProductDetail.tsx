import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, Shield, ChevronLeft, ChevronRight, Truck, Clock, Lock, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { productsApi } from '../api/products';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { Product, Review } from '../types';
import { formatPrice } from '../utils/price';
import styles from './ProductDetail.module.css';

const PLACEHOLDER = 'https://placehold.co/600x500/1a1a2e/e0e0e0?text=No+Image';

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        fill={n <= Math.round(rating) ? 'currentColor' : 'none'}
        style={{ color: '#fb923c' }}
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

  const handleBuyNow = async () => {
    if (!user) { addToast({ type: 'info', message: 'ログインが必要です' }); return; }
    // Simulated buy now logic
    addToast({ type: 'success', message: '1-Clickで注文を確定しました（仮想）' });
  };

  if (loading) return <div className={styles.loading}><div></div></div>;
  if (!product) return <div className={styles.loading}>商品が見つかりませんでした</div>;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link to="/home">ホーム</Link> <span className={styles.separator}>&rsaquo;</span>
          <Link to={`/search?c=${product.category}`}>{product.category}</Link> <span className={styles.separator}>&rsaquo;</span>
          <span className={styles.current}>{product.name}</span>
        </nav>

        <div className={styles.main}>
          {/* Column 1: Gallery */}
          <div className={styles.gallery}>
            <div className={styles.mainImageWrap}>
              <img src={images[imgIndex] || PLACEHOLDER} alt={product.name} className={styles.mainImage} />
              {images.length > 1 && (
                <>
                  <button className={[styles.navBtn, styles.prev].join(' ')} onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}>
                    <ChevronLeft size={24} />
                  </button>
                  <button className={[styles.navBtn, styles.next].join(' ')} onClick={() => setImgIndex((i) => (i + 1) % images.length)}>
                    <ChevronRight size={24} />
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
                    <img src={img} alt={`Thumb ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Info */}
          <div className={styles.info}>
            <h1 className={styles.title}>{product.name}</h1>
            {product.store && (
              <Link to={`/store/${product.store_id}`} className={styles.storeLink}>
                ブランド: {product.store.store_name}
              </Link>
            )}
            
            <div className={styles.ratingRow}>
              <StarRating rating={product.rating} size={18} />
              <span className={styles.ratingNum}>{product.rating.toFixed(1)}</span>
              <span className={styles.reviewCount}>({product.review_count}件の評価)</span>
            </div>

            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>参考価格:</span>
              <span className={styles.priceValue}>{formatPrice(product.price)}</span>
            </div>

            {product.is_featured === 1 && (
              <div className={styles.primeBanner}>
                <span className={styles.primeLogo}>Prime</span>
                <span>お急ぎ便無料</span>
              </div>
            )}

            <div className={styles.badges}>
              <Badge variant="info">{product.category}</Badge>
              {product.condition === 'new' && <Badge variant="success">新品</Badge>}
            </div>

            <div className={styles.aboutItem}>
              <h3>この商品について</h3>
              <div className={styles.description}>
                {product.description ? (
                  <ReactMarkdown>{product.description}</ReactMarkdown>
                ) : (
                  <p>説明なし</p>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Buy Box */}
          <div className={styles.buyBox}>
            <div className={styles.buyBoxInner}>
              <div className={styles.buyBoxPrice}>{formatPrice(product.price)}</div>
              
              <div className={styles.deliveryInfo}>
                <div className={styles.deliveryItem}>
                  <Truck size={16} />
                  <span>無料配送 <strong className={styles.highlight}>明日</strong></span>
                </div>
                <div className={styles.deliveryItem}>
                  <Clock size={16} />
                  <span>14時間30分以内に注文した場合</span>
                </div>
              </div>

              <div className={styles.stockStatus}>
                {product.stock > 0 ? (
                  <h4 className={styles.inStock}>在庫あり</h4>
                ) : (
                  <h4 className={styles.outStock}>在庫なし</h4>
                )}
              </div>

              {product.stock > 0 && (
                <div className={styles.qtyContainer}>
                  <label htmlFor="qty">数量: </label>
                  <select
                    id="qty"
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

              <div className={styles.actions}>
                <Button
                  size="lg"
                  fullWidth
                  className={styles.addToCartBtn}
                  onClick={handleAddToCart}
                  loading={addingCart}
                  disabled={product.stock === 0}
                >
                  <ShoppingCart size={18} />
                  カートに入れる
                </Button>
                
                <Button
                  size="lg"
                  fullWidth
                  className={styles.buyNowBtn}
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                >
                  今すぐ買う（仮想）
                </Button>
              </div>

              <div className={styles.sellerInfo}>
                <div className={styles.sellerRow}>
                  <span className={styles.sellerLabel}>出荷元</span>
                  <span className={styles.sellerValue}>Mamazon</span>
                </div>
                <div className={styles.sellerRow}>
                  <span className={styles.sellerLabel}>販売元</span>
                  <span className={styles.sellerValue}>{product.store?.store_name || '不明'}</span>
                </div>
              </div>

              <div className={styles.securityNote}>
                <Lock size={14} />
                <span>安全な仮想トランザクション</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section className={styles.reviewSection}>
          <div className={styles.reviewGrid}>
            <div className={styles.reviewSidebar}>
              <h2>カスタマーレビュー</h2>
              <div className={styles.reviewSummary}>
                <div className={styles.summaryStars}>
                  <StarRating rating={product.rating} size={24} />
                  <span className={styles.summaryScore}>{product.rating.toFixed(1)}</span>
                </div>
                <p className={styles.summaryCount}>星5つ中の{product.rating.toFixed(1)}</p>
                <p className={styles.summaryTotal}>{product.review_count}件のグローバル評価</p>
              </div>
            </div>
            
            <div className={styles.reviewContent}>
              {reviews.length === 0 ? (
                <div className={styles.noReviewBox}>
                  <Shield size={32} className={styles.noReviewIcon} />
                  <p>まだレビューはありません。最初のレビューを書いてみませんか？</p>
                </div>
              ) : (
                <div className={styles.reviewList}>
                  {reviews.map((r) => (
                    <div key={r.id} className={styles.reviewCard}>
                      <div className={styles.reviewUser}>
                        <div className={styles.userAvatar}>
                          <User size={16} />
                        </div>
                        <span>{r.user?.display_name ?? '匿名ユーザー'}</span>
                      </div>
                      <div className={styles.reviewHeader}>
                        <StarRating rating={r.rating} size={14} />
                        {r.title && <h4 className={styles.reviewTitle}>{r.title}</h4>}
                      </div>
                      <span className={styles.reviewDate}>
                        {new Date(r.created_at).toLocaleDateString('ja-JP')} にレビュー済み
                      </span>
                      <span className={styles.verifiedBadge}>仮想購入者</span>
                      <p className={styles.reviewBody}>{r.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
