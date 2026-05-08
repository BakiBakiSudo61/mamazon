import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { HighLow } from '../components/finance/HighLow';
import { Slots } from '../components/finance/Slots';
import { Market } from '../components/finance/Market';
import { api } from '../api/client';
import styles from './FinancePage.module.css';
import { Sparkles, ArrowRightLeft, Loader } from 'lucide-react';

export function FinancePage() {
  const { user, initialized, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'casino' | 'market'>('casino');
  const [convertAmount, setConvertAmount] = useState(0);
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState('');

  useEffect(() => {
    if (initialized && !user) {
      navigate('/login?redirect=/finance');
    }
  }, [user, initialized, navigate]);

  const handleConvert = async () => {
    if (convertAmount <= 0) return;
    setConverting(true);
    setConvertMsg('');
    try {
      await api.post<{ newBalance: number; newFinanceBalance: number }>('/finance/convert', { amount: convertAmount });
      setConvertMsg(`✅ ¥${convertAmount.toLocaleString()} をMamazon残高に変換しました！`);
      setConvertAmount(0);
      await fetchMe();
      setTimeout(() => setConvertMsg(''), 4000);
    } catch (err: any) {
      setConvertMsg(`❌ ${err.message || 'エラーが発生しました'}`);
    } finally {
      setConverting(false);
    }
  };

  if (!user) return null;

  const finBal = user.finance_balance ?? 0;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingBottom: '4rem' }}>
      <div className={styles.financeContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Mamazon Finance & Casino <Sparkles color="#FFD700" display="inline" /></h1>
          <p style={{ color: '#aaa', marginBottom: '1rem' }}>お金を増やして、最高のショッピング体験を手に入れよう！</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div className={styles.balanceBadge}>
              🎰 ファイナンス残高: ¥{finBal.toLocaleString()}
            </div>
            <div className={styles.balanceBadge} style={{ borderColor: 'rgba(99,102,241,0.5)' }}>
              🛒 Mamazon残高: ¥{(user.balance ?? 0).toLocaleString()}
            </div>
          </div>

          {/* Convert section */}
          <div className={styles.convertSection}>
            <h3 className={styles.convertTitle}><ArrowRightLeft size={18} style={{ display: 'inline', marginRight: '0.4rem' }} />ファイナンス残高 → Mamazon残高に変換</h3>
            <div className={styles.convertControls}>
              <input
                type="number"
                min="1"
                max={finBal}
                placeholder="変換する金額"
                value={convertAmount || ''}
                onChange={e => setConvertAmount(Number(e.target.value))}
                className={styles.tradeInput}
                style={{ width: '180px', fontSize: '1rem', padding: '0.5rem 0.75rem' }}
              />
              <button
                className={`${styles.actionBtn} ${styles.high}`}
                style={{ padding: '0.5rem 1.5rem', fontSize: '0.95rem' }}
                onClick={handleConvert}
                disabled={converting || convertAmount <= 0 || convertAmount > finBal}
              >
                {converting ? <Loader size={16} /> : '変換する'}
              </button>
              <button
                className={`${styles.actionBtn} ${styles.low}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                onClick={() => setConvertAmount(finBal)}
                disabled={finBal <= 0}
              >
                全額
              </button>
            </div>
            {convertMsg && (
              <p style={{ color: convertMsg.startsWith('✅') ? '#10b981' : '#ef4444', marginTop: '0.5rem', fontWeight: 'bold' }}>
                {convertMsg}
              </p>
            )}
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
