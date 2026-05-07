import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, Home, ShoppingCart, User, Store, LogIn } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const { user } = useAuthStore();
  const totalCount = useCartStore((s) => s.totalCount());
  const location = useLocation();
  const p = location.pathname;

  const navItems = user
    ? [
        { to: '/home', icon: <Home size={22} />, label: 'ホーム' },
        { to: '/orders', icon: <Package size={22} />, label: '注文' },
        { to: '/cart', icon: (
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <ShoppingCart size={22} />
              {totalCount > 0 && (
                <span className={styles.mobileBadge}>{totalCount}</span>
              )}
            </span>
          ), label: 'カート' },
        { to: '/account', icon: <User size={22} />, label: 'アカウント' },
        ...(user.role === 'seller' || user.role === 'both'
          ? [{ to: '/seller/dashboard', icon: <Store size={22} />, label: '出品' }]
          : []),
      ]
    : [
        { to: '/home', icon: <Home size={22} />, label: 'ホーム' },
        { to: '/', icon: <LogIn size={22} />, label: 'ログイン' },
      ];

  return (
    <>
      {/* Desktop footer */}
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

      {/* Mobile bottom nav */}
      <nav className={styles.mobileNav} aria-label="モバイルナビゲーション">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={[styles.mobileNavItem, p === item.to ? styles.mobileNavActive : ''].join(' ')}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};
