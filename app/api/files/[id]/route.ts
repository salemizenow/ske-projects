// Opens a stored file for anyone who can see its project, through a short-lived signed link.
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { accessOf } from '@/lib/access';
import { presign, s3FromEnv } from '@/lib/storage';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getCurrentUser();
  if (!u) return NextResponse.redirect(new URL('/login', process.env.APP_URL || 'http://localhost:3000'));
  const doc = await db.document.findUnique({ where: { id }, include: { project: { include: { members: true } } } });
  if (!doc || !accessOf(u, doc.project)) return new NextResponse('Not found', { status: 404 });
  const cfg = s3FromEnv();
  if (!cfg || !doc.key) return new NextResponse('This file was recorded without storage.', { status: 404 });
  const disposition = `inline; filename="${doc.name.replace(/[^\w.\- ]+/g, '_')}"`;
  return NextResponse.redirect(presign(cfg, { method: 'GET', key: doc.key, expires: 300, contentDisposition: disposition }));
}
