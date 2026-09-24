import { useEffect, useRef, useState } from 'react';
import { Loader, Megaphone, Trophy, Zap, Ticket, Flag } from 'lucide-react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { GameHeader } from './ui/GameHeader';
import { BetSelector } from './ui/BetSelector';
import { ResultBanner } from './ui/ResultBanner';
import kit from './ui/kit.module.css';
import styles from './HorseRacing.module.css';

type Horse = { no: number; name: string; odds: number };
type Race = { id: string; time: number; horses: Horse[]; winner: number };
type Schedule = { nextRace: Race; currentRace: Race };
type Bet = { id: string; race_id: string; bet_type: BetType; horse_index: number; horse_index_2?: number; horse_index_3?: number; amount: number; status: string };
type BetType = 'win' | 'quinella' | 'trifecta';
type DemoResult = { winner: number; runnerUp: number; thirdPlace: number; payout: number; horses: Horse[]; bet: number };

const BET_TYPES: { id: BetType; label: string; need: number; desc: string }[] = [
  { id: 'win', label: '単勝', need: 1, desc: '1着になる馬を当てる' },
  { id: 'quinella', label: '馬連', need: 2, desc: '1・2着の2頭を順不同で当てる' },
  { id: 'trifecta', label: '三連単', need: 3, desc: '1・2・3着を着順通りに当てる' },
];
const BET_LABEL: Record<BetType, string> = { win: '単勝', quinella: '馬連', trifecta: '三連単' };

// JRA frame (枠) colours for an 18-horse field
function frameOf(no: number) {
  if (no <= 12) return Math.ceil(no / 2);
  return no <= 15 ? 7 : 8;
}
const FRAME_BG = ['#fff', '#fff', '#111', '#e5383b', '#2f6fe0', '#f5d20b', '#23a55a', '#f08a24', '#f37bb2'];
const FRAME_FG = ['#111', '#111', '#fff', '#fff', '#fff', '#111', '#fff', '#111', '#111'];

function Gate({ no, small }: { no: number; small?: boolean }) {
  const f = frameOf(no);
  return (
    <span className={`${styles.gate} ${small ? styles.gateSm : ''}`} style={{ background: FRAME_BG[f], color: FRAME_FG[f] }}>
      {no}
    </span>
  );
}

const PHASES: [number, string][] = [
  [15, '第1コーナーを回る！馬群は固まりつつある'],
  [40, '向正面に差し掛かりました。隊列は激しく入れ替わる！'],
  [60, '第3コーナーから第4コーナーへ！各馬仕掛けていく！'],
  [78, '最後の直線！激しい叩き合いだ！！'],
];

export function HorseRacing() {
  const { user, fetchMe } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [bet, setBet] = useState(100);
  const [betType, setBetType] = useState<BetType>('win');
  const [selected, setSelected] = useState<number[]>([]);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [racing, setRacing] = useState(false);
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [positions, setPositions] = useState<number[]>(Array(18).fill(0));
  const [commentary, setCommentary] = useState('各馬、ゲートに収まりました…');
  const [manbaken, setManbaken] = useState(false);
  const raceTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const trackRef = useRef<HTMLDivElement>(null);

  const balance = Number(user?.finance_balance ?? 0);
  const toastErr = (e: unknown) => addToast({ type: 'error', message: e instanceof Error ? e.message : 'エラーが発生しました' });

  const loadInfo = async () => {
    try {
      const res = await api.get<{ schedule: Schedule; bets: Bet[] }>('/finance/gamble/horseracing/info');
      setSchedule(res.schedule);
      setBets(res.bets);
    } catch (e) { toastErr(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadInfo(); return () => clearInterval(raceTimer.current); }, []);

  const need = BET_TYPES.find((b) => b.id === betType)!.need;

  const toggle = (idx: number) => {
    if (betType === 'win') return setSelected([idx]);
    if (selected.includes(idx)) return setSelected(selected.filter((i) => i !== idx));
    setSelected(selected.length < need ? [...selected, idx] : [...selected.slice(1), idx]);
  };

  const validSelection = () => {
    if (selected.length === need) return true;
    addToast({ type: 'info', message: `馬を${need}頭選んでください${betType === 'trifecta' ? '（1着→2着→3着の順）' : ''}` });
    return false;
  };

  const payload = () => ({
    amount: bet,
    betType,
    horseIndex: selected[0],
    horseIndex2: betType !== 'win' ? selected[1] : undefined,
    horseIndex3: betType === 'trifecta' ? selected[2] : undefined,
  });

  const claim = async () => {
    setClaiming(true);
    try {
      const res = await api.post<{ claimedAmount: number }>('/finance/gamble/horseracing/claim', {});
      addToast(res.claimedAmount > 0
        ? { type: 'success', message: `払戻金 ¥${res.claimedAmount.toLocaleString()} を受け取りました！` }
        : { type: 'info', message: '的中した馬券はありませんでした' });
      fetchMe();
      await loadInfo();
    } catch (e) { toastErr(e); }
    setClaiming(false);
  };

  const placeBet = async () => {
    if (!schedule || !validSelection()) return;
    setActionLoading(true);
    try {
      await api.post('/finance/gamble/horseracing/bet', { ...payload(), raceId: schedule.nextRace.id });
      addToast({ type: 'success', message: '馬券を購入しました。レース後に払戻を受け取れます' });
      setSelected([]);
      fetchMe();
      await loadInfo();
    } catch (e) { toastErr(e); }
    setActionLoading(false);
  };

  const runDemo = async () => {
    if (!validSelection()) return;
    setActionLoading(true);
    setDemoResult(null);
    setManbaken(false);
    setPositions(Array(18).fill(0));
    setCommentary('ゲートが開いた！各馬一斉にスタート！！');
    const stake = bet;

    try {
      const res = await api.post<Omit<DemoResult, 'bet'>>('/finance/gamble/horseracing/demo', payload());
      setRacing(true);
      requestAnimationFrame(() => trackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

      const pos = Array(18).fill(0);
      raceTimer.current = setInterval(() => {
        let maxPos = 0;
        let done = false;
        for (let i = 0; i < 18; i++) {
          let speed = Math.random() * 2.5 + 0.5;
          if (i === res.winner) speed += 1.8;
          else if (i === res.runnerUp) speed += 1.3;
          else if (i === res.thirdPlace) speed += 0.9;
          if (pos[i] > 75 && i === res.winner) speed += 1.0;
          pos[i] = Math.min(100, pos[i] + speed);
          maxPos = Math.max(maxPos, pos[i]);
          if (pos[i] >= 100 && i === res.winner) done = true;
        }
        setPositions([...pos]);
        const phase = [...PHASES].reverse().find(([p]) => maxPos >= p);
        if (maxPos >= 92) setCommentary(`先頭は${res.horses[res.winner].name}！そのままゴールイン！！`);
        else if (phase) setCommentary(phase[1]);

        if (done) {
          clearInterval(raceTimer.current);
          setTimeout(() => {
            setRacing(false);
            setDemoResult({ ...res, bet: stake });
            if (res.payout >= stake * 100) setManbaken(true);
            fetchMe();
          }, 1400);
        }
      }, 120);
    } catch (e) {
      toastErr(e);
      setRacing(false);
    }
    setActionLoading(false);
  };

  if (loading || !schedule) {
    return <div className={kit.game}><div className={styles.loading}><Loader className={kit.spinner} /></div></div>;
  }

  const nextRace = schedule.nextRace;
  const prevRace = schedule.currentRace;
  const myBets = bets.filter((b) => b.race_id === nextRace.id);
  const settled = bets.filter((b) => b.race_id !== nextRace.id && b.status === 'pending');
  const raceTime = new Date(nextRace.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const order = racing ? positions.map((p, i) => [p, i] as const).sort((a, b) => b[0] - a[0]).slice(0, 3) : [];

  return (
    <div className={`${kit.game} ${kit.gameWide}`}>
      <GameHeader icon="🏇" title="Mamazon 競馬" desc="1日6レース（2時間おき）。本番馬券を買うか、デモレースですぐ結果を見られます。" />

      <div className={styles.infoRow}>
        <div className={`${kit.panel} ${styles.info}`}>
          <span className={kit.label}>次のレース</span>
          <b>{raceTime} 発走</b>
        </div>
        <div className={`${kit.panel} ${styles.info}`}>
          <span className={kit.label}>前回の1着</span>
          <b className={styles.prev}>
            <Gate no={prevRace.horses[prevRace.winner].no} small /> {prevRace.horses[prevRace.winner].name}
            <em>{prevRace.horses[prevRace.winner].odds.toFixed(1)}倍</em>
          </b>
        </div>
      </div>

      {settled.length > 0 && (
        <div className={styles.claim}>
          <Trophy size={18} />
          <span>結果が確定した馬券があります</span>
          <button className={kit.ghost} onClick={claim} disabled={claiming}>
            {claiming ? <Loader size={14} className={kit.spinner} /> : '払戻を受け取る'}
          </button>
        </div>
      )}

      {(racing || demoResult) && (
        <section ref={trackRef} className={`${kit.panel} ${styles.race}`}>
          <div className={styles.commentary}>
            <Megaphone size={16} />
            <span key={commentary}>{racing ? commentary : 'ゴール！レース確定'}</span>
          </div>
          <div className={styles.track}>
            <div className={styles.goal} aria-hidden="true"><Flag size={12} /></div>
            {nextRace.horses.map((h, idx) => {
              const p = racing ? positions[idx] : demoResult && [demoResult.winner, demoResult.runnerUp, demoResult.thirdPlace].includes(idx) ? 100 : positions[idx];
              const mine = selected.includes(idx);
              return (
                <div key={idx} className={`${styles.lane} ${mine ? styles.laneMine : ''}`}>
                  <Gate no={h.no} small />
                  <div className={styles.laneTrack}>
                    <span className={styles.runner} style={{ left: `calc(${p}% - ${p * 0.22}px)` }}>🏇</span>
                  </div>
                </div>
              );
            })}
          </div>
          {racing && (
            <div className={styles.leaders}>
              {order.map(([, i], rank) => (
                <span key={i} className={styles.leader}><em>{rank + 1}</em><Gate no={nextRace.horses[i].no} small />{nextRace.horses[i].name}</span>
              ))}
            </div>
          )}
          {!racing && demoResult && (
            <div className={styles.podium}>
              {[demoResult.winner, demoResult.runnerUp, demoResult.thirdPlace].map((i, rank) => (
                <div key={i} className={`${styles.place} ${styles[`p${rank + 1}`]}`}>
                  <span className={styles.placeRank}>{rank + 1}着</span>
                  <Gate no={demoResult.horses[i].no} />
                  <span className={styles.placeName}>{demoResult.horses[i].name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {manbaken && demoResult && (
        <div className={styles.manbaken} onClick={() => setManbaken(false)} role="dialog" aria-modal="true">
          <div className={styles.manbakenCard}>
            <Zap size={40} />
            <h3>万馬券 的中!!</h3>
            <p>+¥{(demoResult.payout - demoResult.bet).toLocaleString()}</p>
            <small>タップして閉じる</small>
          </div>
        </div>
      )}

      {!racing && demoResult && (
        demoResult.payout > 0
          ? <ResultBanner kind="win" big={demoResult.payout >= demoResult.bet * 10} title="的中！" sub={`払戻 ¥${demoResult.payout.toLocaleString()}`} amount={demoResult.payout - demoResult.bet} />
          : <ResultBanner kind="lose" title="ハズレ" sub="次のレースで取り返そう" amount={-demoResult.bet} />
      )}

      {!racing && (
        <section className={`${kit.panel} ${styles.card}`}>
          <div className={kit.segmented} role="tablist">
            {BET_TYPES.map((b) => (
              <button
                key={b.id}
                role="tab"
                aria-selected={betType === b.id}
                className={`${kit.segment} ${betType === b.id ? kit.segmentActive : ''}`}
                onClick={() => { setBetType(b.id); setSelected([]); }}
              >{b.label}</button>
            ))}
          </div>
          <div className={styles.pickSummary}>
            <span className={styles.muted}>{BET_TYPES.find((b) => b.id === betType)!.desc}</span>
            <div className={styles.picked}>
              {Array.from({ length: need }, (_, k) => (
                <span key={k} className={styles.pickSlot}>
                  {selected[k] !== undefined ? <Gate no={nextRace.horses[selected[k]].no} small /> : <i />}
                  {k < need - 1 && <span className={styles.pickSep}>{betType === 'trifecta' ? '→' : '＝'}</span>}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.list} role="listbox" aria-multiselectable={betType !== 'win'}>
            {nextRace.horses.map((h, i) => {
              const pos = selected.indexOf(i);
              const on = pos >= 0;
              const fav = h.odds < 5;
              return (
                <button
                  key={h.no}
                  role="option"
                  aria-selected={on}
                  className={`${styles.row} ${on ? styles.rowOn : ''}`}
                  onClick={() => toggle(i)}
                >
                  <Gate no={h.no} />
                  <span className={styles.name}>{h.name}</span>
                  <span className={`${styles.odds} ${fav ? styles.oddsFav : ''}`}>{h.odds.toFixed(1)}<small>倍</small></span>
                  <span className={`${styles.check} ${on ? styles.checkOn : ''}`}>
                    {on ? (betType === 'trifecta' ? pos + 1 : '✓') : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className={`${kit.panel} ${styles.card}`}>
        {myBets.length > 0 && (
          <div className={styles.myBets}>
            <span className={kit.label}><Ticket size={12} /> 購入済みの馬券（{raceTime}のレース）</span>
            {myBets.map((b) => (
              <div key={b.id} className={styles.myBet}>
                <span className={styles.betKind}>{BET_LABEL[b.bet_type]}</span>
                <span className={styles.betHorses}>
                  <Gate no={nextRace.horses[b.horse_index].no} small />
                  {b.horse_index_2 !== undefined && b.horse_index_2 !== null && <>{b.bet_type === 'trifecta' ? '→' : '＝'}<Gate no={nextRace.horses[b.horse_index_2].no} small /></>}
                  {b.horse_index_3 !== undefined && b.horse_index_3 !== null && <>→<Gate no={nextRace.horses[b.horse_index_3].no} small /></>}
                </span>
                <span className={styles.betAmt}>¥{b.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
        <BetSelector value={bet} onChange={setBet} disabled={actionLoading || racing} />
        <div className={styles.actions}>
          <button className={kit.primary} onClick={placeBet} disabled={actionLoading || racing || bet > balance}>
            {actionLoading ? <Loader size={18} className={kit.spinner} /> : <><Ticket size={18} /> {raceTime}のレースに賭ける</>}
          </button>
          <button className={kit.secondary} onClick={runDemo} disabled={actionLoading || racing || bet > balance}>
            <Zap size={18} /> 今すぐデモレース
          </button>
        </div>
      </section>
    </div>
  );
}
