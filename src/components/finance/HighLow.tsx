import { useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import styles from '../../pages/FinancePage.module.css';
import { Coins, Loader } from 'lucide-react';

export function HighLow() {
  const { user, fetchMe } = useAuthStore();
  const [betAmount, setBetAmount] = useState(100);
  const [currentCard, setCurrentCard] = useState(7);
  const [message, setMessage] = useState('次のカードはこれより高い？低い？');
  const [loading, setLoading] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  const play = async (guess: 'high' | 'low') => {
    if (betAmount <= 0 || betAmount > (user?.balance || 0)) {
      setMessage('無効なベット額です。残高を確認してください。');
      return;
    }
    setLoading(true);
    setIsFlipping(true);

    try {
      const res = await api.post<{ newCard: number, result: string, payout: number }>('/finance/gamble/highlow', {
        amount: betAmount,
        guess,
        currentCard
      });

      // Quick visual delay for flip animation
      setTimeout(async () => {
        setCurrentCard(res.newCard);
        if (res.result === 'win') {
          setMessage(`🎉 おめでとう！ ${res.payout}円 獲得しました！`);
        } else if (res.result === 'draw') {
          setMessage('引き分け！ ベット額が返還されました。');
        } else {
          setMessage('😭 残念... ハズレです。');
        }
        await fetchMe(); // Refresh balance
        setIsFlipping(false);
        setLoading(false);
      }, 500);

    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました');
      setIsFlipping(false);
      setLoading(false);
    }
  };

  return (
    <div className={styles.glassCard}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Coins /> ハイアンドロー
      </h3>
      <p style={{ color: '#ccc', marginBottom: '1rem' }}>ベット額を決めて、次のカードの数字（1〜13）を当てよう！当たれば2倍！</p>
      
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <input 
          type="number" 
          value={betAmount} 
          onChange={e => setBetAmount(Number(e.target.value))}
          className={styles.tradeInput}
          style={{ width: '150px', fontSize: '1.2rem', padding: '0.5rem 1rem' }}
          min="1"
        />
        <span style={{ marginLeft: '0.5rem' }}>円を賭ける</span>
      </div>

      <div className={`${styles.cardDisplay} ${isFlipping ? styles.flip : ''}`}>
        {isFlipping ? '?' : currentCard}
      </div>

      <p style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', height: '1.5rem' }}>{message}</p>

      <div className={styles.controls}>
        <button 
          className={`${styles.actionBtn} ${styles.high}`} 
          onClick={() => play('high')}
          disabled={loading}
        >
          {loading ? <Loader className="animate-spin" /> : 'HIGH (高い)'}
        </button>
        <button 
          className={`${styles.actionBtn} ${styles.low}`} 
          onClick={() => play('low')}
          disabled={loading}
        >
          {loading ? <Loader className="animate-spin" /> : 'LOW (低い)'}
        </button>
      </div>
    </div>
  );
}
