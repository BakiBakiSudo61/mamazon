import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useCartStore } from './stores/cartStore';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Toasts } from './components/ui/Toasts';
import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderComplete } from './pages/OrderComplete';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { Account } from './pages/Account';
import { Store } from './pages/Store';
import { SellerRegister } from './pages/seller/SellerRegister';
import { Dashboard } from './pages/seller/Dashboard';
import { ProductForm } from './pages/seller/ProductForm';
import { FinancePage } from './pages/FinancePage';
import { CasinoLayout } from './pages/casino/CasinoLayout';
import { CasinoLobby } from './pages/casino/CasinoLobby';
import { CasinoHighLow } from './pages/casino/CasinoHighLow';
import { CasinoSlots } from './pages/casino/CasinoSlots';
import { CasinoHorseRacing } from './pages/casino/CasinoHorseRacing';
import { CasinoRoulette } from './pages/casino/CasinoRoulette';
import { CasinoBlackjack } from './pages/casino/CasinoBlackjack';
import { CasinoLottery } from './pages/casino/CasinoLottery';
import { MarketPage } from './pages/MarketPage';
import { Wishlist } from './pages/Wishlist';
import { Favorites } from './pages/Favorites';
import { Collection } from './pages/Collection';
import { AdminPage } from './pages/admin/AdminPage';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initialized } = useAuthStore();
  const location = useLocation();
  if (!initialized) return <div className="page-loading">読み込み中...</div>;
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;
  return <>{children}</>;
};

const RequireSeller: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <div className="page-loading">読み込み中...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'seller' && user.role !== 'both') return <Navigate to="/seller/register" replace />;
  return <>{children}</>;
};

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <div className="page-loading">読み込み中...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin') return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-layout">
    <Header />
    <main className="app-main">{children}</main>
    <Footer />
  </div>
);

const AppRoutes: React.FC = () => {
  const { fetchMe } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { user } = useAuthStore();

  useEffect(() => { fetchMe(); }, [fetchMe]);
  useEffect(() => { if (user) fetchCart(); }, [user, fetchCart]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Layout><Home /></Layout>} />
      <Route path="/search" element={<Layout><Search /></Layout>} />
      <Route path="/product/:id" element={<Layout><ProductDetail /></Layout>} />
      <Route path="/store/:id" element={<Layout><Store /></Layout>} />
      <Route path="/wishlist" element={<Layout><Wishlist /></Layout>} />
      <Route path="/favorites" element={<Layout><Favorites /></Layout>} />
      <Route path="/collection" element={<Layout><RequireAuth><Collection /></RequireAuth></Layout>} />
      <Route path="/cart" element={<Layout><RequireAuth><Cart /></RequireAuth></Layout>} />
      <Route path="/checkout/*" element={<Layout><RequireAuth><Checkout /></RequireAuth></Layout>} />
      <Route path="/checkout/complete" element={<Layout><RequireAuth><OrderComplete /></RequireAuth></Layout>} />
      <Route path="/orders" element={<Layout><RequireAuth><Orders /></RequireAuth></Layout>} />
      <Route path="/orders/:id" element={<Layout><RequireAuth><OrderDetail /></RequireAuth></Layout>} />
      <Route path="/account" element={<Layout><RequireAuth><Account /></RequireAuth></Layout>} />
      <Route path="/finance" element={<RequireAuth><FinancePage /></RequireAuth>} />
      
      {/* Casino Nested Routes */}
      <Route path="/finance/casino" element={<RequireAuth><CasinoLayout /></RequireAuth>}>
        <Route index element={<CasinoLobby />} />
        <Route path="highlow" element={<CasinoHighLow />} />
        <Route path="slots" element={<CasinoSlots />} />
        <Route path="horseracing" element={<CasinoHorseRacing />} />
        <Route path="roulette" element={<CasinoRoulette />} />
        <Route path="blackjack" element={<CasinoBlackjack />} />
        <Route path="lottery" element={<CasinoLottery />} />
      </Route>

      <Route path="/finance/market" element={<RequireAuth><MarketPage /></RequireAuth>} />
      <Route path="/seller/register" element={<Layout><RequireAuth><SellerRegister /></RequireAuth></Layout>} />
      <Route path="/seller/dashboard" element={<Layout><RequireSeller><Dashboard /></RequireSeller></Layout>} />
      <Route path="/seller/product/new" element={<Layout><RequireSeller><ProductForm mode="new" /></RequireSeller></Layout>} />
      <Route path="/seller/product/:id/edit" element={<Layout><RequireSeller><ProductForm mode="edit" /></RequireSeller></Layout>} />
      <Route path="/admin" element={<Layout><RequireAdmin><AdminPage /></RequireAdmin></Layout>} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
    <Toasts />
  </BrowserRouter>
);

export default App;
