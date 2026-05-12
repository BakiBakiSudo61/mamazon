import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Package, ChevronLeft, ExternalLink, Truck, RotateCcw } from 'lucide-react';
import { ordersApi } from '../api/orders';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { Badge } from '../components/ui/Badge';
import { formatPrice, multiplyPrice, computeOrderStatus } from '../utils/price';
import type { Order, OrderItem } from '../types';
import styles from './OrderDetail.module.css';

const STATUS_LABEL: Record<string, string> = {
  ordered: '受付完了',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  returned: '返品済み',
};
const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'default' | 'danger'> = {
  ordered: 'info',
  preparing: 'warning',
  shipped: 'warning',
  delivered: 'success',
  returned: 'danger',
};

interface RawOrderItem extends OrderItem {
  name?: string;
  images_json?: string;
}

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [returning, setReturning] = useState(false);
  // フロント側でタイマー再描画してステータスを進行させる
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    ordersApi
      .get(id)
      .then((o) => setOrder(o))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  // 配達完了になるまで 300ms ごとに再描画（サーバー通信なし）
  useEffect(() => {
    if (!order || order.status === 'returned') return;
    const computed = computeOrderStatus(order.status, order.created_at);
    if (computed === 'delivered') return;
    const timer = setInterval(() => setTick((t) => t + 1), 300);
    return () => clearInterval(timer);
  }, [order, tick]);

  const handleReturn = async () => {
    if (!order) return;
    if (!confirm('この注文を返品しますか？\n購入金額が残高に返金されます。')) return;
    setReturning(true);
    try {
      const updated = await ordersApi.returnOrder(order.id);
      setOrder(updated);
      await fetchMe();
      addToast({ type: 'success', message: '返品が完了しました。残高に返金されました。' });
    } catch (err: unknown) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : '返品に失敗しました' });
    } finally {
      setReturning(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.muted}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.errorMsg}>注文が見つかりませんでした</p>
          <button className={styles.backBtn} onClick={() => navigate('/orders')}>
            <ChevronLeft size={16} /> 注文履歴に戻る
          </button>
        </div>
      </div>
    );
  }

  const items = (order.items ?? []) as unknown as RawOrderItem[];
  const displayStatus = computeOrderStatus(order.status, order.created_at);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Back link */}
        <Link to="/orders" className={styles.backBtn}>
          <ChevronLeft size={16} /> 注文履歴に戻る
        </Link>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>注文詳細</h1>
            <p className={styles.orderId}>{order.id}</p>
            <p className={styles.date}>
              {new Date(order.created_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[displayStatus] ?? 'default'}>
            {STATUS_LABEL[displayStatus] ?? displayStatus}
          </Badge>
        </div>

        {/* Status timeline */}
        <div className={styles.timeline}>
          {(['ordered', 'preparing', 'shipped', 'delivered'] as const).map((s, i, arr) => {
            const statusIndex = displayStatus === 'returned'
              ? arr.length - 1
              : arr.indexOf(displayStatus as typeof s);
            const isActive = i <= statusIndex;
            return (
              <React.Fragment key={s}>
                <div className={[styles.step, isActive ? styles.stepActive : ''].join(' ')}>
                  <div className={styles.stepDot} />
                  <span className={styles.stepLabel}>{STATUS_LABEL[s]}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className={[styles.stepLine, isActive && i < statusIndex ? styles.stepLineActive : ''].join(' ')} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Return action */}
        {displayStatus === 'delivered' && (
          <div className={styles.returnBox}>
            <div className={styles.returnInfo}>
              <RotateCcw size={16} />
              <span>配達完了から返品できます。返品すると購入金額が残高に返金されます。</span>
            </div>
            <button
              className={styles.returnBtn}
              onClick={handleReturn}
              disabled={returning}
            >
              {returning ? '処理中...' : '返品する'}
            </button>
          </div>
        )}
        {displayStatus === 'returned' && (
          <div className={styles.returnedNotice}>
            <RotateCcw size={16} />
            <span>この注文は返品済みです。購入金額は残高に返金されています。</span>
          </div>
        )}

        {/* Items */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Package size={18} /> 注文商品（{items.length}点）
          </h2>
          <div className={styles.itemList}>
            {items.map((item) => {
              const images: string[] = (() => {
                try { return JSON.parse(item.images_json ?? '[]'); } catch { return []; }
              })();
              const thumb = images[0];
              const subtotal = multiplyPrice(item.unit_price, item.quantity);

              return (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemThumb}>
                    {thumb ? (
                      <img src={thumb} alt={item.name ?? ''} className={styles.thumbImg} />
                    ) : (
                      <div className={styles.thumbPlaceholder}>
                        <Package size={24} />
                      </div>
                    )}
                  </div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{item.name ?? item.product_id}</p>
                    <p className={styles.itemMeta}>
                      単価: {formatPrice(item.unit_price)} × {item.quantity}点
                    </p>
                    <p className={styles.itemSubtotal}>小計: {formatPrice(subtotal)}</p>
                  </div>
                  <Link
                    to={`/product/${item.product_id}`}
                    className={styles.viewProductBtn}
                  >
                    <ExternalLink size={14} />
                    商品ページ
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <Truck size={16} className={styles.summaryIcon} />
            <span>配送先</span>
            <span className={styles.summaryVal}>架空の住所（発送なし）</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>支払い方法</span>
            <span className={styles.summaryVal}>
              {order.payment_method === 'mamazon_balance' ? 'Mamazon残高' : order.payment_method}
            </span>
          </div>
          <div className={[styles.summaryRow, styles.totalRow].join(' ')}>
            <span className={styles.summaryLabel}>合計金額</span>
            <span className={styles.totalAmt}>{formatPrice(order.total_amount)}</span>
          </div>
          {order.earned_points && BigInt(order.earned_points) > 0n && (
            <div className={styles.summaryRow} style={{ color: '#f59e0b' }}>
              <span className={styles.summaryLabel}>🎁 獲得ポイント</span>
              <span className={styles.summaryVal} style={{ fontWeight: 600 }}>{Number(order.earned_points).toLocaleString()} pt</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
