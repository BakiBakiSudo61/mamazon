import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { Button } from '../components/ui/Button';
import { formatPrice, multiplyPrice } from '../utils/price';
import styles from './Checkout.module.css';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState('mamazon_balance');

  const handleOrder = async () => {
    setSubmitting(true);
    try {
      // Use mock address to avoid collecting PII
      const mockAddress = {
        zip: '000-0000',
        prefecture: '東京都',
        city: '架空区',
        line1: '架空1-1-1',
        line2: '',
        name: user?.display_name ?? 'ユーザー',
        phone: '000-0000-0000',
      };

      const order = await ordersApi.create({
        items,
        payment_method: payment,
        shipping_addr: mockAddress,
      });
      await clearCart();
      navigate(`/checkout/complete?orderId=${order.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '注文に失敗しました';
      addToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = totalPrice();

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.steps}>
          <span className={styles.stepDone}>1. 配送先（省略）</span>
          <span className={styles.stepArrow}>›</span>
          <span className={styles.active}>2. 確認・注文</span>
        </div>

        <div className={styles.layout}>
          <div className={styles.confirm}>
            <h2>注文内容の確認</h2>
            <div className={styles.section}>
              <h3>配送先</h3>
              <p>個人情報保護のため省略されています。</p>
              <p>※本サイトは架空のショッピングサイトです。実際に商品は配送されません。</p>
            </div>
            <div className={styles.section}>
              <h3>支払い方法</h3>
              <label className={styles.radioLabel}>
                <input type="radio" value="mamazon_balance" checked={payment === 'mamazon_balance'} onChange={() => setPayment('mamazon_balance')} />
                Mamazon残高（架空）
              </label>
            </div>
            <div className={styles.section}>
              <h3>注文商品</h3>
              {items.map((it) => (
                <div key={it.product_id} className={styles.orderItem}>
                  <span>{it.product?.name ?? it.product_id}</span>
                  <span>×{it.quantity}</span>
                  <span>{formatPrice(multiplyPrice(it.product?.price ?? '0', it.quantity))}</span>
                </div>
              ))}
            </div>
            <Button size="lg" fullWidth onClick={handleOrder} loading={submitting}>
              注文を確定する（{formatPrice(subtotal)}）
            </Button>
          </div>

          {/* Summary sidebar */}
          <div className={styles.summary}>
            <h3>注文サマリー</h3>
            {items.map((it) => (
              <div key={it.product_id} className={styles.summaryItem}>
                <span className={styles.summaryName}>{it.product?.name ?? it.product_id}</span>
                <span>{formatPrice(multiplyPrice(it.product?.price ?? '0', it.quantity))}</span>
              </div>
            ))}
            <hr className={styles.divider} />
            <div className={styles.totalRow}>
              <span>合計</span>
              <span className={styles.totalAmt}>{formatPrice(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
