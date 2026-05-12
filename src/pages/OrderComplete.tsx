import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package } from 'lucide-react';
import { ordersApi } from '../api/orders';
import { formatPrice } from '../utils/price';
import type { Order } from '../types';
import styles from './OrderComplete.module.css';

const STATUS_LABEL: Record<string, string> = {
  ordered: '受付完了',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  returned: '返品済み',
};

export const OrderComplete: React.FC = () => {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderId) ordersApi.get(orderId).then(setOrder).catch(() => {});
  }, [orderId]);

  // 配達完了になるまで 500ms ごとに自動更新
  useEffect(() => {
    if (!order || order.status === 'delivered' || order.status === 'returned') return;
    const timer = setInterval(() => {
      ordersApi.get(order.id).then(setOrder).catch(() => {});
    }, 500);
    return () => clearInterval(timer);
  }, [order?.id, order?.status]);

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
              <span className={styles.amount}>{formatPrice(order.total_amount)}</span>
            </div>
            {order.earned_points && BigInt(order.earned_points) > 0n && (
              <div className={styles.row} style={{ color: '#f59e0b' }}>
                <span>🎁 獲得ポイント</span>
                <span style={{ fontWeight: 700 }}>{Number(order.earned_points).toLocaleString()} pt</span>
              </div>
            )}
            <div className={styles.row}>
              <span>ステータス</span>
              <span className={styles.status}>{STATUS_LABEL[order.status] ?? order.status}</span>
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
