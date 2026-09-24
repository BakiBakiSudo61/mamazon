import kit from './kit.module.css';

interface Props {
  kind: 'win' | 'lose' | 'push';
  title: string;
  sub?: string;
  /** signed amount displayed on the right */
  amount?: number;
  big?: boolean;
}

const ICON = { win: '🎉', lose: '💸', push: '🤝' } as const;

export function ResultBanner({ kind, title, sub, amount, big }: Props) {
  return (
    <div className={`${kit.result} ${kit[kind]} ${big ? kit.winBig : ''}`} role="status">
      <span className={kit.resultIcon} aria-hidden="true">{ICON[kind]}</span>
      <div>
        <div className={kit.resultTitle}>{title}</div>
        {sub && <div className={kit.resultSub}>{sub}</div>}
      </div>
      {amount !== undefined && (
        <span className={kit.resultAmount}>
          {amount > 0 ? '+' : amount < 0 ? '−' : ''}¥{Math.abs(amount).toLocaleString()}
        </span>
      )}
    </div>
  );
}
