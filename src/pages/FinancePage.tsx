import { useState, useEffect } from 'react';
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
  const [miningPhase, setMiningPhase] = useState('');
  const [miningProgress, setMiningProgress] = useState(0);
  const [mineHash, setMineHash] = useState('');

  useEffect(() => {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const originalTheme = metaTheme?.getAttribute('content');
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;

    metaTheme?.setAttribute('content', '#09090f');
    document.documentElement.style.backgroundColor = '#09090f';
    document.body.style.backgroundColor = '#09090f';

    return () => {
      metaTheme?.setAttribute('content', originalTheme || '#131921');
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, []);

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
    setMiningProgress(0);
    setMsg('');

    const PHASES = ['⛏️ ハッシュを計算中...', '🔍 ブロックを解析中...', '💻 フルノードに接続中...', '💪 最終検証中...'];
    let phaseIdx = 0;
    setMiningPhase(PHASES[0]);

    const phaseTimer = setInterval(() => {
      phaseIdx = Math.min(phaseIdx + 1, PHASES.length - 1);
      setMiningPhase(PHASES[phaseIdx]);
    }, 750);

    const hashTimer = setInterval(() => {
      setMineHash(Math.random().toString(16).slice(2, 18).toUpperCase());
    }, 120);

    let prog = 0;
    const progTimer = setInterval(() => {
      prog = Math.min(prog + 100 / (3000 / 60), 94);
      setMiningProgress(prog);
    }, 60);

    const minDelay = new Promise<void>(r => setTimeout(r, 3000));

    try {
      const [res] = await Promise.all([
        api.post<{ minedAmount: number }>('/finance/mine', {}),
        minDelay,
      ]);
      clearInterval(phaseTimer);
      clearInterval(hashTimer);
      clearInterval(progTimer);
      setMiningProgress(100);
      setMineHash('');
      setMiningPhase('✨ 成功！');
      await fetchMe();
      setTimeout(() => {
        setMiningLoading(false);
        setMiningPhase('');
        setMiningProgress(0);
        setMsg(`⛏️ マイニング成功！ ¥${res.minedAmount.toLocaleString()} 獲得！`);
        setTimeout(() => setMsg(''), 4000);
      }, 600);
    } catch (err: unknown) {
      clearInterval(phaseTimer);
      clearInterval(hashTimer);
      clearInterval(progTimer);
      setMiningLoading(false);
      setMiningPhase('');
      setMiningProgress(0);
      setMsg(`❌ ${err instanceof Error ? err.message : 'エラーが発生しました'}`);
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
          {miningLoading ? (
            <div className={styles.mineProgress}>
              <div className={styles.minePhaseText}>{miningPhase}</div>
              <div className={styles.mineProgressBar}>
                <div
                  className={styles.mineProgressFill}
                  style={{ width: `${miningProgress}%` }}
                />
              </div>
              {mineHash && (
                <div className={styles.mineHash}>{mineHash}</div>
              )}
            </div>
          ) : (
            <button className={styles.mineBtn} onClick={handleMine}>
              <Pickaxe size={18} />
              マイニング（無料で¥100〜¥500獲得）
            </button>
          )}
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
