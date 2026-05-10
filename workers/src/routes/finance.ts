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
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS horse_bets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        race_id TEXT NOT NULL,
        horse_index INTEGER NOT NULL,
        horse_index_2 INTEGER,
        horse_index_3 INTEGER,
        bet_type TEXT DEFAULT 'win',
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  } catch (_) { /* already exists */ }
  try {
    await env.DB.prepare(`ALTER TABLE horse_bets ADD COLUMN horse_index_3 INTEGER`).run();
  } catch (_) { /* column already exists */ }
  try {
    await env.DB.prepare(`ALTER TABLE horse_bets ADD COLUMN horse_index_2 INTEGER`).run();
  } catch (_) { /* column already exists */ }
  try {
    await env.DB.prepare(`ALTER TABLE horse_bets ADD COLUMN bet_type TEXT DEFAULT 'win'`).run();
  } catch (_) { /* column already exists */ }
  try {
    await env.DB.prepare(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`).run();
  } catch (_) { /* column already exists */ }
}

const HORSE_PREFIXES = ['マカ', 'キタサン', 'ディープ', 'アーモンド', 'ゴールド', 'シンボリ', 'テイエム', 'メジロ', 'ナリタ', 'ダイワ', 'アグネス', 'グラス', 'エルコンドル', 'スペシャル', 'サイレンス', 'トウカイ', 'オグリ', 'タマモ', 'ミホノ', 'メジロ'];
const HORSE_SUFFIXES = ['ヒキ', 'ブラック', 'インパクト', 'アイ', 'シップ', 'ルドルフ', 'オペラオー', 'マックイーン', 'ブライアン', 'スカーレット', 'タキオン', 'ワンダー', 'パサー', 'ウィーク', 'スズカ', 'テイオー', 'キャップ', 'クロス', 'ブルボン', 'パーマー'];

function getRaceData(raceId: string) {
  // raceId format: "YYYY-MM-DD-HH"
  let seed = 0;
  for (let i = 0; i < raceId.length; i++) seed = (seed * 31 + raceId.charCodeAt(i)) | 0;

  const horses = [];
  let totalCap = 0;
  
  for (let i = 0; i < 18; i++) {
    const s1 = seed + i * 13;
    const pIdx = Math.floor(wang32(s1) * HORSE_PREFIXES.length);
    const sIdx = Math.floor(wang32(s1 + 1) * HORSE_SUFFIXES.length);
    const name = HORSE_PREFIXES[pIdx] + HORSE_SUFFIXES[sIdx];
    
    // Capability: higher is better chance to win. Exponential distribution for realistic odds.
    const cap = Math.pow(wang32(s1 + 2), 3) * 100 + 10;
    totalCap += cap;
    
    horses.push({ no: i + 1, name, cap, odds: 0 });
  }

  // Calculate parimutuel-like odds
  const trackTakeout = 0.20; // 20% house edge
  for (let i = 0; i < 18; i++) {
    const winProb = horses[i].cap / totalCap;
    let odds = (1 - trackTakeout) / winProb;
    // Cap and format odds
    odds = Math.max(1.1, Math.min(250.0, odds));
    horses[i].odds = Math.round(odds * 10) / 10;
  }

  // Determine winner and runnerUp deterministically
  let r = wang32(seed + 999) * totalCap;
  let winner = 0;
  for (let i = 0; i < 18; i++) {
    r -= horses[i].cap;
    if (r <= 0) {
      winner = i;
      break;
    }
  }

  let totalCap2 = totalCap - horses[winner].cap;
  let r2 = wang32(seed + 1000) * totalCap2;
  let runnerUp = 0;
  for (let i = 0; i < 18; i++) {
    if (i === winner) continue;
    r2 -= horses[i].cap;
    if (r2 <= 0) {
      runnerUp = i;
      break;
    }
  }

  const totalCap3 = totalCap - horses[winner].cap - horses[runnerUp].cap;
  let r3 = wang32(seed + 1001) * totalCap3;
  let thirdPlace = 0;
  for (let i = 0; i < 18; i++) {
    if (i === winner || i === runnerUp) continue;
    r3 -= horses[i].cap;
    if (r3 <= 0) {
      thirdPlace = i;
      break;
    }
  }

  return { horses, winner, runnerUp, thirdPlace, totalCap };
}

/** 日付文字列 (YYYY-MM-DD) から当日の抽選番号を決定論的に生成 */
function getDailyLotteryNumbers(dateStr: string): number[] {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) seed = (seed * 31 + dateStr.charCodeAt(i)) | 0;
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const result: number[] = [];
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(wang32(seed + i * 17) * pool.length);
    result.push(...pool.splice(idx, 1));
  }
  return result.sort((a, b) => a - b);
}

type LotteryTicket = { id: string; userId: string; picks: number[]; amount: number; drawDate: string; claimed: boolean };

async function getUserLotteryTickets(env: Env, userId: string, dateStr: string): Promise<LotteryTicket[]> {
  // Use strongly-consistent get() via an index key instead of eventually-consistent list()
  const idxKey = `lottery_idx:${dateStr}:${userId}`;
  const idxRaw = await env.SESSIONS.get(idxKey);
  if (!idxRaw) return [];
  let ids: string[];
  try { ids = JSON.parse(idxRaw) as string[]; } catch { return []; }
  const tickets: LotteryTicket[] = [];
  for (const id of ids) {
    const raw = await env.SESSIONS.get(`lottery:${dateStr}:${userId}:${id}`);
    if (raw) {
      try { tickets.push(JSON.parse(raw) as LotteryTicket); } catch { /* skip */ }
    }
  }
  return tickets;
}

// ─── 累進課税 ─────────────────────────────────────────────────────────────────
const TAX_BRACKETS = [
  { limit: 1_000_000,       rate: 0.00 },
  { limit: 10_000_000,      rate: 0.10 },
  { limit: 100_000_000,     rate: 0.20 },
  { limit: 10_000_000_000,  rate: 0.35 },
  { limit: Infinity,        rate: 0.50 },
];

function applyProgressiveTax(profit: number): { afterTax: number; taxAmount: number } {
  if (profit <= 0) return { afterTax: profit, taxAmount: 0 };
  let tax = 0;
  let prev = 0;
  for (const bracket of TAX_BRACKETS) {
    const taxable = Math.min(profit - prev, bracket.limit - prev);
    if (taxable <= 0) break;
    tax += Math.floor(taxable * bracket.rate);
    prev = Math.min(profit, bracket.limit);
    if (prev >= profit) break;
  }
  return { afterTax: profit - tax, taxAmount: tax };
}

// ─── インフレ率（日次 -0.1%/日）────────────────────────────────────────────────
async function applyDailyInflation(env: Env, userId: string, balance: number): Promise<number> {
  const key = `inflation:${userId}`;
  const lastStr = await env.SESSIONS.get(key);
  const now = Date.now();
  if (lastStr) {
    const fullDays = Math.floor((now - parseInt(lastStr)) / 86400000);
    if (fullDays >= 1) {
      const deduction = Math.floor(balance * (1 - Math.pow(0.999, fullDays)));
      if (deduction > 0) {
        balance = Math.max(0, balance - deduction);
        await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(balance.toString(), userId).run();
      }
      await env.SESSIONS.put(key, now.toString(), { expirationTtl: 30 * 86400 });
    }
  } else {
    await env.SESSIONS.put(key, now.toString(), { expirationTtl: 30 * 86400 });
  }
  return balance;
}

function getCurrentRaceSchedule() {
  const now = new Date();
  // JST conversion
  const jst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  const h = jst.getUTCHours();
  
  const scheduleHours = [12, 14, 16, 18, 20, 22];
  
  let nextH = scheduleHours.find(hour => hour > h);
  let isNextDay = false;
  if (nextH === undefined) {
    nextH = scheduleHours[0];
    isNextDay = true;
  }

  // Next race time
  const nextDate = new Date(jst.getTime());
  if (isNextDay) nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  nextDate.setUTCHours(nextH, 0, 0, 0);
  
  // Previous race time
  let prevH = [...scheduleHours].reverse().find(hour => hour <= h);
  let prevDate = new Date(jst.getTime());
  if (prevH === undefined) {
    prevH = scheduleHours[scheduleHours.length - 1];
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  }
  prevDate.setUTCHours(prevH, 0, 0, 0);

  const prevRaceId = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth()+1).padStart(2,'0')}-${String(prevDate.getUTCDate()).padStart(2,'0')}-${String(prevH).padStart(2,'0')}`;
  
  const nextY = nextDate.getUTCFullYear();
  const nextM = String(nextDate.getUTCMonth()+1).padStart(2,'0');
  const nextD = String(nextDate.getUTCDate()).padStart(2,'0');
  const nextRaceId = `${nextY}-${nextM}-${nextD}-${String(nextH).padStart(2,'0')}`;
  
  return {
    currentRace: {
      id: prevRaceId,
      time: prevDate.getTime() - (9 * 60 * 60 * 1000), // back to UTC for client
      ...getRaceData(prevRaceId)
    },
    nextRace: {
      id: nextRaceId,
      time: nextDate.getTime() - (9 * 60 * 60 * 1000),
      ...getRaceData(nextRaceId)
    }
  };
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
      if (amount > 1_000_000) return json({ error: 'ベット上限は100万ptです' }, 400);
      if (currentCard < 1 || currentCard > 13) return json({ error: '無効なカードです' }, 400);

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');
      if (!user || finBal < amount) {
        return json({ error: 'ファイナンス残高が不足しています' }, 400);
      }

      // Draw a new card (1-13)
      const newCard = Math.floor(Math.random() * 13) + 1;

      // Dynamic odds based on win probability with 10% house edge
      const highWinProb = (13 - currentCard) / 13;
      const lowWinProb  = (currentCard - 1) / 13;
      const HOUSE_EDGE = 0.10;
      const calcOdds = (p: number) => p > 0 ? Math.max(1.05, (1 - HOUSE_EDGE) / p) : 2.0;
      const odds = guess === 'high' ? calcOdds(highWinProb) : calcOdds(lowWinProb);

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
      let taxAmount = 0;
      if (win) {
        const rawPayout = Math.floor(amount * odds);
        const taxed = applyProgressiveTax(rawPayout - amount);
        taxAmount = taxed.taxAmount;
        payout = amount + taxed.afterTax;
        newBalance = finBal - amount + payout;
      } else if (draw) {
        payout = amount; // return stake
      } else {
        newBalance = finBal - amount;
      }

      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ newCard, result: win ? 'win' : draw ? 'draw' : 'lose', payout, newBalance, odds: parseFloat(odds.toFixed(2)), taxAmount });
    }

    // --- Casino: Slots ---
    if (path === '/finance/gamble/slots') {
      const { amount } = await request.json() as { amount: number };
      if (amount <= 0) return json({ error: '無効な金額です' }, 400);
      if (amount > 1_000_000) return json({ error: 'ベット上限は100万ptです' }, 400);

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

      const rawPayout = amount * multiplier;
      let actualPayout = rawPayout;
      let taxAmount = 0;
      if (multiplier > 0) {
        const taxed = applyProgressiveTax(rawPayout - amount);
        taxAmount = taxed.taxAmount;
        actualPayout = amount + taxed.afterTax;
      }
      const newBalance = finBal - amount + actualPayout;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ reels: [reel1, reel2, reel3], multiplier, payout: actualPayout, newBalance, taxAmount });
    }

    // --- Casino: Horse Racing Bet ---
    if (path === '/finance/gamble/horseracing/bet') {
      const { amount, horseIndex, horseIndex2, horseIndex3, betType, raceId } = await request.json() as { amount: number, horseIndex: number, horseIndex2?: number, horseIndex3?: number, betType?: string, raceId: string };
      const type = betType || 'win';
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0 || typeof horseIndex !== 'number' || horseIndex < 0 || horseIndex > 17 || !raceId) return json({ error: '無効なリクエストです' }, 400);
      if (amt > 1_000_000) return json({ error: 'ベット上限は100万ptです' }, 400);
      if (type === 'quinella' && (horseIndex2 === undefined || horseIndex2 < 0 || horseIndex2 > 17 || horseIndex === horseIndex2)) {
        return json({ error: '馬連の指定が無効です' }, 400);
      }
      if (type === 'trifecta') {
        const idxs = [horseIndex, horseIndex2, horseIndex3];
        if (idxs.some(v => v === undefined || v < 0 || v > 17) || new Set(idxs).size !== 3) {
          return json({ error: '三連単の指定が無効です' }, 400);
        }
      }

      const schedule = getCurrentRaceSchedule();
      // Can only bet on next race (or future races, but UI only shows nextRace)
      // Allow demo bets (raceId starts with 'demo-')
      if (raceId !== schedule.nextRace.id && !raceId.startsWith('demo-')) {
        return json({ error: 'このレースはすでに締め切られているか、存在しません' }, 400);
      }

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');
      if (!user || finBal < amt) {
        return json({ error: 'ファイナンス残高が不足しています' }, 400);
      }

      const betId = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO horse_bets (id, user_id, race_id, horse_index, horse_index_2, horse_index_3, bet_type, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(betId, userId, raceId, horseIndex, horseIndex2 ?? null, (horseIndex3 ?? null), type, amt).run();

      const newBalance = finBal - amt;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ success: true, newBalance, betId });
    }

    // --- Casino: Horse Racing Claim ---
    if (path === '/finance/gamble/horseracing/claim') {
      // Find all pending bets that belong to past races
      const { results: bets } = await env.DB.prepare("SELECT * FROM horse_bets WHERE user_id = ? AND status = 'pending'").bind(userId).all<{ id: string, race_id: string, horse_index: number, horse_index_2: number, horse_index_3: number, bet_type: string, amount: number }>();
      
      const schedule = getCurrentRaceSchedule();
      let totalClaimed = 0;
      const claimedBetIds = [];
      const lostBetIds = [];

      for (const bet of bets) {
        // Only process if race is finished (not nextRace)
        if (bet.race_id !== schedule.nextRace.id && !bet.race_id.startsWith('demo-active-')) {
          const raceData = getRaceData(bet.race_id);
          const type = bet.bet_type || 'win';
          
          let won = false;
          let payout = 0;
          
          if (type === 'win') {
            if (raceData.winner === bet.horse_index) {
              won = true;
              payout = Math.floor(bet.amount * raceData.horses[bet.horse_index].odds);
            }
          } else if (type === 'quinella') {
            const isWinnerSet = (raceData.winner === bet.horse_index && raceData.runnerUp === bet.horse_index_2) ||
                                (raceData.winner === bet.horse_index_2 && raceData.runnerUp === bet.horse_index);
            if (isWinnerSet) {
              won = true;
              const pA = raceData.horses[bet.horse_index].cap / raceData.totalCap;
              const pB = raceData.horses[bet.horse_index_2].cap / raceData.totalCap;
              const prob = pA * (pB / (1 - pA)) + pB * (pA / (1 - pB));
              let qOdds = (1 - 0.20) / prob;
              qOdds = Math.max(2.0, Math.min(1000.0, qOdds));
              payout = Math.floor(bet.amount * qOdds);
            }
          } else if (type === 'trifecta') {
            if (raceData.winner === bet.horse_index && raceData.runnerUp === bet.horse_index_2 && raceData.thirdPlace === bet.horse_index_3) {
              won = true;
              const pA = raceData.horses[bet.horse_index].cap / raceData.totalCap;
              const pB = raceData.horses[bet.horse_index_2].cap / raceData.totalCap;
              const pC = raceData.horses[bet.horse_index_3].cap / raceData.totalCap;
              const prob = pA * (pB / (1 - pA)) * (pC / (1 - pA - pB));
              let tOdds = (1 - 0.25) / prob;
              tOdds = Math.max(5.0, Math.min(9999.0, tOdds));
              payout = Math.floor(bet.amount * tOdds);
            }
          }

          if (won) {
            totalClaimed += payout;
            claimedBetIds.push(bet.id);
          } else {
            lostBetIds.push(bet.id);
          }
        }
      }

      // Update statuses
      for (const id of claimedBetIds) await env.DB.prepare("UPDATE horse_bets SET status = 'won' WHERE id = ?").bind(id).run();
      for (const id of lostBetIds) await env.DB.prepare("UPDATE horse_bets SET status = 'lost' WHERE id = ?").bind(id).run();

      let newBalance = 0;
      if (totalClaimed > 0) {
        const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
        newBalance = parseInt(user?.finance_balance || '0') + totalClaimed;
        await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();
      }

      return json({ success: true, claimedAmount: totalClaimed, newBalance });
    }

    // --- Demo Race (Immediate result for testing) ---
    if (path === '/finance/gamble/horseracing/demo') {
      const { amount, horseIndex, horseIndex2, horseIndex3, betType } = await request.json() as { amount: number, horseIndex: number, horseIndex2?: number, horseIndex3?: number, betType?: string };
      const type = betType || 'win';
      if (amount <= 0 || horseIndex < 0 || horseIndex > 17) return json({ error: '無効なリクエストです' }, 400);

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');
      if (!user || finBal < amount) {
        return json({ error: 'ファイナンス残高が不足しています' }, 400);
      }

      // Use a random raceId for demo so each demo is different
      const demoRaceId = `demo-${Date.now()}`;
      const raceData = getRaceData(demoRaceId);
      const { horses, winner: winningHorse, runnerUp, thirdPlace, totalCap } = raceData;

      let payout = 0;
      if (type === 'win') {
        if (winningHorse === horseIndex) {
          payout = Math.floor(amount * horses[horseIndex].odds);
        }
      } else if (type === 'quinella') {
        const isWinnerSet = (winningHorse === horseIndex && runnerUp === horseIndex2) ||
                            (winningHorse === horseIndex2 && runnerUp === horseIndex);
        if (isWinnerSet && horseIndex2 !== undefined) {
          const pA = horses[horseIndex].cap / totalCap;
          const pB = horses[horseIndex2].cap / totalCap;
          const prob = pA * (pB / (1 - pA)) + pB * (pA / (1 - pB));
          let qOdds = (1 - 0.20) / prob;
          qOdds = Math.max(2.0, Math.min(1000.0, qOdds));
          payout = Math.floor(amount * qOdds);
        }
      } else if (type === 'trifecta') {
        if (winningHorse === horseIndex && runnerUp === horseIndex2 && thirdPlace === horseIndex3 &&
            horseIndex2 !== undefined && horseIndex3 !== undefined) {
          const pA = horses[horseIndex].cap / totalCap;
          const pB = horses[horseIndex2].cap / totalCap;
          const pC = horses[horseIndex3].cap / totalCap;
          const prob = pA * (pB / (1 - pA)) * (pC / (1 - pA - pB));
          let tOdds = (1 - 0.25) / prob;
          tOdds = Math.max(5.0, Math.min(9999.0, tOdds));
          payout = Math.floor(amount * tOdds);
        }
      }

      const newBalance = finBal - amount + payout;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ winner: winningHorse, runnerUp, thirdPlace, horses, payout, newBalance });
    }

    // --- Casino: Roulette ---
    if (path === '/finance/gamble/roulette') {
      const { amount, betType, betValue } = await request.json() as {
        amount: number;
        betType: 'number' | 'color' | 'parity' | 'column' | 'dozen' | 'half';
        betValue: number | string;
      };
      if (amount <= 0) return json({ error: '無効な金額です' }, 400);
      if (amount > 1_000_000) return json({ error: 'ベット上限は100万ptです' }, 400);

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');
      if (!user || finBal < amount) return json({ error: 'ファイナンス残高が不足しています' }, 400);

      const result = Math.floor(Math.random() * 37); // 0-36
      const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      const resultColor = result === 0 ? 'green' : reds.includes(result) ? 'red' : 'black';

      let win = false;
      let multiplier = 0;

      if (betType === 'number' && Number(betValue) === result) { win = true; multiplier = 36; }
      else if (betType === 'color' && betValue === resultColor && result !== 0) { win = true; multiplier = 2; }
      else if (betType === 'parity') {
        if (result !== 0 && ((betValue === 'odd' && result % 2 === 1) || (betValue === 'even' && result % 2 === 0))) { win = true; multiplier = 2; }
      }
      else if (betType === 'column' && result !== 0) {
        const col = ((result - 1) % 3) + 1;
        if (col === Number(betValue)) { win = true; multiplier = 3; }
      }
      else if (betType === 'dozen' && result !== 0) {
        const doz = Math.ceil(result / 12);
        if (doz === Number(betValue)) { win = true; multiplier = 3; }
      }
      else if (betType === 'half' && result !== 0) {
        if ((betValue === 'low' && result <= 18) || (betValue === 'high' && result >= 19)) { win = true; multiplier = 2; }
      }

      let actualPayout = win ? amount * multiplier : 0;
      let taxAmount = 0;
      if (win) {
        const taxed = applyProgressiveTax(actualPayout - amount);
        taxAmount = taxed.taxAmount;
        actualPayout = amount + taxed.afterTax;
      }
      const newBalance = finBal - amount + actualPayout;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ result, resultColor, win, multiplier, payout: actualPayout, newBalance, taxAmount });
    }

    // --- Casino: Blackjack ---
    if (path === '/finance/gamble/blackjack') {
      const { action, amount, hand: clientHand, dealerHand: clientDealerHand } = await request.json() as {
        action: 'start' | 'hit' | 'stand';
        amount: number;
        hand?: number[];
        dealerHand?: number[];
      };

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');

      const drawCard = () => Math.floor(Math.random() * 13) + 1; // 1-13 (A=1, J/Q/K=10)
      const cardValue = (c: number) => c > 10 ? 10 : c;
      const handTotal = (cards: number[]) => {
        let sum = cards.reduce((a, c) => a + cardValue(c), 0);
        // Ace as 11 if beneficial
        if (cards.includes(1) && sum + 10 <= 21) sum += 10;
        return sum;
      };

      if (action === 'start') {
        if (amount <= 0) return json({ error: '無効な金額です' }, 400);
        if (amount > 1_000_000) return json({ error: 'ベット上限は100万ptです' }, 400);
        if (!user || finBal < amount) return json({ error: 'ファイナンス残高が不足しています' }, 400);

        const playerHand = [drawCard(), drawCard()];
        const dealerHand = [drawCard(), drawCard()];
        const playerTotal = handTotal(playerHand);

        // Natural blackjack check
        if (playerTotal === 21) {
          const dealerTotal = handTotal(dealerHand);
          let payout = dealerTotal === 21 ? amount : Math.floor(amount * 2.5);
          const result = dealerTotal === 21 ? 'push' : 'blackjack';
          let bjTax = 0;
          if (result === 'blackjack') {
            const taxed = applyProgressiveTax(payout - amount);
            bjTax = taxed.taxAmount;
            payout = amount + taxed.afterTax;
          }
          const newBalance = finBal - amount + payout;
          await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();
          return json({ hand: playerHand, dealerHand, playerTotal, dealerTotal, result, payout, newBalance, done: true, taxAmount: bjTax });
        }

        return json({ hand: playerHand, dealerHand: [dealerHand[0], 0], dealerFull: dealerHand, playerTotal, done: false });
      }

      if (action === 'hit') {
        if (!clientHand) return json({ error: '手札がありません' }, 400);
        const newCard = drawCard();
        const newHand = [...clientHand, newCard];
        const total = handTotal(newHand);

        if (total > 21) {
          // Bust
          const newBalance = finBal - amount;
          await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();
          return json({ hand: newHand, newCard, playerTotal: total, result: 'bust', payout: 0, newBalance, done: true, dealerHand: clientDealerHand });
        }

        return json({ hand: newHand, newCard, playerTotal: total, done: false });
      }

      if (action === 'stand') {
        if (!clientHand || !clientDealerHand) return json({ error: 'データ不足です' }, 400);
        const playerTotal = handTotal(clientHand);

        // Dealer draws until 17+
        const dealerHand = [...clientDealerHand];
        while (handTotal(dealerHand) < 17) {
          dealerHand.push(drawCard());
        }
        const dealerTotal = handTotal(dealerHand);

        let result: string;
        let payout = 0;
        if (dealerTotal > 21) { result = 'win'; payout = amount * 2; }
        else if (playerTotal > dealerTotal) { result = 'win'; payout = amount * 2; }
        else if (playerTotal === dealerTotal) { result = 'push'; payout = amount; }
        else { result = 'lose'; payout = 0; }

        let taxAmount = 0;
        if (result === 'win') {
          const taxed = applyProgressiveTax(payout - amount);
          taxAmount = taxed.taxAmount;
          payout = amount + taxed.afterTax;
        }
        const newBalance = finBal - amount + payout;
        await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

        return json({ hand: clientHand, dealerHand, playerTotal, dealerTotal, result, payout, newBalance, done: true, taxAmount });
      }

      return json({ error: '不正なアクションです' }, 400);
    }

    // --- Casino: Lottery (Daily Draw) ---
    if (path === '/finance/gamble/lottery') {
      const { amount, picks } = await request.json() as { amount: number; picks: number[] };
      if (amount <= 0) return json({ error: '無効な金額です' }, 400);
      if (amount > 1_000_000) return json({ error: 'ベット上限は100万ptです' }, 400);
      if (!picks || picks.length !== 6) return json({ error: '6つの番号を選んでください' }, 400);
      if (picks.some(n => n < 1 || n > 45 || !Number.isInteger(n))) return json({ error: '1〜45の整数を選んでください' }, 400);
      if (new Set(picks).size !== 6) return json({ error: '重複しない番号を選んでください' }, 400);

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      const finBal = parseInt(user?.finance_balance || '0');
      if (!user || finBal < amount) return json({ error: 'ファイナンス残高が不足しています' }, 400);

      // Deduct balance now
      const newBalance = finBal - amount;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      // Get today's draw date (JST)
      const now = new Date();
      const jstHour = (now.getUTCHours() + 9) % 24;
      // If past 12:00 JST, tickets go to tomorrow's draw
      const jstDate = new Date(now.getTime() + 9 * 3600000);
      if (jstHour >= 12) jstDate.setDate(jstDate.getDate() + 1);
      const drawDate = jstDate.toISOString().slice(0, 10); // YYYY-MM-DD

      // Store ticket in KV + update index (strongly consistent)
      const ticketId = crypto.randomUUID();
      const ticket = { id: ticketId, userId, picks: picks.sort((a, b) => a - b), amount, drawDate, claimed: false };
      const ticketKey = `lottery:${drawDate}:${userId}:${ticketId}`;
      await env.SESSIONS.put(ticketKey, JSON.stringify(ticket), { expirationTtl: 7 * 86400 });

      // Update index key (get → append → put) using get() which is strongly consistent
      const idxKey = `lottery_idx:${drawDate}:${userId}`;
      const idxRaw = await env.SESSIONS.get(idxKey);
      let ids: string[] = [];
      try { if (idxRaw) ids = JSON.parse(idxRaw) as string[]; } catch { /* reset */ }
      ids.push(ticketId);
      await env.SESSIONS.put(idxKey, JSON.stringify(ids), { expirationTtl: 7 * 86400 });

      return json({ ticket, drawDate, ticketCount: ids.length, newBalance });
    }

    if (path === '/finance/gamble/lottery/claim') {
      // Claim all unclaimed winning tickets
      const now = new Date();
      const jstNow = new Date(now.getTime() + 9 * 3600000);
      const jstHour = jstNow.getUTCHours();

      // Can only claim after draw (21:00 JST)
      // Check last 7 days of draws
      let totalPayout = 0;
      const claimed: string[] = [];

      for (let d = 0; d < 7; d++) {
        const checkDate = new Date(jstNow.getTime() - d * 86400000);
        // Skip today if before 12:00 JST
        if (d === 0 && jstHour < 12) continue;
        const dateStr = checkDate.toISOString().slice(0, 10);
        const winning = getDailyLotteryNumbers(dateStr);
        const tickets = await getUserLotteryTickets(env, userId, dateStr);

        for (const ticket of tickets) {
          if (ticket.claimed) continue;
          const matches = ticket.picks.filter((n: number) => winning.includes(n)).length;
          const multiplierMap: Record<number, number> = { 6: 1000000, 5: 1000, 4: 100, 3: 10, 2: 2 };
          const multiplier = multiplierMap[matches] || 0;
          if (multiplier > 0) {
            totalPayout += ticket.amount * multiplier;
            claimed.push(ticket.id);
          }
          // Mark as claimed
          ticket.claimed = true;
          await env.SESSIONS.put(`lottery:${dateStr}:${userId}:${ticket.id}`, JSON.stringify(ticket), { expirationTtl: 7 * 86400 });
        }
      }

      if (totalPayout > 0) {
        const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
        const newBalance = parseInt(user?.finance_balance || '0') + totalPayout;
        await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();
        return json({ totalPayout, claimed: claimed.length, newBalance });
      }

      return json({ totalPayout: 0, claimed: 0 });
    }

    // --- Mine Crypto ---
    if (path === '/finance/mine') {
      // #3 クールダウンチェック（60秒）
      const CD_SEC = 60;
      const cdKey = `mine_cd:${userId}`;
      const lastMine = await env.SESSIONS.get(cdKey);
      if (lastMine) {
        const elapsed = Math.floor((Date.now() - parseInt(lastMine)) / 1000);
        if (elapsed < CD_SEC) {
          return json({ error: `クールダウン中です。あと${CD_SEC - elapsed}秒お待ちください`, remainingSeconds: CD_SEC - elapsed }, 429);
        }
      }

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      if (!user) return json({ error: 'ユーザーが見つかりません' }, 404);

      // #10 インフレ適用
      const finBal = await applyDailyInflation(env, userId, parseInt(user.finance_balance || '0'));
      const minedAmount = Math.floor(Math.random() * 401) + 100; // 100 ~ 500
      const newBalance = finBal + minedAmount;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();
      await env.SESSIONS.put(cdKey, Date.now().toString(), { expirationTtl: CD_SEC + 10 });

      return json({ minedAmount, newBalance, cooldownSeconds: CD_SEC });
    }

    // --- Admin: Reset Finance Balance ---
    if (path === '/finance/admin/reset-balance') {
      const admin = await env.DB.prepare('SELECT is_admin FROM users WHERE id = ?').bind(userId).first<{ is_admin: number }>();
      if (!admin || !admin.is_admin) return json({ error: '管理者権限が必要です' }, 403);
      const { targetUserId, amount } = await request.json() as { targetUserId: string; amount?: number };
      if (!targetUserId) return json({ error: 'targetUserIdが必要です' }, 400);
      const newBal = Math.max(0, Math.floor(amount ?? 10000));
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBal.toString(), targetUserId).run();
      return json({ success: true, targetUserId, newBalance: newBal });
    }

    // --- Admin: Reset Shop Balance ---
    if (path === '/finance/admin/reset-shop-balance') {
      const admin = await env.DB.prepare('SELECT is_admin FROM users WHERE id = ?').bind(userId).first<{ is_admin: number }>();
      if (!admin || !admin.is_admin) return json({ error: '管理者権限が必要です' }, 403);
      const { targetUserId, amount } = await request.json() as { targetUserId: string; amount?: number };
      if (!targetUserId) return json({ error: 'targetUserIdが必要です' }, 400);
      const newBal = Math.max(0, Math.floor(amount ?? 0));
      await env.DB.prepare('UPDATE users SET balance = ? WHERE id = ?').bind(newBal, targetUserId).run();
      return json({ success: true, targetUserId, newBalance: newBal });
    }

    // --- Market: Buy ---
    if (path === '/finance/market/buy') {
      const { assetId, quantity } = await request.json() as { assetId: string, quantity: number };
      const asset = MARKET_ASSETS.find(a => a.id === assetId);
      if (!asset || quantity <= 0 || !Number.isInteger(quantity)) return json({ error: '無効なリクエストです' }, 400);

      const currentPrice = getPriceAtTime(asset, Date.now());
      const baseTotal = currentPrice * quantity;

      // #8 スリッページ（大口ペナルティ）
      const slippageRate = quantity >= 50 ? 0.05 : quantity >= 10 ? 0.02 : 0;
      const slippageAmount = Math.floor(baseTotal * slippageRate);
      const effectivePrice = (baseTotal + slippageAmount) / quantity;

      // #7 手数料 3%
      const feeAmount = Math.floor((baseTotal + slippageAmount) * 0.03);

      // #1 取引上限
      const totalCost = baseTotal + slippageAmount + feeAmount;
      if (totalCost > 10_000_000) return json({ error: '1回の取引上限は1000万ptです' }, 400);

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      if (!user) return json({ error: 'ユーザーが見つかりません' }, 404);
      // #10 インフレ適用
      const finBal = await applyDailyInflation(env, userId, parseInt(user.finance_balance || '0'));
      if (finBal < totalCost) return json({ error: 'ファイナンス残高が不足しています' }, 400);

      // Check existing portfolio
      const existing = await env.DB.prepare('SELECT * FROM user_assets WHERE user_id = ? AND asset_id = ?').bind(userId, assetId).first<{ quantity: number, avg_buy_price: number }>();

      if (existing) {
        const newQuantity = existing.quantity + quantity;
        const newAvgPrice = ((existing.quantity * existing.avg_buy_price) + (baseTotal + slippageAmount)) / newQuantity;
        await env.DB.prepare('UPDATE user_assets SET quantity = ?, avg_buy_price = ? WHERE user_id = ? AND asset_id = ?')
          .bind(newQuantity, newAvgPrice, userId, assetId).run();
      } else {
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO user_assets (id, user_id, asset_id, quantity, avg_buy_price) VALUES (?, ?, ?, ?, ?)')
          .bind(id, userId, assetId, quantity, effectivePrice).run();
      }

      const newBalance = finBal - totalCost;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ success: true, newBalance, assetId, quantity, price: currentPrice, fee: feeAmount, slippage: slippageAmount, totalCost });
    }

    // --- Market: Sell ---
    if (path === '/finance/market/sell') {
      const { assetId, quantity } = await request.json() as { assetId: string, quantity: number };
      const asset = MARKET_ASSETS.find(a => a.id === assetId);
      if (!asset || quantity <= 0) return json({ error: '無効なリクエストです' }, 400);

      const existing = await env.DB.prepare('SELECT * FROM user_assets WHERE user_id = ? AND asset_id = ?').bind(userId, assetId).first<{ quantity: number; avg_buy_price: number }>();
      if (!existing || existing.quantity < quantity) {
        return json({ error: '保有数が不足しています' }, 400);
      }

      const currentPrice = getPriceAtTime(asset, Date.now());
      const grossEarned = currentPrice * quantity;

      // #1 取引上限
      if (grossEarned > 10_000_000) return json({ error: '1回の取引上限は1000万ptです' }, 400);

      // #7 手数料 3%
      const feeAmount = Math.floor(grossEarned * 0.03);
      const netEarned = grossEarned - feeAmount;

      // #2 累進課税（利益部分のみ）
      const costBasis = Math.floor(existing.avg_buy_price * quantity);
      const profit = Math.max(0, netEarned - costBasis);
      const { taxAmount } = applyProgressiveTax(profit);
      const totalEarned = netEarned - taxAmount;

      const newQuantity = existing.quantity - quantity;
      if (newQuantity === 0) {
        await env.DB.prepare('DELETE FROM user_assets WHERE user_id = ? AND asset_id = ?').bind(userId, assetId).run();
      } else {
        await env.DB.prepare('UPDATE user_assets SET quantity = ? WHERE user_id = ? AND asset_id = ?').bind(newQuantity, userId, assetId).run();
      }

      const user = await env.DB.prepare('SELECT finance_balance FROM users WHERE id = ?').bind(userId).first<{ finance_balance: string }>();
      if (!user) return json({ error: 'ユーザーが見つかりません' }, 404);
      // #10 インフレ適用
      const finBal = await applyDailyInflation(env, userId, parseInt(user.finance_balance || '0'));
      const newBalance = finBal + totalEarned;
      await env.DB.prepare('UPDATE users SET finance_balance = ? WHERE id = ?').bind(newBalance.toString(), userId).run();

      return json({ success: true, newBalance, assetId, quantity, price: currentPrice, grossEarned, fee: feeAmount, tax: taxAmount, earned: totalEarned });
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
    // --- Admin: User List ---
    if (path === '/finance/admin/users') {
      const admin = await env.DB.prepare('SELECT is_admin FROM users WHERE id = ?').bind(userId).first<{ is_admin: number }>();
      if (!admin || !admin.is_admin) return json({ error: '管理者権限が必要です' }, 403);
      const { results } = await env.DB.prepare(
        'SELECT id, email, display_name, avatar_url, role, is_admin, balance, finance_balance, created_at FROM users ORDER BY created_at DESC'
      ).all<{ id: string; email: string; display_name: string; avatar_url: string; role: string; is_admin: number; balance: number; finance_balance: string; created_at: string }>();
      return json(results);
    }

    // --- Casino: Lottery Status ---
    if (path === '/finance/gamble/lottery/status') {
      const now = new Date();
      const jstNow = new Date(now.getTime() + 9 * 3600000);
      const jstHour = jstNow.getUTCHours();
      const todayDate = jstNow.toISOString().slice(0, 10);
      const drawn = jstHour >= 12;
      const yesterdayDate = new Date(jstNow.getTime() - 86400000).toISOString().slice(0, 10);
      const tomorrowDate = new Date(jstNow.getTime() + 86400000).toISOString().slice(0, 10);
      const activeDrawDate = drawn ? tomorrowDate : todayDate;
      const resultsDrawDate = drawn ? todayDate : yesterdayDate;
      const winning = getDailyLotteryNumbers(resultsDrawDate);
      const todayTickets = await getUserLotteryTickets(env, userId, activeDrawDate);
      const resultTickets = await getUserLotteryTickets(env, userId, resultsDrawDate);
      const nextDraw = new Date(jstNow);
      if (drawn) nextDraw.setDate(nextDraw.getDate() + 1);
      nextDraw.setUTCHours(3, 0, 0, 0);
      return json({
        drawn,
        drawDate: resultsDrawDate,
        nextDraw: nextDraw.toISOString(),
        winning: drawn ? winning : null,
        todayTickets,
        resultTickets: drawn ? resultTickets.map(t => ({
          ...t, winning,
          matches: t.picks.filter((n: number) => winning.includes(n)).length,
        })) : resultTickets,
      });
    }

    // --- Casino: Horse Racing Info ---
    if (path === '/finance/gamble/horseracing/info') {
      const schedule = getCurrentRaceSchedule();
      const { results: bets } = await env.DB.prepare("SELECT * FROM horse_bets WHERE user_id = ? AND status = 'pending'").bind(userId).all();
      return json({ schedule, bets });
    }
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
