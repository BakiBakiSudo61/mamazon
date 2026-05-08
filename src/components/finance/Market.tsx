import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import styles from '../../pages/FinancePage.module.css';
import { TrendingUp, TrendingDown, Pickaxe } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: 'stock' | 'crypto';
  description: string;
}

interface PortfolioItem {
  asset_id: string;
  quantity: number;
  avg_buy_price: number;
}

export function Market() {
  const { fetchMe } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [tradeAmounts, setTradeAmounts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');

  // Fetch initial data
  useEffect(() => {
    const init = async () => {
      try {
        const assetsRes = await api.get<Asset[]>('/finance/market/assets');
        setAssets(assetsRes);
        fetchPortfolio();
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  // Poll prices every 2 seconds
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const p = await api.get<Record<string, number>>('/finance/market/prices');
        setPrevPrices(prev => Object.keys(prev).length ? prices : p);
        setPrices(p);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 2000);
    return () => clearInterval(interval);
  }, [prices]);

  const fetchPortfolio = async () => {
    try {
      const pf = await api.get<PortfolioItem[]>('/finance/portfolio');
      setPortfolio(pf);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrade = async (assetId: string, action: 'buy' | 'sell') => {
    const quantity = tradeAmounts[assetId] || 0;
    if (quantity <= 0) return;

    try {
      const res = await api.post<any>(`/finance/market/${action}`, { assetId, quantity });
      setMessage(`${res.quantity} ${assetId} を ${action === 'buy' ? '購入' : '売却'}しました！`);
      setTradeAmounts({ ...tradeAmounts, [assetId]: 0 });
      await fetchMe();
      await fetchPortfolio();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert(err.message || 'エラーが発生しました');
    }
  };

  const mine = async () => {
    try {
      const res = await api.post<{ minedAmount: number }>('/finance/mine', {});
      setMessage(`⛏️ マイニング成功！ ${res.minedAmount}円 発見しました！`);
      await fetchMe();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem' }}>📈 Mamazon Market</h2>
        <button className={`${styles.actionBtn} ${styles.mine}`} onClick={mine} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Pickaxe size={20} /> マイニング (無料)
        </button>
      </div>

      {message && (
        <div style={{ background: '#10b981', color: '#fff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
          {message}
        </div>
      )}

      <div className={styles.marketGrid}>
        {assets.map(asset => {
          const price = prices[asset.id] || 0;
          const prevPrice = prevPrices[asset.id] || price;
          const isUp = price >= prevPrice;

          return (
            <div key={asset.id} className={styles.assetCard}>
              <div className={styles.assetHeader}>
                <div>
                  <div className={styles.assetName}>{asset.name}</div>
                  <div className={styles.assetSymbol}>{asset.id} ({asset.type})</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`${styles.assetPrice} ${!isUp ? styles.down : ''}`}>
                    ¥{price.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: isUp ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {price - prevPrice > 0 ? '+' : ''}{(price - prevPrice).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className={styles.tradeControls}>
                <input 
                  type="number" 
                  min="1"
                  placeholder="数量"
                  className={styles.tradeInput}
                  value={tradeAmounts[asset.id] || ''}
                  onChange={e => setTradeAmounts({ ...tradeAmounts, [asset.id]: Number(e.target.value) })}
                />
                <button 
                  className={`${styles.tradeBtn} ${styles.buy}`}
                  onClick={() => handleTrade(asset.id, 'buy')}
                  disabled={!tradeAmounts[asset.id]}
                >
                  買う
                </button>
                <button 
                  className={`${styles.tradeBtn} ${styles.sell}`}
                  onClick={() => handleTrade(asset.id, 'sell')}
                  disabled={!tradeAmounts[asset.id]}
                >
                  売る
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.portfolio}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>💼 あなたのポートフォリオ</h3>
        {portfolio.length === 0 ? (
          <p style={{ color: '#aaa' }}>まだアセットを保有していません。</p>
        ) : (
          <div>
            {portfolio.map(p => {
              const asset = assets.find(a => a.id === p.asset_id);
              const currentPrice = prices[p.asset_id] || 0;
              const currentValue = currentPrice * p.quantity;
              const profit = currentValue - (p.avg_buy_price * p.quantity);
              return (
                <div key={p.asset_id} className={styles.portfolioItem}>
                  <div>
                    <strong>{asset?.name || p.asset_id}</strong>
                    <div style={{ fontSize: '0.9rem', color: '#888' }}>保有数: {p.quantity} | 平均取得単価: ¥{Math.round(p.avg_buy_price).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>評価額: ¥{currentValue.toLocaleString()}</strong>
                    <div style={{ fontSize: '0.9rem', color: profit >= 0 ? '#10b981' : '#ef4444' }}>
                      損益: {profit >= 0 ? '+' : ''}{Math.round(profit).toLocaleString()}円
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
