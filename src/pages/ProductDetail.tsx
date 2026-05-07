import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, Shield, ChevronLeft, ChevronRight, Truck, Clock, Lock, User, Edit3, CheckCircle } from 'lucide-react';
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

const StarInput: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className={styles.starInput}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={styles.starBtn}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          aria-label={`${n}星`}
        >
          <Star
            size={28}
            fill={(hover || value) >= n ? 'currentColor' : 'none'}
            style={{ color: (hover || value) >= n ? '#fb923c' : 'var(--border)' }}
          />
        </button>
      ))}
      {value > 0 && (
        <span className={styles.starLabel}>
          {['', '星1つ', '星2つ', '星3つ', '星4つ', '星5つ'][value]}
        </span>
      )}
    </div>
  );
};

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [imgIndex, setImgIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingCart, setAddingCart] = useState(false);

  // Review form state
  const [eligibleOrderId, setEligibleOrderId] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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

  // eligibility check (runs when user is logged in)
  useEffect(() => {
    if (!id || !user) return;
    productsApi.getReviewEligibility(id)
      .then((r) => {
        setEligibleOrderId(r.order_id);
        setAlreadyReviewed(r.already_reviewed);
      })
      .catch(() => {});
  }, [id, user]);

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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !eligibleOrderId) return;
    if (reviewRating === 0) { addToast({ type: 'error', message: '星評価を選択してください' }); return; }
    setSubmittingReview(true);
    try {
      const newReview = await productsApi.postReview(id, {
        rating: reviewRating,
        title: reviewTitle || undefined,
        body: reviewBody || undefined,
        order_id: eligibleOrderId,
      });
      setReviews((prev) => [newReview, ...prev]);
      setAlreadyReviewed(true);
      setShowReviewForm(false);
      setReviewRating(0); setReviewTitle(''); setReviewBody('');
      // refresh product rating
      productsApi.get(id).then(setProduct).catch(() => {});
      addToast({ type: 'success', message: 'レビューを投稿しました' });
    } catch (err: unknown) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'レビューの投稿に失敗しました' });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className={styles.loading}><div></div></div>;
  if (!product) return <div className={styles.loading}>商品が見つかりませんでした</div>;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <nav className={styles.breadcrumb}>
          <Link to="/home">ホーム</Link> <span className={styles.separator}>&rsaquo;</span>
          <Link to={`/search?c=${product.category}`}>{product.category}</Link> <span className={styles.separator}>&rsaquo;</span>
          <span className={styles.current}>{product.name}</span>
        </nav>

        <div className={styles.main}>
          {/* Column 1: Gallery */}
          <div className={styles.gallery}>
            {/* Mobile-only: product name + brand above image */}
            <div className={styles.mobileHeader}>
              <h1 className={styles.mobileTitle}>{product.name}</h1>
              {(product.store_name || product.store?.store_name) && (
                <Link to={`/store/${product.store_id}`} className={styles.mobileBrand}>
                  {product.store_name || product.store?.store_name}
                </Link>
              )}
            </div>
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
            {(product.store_name || product.store?.store_name) && (
              <Link to={`/store/${product.store_id}`} className={styles.storeLink}>
                ブランド: {product.store_name || product.store?.store_name}
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
                  <span className={styles.sellerValue}>{product.store_name || product.store?.store_name || '不明'}</span>
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

              {/* Review CTA */}
              <div className={styles.reviewCta}>
                <h3>レビューを書く</h3>
                {!user ? (
                  <p className={styles.reviewCtaHint}>レビューを投稿するには<Link to="/">ログイン</Link>が必要です</p>
                ) : alreadyReviewed ? (
                  <div className={styles.reviewedBadge}>
                    <CheckCircle size={16} />
                    <span>レビュー済み</span>
                  </div>
                ) : !eligibleOrderId ? (
                  <p className={styles.reviewCtaHint}>この商品を購入するとレビューを書けます</p>
                ) : showReviewForm ? null : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowReviewForm(true)}
                  >
                    <Edit3 size={14} /> レビューを書く
                  </Button>
                )}
              </div>
            </div>

            <div className={styles.reviewContent}>
              {/* Review Form */}
              {showReviewForm && eligibleOrderId && !alreadyReviewed && (
                <form className={styles.reviewForm} onSubmit={handleReviewSubmit}>
                  <h3 className={styles.reviewFormTitle}>レビューを投稿する</h3>
                  <div className={styles.reviewFormField}>
                    <label className={styles.reviewFormLabel}>総合評価 <span className={styles.required}>*</span></label>
                    <StarInput value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div className={styles.reviewFormField}>
                    <label className={styles.reviewFormLabel}>タイトル</label>
                    <input
                      className={styles.reviewFormInput}
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="レビューの見出し（任意）"
                      maxLength={100}
                    />
                  </div>
                  <div className={styles.reviewFormField}>
                    <label className={styles.reviewFormLabel}>レビュー本文</label>
                    <textarea
                      className={styles.reviewFormTextarea}
                      value={reviewBody}
                      onChange={(e) => setReviewBody(e.target.value)}
                      placeholder="商品の使用感などを書いてください（任意）"
                      rows={4}
                    />
                  </div>
                  <div className={styles.reviewFormActions}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowReviewForm(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit" size="sm" loading={submittingReview}>
                      投稿する
                    </Button>
                  </div>
                </form>
              )}

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
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt={r.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <span>{r.display_name ?? r.user?.display_name ?? '匿名ユーザー'}</span>
                      </div>
                      <div className={styles.reviewHeader}>
                        <StarRating rating={r.rating} size={14} />
                        {r.title && <h4 className={styles.reviewTitle}>{r.title}</h4>}
                      </div>
                      <span className={styles.reviewDate}>
                        {new Date(r.created_at).toLocaleDateString('ja-JP')} にレビュー済み
                      </span>
                      <span className={styles.verifiedBadge}>仮想購入者</span>
                      {r.body && <p className={styles.reviewBody}>{r.body}</p>}
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
