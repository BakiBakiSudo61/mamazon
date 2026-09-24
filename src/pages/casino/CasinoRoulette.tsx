import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { GameHeader } from '../../components/finance/ui/GameHeader';
import { BetSelector } from '../../components/finance/ui/BetSelector';
import { ResultBanner } from '../../components/finance/ui/ResultBanner';
import kit from '../../components/finance/ui/kit.module.css';
import styles from './CasinoRoulette.module.css';

const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const SEG = 360 / WHEEL.length;
const numColor = (n: number) => (n === 0 ? 'green' : REDS.includes(n) ? 'red' : 'black');
const COLORS = { red: '#d4343f', black: '#1b1d24', green: '#1f9d5a' } as const;

type BetType = 'color' | 'parity' | 'half' | 'dozen' | 'column' | 'number';
type Choice = { value: string | number; label: string; mult: number; tone?: 'red' | 'black' };

const BET_TYPES: [BetType, string][] = [
  ['color', '赤/黒'], ['parity', '奇/偶'], ['half', '前/後半'], ['dozen', 'ダズン'], ['column', '列'], ['number', '番号'],
];
const CHOICES: Record<Exclude<BetType, 'number'>, Choice[]> = {
  color: [{ value: 'red', label: '赤', mult: 2, tone: 'red' }, { value: 'black', label: '黒', mult: 2, tone: 'black' }],
  parity: [{ value: 'odd', label: '奇数', mult: 2 }, { value: 'even', label: '偶数', mult: 2 }],
  half: [{ value: 'low', label: '1–18', mult: 2 }, { value: 'high', label: '19–36', mult: 2 }],
  dozen: [{ value: 1, label: '1–12', mult: 3 }, { value: 2, label: '13–24', mult: 3 }, { value: 3, label: '25–36', mult: 3 }],
  column: [{ value: 1, label: '1列目', mult: 3 }, { value: 2, label: '2列目', mult: 3 }, { value: 3, label: '3列目', mult: 3 }],
};
const DEFAULT_VALUE: Record<BetType, string | number> = { color: 'red', parity: 'odd', half: 'low', dozen: 1, column: 1, number: 17 };

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
}

function Wheel({ rotation }: { rotation: number }) {
  return (
    <svg viewBox="0 0 200 200" className={styles.wheelSvg} style={{ transform: `rotate(${rotation}deg)` }} aria-hidden="true">
      <circle cx="100" cy="100" r="99" fill="#3b2a12" />
      <circle cx="100" cy="100" r="95" fill="#1a1208" />
      {WHEEL.map((n, i) => {
        const [x1, y1] = polar(92, i * SEG);
        const [x2, y2] = polar(92, (i + 1) * SEG);
        const [x3, y3] = polar(62, (i + 1) * SEG);
        const [x4, y4] = polar(62, i * SEG);
        const [tx, ty] = polar(82, i * SEG + SEG / 2);
        return (
          <g key={n}>
            <path d={`M${x1},${y1} A92,92 0 0,1 ${x2},${y2} L${x3},${y3} A62,62 0 0,0 ${x4},${y4} Z`} fill={COLORS[numColor(n)]} stroke="#c9a45c" strokeWidth="0.4" />
            <text x={tx} y={ty} fill="#fff" fontSize="6.4" fontWeight="700" textAnchor="middle" dominantBaseline="central"
              transform={`rotate(${i * SEG + SEG / 2} ${tx} ${ty})`}>{n}</text>
          </g>
        );
      })}
      <circle cx="100" cy="100" r="62" fill="url(#rw-hub)" stroke="#c9a45c" strokeWidth="0.8" />
      <defs>
        <radialGradient id="rw-hub" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#5a4424" />
          <stop offset="100%" stopColor="#20160a" />
        </radialGradient>
      </defs>
      {[0, 45, 90, 135].map((a) => {
        const [x1, y1] = polar(40, a); const [x2, y2] = polar(40, a + 180);
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9a45c" strokeWidth="2.4" strokeLinecap="round" />;
      })}
      <circle cx="100" cy="100" r="9" fill="#e7c67a" />
    </svg>
  );
}

export function CasinoRoulette() {
  const { user, fetchMe } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [amount, setAmount] = useState(1000);
  const [betType, setBetType] = useState<BetType>('color');
  const [betValue, setBetValue] = useState<string | number>('red');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ num: number; color: string; win: boolean; payout: number; bet: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const rotRef = useRef(0);

  const balance = Number(user?.finance_balance ?? 0);

  const spin = async () => {
    if (spinning || amount > balance) return;
    setSpinning(true);
    setResult(null);
    const bet = amount;
    try {
      const res = await api.post<{ result: number; resultColor: string; win: boolean; payout: number }>(
        '/finance/gamble/roulette', { amount: bet, betType, betValue }
      );
      const idx = WHEEL.indexOf(res.result);
      const target = -(idx * SEG + SEG / 2);
      const current = rotRef.current;
      const delta = (((target - current) % 360) + 360) % 360;
      const next = current + 360 * 5 + delta;
      rotRef.current = next;
      setRotation(next);
      setTimeout(() => {
        setResult({ num: res.result, color: res.resultColor, win: res.win, payout: res.payout, bet });
        setHistory((h) => [res.result, ...h].slice(0, 16));
        setSpinning(false);
        fetchMe();
      }, 4300);
    } catch (err) {
      setSpinning(false);
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'エラーが発生しました' });
    }
  };

  const mult = betType === 'number' ? 36 : CHOICES[betType].find((c) => c.value === betValue)?.mult ?? 2;

  return (
    <div className={`${kit.game} ${kit.gameWide}`}>
      <GameHeader icon="🎡" title="ルーレット" desc="ヨーロピアン（0が1つ）。0が出ると番号賭け以外は負けになります。" />

      <section className={`${kit.panel} ${styles.stage}`}>
        <div className={styles.wheelWrap}>
          <div className={styles.pointer} aria-hidden="true" />
          <div className={`${styles.wheel} ${spinning ? styles.wheelSpinning : ''}`}>
            <Wheel rotation={rotation} />
          </div>
          <div className={`${styles.readout} ${result ? styles[`r_${result.color}`] : ''}`}>
            {result ? result.num : spinning ? '' : '?'}
          </div>
        </div>
        <div className={styles.history} aria-label="出目の履歴">
          {history.length === 0
            ? <span className={styles.historyEmpty}>出目の履歴</span>
            : history.map((n, i) => <span key={`${i}-${n}`} className={`${styles.hDot} ${styles[`r_${numColor(n)}`]}`}>{n}</span>)}
        </div>
      </section>

      {result && (
        result.win
          ? <ResultBanner kind="win" big={result.payout >= result.bet * 10} title={`${result.num} で的中！`} sub={`払戻 ¥${result.payout.toLocaleString()}`} amount={result.payout - result.bet} />
          : <ResultBanner kind="lose" title={`${result.num}（${result.color === 'red' ? '赤' : result.color === 'black' ? '黒' : '緑'}）`} sub="ハズレ" amount={-result.bet} />
      )}

      <section className={`${kit.panel} ${styles.controls}`}>
        <div className={kit.segmented} role="tablist" aria-label="ベット方法">
          {BET_TYPES.map(([t, l]) => (
            <button
              key={t}
              role="tab"
              aria-selected={betType === t}
              className={`${kit.segment} ${betType === t ? kit.segmentActive : ''}`}
              onClick={() => { setBetType(t); setBetValue(DEFAULT_VALUE[t]); }}
              disabled={spinning}
            >{l}</button>
          ))}
        </div>

        {betType === 'number' ? (
          <div className={styles.board}>
            <button
              className={`${styles.num} ${styles.zero} ${betValue === 0 ? styles.numActive : ''}`}
              onClick={() => setBetValue(0)}
              disabled={spinning}
            >0</button>
            {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`${styles.num} ${styles[`n_${numColor(n)}`]} ${betValue === n ? styles.numActive : ''}`}
                onClick={() => setBetValue(n)}
                disabled={spinning}
              >{n}</button>
            ))}
          </div>
        ) : (
          <div className={styles.choices}>
            {CHOICES[betType].map((c) => (
              <button
                key={String(c.value)}
                className={`${styles.choice} ${c.tone ? styles[`c_${c.tone}`] : ''} ${betValue === c.value ? styles.choiceActive : ''}`}
                onClick={() => setBetValue(c.value)}
                disabled={spinning}
              >
                <span>{c.label}</span>
                <small>×{c.mult}</small>
              </button>
            ))}
          </div>
        )}

        <BetSelector value={amount} onChange={setAmount} presets={[500, 1000, 5000, 10000, 50000]} disabled={spinning} />

        <button className={`${kit.primary} ${kit.block}`} onClick={spin} disabled={spinning || amount > balance}>
          {spinning ? '回転中…' : `SPIN ・ ${betType === 'number' ? `${betValue}番` : CHOICES[betType].find((c) => c.value === betValue)?.label} ×${mult}`}
        </button>
      </section>
    </div>
  );
}
