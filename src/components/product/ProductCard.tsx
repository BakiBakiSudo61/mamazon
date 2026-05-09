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
}

const PLACEHOLDER = 'https://placehold.co/400x300/1a1a2e/e0e0e0?text=No+Image';

export const ProductCard: React.FC<Props> = ({ product }) => {
  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [adding, setAdding] = React.useState(false);

  const images = product.images_json ? JSON.parse(product.images_json) : [];
  const image = images[0] || PLACEHOLDER;

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
    <Link to={`/product/${product.id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <img src={image} alt={product.name} className={styles.image} loading="lazy" />
        {product.stock === 0 && product.made_to_order !== 1 && (
          <span className={styles.soldOut}>在庫なし</span>
        )}
        {product.is_featured === 1 && (
          <span className={styles.featured}>注目</span>
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.category}>{product.category}</p>
        <h3 className={styles.name}>{product.name}</h3>
        <div className={styles.rating}>
          <Star size={13} fill="currentColor" />
          <span>{product.rating.toFixed(1)}</span>
          <span className={styles.reviewCount}>({product.review_count})</span>
        </div>
        {product.store_name && (
          <p className={styles.storeName}>{product.store_name}</p>
        )}
        <div className={styles.footer}>
          <span className={styles.price}>
            {formatPrice(product.price)}
          </span>
          <Button
            size="sm"
            onClick={handleAddToCart}
            loading={adding}
            disabled={product.stock === 0 && product.made_to_order !== 1}
          >
            <ShoppingCart size={14} />
          </Button>
        </div>
      </div>
    </Link>
  );
};
