import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Loader } from 'lucide-react';
import styles from './HorseRacing.module.css';

const BET_PRESETS = [100, 500, 1000, 5000];

export function HorseRacing() {
  const { user, fetchMe } = useAuthStore();
  const [betAmount, setBetAmount] = useState(100);
  const [selectedHorse, setSelectedHorse] = useState(0);
  
  const [schedule, setSchedule] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [racing, setRacing] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [horsePositions, setHorsePositions] = useState<number[]>(Array(18).fill(0));

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    try {
      const res = await api.get<{ schedule: any, bets: any[] }>('/finance/gamble/horseracing/info');
      setSchedule(res.schedule);
      setBets(res.bets);
    } catch {}
    setLoading(false);
  };

  const claim = async () => {
    setClaiming(true);
    try {
      const res = await api.post<{ claimedAmount: number }>('/finance/gamble/horseracing/claim', {});
      if (res.claimedAmount > 0) {
        alert(`おめでとうございます！ 払戻金 ¥${res.claimedAmount.toLocaleString()} を受け取りました！`);
      } else {
        alert('的中した馬券はありませんでした。');
      }
      fetchMe();
      await loadInfo();
    } catch {}
    setClaiming(false);
  };

  const placeBet = async () => {
    if (!schedule) return;
    setActionLoading(true);
    try {
      await api.post('/finance/gamble/horseracing/bet', {
        amount: betAmount,
        horseIndex: selectedHorse,
        raceId: schedule.nextRace.id
      });
      alert('馬券を購入しました！レース後に結果を確認してください。');
      fetchMe();
      await loadInfo();
    } catch (e: any) {
      alert(e.message || 'エラーが発生しました');
    }
    setActionLoading(false);
  };

  const runDemo = async () => {
    setActionLoading(true);
    setDemoResult(null);
    setHorsePositions(Array(18).fill(0));
    try {
      const res = await api.post<{ winner: number, payout: number }>('/finance/gamble/horseracing/demo', {
        amount: betAmount,
        horseIndex: selectedHorse
      });
      setRacing(true);
      
      const interval = setInterval(() => {
        setHorsePositions(prev => {
          const next = [...prev];
          let done = false;
          for (let i = 0; i < 18; i++) {
            const speed = i === res.winner ? Math.random() * 8 + 4 : Math.random() * 6 + 2;
            next[i] = Math.min(100, next[i] + speed);
            if (next[i] >= 100 && i === res.winner) done = true;
          }
          if (done) {
            clearInterval(interval);
            setTimeout(() => {
              setRacing(false);
              setDemoResult(res);
              fetchMe();
            }, 1000);
          }
          return next;
        });
      }, 150);
      
    } catch (e: any) {
      alert(e.message || 'エラーが発生しました');
      setRacing(false);
    }
    setActionLoading(false);
  };

  if (loading || !schedule) return <div className={styles.game}><Loader className={styles.spin} style={{ margin: 'auto' }} /></div>;

  const nextRace = schedule.nextRace;
  const prevRace = schedule.currentRace;
  const myBets = bets.filter(b => b.race_id === nextRace.id);
  const unclaimableBets = bets.filter(b => b.race_id !== nextRace.id && b.status === 'pending');

  return (
    <div className={styles.game}>
      <h2 className={styles.title}>🏇 MAMAZON 競馬</h2>
      <p className={styles.desc}>1日6レース開催（2時間おき）本格シミュレーション</p>
      
      <div className={styles.infoBanner}>
        <div className={styles.infoBlock}>
          <p className={styles.infoLabel}>次回のレース</p>
          <p className={styles.infoValue}>{new Date(nextRace.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 発走</p>
        </div>
        <div className={styles.infoBlock}>
          <p className={styles.infoLabel}>前回の結果</p>
          <p className={styles.infoValue}>1着: {prevRace.horses[prevRace.winner].no}番 {prevRace.horses[prevRace.winner].name} <span className={styles.oddsBadge}>{prevRace.horses[prevRace.winner].odds.toFixed(1)}倍</span></p>
        </div>
      </div>

      {unclaimableBets.length > 0 && (
        <div className={styles.claimBanner}>
          <p>結果が確定した馬券があります！</p>
          <button onClick={claim} disabled={claiming} className={styles.claimBtn}>
            {claiming ? <Loader size={14} className={styles.spin} /> : '結果を確認して払戻金を受け取る'}
          </button>
        </div>
      )}

      {/* Track animation for demo */}
      {racing && (
        <div className={styles.trackArea}>
          <div className={styles.goalLine} />
          {nextRace.horses.map((horse: any, idx: number) => (
            <div key={idx} className={styles.trackLine}>
              <div className={styles.trackNum}>{horse.no}</div>
              <div className={styles.trackBg}>
                <div 
                  className={styles.horseWrap} 
                  style={{ 
                    left: `${horsePositions[idx]}%`, 
                    transform: `translateX(-${horsePositions[idx]}%)` 
                  }}
                >
                  <div className={styles.horse}>🐎</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!racing && demoResult && (
        <div className={`${styles.result} ${demoResult.payout > 0 ? styles.win : styles.lose}`}>
          {demoResult.payout > 0 
            ? `🏆 的中！ +¥${demoResult.payout.toLocaleString()}` 
            : `💸 ハズレ — 1着は ${nextRace.horses[demoResult.winner].name} でした`
          }
        </div>
      )}

      {!racing && (
        <div className={styles.horseTableWrap}>
          <table className={styles.horseTable}>
            <thead>
              <tr>
                <th>馬番</th>
                <th>馬名</th>
                <th>単勝オッズ</th>
                <th>予想</th>
              </tr>
            </thead>
            <tbody>
              {nextRace.horses.map((h: any, i: number) => (
                <tr key={h.no} className={selectedHorse === i ? styles.selectedRow : ''} onClick={() => setSelectedHorse(i)}>
                  <td className={styles.tdCenter}>
                    <div className={styles.umaBan}>{h.no}</div>
                  </td>
                  <td className={styles.tdName}>{h.name}</td>
                  <td className={styles.tdOdds}>{h.odds.toFixed(1)}</td>
                  <td className={styles.tdCenter}>
                    <div className={`${styles.radio} ${selectedHorse === i ? styles.radioChecked : ''}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.controls}>
        {myBets.length > 0 && (
          <div className={styles.myBets}>
            <p className={styles.myBetsTitle}>購入済みの馬券 (次レース)</p>
            <ul>
              {myBets.map((b: any) => (
                <li key={b.id}>
                  単勝 {nextRace.horses[b.horse_index].no}番 {nextRace.horses[b.horse_index].name} : ¥{b.amount.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.chips}>
          {BET_PRESETS.map(v => (
            <button
              key={v}
              className={`${styles.chip} ${betAmount === v ? styles.chipActive : ''}`}
              onClick={() => setBetAmount(v)}
              disabled={actionLoading || racing}
            >
              ¥{v.toLocaleString()}
            </button>
          ))}
          <input
            type="number"
            min="100"
            step="100"
            value={betAmount}
            onChange={e => setBetAmount(Number(e.target.value))}
            className={styles.betInput}
            disabled={actionLoading || racing}
          />
        </div>
        
        <div className={styles.actionButtons}>
          <button 
            className={styles.betBtn} 
            onClick={placeBet} 
            disabled={actionLoading || racing}
          >
            {actionLoading ? <Loader size={18} className={styles.spin} /> : `本番馬券を購入`}
          </button>
          <button 
            className={styles.demoBtn} 
            onClick={runDemo} 
            disabled={actionLoading || racing}
            title="すぐに結果がわかるデモレースを実行します"
          >
            デモレースをすぐ実行
          </button>
        </div>
        
        <p className={styles.balanceNote}>残高: ¥{(user?.finance_balance ?? 0).toLocaleString()}</p>
      </div>
    </div>
  );
}
