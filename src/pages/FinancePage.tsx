import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import { ArrowRightLeft, Loader, ArrowDownCircle, ArrowUpCircle, Pickaxe } from 'lucide-react';
import styles from './FinancePage.module.css';

type Direction = 'deposit' | 'withdraw';

export function FinancePage() {
  const { user, fetchMe } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<Direction>('deposit');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [miningLoading, setMiningLoading] = useState(false);

  if (!user) return null;

  const finBal = user.finance_balance ?? 0;
  const shopBal = user.balance ?? 0;
  const amountNum = parseInt(amount) || 0;
  const maxAmount = direction === 'deposit' ? shopBal : finBal;

  const handleConvert = async () => {
    if (amountNum <= 0 || amountNum > maxAmount) return;
    setLoading(true);
    setMsg('');
    try {
      if (direction === 'deposit') {
        await api.post('/finance/deposit', { amount: amountNum });
        setMsg(`✅ ¥${amountNum.toLocaleString()} をファイナンスに入金しました`);
      } else {
        await api.post('/finance/convert', { amount: amountNum });
        setMsg(`✅ ¥${amountNum.toLocaleString()} をMamazon残高に出金しました`);
      }
      setAmount('');
      await fetchMe();
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      setMsg(`❌ ${err.message || 'エラーが発生しました'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMine = async () => {
    setMiningLoading(true);
    setMsg('');
    try {
      const res = await api.post<{ minedAmount: number }>('/finance/mine', {});
      setMsg(`⛏️ マイニング成功！ ¥${res.minedAmount.toLocaleString()} 獲得！`);
      await fetchMe();
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      setMsg(`❌ ${err.message || 'エラーが発生しました'}`);
    } finally {
      setMiningLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.inner}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>💰 Mamazon Finance</h1>
          <p className={styles.subtitle}>資産を増やして、最高のショッピング体験を</p>
        </div>

        {/* Balance cards */}
        <div className={styles.balanceGrid}>
          <div className={styles.balanceCard}>
            <div className={styles.balanceIcon}>🛒</div>
            <div>
              <div className={styles.balanceLabel}>Mamazon残高</div>
              <div className={styles.balanceAmount}>¥{shopBal.toLocaleString()}</div>
            </div>
          </div>
          <div className={`${styles.balanceCard} ${styles.financeBalanceCard}`}>
            <div className={styles.balanceIcon}>🎰</div>
            <div>
              <div className={styles.balanceLabel}>ファイナンス残高</div>
              <div className={styles.balanceAmount}>¥{finBal.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Convert section */}
        <div className={styles.convertCard}>
          <h2 className={styles.convertTitle}>
            <ArrowRightLeft size={18} /> 残高の変換
          </h2>
          <div className={styles.directionToggle}>
            <button
              className={`${styles.dirBtn} ${direction === 'deposit' ? styles.dirActive : ''}`}
              onClick={() => setDirection('deposit')}
            >
              <ArrowDownCircle size={15} /> Mamazon → ファイナンス
            </button>
            <button
              className={`${styles.dirBtn} ${direction === 'withdraw' ? styles.dirActive : ''}`}
              onClick={() => setDirection('withdraw')}
            >
              <ArrowUpCircle size={15} /> ファイナンス → Mamazon
            </button>
          </div>
          <div className={styles.convertInputRow}>
            <input
              type="number"
              min="1"
              placeholder="金額を入力"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className={styles.convertInput}
            />
            <button className={styles.maxBtn} onClick={() => setAmount(String(maxAmount))}>
              MAX
            </button>
            <button
              className={styles.convertBtn}
              onClick={handleConvert}
              disabled={loading || amountNum <= 0 || amountNum > maxAmount}
            >
              {loading ? <Loader size={16} /> : '変換'}
            </button>
          </div>
          {msg && (
            <div className={`${styles.msg} ${msg.startsWith('❌') ? styles.msgError : styles.msgSuccess}`}>
              {msg}
            </div>
          )}
        </div>

        {/* Mining */}
        <div className={styles.mineSection}>
          <button className={styles.mineBtn} onClick={handleMine} disabled={miningLoading}>
            {miningLoading ? <Loader size={18} /> : <Pickaxe size={18} />}
            マイニング（無料で¥100〜¥500獲得）
          </button>
        </div>

        {/* Navigation cards */}
        <div className={styles.navGrid}>
          <Link to="/finance/casino" className={styles.navCard}>
            <div className={styles.navCardBgPurple} />
            <div className={styles.navCardIcon}>🎰</div>
            <div className={styles.navCardTitle}>カジノ</div>
            <div className={styles.navCardDesc}>ハイ&ロー・スロットで一攫千金</div>
            <div className={styles.navCardArrow}>→</div>
          </Link>
          <Link to="/finance/market" className={styles.navCard}>
            <div className={styles.navCardBgGreen} />
            <div className={styles.navCardIcon}>📈</div>
            <div className={styles.navCardTitle}>マーケット</div>
            <div className={styles.navCardDesc}>株・仮想通貨でトレード</div>
            <div className={styles.navCardArrow}>→</div>
          </Link>
        </div>
      </div>
    </div>
  );
}


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
