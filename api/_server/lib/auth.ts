import { SignJWT, jwtVerify } from 'jose';
import type { Context } from 'hono';

const SECRET = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

export interface JwtPayload {
  githubId: string;
  username: string;
  avatarUrl: string;
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET());
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export function isAdmin(githubId: string): boolean {
  const ids = (process.env.ADMIN_GITHUB_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length === 0 || ids.includes(githubId);
}

export async function getSession(c: Context): Promise<JwtPayload | null> {
  const cookie = c.req.header('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  if (!match) return null;
  return verifyJwt(match[1]);
}
