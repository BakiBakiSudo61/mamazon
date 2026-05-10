import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { sellerApi } from '../../api/seller';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './SellerRegister.module.css';

export const SellerRegister: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user?.role === 'seller' || user?.role === 'both') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <Store size={48} />
          <h2>すでに出品者として登録済みです</h2>
          <Button onClick={() => navigate('/seller/dashboard')}>ダッシュボードへ</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await sellerApi.createStore({ store_name: storeName, description });
      const updated = await api.get<typeof user>('/auth/me');
      setUser(updated);
      addToast({ type: 'success', message: 'ストアを開設しました！' });
      navigate('/seller/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました';
      addToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.heroIcon}><Store size={40} /></div>
        <h1>出品者として登録する</h1>
        <p className={styles.subtitle}>ストアを開設して架空の商品を出品しましょう</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="ストア名"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            placeholder="例：テックショップ東京"
          />
          <div className={styles.field}>
            <label className={styles.label}>ストアの説明（任意）</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ストアについて紹介してください..."
              rows={3}
            />
          </div>
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            ストアを開設する
          </Button>
        </form>
      </div>
    </div>
  );
};
