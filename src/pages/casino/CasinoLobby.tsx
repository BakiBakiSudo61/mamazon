import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import styles from './CasinoLobby.module.css';

const GAMES = [
  { to: 'highlow', icon: '🃏', name: 'ハイ&ロー', desc: '次のカードは上か下か。一瞬の直感勝負', max: '最大 ×11.7', tone: 'rose' },
  { to: 'slots', icon: '🎰', name: 'スロット', desc: 'リールを自分で止める。777で大当たり', max: '最大 ×50', tone: 'violet' },
  { to: 'roulette', icon: '🎡', name: 'ルーレット', desc: '赤・黒・番号。ヨーロピアンルール', max: '最大 ×36', tone: 'amber' },
  { to: 'blackjack', icon: '♠️', name: 'ブラックジャック', desc: 'ディーラーより21に近づけろ', max: 'BJ ×2.5', tone: 'emerald' },
  { to: 'horseracing', icon: '🏇', name: '競馬', desc: '18頭立て。単勝・馬連・三連単', max: '万馬券', tone: 'sky' },
  { to: 'lottery', icon: '🎫', name: 'ロト6', desc: '毎日12時抽選。6つの数字で夢を掴め', max: '最大 ×100万', tone: 'gold' },
] as const;

export function CasinoLobby() {
  return (
    <div className={styles.lobby}>
      <header className={styles.head}>
        <span className={styles.kicker}>MAMAZON CASINO</span>
        <h2 className={styles.title}>ゲームを選ぶ</h2>
      </header>
      <div className={styles.grid}>
        {GAMES.map((g, i) => (
          <Link
            key={g.to}
            to={`/finance/casino/${g.to}`}
            className={`${styles.card} ${styles[g.tone]}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <span className={styles.icon} aria-hidden="true">{g.icon}</span>
            <span className={styles.max}>{g.max}</span>
            <div className={styles.body}>
              <h3 className={styles.name}>{g.name}</h3>
              <p className={styles.desc}>{g.desc}</p>
            </div>
            <span className={styles.go} aria-hidden="true"><ArrowUpRight size={16} /></span>
          </Link>
        ))}
      </div>
      <p className={styles.note}>※ 架空のポイントを使ったゲームです。勝ち分には累進課税がかかります。</p>
    </div>
  );
}
