import { useState, useEffect, useRef, useId } from 'react';
import { ChevronDown, Minus, Plus, Loader, Flame, Zap } from 'lucide-react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { AnimatedNumber } from './ui/AnimatedNumber';
import kit from './ui/kit.module.css';
import styles from './Market.module.css';

const HIST_KEY = 'mamazon_mkt_hist';
const MAX_HIST = 120;

const ASSET_COLORS: Record<string, string> = {
  MMZN: '#FF9900', PEAR: '#8fcf8f', MCHD: '#00adef', GOGL: '#4285f4',
  NVDX: '#76b900', BTK: '#f7931a', ETB: '#627eea', SLC: '#9945ff',
  DMC: '#c3a634', MMC: '#e94560', PPC: '#4caf50',
};

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

type Filter = 'all' | 'stock' | 'crypto' | 'owned';

function loadHistory(): Record<string, number[]> {
  try {
    const saved = localStorage.getItem(HIST_KEY);
    return saved ? (JSON.parse(saved) as Record<string, number[]>) : {};
  } catch {
    return {};
  }
}

// Mirrors the server: slippage 2% (>=10) / 5% (>=50), then a 3% fee
function buyCost(price: number, q: number) {
  const base = price * q;
  const slip = Math.floor(base * (q >= 50 ? 0.05 : q >= 10 ? 0.02 : 0));
  return base + slip + Math.floor((base + slip) * 0.03);
}
function maxBuy(cash: number, price: number) {
  if (!price) return 0;
  let q = Math.floor(cash / (price * 1.03));
  while (q > 0 && buyCost(price, q) > cash) q--;
  return q;
}

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

function AssetLogo({ id, type }: { id: string; type: string }) {
  const [hasImg, setHasImg] = useState(true);
  const c = ASSET_COLORS[id] || (type === 'crypto' ? '#7c3aed' : '#1e40af');
  return hasImg ? (
    <img src={`/assets/market/${id}.png`} alt="" className={styles.logo} onError={() => setHasImg(false)} />
  ) : (
    <span className={styles.logo} style={{ background: `linear-gradient(145deg, ${c}, color-mix(in srgb, ${c} 55%, #000))` }}>
      {id.slice(0, 2)}
    </span>
  );
}

function Sparkline({ data, up, big }: { data: number[]; up: boolean; big?: boolean }) {
  const id = `sp${useId().replace(/:/g, '')}`;
  if (data.length < 2) return <div className={big ? styles.chartEmpty : styles.sparkEmpty} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const H = big ? 100 : 30;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, H - 3 - ((v - min) / range) * (H - 6)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const color = up ? '#2ed17f' : '#ff5d62';
  return (
    <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className={big ? styles.chart : styles.spark} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={big ? 0.3 : 0.2} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100,${H} L0,${H} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={big ? 2 : 1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Market() {
  const { user, fetchMe } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [halvingDaysLeft, setHalvingDaysLeft] = useState<Record<string, number>>({});
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>(loadHistory);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [trading, setTrading] = useState<string | null>(null);
  const [lastTrade, setLastTrade] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [tick, setTick] = useState(0);
  const prevPricesRef = useRef<Record<string, number>>({});
  const priceHistoryRef = useRef<Record<string, number[]>>(priceHistory);

  const fetchPortfolio = async () => {
    try {
      setPortfolio(await api.get<PortfolioItem[]>('/finance/portfolio'));
    } catch (err) {
      console.error(err);
    }
  };

  // Load assets and merge server history into the persisted one on mount
  useEffect(() => {
    (async () => {
      try {
        const [assetsRes, histRes] = await Promise.all([
          api.get<Asset[]>('/finance/market/assets'),
          api.get<Record<string, number[]>>('/finance/market/history'),
        ]);
        setAssets(assetsRes);
        const merged = { ...priceHistoryRef.current };
        Object.entries(histRes).forEach(([id, hist]) => {
          const local = merged[id] || [];
          merged[id] = local.length === 0 ? hist.slice(-MAX_HIST) : [...hist, ...local].slice(-MAX_HIST);
        });
        priceHistoryRef.current = merged;
        setPriceHistory({ ...merged });
        try { localStorage.setItem(HIST_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        fetchPortfolio();
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Price polling every 5 seconds
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await api.get<{ prices: Record<string, number>; halvingDaysLeft: Record<string, number> }>('/finance/market/prices');
        const p = res.prices;
        const newHist = { ...priceHistoryRef.current };
        Object.entries(p).forEach(([id, price]) => {
          newHist[id] = [...(newHist[id] || []).slice(-(MAX_HIST - 1)), price];
        });
        priceHistoryRef.current = newHist;
        setPriceHistory({ ...newHist });
        try { localStorage.setItem(HIST_KEY, JSON.stringify(newHist)); } catch { /* ignore */ }
        setPrevPrices({ ...prevPricesRef.current });
        prevPricesRef.current = p;
        setPrices(p);
        setHalvingDaysLeft(res.halvingDaysLeft);
        setTick((t) => t + 1);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTrade = async (assetId: string, action: 'buy' | 'sell') => {
    const quantity = qty[assetId] || 0;
    if (quantity <= 0) return;
    setTrading(`${assetId}:${action}`);
    try {
      const res = await api.post<{
        quantity: number; fee?: number; slippage?: number; tax?: number; earned?: number; totalCost?: number
      }>(`/finance/market/${action}`, { assetId, quantity });

      const parts = action === 'buy'
        ? [`${res.quantity} ${assetId} を購入`, res.totalCost ? `支払 ${yen(res.totalCost)}` : '', res.fee ? `手数料 ${yen(res.fee)}` : '', res.slippage ? `スリッページ ${yen(res.slippage)}` : '']
        : [`${res.quantity} ${assetId} を売却`, res.earned ? `受取 ${yen(res.earned)}` : '', res.fee ? `手数料 ${yen(res.fee)}` : '', res.tax ? `税 ${yen(res.tax)}` : ''];
      const text = parts.filter(Boolean).join(' ・ ');
      setLastTrade({ id: assetId, text, ok: true });
      addToast({ type: 'success', message: text });
      setQty({ ...qty, [assetId]: 0 });
      await fetchMe();
      await fetchPortfolio();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'エラーが発生しました';
      setLastTrade({ id: assetId, text, ok: false });
      addToast({ type: 'error', message: text });
    }
    setTrading(null);
  };

  // ----- Derived values -----
  const holdings = portfolio.map((p) => {
    const price = prices[p.asset_id] || 0;
    const value = price * p.quantity;
    const cost = p.avg_buy_price * p.quantity;
    return { ...p, price, value, cost, pl: value - cost };
  });
  const totalValue = holdings.reduce((a, h) => a + h.value, 0);
  const totalCost = holdings.reduce((a, h) => a + h.cost, 0);
  const totalPL = totalValue - totalCost;
  const cash = Number(user?.finance_balance ?? 0);

  const change = (id: string) => {
    const h = priceHistory[id] || [];
    const first = h[0] || prices[id] || 0;
    const cur = prices[id] || h[h.length - 1] || 0;
    return first ? ((cur - first) / first) * 100 : 0;
  };

  const shown = assets.filter((a) =>
    filter === 'all' ? true : filter === 'owned' ? portfolio.some((p) => p.asset_id === a.id) : a.type === filter,
  );

  return (
    <div className={styles.market}>
      {/* ===== Portfolio summary ===== */}
      <section className={styles.summary}>
        <span className={kit.label}>総資産（現金 + 評価額）</span>
        <AnimatedNumber value={Math.round(cash + totalValue)} prefix="¥" className={styles.total} />
        <div className={styles.summaryRow}>
          <span className={`${styles.plPill} ${totalPL >= 0 ? styles.up : styles.down}`}>
            {totalPL >= 0 ? '▲' : '▼'} {yen(Math.abs(totalPL))}
            {totalCost > 0 && <em>{pct((totalPL / totalCost) * 100)}</em>}
          </span>
          <span className={styles.muted}>含み損益</span>
        </div>
        <div className={styles.split}>
          <div><span className={styles.muted}>現金</span><b>{yen(cash)}</b></div>
          <div><span className={styles.muted}>評価額</span><b>{yen(totalValue)}</b></div>
          <div><span className={styles.muted}>保有銘柄</span><b>{portfolio.length}</b></div>
        </div>
      </section>

      <div className={kit.segmented} role="tablist">
        {([['all', 'すべて'], ['stock', '株式'], ['crypto', '仮想通貨'], ['owned', '保有中']] as [Filter, string][]).map(([f, l]) => (
          <button key={f} role="tab" aria-selected={filter === f} className={`${kit.segment} ${filter === f ? kit.segmentActive : ''}`} onClick={() => setFilter(f)}>
            {l}
          </button>
        ))}
      </div>

      {/* ===== Asset list ===== */}
      <section className={`${kit.panel} ${styles.list}`}>
        {assets.length === 0 && (
          <div className={styles.loading}><Loader size={20} className={kit.spinner} /></div>
        )}
        {assets.length > 0 && shown.length === 0 && (
          <p className={styles.empty}>保有している銘柄はまだありません</p>
        )}
        {shown.map((asset) => {
          const price = prices[asset.id] || 0;
          const prev = prevPrices[asset.id] || price;
          const tickDir = price > prev ? 'up' : price < prev ? 'down' : '';
          const ch = change(asset.id);
          const up = ch >= 0;
          const hist = priceHistory[asset.id] || [];
          const isOpen = open === asset.id;
          const held = holdings.find((h) => h.asset_id === asset.id);
          const q = qty[asset.id] || 0;
          const halving = asset.hasHalving ? halvingDaysLeft[asset.id] : undefined;

          return (
            <div key={asset.id} className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}>
              <button className={styles.row} onClick={() => setOpen(isOpen ? null : asset.id)} aria-expanded={isOpen}>
                <AssetLogo id={asset.id} type={asset.type} />
                <div className={styles.nameCol}>
                  <span className={styles.name}>{asset.name}</span>
                  <span className={styles.meta}>
                    {asset.id}
                    <span className={`${styles.tag} ${asset.type === 'crypto' ? styles.tagCrypto : ''}`}>{asset.type === 'crypto' ? '暗号' : '株'}</span>
                    {held && <span className={styles.tagOwn}>{held.quantity}</span>}
                  </span>
                </div>
                <div className={styles.sparkCol}><Sparkline data={hist.slice(-40)} up={up} /></div>
                <div className={styles.priceCol}>
                  <span key={`${asset.id}-${tick}`} className={`${styles.price} ${tickDir ? styles[`flash_${tickDir}`] : ''}`}>{price ? yen(price) : '—'}</span>
                  <span className={`${styles.chg} ${up ? styles.up : styles.down}`}>{pct(ch)}</span>
                </div>
                <ChevronDown size={16} className={styles.chev} />
              </button>

              {isOpen && (
                <div className={styles.detail}>
                  <div className={styles.chartWrap}><Sparkline data={hist} up={up} big /></div>
                  <p className={styles.desc}>
                    {asset.description}
                    {halving !== undefined && (
                      <span className={styles.halving}>
                        {halving === 0 ? <><Flame size={12} /> 本日半減期</> : <><Zap size={12} /> 半減期まで{halving}日</>}
                      </span>
                    )}
                  </p>

                  {held && (
                    <div className={styles.position}>
                      <div><span className={styles.muted}>保有数</span><b>{held.quantity.toLocaleString()}</b></div>
                      <div><span className={styles.muted}>平均取得</span><b>{yen(held.avg_buy_price)}</b></div>
                      <div><span className={styles.muted}>損益</span><b className={held.pl >= 0 ? styles.up : styles.down}>{held.pl >= 0 ? '+' : '−'}{yen(Math.abs(held.pl))}</b></div>
                    </div>
                  )}

                  <div className={styles.trade}>
                    <div className={styles.stepper}>
                      <button onClick={() => setQty({ ...qty, [asset.id]: Math.max(0, q - 1) })} aria-label="減らす"><Minus size={16} /></button>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="数量"
                        value={q || ''}
                        onChange={(e) => setQty({ ...qty, [asset.id]: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })}
                        aria-label="数量"
                      />
                      <button onClick={() => setQty({ ...qty, [asset.id]: q + 1 })} aria-label="増やす"><Plus size={16} /></button>
                    </div>
                    <div className={styles.quickQty}>
                      <button onClick={() => setQty({ ...qty, [asset.id]: price ? maxBuy(cash, price) : 0 })}>最大購入</button>
                      {held && <button onClick={() => setQty({ ...qty, [asset.id]: held.quantity })}>全て売却</button>}
                    </div>
                    <div className={styles.estimate}>
                      <span className={styles.muted}>購入時（手数料込）</span>
                      <b className={buyCost(price, q) > cash ? styles.down : ''}>{yen(buyCost(price, q))}</b>
                    </div>
                    <div className={styles.tradeBtns}>
                      <button className={kit.success} onClick={() => handleTrade(asset.id, 'buy')} disabled={!q || trading !== null}>
                        {trading === `${asset.id}:buy` ? <Loader size={16} className={kit.spinner} /> : '買う'}
                      </button>
                      <button className={kit.danger} onClick={() => handleTrade(asset.id, 'sell')} disabled={!q || !held || trading !== null}>
                        {trading === `${asset.id}:sell` ? <Loader size={16} className={kit.spinner} /> : '売る'}
                      </button>
                    </div>
                    {lastTrade?.id === asset.id && (
                      <p className={`${styles.tradeMsg} ${lastTrade.ok ? styles.up : styles.down}`}>{lastTrade.text}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
      <p className={styles.footnote}>価格は5秒ごとに更新 ・ 変動率は表示中のチャート期間の始値比 ・ 取引には手数料とスリッページがかかります</p>
    </div>
  );
}
