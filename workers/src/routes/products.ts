import type { Env } from '../types';
import type { SessionData } from '../types';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleProducts(
  path: string,
  request: Request,
  env: Env,
  session: SessionData | null
): Promise<Response | null> {
  const url = new URL(request.url);

  // GET /products
  if (path === '/products' && request.method === 'GET') {
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '24'), 48);
    const offset = (page - 1) * limit;
    const category = url.searchParams.get('category');
    const q = url.searchParams.get('q');
    const sort = url.searchParams.get('sort') ?? 'newest';

    let where = 'WHERE 1=1';
    const bindings: unknown[] = [];

    if (category) { where += ' AND p.category = ?'; bindings.push(category); }
    if (q) { where += ' AND (p.name LIKE ? OR p.description LIKE ?)'; bindings.push(`%${q}%`, `%${q}%`); }

    const orderMap: Record<string, string> = {
      newest: 'p.created_at DESC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      rating: 'p.rating DESC',
    };
    const orderBy = orderMap[sort] ?? 'p.created_at DESC';

    const rows = await env.DB.prepare(
      `SELECT p.*, s.store_name FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    ).bind(...bindings, limit, offset).all();

    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM products p ${where}`
    ).bind(...bindings).first<{ total: number }>();

    return json({ products: rows.results, total: countRow?.total ?? 0 });
  }

  // GET /products/search
  if (path === '/products/search' && request.method === 'GET') {
    const q = url.searchParams.get('q') ?? '';
    const rows = await env.DB.prepare(
      `SELECT p.*, s.store_name FROM products p
       LEFT JOIN stores s ON p.store_id = s.id
       WHERE p.name LIKE ? OR p.description LIKE ?
       ORDER BY p.rating DESC LIMIT 48`
    ).bind(`%${q}%`, `%${q}%`).all();
    return json({ products: rows.results });
  }

  // GET /products/:id
  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch && request.method === 'GET') {
    const id = productMatch[1];
    const product = await env.DB.prepare(
      `SELECT p.*, s.store_name, s.rating as store_rating, s.sales_count as store_sales_count
       FROM products p LEFT JOIN stores s ON p.store_id = s.id
       WHERE p.id = ?`
    ).bind(id).first();
    if (!product) return json({ error: '商品が見つかりません' }, 404);
    return json(product);
  }

  // GET /products/:id/reviews
  const reviewsMatch = path.match(/^\/products\/([^/]+)\/reviews$/);
  if (reviewsMatch && request.method === 'GET') {
    const productId = reviewsMatch[1];
    const rows = await env.DB.prepare(
      `SELECT r.*, u.display_name, u.avatar_url FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? ORDER BY r.created_at DESC`
    ).bind(productId).all();
    return json({ reviews: rows.results });
  }

  // POST /products/:id/reviews (auth required)
  if (reviewsMatch && request.method === 'POST') {
    if (!session) return json({ error: '認証が必要です' }, 401);
    const productId = reviewsMatch[1];
    const body = await request.json() as {
      rating: number; title?: string; body?: string; order_id: string;
    };
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return json({ error: '評価は1〜5で指定してください' }, 400);
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO reviews (id, product_id, user_id, order_id, rating, title, body)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, productId, session.userId, body.order_id, body.rating, body.title ?? null, body.body ?? null).run();

    // Update product rating
    await env.DB.prepare(`
      UPDATE products SET
        rating = (SELECT AVG(rating) FROM reviews WHERE product_id = ?),
        review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
      WHERE id = ?
    `).bind(productId, productId, productId).run();

    return json({ ok: true, id });
  }

  return null;
}
