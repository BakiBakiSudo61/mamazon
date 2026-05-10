import { useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Loader } from 'lucide-react';
import styles from './HighLow.module.css';

const CARD_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const SUITS = ['♠', '♣', '♥', '♦'];

function getLabel(n: number) { return CARD_LABELS[n] ?? String(n); }
function getSuit(n: number) { return SUITS[(n - 1) % 4]; }
function isRed(suit: string) { return suit === '♥' || suit === '♦'; }

function calcOdds(card: number, dir: 'high' | 'low'): number {
  const p = dir === 'high' ? (13 - card) / 13 : (card - 1) / 13;
  if (p <= 0) return 0;
  return Math.round(Math.max(1.05, 0.90 / p) * 100) / 100;
}

const BET_PRESETS = [100, 500, 1000, 5000];

export function HighLow() {
  const { user, fetchMe } = useAuthStore();
  const [inputVal, setInputVal] = useState('100');
  const betAmount = Math.max(1, parseInt(inputVal) || 0);
  const [currentCard, setCurrentCard] = useState(7);
  const [currentSuit, setCurrentSuit] = useState('♠');
  const [result, setResult] = useState<'win' | 'draw' | 'lose' | null>(null);
  const [payout, setPayout] = useState(0);
  const [loading, setLoading] = useState(false);
  const [flipping, setFlipping] = useState(false);

  const play = async (guess: 'high' | 'low') => {
    const bal = user?.finance_balance ?? 0;
    if (betAmount <= 0 || betAmount > bal || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<{ newCard: number; result: string; payout: number }>(
        '/finance/gamble/highlow', { amount: betAmount, guess, currentCard }
      );
      // Start flip animation after API responds
      setFlipping(true);
      setTimeout(() => {
        setCurrentCard(res.newCard);
        setCurrentSuit(getSuit(res.newCard));
        setResult(res.result as 'win' | 'draw' | 'lose');
        setPayout(res.payout);
      }, 320);
      setTimeout(() => {
        setFlipping(false);
        setLoading(false);
        fetchMe();
      }, 750);
    } catch {
      setLoading(false);
    }
  };

  const suit = currentSuit;
  const red = isRed(suit);
  const highOdds = calcOdds(currentCard, 'high');
  const lowOdds  = calcOdds(currentCard, 'low');

  return (
    <div className={styles.game}>
      <h2 className={styles.title}>🃏 ハイ & ロー</h2>
      <p className={styles.desc}>次のカードが今より<strong>高い</strong>か<strong>低い</strong>か予想しよう</p>

      {/* Playing card */}
      <div className={styles.cardArea}>
        <div className={`${styles.card} ${red ? styles.red : styles.black} ${flipping ? styles.flipping : ''}`}>
          <div className={styles.cornerTL}>
            <span>{getLabel(currentCard)}</span>
            <span>{suit}</span>
          </div>
          <div className={styles.centerSuit}>{suit}</div>
          <div className={styles.cornerBR}>
            <span>{getLabel(currentCard)}</span>
            <span>{suit}</span>
          </div>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`${styles.result} ${styles[result]}`}>
          {result === 'win' && `🏆 WIN！ +¥${(payout - betAmount).toLocaleString()} (返却合計 ¥${payout.toLocaleString()})`}
          {result === 'draw' && '🤝 DRAW — 賭け金返還'}
          {result === 'lose' && `💸 LOSE — ¥${betAmount.toLocaleString()} 没収`}
        </div>
      )}

      {/* Chip buttons */}
      <div className={styles.chips}>
        {BET_PRESETS.map(v => (
          <button
            key={v}
            className={`${styles.chip} ${betAmount === v ? styles.chipActive : ''}`}
            onClick={() => setInputVal(String(v))}
          >
            ¥{v.toLocaleString()}
          </button>
        ))}
        <input
          type="text"
          inputMode="numeric"
          value={inputVal}
          onChange={e => setInputVal(e.target.value.replace(/[^0-9]/g, ''))}
          onFocus={e => e.target.select()}
          onBlur={() => setInputVal(String(Math.max(1, parseInt(inputVal) || 1)))}
          className={styles.betInput}
        />
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.high}`} onClick={() => play('high')} disabled={loading || highOdds === 0}>
          {loading ? <Loader size={18} className={styles.spin} /> : <>▲ HIGH<br /><span style={{ fontSize: '0.75em', opacity: 0.85 }}>{highOdds > 0 ? `×${highOdds.toFixed(2)}` : '—'}</span></>}
        </button>
        <button className={`${styles.btn} ${styles.low}`} onClick={() => play('low')} disabled={loading || lowOdds === 0}>
          {loading ? <Loader size={18} className={styles.spin} /> : <>▼ LOW<br /><span style={{ fontSize: '0.75em', opacity: 0.85 }}>{lowOdds > 0 ? `×${lowOdds.toFixed(2)}` : '—'}</span></>}
        </button>
      </div>

      <p className={styles.balanceNote}>残高: ¥{(user?.finance_balance ?? 0).toLocaleString()}</p>
    </div>
  );
}