import type { Env } from '../types';

export async function handleAuth(
  path: string,
  request: Request,
  env: Env
): Promise<Response | null> {
  const url = new URL(request.url);

  // GET /auth/google
  if (path === '/auth/google' && request.method === 'GET') {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = crypto.randomUUID();

    const redirectUri = getRedirectUri(url);
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('access_type', 'offline');

    // Store code_verifier and state in KV temporarily (5 min)
    await env.SESSIONS.put(`pkce:${state}`, codeVerifier, { expirationTtl: 300 });

    return Response.redirect(authUrl.toString(), 302);
  }

  // GET /auth/callback
  if (path === '/auth/callback' && request.method === 'GET') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';

    if (error || !code || !state) {
      return Response.redirect(`${frontendUrl}/?error=oauth_failed`, 302);
    }

    const codeVerifier = await env.SESSIONS.get(`pkce:${state}`);
    if (!codeVerifier) {
      return Response.redirect(`${frontendUrl}/?error=invalid_state`, 302);
    }
    await env.SESSIONS.delete(`pkce:${state}`);

    const redirectUri = getRedirectUri(url);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      return Response.redirect(`${frontendUrl}/?error=token_exchange_failed`, 302);
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      id_token: string;
    };

    // Get user info
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) {
      return Response.redirect(`${frontendUrl}/?error=profile_failed`, 302);
    }
    const profile = await profileRes.json() as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    // Upsert user in D1
    await env.DB.prepare(`
      INSERT INTO users (id, email, display_name, avatar_url)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        display_name = CASE WHEN users.display_name = '' THEN excluded.display_name ELSE users.display_name END,
        avatar_url = excluded.avatar_url
    `).bind(profile.id, profile.email, profile.name, profile.picture).run();

    // Create session
    const sessionId = crypto.randomUUID();
    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    await env.SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify({ userId: profile.id, email: profile.email, exp }),
      { expirationTtl: 7 * 24 * 60 * 60 }
    );

    const cookieOpts = [
      `session_id=${sessionId}`,
      'HttpOnly',
      'Path=/',
      `Max-Age=${7 * 24 * 60 * 60}`,
      'SameSite=Lax',
    ];
    if (!frontendUrl.startsWith('http://localhost')) {
      cookieOpts.push('Secure');
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontendUrl}/home`,
        'Set-Cookie': cookieOpts.join('; '),
      },
    });
  }

  // POST /auth/logout
  if (path === '/auth/logout' && request.method === 'POST') {
    const cookie = request.headers.get('Cookie') ?? '';
    const match = cookie.match(/(?:^|;\s*)session_id=([^;]+)/);
    if (match) {
      await env.SESSIONS.delete(`session:${match[1]}`);
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'session_id=; HttpOnly; Path=/; Max-Age=0',
      },
    });
  }

  // GET /auth/me
  if (path === '/auth/me' && request.method === 'GET') {
    const cookie = request.headers.get('Cookie') ?? '';
    const match = cookie.match(/(?:^|;\s*)session_id=([^;]+)/);
    if (!match) return json({ error: '未認証' }, 401);

    const raw = await env.SESSIONS.get(`session:${match[1]}`);
    if (!raw) return json({ error: '未認証' }, 401);
    const session = JSON.parse(raw);
    if (session.exp < Math.floor(Date.now() / 1000)) return json({ error: 'セッション期限切れ' }, 401);

    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(session.userId)
      .first();
    if (!user) return json({ error: 'ユーザーが見つかりません' }, 404);
    return json(user);
  }

  return null;
}

function getRedirectUri(url: URL): string {
  return `${url.protocol}//${url.host}/v1/auth/callback`;
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
