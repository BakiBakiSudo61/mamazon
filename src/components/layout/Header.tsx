import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, Package, Store, Menu, X, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const totalCount = useCartStore((s) => s.totalCount());
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link to="/home" className={styles.logo}>
          <Package size={24} />
          <span>Mamazon</span>
        </Link>

        {/* Search */}
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="商品を検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className={styles.searchBtn}>検索</button>
        </form>

        {/* Nav */}
        <nav className={styles.nav}>
          {user ? (
            <>
              <Link to="/cart" className={styles.cartBtn}>
                <ShoppingCart size={20} />
                {totalCount > 0 && (
                  <span className={styles.cartBadge}>{totalCount}</span>
                )}
              </Link>
              <div className={styles.userMenu}>
                <button className={styles.userBtn} onClick={() => setMenuOpen(!menuOpen)}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} className={styles.avatar} />
                  ) : (
                    <User size={20} />
                  )}
                  <span className={styles.userName}>{user.display_name}</span>
                </button>
                {menuOpen && (
                  <div className={styles.dropdown} onClick={() => setMenuOpen(false)}>
                    <Link to="/orders" className={styles.dropdownItem}>
                      <Package size={15} /> 注文履歴
                    </Link>
                    <Link to="/account" className={styles.dropdownItem}>
                      <User size={15} /> アカウント
                    </Link>
                    {(user.role === 'seller' || user.role === 'both') && (
                      <Link to="/seller/dashboard" className={styles.dropdownItem}>
                        <Store size={15} /> 出品者ダッシュボード
                      </Link>
                    )}
                    <hr className={styles.divider} />
                    <button className={styles.dropdownItem} onClick={handleLogout}>
                      <LogOut size={15} /> ログアウト
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/" className={styles.loginBtn}>ログイン</Link>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className={styles.mobileMenu}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="メニュー"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
};
