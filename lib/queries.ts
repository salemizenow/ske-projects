import 'server-only';
import { db } from './db';
import { accessOf, type UserLike } from './access';
import type { Prisma } from '@prisma/client';

export const projectInclude = {
  members: { include: { user: true } },
  owner: true,
  steps: { orderBy: { position: 'asc' }, include: { assignee: true, reviewer: true, updates: { orderBy: { createdAt: 'asc' }, include: { author: true, files: true } } } },
  documents: { where: { stepUpdateId: null }, orderBy: { createdAt: 'asc' } },
  activity: { orderBy: { createdAt: 'desc' }, take: 15, include: { user: true } },
} satisfies Prisma.ProjectInclude;
export type FullProject = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

/** Projects this user may see: all for admins, else owned or joined. */
export function visibleWhere(u: UserLike): Prisma.ProjectWhereInput {
  if (u.role === 'ADMIN') return {};
  return { OR: [{ ownerId: u.id }, { members: { some: { userId: u.id } } }] };
}

export const listInclude = {
  members: { include: { user: true } },
  owner: true,
  steps: { orderBy: { position: 'asc' }, include: { updates: { select: { pct: true }, orderBy: { createdAt: 'asc' } } } },
} satisfies Prisma.ProjectInclude;
export type ListProject = Prisma.ProjectGetPayload<{ include: typeof listInclude }>;

export async function visibleProjects(u: UserLike) {
  return db.project.findMany({ where: visibleWhere(u), include: listInclude, orderBy: { updatedAt: 'desc' } });
}

/** Loads a project with the viewer's access, or null when it does not exist or they may not see it. */
export async function loadProjectFor(u: UserLike, code: string) {
  const p = await db.project.findUnique({ where: { code }, include: projectInclude });
  if (!p) return { project: null, access: null, exists: false } as const;
  const access = accessOf(u, { ownerId: p.ownerId, state: p.state, members: p.members });
  return access ? ({ project: p, access, exists: true } as const) : ({ project: null, access: null, exists: true } as const);
}
