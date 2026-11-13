// Who can do what. Pure functions: used by server actions (enforcement) and pages (what to show).
export type Access = 'MANAGE' | 'CONTRIBUTE' | 'VIEW';
export type StepStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'CHANGES' | 'APPROVED';

export interface UserLike { id: string; role: 'ADMIN' | 'MEMBER'; canCreate: boolean; status: 'PENDING' | 'ACTIVE' | 'DISABLED' }
export interface ProjectLike { ownerId: string; state: 'ACTIVE' | 'COMPLETED'; members: { userId: string; access: Access }[] }
export interface StepLike { assigneeId: string | null; status: StepStatus }

export const isAdmin = (u: UserLike | null | undefined) => !!u && u.status === 'ACTIVE' && u.role === 'ADMIN';
export const canCreateProjects = (u: UserLike | null | undefined) => !!u && u.status === 'ACTIVE' && (u.role === 'ADMIN' || u.canCreate);

export function accessOf(u: UserLike | null | undefined, p: ProjectLike | null | undefined): Access | null {
  if (!u || !p || u.status !== 'ACTIVE') return null;
  if (u.role === 'ADMIN' || p.ownerId === u.id) return 'MANAGE';
  return p.members.find((m) => m.userId === u.id)?.access ?? null;
}

const OPEN: StepStatus[] = ['TODO', 'IN_PROGRESS', 'CHANGES'];
/** The step's owner adds updates while it is open. */
export function canUpdateStep(u: UserLike, p: ProjectLike, s: StepLike): boolean {
  const a = accessOf(u, p);
  return !!a && a !== 'VIEW' && p.state === 'ACTIVE' && s.assigneeId === u.id && OPEN.includes(s.status);
}
/** Sending for approval needs at least one update (checked by the caller). */
export const canSubmitStep = canUpdateStep;
export const canReviewStep = (u: UserLike, p: ProjectLike, s: StepLike) => accessOf(u, p) === 'MANAGE' && p.state === 'ACTIVE' && s.status === 'REVIEW';
export const canManage = (u: UserLike, p: ProjectLike) => accessOf(u, p) === 'MANAGE' && p.state === 'ACTIVE';
/** People a step can be given to: the owner plus members who are not viewers. */
export const assignableIds = (p: ProjectLike) => [p.ownerId, ...p.members.filter((m) => m.access !== 'VIEW').map((m) => m.userId)];
export function canComplete(u: UserLike, p: ProjectLike & { steps: StepLike[] }) {
  return canManage(u, p) && p.steps.length > 0 && p.steps.every((s) => s.status === 'APPROVED');
}
