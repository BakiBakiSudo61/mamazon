import { useState } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import styles from './BetSelector.module.css';

export const BET_LIMIT = 1_000_000;

interface Props {
  value: number;
  onChange: (v: number) => void;
  presets?: number[];
  disabled?: boolean;
  label?: string;
  /** server-side cap per bet */
  limit?: number;
}

/** Stake picker: amount field with ½ / 2× / MAX and preset chips. Warns when over balance. */
export function BetSelector({
  value,
  onChange,
  presets = [100, 500, 1000, 5000, 10000],
  disabled,
  label = 'ベット額',
  limit = BET_LIMIT,
}: Props) {
  const balance = Number(useAuthStore((s) => s.user?.finance_balance ?? 0));
  // raw text while the field is being edited; otherwise mirror the value
  const [draft, setDraft] = useState<string | null>(null);

  const cap = Math.max(1, Math.min(limit, balance || limit));
  const set = (n: number) => onChange(Math.max(1, Math.min(limit, Math.floor(n) || 1)));
  const over = value > balance;

  return (
    <div className={`${styles.wrap} ${disabled ? styles.disabled : ''}`}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <span className={`${styles.hint} ${over ? styles.hintWarn : ''}`}>
          {over ? '残高が不足しています' : `残高 ¥${balance.toLocaleString()}`}
        </span>
      </div>
      <div className={`${styles.field} ${over ? styles.fieldWarn : ''}`}>
        <button type="button" className={styles.adj} onClick={() => set(value / 2)} disabled={disabled} aria-label="半分">½</button>
        <label className={styles.inputWrap}>
          <span className={styles.yen}>¥</span>
          <input
            className={styles.input}
            type="text"
            inputMode="numeric"
            value={draft ?? String(value)}
            disabled={disabled}
            onFocus={(e) => { setDraft(String(value)); e.target.select(); }}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, '');
              setDraft(digits);
              if (digits) onChange(Math.min(limit, parseInt(digits, 10)));
            }}
            onBlur={() => { set(parseInt(draft ?? '', 10) || value); setDraft(null); }}
            aria-label={label}
          />
        </label>
        <button type="button" className={styles.adj} onClick={() => set(value * 2)} disabled={disabled} aria-label="2倍">2×</button>
        <button type="button" className={`${styles.adj} ${styles.max}`} onClick={() => set(cap)} disabled={disabled}>MAX</button>
      </div>
      <div className={styles.chips}>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className={`${styles.chip} ${value === p ? styles.chipActive : ''}`}
            onClick={() => set(p)}
            disabled={disabled}
          >
            {p >= 10000 ? `${p / 10000}万` : p.toLocaleString()}
          </button>
        ))}
      </div>
    </div>
  );
}
