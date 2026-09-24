import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Search, User, Package, Store, Menu, X, LogOut, ChevronDown, ChevronRight, ArrowLeft, Coins, Heart, ListPlus, Crown, MapPin } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import styles from './Header.module.css';

const SUB_NAV = ['電子機器', '衣類', '本', 'スポーツ', 'おもちゃ', 'インテリア', '食品'];

/* Amazon-style smile arrow under the logo */
const Smile: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 16" aria-hidden="true">
    <path d="M4 3 Q50 20 92 4" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M84 1 L94 3.5 L90 12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const totalCount = useCartStore((s) => s.totalCount());
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === '/' || location.pathname === '/home';
  const canGoBack = !isHome;
  const isFinance = location.pathname.startsWith('/finance');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const renderMenu = () => (
    <div className={styles.dropdown} onClick={() => setMenuOpen(false)}>
      {user && <div className={styles.dropdownHeader}>こんにちは、{user.display_name}さん</div>}
      <Link to="/orders" className={styles.dropdownItem}>
        <Package size={16} /> 注文履歴
      </Link>
      <Link to="/finance" className={styles.dropdownItem}>
        <Coins size={16} /> ファイナンス・カジノ
      </Link>
      <Link to="/account" className={styles.dropdownItem}>
        <User size={16} /> アカウント
      </Link>
      <Link to="/collection" className={styles.dropdownItem}>
        <Crown size={16} /> コレクション
      </Link>
      <Link to="/favorites" className={styles.dropdownItem}>
        <Heart size={16} /> お気に入り
      </Link>
      <Link to="/wishlist" className={styles.dropdownItem}>
        <ListPlus size={16} /> 欲しいものリスト
      </Link>
      {user && (user.role === 'seller' || user.role === 'both') && (
        <Link to="/seller/dashboard" className={styles.dropdownItem}>
          <Store size={16} /> 出品者ダッシュボード
        </Link>
      )}
      <hr className={styles.divider} />
      <button className={styles.dropdownItem} onClick={handleLogout}>
        <LogOut size={16} /> ログアウト
      </button>
    </div>
  );

  if (isFinance) {
    return (
      <header className={styles.headerFinance}>
        <button onClick={() => navigate(-1)} className={styles.financeBackBtn}>
          <ArrowLeft size={18} />
          <span>戻る</span>
        </button>
      </header>
    );
  }

  return (
    <header className={styles.header}>
      {/* Desktop / Tablet header */}
      <div className={styles.inner}>
        <div className={styles.leftSection}>
          {canGoBack && (
            <button
              className={styles.backBtn}
              onClick={() => navigate(-1)}
              aria-label="前のページに戻る"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <button className={styles.mobileMenu} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link to="/home" className={styles.logo} aria-label="Mamazon ホーム">
            <span className={styles.logoText}>mamazon</span>
            <Smile className={styles.logoSmile} />
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
              <Search size={20} color="#333" />
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
                {menuOpen && renderMenu()}
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
              <span className={styles.loginBtnText}>ログイン</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Desktop sub navigation */}
      <nav className={styles.subNav} aria-label="カテゴリ">
        <Link to="/search" className={styles.subNavAll}><Menu size={18} /> すべて</Link>
        {SUB_NAV.map((c) => (
          <Link key={c} to={`/search?c=${encodeURIComponent(c)}`} className={styles.subNavLink}>{c}</Link>
        ))}
        {user && <Link to="/finance" className={styles.subNavLink}>ファイナンス</Link>}
        {user && <Link to="/wishlist" className={styles.subNavLink}>欲しいものリスト</Link>}
      </nav>

      {/* Mobile app-style header (≤640px) */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileBrand}>
          <div className={styles.mobileBrandLeft}>
            {canGoBack && (
              <button
                className={styles.mobileNavBtn}
                onClick={() => navigate(-1)}
                aria-label="前のページに戻る"
              >
                <ArrowLeft size={22} />
              </button>
            )}
            <Link to="/home" className={styles.mobileLogo} aria-label="Mamazon ホーム">
              <span>mamazon</span>
              <Smile className={styles.logoSmile} />
            </Link>
          </div>
          <div className={styles.mobileBrandRight}>
            {user ? (
              <div className={styles.mobileUserMenu}>
                <button
                  className={styles.mobileNavBtn}
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="メニュー"
                  aria-expanded={menuOpen}
                >
                  <span className={styles.mobileUserName}>{user.display_name}</span>
                  <User size={22} />
                </button>
                {menuOpen && renderMenu()}
              </div>
            ) : (
              <Link to="/" className={styles.mobileLoginBtn}>
                ログイン <ChevronRight size={14} />
              </Link>
            )}
            <Link to="/cart" className={styles.mobileCartLink} aria-label="カート">
              <div className={styles.cartIconWrapper}>
                <ShoppingCart size={24} />
                {totalCount > 0 && <span className={styles.cartBadge}>{totalCount}</span>}
              </div>
            </Link>
          </div>
        </div>

        <form className={styles.mobileSearchForm} onSubmit={handleSearch} role="search">
          <div className={styles.mobileSearchContainer}>
            <button type="submit" className={styles.mobileSearchBtn} aria-label="検索">
              <Search size={20} />
            </button>
            <input
              className={styles.mobileSearchInput}
              type="search"
              enterKeyHint="search"
              placeholder="Mamazon で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </form>

        <Link to={user ? '/account' : '/'} className={styles.deliverBar}>
          <MapPin size={16} />
          <span className={styles.deliverText}>
            {user ? `お届け先: ${user.display_name}さん - 東京都 架空区` : 'お届け先を選択'}
          </span>
          <ChevronDown size={14} />
        </Link>
      </div>

      {menuOpen && (
        <button className={styles.backdrop} aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} />
      )}
    </header>
  );
};
