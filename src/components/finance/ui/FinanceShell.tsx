import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Wallet } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { AnimatedNumber } from './AnimatedNumber';
import { useFinanceChrome } from './useFinanceChrome';
import styles from './FinanceShell.module.css';

interface Props {
  title: string;
  backTo: string;
  backLabel: string;
  /** colour accent for the ambient glow */
  tone?: 'gold' | 'violet' | 'green';
  children: ReactNode;
}

/** Common frame for every Finance screen: sticky glass header + live balance. */
export function FinanceShell({ title, backTo, backLabel, tone = 'gold', children }: Props) {
  useFinanceChrome();
  const balance = Number(useAuthStore((s) => s.user?.finance_balance ?? 0));
  const prev = useRef(balance);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (balance === prev.current) return;
    setFlash(balance > prev.current ? 'up' : 'down');
    prev.current = balance;
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [balance]);

  return (
    <div className={`${styles.shell} ${styles[tone]}`}>
      <div className={styles.glow} aria-hidden="true" />
      <header className={styles.header}>
        <Link to={backTo} className={styles.back} aria-label={backLabel}>
          <ChevronLeft size={20} />
          <span className={styles.backLabel}>{backLabel}</span>
        </Link>
        <h1 className={styles.title}>{title}</h1>
        <div
          className={`${styles.balance} ${flash === 'up' ? styles.flashUp : ''} ${flash === 'down' ? styles.flashDown : ''}`}
          title="ファイナンス残高"
        >
          <Wallet size={14} />
          <AnimatedNumber value={balance} prefix="¥" />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
