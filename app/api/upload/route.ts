// Gives the browser a short-lived URL to upload one file straight to S3. The app server never handles the bytes.
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { accessOf, canCreateProjects } from '@/lib/access';
import { objectKey, presign, s3FromEnv } from '@/lib/storage';
import { limited } from '@/lib/ratelimit';

const Body = z.object({ project: z.string().max(40).nullable(), name: z.string().min(1).max(200), size: z.number().int().min(1).max(50 * 1024 * 1024), type: z.string().max(120) });

export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const cfg = s3FromEnv();
  if (!cfg) return NextResponse.json({ disabled: true }, { status: 200 });
  if (limited('upload:' + u.id, 60, 60 * 60e3)) return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Files must be under 50 MB.' }, { status: 400 });
  const b = parsed.data;
  let prefix: string;
  if (b.project) {
    const p = await db.project.findUnique({ where: { code: b.project }, include: { members: true } });
    const a = p && accessOf(u, p);
    if (!p || !a || a === 'VIEW') return NextResponse.json({ error: 'You cannot add files to this project.' }, { status: 403 });
    prefix = b.project;
  } else {
    if (!canCreateProjects(u)) return NextResponse.json({ error: 'You cannot create projects.' }, { status: 403 });
    prefix = `pending/${u.id}`;
  }
  const key = objectKey(prefix, b.name, randomBytes(6).toString('hex'));
  return NextResponse.json({ key, url: presign(cfg, { method: 'PUT', key, expires: 600 }) });
}
