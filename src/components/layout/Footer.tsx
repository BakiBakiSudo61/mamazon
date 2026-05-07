import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import styles from './Footer.module.css';

export const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <div className={styles.inner}>
      <div className={styles.brand}>
        <Package size={20} />
        <span>Mamazon</span>
      </div>
      <nav className={styles.links}>
        <Link to="/home">ホーム</Link>
        <Link to="/orders">注文履歴</Link>
        <Link to="/account">アカウント</Link>
        <Link to="/seller/register">出品者登録</Link>
      </nav>
      <p className={styles.copy}>&copy; 2026 Mamazon. 架空のECサイトです。</p>
    </div>
  </footer>
);
