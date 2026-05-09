import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Loader, Trophy, Megaphone, Zap } from 'lucide-react';
import styles from './HorseRacing.module.css';

const BET_PRESETS = [100, 500, 1000, 5000];

export function HorseRacing() {
  const { user, fetchMe } = useAuthStore();
  const [betAmount, setBetAmount] = useState(100);
  const [betType, setBetType] = useState<'win' | 'quinella'>('win');
  const [selectedHorses, setSelectedHorses] = useState<number[]>([]);
  
  const [schedule, setSchedule] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Racing Animation State
  const [racing, setRacing] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [horsePositions, setHorsePositions] = useState<number[]>(Array(18).fill(0));
  const [commentary, setCommentary] = useState<string>('各馬、ゲートに収まりました...');
  const [showManbaken, setShowManbaken] = useState(false);

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

  const handleHorseToggle = (idx: number) => {
    if (betType === 'win') {
      setSelectedHorses([idx]);
    } else {
      // Quinella: max 2
      if (selectedHorses.includes(idx)) {
        setSelectedHorses(selectedHorses.filter(i => i !== idx));
      } else {
        if (selectedHorses.length < 2) {
          setSelectedHorses([...selectedHorses, idx]);
        } else {
          // Replace the oldest one
          setSelectedHorses([selectedHorses[1], idx]);
        }
      }
    }
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
    if (betType === 'win' && selectedHorses.length !== 1) return alert('馬を1頭選んでください');
    if (betType === 'quinella' && selectedHorses.length !== 2) return alert('馬を2頭選んでください');

    setActionLoading(true);
    try {
      await api.post('/finance/gamble/horseracing/bet', {
        amount: betAmount,
        betType,
        horseIndex: selectedHorses[0],
        horseIndex2: betType === 'quinella' ? selectedHorses[1] : undefined,
        raceId: schedule.nextRace.id
      });
      alert('馬券を購入しました！レース後に結果を確認してください。');
      setSelectedHorses([]);
      fetchMe();
      await loadInfo();
    } catch (e: any) {
      alert(e.message || 'エラーが発生しました');
    }
    setActionLoading(false);
  };

  const runDemo = async () => {
    if (betType === 'win' && selectedHorses.length !== 1) return alert('馬を1頭選んでください');
    if (betType === 'quinella' && selectedHorses.length !== 2) return alert('馬を2頭選んでください');

    setActionLoading(true);
    setDemoResult(null);
    setShowManbaken(false);
    setHorsePositions(Array(18).fill(0));
    setCommentary('ゲートが開いた！各馬一斉にスタート！！');
    
    try {
      const res = await api.post<{ winner: number, runnerUp: number, payout: number, horses: any[] }>('/finance/gamble/horseracing/demo', {
        amount: betAmount,
        betType,
        horseIndex: selectedHorses[0],
        horseIndex2: betType === 'quinella' ? selectedHorses[1] : undefined
      });
      
      setRacing(true);
      
      const interval = setInterval(() => {
        setHorsePositions(prev => {
          const next = [...prev];
          let maxPos = 0;
          let done = false;

          for (let i = 0; i < 18; i++) {
            // winner and runnerUp are faster on average
            let speed = Math.random() * 5 + 1;
            if (i === res.winner) speed += 3.5;
            if (i === res.runnerUp) speed += 2.5;

            // Late spurt
            if (next[i] > 70 && i === res.winner) speed += 2; 

            next[i] = Math.min(100, next[i] + speed);
            if (next[i] > maxPos) maxPos = next[i];
            if (next[i] >= 100 && i === res.winner) done = true;
          }

          // Commentary update
          if (maxPos > 20 && maxPos < 50) setCommentary('向正面に差し掛かりました。隊列は激しく入れ替わる！');
          if (maxPos >= 50 && maxPos < 75) setCommentary('第3コーナーから第4コーナーへ！各馬仕掛けていく！');
          if (maxPos >= 75 && maxPos < 95) setCommentary('最後の直線！激しい叩き合いだ！！');
          if (maxPos >= 95) setCommentary(`先頭は${res.horses[res.winner].name}だ！そのままゴールイン！！`);

          if (done) {
            clearInterval(interval);
            setTimeout(() => {
              setRacing(false);
              setDemoResult(res);
              if (res.payout >= betAmount * 100) {
                setShowManbaken(true);
              }
              fetchMe();
            }, 1000);
          }
          return next;
        });
      }, 200);
      
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
          <p className={styles.infoValue}>1着: {prevRace.horses[prevRace.winner].no}番 <span className={styles.oddsBadge}>{prevRace.horses[prevRace.winner].odds.toFixed(1)}倍</span></p>
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
        <div className={styles.racingContainer}>
          <div className={styles.commentaryBox}>
            <Megaphone size={18} />
            <span>実況: {commentary}</span>
          </div>
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
        </div>
      )}

      {/* Manbaken Flash! */}
      {showManbaken && (
        <div className={styles.manbakenOverlay}>
          <div className={styles.manbakenText}>
            <Zap size={48} />
            万馬券 的中!!
            <Zap size={48} />
          </div>
          <p>払戻金: ¥{demoResult?.payout.toLocaleString()}</p>
        </div>
      )}

      {!racing && demoResult && !showManbaken && (
        <div className={`${styles.result} ${demoResult.payout > 0 ? styles.win : styles.lose}`}>
          {demoResult.payout > 0 
            ? <><Trophy size={20} /> 的中！ +¥{demoResult.payout.toLocaleString()}</>
            : `💸 ハズレ — 1着: ${demoResult.horses[demoResult.winner].name} / 2着: ${demoResult.horses[demoResult.runnerUp].name}`
          }
        </div>
      )}

      {!racing && (
        <>
          <div className={styles.betTypeSelector}>
            <button 
              className={`${styles.betTypeBtn} ${betType === 'win' ? styles.betTypeActive : ''}`}
              onClick={() => { setBetType('win'); setSelectedHorses([]); }}
            >
              単勝 (1着を当てる)
            </button>
            <button 
              className={`${styles.betTypeBtn} ${betType === 'quinella' ? styles.betTypeActive : ''}`}
              onClick={() => { setBetType('quinella'); setSelectedHorses([]); }}
            >
              馬連 (1・2着を順不同で当てる)
            </button>
          </div>

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
                {nextRace.horses.map((h: any, i: number) => {
                  const isSelected = selectedHorses.includes(i);
                  return (
                    <tr key={h.no} className={isSelected ? styles.selectedRow : ''} onClick={() => handleHorseToggle(i)}>
                      <td className={styles.tdCenter}>
                        <div className={styles.umaBan}>{h.no}</div>
                      </td>
                      <td className={styles.tdName}>{h.name}</td>
                      <td className={styles.tdOdds}>{h.odds.toFixed(1)}</td>
                      <td className={styles.tdCenter}>
                        <div className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ''}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className={styles.controls}>
        {myBets.length > 0 && (
          <div className={styles.myBets}>
            <p className={styles.myBetsTitle}>購入済みの馬券 (次レース)</p>
            <ul>
              {myBets.map((b: any) => (
                <li key={b.id}>
                  {b.bet_type === 'win' ? '単勝' : '馬連'} - 
                  {b.bet_type === 'win' 
                    ? ` ${nextRace.horses[b.horse_index].no}番` 
                    : ` ${nextRace.horses[b.horse_index].no}番 ＝ ${nextRace.horses[b.horse_index_2].no}番`}
                  : ¥{b.amount.toLocaleString()}
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
