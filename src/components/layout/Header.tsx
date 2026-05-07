import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, Package, Store, Menu, X, LogOut, ChevronDown, Zap } from 'lucide-react';
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
      {/* Main Header */}
      <div className={styles.inner}>
        <div className={styles.leftSection}>
          <button className={styles.mobileMenu} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link to="/home" className={styles.logo}>
            <Zap size={28} className={styles.logoIcon} />
            <span className={styles.logoText}>Mamazon</span>
          </Link>
        </div>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <div className={styles.searchContainer}>
            <select className={styles.searchCategory}>
              <option value="all">すべて</option>
              <option value="electronics">電子機器</option>
              <option value="clothing">衣類</option>
            </select>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="商品を検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className={styles.searchBtn}>
              <Search size={18} />
            </button>
          </div>
        </form>

        <nav className={styles.nav}>
          {user ? (
            <>
              <div className={styles.userMenu}>
                <button className={styles.userBtn} onClick={() => setMenuOpen(!menuOpen)}>
                  <div className={styles.userInfo}>
                    <span className={styles.greeting}>こんにちは, {user.display_name}さん</span>
                    <span className={styles.accountText}>アカウント＆リスト <ChevronDown size={12}/></span>
                  </div>
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
              <Link to="/orders" className={styles.returnsBtn}>
                <span className={styles.greeting}>返品もこちら</span>
                <span className={styles.accountText}>注文履歴</span>
              </Link>
              <Link to="/cart" className={styles.cartBtn}>
                <div className={styles.cartIconWrapper}>
                  <ShoppingCart size={28} />
                  {totalCount > 0 && <span className={styles.cartBadge}>{totalCount}</span>}
                </div>
                <span className={styles.cartText}>カート</span>
              </Link>
            </>
          ) : (
            <Link to="/" className={styles.loginBtn}>
              <span className={styles.loginBtnText}>ログイン / 登録</span>
              <div className={styles.loginGlow}></div>
            </Link>
          )}
        </nav>
      </div>

      {/* Sub Header */}
      <div className={styles.subHeader}>
        <div className={styles.subInner}>
          <button className={styles.allBtn}>
            <Menu size={16} /> すべて
          </button>
          <div className={styles.subLinks}>
            <Link to="/home" className={styles.subLink}>タイムセール</Link>
            <Link to="/home" className={styles.subLink}>ヘルプ</Link>
            <Link to="/home" className={styles.subLink}>Mamazonベーシック</Link>
            <Link to="/home" className={styles.subLink}>ギフト券</Link>
            <Link to="/home" className={styles.subLink}>閲覧履歴</Link>
          </div>
          <div className={styles.subRight}>
            <span className={styles.primeLink}>プレミアムを始める</span>
          </div>
        </div>
      </div>
    </header>
  );
};
