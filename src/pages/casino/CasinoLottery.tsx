import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import styles from './CasinoGames.module.css';

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
const PRIZE_LABELS: Record<number, string> = { 6: '🏆 1等', 5: '🥈 2等', 4: '🥉 3等', 3: '4等', 2: '5等' };
const COUNT_OPTIONS = [1, 2, 3, 5, 10];

function formatCountdown(targetISO: string): string {
  const diff = new Date(targetISO).getTime() - Date.now();
  if (diff <= 0) return '発表済み';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}時間${String(m).padStart(2, '0')}分${String(s).padStart(2, '0')}秒後`;
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

export function CasinoLottery() {
  const refreshBalance = useAuthStore((s) => s.fetchMe);
  const [amount, setAmount] = useState(1000);
  const [picks, setPicks] = useState<number[]>([]);
  const [ticketCount, setTicketCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [buyProgress, setBuyProgress] = useState(0);
  const [status, setStatus] = useState<LotteryStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [winModal, setWinModal] = useState<{ totalPayout: number; claimed: number } | null>(null);

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
    const timer = setInterval(() => setCountdown(formatCountdown(status.nextDraw)), 1000);
    setCountdown(formatCountdown(status.nextDraw));
    return () => clearInterval(timer);
  }, [status?.nextDraw]);

  const togglePick = (n: number) => {
    if (picks.includes(n)) setPicks(picks.filter((p) => p !== n));
    else if (picks.length < 6) setPicks([...picks, n]);
  };

  const quickPick = () => setPicks(generateRandomPicks());

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
      setPicks([]);
      await loadStatus();
      refreshBalance();
    } catch { /* ignore */ }
    setLoading(false);
    setBuyProgress(0);
  };

  const revealResults = async () => {
    if (!status?.winning || isRevealing) return;
    setIsRevealing(true);
    setRevealedCount(0);
    for (let i = 1; i <= 6; i++) {
      await new Promise((r) => setTimeout(r, 700));
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
      refreshBalance();
    } catch { /* ignore */ }
    setClaimLoading(false);
  };

  const hasUnclaimedWins = status?.resultTickets.some(
    t => !t.claimed && (t.matches ?? 0) >= 2
  ) ?? false;

  return (
    <div className={styles.gamePage}>
      <h2 className={styles.gameTitle}>🎫 宝くじ（ロト6）</h2>
      <p className={styles.gameSubtitle}>毎日12:00に抽選 — 1〜45から6つの番号を選んで購入</p>

      {/* ===== 当選モーダル ===== */}
      {winModal && (
        <div className={styles.winModalBg} onClick={() => setWinModal(null)}>
          <div className={styles.winModal} onClick={e => e.stopPropagation()}>
            <div className={styles.winModalEmoji}>🎉</div>
            <h2 className={styles.winModalTitle}>当選おめでとう！</h2>
            <p className={styles.winModalAmt}>{winModal.totalPayout.toLocaleString()} pt 獲得！</p>
            <p className={styles.winModalSub}>{winModal.claimed}枚のチケットが当選しました</p>
            <button className={styles.spinBtn} onClick={() => setWinModal(null)}>閉じる</button>
          </div>
        </div>
      )}

      {/* ===== 購入済みチケット ===== */}
      {!statusLoading && status && status.todayTickets.length > 0 && (
        <div className={styles.lotteryReveal}>
          <h3>📋 {status.drawn ? '次回（明日）' : '本日'}の購入チケット ({status.todayTickets.length}枚)</h3>
          {status.todayTickets.map((t, ti) => (
            <div key={t.id} className={styles.ticketCard}>
              <span className={styles.ticketLabel}>#{ti + 1}</span>
              <div className={styles.lotteryBalls}>
                {t.picks.map((n, i) => (
                  <div key={i} className={`${styles.lotteryBall} ${styles.pickBall}`}>{n}</div>
                ))}
              </div>
              <span className={styles.ticketAmt}>{t.amount.toLocaleString()}pt</span>
            </div>
          ))}
        </div>
      )}

      {/* ===== 結果表示エリア ===== */}
      {!statusLoading && status && (
        <div className={styles.lotteryReveal}>
          {status.drawn && status.winning ? (
            <>
              <h3>🎰 {status.drawDate} の当選番号</h3>
              <div className={styles.lotteryBalls}>
                {status.winning.map((n, i) => (
                  <div
                    key={i}
                    className={`${styles.lotteryBall} ${styles.winBall} ${
                      i < revealedCount ? styles.ballRevealed : styles.ballHidden
                    }`}
                  >
                    {i < revealedCount ? n : '?'}
                  </div>
                ))}
              </div>
              {revealedCount < 6 && !isRevealing && (
                <button className={styles.valBtn} onClick={revealResults} style={{ marginTop: '0.75rem' }}>
                  🎬 番号を1つずつ公開
                </button>
              )}
              {isRevealing && <p style={{ color: 'var(--accent)', marginTop: '0.5rem' }}>発表中…</p>}

              {status.resultTickets.length > 0 && revealedCount === 6 && (
                <div style={{ marginTop: '1.25rem', width: '100%' }}>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>あなたの結果</h4>
                  {status.resultTickets.map((t, ti) => {
                    const m = t.matches ?? 0;
                    const won = m >= 2;
                    return (
                      <div key={t.id} className={`${styles.resultBanner} ${won ? styles.resultWin : styles.resultLose}`} style={{ marginBottom: '0.5rem' }}>
                        <div style={{ marginBottom: '0.25rem', fontSize: '0.8rem', opacity: 0.7 }}>チケット#{ti + 1}</div>
                        <div className={styles.lotteryBalls} style={{ justifyContent: 'center', marginBottom: '0.25rem' }}>
                          {t.picks.map((n, i) => (
                            <div key={i} className={`${styles.lotteryBall} ${styles.pickBall} ${status.winning!.includes(n) ? styles.ballMatch : ''}`}>
                              {n}
                            </div>
                          ))}
                        </div>
                        {won
                          ? `${PRIZE_LABELS[m]} — ${m}個一致！×${MULTIPLIERS[m].toLocaleString()} → +${(t.amount * MULTIPLIERS[m]).toLocaleString()}pt`
                          : `😢 ${m}個一致 — ハズレ`}
                        {t.claimed && <span style={{ marginLeft: '0.75rem', opacity: 0.6, fontSize: '0.8rem' }}>(受取済)</span>}
                      </div>
                    );
                  })}
                  {hasUnclaimedWins && !winModal && (
                    <button className={styles.spinBtn} onClick={claimAll} disabled={claimLoading} style={{ marginTop: '0.5rem' }}>
                      {claimLoading ? '処理中...' : '🎁 当選金を受け取る'}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>次回抽選まで</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{countdown}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>毎日 12:00 (JST) に発表</p>
            </div>
          )}
        </div>
      )}

      {/* ===== 番号選択グリッド ===== */}
      <div className={styles.lotteryGrid}>
        {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={`${styles.lotteryNum} ${picks.includes(n) ? styles.lotteryNumPicked : ''}`}
            onClick={() => togglePick(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {/* ===== 購入コントロール ===== */}
      <div className={styles.betSection}>
        <div className={styles.betRow}>
          <label>選択中: {picks.length}/6</label>
          <button className={styles.valBtn} onClick={quickPick}>🎲 クイックピック</button>
        </div>
        <div className={styles.betRow}>
          <label>購入額</label>
          <div className={styles.amountBtns}>
            {[500, 1000, 5000, 10000].map((v) => (
              <button key={v} className={`${styles.amountBtn} ${amount === v ? styles.amountActive : ''}`} onClick={() => setAmount(v)}>
                {v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.betRow}>
          <label>枚数</label>
          <div className={styles.amountBtns}>
            {COUNT_OPTIONS.map((v) => (
              <button key={v} className={`${styles.amountBtn} ${ticketCount === v ? styles.amountActive : ''}`} onClick={() => setTicketCount(v)}>
                {v}枚
              </button>
            ))}
          </div>
        </div>
        {ticketCount > 1 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            ※ 1枚目は選択番号、2枚目以降はランダム生成
          </p>
        )}
        <button className={styles.spinBtn} onClick={buyTickets} disabled={loading || picks.length !== 6}>
          {loading
            ? `購入中… (${buyProgress}/${ticketCount})`
            : ticketCount === 1
              ? `🎫 チケットを購入 (${amount.toLocaleString()}pt)`
              : `🎫 ${ticketCount}枚購入 (計${(amount * ticketCount).toLocaleString()}pt)`}
        </button>
      </div>

      {/* ===== 配当表 ===== */}
      <div className={styles.payoutTable}>
        <h4>配当表</h4>
        <table>
          <tbody>
            <tr><td>6個一致</td><td className={styles.payoutGold}>×1,000,000</td></tr>
            <tr><td>5個一致</td><td>×1,000</td></tr>
            <tr><td>4個一致</td><td>×100</td></tr>
            <tr><td>3個一致</td><td>×10</td></tr>
            <tr><td>2個一致</td><td>×2</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

