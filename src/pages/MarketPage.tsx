import { Market } from '../components/finance/Market';
import styles from './MarketPage.module.css';

export function MarketPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Market />
      </div>
    </div>
  );
}