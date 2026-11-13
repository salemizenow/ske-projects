// Display helpers. All dates are shown in India time, so server and browser agree.
export const TZ = 'Asia/Kolkata';
const DAY = 864e5;
export const fmtDate = (d: Date | null | undefined) => (d ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }).format(d) : '—');
export const fmtDay = (d: Date) => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(d);
export function ago(d: Date, now = new Date()) {
  const s = now.getTime() - d.getTime();
  if (s < 6e4) return 'just now';
  if (s < 36e5) return `${Math.floor(s / 6e4)}m ago`;
  if (s < DAY) return `${Math.floor(s / 36e5)}h ago`;
  if (s < 7 * DAY) return `${Math.floor(s / DAY)}d ago`;
  return fmtDate(d);
}
export const rupees = (n: number) => (n ? '₹' + n.toLocaleString('en-IN') : '—');
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
export const kb = (b: number) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
/** Calendar day number in India time, for counting days left. */
export const istDay = (d: Date) => Math.floor((d.getTime() + 5.5 * 36e5) / DAY);
export function greeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: TZ }).format(now));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

type S = { status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'CHANGES' | 'APPROVED'; updates: { pct: number }[] };
export function progress(steps: S[]) {
  if (!steps.length) return 0;
  return Math.round(steps.reduce((a, s) => a + (s.status === 'APPROVED' ? 100 : s.updates.length ? s.updates[s.updates.length - 1].pct : 0), 0) / steps.length);
}
export const isOverdue = (p: { state: string; due: Date }, now = new Date()) => p.state !== 'COMPLETED' && istDay(p.due) < istDay(now);
export function dueText(p: { state: string; due: Date; closedAt: Date | null }, now = new Date()) {
  if (p.state === 'COMPLETED') return 'Closed ' + fmtDate(p.closedAt);
  const d = istDay(p.due) - istDay(now);
  return d < 0 ? `${-d}d overdue` : d === 0 ? 'Due today' : `${d}d left`;
}
export function projectStatus(p: { state: string; due: Date; steps: S[] }, now = new Date()): [string, string] {
  if (p.state === 'COMPLETED') return ['Completed', 'p-done'];
  if (isOverdue(p, now)) return ['Overdue', 'p-bad'];
  if (p.steps.some((s) => s.status === 'REVIEW')) return ['Needs approval', 'p-review'];
  if (p.steps.length && p.steps.every((s) => s.status === 'APPROVED')) return ['Ready to close', 'p-vio'];
  if (!p.steps.some((s) => s.updates.length)) return ['Not started', 'p-info'];
  return ['In progress', 'p-active'];
}
export const STEP_LABEL: Record<S['status'], [string, string]> = {
  TODO: ['Not started', 'p-todo'], IN_PROGRESS: ['In progress', 'p-active'], REVIEW: ['Waiting for approval', 'p-review'], CHANGES: ['Changes asked', 'p-changes'], APPROVED: ['Approved', 'p-done'],
};
export const ACCESS_LABEL = { MANAGE: { label: 'Manager', cls: 't-manage', help: 'Edits the project, adds people and steps, approves work.' }, CONTRIBUTE: { label: 'Team member', cls: 't-contribute', help: 'Works on the steps given to them and sends them for approval.' }, VIEW: { label: 'Viewer', cls: 't-view', help: 'Sees progress only. Good for clients.' } } as const;
export const TEMPLATES: Record<string, string[]> = {
  'Manpower deployment': ['Site survey & requirement assessment', 'Manpower sourcing & mobilisation', 'Documentation & safety induction', 'Deployment & daily operations', 'Handover & closure'],
  'Cable laying & trenching': ['Route survey & marking', 'Trenching', 'Cable laying & jointing', 'Testing & megger report', 'Backfilling & handover'],
  'Civil / foundation': ['Layout & excavation', 'PCC & reinforcement', 'Casting & curing', 'Quality check & cube test', 'Handover'],
  'Electrical maintenance': ['Scope walkthrough', 'Crew & material planning', 'Execution', 'Inspection', 'Client sign-off'],
  'Site survey': ['Desk review of drawings', 'Site visit', 'Measurements & photos', 'Survey report'],
  Other: ['Planning', 'Execution', 'Handover'],
};
