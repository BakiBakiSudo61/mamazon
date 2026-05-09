import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import styles from './CasinoLobby.module.css';

export function CasinoLobby() {
  return (
    <div className={styles.lobby}>
      <h2 className={styles.title}>
        <Sparkles className={styles.sparkle} /> 
        CHOOSE YOUR GAME 
        <Sparkles className={styles.sparkle} />
      </h2>
      <div className={styles.grid}>
        <Link to="/finance/casino/highlow" className={`${styles.card} ${styles.cardHighlow}`}>
          <div className={styles.cardIcon}>🃏</div>
          <h3>ハイ＆ロー</h3>
          <p>次のカードは高いか低いか？直感が試される究極の2択</p>
          <div className={styles.playBtn}>PLAY NOW</div>
        </Link>
        <Link to="/finance/casino/slots" className={`${styles.card} ${styles.cardSlots}`}>
          <div className={styles.cardIcon}>🎰</div>
          <h3>スロット</h3>
          <p>絵柄を揃えて一攫千金！777で最大50倍のBIG BONUS</p>
          <div className={styles.playBtn}>PLAY NOW</div>
        </Link>
        <Link to="/finance/casino/horseracing" className={`${styles.card} ${styles.cardHorse}`}>
          <div className={styles.cardIcon}>🏇</div>
          <h3>本格競馬</h3>
          <p>1日6レース開催！馬連・単勝で億万長者を狙え</p>
          <div className={styles.playBtn}>PLAY NOW</div>
        </Link>
        <Link to="/finance/casino/roulette" className={`${styles.card} ${styles.cardRoulette}`}>
          <div className={styles.cardIcon}>🎡</div>
          <h3>ルーレット</h3>
          <p>赤か黒か？番号直撃で36倍！多彩なベットで勝負</p>
          <div className={styles.playBtn}>PLAY NOW</div>
        </Link>
        <Link to="/finance/casino/blackjack" className={`${styles.card} ${styles.cardBlackjack}`}>
          <div className={styles.cardIcon}>♠️</div>
          <h3>ブラックジャック</h3>
          <p>21を目指せ！ヒット or スタンドの頭脳戦</p>
          <div className={styles.playBtn}>PLAY NOW</div>
        </Link>
        <Link to="/finance/casino/lottery" className={`${styles.card} ${styles.cardLottery}`}>
          <div className={styles.cardIcon}>🎫</div>
          <h3>宝くじ (ロト6)</h3>
          <p>6つの番号を選んで最大100万倍のドリームジャックポット</p>
          <div className={styles.playBtn}>PLAY NOW</div>
        </Link>
      </div>
    </div>
  );
}
