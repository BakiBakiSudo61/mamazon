import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, TrendingUp, Package, DollarSign, Palette, Eye, EyeOff, ExternalLink, ShoppingBag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sellerApi } from '../../api/seller';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { Product, Store, SellerSaleItem } from '../../types';
import { formatPrice } from '../../utils/price';
import styles from './Dashboard.module.css';

function getPreviewText(hex: string): string {
  const h = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#111' : '#fff';
}

export const Dashboard: React.FC = () => {
  const addToast = useUIStore((s) => s.addToast);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [sales, setSales] = useState<SellerSaleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Store customization state
  const [brandColor, setBrandColor] = useState('');
  const [description, setDescription] = useState('');
  const [previewMd, setPreviewMd] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      sellerApi.getDashboard(),
      sellerApi.getSellerSales(),
    ])
      .then(([d, s]) => {
        setStore(d.store);
        setProducts(d.products);
        setRevenue(d.total_revenue);
        setBrandColor(d.store.brand_color ?? '');
        setDescription(d.store.description ?? '');
        setSales(s.sales);
      })
      .catch(() => {
        // store not found → redirect to register
        window.location.href = '/seller/register';
      })
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

  // Restock state
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState<string>('10');
  const [restocking, setRestocking] = useState(false);

  const handleRestock = async () => {
    if (!restockId) return;
    const qty = Math.max(1, parseInt(restockQty) || 1);
    if (qty > 100000) {
      addToast({ type: 'error', message: '数量は100000以下で入力してください' });
      return;
    }
    setRestocking(true);
    try {
      await sellerApi.restockProduct(restockId, qty);
      addToast({ type: 'success', message: `在庫を${qty}個追加しました` });
      setRestockId(null);
      loadData();
    } catch (err: unknown) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : '在庫追加に失敗しました' });
    } finally {
      setRestocking(false);
    }
  };

  const handleSaveStore = async () => {
    if (!store) return;
    setSaving(true);
    try {
      await sellerApi.updateStore(store.id, {
        description,
        brand_color: brandColor || '',
      });
      addToast({ type: 'success', message: 'ストア設定を保存しました' });
      setStore((prev) => prev ? { ...prev, description, brand_color: brandColor || undefined } : prev);
    } catch (err: unknown) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>読み込み中...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>出品者ダッシュボード</h1>
            {store && (
              <div className={styles.storeNameRow}>
                <p className={styles.storeName}>{store.store_name}</p>
                <Link to={`/store/${store.id}`} className={styles.storeLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={13} /> ストアを見る
                </Link>
              </div>
            )}
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
                const isRestocking = restockId === p.id;
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
                      {p.made_to_order === 1 ? (
                        <Badge variant="warning">受注生産</Badge>
                      ) : (
                        <Badge variant={p.stock > 0 ? 'success' : 'danger'}>
                          在庫{p.stock}
                        </Badge>
                      )}
                    </div>
                    {isRestocking ? (
                      <div className={styles.restockForm}>
                        <input
                          type="number"
                          className={styles.restockInput}
                          min={1}
                          max={100000}
                          value={restockQty}
                          onChange={(e) => setRestockQty(e.target.value.replace(/[^0-9]/g, ''))}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleRestock} loading={restocking}>追加</Button>
                        <Button size="sm" variant="secondary" onClick={() => setRestockId(null)}>キャンセル</Button>
                      </div>
                    ) : (
                      <div className={styles.rowActions}>
                        {p.made_to_order !== 1 && (
                          <button
                            className={styles.restockBtn}
                            onClick={() => { setRestockId(p.id); setRestockQty('10'); }}
                            title="在庫を追加"
                          >
                            +在庫
                          </button>
                        )}
                        <Link to={`/seller/product/${p.id}/edit`}>
                          <Button size="sm" variant="secondary"><Edit size={14} /></Button>
                        </Link>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(p.id, p.name)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales History */}
        <div className={styles.salesCard}>
          <div className={styles.salesHeader}>
            <ShoppingBag size={18} />
            <h2>販売履歴</h2>
            <span className={styles.salesCount}>{sales.length}件</span>
          </div>
          {sales.length === 0 ? (
            <div className={styles.empty}>
              <ShoppingBag size={40} opacity={0.3} />
              <p>まだ販売実績がありません</p>
            </div>
          ) : (
            <div className={styles.salesList}>
              <div className={styles.salesListHeader}>
                <span>商品</span>
                <span className={styles.salesColBuyer}>購入者</span>
                <span className={styles.salesColQty}>数量</span>
                <span className={styles.salesColPrice}>金額</span>
                <span className={styles.salesColStatus}>ステータス</span>
                <span className={styles.salesColDate}>注文日</span>
              </div>
              {sales.map((s) => {
                const img = s.images_json ? (JSON.parse(s.images_json)[0] ?? null) : null;
                const total = (BigInt(s.unit_price) * BigInt(s.quantity)).toString();
                const statusMap: Record<string, { label: string; cls: string }> = {
                  ordered:   { label: '注文済み', cls: styles.statusOrdered },
                  preparing: { label: '準備中',   cls: styles.statusPreparing },
                  shipped:   { label: '発送済み', cls: styles.statusShipped },
                  delivered: { label: '配達済み', cls: styles.statusDelivered },
                  returned:  { label: '返品',     cls: styles.statusReturned },
                };
                const st = statusMap[s.status] ?? { label: s.status, cls: '' };
                const date = new Date(s.order_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
                return (
                  <div key={s.id} className={styles.salesRow}>
                    <div className={styles.salesProduct}>
                      <img
                        src={img || 'https://placehold.co/40x40/1a1a2e/e0e0e0?text=?'}
                        alt={s.product_name}
                        className={styles.salesThumb}
                      />
                      <Link to={`/product/${s.product_id}`} className={styles.salesName}>
                        {s.product_name}
                      </Link>
                    </div>
                    <span className={styles.salesColBuyer}>{s.buyer_name || '匿名ユーザー'}</span>
                    <span className={styles.salesColQty}>{s.quantity}個</span>
                    <span className={styles.salesColPrice}>{formatPrice(total)}</span>
                    <span className={styles.salesColStatus}>
                      <span className={`${styles.statusBadge} ${st.cls}`}>{st.label}</span>
                    </span>
                    <span className={styles.salesColDate}>{date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Store Customization */}
        {store && (
          <div className={styles.customizeCard}>
            <div className={styles.customizeHeader}>
              <Palette size={18} />
              <h2>ストアカスタマイズ</h2>
            </div>

            {/* Brand color */}
            <div className={styles.customizeRow}>
              <label className={styles.customizeLabel}>ブランドカラー（ヘッダー背景色）</label>
              <div className={styles.colorRow}>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={brandColor || '#1a1a2e'}
                  onChange={(e) => setBrandColor(e.target.value)}
                />
                <span className={styles.colorHex}>{brandColor || '未設定'}</span>
                {brandColor && (
                  <button className={styles.clearBtn} onClick={() => setBrandColor('')}>クリア</button>
                )}
                <div
                  className={styles.colorPreview}
                  style={{ background: brandColor || 'var(--surface-1)', border: '1px solid var(--border)' }}
                >
                  <span style={{ color: brandColor ? getPreviewText(brandColor) : 'var(--text-muted)', fontSize: '0.78rem' }}>
                    プレビュー
                  </span>
                </div>
              </div>
            </div>

            {/* Description (Markdown) */}
            <div className={styles.customizeRow}>
              <div className={styles.descLabelRow}>
                <label className={styles.customizeLabel}>ストア説明（Markdown対応）</label>
                <button
                  className={styles.previewToggle}
                  onClick={() => setPreviewMd((v) => !v)}
                  type="button"
                >
                  {previewMd ? <><EyeOff size={13} /> 編集</>  : <><Eye size={13} /> プレビュー</>}
                </button>
              </div>
              {previewMd ? (
                <div className={styles.mdPreview}>
                  {description
                    ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                    : <span className={styles.mdEmpty}>説明が入力されていません</span>
                  }
                </div>
              ) : (
                <textarea
                  className={styles.mdTextarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={'**太字**、*斜体*、リスト、リンクなどMarkdown記法が使えます\n\n例：\n## ようこそ\n私たちは**高品質**な商品を提供しています。'}
                  rows={6}
                />
              )}
              <p className={styles.mdHint}>Markdown記法に対応しています（**太字** / *斜体* / ## 見出し など）</p>
            </div>

            <div className={styles.customizeActions}>
              <Button onClick={handleSaveStore} loading={saving}>設定を保存</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
