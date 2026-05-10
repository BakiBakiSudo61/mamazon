import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { TrendingUp, TrendingDown } from 'lucide-react';
import styles from './Market.module.css';

const HIST_KEY = 'mamazon_mkt_hist';
const MAX_HIST = 120;

// Color map for fallback avatars when image is not provided
const ASSET_COLORS: Record<string, string> = {
  MMZN: '#FF9900', PEAR: '#a8d8a8', MCHD: '#00adef', GOGL: '#4285f4',
  NVDX: '#76b900', BTK: '#f7931a', ETB: '#627eea', SLC: '#9945ff',
  DMC: '#c3a634', MMC: '#e94560', PPC: '#4caf50',
};

function AssetLogo({ id, type }: { id: string; type: string }) {
  const [hasImg, setHasImg] = useState(true);
  const fallbackBg = ASSET_COLORS[id] || (type === 'crypto' ? '#7c3aed' : '#1e40af');
  return (
    <div className={styles.assetLogoWrap}>
      {hasImg ? (
        <img
          src={`/assets/market/${id}.png`}
          alt={id}
          className={styles.assetLogo}
          onError={() => setHasImg(false)}
        />
      ) : (
        <div className={styles.assetLogoFallback} style={{ background: fallbackBg }}>
          {id.charAt(0)}
        </div>
      )}
    </div>
  );
}

interface Asset {
  id: string;
  name: string;
  type: 'stock' | 'crypto';
  description: string;
  hasHalving: boolean;
}

interface PortfolioItem {
  asset_id: string;
  quantity: number;
  avg_buy_price: number;
}

function Sparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
  if (data.length < 2) return <div className={styles.sparklinePlaceholder} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 30 - 2 - ((v - min) / range) * 26;
      return `${x},${y}`;
    })
    .join(' ');
  const color = isUp ? '#34d399' : '#f87171';
  const gradId = `sg-${isUp ? 'up' : 'dn'}`;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={styles.sparkline}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Market() {
  const { fetchMe } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [halvingDaysLeft, setHalvingDaysLeft] = useState<Record<string, number>>({});
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [tradeAmounts, setTradeAmounts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const prevPricesRef = useRef<Record<string, number>>({});
  const priceHistoryRef = useRef<Record<string, number[]>>({});

  // Load persisted history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, number[]>;
        priceHistoryRef.current = parsed;
        setPriceHistory(parsed);
      }
    } catch { /* ignore */ }

    const init = async () => {
      try {
        const [assetsRes, histRes] = await Promise.all([
          api.get<Asset[]>('/finance/market/assets'),
          api.get<Record<string, number[]>>('/finance/market/history'),
        ]);
        setAssets(assetsRes);
        // Merge server history into local (server provides the past 60 points)
        const merged = { ...priceHistoryRef.current };
        Object.entries(histRes).forEach(([id, hist]) => {
          // If we have local history, append server history points that may be newer
          const local = merged[id] || [];
          if (local.length === 0) {
            merged[id] = hist.slice(-MAX_HIST);
          } else {
            // Keep local history (which may have more recent points from polling)
            merged[id] = [...hist, ...local].slice(-MAX_HIST);
          }
        });
        priceHistoryRef.current = merged;
        setPriceHistory({ ...merged });
        try { localStorage.setItem(HIST_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        fetchPortfolio();
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  // Price polling every 5 seconds
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await api.get<{ prices: Record<string, number>; halvingDaysLeft: Record<string, number> }>('/finance/market/prices');
        const p = res.prices;
        // track history
        const newHist = { ...priceHistoryRef.current };
        Object.entries(p).forEach(([id, price]) => {
          newHist[id] = [...(newHist[id] || []).slice(-(MAX_HIST - 1)), price];
        });
        priceHistoryRef.current = newHist;
        setPriceHistory({ ...newHist });
        // Persist to localStorage
        try { localStorage.setItem(HIST_KEY, JSON.stringify(newHist)); } catch { /* ignore */ }
        setPrevPrices({ ...prevPricesRef.current });
        prevPricesRef.current = p;
        setPrices(p);
        setHalvingDaysLeft(res.halvingDaysLeft);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // every 5 seconds
    return () => clearInterval(interval);
  }, []);

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
      const res = await api.post<{
        quantity: number; fee?: number; slippage?: number; tax?: number; earned?: number; totalCost?: number
      }>(`/finance/market/${action}`, { assetId, quantity });

      if (action === 'buy') {
        const parts = [`${res.quantity} ${assetId} を購入しました！`];
        if (res.fee) parts.push(`手数料: ¥${res.fee.toLocaleString()}`);
        if (res.slippage) parts.push(`スリッページ: ¥${res.slippage.toLocaleString()}`);
        setMessage(parts.join(' / '));
      } else {
        const parts = [`${res.quantity} ${assetId} を売却しました！`];
        if (res.fee) parts.push(`手数料: ¥${res.fee.toLocaleString()}`);
        if (res.tax) parts.push(`税: ¥${res.tax.toLocaleString()}`);
        if (res.earned) parts.push(`手取り: ¥${res.earned.toLocaleString()}`);
        setMessage(parts.join(' / '));
      }
      setTradeAmounts({ ...tradeAmounts, [assetId]: 0 });
      await fetchMe();
      await fetchPortfolio();
      setTimeout(() => setMessage(''), 5000);
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'エラーが発生しました'}`);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  return (
    <div className={styles.market}>
      <div className={styles.marketHeader}>
        <h2 className={styles.marketTitle}>📈 Mamazon Market</h2>
        <p className={styles.marketSubtitle}>リアルタイム価格でトレード</p>
      </div>

      {message && (
        <div className={`${styles.msg} ${message.startsWith('❌') ? styles.msgError : styles.msgSuccess}`}>
          {message}
        </div>
      )}

      <div className={styles.assetGrid}>
        {assets.map(asset => {
          const price = prices[asset.id] || 0;
          const prevPrice = prevPrices[asset.id] || price;
          const diff = price - prevPrice;
          const isUp = diff >= 0;

          return (
            <div key={asset.id} className={styles.assetCard}>
              <div className={styles.assetTop}>
                <div className={styles.assetTopLeft}>
                  <AssetLogo id={asset.id} type={asset.type} />
                  <div>
                    <div className={styles.assetName}>{asset.name}</div>
                    <div className={styles.assetMeta}>
                      <span className={styles.assetId}>{asset.id}</span>
                      <span className={`${styles.assetType} ${asset.type === 'crypto' ? styles.crypto : styles.stock}`}>
                        {asset.type === 'crypto' ? '仮想通貨' : '株式'}
                      </span>
                      {asset.hasHalving && halvingDaysLeft[asset.id] !== undefined && (
                        <span className={styles.halvingBadge}>
                          {halvingDaysLeft[asset.id] === 0 ? '🔥 半減期 今日！' : `⚡ 半減期 ${halvingDaysLeft[asset.id]}日`}
                        </span>
                      )}
                    </div>
                    <div className={styles.assetDesc}>{asset.description}</div>
                  </div>
                </div>
                <div className={styles.priceBlock}>
                  <div className={`${styles.price} ${isUp ? styles.priceUp : styles.priceDown}`}>
                    ¥{price.toLocaleString()}
                  </div>
                  <div className={`${styles.priceDiff} ${isUp ? styles.diffUp : styles.diffDown}`}>
                    {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className={styles.sparklineWrapper}>
                <Sparkline data={priceHistory[asset.id] || []} isUp={isUp} />
              </div>

              <div className={styles.tradeRow}>
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
        <h3 className={styles.portfolioTitle}>💼 保有資産</h3>
        {portfolio.length === 0 ? (
          <p className={styles.emptyNote}>まだアセットを保有していません。買ってみましょう！</p>
        ) : (
          <div className={styles.portfolioList}>
            {portfolio.map(p => {
              const asset = assets.find(a => a.id === p.asset_id);
              const currentPrice = prices[p.asset_id] || 0;
              const currentValue = currentPrice * p.quantity;
              const profit = currentValue - p.avg_buy_price * p.quantity;
              return (
                <div key={p.asset_id} className={styles.portfolioItem}>
                  <div>
                    <div className={styles.pfName}>{asset?.name || p.asset_id}</div>
                    <div className={styles.pfMeta}>
                      {p.quantity}株 · 平均 ¥{Math.round(p.avg_buy_price).toLocaleString()}
                    </div>
                  </div>
                  <div className={styles.pfValues}>
                    <div className={styles.pfValue}>¥{currentValue.toLocaleString()}</div>
                    <div className={`${styles.pfProfit} ${profit >= 0 ? styles.profitUp : styles.profitDown}`}>
                      {profit >= 0 ? '+' : ''}{Math.round(profit).toLocaleString()}円
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