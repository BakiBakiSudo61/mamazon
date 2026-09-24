import { useState } from 'react';
import { ChevronUp, ChevronDown, Loader } from 'lucide-react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { GameHeader } from './ui/GameHeader';
import { BetSelector } from './ui/BetSelector';
import { PlayingCard } from './ui/PlayingCard';
import { ResultBanner } from './ui/ResultBanner';
import kit from './ui/kit.module.css';
import styles from './HighLow.module.css';

const SUITS = ['♠', '♣', '♥', '♦'];
const getSuit = (n: number) => SUITS[(n - 1) % 4];

function calcOdds(card: number, dir: 'high' | 'low'): number {
  const p = dir === 'high' ? (13 - card) / 13 : (card - 1) / 13;
  if (p <= 0) return 0;
  return Math.round(Math.max(1.05, 0.90 / p) * 100) / 100;
}
const chance = (card: number, dir: 'high' | 'low') =>
  Math.round(((dir === 'high' ? 13 - card : card - 1) / 13) * 100);

type Outcome = { result: 'win' | 'draw' | 'lose'; payout: number; bet: number };

export function HighLow() {
  const { user, fetchMe } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [bet, setBet] = useState(100);
  const [currentCard, setCurrentCard] = useState(7);
  const [history, setHistory] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [loading, setLoading] = useState(false);
  const [faceDown, setFaceDown] = useState(false);

  const balance = Number(user?.finance_balance ?? 0);

  const play = async (guess: 'high' | 'low') => {
    if (bet <= 0 || bet > balance || loading) return;
    setLoading(true);
    setOutcome(null);
    try {
      const res = await api.post<{ newCard: number; result: Outcome['result']; payout: number }>(
        '/finance/gamble/highlow', { amount: bet, guess, currentCard }
      );
      setFaceDown(true);
      setTimeout(() => {
        setHistory((h) => [currentCard, ...h].slice(0, 10));
        setCurrentCard(res.newCard);
        setFaceDown(false);
      }, 420);
      setTimeout(() => {
        setOutcome({ result: res.result, payout: res.payout, bet });
        setLoading(false);
        fetchMe();
      }, 900);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'エラーが発生しました' });
      setLoading(false);
    }
  };

  const highOdds = calcOdds(currentCard, 'high');
  const lowOdds = calcOdds(currentCard, 'low');
  const hiPct = chance(currentCard, 'high');
  const loPct = chance(currentCard, 'low');
  const cantBet = loading || bet > balance;

  return (
    <div className={kit.game}>
      <GameHeader icon="🃏" title="ハイ&ロー" desc="次のカードが今より高いか低いかを予想。同じ数字なら引き分けで返金。" />

      <section className={`${kit.panel} ${styles.table}`}>
        <div className={styles.stage}>
          <div className={styles.deck} aria-hidden="true">
            <PlayingCard rank={1} suit="♠" faceDown size="md" />
            <PlayingCard rank={1} suit="♠" faceDown size="md" />
          </div>
          <div className={styles.current}>
            <PlayingCard rank={currentCard} suit={getSuit(currentCard)} faceDown={faceDown} size="lg" />
          </div>
          <div className={styles.odds}>
            <div className={styles.oddsRow}>
              <span className={styles.oddsUp}><ChevronUp size={14} /> HIGH</span>
              <b>{highOdds ? `×${highOdds.toFixed(2)}` : '—'}</b>
            </div>
            <div className={styles.meter}><span style={{ width: `${hiPct}%` }} className={styles.meterUp} /></div>
            <div className={styles.oddsRow}>
              <span className={styles.oddsDown}><ChevronDown size={14} /> LOW</span>
              <b>{lowOdds ? `×${lowOdds.toFixed(2)}` : '—'}</b>
            </div>
            <div className={styles.meter}><span style={{ width: `${loPct}%` }} className={styles.meterDown} /></div>
          </div>
        </div>

        <div className={styles.history} aria-label="履歴">
          {history.length === 0
            ? <span className={styles.historyEmpty}>ここに履歴が表示されます</span>
            : history.map((c, i) => (
              <span key={`${i}-${c}`} className={`${styles.hChip} ${getSuit(c) === '♥' || getSuit(c) === '♦' ? styles.hRed : ''}`}>
                {({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[c] ?? c}
              </span>
            ))}
        </div>
      </section>

      {outcome && (
        outcome.result === 'win'
          ? <ResultBanner kind="win" title="WIN" sub={`払戻 ¥${outcome.payout.toLocaleString()}`} amount={outcome.payout - outcome.bet} />
          : outcome.result === 'draw'
            ? <ResultBanner kind="push" title="DRAW" sub="同じ数字 — 賭け金を返却" amount={0} />
            : <ResultBanner kind="lose" title="LOSE" amount={-outcome.bet} />
      )}

      <section className={`${kit.panel} ${styles.controls}`}>
        <BetSelector value={bet} onChange={setBet} disabled={loading} />
        <div className={styles.actions}>
          <button className={`${kit.success} ${styles.act}`} onClick={() => play('high')} disabled={cantBet || highOdds === 0}>
            {loading ? <Loader size={18} className={kit.spinner} /> : <><ChevronUp size={20} /><span>HIGH</span><small>{highOdds ? `×${highOdds.toFixed(2)}` : '—'}</small></>}
          </button>
          <button className={`${kit.danger} ${styles.act}`} onClick={() => play('low')} disabled={cantBet || lowOdds === 0}>
            {loading ? <Loader size={18} className={kit.spinner} /> : <><ChevronDown size={20} /><span>LOW</span><small>{lowOdds ? `×${lowOdds.toFixed(2)}` : '—'}</small></>}
          </button>
        </div>
      </section>
    </div>
  );
}
