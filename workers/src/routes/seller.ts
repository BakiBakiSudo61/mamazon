import type { Env, SessionData } from '../types';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleSeller(
  path: string,
  request: Request,
  env: Env,
  session: SessionData
): Promise<Response | null> {
  // GET /seller/dashboard
  if (path === '/seller/dashboard' && request.method === 'GET') {
    const store = await env.DB.prepare('SELECT * FROM stores WHERE owner_user_id = ?')
      .bind(session.userId).first();
    if (!store) return json({ error: 'ストアが見つかりません' }, 404);

    const products = await env.DB.prepare(
      'SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC'
    ).bind((store as Record<string, unknown>).id).all();

    const revenueRow = await env.DB.prepare(
      `SELECT SUM(oi.unit_price * oi.quantity) as total
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE p.store_id = ?`
    ).bind((store as Record<string, unknown>).id).first<{ total: number }>();

    return json({
      store,
      products: products.results,
      total_revenue: revenueRow?.total ?? 0,
      recent_sales: (store as Record<string, unknown>).sales_count,
    });
  }

  // GET /seller/sales
  if (path === '/seller/sales' && request.method === 'GET') {
    const store = await env.DB.prepare('SELECT id FROM stores WHERE owner_user_id = ?')
      .bind(session.userId).first<{ id: string }>();
    if (!store) return json({ error: 'ストアが見つかりません' }, 404);

    const rows = await env.DB.prepare(`
      SELECT
        oi.id, oi.order_id, oi.quantity, oi.unit_price,
        o.created_at AS order_date, o.status,
        p.id AS product_id, p.name AS product_name, p.images_json
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE p.store_id = ?
      ORDER BY o.created_at DESC
      LIMIT 100
    `).bind(store.id).all();

    return json({ sales: rows.results });
  }

  // POST /seller/products
  if (path === '/seller/products' && request.method === 'POST') {
    const store = await env.DB.prepare('SELECT id FROM stores WHERE owner_user_id = ?')
      .bind(session.userId).first<{ id: string }>();
    if (!store) return json({ error: 'ストアが見つかりません' }, 404);

    const body = await request.json() as Record<string, unknown>;
    const priceStr = String(body.price ?? '0').replace(/[^0-9]/g, '');
    if (!/^\d+$/.test(priceStr) || priceStr.length > 68) {
      return json({ error: '価格は1無量大数未満の正の整数で入力してください' }, 400);
    }
    const id = crypto.randomUUID();

    await env.DB.prepare(`
      INSERT INTO products (id, store_id, name, description, price, stock, made_to_order, category, condition, is_featured, images_json, tags_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, store.id,
      body.name, body.description ?? null,
      priceStr, body.stock ?? 0,
      body.made_to_order ? 1 : 0,
      body.category ?? 'その他',
      body.condition ?? 'new',
      body.is_featured ?? 0,
      body.images_json ?? '[]',
      body.tags_json ?? null
    ).run();

    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
    return json(product, 201);
  }

  // PUT /seller/products/:id
  const editMatch = path.match(/^\/seller\/products\/([^/]+)$/);
  if (editMatch && request.method === 'PUT') {
    const productId = editMatch[1];
    const store = await env.DB.prepare('SELECT id FROM stores WHERE owner_user_id = ?')
      .bind(session.userId).first<{ id: string }>();
    if (!store) return json({ error: 'ストアが見つかりません' }, 404);

    const body = await request.json() as Record<string, unknown>;
    const priceStr = String(body.price ?? '0').replace(/[^0-9]/g, '');
    if (!/^\d+$/.test(priceStr) || priceStr.length > 68) {
      return json({ error: '価格は1無量大数未満の正の整数で入力してください' }, 400);
    }
    await env.DB.prepare(`
      UPDATE products SET
        name = ?, description = ?, price = ?, stock = ?, made_to_order = ?,
        category = ?, condition = ?, is_featured = ?, images_json = ?
      WHERE id = ? AND store_id = ?
    `).bind(
      body.name, body.description ?? null,
      priceStr, body.stock ?? 0,
      body.made_to_order ? 1 : 0,
      body.category, body.condition ?? 'new',
      body.is_featured ?? 0, body.images_json ?? '[]',
      productId, store.id
    ).run();

    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    return json(product);
  }

  // DELETE /seller/products/:id
  if (editMatch && request.method === 'DELETE') {
    const productId = editMatch[1];
    const store = await env.DB.prepare('SELECT id FROM stores WHERE owner_user_id = ?')
      .bind(session.userId).first<{ id: string }>();
    if (!store) return json({ error: 'ストアが見つかりません' }, 404);

    await env.DB.prepare('DELETE FROM products WHERE id = ? AND store_id = ?')
      .bind(productId, store.id).run();
    return json({ ok: true });
  }

  // PATCH /seller/products/:id/restock
  const restockMatch = path.match(/^\/seller\/products\/([^/]+)\/restock$/);
  if (restockMatch && request.method === 'PATCH') {
    const productId = restockMatch[1];
    const store = await env.DB.prepare('SELECT id FROM stores WHERE owner_user_id = ?')
      .bind(session.userId).first<{ id: string }>();
    if (!store) return json({ error: 'ストアが見つかりません' }, 404);

    const body = await request.json() as { quantity: number };
    const qty = Math.max(1, Math.floor(Number(body.quantity)));
    if (!Number.isFinite(qty) || qty < 1 || qty > 100000) {
      return json({ error: '数量は1〜100000の整数で入力してください' }, 400);
    }

    await env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ? AND store_id = ?')
      .bind(qty, productId, store.id).run();
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    return json(product);
  }

  // POST /stores
  if (path === '/stores' && request.method === 'POST') {
    const existing = await env.DB.prepare('SELECT id FROM stores WHERE owner_user_id = ?')
      .bind(session.userId).first();
    if (existing) return json({ error: 'すでにストアが存在します' }, 409);

    const body = await request.json() as { store_name: string; description?: string };
    if (!body.store_name) return json({ error: 'ストア名は必須です' }, 400);

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO stores (id, owner_user_id, store_name, description) VALUES (?, ?, ?, ?)'
    ).bind(id, session.userId, body.store_name, body.description ?? null).run();

    // Update user role
    await env.DB.prepare(`
      UPDATE users SET role = CASE
        WHEN role = 'buyer' THEN 'seller'
        WHEN role = 'seller' THEN 'seller'
        ELSE 'both' END
      WHERE id = ?
    `).bind(session.userId).run();

    const store = await env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first();
    return json(store, 201);
  }

  // GET /stores/:id
  const storeMatch = path.match(/^\/stores\/([^/]+)$/);
  if (storeMatch && request.method === 'GET') {
    const storeId = storeMatch[1];
    const store = await env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
    if (!store) return json({ error: 'ストアが見つかりません' }, 404);
    return json(store);
  }

  // PATCH /stores/:id  (store owner only)
  if (storeMatch && request.method === 'PATCH') {
    const storeId = storeMatch[1];
    const existing = await env.DB.prepare(
      'SELECT * FROM stores WHERE id = ? AND owner_user_id = ?'
    ).bind(storeId, session.userId).first<Record<string, unknown>>();
    if (!existing) return json({ error: 'ストアが見つかりません' }, 404);

    const body = await request.json() as Record<string, unknown>;

    // brand_color validation: must be empty string or a CSS hex color
    const rawColor = 'brand_color' in body ? body.brand_color : existing.brand_color;
    const brandColor = rawColor === '' ? null : rawColor;
    if (brandColor !== null && (typeof brandColor !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(brandColor))) {
      return json({ error: '無効なカラーコードです（例: #3b82f6）' }, 400);
    }

    const description = 'description' in body ? (body.description ?? null) : existing.description;
    const logoUrl = 'logo_url' in body ? (body.logo_url ?? null) : existing.logo_url;

    await env.DB.prepare(
      'UPDATE stores SET description = ?, brand_color = ?, logo_url = ? WHERE id = ?'
    ).bind(description, brandColor, logoUrl, storeId).run();

    const store = await env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
    return json(store);
  }

  // GET /stores/:id/products
  const storeProductsMatch = path.match(/^\/stores\/([^/]+)\/products$/);
  if (storeProductsMatch && request.method === 'GET') {
    const storeId = storeProductsMatch[1];
    const rows = await env.DB.prepare(
      'SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC'
    ).bind(storeId).all();
    return json({ products: rows.results });
  }

  return null;
}
