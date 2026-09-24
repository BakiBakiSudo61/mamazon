import { useState, useEffect, useCallback } from 'react';
import { Dices, Eraser, Gift, Loader, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { GameHeader } from '../../components/finance/ui/GameHeader';
import { BetSelector } from '../../components/finance/ui/BetSelector';
import kit from '../../components/finance/ui/kit.module.css';
import styles from './CasinoLottery.module.css';

type Ticket = { id: string; picks: number[]; amount: number; drawDate: string; claimed: boolean };
type TicketWithResult = Ticket & { winning?: number[]; matches?: number };

type LotteryStatus = {
  drawn: boolean;
  drawDate: string;
  nextDraw: string;
  winning: number[] | null;
  todayTickets: Ticket[];
  resultTickets: TicketWithResult[];
};

const MULTIPLIERS: Record<number, number> = { 6: 1000000, 5: 1000, 4: 100, 3: 10, 2: 2 };
const PRIZE_LABELS: Record<number, string> = { 6: '1等', 5: '2等', 4: '3等', 3: '4等', 2: '5等' };
const COUNT_OPTIONS = [1, 2, 3, 5, 10];

function countdownParts(targetISO: string) {
  const diff = Math.max(0, new Date(targetISO).getTime() - Date.now());
  return {
    done: diff <= 0,
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

function generateRandomPicks(): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const selected: number[] = [];
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected.sort((a, b) => a - b);
}

const ballTone = (n: number) => (n <= 9 ? 'b1' : n <= 18 ? 'b2' : n <= 27 ? 'b3' : n <= 36 ? 'b4' : 'b5');

function Ball({ n, size = 'md', match, hidden }: { n: number | string; size?: 'sm' | 'md' | 'lg'; match?: boolean; hidden?: boolean }) {
  return (
    <span className={`${styles.ball} ${styles[size]} ${typeof n === 'number' && !hidden ? styles[ballTone(n)] : styles.bHidden} ${match ? styles.ballMatch : ''}`}>
      {hidden ? '?' : n}
    </span>
  );
}

export function CasinoLottery() {
  const { user, fetchMe } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [amount, setAmount] = useState(1000);
  const [picks, setPicks] = useState<number[]>([]);
  const [ticketCount, setTicketCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [buyProgress, setBuyProgress] = useState(0);
  const [status, setStatus] = useState<LotteryStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [, setTick] = useState(0);
  const [claimLoading, setClaimLoading] = useState(false);
  const [winModal, setWinModal] = useState<{ totalPayout: number; claimed: number } | null>(null);

  const balance = Number(user?.finance_balance ?? 0);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get<LotteryStatus>('/finance/gamble/lottery/status');
      setStatus(res);
    } catch { /* ignore */ }
    setStatusLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (!status?.nextDraw) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [status?.nextDraw]);

  const togglePick = (n: number) => {
    if (picks.includes(n)) setPicks(picks.filter((p) => p !== n));
    else if (picks.length < 6) setPicks([...picks, n].sort((a, b) => a - b));
  };

  const buyTickets = async () => {
    if (picks.length !== 6) return;
    setLoading(true);
    setBuyProgress(0);
    try {
      for (let i = 0; i < ticketCount; i++) {
        const ticketPicks = i === 0 ? picks : generateRandomPicks();
        await api.post('/finance/gamble/lottery', { amount, picks: ticketPicks });
        setBuyProgress(i + 1);
      }
      addToast({ type: 'success', message: `${ticketCount}枚のチケットを購入しました` });
      setPicks([]);
      await loadStatus();
      fetchMe();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : '購入に失敗しました' });
      await loadStatus();
      fetchMe();
    }
    setLoading(false);
    setBuyProgress(0);
  };

  const revealResults = async () => {
    if (!status?.winning || isRevealing) return;
    setIsRevealing(true);
    setRevealedCount(0);
    for (let i = 1; i <= 6; i++) {
      await new Promise((r) => setTimeout(r, 650));
      setRevealedCount(i);
    }
    setIsRevealing(false);
  };

  const claimAll = async () => {
    setClaimLoading(true);
    try {
      const res = await api.post<{ totalPayout: number; claimed: number }>('/finance/gamble/lottery/claim', {});
      if (res.totalPayout > 0) setWinModal(res);
      await loadStatus();
      fetchMe();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'エラーが発生しました' });
    }
    setClaimLoading(false);
  };

  const hasUnclaimedWins = status?.resultTickets.some((t) => !t.claimed && (t.matches ?? 0) >= 2) ?? false;
  const cd = status ? countdownParts(status.nextDraw) : null;
  const total = amount * ticketCount;

  return (
    <div className={kit.game}>
      <GameHeader icon="🎫" title="ロト6" desc="1〜45から6つの数字を選択。毎日12:00（JST）に抽選、2つ以上一致で当選。" />

      {winModal && (
        <div className={styles.modalBg} onClick={() => setWinModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <Sparkles size={36} className={styles.modalIcon} />
            <h2 className={styles.modalTitle}>当選おめでとう！</h2>
            <p className={styles.modalAmt}>+¥{winModal.totalPayout.toLocaleString()}</p>
            <p className={styles.modalSub}>{winModal.claimed}枚のチケットが当選しました</p>
            <button className={`${kit.primary} ${kit.block}`} onClick={() => setWinModal(null)}>閉じる</button>
          </div>
        </div>
      )}

      {/* ===== Draw status ===== */}
      <section className={`${kit.panel} ${styles.draw}`}>
        {statusLoading || !status ? (
          <div className={styles.loading}><Loader size={20} className={kit.spinner} /></div>
        ) : status.drawn && status.winning ? (
          <>
            <div className={styles.drawHead}>
              <span className={kit.label}>{status.drawDate} の当選番号</span>
            </div>
            <div className={styles.balls}>
              {status.winning.map((n, i) => <Ball key={i} n={n} size="lg" hidden={i >= revealedCount} />)}
            </div>
            {revealedCount < 6 && (
              <button className={`${kit.ghost} ${styles.center}`} onClick={revealResults} disabled={isRevealing}>
                {isRevealing ? '抽選中…' : '番号を1つずつ公開する'}
              </button>
            )}
            {revealedCount === 6 && status.resultTickets.length > 0 && (
              <div className={styles.results}>
                <span className={kit.label}>あなたの結果</span>
                {status.resultTickets.map((t, ti) => {
                  const m = t.matches ?? 0;
                  const won = m >= 2;
                  return (
                    <div key={t.id} className={`${styles.ticket} ${won ? styles.ticketWin : ''}`}>
                      <span className={styles.ticketNo}>#{ti + 1}</span>
                      <div className={styles.ticketBalls}>
                        {t.picks.map((n, i) => <Ball key={i} n={n} size="sm" match={status.winning!.includes(n)} />)}
                      </div>
                      <span className={styles.ticketRes}>
                        {won ? <><b>{PRIZE_LABELS[m]}</b> +¥{(t.amount * MULTIPLIERS[m]).toLocaleString()}</> : `${m}個一致`}
                        {t.claimed && <em> 受取済</em>}
                      </span>
                    </div>
                  );
                })}
                {hasUnclaimedWins && !winModal && (
                  <button className={`${kit.primary} ${kit.block}`} onClick={claimAll} disabled={claimLoading}>
                    {claimLoading ? <Loader size={18} className={kit.spinner} /> : <><Gift size={18} /> 当選金を受け取る</>}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className={styles.countdown}>
            <span className={kit.label}>次回抽選まで</span>
            {cd && (
              <div className={styles.clock}>
                <span><b>{cd.h}</b><small>時間</small></span>
                <i>:</i>
                <span><b>{String(cd.m).padStart(2, '0')}</b><small>分</small></span>
                <i>:</i>
                <span><b>{String(cd.s).padStart(2, '0')}</b><small>秒</small></span>
              </div>
            )}
            <span className={styles.muted}>毎日 12:00（JST）に発表</span>
          </div>
        )}
      </section>

      {/* ===== Purchased tickets ===== */}
      {status && status.todayTickets.length > 0 && (
        <section className={`${kit.panel} ${styles.mine}`}>
          <span className={kit.label}>{status.drawn ? '次回（明日）' : '本日'}の購入チケット・{status.todayTickets.length}枚</span>
          {status.todayTickets.map((t, ti) => (
            <div key={t.id} className={styles.ticket}>
              <span className={styles.ticketNo}>#{ti + 1}</span>
              <div className={styles.ticketBalls}>
                {t.picks.map((n, i) => <Ball key={i} n={n} size="sm" />)}
              </div>
              <span className={styles.ticketRes}>¥{t.amount.toLocaleString()}</span>
            </div>
          ))}
        </section>
      )}

      {/* ===== Picker ===== */}
      <section className={`${kit.panel} ${styles.picker}`}>
        <div className={styles.pickHead}>
          <div className={styles.slots}>
            {Array.from({ length: 6 }, (_, i) => (
              picks[i] !== undefined
                ? <Ball key={i} n={picks[i]} size="sm" />
                : <span key={i} className={styles.emptySlot} />
            ))}
          </div>
          <div className={styles.pickTools}>
            <button className={styles.tool} onClick={() => setPicks(generateRandomPicks())} aria-label="クイックピック"><Dices size={16} /> おまかせ</button>
            <button className={styles.tool} onClick={() => setPicks([])} disabled={picks.length === 0} aria-label="クリア"><Eraser size={16} /></button>
          </div>
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => {
            const on = picks.includes(n);
            return (
              <button
                key={n}
                className={`${styles.num} ${on ? `${styles.numOn} ${styles[ballTone(n)]}` : ''}`}
                onClick={() => togglePick(n)}
                disabled={!on && picks.length >= 6}
                aria-pressed={on}
              >{n}</button>
            );
          })}
        </div>
      </section>

      {/* ===== Purchase ===== */}
      <section className={`${kit.panel} ${styles.buy}`}>
        <BetSelector value={amount} onChange={setAmount} presets={[500, 1000, 5000, 10000]} label="1枚あたり" disabled={loading} />
        <div className={styles.countRow}>
          <span className={kit.label}>枚数</span>
          <div className={kit.segmented}>
            {COUNT_OPTIONS.map((v) => (
              <button key={v} className={`${kit.segment} ${ticketCount === v ? kit.segmentActive : ''}`} onClick={() => setTicketCount(v)} disabled={loading}>
                {v}枚
              </button>
            ))}
          </div>
          {ticketCount > 1 && <p className={styles.muted}>1枚目は選んだ番号、2枚目以降はおまかせで購入します</p>}
        </div>
        <button className={`${kit.primary} ${kit.block}`} onClick={buyTickets} disabled={loading || picks.length !== 6 || total > balance}>
          {loading
            ? <><Loader size={18} className={kit.spinner} /> 購入中 {buyProgress}/{ticketCount}</>
            : picks.length !== 6
              ? `あと${6 - picks.length}個選んでください`
              : `${ticketCount}枚購入する ・ ¥${total.toLocaleString()}`}
        </button>
      </section>

      <section className={`${kit.panel} ${styles.payouts}`}>
        <span className={kit.label}>配当表</span>
        <div className={styles.payGrid}>
          {[6, 5, 4, 3, 2].map((m) => (
            <div key={m} className={`${styles.payRow} ${m === 6 ? styles.payTop : ''}`}>
              <span>{PRIZE_LABELS[m]}</span>
              <span className={styles.muted}>{m}個一致</span>
              <b>×{MULTIPLIERS[m].toLocaleString()}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
