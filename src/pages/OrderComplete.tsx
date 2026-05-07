import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package } from 'lucide-react';
import { ordersApi } from '../api/orders';
import type { Order } from '../types';
import styles from './OrderComplete.module.css';

export const OrderComplete: React.FC = () => {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderId) ordersApi.get(orderId).then(setOrder).catch(() => {});
  }, [orderId]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <CheckCircle size={64} className={styles.icon} />
        <h1>ご注文ありがとうございます！</h1>
        <p className={styles.orderId}>注文ID: {orderId}</p>
        {order && (
          <div className={styles.summary}>
            <div className={styles.row}>
              <span>合計金額</span>
              <span className={styles.amount}>¥{order.total_amount.toLocaleString()}</span>
            </div>
            <div className={styles.row}>
              <span>ステータス</span>
              <span className={styles.status}>受付完了</span>
            </div>
          </div>
        )}
        <div className={styles.actions}>
          <Link to="/orders" className={styles.primaryBtn}>
            <Package size={16} /> 注文履歴を確認
          </Link>
          <Link to="/home" className={styles.secondaryBtn}>ショッピングを続ける</Link>
        </div>
      </div>
    </div>
  );
};
