import type { Env, SessionData } from '../types';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface CartItem {
  product_id: string;
  quantity: number;
}

export async function handleOrders(
  path: string,
  request: Request,
  env: Env,
  session: SessionData
): Promise<Response | null> {
  // POST /orders
  if (path === '/orders' && request.method === 'POST') {
    const body = await request.json() as {
      items: CartItem[];
      payment_method: string;
      shipping_addr: object;
    };

    if (!body.items?.length) return json({ error: '商品が選択されていません' }, 400);

    // Calculate total and validate stock
    let total = 0;
    for (const item of body.items) {
      const product = await env.DB.prepare(
        'SELECT price, stock FROM products WHERE id = ?'
      ).bind(item.product_id).first<{ price: number; stock: number }>();

      if (!product) return json({ error: `商品が見つかりません: ${item.product_id}` }, 400);
      if (product.stock < item.quantity) return json({ error: '在庫が不足しています' }, 400);
      total += product.price * item.quantity;
    }

    // Check buyer balance
    const buyer = await env.DB.prepare('SELECT balance FROM users WHERE id = ?')
      .bind(session.userId).first<{ balance: number }>();
    if (!buyer || buyer.balance < total) {
      return json({ error: '残高が不足しています' }, 400);
    }

    const orderId = `ARC-2026-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Deduct buyer balance
    await env.DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
      .bind(total, session.userId).run();

    // Insert order
    await env.DB.prepare(
      `INSERT INTO orders (id, buyer_user_id, total_amount, payment_method, shipping_addr)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(orderId, session.userId, total, body.payment_method, JSON.stringify(body.shipping_addr)).run();

    // Insert order items & update stock/sales
    for (const item of body.items) {
      const itemId = crypto.randomUUID();
      const product = await env.DB.prepare(
        'SELECT price, store_id FROM products WHERE id = ?'
      ).bind(item.product_id).first<{ price: number; store_id: string }>();

      if (!product) continue;

      await env.DB.prepare(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(itemId, orderId, item.product_id, item.quantity, product.price).run();

      await env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
        .bind(item.quantity, item.product_id).run();

      // Credit seller
      const storeOwner = await env.DB.prepare('SELECT owner_user_id FROM stores WHERE id = ?')
        .bind(product.store_id).first<{ owner_user_id: string }>();
      if (storeOwner) {
        await env.DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?')
          .bind(product.price * item.quantity, storeOwner.owner_user_id).run();
        await env.DB.prepare('UPDATE stores SET sales_count = sales_count + 1 WHERE id = ?')
          .bind(product.store_id).run();
      }
    }

    // Clear cart
    await env.CARTS.delete(`cart:${session.userId}`);

    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
    return json(order, 201);
  }

  // GET /orders/:id
  const orderMatch = path.match(/^\/orders\/([^/]+)$/);
  if (orderMatch && request.method === 'GET') {
    const orderId = orderMatch[1];
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ? AND buyer_user_id = ?')
      .bind(orderId, session.userId).first();
    if (!order) return json({ error: '注文が見つかりません' }, 404);
    const items = await env.DB.prepare(
      `SELECT oi.*, p.name, p.images_json FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`
    ).bind(orderId).all();
    return json({ ...order, items: items.results });
  }

  // GET /users/me/orders
  if (path === '/users/me/orders' && request.method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o WHERE o.buyer_user_id = ? ORDER BY o.created_at DESC`
    ).bind(session.userId).all();
    return json({ orders: rows.results });
  }

  return null;
}
