import 'server-only';
import type { User } from '@prisma/client';
import { db } from './db';
import { accessOf, canCreateProjects, isAdmin } from './access';
import { visibleProjects, type ListProject } from './queries';

export const navMe = (u: User) => ({ name: u.name, designation: u.designation, admin: isAdmin(u), canCreate: canCreateProjects(u) });

/** Steps waiting for this user's approval, and projects they can close. */
export function approvalsFor(u: User, projects: ListProject[]) {
  const out: { project: ListProject; stepId?: string; stepTitle?: string; from?: string; at?: Date; close?: boolean }[] = [];
  for (const p of projects) {
    if (p.state !== 'ACTIVE' || accessOf(u, p) !== 'MANAGE') continue;
    for (const s of p.steps) if (s.status === 'REVIEW') out.push({ project: p, stepId: s.id, stepTitle: s.title, from: s.assigneeId ?? undefined, at: s.submittedAt ?? undefined });
    if (p.steps.length && p.steps.every((s) => s.status === 'APPROVED')) out.push({ project: p, close: true });
  }
  return out;
}

export async function navCounts(u: User) {
  const [projects, pending] = await Promise.all([visibleProjects(u), isAdmin(u) ? db.user.count({ where: { status: 'PENDING' } }) : 0]);
  return { approvals: approvalsFor(u, projects).length, pending };
}
