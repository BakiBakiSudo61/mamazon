import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { ordersApi } from '../api/orders';
import { Badge } from '../components/ui/Badge';
import { formatPrice, computeOrderStatus } from '../utils/price';
import type { Order } from '../types';
import styles from './Orders.module.css';

const STATUS_LABEL: Record<string, string> = {
  ordered: '受付完了', preparing: '準備中', shipped: '発送済み', delivered: '配達完了', returned: '返品済み'
};
const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'default' | 'danger'> = {
  ordered: 'info', preparing: 'warning', shipped: 'warning', delivered: 'success', returned: 'danger'
};

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.list()
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>注文履歴</h1>
        {loading ? (
          <p className={styles.muted}>読み込み中...</p>
        ) : orders.length === 0 ? (
          <div className={styles.empty}>
            <Package size={48} opacity={0.3} />
            <p>注文履歴がありません</p>
            <Link to="/home" className={styles.shopLink}>ショッピングを始める</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {orders.map((o) => (
              <div key={o.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.orderId}>{o.id}</span>
                    <span className={styles.date}>{new Date(o.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                  {(() => { const s = computeOrderStatus(o.status, o.created_at); return (
                    <Badge variant={STATUS_VARIANT[s] ?? 'default'}>
                      {STATUS_LABEL[s] ?? s}
                    </Badge>
                  ); })()}
                </div>
                <div className={styles.cardBody}>
                  <span className={styles.amount}>{formatPrice(o.total_amount)}</span>
                  {(o.item_count != null || o.items) && (
                    <span className={styles.itemCount}>{o.item_count ?? o.items?.length ?? 0}点</span>
                  )}
                </div>
                <Link to={`/orders/${o.id}`} className={styles.detailLink}>
                  詳細を見る <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
