export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CARTS: KVNamespace;
  IMAGES: R2Bucket;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  FRONTEND_URL?: string;
}

export interface SessionData {
  userId: string;
  email: string;
  exp: number;
}

export interface JWTPayload {
  sub: string;
  email: string;
  exp: number;
}
