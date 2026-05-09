import { useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import styles from './CasinoGames.module.css';

const REDS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const numColor = (n: number) => n === 0 ? 'green' : REDS.includes(n) ? 'red' : 'black';

type BetType = 'color' | 'parity' | 'half' | 'dozen' | 'column' | 'number';

export function CasinoRoulette() {
  const refreshBalance = useAuthStore((s) => s.fetchMe);
  const [amount, setAmount] = useState(1000);
  const [betType, setBetType] = useState<BetType>('color');
  const [betValue, setBetValue] = useState<string | number>('red');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ num: number; color: string; win: boolean; payout: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const spin = async () => {
    setSpinning(true);
    setResult(null);
    try {
      const res = await api.post<{ result: number; resultColor: string; win: boolean; payout: number; newBalance: number }>(
        '/finance/gamble/roulette', { amount, betType, betValue }
      );
      setTimeout(() => {
        setResult({ num: res.result, color: res.resultColor, win: res.win, payout: res.payout });
        setHistory((h) => [res.result, ...h.slice(0, 19)]);
        setSpinning(false);
        refreshBalance();
      }, 2000);
    } catch {
      setSpinning(false);
    }
  };

  return (
    <div className={styles.gamePage}>
      <h2 className={styles.gameTitle}>🎡 ルーレット</h2>

      {/* Result display */}
      <div className={`${styles.rouletteResult} ${spinning ? styles.spinning : ''}`}>
        {spinning ? (
          <div className={styles.rouletteWheel}>🎡</div>
        ) : result ? (
          <div className={`${styles.rouletteNum} ${styles[`roulette_${result.color}`]}`}>
            {result.num}
          </div>
        ) : (
          <div className={styles.rouletteNum}>?</div>
        )}
      </div>

      {result && (
        <div className={`${styles.resultBanner} ${result.win ? styles.resultWin : styles.resultLose}`}>
          {result.win ? `🎉 WIN! +${result.payout.toLocaleString()}` : '😢 LOSE'}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className={styles.rouletteHistory}>
          {history.map((n, i) => (
            <span key={i} className={`${styles.historyDot} ${styles[`roulette_${numColor(n)}`]}`}>{n}</span>
          ))}
        </div>
      )}

      {/* Bet controls */}
      <div className={styles.betSection}>
        <div className={styles.betRow}>
          <label>ベット額</label>
          <div className={styles.amountBtns}>
            {[500, 1000, 5000, 10000, 50000].map((v) => (
              <button key={v} className={`${styles.amountBtn} ${amount === v ? styles.amountActive : ''}`} onClick={() => setAmount(v)}>
                {v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.betRow}>
          <label>ベット方法</label>
          <div className={styles.betTypeBtns}>
            {([['color', '赤/黒'], ['parity', '奇/偶'], ['half', '前/後半'], ['dozen', 'ダズン'], ['number', '番号']] as [BetType, string][]).map(([t, l]) => (
              <button key={t} className={`${styles.betTypeBtn} ${betType === t ? styles.betTypeActive : ''}`} onClick={() => { setBetType(t); setBetValue(t === 'color' ? 'red' : t === 'parity' ? 'odd' : t === 'half' ? 'low' : t === 'dozen' ? 1 : 0); }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.betRow}>
          <label>選択</label>
          <div className={styles.betValueBtns}>
            {betType === 'color' && <>
              <button className={`${styles.colorBtn} ${styles.redBtn} ${betValue === 'red' ? styles.colorActive : ''}`} onClick={() => setBetValue('red')}>赤 (×2)</button>
              <button className={`${styles.colorBtn} ${styles.blackBtn} ${betValue === 'black' ? styles.colorActive : ''}`} onClick={() => setBetValue('black')}>黒 (×2)</button>
            </>}
            {betType === 'parity' && <>
              <button className={`${styles.valBtn} ${betValue === 'odd' ? styles.valActive : ''}`} onClick={() => setBetValue('odd')}>奇数 (×2)</button>
              <button className={`${styles.valBtn} ${betValue === 'even' ? styles.valActive : ''}`} onClick={() => setBetValue('even')}>偶数 (×2)</button>
            </>}
            {betType === 'half' && <>
              <button className={`${styles.valBtn} ${betValue === 'low' ? styles.valActive : ''}`} onClick={() => setBetValue('low')}>1-18 (×2)</button>
              <button className={`${styles.valBtn} ${betValue === 'high' ? styles.valActive : ''}`} onClick={() => setBetValue('high')}>19-36 (×2)</button>
            </>}
            {betType === 'dozen' && [1, 2, 3].map((d) => (
              <button key={d} className={`${styles.valBtn} ${betValue === d ? styles.valActive : ''}`} onClick={() => setBetValue(d)}>
                {d === 1 ? '1-12' : d === 2 ? '13-24' : '25-36'} (×3)
              </button>
            ))}
            {betType === 'number' && (
              <input type="number" min={0} max={36} value={betValue as number} onChange={(e) => setBetValue(Number(e.target.value))} className={styles.numberInput} placeholder="0-36 (×36)" />
            )}
          </div>
        </div>

        <button className={styles.spinBtn} onClick={spin} disabled={spinning}>
          {spinning ? '回転中...' : 'SPIN!'}
        </button>
      </div>
    </div>
  );
}
