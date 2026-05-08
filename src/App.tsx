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
      <Route path="/cart" element={<Layout><RequireAuth><Cart /></RequireAuth></Layout>} />
      <Route path="/checkout/*" element={<Layout><RequireAuth><Checkout /></RequireAuth></Layout>} />
      <Route path="/checkout/complete" element={<Layout><RequireAuth><OrderComplete /></RequireAuth></Layout>} />
      <Route path="/orders" element={<Layout><RequireAuth><Orders /></RequireAuth></Layout>} />
      <Route path="/orders/:id" element={<Layout><RequireAuth><OrderDetail /></RequireAuth></Layout>} />
      <Route path="/account" element={<Layout><RequireAuth><Account /></RequireAuth></Layout>} />
      <Route path="/finance" element={<Layout><RequireAuth><FinancePage /></RequireAuth></Layout>} />
      <Route path="/seller/register" element={<Layout><RequireAuth><SellerRegister /></RequireAuth></Layout>} />
      <Route path="/seller/dashboard" element={<Layout><RequireSeller><Dashboard /></RequireSeller></Layout>} />
      <Route path="/seller/product/new" element={<Layout><RequireSeller><ProductForm mode="new" /></RequireSeller></Layout>} />
      <Route path="/seller/product/:id/edit" element={<Layout><RequireSeller><ProductForm mode="edit" /></RequireSeller></Layout>} />
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
