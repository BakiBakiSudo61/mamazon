import { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import styles from './Slots.module.css';

const SYMBOLS = ['🍎', '🍇', '🍒', '🔔', '💎', '7️⃣'];
const BET_PRESETS = [100, 500, 1000, 5000];

function rnd() { return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; }
function randomCol(): string[] { return [rnd(), rnd(), rnd()]; }

export function Slots() {
  const { user, fetchMe } = useAuthStore();
  const [betAmount, setBetAmount] = useState(100);
  // 3 reels (columns), each with [top, mid, bottom]
  const [reels, setReels] = useState<string[][]>([
    ['🍇', '🍒', '🔔'],
    ['💎', '🍒', '🍎'],
    ['🔔', '🍒', '🍇'],
  ]);
  const [stopped, setStopped] = useState([true, true, true]);
  const [spinning, setSpinning] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const [payout, setPayout] = useState<number | null>(null);

  const stoppedRef = useRef([true, true, true]);
  const pendingRef = useRef<{ reels: string[]; multiplier: number; payout: number } | null>(null);
  const spinIntervalsRef = useRef<(ReturnType<typeof setInterval> | null)[]>([null, null, null]);
  const autoTimersRef = useRef<(ReturnType<typeof setTimeout> | null)[]>([null, null, null]);

  useEffect(() => {
    return () => {
      spinIntervalsRef.current.forEach(id => id != null && clearInterval(id));
      autoTimersRef.current.forEach(id => id != null && clearTimeout(id));
    };
  }, []);

  const startColSpin = (ri: number) => {
    if (spinIntervalsRef.current[ri] != null) clearInterval(spinIntervalsRef.current[ri]!);
    spinIntervalsRef.current[ri] = setInterval(() => {
      setReels(prev => {
        const next = [...prev];
        next[ri] = randomCol();
        return next;
      });
    }, 80);
  };

  const stopCol = (ri: number) => {
    if (stoppedRef.current[ri]) return;
    if (spinIntervalsRef.current[ri] != null) { clearInterval(spinIntervalsRef.current[ri]!); spinIntervalsRef.current[ri] = null; }
    if (autoTimersRef.current[ri] != null) { clearTimeout(autoTimersRef.current[ri]!); autoTimersRef.current[ri] = null; }

    const result = pendingRef.current;
    const mid = result ? result.reels[ri] : rnd();
    setReels(prev => { const next = [...prev]; next[ri] = [rnd(), mid, rnd()]; return next; });

    stoppedRef.current[ri] = true;
    setStopped([...stoppedRef.current]);

    if (stoppedRef.current.every(v => v) && result) {
      setMultiplier(result.multiplier);
      setPayout(result.payout);
      setSpinning(false);
      setResultReady(false);
      fetchMe();
      pendingRef.current = null;
    }
  };

  const spin = async () => {
    const bal = user?.finance_balance ?? 0;
    if (betAmount <= 0 || betAmount > bal || spinning) return;

    stoppedRef.current = [false, false, false];
    setStopped([false, false, false]);
    setSpinning(true);
    setResultReady(false);
    setMultiplier(null);
    setPayout(null);
    pendingRef.current = null;

    autoTimersRef.current.forEach(id => id != null && clearTimeout(id));
    [0, 1, 2].forEach(ri => startColSpin(ri));

    try {
      const res = await api.post<{ reels: string[]; multiplier: number; payout: number }>(
        '/finance/gamble/slots', { amount: betAmount }
      );
      pendingRef.current = res;
      setResultReady(true);
      // auto-stop each reel sequentially
      [0, 1, 2].forEach(ri => {
        autoTimersRef.current[ri] = setTimeout(() => stopCol(ri), 400 + ri * 700);
      });
    } catch {
      spinIntervalsRef.current.forEach(id => id != null && clearInterval(id));
      stoppedRef.current = [true, true, true];
      setStopped([true, true, true]);
      setSpinning(false);
    }
  };

  const allStopped = stopped.every(v => v);

  return (
    <div className={styles.game}>
      <h2 className={styles.title}>🎰 Mamazon スロット</h2>
      <p className={styles.desc}>中段ライン3つ揃えで大当たり！ボタンで自分で止められる</p>

      <div className={styles.machine}>
        <div className={styles.machineTopLight} />

        <div className={styles.reelWindow}>
          {[0, 1, 2].map(ri => (
            <div key={ri} className={styles.reelCol}>
              {[0, 1, 2].map(row => (
                <div
                  key={row}
                  className={`${styles.reelCell} ${!stopped[ri] ? styles.reelSpin : ''} ${row === 1 ? styles.paylineCell : ''}`}
                  style={!stopped[ri] ? { animationDelay: `${ri * 0.07}s` } : {}}
                >
                  <span className={styles.reelSymbol}>{reels[ri][row]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.paylineLine} />
        <div className={styles.machineScrews}>
          <div className={styles.screw} /><div className={styles.screw} />
        </div>
      </div>

      {/* Stop buttons */}
      {spinning && (
        <div className={styles.stopBtns}>
          {[0, 1, 2].map(ri => (
            <button
              key={ri}
              className={`${styles.stopBtn} ${stopped[ri] ? styles.stopBtnDone : ''}`}
              onClick={() => stopCol(ri)}
              disabled={stopped[ri] || !resultReady}
            >
              {stopped[ri] ? '✓ 停止' : resultReady ? '■ STOP' : '···'}
            </button>
          ))}
        </div>
      )}

      {/* Result */}
      {multiplier !== null && allStopped && !spinning && (
        <div className={`${styles.result} ${multiplier > 0 ? styles.win : styles.lose}`}>
          {multiplier > 0 ? `🏆 ${multiplier}倍！ +¥${payout?.toLocaleString()}` : '💸 ハズレ...'}
        </div>
      )}

      <div className={styles.payTable}>
        <span className={styles.payEntry}><span className={styles.payEmoji}>7️⃣</span>×3 = <strong className={styles.goldText}>50x</strong></span>
        <span className={styles.payEntry}><span className={styles.payEmoji}>💎</span>×3 = <strong className={styles.silverText}>20x</strong></span>
        <span className={styles.payEntry}>同×3 = <strong>10x</strong></span>
        <span className={styles.payEntry}>同×2 = <strong>2x</strong></span>
      </div>

      <div className={styles.chips}>
        {BET_PRESETS.map(v => (
          <button key={v} className={`${styles.chip} ${betAmount === v ? styles.chipActive : ''}`}
            onClick={() => setBetAmount(v)} disabled={spinning}>
            ¥{v.toLocaleString()}
          </button>
        ))}
        <input type="number" min="1" value={betAmount}
          onChange={e => setBetAmount(Number(e.target.value))}
          className={styles.betInput} disabled={spinning} />
      </div>

      <button className={styles.spinBtn} onClick={spin} disabled={spinning}>
        {spinning ? '🎰 スピン中...' : '🎰 SPIN！'}
      </button>

      <p className={styles.balanceNote}>残高: ¥{(user?.finance_balance ?? 0).toLocaleString()}</p>
    </div>
  );
}