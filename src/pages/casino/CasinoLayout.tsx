import { Outlet, useLocation } from 'react-router-dom';
import { FinanceShell } from '../../components/finance/ui/FinanceShell';

export function CasinoLayout() {
  const location = useLocation();
  const isLobby = /^\/finance\/casino\/?$/.test(location.pathname);

  return (
    <FinanceShell
      title="Casino"
      tone="violet"
      backTo={isLobby ? '/finance' : '/finance/casino'}
      backLabel={isLobby ? 'ファイナンス' : 'ロビー'}
    >
      <Outlet />
    </FinanceShell>
  );
}
