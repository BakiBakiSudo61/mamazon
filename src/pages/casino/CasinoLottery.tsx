import { useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import styles from './CasinoGames.module.css';

export function CasinoLottery() {
  const refreshBalance = useAuthStore((s) => s.fetchMe);
  const [amount, setAmount] = useState(1000);
  const [picks, setPicks] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ picks: number[]; winning: number[]; matches: number; multiplier: number; payout: number } | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  const togglePick = (n: number) => {
    if (picks.includes(n)) setPicks(picks.filter((p) => p !== n));
    else if (picks.length < 6) setPicks([...picks, n]);
  };

  const quickPick = () => {
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    const selected: number[] = [];
    for (let i = 0; i < 6; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      selected.push(pool.splice(idx, 1)[0]);
    }
    setPicks(selected.sort((a, b) => a - b));
  };

  const draw = async () => {
    if (picks.length !== 6) return;
    setLoading(true);
    setResult(null);
    setRevealing(false);
    setRevealedCount(0);
    try {
      const res = await api.post<any>('/finance/gamble/lottery', { amount, picks });
      // Reveal balls one by one
      setResult(res);
      setRevealing(true);
      for (let i = 1; i <= 6; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setRevealedCount(i);
      }
      await new Promise((r) => setTimeout(r, 500));
      setRevealing(false);
      refreshBalance();
    } catch { }
    setLoading(false);
  };

  const reset = () => {
    setPicks([]);
    setResult(null);
    setRevealing(false);
    setRevealedCount(0);
  };

  const matchLabels: Record<number, string> = { 6: '🏆 1等 ×1,000,000', 5: '🥈 2等 ×1,000', 4: '🥉 3等 ×100', 3: '4等 ×10', 2: '5等 ×2' };

  return (
    <div className={styles.gamePage}>
      <h2 className={styles.gameTitle}>🎫 宝くじ（ロト6）</h2>
      <p className={styles.gameSubtitle}>1〜45から6つの番号を選んでください</p>

      {/* Winning balls reveal */}
      {result && (
        <div className={styles.lotteryReveal}>
          <h3>当選番号</h3>
          <div className={styles.lotteryBalls}>
            {result.winning.map((n: number, i: number) => (
              <div key={i} className={`${styles.lotteryBall} ${styles.winBall} ${i < revealedCount ? styles.ballRevealed : styles.ballHidden} ${result.picks.includes(n) ? styles.ballMatch : ''}`}>
                {i < revealedCount ? n : '?'}
              </div>
            ))}
          </div>
          <div className={styles.lotteryBalls} style={{ marginTop: '0.5rem' }}>
            <span className={styles.lotteryLabel}>あなたの番号:</span>
            {result.picks.map((n: number, i: number) => (
              <div key={i} className={`${styles.lotteryBall} ${styles.pickBall} ${result.winning.includes(n) ? styles.ballMatch : ''}`}>
                {n}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && !revealing && (
        <div className={`${styles.resultBanner} ${result.matches >= 2 ? styles.resultWin : styles.resultLose}`}>
          {result.matches >= 2
            ? `🎉 ${result.matches}個一致！${matchLabels[result.matches]} → +${result.payout.toLocaleString()}`
            : `😢 ${result.matches}個一致 — ハズレ`}
        </div>
      )}

      {/* Number grid */}
      {!result && (
        <div className={styles.lotteryGrid}>
          {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`${styles.lotteryNum} ${picks.includes(n) ? styles.lotteryNumPicked : ''}`}
              onClick={() => togglePick(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className={styles.betSection}>
        {!result && (
          <>
            <div className={styles.betRow}>
              <label>選択中: {picks.length}/6</label>
              <button className={styles.valBtn} onClick={quickPick}>🎲 クイックピック</button>
            </div>
            <div className={styles.betRow}>
              <label>購入額</label>
              <div className={styles.amountBtns}>
                {[500, 1000, 5000, 10000].map((v) => (
                  <button key={v} className={`${styles.amountBtn} ${amount === v ? styles.amountActive : ''}`} onClick={() => setAmount(v)}>
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <button className={styles.spinBtn} onClick={draw} disabled={loading || picks.length !== 6}>
              {loading ? '抽選中...' : '抽選する！'}
            </button>
          </>
        )}
        {result && !revealing && (
          <button className={styles.spinBtn} onClick={reset}>もう一度購入する</button>
        )}
      </div>

      {/* Payout table */}
      <div className={styles.payoutTable}>
        <h4>配当表</h4>
        <table>
          <tbody>
            <tr><td>6個一致</td><td className={styles.payoutGold}>×1,000,000</td></tr>
            <tr><td>5個一致</td><td>×1,000</td></tr>
            <tr><td>4個一致</td><td>×100</td></tr>
            <tr><td>3個一致</td><td>×10</td></tr>
            <tr><td>2個一致</td><td>×2</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
