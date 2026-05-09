import { useEffect } from 'react';
import { Market } from '../components/finance/Market';
import styles from './MarketPage.module.css';

export function MarketPage() {
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
      <div className={styles.inner}>
        <Market />
      </div>
    </div>
  );
}