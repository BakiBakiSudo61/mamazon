import type { Env, SessionData } from '../types';

export async function getSession(
  request: Request,
  env: Env
): Promise<SessionData | null> {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)session_id=([^;]+)/);
  if (!match) return null;

  const sessionId = match[1];
  const raw = await env.SESSIONS.get(`session:${sessionId}`);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as SessionData;
    if (session.exp < Math.floor(Date.now() / 1000)) {
      await env.SESSIONS.delete(`session:${sessionId}`);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function requireAuth(
  handler: (
    req: Request,
    env: Env,
    ctx: ExecutionContext,
    session: SessionData
  ) => Promise<Response>
) {
  return async (req: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    const session = await getSession(req, env);
    if (!session) {
      return new Response(JSON.stringify({ error: '認証が必要です' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handler(req, env, ctx, session);
  };
}
