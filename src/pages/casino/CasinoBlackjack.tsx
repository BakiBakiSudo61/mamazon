import { useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import styles from './CasinoGames.module.css';

const CARD_NAMES: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const SUITS = ['♠', '♥', '♦', '♣'];
const cardLabel = (n: number) => CARD_NAMES[n] || String(n);
const cardSuit = (n: number, i: number) => SUITS[(n + i) % 4];
const cardVal = (n: number) => n > 10 ? 10 : n;

export function CasinoBlackjack() {
  const refreshBalance = useAuthStore((s) => s.fetchMe);
  const [amount, setAmount] = useState(1000);
  const [hand, setHand] = useState<number[]>([]);
  const [dealerHand, setDealerHand] = useState<number[]>([]);
  const [dealerFull, setDealerFull] = useState<number[]>([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: string; payout: number } | null>(null);

  const start = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<any>('/finance/gamble/blackjack', { action: 'start', amount });
      setHand(res.hand);
      setDealerHand(res.dealerHand);
      setDealerFull(res.dealerFull || res.dealerHand);
      setPlayerTotal(res.playerTotal);
      if (res.done) {
        setResult({ type: res.result, payout: res.payout });
        setDealerHand(res.dealerHand);
        refreshBalance();
      } else {
        setPlaying(true);
      }
    } catch { }
    setLoading(false);
  };

  const hit = async () => {
    setLoading(true);
    try {
      const res = await api.post<any>('/finance/gamble/blackjack', { action: 'hit', amount, hand, dealerHand: dealerFull });
      setHand(res.hand);
      setPlayerTotal(res.playerTotal);
      if (res.done) {
        setResult({ type: res.result, payout: res.payout });
        if (res.dealerHand) setDealerHand(res.dealerHand);
        setPlaying(false);
        refreshBalance();
      }
    } catch { }
    setLoading(false);
  };

  const stand = async () => {
    setLoading(true);
    try {
      const res = await api.post<any>('/finance/gamble/blackjack', { action: 'stand', amount, hand, dealerHand: dealerFull });
      setDealerHand(res.dealerHand);
      setPlayerTotal(res.playerTotal);
      setResult({ type: res.result, payout: res.payout });
      setPlaying(false);
      refreshBalance();
    } catch { }
    setLoading(false);
  };

  const reset = () => {
    setHand([]); setDealerHand([]); setDealerFull([]);
    setPlayerTotal(0); setPlaying(false); setResult(null);
  };

  const renderCard = (n: number, i: number) => {
    if (n === 0) return <div key={i} className={`${styles.card} ${styles.cardBack}`}>🂠</div>;
    const suit = cardSuit(n, i);
    const isRed = suit === '♥' || suit === '♦';
    return (
      <div key={i} className={`${styles.card} ${isRed ? styles.cardRed : ''}`}>
        <span className={styles.cardRank}>{cardLabel(n)}</span>
        <span className={styles.cardSuit}>{suit}</span>
      </div>
    );
  };

  const handSum = (cards: number[]) => {
    let s = cards.filter(c => c > 0).reduce((a, c) => a + cardVal(c), 0);
    if (cards.includes(1) && s + 10 <= 21) s += 10;
    return s;
  };

  return (
    <div className={styles.gamePage}>
      <h2 className={styles.gameTitle}>♠️ ブラックジャック</h2>

      <div className={styles.bjTable}>
        {/* Dealer */}
        <div className={styles.bjSection}>
          <h3>ディーラー {dealerHand.length > 0 && !playing && result ? `(${handSum(dealerHand)})` : ''}</h3>
          <div className={styles.bjCards}>
            {dealerHand.map((c, i) => renderCard(c, i))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`${styles.resultBanner} ${result.type === 'win' || result.type === 'blackjack' ? styles.resultWin : result.type === 'push' ? styles.resultPush : styles.resultLose}`}>
            {result.type === 'blackjack' ? `🃏 BLACKJACK! +${result.payout.toLocaleString()}` :
             result.type === 'win' ? `🎉 WIN! +${result.payout.toLocaleString()}` :
             result.type === 'push' ? `🤝 PUSH (引き分け)` :
             result.type === 'bust' ? `💥 BUST!` : `😢 LOSE`}
          </div>
        )}

        {/* Player */}
        <div className={styles.bjSection}>
          <h3>あなた {hand.length > 0 ? `(${playerTotal})` : ''}</h3>
          <div className={styles.bjCards}>
            {hand.map((c, i) => renderCard(c, i))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.betSection}>
        {!playing && !result && (
          <>
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
            <button className={styles.spinBtn} onClick={start} disabled={loading}>DEAL</button>
          </>
        )}

        {playing && (
          <div className={styles.bjActions}>
            <button className={styles.hitBtn} onClick={hit} disabled={loading}>HIT</button>
            <button className={styles.standBtn} onClick={stand} disabled={loading}>STAND</button>
          </div>
        )}

        {result && (
          <button className={styles.spinBtn} onClick={reset}>もう一度プレイ</button>
        )}
      </div>
    </div>
  );
}
