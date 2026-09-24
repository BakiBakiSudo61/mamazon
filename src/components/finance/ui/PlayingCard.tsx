import type { CSSProperties } from 'react';
import styles from './PlayingCard.module.css';

const RANKS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

interface Props {
  rank: number;
  suit: string;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** seconds; staggers the deal-in animation */
  dealDelay?: number;
  deal?: boolean;
}

export function PlayingCard({ rank, suit, faceDown = false, size = 'md', dealDelay = 0, deal = false }: Props) {
  const label = RANKS[rank] ?? String(rank);
  const red = suit === '♥' || suit === '♦';
  const isFace = rank === 1 || rank > 10;
  const style = { animationDelay: `${dealDelay}s` } as CSSProperties;

  return (
    <div
      className={`${styles.card} ${styles[size]} ${deal ? styles.deal : ''}`}
      style={style}
      aria-label={faceDown ? '伏せられたカード' : `${suit}${label}`}
    >
      <div className={`${styles.inner} ${faceDown ? styles.flipped : ''}`}>
        <div className={`${styles.face} ${red ? styles.red : styles.black}`}>
          <span className={styles.cornerTL}><b>{label}</b><i>{suit}</i></span>
          <span className={`${styles.center} ${isFace ? styles.centerFace : ''}`}>
            {isFace ? <>{label}<small>{suit}</small></> : suit}
          </span>
          <span className={styles.cornerBR}><b>{label}</b><i>{suit}</i></span>
        </div>
        <div className={styles.back} />
      </div>
    </div>
  );
}
