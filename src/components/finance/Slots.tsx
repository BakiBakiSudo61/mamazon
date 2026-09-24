import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { GameHeader } from './ui/GameHeader';
import { BetSelector } from './ui/BetSelector';
import { ResultBanner } from './ui/ResultBanner';
import kit from './ui/kit.module.css';
import styles from './Slots.module.css';

const SYMBOLS = ['🍎', '🍇', '🍒', '🔔', '💎', '7️⃣'];
const rnd = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
const randomCol = () => [rnd(), rnd(), rnd()];

type SpinResult = { reels: string[]; multiplier: number; payout: number };

export function Slots() {
  const { user, fetchMe } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState<string[][]>([
    ['🍇', '🍒', '🔔'],
    ['💎', '7️⃣', '🍎'],
    ['🔔', '🍒', '🍇'],
  ]);
  const [stopped, setStopped] = useState([true, true, true]);
  const [spinning, setSpinning] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [outcome, setOutcome] = useState<(SpinResult & { bet: number }) | null>(null);

  const stoppedRef = useRef([true, true, true]);
  const pendingRef = useRef<SpinResult | null>(null);
  const betRef = useRef(bet);
  const autoTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>([null, null, null]);

  // long symbol strips for the spinning animation (stable per mount)
  const strips = useMemo(() => [0, 1, 2].map(() => Array.from({ length: 12 }, rnd)), []);

  useEffect(() => () => autoTimers.current.forEach((t) => t && clearTimeout(t)), []);

  const balance = Number(user?.finance_balance ?? 0);

  const stopCol = (ri: number) => {
    const res = pendingRef.current;
    if (stoppedRef.current[ri] || !res) return;
    if (autoTimers.current[ri]) { clearTimeout(autoTimers.current[ri]!); autoTimers.current[ri] = null; }

    setReels((prev) => { const next = [...prev]; next[ri] = [rnd(), res.reels[ri], rnd()]; return next; });
    stoppedRef.current[ri] = true;
    setStopped([...stoppedRef.current]);

    if (stoppedRef.current.every(Boolean)) {
      pendingRef.current = null;
      setTimeout(() => {
        setOutcome({ ...res, bet: betRef.current });
        setSpinning(false);
        setResultReady(false);
        fetchMe();
      }, 380);
    }
  };

  const spin = async () => {
    if (bet <= 0 || bet > balance || spinning) return;
    betRef.current = bet;
    stoppedRef.current = [false, false, false];
    setStopped([false, false, false]);
    setSpinning(true);
    setResultReady(false);
    setOutcome(null);
    pendingRef.current = null;
    autoTimers.current.forEach((t) => t && clearTimeout(t));

    try {
      const res = await api.post<SpinResult>('/finance/gamble/slots', { amount: bet });
      pendingRef.current = res;
      setResultReady(true);
      // safety net: reels stop by themselves if the player doesn't
      [0, 1, 2].forEach((ri) => {
        autoTimers.current[ri] = setTimeout(() => stopCol(ri), 6000 + ri * 1200);
      });
    } catch (err) {
      stoppedRef.current = [true, true, true];
      setStopped([true, true, true]);
      setReels((r) => r.map((c) => (c.length ? c : randomCol())));
      setSpinning(false);
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'エラーが発生しました' });
    }
  };

  const stopNext = () => {
    const i = stoppedRef.current.findIndex((s) => !s);
    if (i >= 0) stopCol(i);
  };

  const won = outcome && outcome.multiplier > 0;
  const mid = reels.map((c) => c[1]);
  const hit = (ri: number) => !!won && mid.filter((s) => s === mid[ri]).length >= 2;

  return (
    <div className={kit.game}>
      <GameHeader icon="🎰" title="スロット" desc="中段ラインに揃えば当たり。STOPで1リールずつ自分で止められます。" />

      <section className={`${styles.machine} ${won ? styles.machineWin : ''} ${outcome && outcome.multiplier >= 20 ? styles.machineJackpot : ''}`}>
        <div className={styles.marquee}>
          <span className={styles.marqueeDot} /><span className={styles.marqueeText}>MAMAZON SLOTS</span><span className={styles.marqueeDot} />
        </div>
        <div className={styles.window}>
          {[0, 1, 2].map((ri) => (
            <button
              key={ri}
              type="button"
              className={styles.reel}
              onClick={() => stopCol(ri)}
              disabled={stopped[ri] || !resultReady}
              aria-label={`リール${ri + 1}を止める`}
            >
              {!stopped[ri] ? (
                <div className={styles.strip} style={{ animationDuration: `${0.32 + ri * 0.04}s` }}>
                  {[...strips[ri], ...strips[ri]].map((s, i) => <span key={i} className={styles.cell}>{s}</span>)}
                </div>
              ) : (
                <div className={`${styles.stack} ${spinning || outcome ? styles.settle : ''}`}>
                  {reels[ri].map((s, row) => (
                    <span key={row} className={`${styles.cell} ${row === 1 && hit(ri) ? styles.cellHit : ''}`}>{s}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
          <div className={styles.payline} aria-hidden="true" />
          <div className={styles.shadeTop} aria-hidden="true" />
          <div className={styles.shadeBottom} aria-hidden="true" />
        </div>

        <div className={styles.stops}>
          {[0, 1, 2].map((ri) => (
            <button
              key={ri}
              className={`${styles.stopBtn} ${stopped[ri] ? styles.stopDone : ''} ${spinning && resultReady && !stopped[ri] ? styles.stopLive : ''}`}
              onClick={() => stopCol(ri)}
              disabled={!spinning || stopped[ri] || !resultReady}
            >
              STOP
            </button>
          ))}
        </div>
      </section>

      {outcome && !spinning && (
        won
          ? <ResultBanner kind="win" big={outcome.multiplier >= 20} title={`${outcome.multiplier}倍 HIT!`} sub={`払戻 ¥${outcome.payout.toLocaleString()}`} amount={outcome.payout - outcome.bet} />
          : <ResultBanner kind="lose" title="ハズレ" sub="もう一度回してみよう" amount={-outcome.bet} />
      )}

      <section className={`${kit.panel} ${styles.controls}`}>
        <div className={styles.pays}>
          <span><em>7️⃣7️⃣7️⃣</em><b className={styles.gold}>×50</b></span>
          <span><em>💎💎💎</em><b className={styles.silver}>×20</b></span>
          <span><em>同じ絵柄×3</em><b>×10</b></span>
          <span><em>同じ絵柄×2</em><b>×2</b></span>
        </div>
        <BetSelector value={bet} onChange={setBet} disabled={spinning} />
        {spinning ? (
          <button className={`${kit.secondary} ${kit.block}`} onClick={stopNext} disabled={!resultReady}>
            {resultReady ? '次のリールを止める' : '回転中…'}
          </button>
        ) : (
          <button className={`${kit.primary} ${kit.block}`} onClick={spin} disabled={bet > balance}>
            SPIN
          </button>
        )}
      </section>
    </div>
  );
}
