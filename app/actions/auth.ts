'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, burnPasswordCheck } from '@/lib/password';
import { createSession, destroySession } from '@/lib/session';
import { limited } from '@/lib/ratelimit';

export type FormState = { error?: string; ok?: boolean; email?: string; fields?: Record<string, string> };

const safeNext = (n: unknown) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/');
const ip = async () => (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter your email address.', email };
  if (!password) return { error: 'Enter your password.', email };
  if (limited('login:' + (await ip()), 20, 15 * 60e3) || limited('login:' + email, 8, 15 * 60e3)) return { error: 'Too many attempts. Wait 15 minutes and try again.', email };
  const user = await db.user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(password, user.passwordHash) : await burnPasswordCheck(password);
  if (!user || !ok) return { error: 'Email or password is not right.', email };
  if (user.status === 'PENDING') return { error: 'Your account is waiting for an admin to approve it.', email };
  if (user.status === 'DISABLED') return { error: 'This account is turned off. Contact your admin.', email };
  await createSession(user.id);
  redirect(safeNext(form.get('next')));
}

const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(120),
  phone: z.string().trim().transform((v) => v.replace(/\D/g, '').slice(-10)).refine((v) => !v || /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit mobile number, or leave it empty.'),
  designation: z.string().trim().max(60),
  password: z.string().min(8, 'Use a password of at least 8 characters.').max(200),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { message: 'The two passwords do not match.', path: ['confirm'] });

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(['name', 'email', 'phone', 'designation', 'password', 'confirm'].map((k) => [k, String(form.get(k) || '')]));
  const fields = { name: raw.name, email: raw.email, phone: raw.phone, designation: raw.designation };
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  if (limited('register:' + (await ip()), 5, 60 * 60e3)) return { error: 'Too many sign-ups from this network. Try again later.', fields };
  const v = parsed.data;
  if (await db.user.findUnique({ where: { email: v.email } })) return { error: 'An account with this email already exists. Sign in instead.', fields };
  // The very first account becomes the admin, so a fresh install can be set up.
  const first = (await db.user.count()) === 0;
  await db.user.create({ data: { name: v.name, email: v.email, phone: v.phone || null, designation: v.designation || null, passwordHash: await hashPassword(v.password), role: first ? 'ADMIN' : 'MEMBER', canCreate: first, status: first ? 'ACTIVE' : 'PENDING' } });
  return { ok: true, email: v.email };
}

export async function logout() {
  await destroySession();
  redirect('/login');
}
