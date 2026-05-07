import React, { useState } from 'react';
import { User, Wallet, Store, Edit } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import styles from './Account.module.css';

export const Account: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.put<typeof user>('/users/me', { display_name: displayName });
      setUser(updated);
      setEditing(false);
      addToast({ type: 'success', message: 'プロフィールを更新しました' });
    } catch {
      addToast({ type: 'error', message: '更新に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const roleLabel: Record<string, string> = { buyer: '購入者', seller: '出品者', both: '購入者 / 出品者' };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>アカウント設定</h1>

        <div className={styles.profileCard}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.display_name} className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}><User size={36} /></div>
          )}
          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              {editing ? (
                <>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={styles.nameInput}
                  />
                  <Button size="sm" onClick={handleSave} loading={saving}>保存</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>キャンセル</Button>
                </>
              ) : (
                <>
                  <h2 className={styles.name}>{user.display_name}</h2>
                  <button className={styles.editBtn} onClick={() => setEditing(true)}>
                    <Edit size={14} />
                  </button>
                </>
              )}
            </div>
            <p className={styles.email}>{user.email}</p>
            <Badge>{roleLabel[user.role] ?? user.role}</Badge>
          </div>
        </div>

        <div className={styles.statCards}>
          <div className={styles.statCard}>
            <Wallet size={24} className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>Mamazon残高</p>
              <p className={styles.statValue}>¥{user.balance.toLocaleString()}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <Store size={24} className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>アカウントロール</p>
              <p className={styles.statValue}>{roleLabel[user.role] ?? user.role}</p>
            </div>
          </div>
        </div>

        {user.role === 'buyer' && (
          <div className={styles.sellerCta}>
            <h3>出品者になりませんか？</h3>
            <p>ストアを開設して架空の商品を出品しましょう</p>
            <Button variant="secondary" onClick={() => window.location.href = '/seller/register'}>
              出品者登録へ
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
