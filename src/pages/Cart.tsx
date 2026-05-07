import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { Button } from '../components/ui/Button';
import { formatPrice, multiplyPrice } from '../utils/price';
import styles from './Cart.module.css';

const PLACEHOLDER = 'https://placehold.co/80x80/1a1a2e/e0e0e0?text=?';

export const Cart: React.FC = () => {
  const { items, updateItem, removeItem, totalPrice, loading } = useCartStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <ShoppingBag size={64} opacity={0.3} />
        <h2>カートは空です</h2>
        <p>商品を探してカートに追加しましょう</p>
        <Button onClick={() => navigate('/home')}>ショッピングを続ける</Button>
      </div>
    );
  }

  const subtotal = totalPrice();

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>ショッピングカート</h1>

        <div className={styles.layout}>
          <div className={styles.itemList}>
            {items.map((item) => {
              const images = item.product?.images_json ? JSON.parse(item.product.images_json) : [];
              const img = images[0] || PLACEHOLDER;
              return (
                <div key={item.product_id} className={styles.item}>
                  <Link to={`/product/${item.product_id}`}>
                    <img src={img} alt={item.product?.name} className={styles.itemImage} />
                  </Link>
                  <div className={styles.itemInfo}>
                    <Link to={`/product/${item.product_id}`} className={styles.itemName}>
                      {item.product?.name ?? item.product_id}
                    </Link>
                    <span className={styles.itemCategory}>{item.product?.category}</span>
                    <span className={styles.itemPrice}>{formatPrice(item.product?.price ?? '0')}</span>
                  </div>
                  <div className={styles.itemControls}>
                    <select
                      className={styles.qtySelect}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.product_id, Number(e.target.value))}
                      disabled={loading}
                    >
                      {Array.from({ length: Math.min(item.product?.stock ?? 10, 10) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <span className={styles.lineTotal}>
                      {formatPrice(multiplyPrice(item.product?.price ?? '0', item.quantity))}
                    </span>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeItem(item.product_id)}
                      disabled={loading}
                      aria-label="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.summary}>
            <h2>注文サマリー</h2>
            <div className={styles.summaryRow}>
              <span>小計</span>
              <span>¥{subtotal.toLocaleString()}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>送料</span>
              <span className={styles.free}>無料（架空）</span>
            </div>
            <hr className={styles.divider} />
            <div className={[styles.summaryRow, styles.total].join(' ')}>
              <span>合計</span>
              <span>¥{subtotal.toLocaleString()}</span>
            </div>
            <Button
              size="lg"
              fullWidth
              onClick={() => navigate('/checkout/shipping')}
            >
              レジに進む <ArrowRight size={16} />
            </Button>
            <Link to="/home" className={styles.continueLink}>ショッピングを続ける</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
