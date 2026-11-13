'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isAdmin } from '@/lib/access';
import type { FormState } from './auth';

async function admin() {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  if (!isAdmin(u)) throw new Error('Admins only');
  return u;
}
const ok = (): FormState => { revalidatePath('/', 'layout'); return { ok: true }; };

export async function setUserStatus(userId: string, status: 'ACTIVE' | 'DISABLED'): Promise<FormState> {
  const me = await admin();
  if (userId === me.id) return { error: 'You cannot change your own access.' };
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { status } }),
    ...(status === 'DISABLED' ? [db.session.deleteMany({ where: { userId } })] : []),
  ]);
  return ok();
}

export async function setRole(userId: string, role: 'ADMIN' | 'MEMBER'): Promise<FormState> {
  const me = await admin();
  if (userId === me.id) return { error: 'You cannot change your own role.' };
  if (role === 'MEMBER') {
    const admins = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', id: { not: userId } } });
    if (!admins) return { error: 'Keep at least one admin.' };
  }
  await db.user.update({ where: { id: userId }, data: { role, ...(role === 'ADMIN' ? { canCreate: true } : {}) } });
  return ok();
}

export async function setCanCreate(userId: string, canCreate: boolean): Promise<FormState> {
  await admin();
  await db.user.update({ where: { id: userId }, data: { canCreate } });
  return ok();
}

export async function rejectUser(userId: string): Promise<FormState> {
  await admin();
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u || u.status !== 'PENDING') return { error: 'This request was already handled.' };
  await db.user.delete({ where: { id: userId } });
  return ok();
}
