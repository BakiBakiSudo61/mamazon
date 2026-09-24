import { FinanceShell } from '../components/finance/ui/FinanceShell';
import { Market } from '../components/finance/Market';

export function MarketPage() {
  return (
    <FinanceShell title="Market" tone="green" backTo="/finance" backLabel="ファイナンス">
      <Market />
    </FinanceShell>
  );
}
