import { useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Loader } from 'lucide-react';
import styles from './HorseRacing.module.css';

const HORSES = [
  { name: 'マカヒキ', odds: 2.0, color: '#e74c3c' },
  { name: 'キタサン', odds: 3.5, color: '#3498db' },
  { name: 'ディープ', odds: 5.0, color: '#2ecc71' },
  { name: 'アーモンド', odds: 10.0, color: '#f1c40f' },
  { name: 'ゴールドS', odds: 20.0, color: '#9b59b6' },
];

const BET_PRESETS = [100, 500, 1000, 5000];

export function HorseRacing() {
  const { user, fetchMe } = useAuthStore();
  const [betAmount, setBetAmount] = useState(100);
  const [selectedHorse, setSelectedHorse] = useState(0);
  const [loading, setLoading] = useState(false);
  const [racing, setRacing] = useState(false);
  const [result, setResult] = useState<{ winner: number, payout: number } | null>(null);
  const [horsePositions, setHorsePositions] = useState<number[]>([0, 0, 0, 0, 0]);

  const play = async () => {
    const bal = user?.finance_balance ?? 0;
    if (betAmount <= 0 || betAmount > bal || loading || racing) return;
    setLoading(true);
    setResult(null);
    setHorsePositions([0, 0, 0, 0, 0]);

    try {
      const res = await api.post<{ winningHorse: number; payout: number; newBalance: number }>(
        '/finance/gamble/horseracing', { amount: betAmount, horseIndex: selectedHorse }
      );
      
      setRacing(true);
      
      // Simulate race animation
      const interval = setInterval(() => {
        setHorsePositions(prev => {
          const next = [...prev];
          let done = false;
          for (let i = 0; i < 5; i++) {
            // winning horse naturally moves a bit faster on average, others lag
            const speed = i === res.winningHorse ? Math.random() * 8 + 4 : Math.random() * 6 + 2;
            next[i] = Math.min(100, next[i] + speed);
            if (next[i] >= 100 && i === res.winningHorse) {
              done = true;
            }
          }
          if (done) {
            clearInterval(interval);
            setTimeout(() => {
              setRacing(false);
              setResult({ winner: res.winningHorse, payout: res.payout });
              setLoading(false);
              fetchMe();
            }, 500);
          }
          return next;
        });
      }, 150);

    } catch {
      setLoading(false);
      setRacing(false);
    }
  };

  return (
    <div className={styles.game}>
      <h2 className={styles.title}>🏇 競馬</h2>
      <p className={styles.desc}>1着になる馬を予想しよう！</p>

      <div className={styles.trackArea}>
        {HORSES.map((horse, idx) => (
          <div key={idx} className={styles.trackLine}>
            <div className={styles.trackNum}>{idx + 1}</div>
            <div className={styles.trackBg}>
              <div 
                className={styles.horseWrap} 
                style={{ 
                  left: `${horsePositions[idx]}%`, 
                  transform: `translateX(-${horsePositions[idx]}%)` 
                }}
              >
                <div 
                  className={styles.horse}
                  style={{ 
                    backgroundColor: horse.color,
                    boxShadow: selectedHorse === idx ? `0 0 10px ${horse.color}` : 'none',
                    border: selectedHorse === idx ? '2px solid white' : 'none'
                  }}
                >
                  🐎
                </div>
                <span className={styles.horseNameLabel}>{horse.name}</span>
              </div>
            </div>
            <div className={styles.odds}>{horse.odds}x</div>
          </div>
        ))}
        {/* Goal line */}
        <div className={styles.goalLine} />
      </div>

      {result && (
        <div className={`${styles.result} ${result.payout > 0 ? styles.win : styles.lose}`}>
          {result.payout > 0 
            ? `🏆 WIN！ +¥${result.payout.toLocaleString()}` 
            : `💸 LOSE — ${HORSES[result.winner].name} が勝ちました`
          }
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.horseSelect}>
          <label>予想する馬:</label>
          <select 
            value={selectedHorse} 
            onChange={e => setSelectedHorse(Number(e.target.value))}
            disabled={loading || racing}
            className={styles.select}
          >
            {HORSES.map((h, i) => (
              <option key={i} value={i}>{i + 1}. {h.name} (オッズ {h.odds}倍)</option>
            ))}
          </select>
        </div>

        <div className={styles.chips}>
          {BET_PRESETS.map(v => (
            <button
              key={v}
              className={`${styles.chip} ${betAmount === v ? styles.chipActive : ''}`}
              onClick={() => setBetAmount(v)}
              disabled={loading || racing}
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
            disabled={loading || racing}
          />
        </div>
        
        <button 
          className={styles.playBtn} 
          onClick={play} 
          disabled={loading || racing}
        >
          {loading || racing ? <Loader size={18} className={styles.spin} /> : 'レース開始！'}
        </button>
        <p className={styles.balanceNote}>残高: ¥{(user?.finance_balance ?? 0).toLocaleString()}</p>
      </div>
    </div>
  );
}
