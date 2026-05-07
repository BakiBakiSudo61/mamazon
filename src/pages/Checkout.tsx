import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { Address } from '../types';
import styles from './Checkout.module.css';

type Step = 'shipping' | 'confirm';

const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [step, setStep] = useState<Step>('shipping');
  const [submitting, setSubmitting] = useState(false);

  const savedAddr = user?.address_json ? JSON.parse(user.address_json) as Address : null;
  const [addr, setAddr] = useState<Address>(savedAddr ?? {
    zip: '', prefecture: '東京都', city: '', line1: '', line2: '', name: user?.display_name ?? '', phone: '',
  });
  const [payment, setPayment] = useState('mamazon_balance');

  const updateAddr = (field: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddr((a) => ({ ...a, [field]: e.target.value }));

  const handleShippingNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('confirm');
  };

  const handleOrder = async () => {
    setSubmitting(true);
    try {
      const order = await ordersApi.create({
        items,
        payment_method: payment,
        shipping_addr: addr,
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
          <span className={[styles.step, step === 'shipping' ? styles.active : styles.done].join(' ')}>1. 配送先</span>
          <span className={styles.stepArrow}>›</span>
          <span className={[styles.step, step === 'confirm' ? styles.active : ''].join(' ')}>2. 確認・注文</span>
        </div>

        <div className={styles.layout}>
          {step === 'shipping' && (
            <form className={styles.form} onSubmit={handleShippingNext}>
              <h2>配送先住所</h2>
              <Input label="お名前" value={addr.name} onChange={updateAddr('name')} required />
              <Input label="郵便番号" value={addr.zip} onChange={updateAddr('zip')} placeholder="123-4567" required />
              <div className={styles.field}>
                <label className={styles.label}>都道府県</label>
                <select className={styles.select} value={addr.prefecture} onChange={updateAddr('prefecture')}>
                  {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <Input label="市区町村" value={addr.city} onChange={updateAddr('city')} required />
              <Input label="番地・建物名" value={addr.line1} onChange={updateAddr('line1')} required />
              <Input label="部屋番号など（任意）" value={addr.line2 ?? ''} onChange={updateAddr('line2')} />
              <Input label="電話番号" value={addr.phone} onChange={updateAddr('phone')} type="tel" required />
              <Button type="submit" size="lg" fullWidth>確認画面へ進む</Button>
            </form>
          )}

          {step === 'confirm' && (
            <div className={styles.confirm}>
              <h2>注文内容の確認</h2>
              <div className={styles.section}>
                <h3>配送先</h3>
                <p>{addr.name}</p>
                <p>{addr.zip} {addr.prefecture}{addr.city}{addr.line1} {addr.line2}</p>
                <p>{addr.phone}</p>
                <button className={styles.editLink} onClick={() => setStep('shipping')}>変更する</button>
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
                    <span>¥{((it.product?.price ?? 0) * it.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" fullWidth onClick={handleOrder} loading={submitting}>
                注文を確定する（¥{subtotal.toLocaleString()}）
              </Button>
            </div>
          )}

          {/* Summary sidebar */}
          <div className={styles.summary}>
            <h3>注文サマリー</h3>
            {items.map((it) => (
              <div key={it.product_id} className={styles.summaryItem}>
                <span className={styles.summaryName}>{it.product?.name ?? it.product_id}</span>
                <span>¥{((it.product?.price ?? 0) * it.quantity).toLocaleString()}</span>
              </div>
            ))}
            <hr className={styles.divider} />
            <div className={styles.totalRow}>
              <span>合計</span>
              <span className={styles.totalAmt}>¥{subtotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
