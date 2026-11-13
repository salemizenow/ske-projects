import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { db } from './db';
import { newToken, hashToken } from './tokens';

export const SESSION_COOKIE = 'ske_session';
const TTL_DAYS = 30;

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 864e5);
  const ua = (await headers()).get('user-agent')?.slice(0, 200) ?? null;
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt, userAgent: ua } });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** The signed-in, active user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date() || s.user.status !== 'ACTIVE') return null;
  return s.user;
});
