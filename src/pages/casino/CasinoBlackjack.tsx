import { useState } from 'react';
import { Loader } from 'lucide-react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { GameHeader } from '../../components/finance/ui/GameHeader';
import { BetSelector } from '../../components/finance/ui/BetSelector';
import { PlayingCard } from '../../components/finance/ui/PlayingCard';
import { ResultBanner } from '../../components/finance/ui/ResultBanner';
import kit from '../../components/finance/ui/kit.module.css';
import styles from './CasinoBlackjack.module.css';

const SUITS = ['♠', '♥', '♦', '♣'];
const cardSuit = (n: number, i: number) => SUITS[(n + i) % 4];
const cardVal = (n: number) => (n > 10 ? 10 : n);

type BjResponse = {
  hand: number[];
  dealerHand?: number[];
  dealerFull?: number[];
  playerTotal: number;
  done: boolean;
  result?: string;
  payout?: number;
};

const handSum = (cards: number[]) => {
  let s = cards.filter((c) => c > 0).reduce((a, c) => a + cardVal(c), 0);
  if (cards.includes(1) && s + 10 <= 21) s += 10;
  return s;
};

export function CasinoBlackjack() {
  const { user, fetchMe } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [amount, setAmount] = useState(1000);
  const [hand, setHand] = useState<number[]>([]);
  const [dealerHand, setDealerHand] = useState<number[]>([]);
  const [dealerFull, setDealerFull] = useState<number[]>([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: string; payout: number; bet: number } | null>(null);
  const [round, setRound] = useState(0);

  const balance = Number(user?.finance_balance ?? 0);
  const fail = (err: unknown) => addToast({ type: 'error', message: err instanceof Error ? err.message : 'エラーが発生しました' });

  const start = async () => {
    if (amount > balance) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<BjResponse>('/finance/gamble/blackjack', { action: 'start', amount });
      setRound((r) => r + 1);
      setHand(res.hand);
      setDealerHand(res.dealerHand ?? []);
      setDealerFull(res.dealerFull || res.dealerHand || []);
      setPlayerTotal(res.playerTotal);
      if (res.done) {
        setResult({ type: res.result ?? 'lose', payout: res.payout ?? 0, bet: amount });
        fetchMe();
      } else {
        setPlaying(true);
        fetchMe();
      }
    } catch (err) { fail(err); }
    setLoading(false);
  };

  const hit = async () => {
    setLoading(true);
    try {
      const res = await api.post<BjResponse>('/finance/gamble/blackjack', { action: 'hit', amount, hand, dealerHand: dealerFull });
      setHand(res.hand);
      setPlayerTotal(res.playerTotal);
      if (res.done) {
        setResult({ type: res.result ?? 'bust', payout: res.payout ?? 0, bet: amount });
        if (res.dealerHand) setDealerHand(res.dealerHand);
        setPlaying(false);
        fetchMe();
      }
    } catch (err) { fail(err); }
    setLoading(false);
  };

  const stand = async () => {
    setLoading(true);
    try {
      const res = await api.post<BjResponse>('/finance/gamble/blackjack', { action: 'stand', amount, hand, dealerHand: dealerFull });
      setDealerHand(res.dealerHand ?? []);
      setPlayerTotal(res.playerTotal);
      setResult({ type: res.result ?? 'lose', payout: res.payout ?? 0, bet: amount });
      setPlaying(false);
      fetchMe();
    } catch (err) { fail(err); }
    setLoading(false);
  };

  const reset = () => {
    setHand([]); setDealerHand([]); setDealerFull([]);
    setPlayerTotal(0); setPlaying(false); setResult(null);
  };

  const dealerShown = dealerHand.length > 0 ? handSum(dealerHand) : 0;
  const dealerHidden = dealerHand.includes(0);
  const won = result && (result.type === 'win' || result.type === 'blackjack');

  return (
    <div className={kit.game}>
      <GameHeader icon="♠️" title="ブラックジャック" desc="21を超えずにディーラーより21に近づけば勝ち。ブラックジャックは2.5倍。" />

      <section className={styles.table}>
        <div className={styles.side}>
          <div className={styles.sideHead}>
            <span className={styles.who}>DEALER</span>
            {dealerHand.length > 0 && <span className={styles.total}>{dealerShown}{dealerHidden ? '+?' : ''}</span>}
          </div>
          <div className={styles.cards}>
            {dealerHand.length === 0
              ? <div className={styles.slot} />
              : dealerHand.map((c, i) => (
                <PlayingCard key={`${round}-d${i}`} rank={c || 1} suit={cardSuit(c, i)} faceDown={c === 0} deal dealDelay={i * 0.12 + 0.06} size="md" />
              ))}
          </div>
        </div>

        <div className={styles.felt} aria-hidden="true">
          <span>BLACKJACK PAYS 5 TO 2</span>
          <small>Dealer stands on 17</small>
        </div>

        <div className={styles.side}>
          <div className={styles.cards}>
            {hand.length === 0
              ? <div className={styles.slot} />
              : hand.map((c, i) => (
                <PlayingCard key={`${round}-p${i}`} rank={c} suit={cardSuit(c, i)} deal dealDelay={i < 2 ? i * 0.12 : 0} size="md" />
              ))}
          </div>
          <div className={styles.sideHead}>
            <span className={styles.who}>YOU</span>
            {hand.length > 0 && (
              <span className={`${styles.total} ${playerTotal > 21 ? styles.totalBust : playerTotal === 21 ? styles.total21 : ''}`}>{playerTotal}</span>
            )}
          </div>
        </div>
      </section>

      {result && (
        won
          ? <ResultBanner kind="win" big={result.type === 'blackjack'} title={result.type === 'blackjack' ? 'BLACKJACK!' : 'WIN'} sub={`払戻 ¥${result.payout.toLocaleString()}`} amount={result.payout - result.bet} />
          : result.type === 'push'
            ? <ResultBanner kind="push" title="PUSH" sub="引き分け — 賭け金を返却" amount={0} />
            : <ResultBanner kind="lose" title={result.type === 'bust' ? 'BUST' : 'LOSE'} sub={result.type === 'bust' ? '21を超えました' : 'ディーラーの勝ち'} amount={-result.bet} />
      )}

      <section className={`${kit.panel} ${styles.controls}`}>
        {playing ? (
          <div className={styles.actions}>
            <button className={`${kit.success} ${styles.act}`} onClick={hit} disabled={loading}>
              {loading ? <Loader size={18} className={kit.spinner} /> : <>HIT<small>もう1枚</small></>}
            </button>
            <button className={`${kit.danger} ${styles.act}`} onClick={stand} disabled={loading}>
              {loading ? <Loader size={18} className={kit.spinner} /> : <>STAND<small>勝負</small></>}
            </button>
          </div>
        ) : (
          <>
            <BetSelector value={amount} onChange={setAmount} presets={[500, 1000, 5000, 10000, 50000]} disabled={loading} />
            <button
              className={`${kit.primary} ${kit.block}`}
              onClick={() => { if (result) reset(); start(); }}
              disabled={loading || amount > balance}
            >
              {loading ? <Loader size={18} className={kit.spinner} /> : result ? 'もう一度 DEAL' : 'DEAL'}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
