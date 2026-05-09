import type { Env } from '../types';
import { getSession } from '../middleware/auth';

interface Asset {
  id: string;
  name: string;
  type: 'stock' | 'crypto';
  basePrice: number;
  volatility: number;
  description: string;
  hasHalving?: boolean;
}

const MARKET_ASSETS: Asset[] = [
  // ─── 株式 ───────────────────────────────────────────────────────────
  { id: 'MMZN', name: 'Mamazon Inc',  type: 'stock',  basePrice: 18500,      volatility: 0.12, description: 'EC・クラウドの巨人' },
  { id: 'PEAR', name: 'Pear Corp',    type: 'stock',  basePrice: 22000,      volatility: 0.10, description: 'プレミアム消費者電子機器' },
  { id: 'MCHD', name: 'Microhard',    type: 'stock',  basePrice: 41000,      volatility: 0.09, description: 'クラウド・AI・OS' },
  { id: 'GOGL', name: 'Googol Corp',  type: 'stock',  basePrice: 19500,      volatility: 0.11, description: '検索・広告・クラウド' },
  { id: 'NVDX', name: 'NvidiaX',      type: 'stock',  basePrice: 148000,     volatility: 0.18, description: 'GPU・AI半導体リーダー' },
  // ─── 仮想通貨 ────────────────────────────────────────────────────────
  { id: 'BTK',  name: 'BitToken',     type: 'crypto', basePrice: 14000000,   volatility: 0.35, description: 'デジタルゴールド。30日周期の半減期あり', hasHalving: true },
  { id: 'ETB',  name: 'EtherBlast',   type: 'crypto', basePrice: 380000,     volatility: 0.45, description: 'スマートコントラクト基盤' },
  { id: 'SLC',  name: 'SolarChain',   type: 'crypto', basePrice: 22000,      volatility: 0.65, description: '超高速ブロックチェーン' },
  { id: 'DMC',  name: 'DogeMeme',     type: 'crypto', basePrice: 30,         volatility: 1.20, description: 'ミームコイン。予測不能な急騰急落' },
  { id: 'MMC',  name: 'MamaCoin',     type: 'crypto', basePrice: 100,        volatility: 0.50, description: 'Mamazon独自仮想通貨' },
  { id: 'PPC',  name: 'PepeChain',    type: 'crypto', basePrice: 15,         volatility: 2.00, description: '伝説のミームコイン。ただ暴れる' },
];

/** Wang hash — deterministic pseudo-random 0..1 from any 32-bit integer */
function wang32(n: number): number {
  n = n | 0;
  n = ((n >>> 16) ^ n) * 0x45d9f3b | 0;
  n = ((n >>> 16) ^ n) * 0x45d9f3b | 0;
  n = (n >>> 16) ^ n;
  return (n >>> 0) / 4294967296;
}

// Helper to calculate price pseudo-randomly based on time
function getPriceAtTime(asset: Asset, time: number): number {
  // Derive per-asset seed from id
  let baseSeed = 0;
  for (let i = 0; i < asset.id.length; i++) baseSeed = (baseSeed * 31 + asset.id.charCodeAt(i)) | 0;

  const phaseOffset = wang32(baseSeed) * Math.PI * 2;
  const t = time / 1000; // seconds

  // Multi-period trend (sine waves at different timescales)
  const trend =
    Math.sin(t / (86400 * 30) * Math.PI * 2 + phaseOffset) * 0.35 +        // monthly
    Math.cos(t / (86400 * 14) * Math.PI * 2 + phaseOffset * 1.4) * 0.18 +  // bi-weekly
    Math.sin(t / (86400 *  7) * Math.PI * 2 + phaseOffset * 2.1) * 0.20 +  // weekly
    Math.sin(t / (86400 *  3) * Math.PI * 2 + phaseOffset * 5.2) * 0.15 +  // 3-day
    Math.sin(t /  86400       * Math.PI * 2 + phaseOffset * 3.7) * 0.12;   // daily

  // Per-window noise (1 min for crypto, 5 min for stocks)
  const windowMs = asset.type === 'crypto' ? 60_000 : 300_000;
  const w = Math.floor(time / windowMs) | 0;
  const noise = (wang32((w * 997 + baseSeed) | 0) - 0.5) * 0.5;

  let mult = 1 + (trend + noise) * asset.volatility;
  mult = Math.max(0.15, Math.min(6, mult));

  let price = Math.round(asset.basePrice * mult);

  // Halving effect for BTK: 30-day cycle
  if (asset.hasHalving) {
    const halvingCycleMs = 30 * 24 * 60 * 60 * 1000;
    const phase = (time % halvingCycleMs) / halvingCycleMs;
    if (phase > 0.80) {
      // Pre-halving pump: up to +80% in last 20% of cycle
      price = Math.round(price * (1 + ((phase - 0.80) / 0.20) * 0.80));
    } else if (phase < 0.15) {
      // Post-halving momentum: up to +40% in first 15%
      price = Math.round(price * (1 + ((0.15 - phase) / 0.15) * 0.40));
    }
  }

  return Math.max(1, price);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Auto-migrate helper
async function ensureSchema(env: Env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_assets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        avg_buy_price REAL NOT NULL DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    await env.DB.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_assets_user_asset ON user_assets(user_id, asset_id)
    `).run();
  } catch (_) { /* already exists */ }
  try {
    await env.DB.prepare(`ALTER TABLE users ADD COLUMN finance_balance TEXT DEFAULT '10000'`).run();
  } catch (_) { /* column already exists */ }
  try {
    await env.DB.prepare(`UPDATE users SET finance_balance = '10000' WHERE finance_balance IS NULL OR finance_balance = ''`).run();
  } catch (_) { /* ignore */ }
}

export async function handleFinance(path: string, request: Request, env: Env, session: { userId: string } | null): Promise<Response | null> {
  // Ensure schema
  await ensureSchema(env);

  if (!session) {
    return json({ error: '認証が必要です' }, 401);
  }

  const userId = session.userId;

  if (request.method === 'POST') {
    // --- Casino: High & Low ---
    if (path === '/finance/gamble/highlow') {
      const { amount, guess, currentCard } = await request.json() as { amount: number, guess: 'high' | 'low', currentCard: number };
      if (amount <= 0) return json({ error: '無効な金額です' }, 400);

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');
      if (!user || finBal < amount) {
        return json({ error: 'ファイナンス残高が不足しています' }, 400);
      }

      // Draw a new card (1-13)
      const newCard = Math.floor(Math.random() * 13) + 1;
      
      let win = false;
      let draw = false;
      if (newCard === currentCard) {
        draw = true;
      } else if (guess === 'high' && newCard > currentCard) {
        win = true;
      } else if (guess === 'low' && newCard < currentCard) {
        win = true;
      }

      let newBalance = finBal;
      let payout = 0;
      if (win) {
        payout = amount * 2;
        newBalance += amount;
      } else if (draw) {
        payout = amount;
      } else {
        newBalance -= amount;
      }

      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ newCard, result: win ? 'win' : draw ? 'draw' : 'lose', payout, newBalance });
    }

    // --- Casino: Slots ---
    if (path === '/finance/gamble/slots') {
      const { amount } = await request.json() as { amount: number };
      if (amount <= 0) return json({ error: '無効な金額です' }, 400);

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');
      if (!user || finBal < amount) {
        return json({ error: 'ファイナンス残高が不足しています' }, 400);
      }

      const symbols = ['🍎', '🍇', '🍒', '🔔', '💎', '7️⃣'];
      const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
      const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
      const reel3 = symbols[Math.floor(Math.random() * symbols.length)];
      
      let multiplier = 0;
      if (reel1 === reel2 && reel2 === reel3) {
        if (reel1 === '7️⃣') multiplier = 50;
        else if (reel1 === '💎') multiplier = 20;
        else multiplier = 10;
      } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        multiplier = 2;
      }

      const newBalance = finBal - amount + (amount * multiplier);
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ reels: [reel1, reel2, reel3], multiplier, payout: amount * multiplier, newBalance });
    }

    // --- Casino: Horse Racing ---
    if (path === '/finance/gamble/horseracing') {
      const { amount, horseIndex } = await request.json() as { amount: number, horseIndex: number };
      if (amount <= 0 || horseIndex < 0 || horseIndex > 4) return json({ error: '無効なリクエストです' }, 400);

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');
      if (!user || finBal < amount) {
        return json({ error: 'ファイナンス残高が不足しています' }, 400);
      }

      // 5 horses with odds
      const odds = [2.0, 3.5, 5.0, 10.0, 20.0];
      const weights = odds.map(o => 1 / o);
      const totalWeight = weights.reduce((a,b) => a+b, 0);
      let r = Math.random() * totalWeight;
      let winningHorse = 0;
      for (let i=0; i<weights.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          winningHorse = i;
          break;
        }
      }

      let payout = 0;
      if (winningHorse === horseIndex) {
        payout = Math.floor(amount * odds[horseIndex]);
      }

      const newBalance = finBal - amount + payout;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ winningHorse, payout, newBalance });
    }

    // --- Mine Crypto ---
    if (path === '/finance/mine') {
      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      if (!user) return json({ error: 'ユーザーが見つかりません' }, 404);

      const minedAmount = Math.floor(Math.random() * 401) + 100; // 100 ~ 500
      const newBalance = parseInt(user.finance_balance || '0') + minedAmount;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ minedAmount, newBalance });
    }

    // --- Market: Buy ---
    if (path === '/finance/market/buy') {
      const { assetId, quantity } = await request.json() as { assetId: string, quantity: number };
      const asset = MARKET_ASSETS.find(a => a.id === assetId);
      if (!asset || quantity <= 0) return json({ error: '無効なリクエストです' }, 400);

      const currentPrice = getPriceAtTime(asset, Date.now());
      const totalCost = currentPrice * quantity;

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');
      if (!user || finBal < totalCost) {
        return json({ error: 'ファイナンス残高が不足しています' }, 400);
      }

      // Check existing portfolio
      const existing = await env.DB.prepare('SELECT * FROM user_assets WHERE user_id = ? AND asset_id = ?').bind(userId, assetId).first<{ quantity: number, avg_buy_price: number }>();
      
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        const newAvgPrice = ((existing.quantity * existing.avg_buy_price) + totalCost) / newQuantity;
        await env.DB.prepare('UPDATE user_assets SET quantity = ?, avg_buy_price = ? WHERE user_id = ? AND asset_id = ?')
          .bind(newQuantity, newAvgPrice, userId, assetId).run();
      } else {
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO user_assets (id, user_id, asset_id, quantity, avg_buy_price) VALUES (?, ?, ?, ?, ?)')
          .bind(id, userId, assetId, quantity, currentPrice).run();
      }

      const newBalance = finBal - totalCost;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ success: true, newBalance, assetId, quantity, price: currentPrice });
    }

    // --- Market: Sell ---
    if (path === '/finance/market/sell') {
      const { assetId, quantity } = await request.json() as { assetId: string, quantity: number };
      const asset = MARKET_ASSETS.find(a => a.id === assetId);
      if (!asset || quantity <= 0) return json({ error: '無効なリクエストです' }, 400);

      const existing = await env.DB.prepare('SELECT * FROM user_assets WHERE user_id = ? AND asset_id = ?').bind(userId, assetId).first<{ quantity: number }>();
      if (!existing || existing.quantity < quantity) {
        return json({ error: '保有数が不足しています' }, 400);
      }

      const currentPrice = getPriceAtTime(asset, Date.now());
      const totalEarned = currentPrice * quantity;

      const newQuantity = existing.quantity - quantity;
      if (newQuantity === 0) {
        await env.DB.prepare('DELETE FROM user_assets WHERE user_id = ? AND asset_id = ?').bind(userId, assetId).run();
      } else {
        await env.DB.prepare('UPDATE user_assets SET quantity = ? WHERE user_id = ? AND asset_id = ?').bind(newQuantity, userId, assetId).run();
      }

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const newBalance = parseInt(user?.finance_balance || '0') + totalEarned;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ success: true, newBalance, assetId, quantity, price: currentPrice, earned: totalEarned });
    }

    // --- Deposit: Mamazon Shopping Balance → Finance Balance ---
    if (path === '/finance/deposit') {
      const { amount } = await request.json() as { amount: number };
      if (amount <= 0) return json({ error: '無効な金額です' }, 400);

      const user = await env.DB.prepare('SELECT balance, finance_balance FROM users WHERE id = ?')
        .bind(userId).first<{ balance: string; finance_balance: string }>();
      if (!user) return json({ error: 'ユーザーが見つかりません' }, 404);

      const shopBal = parseInt(user.balance || '0');
      if (shopBal < amount) {
        return json({ error: 'Mamazon残高が不足しています' }, 400);
      }

      const newShoppingBalance = shopBal - amount;
      const newFinanceBalance = parseInt(user.finance_balance || '0') + amount;

      await env.DB.prepare('UPDATE users SET balance = ?, finance_balance = ? WHERE id = ?')
        .bind(newShoppingBalance.toString(), newFinanceBalance.toString(), userId).run();

      return json({ success: true, newBalance: newShoppingBalance, newFinanceBalance });
    }

    // --- Convert Finance Balance → Mamazon Shopping Balance ---
    if (path === '/finance/convert') {
      const { amount } = await request.json() as { amount: number };
      if (amount <= 0) return json({ error: '無効な金額です' }, 400);

      const user = await env.DB.prepare('SELECT balance, finance_balance FROM users WHERE id = ?')
        .bind(userId).first<{ balance: string; finance_balance: string }>();
      if (!user) return json({ error: 'ユーザーが見つかりません' }, 404);

      const finBal = parseInt(user.finance_balance || '0');
      if (finBal < amount) {
        return json({ error: 'ファイナンス残高が不足しています' }, 400);
      }

      const newFinanceBalance = finBal - amount;
      const newShoppingBalance = parseInt(user.balance || '0') + amount;

      await env.DB.prepare('UPDATE users SET balance = ?, finance_balance = ? WHERE id = ?')
        .bind(newShoppingBalance.toString(), newFinanceBalance.toString(), userId).run();

      return json({ success: true, newBalance: newShoppingBalance, newFinanceBalance });
    }
  } else if (request.method === 'GET') {
    
    // --- Market: Assets Info ---
    if (path === '/finance/market/assets') {
      return json(MARKET_ASSETS.map(({ id, name, type, description, hasHalving }) => ({ id, name, type, description, hasHalving: hasHalving ?? false })));
    }

    // --- Market: Prices ---
    if (path === '/finance/market/prices') {
      const time = Date.now();
      const prices: Record<string, number> = {};
      const halvingDaysLeft: Record<string, number> = {};
      MARKET_ASSETS.forEach(asset => {
        prices[asset.id] = getPriceAtTime(asset, time);
        if (asset.hasHalving) {
          const halvingCycleMs = 30 * 24 * 60 * 60 * 1000;
          const msLeft = halvingCycleMs - (time % halvingCycleMs);
          halvingDaysLeft[asset.id] = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
        }
      });
      return json({ prices, halvingDaysLeft });
    }

    // --- Market: History (last 60 data points, 1-min intervals) ---
    if (path === '/finance/market/history') {
      const time = Date.now();
      const windowMs = 60_000; // 1 minute per point
      const points = 60;
      const history: Record<string, number[]> = {};
      MARKET_ASSETS.forEach(asset => {
        history[asset.id] = [];
        for (let i = points - 1; i >= 0; i--) {
          history[asset.id].push(getPriceAtTime(asset, time - i * windowMs));
        }
      });
      return json(history);
    }

    // --- Market: Portfolio ---
    if (path === '/finance/portfolio') {
      const { results } = await env.DB.prepare('SELECT asset_id, quantity, avg_buy_price FROM user_assets WHERE user_id = ?').bind(userId).all();
      return json(results);
    }
  }

  return null;
}
