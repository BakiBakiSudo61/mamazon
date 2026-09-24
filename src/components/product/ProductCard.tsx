import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart } from 'lucide-react';
import type { Product } from '../../types';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../ui/Button';
import { formatPrice } from '../../utils/price';
import styles from './ProductCard.module.css';

interface Props {
  product: Product;
  /** 'list' switches to a horizontal row layout on mobile (Amazon app search results) */
  variant?: 'grid' | 'list';
}

function deliveryText(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

const PLACEHOLDER = 'https://placehold.co/400x300/1a1a2e/e0e0e0?text=No+Image';

export const ProductCard: React.FC<Props> = ({ product, variant = 'grid' }) => {
  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [adding, setAdding] = React.useState(false);

  let images: string[];
  try { images = product.images_json ? JSON.parse(product.images_json) : []; } catch { images = []; }
  const image = images[0] || PLACEHOLDER;
  const price = formatPrice(product.price);
  const outOfStock = product.stock === 0 && product.made_to_order !== 1;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      addToast({ type: 'info', message: 'カートに追加するにはログインが必要です' });
      return;
    }
    setAdding(true);
    try {
      await addItem(product.id);
      addToast({ type: 'success', message: 'カートに追加しました' });
    } catch {
      addToast({ type: 'error', message: 'カートへの追加に失敗しました' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className={[styles.card, variant === 'list' ? styles.list : ''].join(' ')}
    >
      <div className={styles.imageWrap}>
        <img src={image} alt={product.name} className={styles.image} loading="lazy" />
        {product.is_featured === 1 && (
          <span className={styles.featured}>ベストセラー</span>
        )}
      </div>
      <div className={styles.body}>
        {product.store_name && (
          <p className={styles.storeName}>{product.store_name}</p>
        )}
        <h3 className={styles.name}>{product.name}</h3>
        <div className={styles.rating}>
          <span className={styles.ratingNum}>{product.rating.toFixed(1)}</span>
          <span className={styles.stars} aria-label={`星5つ中の${product.rating.toFixed(1)}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={13} fill={n <= Math.round(product.rating) ? 'currentColor' : 'none'} />
            ))}
          </span>
          <span className={styles.reviewCount}>({product.review_count.toLocaleString()})</span>
        </div>
        <div className={styles.price}>
          <span className={styles.priceSymbol}>{price.charAt(0)}</span>
          <span className={styles.priceWhole}>{price.slice(1)}</span>
        </div>
        {product.is_featured === 1 && (
          <div className={styles.prime}>
            <span className={styles.primeMark}>✓prime</span>
          </div>
        )}
        {outOfStock ? (
          <p className={styles.soldOut}>現在在庫切れです。</p>
        ) : (
          <p className={styles.delivery}>
            送料無料 <strong>{deliveryText()}</strong> にお届け
          </p>
        )}
        <div className={styles.footer}>
          <Button
            size="sm"
            fullWidth
            onClick={handleAddToCart}
            loading={adding}
            disabled={outOfStock}
            className={styles.cartBtn}
          >
            <ShoppingCart size={14} />
            カートに入れる
          </Button>
        </div>
      </div>
    </Link>
  );
};
