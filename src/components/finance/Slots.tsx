import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Loader } from 'lucide-react';
import styles from './Slots.module.css';

const SYMBOLS = ['🍎', '🍇', '🍒', '🔔', '💎', '7️⃣'];
const BET_PRESETS = [100, 500, 1000, 5000];

export function Slots() {
  const { user, fetchMe } = useAuthStore();
  const [betAmount, setBetAmount] = useState(100);
  const [displayReels, setDisplayReels] = useState(['🍒', '🍒', '🍒']);
  const [spinning, setSpinning] = useState(false);
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const [payout, setPayout] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const spin = async () => {
    const bal = user?.finance_balance ?? 0;
    if (betAmount <= 0 || betAmount > bal || spinning) return;
    setSpinning(true);
    setMultiplier(null);
    setPayout(null);

    intervalRef.current = setInterval(() => {
      setDisplayReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
    }, 100);

    try {
      const res = await api.post<{ reels: string[]; multiplier: number; payout: number }>(
        '/finance/gamble/slots', { amount: betAmount }
      );
      setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayReels(res.reels);
        setMultiplier(res.multiplier);
        setPayout(res.payout);
        setSpinning(false);
        fetchMe();
      }, 1400);
    } catch {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSpinning(false);
    }
  };

  return (
    <div className={styles.game}>
      <h2 className={styles.title}>🎰 Mamazon スロット</h2>
      <p className={styles.desc}>3つ揃えば大当たり！</p>

      {/* Slot machine frame */}
      <div className={styles.machine}>
        <div className={styles.machineTopLight} />
        <div className={styles.reelWindow}>
          {displayReels.map((sym, i) => (
            <div
              key={i}
              className={`${styles.reel} ${spinning ? styles.reelSpin : ''}`}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className={styles.reelSymbol}>{sym}</span>
            </div>
          ))}
        </div>
        <div className={styles.paylineLine} />
        <div className={styles.machineScrews}>
          <div className={styles.screw} />
          <div className={styles.screw} />
        </div>
      </div>

      {/* Result */}
      {multiplier !== null && !spinning && (
        <div className={`${styles.result} ${multiplier > 0 ? styles.win : styles.lose}`}>
          {multiplier > 0
            ? `🏆 ${multiplier}倍！ +¥${payout?.toLocaleString()}`
            : '💸 ハズレ...'}
        </div>
      )}

      {/* Pay table */}
      <div className={styles.payTable}>
        <span className={styles.payEntry}><span className={styles.payEmoji}>7️⃣</span>×3 = <strong className={styles.goldText}>50x</strong></span>
        <span className={styles.payEntry}><span className={styles.payEmoji}>💎</span>×3 = <strong className={styles.silverText}>20x</strong></span>
        <span className={styles.payEntry}>同×3 = <strong>10x</strong></span>
        <span className={styles.payEntry}>同×2 = <strong>2x</strong></span>
      </div>

      {/* Chip buttons */}
      <div className={styles.chips}>
        {BET_PRESETS.map(v => (
          <button
            key={v}
            className={`${styles.chip} ${betAmount === v ? styles.chipActive : ''}`}
            onClick={() => setBetAmount(v)}
          >
            ¥{v.toLocaleString()}
          </button>
        ))}
        <input
          type="number"
          min="1"
          value={betAmount}
          onChange={e => setBetAmount(Number(e.target.value))}
          className={styles.betInput}
        />
      </div>

      <button className={styles.spinBtn} onClick={spin} disabled={spinning}>
        {spinning
          ? <><Loader size={22} className={styles.spinLoader} /> スピン中...</>
          : '🎰 SPIN！'}
      </button>

      <p className={styles.balanceNote}>残高: ¥{(user?.finance_balance ?? 0).toLocaleString()}</p>
    </div>
  );
}