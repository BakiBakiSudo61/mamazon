import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { HighLow } from '../components/finance/HighLow';
import { Slots } from '../components/finance/Slots';
import { HorseRacing } from '../components/finance/HorseRacing';
import { ArrowLeft, Coins } from 'lucide-react';
import styles from './CasinoPage.module.css';

type Game = 'highlow' | 'slots' | 'horseracing';

export function CasinoPage() {
  const { user } = useAuthStore();
  const [game, setGame] = useState<Game>('highlow');

  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />
      <div className={styles.starField} />

      <header className={styles.header}>
        <Link to="/finance" className={styles.backBtn}>
          <ArrowLeft size={16} /> <span className={styles.backBtnText}>ロビー</span>
        </Link>
        <div className={styles.logoText}>
          <span className={styles.logoEmoji}>🎰</span>
          <span>MAMAZON CASINO</span>
        </div>
        <div className={styles.balanceChip}>
          <Coins size={14} />
          ¥{(user?.finance_balance ?? 0).toLocaleString()}
        </div>
      </header>

      <div className={styles.gameTabs}>
        <button
          className={`${styles.gameTab} ${game === 'highlow' ? styles.activeTab : ''}`}
          onClick={() => setGame('highlow')}
        >
          🃏 ハイ&ロー
        </button>
        <button
          className={`${styles.gameTab} ${game === 'slots' ? styles.activeTab : ''}`}
          onClick={() => setGame('slots')}
        >
          🎰 スロット
        </button>
        <button
          className={`${styles.gameTab} ${game === 'horseracing' ? styles.activeTab : ''}`}
          onClick={() => setGame('horseracing')}
        >
          🏇 競馬
        </button>
      </div>

      <main className={styles.main}>
        <div className={styles.gameContainer}>
          {game === 'highlow' && <HighLow />}
          {game === 'slots' && <Slots />}
          {game === 'horseracing' && <HorseRacing />}
        </div>
      </main>
    </div>
  );
}