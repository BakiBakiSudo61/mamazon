import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Coins } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Market } from '../components/finance/Market';
import styles from './MarketPage.module.css';

export function MarketPage() {
  const { user } = useAuthStore();

  useEffect(() => {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const originalTheme = metaTheme?.getAttribute('content');
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;

    metaTheme?.setAttribute('content', '#0a1628');
    document.documentElement.style.backgroundColor = '#0a1628';
    document.body.style.backgroundColor = '#0a1628';

    return () => {
      metaTheme?.setAttribute('content', originalTheme || '#131921');
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/finance" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span className={styles.backBtnText}>ファイナンスに戻る</span>
        </Link>
        <div className={styles.balanceChip}>
          <Coins size={14} />
          ¥{(user?.finance_balance ?? 0).toLocaleString()}
        </div>
      </header>
      <div className={styles.inner}>
        <Market />
      </div>
    </div>
  );
}