import type { Env, SessionData } from '../types';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleCart(
  path: string,
  request: Request,
  env: Env,
  session: SessionData
): Promise<Response | null> {
  const cartKey = `cart:${session.userId}`;

  const getCart = async (): Promise<Record<string, number>> => {
    const raw = await env.CARTS.get(cartKey);
    return raw ? JSON.parse(raw) : {};
  };

  const saveCart = async (cart: Record<string, number>) => {
    await env.CARTS.put(cartKey, JSON.stringify(cart), { expirationTtl: 30 * 24 * 60 * 60 });
  };

  const enrichCart = async (cart: Record<string, number>) => {
    const productIds = Object.keys(cart);
    if (productIds.length === 0) return [];
    const placeholders = productIds.map(() => '?').join(',');
    const rows = await env.DB.prepare(
      `SELECT * FROM products WHERE id IN (${placeholders})`
    ).bind(...productIds).all();
    const productMap = new Map(rows.results.map((p: Record<string, unknown>) => [p.id as string, p]));
    return productIds.map((id) => ({
      product_id: id,
      quantity: cart[id],
      product: productMap.get(id) ?? null,
    }));
  };

  // GET /cart
  if (path === '/cart' && request.method === 'GET') {
    const cart = await getCart();
    const items = await enrichCart(cart);
    return json({ items });
  }

  // POST /cart/items
  if (path === '/cart/items' && request.method === 'POST') {
    const body = await request.json() as { product_id: string; quantity: number };
    const cart = await getCart();
    cart[body.product_id] = (cart[body.product_id] ?? 0) + (body.quantity ?? 1);
    await saveCart(cart);
    return json({ ok: true });
  }

  // PUT /cart/items/:productId
  const itemMatch = path.match(/^\/cart\/items\/([^/]+)$/);
  if (itemMatch && request.method === 'PUT') {
    const productId = itemMatch[1];
    const body = await request.json() as { quantity: number };
    const cart = await getCart();
    if (body.quantity <= 0) {
      delete cart[productId];
    } else {
      cart[productId] = body.quantity;
    }
    await saveCart(cart);
    return json({ ok: true });
  }

  // DELETE /cart/items/:productId
  if (itemMatch && request.method === 'DELETE') {
    const productId = itemMatch[1];
    const cart = await getCart();
    delete cart[productId];
    await saveCart(cart);
    return json({ ok: true });
  }

  // DELETE /cart
  if (path === '/cart' && request.method === 'DELETE') {
    await env.CARTS.delete(cartKey);
    return json({ ok: true });
  }

  return null;
}
