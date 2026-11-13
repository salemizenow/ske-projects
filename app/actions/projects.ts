'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { assignableIds, canComplete, canCreateProjects, canManage, canReviewStep, canUpdateStep } from '@/lib/access';
import { ACCESS_LABEL } from '@/lib/format';
import type { FormState } from './auth';

type Result = FormState;
const fail = (error: string): Result => ({ error });

async function me() {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u;
}
async function loadForWrite(code: string) {
  const p = await db.project.findUnique({ where: { code }, include: { members: true, steps: { orderBy: { position: 'asc' }, include: { updates: { select: { id: true } } } } } });
  if (!p) throw new Error('Project not found');
  return p;
}
const log = (projectId: string, userId: string, text: string, kind: string) => db.activity.create({ data: { projectId, userId, text, kind } });
const done = (code: string): Result => { revalidatePath('/', 'layout'); revalidatePath(`/projects/${code}`); return { ok: true }; };

const FileMeta = z.object({ name: z.string().min(1).max(200), size: z.number().int().min(0).max(50 * 1024 * 1024), type: z.string().max(120).default('application/octet-stream'), key: z.string().max(400).nullable() });
function parseFiles(raw: FormDataEntryValue | null, code: string) {
  if (!raw) return [];
  const list = z.array(FileMeta).max(20).parse(JSON.parse(String(raw)));
  // Only keys inside this project's folder are accepted.
  return list.map((f) => ({ ...f, key: f.key && f.key.startsWith(`projects/${code}/`) ? f.key : null }));
}

/* ---------- create ---------- */
const CreateSchema = z.object({
  title: z.string().trim().min(3, 'Give the project a name.').max(140),
  category: z.string().trim().min(1).max(60),
  client: z.string().trim().max(100).optional().default(''),
  site: z.string().trim().max(140).optional().default(''),
  workOrder: z.string().trim().max(80).optional().default(''),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Set the start date.'),
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Set the due date.'),
  budget: z.coerce.number().int().min(0).max(1e11).default(0),
  brief: z.string().trim().min(5, 'Write a short brief.').max(5000),
  members: z.array(z.object({ userId: z.string(), access: z.enum(['MANAGE', 'CONTRIBUTE', 'VIEW']) })).max(100),
  steps: z.array(z.object({ title: z.string().trim().min(1).max(140), assigneeId: z.string().min(1, 'Choose an owner for every step.') })).min(1, 'Add at least one step.').max(60),
  files: z.array(FileMeta).max(20).default([]),
}).refine((v) => v.due >= v.start, { message: 'The due date is before the start date.' });

export async function createProject(_: Result, form: FormData): Promise<Result> {
  const u = await me();
  if (!canCreateProjects(u)) return fail('You are not allowed to create projects. Ask an admin.');
  let data: z.infer<typeof CreateSchema>;
  try { data = CreateSchema.parse(JSON.parse(String(form.get('payload') || '{}'))); }
  catch (e) { return fail(e instanceof z.ZodError ? e.issues[0].message : 'Something in the form is not right.'); }
  const memberIds = [...new Set(data.members.map((m) => m.userId))].filter((id) => id !== u.id);
  const found = await db.user.findMany({ where: { id: { in: memberIds }, status: 'ACTIVE' }, select: { id: true } });
  if (found.length !== memberIds.length) return fail('One of the chosen people is not an active user.');
  const members = memberIds.map((id) => ({ userId: id, access: data.members.find((m) => m.userId === id)!.access }));
  const allowed = new Set(assignableIds({ ownerId: u.id, state: 'ACTIVE', members }));
  if (data.steps.some((s) => !allowed.has(s.assigneeId))) return fail('Every step must belong to you or to a team member on this project.');

  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await db.project.findFirst({ orderBy: { createdAt: 'desc' }, select: { code: true } });
    const all = await db.project.count();
    const n = Math.max(1000 + all, Number(last?.code.replace(/\D/g, '') || 1000)) + 1 + attempt;
    const code = `PRJ-${n}`;
    try {
      await db.project.create({ data: {
        code, title: data.title, category: data.category, client: data.client || null, site: data.site || null, workOrder: data.workOrder || null,
        start: new Date(data.start + 'T00:00:00+05:30'), due: new Date(data.due + 'T00:00:00+05:30'), budget: data.budget, brief: data.brief, ownerId: u.id,
        members: { create: members },
        steps: { create: data.steps.map((s, i) => ({ position: i, title: s.title, assigneeId: s.assigneeId })) },
        documents: { create: data.files.map((f) => ({ name: f.name, size: f.size, contentType: f.type, key: f.key && f.key.startsWith(`projects/pending/${u.id}/`) ? f.key : null, uploadedById: u.id })) },
        activity: { create: { userId: u.id, text: `created the project and added ${members.length} ${members.length === 1 ? 'person' : 'people'}`, kind: 'create' } },
      } });
      revalidatePath('/', 'layout');
      redirect(`/projects/${code}?created=1`);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2002') continue; // code taken by a parallel create: try the next number
      throw e;
    }
  }
  return fail('Could not create the project. Try again.');
}

/* ---------- step work ---------- */
export async function addUpdate(code: string, stepId: string, _: Result, form: FormData): Promise<Result> {
  const u = await me(); const p = await loadForWrite(code); const s = p.steps.find((x) => x.id === stepId);
  if (!s || !canUpdateStep(u, p, s)) return fail('You can only update open steps given to you.');
  const note = String(form.get('note') || '').trim(); const pct = Math.min(100, Math.max(0, Math.round(Number(form.get('pct')) || 0)));
  if (!note) return fail('Write what was done.');
  if (note.length > 3000) return fail('Keep the note under 3000 characters.');
  let files; try { files = parseFiles(form.get('files'), code); } catch { return fail('The attached files could not be read.'); }
  await db.$transaction([
    db.stepUpdate.create({ data: { stepId, authorId: u.id, pct, note, files: { create: files.map((f) => ({ projectId: p.id, name: f.name, size: f.size, contentType: f.type, key: f.key, uploadedById: u.id })) } } }),
    db.step.update({ where: { id: stepId }, data: { status: 'IN_PROGRESS' } }),
    db.project.update({ where: { id: p.id }, data: { updatedAt: new Date() } }),
  ]);
  await log(p.id, u.id, `posted an update on “${s.title}”`, 'update');
  return done(code);
}

export async function submitStep(code: string, stepId: string, _: Result, form: FormData): Promise<Result> {
  const u = await me(); const p = await loadForWrite(code); const s = p.steps.find((x) => x.id === stepId);
  if (!s || !canUpdateStep(u, p, s)) return fail('You can only send your own open steps.');
  if (!s.updates.length) return fail('Add at least one update before sending it for approval.');
  const note = String(form.get('note') || '').trim().slice(0, 3000);
  await db.$transaction([
    ...(note ? [db.stepUpdate.create({ data: { stepId, authorId: u.id, pct: 100, note } })] : []),
    db.step.update({ where: { id: stepId }, data: { status: 'REVIEW', submittedAt: new Date(), reviewDecision: null, reviewNote: null, reviewedAt: null, reviewerId: null } }),
  ]);
  await log(p.id, u.id, `sent “${s.title}” for approval`, 'submit');
  return done(code);
}

export async function reviewStep(code: string, stepId: string, decision: 'approved' | 'changes', _: Result, form: FormData): Promise<Result> {
  const u = await me(); const p = await loadForWrite(code); const s = p.steps.find((x) => x.id === stepId);
  if (!s || !canReviewStep(u, p, s)) return fail('Only a manager can approve steps that are waiting.');
  const note = String(form.get('note') || '').trim().slice(0, 2000);
  if (decision === 'changes' && !note) return fail('Say what needs to change.');
  await db.step.update({ where: { id: stepId }, data: { status: decision === 'approved' ? 'APPROVED' : 'CHANGES', reviewDecision: decision, reviewNote: note || null, reviewedAt: new Date(), reviewerId: u.id } });
  await log(p.id, u.id, decision === 'approved' ? `approved “${s.title}”` : `asked for changes on “${s.title}”`, decision === 'approved' ? 'approve' : 'changes');
  return done(code);
}

/* ---------- managing ---------- */
export async function assignStep(code: string, stepId: string, _: Result, form: FormData): Promise<Result> {
  const u = await me(); const p = await loadForWrite(code); const s = p.steps.find((x) => x.id === stepId);
  if (!s || !canManage(u, p) || s.status === 'APPROVED') return fail('Only a manager can reassign open steps.');
  const who = String(form.get('assigneeId') || '');
  if (!assignableIds(p).includes(who)) return fail('Choose someone on this project who is not a viewer.');
  if (who === s.assigneeId) return { ok: true };
  const target = await db.user.findUniqueOrThrow({ where: { id: who } });
  await db.step.update({ where: { id: stepId }, data: { assigneeId: who } });
  await log(p.id, u.id, `gave “${s.title}” to ${target.name}`, 'member');
  return done(code);
}

export async function addStep(code: string, _: Result, form: FormData): Promise<Result> {
  const u = await me(); const p = await loadForWrite(code);
  if (!canManage(u, p)) return fail('Only a manager can add steps.');
  const title = String(form.get('title') || '').trim(); const who = String(form.get('assigneeId') || '');
  if (!title) return fail('Name the step.');
  if (!assignableIds(p).includes(who)) return fail('Choose an owner on this project.');
  await db.step.create({ data: { projectId: p.id, position: p.steps.length, title: title.slice(0, 140), assigneeId: who } });
  await log(p.id, u.id, `added the step “${title}”`, 'info');
  return done(code);
}

export async function addMembers(code: string, _: Result, form: FormData): Promise<Result> {
  const u = await me(); const p = await loadForWrite(code);
  if (!canManage(u, p)) return fail('Only a manager can add people.');
  const access = z.enum(['MANAGE', 'CONTRIBUTE', 'VIEW']).parse(form.get('access'));
  const ids = form.getAll('userId').map(String).filter((id) => id !== p.ownerId && !p.members.some((m) => m.userId === id));
  if (!ids.length) return fail('Tick at least one person.');
  const users = await db.user.findMany({ where: { id: { in: ids }, status: 'ACTIVE' } });
  if (users.length !== ids.length) return fail('One of the chosen people is not an active user.');
  await db.projectMember.createMany({ data: users.map((x) => ({ projectId: p.id, userId: x.id, access })) });
  await log(p.id, u.id, `added ${users.map((x) => x.name).join(', ')} as ${ACCESS_LABEL[access].label.toLowerCase()}`, 'member');
  return done(code);
}

export async function changeMemberAccess(code: string, userId: string, value: string): Promise<Result> {
  const u = await me(); const p = await loadForWrite(code);
  if (!canManage(u, p)) return fail('Only a manager can change access.');
  if (userId === p.ownerId || !p.members.some((m) => m.userId === userId)) return fail('This person cannot be changed here.');
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  // Open steps of someone who can no longer work on them go back to the owner.
  const moveSteps = db.step.updateMany({ where: { projectId: p.id, assigneeId: userId, status: { not: 'APPROVED' } }, data: { assigneeId: p.ownerId } });
  if (value === 'REMOVE') {
    await db.$transaction([moveSteps, db.projectMember.delete({ where: { projectId_userId: { projectId: p.id, userId } } })]);
    await log(p.id, u.id, `removed ${target.name}`, 'member');
  } else {
    const access = z.enum(['MANAGE', 'CONTRIBUTE', 'VIEW']).parse(value);
    await db.$transaction([...(access === 'VIEW' ? [moveSteps] : []), db.projectMember.update({ where: { projectId_userId: { projectId: p.id, userId } }, data: { access } })]);
    await log(p.id, u.id, `made ${target.name} ${ACCESS_LABEL[access].label.toLowerCase()}`, 'member');
  }
  return done(code);
}

export async function completeProject(code: string): Promise<Result> {
  const u = await me(); const p = await loadForWrite(code);
  if (!canComplete(u, p)) return fail('All steps must be approved first.');
  await db.project.update({ where: { id: p.id }, data: { state: 'COMPLETED', closedAt: new Date() } });
  await log(p.id, u.id, 'marked the project complete', 'close');
  return done(code);
}
