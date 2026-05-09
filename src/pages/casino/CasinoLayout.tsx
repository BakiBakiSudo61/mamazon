import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ArrowLeft, Coins, Home } from 'lucide-react';
import styles from './CasinoLayout.module.css';

export function CasinoLayout() {
  const { user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const originalTheme = metaTheme?.getAttribute('content');
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;

    metaTheme?.setAttribute('content', '#060010');
    document.documentElement.style.backgroundColor = '#060010';
    document.body.style.backgroundColor = '#060010';

    return () => {
      metaTheme?.setAttribute('content', originalTheme || '#131921');
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, []);

  const isLobby = location.pathname === '/finance/casino' || location.pathname === '/finance/casino/';
  const backLink = isLobby ? '/finance' : '/finance/casino';
  const backText = isLobby ? 'ロビーへ戻る' : 'カジノホーム';

  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />
      <div className={styles.starField} />

      <header className={styles.header}>
        <Link to={backLink} className={styles.backBtn}>
          {isLobby ? <ArrowLeft size={16} /> : <Home size={16} />}
          <span className={styles.backBtnText}>{backText}</span>
        </Link>
        <div className={styles.balanceChip}>
          <Coins size={14} />
          ¥{(user?.finance_balance ?? 0).toLocaleString()}
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
