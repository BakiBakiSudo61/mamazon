import type { Env } from './types';
import { handleAuth } from './routes/auth';
import { handleProducts } from './routes/products';
import { handleCart } from './routes/cart';
import { handleOrders } from './routes/orders';
import { handleSeller } from './routes/seller';
import { handleUpload } from './routes/upload';
import { handleFinance } from './routes/finance';
import { getSession } from './middleware/auth';

const FALLBACK_ORIGINS = [
  'https://mamazon.seatail.net',
  'https://mamazon.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
];

function corsHeaders(origin: string, env?: Env) {
  const origins = env?.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ?? FALLBACK_ORIGINS;
  const allowedOrigin = origins.includes(origin) ? origin : origins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    'Vary': 'Origin',
  };
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  };
}

function withHeaders(res: Response, origin: string, env?: Env): Response {
  const headers = new Headers(res.headers);
  Object.entries(corsHeaders(origin, env)).forEach(([k, v]) => headers.set(k, v));
  Object.entries(securityHeaders()).forEach(([k, v]) => headers.set(k, v));
  return new Response(res.body, { status: res.status, headers });
}

function json(data: unknown, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
      ...securityHeaders(),
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...corsHeaders(origin, env), ...securityHeaders() } });
    }

    // Strip /v1 prefix
    const rawPath = url.pathname;
    if (!rawPath.startsWith('/v1')) {
      return new Response('Not Found', { status: 404 });
    }
    const path = rawPath.slice(3); // remove /v1

    try {
      // Auth routes (no session required)
      const authRes = await handleAuth(path, request, env);
      if (authRes) return withHeaders(authRes, origin, env);

      // R2 image proxy (no auth required)
      if (path.startsWith('/images/') && request.method === 'GET') {
        const key = path.slice('/images/'.length);
        if (!key) return new Response('Not Found', { status: 404 });
        const obj = await env.IMAGES.get(key);
        if (!obj) return new Response('Not Found', { status: 404 });
        return new Response(obj.body, {
          headers: {
            'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
            ...corsHeaders(origin, env),
            ...securityHeaders(),
          },
        });
      }

      // User profile & balance (session required)
      if (path === '/users/me' && request.method === 'PUT') {
        const session = await getSession(request, env);
        if (!session) return json({ error: '認証が必要です' }, 401, origin);
        const body = await request.json() as Record<string, unknown>;
        const fields: string[] = ['display_name = ?'];
        const values: unknown[] = [body.display_name];
        if (typeof body.avatar_url === 'string' || body.avatar_url === null) {
          fields.push('avatar_url = ?');
          values.push(body.avatar_url || null);
        }
        values.push(session.userId);
        await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
          .bind(...values).run();
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
        return json(user, 200, origin);
      }

      if (path === '/users/me/balance' && request.method === 'GET') {
        const session = await getSession(request, env);
        if (!session) return json({ error: '認証が必要です' }, 401, origin);
        const user = await env.DB.prepare('SELECT balance FROM users WHERE id = ?').bind(session.userId).first<{ balance: number }>();
        return json({ balance: user?.balance ?? 0 }, 200, origin);
      }

      // Public product routes
      const session = await getSession(request, env);
      const productRes = await handleProducts(path, request, env, session);
      if (productRes) return withHeaders(productRes, origin, env);

      // Public store routes (GET only)
      if (
        (path.match(/^\/stores\/[^/]+$/) || path.match(/^\/stores\/[^/]+\/products$/)) &&
        request.method === 'GET'
      ) {
        const sellerRes = await handleSeller(path, request, env, session ?? { userId: '', email: '', exp: 0 });
        if (sellerRes) return withHeaders(sellerRes, origin, env);
      }

      // Auth-required routes
      if (!session) return json({ error: '認証が必要です' }, 401, origin);

      // Cart routes
      if (path.startsWith('/cart')) {
        const cartRes = await handleCart(path, request, env, session);
        if (cartRes) return withHeaders(cartRes, origin, env);
      }

      // Order routes
      if (path.startsWith('/orders') || path.startsWith('/users/me/orders') || path === '/users/me/collection') {
        const orderRes = await handleOrders(path, request, env, session);
        if (orderRes) return withHeaders(orderRes, origin, env);
      }

      // Seller / store management routes
      if (path.startsWith('/seller') || path.startsWith('/stores')) {
        const sellerRes = await handleSeller(path, request, env, session);
        if (sellerRes) return withHeaders(sellerRes, origin, env);
      }

      // Upload
      if (path.startsWith('/upload')) {
        const uploadRes = await handleUpload(path, request, env, session);
        if (uploadRes) return withHeaders(uploadRes, origin, env);
      }

      // Finance & Market
      if (path.startsWith('/finance')) {
        const financeRes = await handleFinance(path, request, env, session);
        if (financeRes) return withHeaders(financeRes, origin, env);
      }

      return json({ error: 'Not Found' }, 404, origin);
    } catch (err) {
      console.error(err);
      return json({ error: 'Internal Server Error' }, 500, origin);
    }
  },
};
