import type { Env } from '../types';
import { getSession } from '../middleware/auth';

interface Asset {
  id: string;
  name: string;
  type: 'stock' | 'crypto';
  basePrice: number;
  volatility: number;
  description: string;
}

const MARKET_ASSETS: Asset[] = [
  { id: 'MMZN', name: 'Mamazon', type: 'stock', basePrice: 1000, volatility: 0.1, description: 'Mamazon Official Stock' },
  { id: 'PEAR', name: 'Pear Inc', type: 'stock', basePrice: 3000, volatility: 0.15, description: 'Tech Giant' },
  { id: 'MCHD', name: 'Microhard', type: 'stock', basePrice: 2000, volatility: 0.12, description: 'Software Company' },
  { id: 'MMC', name: 'MamaCoin', type: 'crypto', basePrice: 100, volatility: 0.5, description: 'Native Crypto of Mamazon' },
  { id: 'BTK', name: 'BitToken', type: 'crypto', basePrice: 5000, volatility: 0.8, description: 'Highly volatile asset' },
];

// Helper to calculate price pseudo-randomly based on time
function getPriceAtTime(asset: Asset, time: number): number {
  // Use time grouped by 10 seconds so price is stable for a brief window
  const timeWindow = Math.floor(time / 10000);
  
  // Create a pseudo-random seed based on asset id and time window
  let seed = 0;
  for (let i = 0; i < asset.id.length; i++) {
    seed += asset.id.charCodeAt(i);
  }
  
  // Sine waves for smooth trends
  const trend = Math.sin(timeWindow / 100 + seed) + Math.cos(timeWindow / 50 + seed);
  
  // Noise for short term spikes
  const noiseSeed = (timeWindow * seed * 1103515245 + 12345) % 2147483648;
  const noise = (noiseSeed / 2147483648) * 2 - 1; // -1 to 1

  const priceMultiplier = 1 + (trend * 0.5 + noise * 0.5) * asset.volatility;
  
  return Math.max(1, Math.floor(asset.basePrice * priceMultiplier));
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
      return json(MARKET_ASSETS);
    }

    // --- Market: Prices ---
    if (path === '/finance/market/prices') {
      const time = Date.now();
      const prices = MARKET_ASSETS.reduce((acc, asset) => {
        acc[asset.id] = getPriceAtTime(asset, time);
        return acc;
      }, {} as Record<string, number>);
      return json(prices);
    }

    // --- Market: Portfolio ---
    if (path === '/finance/portfolio') {
      const { results } = await env.DB.prepare('SELECT asset_id, quantity, avg_buy_price FROM user_assets WHERE user_id = ?').bind(userId).all();
      return json(results);
    }
  }

  return null;
}
