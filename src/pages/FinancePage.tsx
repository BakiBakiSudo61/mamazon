import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, Loader, Pickaxe, ShoppingBag, Wallet, Timer, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import { FinanceShell } from '../components/finance/ui/FinanceShell';
import { AnimatedNumber } from '../components/finance/ui/AnimatedNumber';
import kit from '../components/finance/ui/kit.module.css';
import styles from './FinancePage.module.css';

type Direction = 'deposit' | 'withdraw';
type Notice = { kind: 'ok' | 'err'; text: string } | null;

const MINE_PHASES = ['ハッシュを計算中…', 'ブロックを探索中…', 'ノードに送信中…', '最終検証中…'];

function Ring({ progress, children, tone }: { progress: number; children: React.ReactNode; tone: 'gold' | 'muted' | 'green' }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={r} className={styles.ringTrack} />
        <circle
          cx="40" cy="40" r={r}
          className={`${styles.ringBar} ${styles[`ring_${tone}`]}`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
        />
      </svg>
      <div className={styles.ringCenter}>{children}</div>
    </div>
  );
}

export function FinancePage() {
  const { user, fetchMe } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<Direction>('deposit');
  const [loading, setLoading] = useState(false);
  const [convertNotice, setConvertNotice] = useState<Notice>(null);

  const [mining, setMining] = useState(false);
  const [minePhase, setMinePhase] = useState('');
  const [mineProgress, setMineProgress] = useState(0);
  const [mineHash, setMineHash] = useState('');
  const [mineDone, setMineDone] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [cooldownTotal, setCooldownTotal] = useState(60);
  const [mineNotice, setMineNotice] = useState<Notice>(null);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => () => timers.current.forEach(clearInterval), []);

  if (!user) return null;

  const finBal = Number(user.finance_balance ?? 0);
  const shopBal = Number(user.balance ?? 0);
  const amountNum = parseInt(amount, 10) || 0;
  const maxAmount = direction === 'deposit' ? shopBal : finBal;
  const invalid = amountNum <= 0 || amountNum > maxAmount;
  const afterFin = direction === 'deposit' ? finBal + amountNum : finBal - amountNum;
  const afterShop = direction === 'deposit' ? shopBal - amountNum : shopBal + amountNum;

  const flash = (set: (n: Notice) => void, n: Notice, ms = 4000) => {
    set(n);
    setTimeout(() => set(null), ms);
  };

  const handleConvert = async () => {
    if (invalid) return;
    setLoading(true);
    setConvertNotice(null);
    try {
      if (direction === 'deposit') {
        await api.post('/finance/deposit', { amount: amountNum });
        flash(setConvertNotice, { kind: 'ok', text: `¥${amountNum.toLocaleString()} をファイナンスに入金しました` });
      } else {
        await api.post('/finance/convert', { amount: amountNum });
        flash(setConvertNotice, { kind: 'ok', text: `¥${amountNum.toLocaleString()} をMamazon残高に出金しました` });
      }
      setAmount('');
      await fetchMe();
    } catch (err) {
      flash(setConvertNotice, { kind: 'err', text: err instanceof Error ? err.message : 'エラーが発生しました' });
    } finally {
      setLoading(false);
    }
  };

  const stopTimers = () => { timers.current.forEach(clearInterval); timers.current = []; };

  const handleMine = async () => {
    setMining(true);
    setMineDone(false);
    setMineProgress(0);
    setMineNotice(null);
    let phase = 0;
    setMinePhase(MINE_PHASES[0]);
    let prog = 0;
    timers.current = [
      setInterval(() => { phase = Math.min(phase + 1, MINE_PHASES.length - 1); setMinePhase(MINE_PHASES[phase]); }, 750),
      setInterval(() => setMineHash('0x' + Math.random().toString(16).slice(2, 14).padEnd(12, '0')), 90),
      setInterval(() => { prog = Math.min(prog + 0.02, 0.94); setMineProgress(prog); }, 60),
    ];
    const minDelay = new Promise<void>((r) => setTimeout(r, 3000));

    try {
      const [res] = await Promise.all([
        api.post<{ minedAmount: number; cooldownSeconds?: number }>('/finance/mine', {}),
        minDelay,
      ]);
      stopTimers();
      setMineProgress(1);
      setMineDone(true);
      setMinePhase('ブロック発見！');
      await fetchMe();
      setTimeout(() => {
        setMining(false);
        setMineDone(false);
        const cd = res.cooldownSeconds ?? 60;
        setCooldownTotal(cd);
        setCooldown(cd);
        flash(setMineNotice, { kind: 'ok', text: `¥${res.minedAmount.toLocaleString()} を採掘しました` }, 5000);
      }, 900);
    } catch (err) {
      stopTimers();
      setMining(false);
      const msg = err instanceof Error ? err.message : 'エラーが発生しました';
      const m = msg.match(/(\d+)秒/);
      if (m) { setCooldownTotal(60); setCooldown(parseInt(m[1], 10)); }
      flash(setMineNotice, { kind: 'err', text: msg });
    }
  };

  return (
    <FinanceShell title="Finance" backTo="/home" backLabel="ショップ">
      <div className={styles.page}>
        {/* ===== Balance hero ===== */}
        <section className={styles.hero}>
          <span className={kit.label}>ファイナンス残高</span>
          <AnimatedNumber value={finBal} prefix="¥" className={styles.heroValue} />
          <div className={styles.heroSub}>
            <ShoppingBag size={14} />
            Mamazon残高 <AnimatedNumber value={shopBal} prefix="¥" className={styles.heroSubValue} />
          </div>
        </section>

        <div className={styles.grid}>
          {/* ===== Transfer ===== */}
          <section className={`${kit.panel} ${styles.card}`}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>残高の移動</h2>
            </div>
            <div className={kit.segmented} role="tablist">
              <button
                role="tab"
                aria-selected={direction === 'deposit'}
                className={`${kit.segment} ${direction === 'deposit' ? kit.segmentActive : ''}`}
                onClick={() => { setDirection('deposit'); setAmount(''); }}
              >入金</button>
              <button
                role="tab"
                aria-selected={direction === 'withdraw'}
                className={`${kit.segment} ${direction === 'withdraw' ? kit.segmentActive : ''}`}
                onClick={() => { setDirection('withdraw'); setAmount(''); }}
              >出金</button>
            </div>

            <div className={styles.flow}>
              <div className={styles.flowRow}>
                <span className={styles.flowIcon}>{direction === 'deposit' ? <ShoppingBag size={16} /> : <Wallet size={16} />}</span>
                <div className={styles.flowText}>
                  <span className={styles.flowLabel}>From</span>
                  <span>{direction === 'deposit' ? 'Mamazon残高' : 'ファイナンス'}</span>
                </div>
                <span className={styles.flowBal}>¥{maxAmount.toLocaleString()}</span>
              </div>
              <div className={styles.flowArrow}><ArrowDown size={14} /></div>
              <div className={styles.flowRow}>
                <span className={styles.flowIcon}>{direction === 'deposit' ? <Wallet size={16} /> : <ShoppingBag size={16} />}</span>
                <div className={styles.flowText}>
                  <span className={styles.flowLabel}>To</span>
                  <span>{direction === 'deposit' ? 'ファイナンス' : 'Mamazon残高'}</span>
                </div>
                <span className={styles.flowBal}>¥{(direction === 'deposit' ? finBal : shopBal).toLocaleString()}</span>
              </div>
            </div>

            <label className={`${styles.amountField} ${amountNum > maxAmount ? styles.amountWarn : ''}`}>
              <span className={styles.amountYen}>¥</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount ? Number(amount).toLocaleString() : ''}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 15))}
                className={styles.amountInput}
                aria-label="金額"
              />
            </label>
            <div className={styles.quick}>
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <button key={p} className={styles.quickBtn} onClick={() => setAmount(String(Math.floor(maxAmount * p)))}>
                  {p === 1 ? 'MAX' : `${p * 100}%`}
                </button>
              ))}
            </div>

            {amountNum > 0 && (
              <p className={`${styles.preview} ${amountNum > maxAmount ? styles.previewWarn : ''}`}>
                {amountNum > maxAmount
                  ? '残高が不足しています'
                  : <>移動後 ファイナンス <b>¥{afterFin.toLocaleString()}</b> ・ Mamazon <b>¥{afterShop.toLocaleString()}</b></>}
              </p>
            )}

            <button className={`${kit.primary} ${kit.block}`} onClick={handleConvert} disabled={loading || invalid}>
              {loading ? <Loader size={18} className={kit.spinner} /> : direction === 'deposit' ? '入金する' : '出金する'}
            </button>

            {convertNotice && (
              <p className={`${styles.notice} ${convertNotice.kind === 'ok' ? styles.noticeOk : styles.noticeErr}`}>
                {convertNotice.kind === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {convertNotice.text}
              </p>
            )}
          </section>

          {/* ===== Mining ===== */}
          <section className={`${kit.panel} ${styles.card} ${styles.mineCard}`}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>無料マイニング</h2>
              <span className={styles.badge}>¥100〜¥500</span>
            </div>
            <div className={styles.mineBody}>
              {mining ? (
                <Ring progress={mineProgress} tone={mineDone ? 'green' : 'gold'}>
                  {mineDone ? <CheckCircle2 size={26} className={styles.mineOk} /> : <Pickaxe size={24} className={styles.mineSwing} />}
                </Ring>
              ) : cooldown > 0 ? (
                <Ring progress={cooldown / cooldownTotal} tone="muted">
                  <span className={styles.cdNum}>{cooldown}</span>
                  <span className={styles.cdUnit}>秒</span>
                </Ring>
              ) : (
                <Ring progress={1} tone="gold"><Pickaxe size={24} /></Ring>
              )}
              <div className={styles.mineInfo}>
                {mining ? (
                  <>
                    <span className={styles.minePhase}>{minePhase}</span>
                    <code className={styles.mineHash}>{mineDone ? '✓ verified' : mineHash}</code>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <span className={styles.minePhase}><Timer size={14} /> クールダウン中</span>
                    <span className={styles.mineSub}>次のマイニングまでお待ちください</span>
                  </>
                ) : (
                  <>
                    <span className={styles.minePhase}>採掘の準備ができました</span>
                    <span className={styles.mineSub}>ブロックを見つけて報酬を獲得</span>
                  </>
                )}
              </div>
            </div>
            <button className={`${kit.secondary} ${kit.block}`} onClick={handleMine} disabled={mining || cooldown > 0}>
              {mining ? '採掘中…' : cooldown > 0 ? `あと ${cooldown} 秒` : <><Pickaxe size={18} /> マイニング開始</>}
            </button>
            {mineNotice && (
              <p className={`${styles.notice} ${mineNotice.kind === 'ok' ? styles.noticeOk : styles.noticeErr}`}>
                {mineNotice.kind === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {mineNotice.text}
              </p>
            )}
          </section>
        </div>

        {/* ===== Destinations ===== */}
        <div className={styles.tiles}>
          <Link to="/finance/casino" className={`${styles.tile} ${styles.tileCasino}`}>
            <div className={styles.tileArt} aria-hidden="true">
              <span>🃏</span><span>🎰</span><span>🎡</span>
            </div>
            <div className={styles.tileBody}>
              <span className={styles.tileKicker}>6 GAMES</span>
              <h3 className={styles.tileTitle}>カジノ</h3>
              <p className={styles.tileDesc}>ハイ&ロー・スロット・ルーレット・ブラックジャック・競馬・ロト6</p>
            </div>
            <span className={styles.tileGo}><ArrowRight size={18} /></span>
          </Link>
          <Link to="/finance/market" className={`${styles.tile} ${styles.tileMarket}`}>
            <svg className={styles.tileChart} viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="fin-mkt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ed17f" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#2ed17f" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 34 L12 30 L22 32 L34 22 L46 25 L58 16 L70 19 L82 10 L94 13 L106 5 L120 7 L120 40 L0 40 Z" fill="url(#fin-mkt)" />
              <path d="M0 34 L12 30 L22 32 L34 22 L46 25 L58 16 L70 19 L82 10 L94 13 L106 5 L120 7" fill="none" stroke="#2ed17f" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className={styles.tileBody}>
              <span className={styles.tileKicker}>LIVE</span>
              <h3 className={styles.tileTitle}>マーケット</h3>
              <p className={styles.tileDesc}>株式・仮想通貨をリアルタイム価格でトレード</p>
            </div>
            <span className={styles.tileGo}><ArrowRight size={18} /></span>
          </Link>
        </div>
      </div>
    </FinanceShell>
  );
}
