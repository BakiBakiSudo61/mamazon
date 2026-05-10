import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { Users, Coins, ShoppingBag, RefreshCw, ChevronDown, ChevronUp, Search } from 'lucide-react';
import styles from './AdminPage.module.css';

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  role: string;
  is_admin: number;
  balance: number;
  finance_balance: string;
  created_at: string;
}

type EditTarget = { userId: string; type: 'finance' | 'shop' } | null;

function fmt(n: number) {
  return n.toLocaleString('ja-JP') + ' pt';
}

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<AdminUser[]>('/finance/admin/users');
      setUsers(data);
    } catch (e) {
      setMsg({ text: (e as Error).message, ok: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (userId: string, type: 'finance' | 'shop') => {
    const u = users.find(u => u.id === userId)!;
    setEditAmount(type === 'finance' ? parseInt(u.finance_balance || '0').toString() : u.balance.toString());
    setEditTarget({ userId, type });
  };

  const saveBalance = async () => {
    if (!editTarget) return;
    const amount = parseInt(editAmount);
    if (isNaN(amount) || amount < 0) { setMsg({ text: '有効な数値を入力してください', ok: false }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const endpoint = editTarget.type === 'finance'
        ? '/finance/admin/reset-balance'
        : '/finance/admin/reset-shop-balance';
      await api.post(endpoint, { targetUserId: editTarget.userId, amount });
      setMsg({ text: '更新しました', ok: true });
      setEditTarget(null);
      setEditAmount('');
      await fetchUsers();
    } catch (e) {
      setMsg({ text: (e as Error).message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}><Users size={22} /> 管理者パネル</h1>
        <button className={styles.refreshBtn} onClick={fetchUsers} disabled={loading}>
          <RefreshCw size={16} className={loading ? styles.spin : ''} />
          更新
        </button>
      </div>

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="メール・名前で検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>総ユーザー数</span>
          <span className={styles.statVal}>{users.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>表示中</span>
          <span className={styles.statVal}>{filtered.length}</span>
        </div>
      </div>

      {msg && (
        <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>
          {msg.text}
        </div>
      )}

      {editTarget && (
        <div className={styles.editOverlay}>
          <div className={styles.editModal}>
            <p className={styles.editTitle}>
              {editTarget.type === 'finance' ? <><Coins size={16} /> ファイナンス残高</> : <><ShoppingBag size={16} /> ショッピング残高</>}
            </p>
            <p className={styles.editSub}>{users.find(u => u.id === editTarget.userId)?.display_name}</p>
            <input
              className={styles.editInput}
              type="number"
              min="0"
              value={editAmount}
              onChange={e => setEditAmount(e.target.value)}
            />
            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={() => setEditTarget(null)} disabled={saving}>キャンセル</button>
              <button className={styles.saveBtn} onClick={saveBalance} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {filtered.map(u => (
          <div key={u.id} className={styles.card}>
            <div className={styles.cardHead} onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}>
              <div className={styles.cardUser}>
                {u.avatar_url
                  ? <img src={u.avatar_url} className={styles.avatar} alt="" />
                  : <div className={styles.avatarFallback}>{u.display_name[0]}</div>
                }
                <div>
                  <p className={styles.userName}>{u.display_name}</p>
                  <p className={styles.userEmail}>{u.email}</p>
                </div>
              </div>
              <div className={styles.cardRight}>
                <span className={`${styles.role} ${styles[`role_${u.role}`]}`}>{u.role}</span>
                {!!u.is_admin && <span className={`${styles.role} ${styles.role_admin}`}>admin</span>}
                {expandedId === u.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {expandedId === u.id && (
              <div className={styles.cardBody}>
                <div className={styles.balRow}>
                  <div className={styles.balBox}>
                    <Coins size={14} />
                    <span className={styles.balLabel}>ファイナンス</span>
                    <span className={styles.balVal}>{fmt(parseInt(u.finance_balance || '0'))}</span>
                    <button className={styles.editBtn} onClick={() => openEdit(u.id, 'finance')}>変更</button>
                  </div>
                  <div className={styles.balBox}>
                    <ShoppingBag size={14} />
                    <span className={styles.balLabel}>ショッピング</span>
                    <span className={styles.balVal}>{fmt(u.balance)}</span>
                    <button className={styles.editBtn} onClick={() => openEdit(u.id, 'shop')}>変更</button>
                  </div>
                </div>
                <p className={styles.userId}>ID: {u.id}</p>
                <p className={styles.userId}>登録: {new Date(u.created_at).toLocaleDateString('ja-JP')}</p>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && !loading && (
          <p className={styles.empty}>ユーザーが見つかりません</p>
        )}
      </div>
    </div>
  );
}
