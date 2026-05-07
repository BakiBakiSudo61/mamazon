import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, TrendingUp, Package, DollarSign } from 'lucide-react';
import { sellerApi } from '../../api/seller';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { Product, Store } from '../../types';
import { formatPrice } from '../../utils/price';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const addToast = useUIStore((s) => s.addToast);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    sellerApi.getDashboard()
      .then((d) => {
        setStore(d.store);
        setProducts(d.products);
        setRevenue(d.total_revenue);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    try {
      await sellerApi.deleteProduct(id);
      addToast({ type: 'success', message: '商品を削除しました' });
      loadData();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  if (loading) return <div className={styles.loading}>読み込み中...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>出品者ダッシュボード</h1>
            {store && <p className={styles.storeName}>{store.store_name}</p>}
          </div>
          <Link to="/seller/product/new">
            <Button><Plus size={16} /> 商品を出品</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <Package size={24} className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>出品数</p>
              <p className={styles.statValue}>{products.length}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <TrendingUp size={24} className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>総売上数</p>
              <p className={styles.statValue}>{store?.sales_count ?? 0}件</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <DollarSign size={24} className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>総収益</p>
              <p className={styles.statValue}>¥{revenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className={styles.productTable}>
          <div className={styles.tableHeader}>
            <h2>出品商品</h2>
          </div>
          {products.length === 0 ? (
            <div className={styles.empty}>
              <Package size={40} opacity={0.3} />
              <p>まだ商品がありません</p>
              <Link to="/seller/product/new">
                <Button size="sm"><Plus size={14} /> 最初の商品を出品</Button>
              </Link>
            </div>
          ) : (
            <div className={styles.list}>
              {products.map((p) => {
                const images = p.images_json ? JSON.parse(p.images_json) : [];
                return (
                  <div key={p.id} className={styles.row}>
                    <img
                      src={images[0] || 'https://placehold.co/48x48/1a1a2e/e0e0e0?text=?'}
                      alt={p.name}
                      className={styles.rowImage}
                    />
                    <div className={styles.rowInfo}>
                      <span className={styles.rowName}>{p.name}</span>
                      <span className={styles.rowCategory}>{p.category}</span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span className={styles.rowPrice}>{formatPrice(p.price)}</span>
                      <Badge variant={p.stock > 0 ? 'success' : 'danger'}>
                        在庫{p.stock}
                      </Badge>
                    </div>
                    <div className={styles.rowActions}>
                      <Link to={`/seller/product/${p.id}/edit`}>
                        <Button size="sm" variant="secondary"><Edit size={14} /></Button>
                      </Link>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(p.id, p.name)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
