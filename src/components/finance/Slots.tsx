import { useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import styles from '../../pages/FinancePage.module.css';
import { Loader, Dices } from 'lucide-react';

export function Slots() {
  const { user, fetchMe } = useAuthStore();
  const [betAmount, setBetAmount] = useState(100);
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [message, setMessage] = useState('スピンを押して運試し！ (最大50倍)');

  const spin = async () => {
    if (betAmount <= 0 || betAmount > (user?.balance || 0)) {
      setMessage('無効なベット額です。残高を確認してください。');
      return;
    }
    
    setIsSpinning(true);
    setMessage('Spinning...');

    try {
      const res = await api.post<{ reels: string[], multiplier: number, payout: number }>('/finance/gamble/slots', {
        amount: betAmount
      });

      // Simulate spin duration
      setTimeout(async () => {
        setReels(res.reels);
        setIsSpinning(false);
        
        if (res.multiplier > 0) {
          setMessage(`🎰 ジャックポット！ ${res.multiplier}倍！ ${res.payout}円獲得！`);
        } else {
          setMessage('😭 ハズレ...');
        }
        
        await fetchMe();
      }, 1500);

    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました');
      setIsSpinning(false);
    }
  };

  return (
    <div className={styles.glassCard}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Dices /> Mamazonスロット
      </h3>
      <p style={{ color: '#ccc', marginBottom: '1rem' }}>
        3つ揃えば大当たり！<br/>
        7️⃣=50倍, 💎=20倍, 他=10倍, 2つ=2倍
      </p>

      <div className={styles.slotsMachine}>
        <div className={styles.reels}>
          <div className={`${styles.reel} ${isSpinning ? styles.spinning : ''}`}>
            {isSpinning ? '🎰' : reels[0]}
          </div>
          <div className={`${styles.reel} ${isSpinning ? styles.spinning : ''}`} style={{ animationDelay: '0.1s' }}>
            {isSpinning ? '🎰' : reels[1]}
          </div>
          <div className={`${styles.reel} ${isSpinning ? styles.spinning : ''}`} style={{ animationDelay: '0.2s' }}>
            {isSpinning ? '🎰' : reels[2]}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
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

      <p style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', height: '1.5rem', marginBottom: '1rem' }}>
        {message}
      </p>

      <button 
        className={`${styles.actionBtn} ${styles.spin}`} 
        onClick={spin}
        disabled={isSpinning}
      >
        {isSpinning ? <Loader className="animate-spin mx-auto" /> : 'SPIN!'}
      </button>
    </div>
  );
}
