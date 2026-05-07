import React from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import styles from './Toasts.module.css';

export const Toasts: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={[styles.toast, styles[t.type]].join(' ')}>
          <span className={styles.icon}>
            {t.type === 'success' && <CheckCircle size={16} />}
            {t.type === 'error' && <XCircle size={16} />}
            {t.type === 'info' && <Info size={16} />}
          </span>
          <span className={styles.message}>{t.message}</span>
          <button className={styles.close} onClick={() => removeToast(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
