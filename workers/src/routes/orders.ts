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
    let total = 0n;
    for (const item of body.items) {
      const product = await env.DB.prepare(
        'SELECT price, stock, made_to_order FROM products WHERE id = ?'
      ).bind(item.product_id).first<{ price: string; stock: number; made_to_order: number }>();

      if (!product) return json({ error: `商品が見つかりません: ${item.product_id}` }, 400);
      if (!product.made_to_order && product.stock < item.quantity) return json({ error: '在庫が不足しています' }, 400);
      total += BigInt(product.price) * BigInt(item.quantity);
    }

    // Check buyer balance
    const buyer = await env.DB.prepare('SELECT balance FROM users WHERE id = ?')
      .bind(session.userId).first<{ balance: string }>();
    if (!buyer || BigInt(buyer.balance) < total) {
      return json({ error: '残高が不足しています' }, 400);
    }

    const orderId = `ARC-2026-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Deduct buyer balance
    const newBuyerBalance = (BigInt(buyer.balance) - total).toString();
    await env.DB.prepare('UPDATE users SET balance = ? WHERE id = ?')
      .bind(newBuyerBalance, session.userId).run();

    // Insert order
    await env.DB.prepare(
      `INSERT INTO orders (id, buyer_user_id, total_amount, payment_method, shipping_addr)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(orderId, session.userId, total.toString(), body.payment_method, JSON.stringify(body.shipping_addr)).run();

    // Insert order items & update stock/sales
    for (const item of body.items) {
      const itemId = crypto.randomUUID();
      const product = await env.DB.prepare(
        'SELECT price, store_id FROM products WHERE id = ?'
      ).bind(item.product_id).first<{ price: string; store_id: string }>();

      if (!product) continue;

      const unitPrice = BigInt(product.price);

      await env.DB.prepare(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(itemId, orderId, item.product_id, item.quantity, product.price).run();

      await env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
        .bind(item.quantity, item.product_id).run();

      // Credit seller
      const storeOwner = await env.DB.prepare('SELECT owner_user_id, s.id as sid FROM stores s WHERE s.id = ?')
        .bind(product.store_id).first<{ owner_user_id: string }>();
      if (storeOwner) {
        const sellerRow = await env.DB.prepare('SELECT balance FROM users WHERE id = ?')
          .bind(storeOwner.owner_user_id).first<{ balance: string }>();
        const sellerBalance = sellerRow ? BigInt(sellerRow.balance) : 0n;
        const newSellerBalance = (sellerBalance + unitPrice * BigInt(item.quantity)).toString();
        await env.DB.prepare('UPDATE users SET balance = ? WHERE id = ?')
          .bind(newSellerBalance, storeOwner.owner_user_id).run();
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
      .bind(orderId, session.userId).first<Record<string, unknown>>();
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
    ).bind(session.userId).all<Record<string, unknown>>();
    return json({ orders: rows.results });
  }

  // GET /users/me/collection
  if (path === '/users/me/collection' && request.method === 'GET') {
    const rows = await env.DB.prepare(`
      SELECT p.*, MAX(o.created_at) as purchased_at, SUM(oi.quantity) as total_qty
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.buyer_user_id = ? AND o.status != 'returned'
      GROUP BY p.id
      ORDER BY purchased_at DESC
    `).bind(session.userId).all();
    return json({ items: rows.results });
  }

  // POST /orders/:id/return
  const returnMatch = path.match(/^\/orders\/([^/]+)\/return$/);
  if (returnMatch && request.method === 'POST') {
    const orderId = returnMatch[1];
    const order = await env.DB.prepare(
      'SELECT * FROM orders WHERE id = ? AND buyer_user_id = ?'
    ).bind(orderId, session.userId).first<{ id: string; status: string; total_amount: string; buyer_user_id: string; created_at: string }>();

    if (!order) return json({ error: '注文が見つかりません' }, 404);
    // 配達完了かどうかは created_at からの経過時間で判断（DB status は 'ordered' のまま）
    const isoStr = order.created_at.replace(' ', 'T') + 'Z';
    const elapsedSec = (Date.now() - new Date(isoStr).getTime()) / 1000;
    const isDelivered = order.status === 'delivered' || (order.status !== 'returned' && elapsedSec >= 4);
    if (!isDelivered) {
      return json({ error: '配達完了後の注文のみ返品できます' }, 400);
    }

    const items = await env.DB.prepare(
      `SELECT oi.product_id, oi.quantity, oi.unit_price, p.store_id
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`
    ).bind(orderId).all<{ product_id: string; quantity: number; unit_price: string; store_id: string }>();

    // Refund buyer
    const buyer = await env.DB.prepare('SELECT balance FROM users WHERE id = ?')
      .bind(session.userId).first<{ balance: string }>();
    const refundAmount = BigInt(order.total_amount);
    const newBuyerBalance = ((buyer ? BigInt(buyer.balance) : 0n) + refundAmount).toString();
    await env.DB.prepare('UPDATE users SET balance = ? WHERE id = ?')
      .bind(newBuyerBalance, session.userId).run();

    // Restore stock & deduct seller for each item
    for (const item of items.results) {
      await env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
        .bind(item.quantity, item.product_id).run();

      if (item.store_id) {
        const storeOwner = await env.DB.prepare('SELECT owner_user_id FROM stores WHERE id = ?')
          .bind(item.store_id).first<{ owner_user_id: string }>();
        if (storeOwner) {
          const sellerRow = await env.DB.prepare('SELECT balance FROM users WHERE id = ?')
            .bind(storeOwner.owner_user_id).first<{ balance: string }>();
          const sellerBalance = sellerRow ? BigInt(sellerRow.balance) : 0n;
          const deduct = BigInt(item.unit_price) * BigInt(item.quantity);
          const newSellerBalance = sellerBalance > deduct
            ? (sellerBalance - deduct).toString()
            : '0';
          await env.DB.prepare('UPDATE users SET balance = ? WHERE id = ?')
            .bind(newSellerBalance, storeOwner.owner_user_id).run();
          await env.DB.prepare('UPDATE stores SET sales_count = MAX(0, sales_count - 1) WHERE id = ?')
            .bind(item.store_id).run();
        }
      }
    }

    // Mark order as returned
    await env.DB.prepare("UPDATE orders SET status = 'returned', updated_at = datetime('now') WHERE id = ?")
      .bind(orderId).run();

    const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
    return json(updated);
  }

  return null;
}
