import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { HighLow } from '../components/finance/HighLow';
import { Slots } from '../components/finance/Slots';
import { Market } from '../components/finance/Market';
import styles from './FinancePage.module.css';
import { Sparkles } from 'lucide-react';

export function FinancePage() {
  const { user, initialized } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'casino' | 'market'>('casino');

  useEffect(() => {
    if (initialized && !user) {
      navigate('/login?redirect=/finance');
    }
  }, [user, initialized, navigate]);

  if (!user) return null;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingBottom: '4rem' }}>
      <div className={styles.financeContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Mamazon Finance & Casino <Sparkles color="#FFD700" display="inline" /></h1>
          <p style={{ color: '#aaa', marginBottom: '1rem' }}>お金を増やして、最高のショッピング体験を手に入れよう！</p>
          <div className={styles.balanceBadge}>
            現在の所持金: ¥{user.balance?.toLocaleString()}
          </div>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'casino' ? styles.active : ''}`}
            onClick={() => setActiveTab('casino')}
          >
            🎰 カジノ
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'market' ? styles.active : ''}`}
            onClick={() => setActiveTab('market')}
          >
            📈 マーケット (株・仮想通貨)
          </button>
        </div>

        {activeTab === 'casino' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <HighLow />
            <Slots />
          </div>
        )}

        {activeTab === 'market' && (
          <div className={styles.glassCard}>
            <Market />
          </div>
        )}
      </div>
    </div>
  );
}
