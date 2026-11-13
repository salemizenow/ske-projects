// Demo data: `npm run db:seed`. Skips if users already exist. Password for every demo account: SEED_PASSWORD (default ske@1234).
import { PrismaClient, type StepStatus } from '@prisma/client';
import { hashPassword } from '../lib/password';

const db = new PrismaClient();
const D = 864e5;
const day = (s: string) => new Date(s + 'T00:00:00+05:30');
const ago = (days: number, hours = 0) => new Date(Date.now() - days * D - hours * 36e5);

async function main() {
  if (await db.user.count()) { console.log('Users already exist; seed skipped.'); return; }
  const pw = await hashPassword(process.env.SEED_PASSWORD || 'ske@1234');
  const mk = (name: string, email: string, phone: string | null, designation: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER', canCreate = false, status: 'ACTIVE' | 'PENDING' = 'ACTIVE') =>
    db.user.create({ data: { name, email, phone, designation, role, canCreate, status, passwordHash: pw } });
  const satyam = await mk('Satyam Tiwari', 'satyam.tiwari@example.com', '8957852639', 'Proprietor', 'ADMIN', true);
  const amit = await mk('Amit Mishra', 'amit.mishra@example.com', '9000000002', 'Project manager', 'MEMBER', true);
  const manoj = await mk('Manoj Tiwari', 'manoj.tiwari@example.com', '9000000006', 'Site supervisor');
  const pawan = await mk('Pawan Yadav', 'pawan.yadav@example.com', '9000000011', 'Field supervisor');
  const ravi = await mk('Ravi Verma', 'ravi.verma@example.com', '9000000012', 'Site engineer');
  const hbl = await mk('HBL project team', 'hbl.client@example.com', null, 'Client');
  await mk('Neha Gupta', 'neha.gupta@example.com', '9000000003', 'Accounts', 'MEMBER', false, 'PENDING');

  type StepIn = { title: string; assigneeId: string; status?: StepStatus; updates?: { by: string; at: Date; pct: number; note: string }[]; review?: { by: string; at: Date; decision: 'approved' | 'changes'; note?: string }; submittedAt?: Date };
  async function project(code: string, p: { title: string; category: string; client: string; site: string; workOrder?: string; start: Date; due: Date; budget: number; brief: string; ownerId: string; members: [string, 'MANAGE' | 'CONTRIBUTE' | 'VIEW'][]; steps: StepIn[]; completed?: Date; createdAt: Date }) {
    const created = await db.project.create({ data: {
      code, title: p.title, category: p.category, client: p.client, site: p.site, workOrder: p.workOrder, start: p.start, due: p.due, budget: p.budget, brief: p.brief, ownerId: p.ownerId,
      state: p.completed ? 'COMPLETED' : 'ACTIVE', closedAt: p.completed, createdAt: p.createdAt,
      members: { create: p.members.map(([userId, access]) => ({ userId, access })) },
      activity: { create: [{ userId: p.ownerId, text: `created the project and added ${p.members.length} people`, kind: 'create', createdAt: p.createdAt }] },
    } });
    for (const [i, s] of p.steps.entries()) {
      await db.step.create({ data: {
        projectId: created.id, position: i, title: s.title, assigneeId: s.assigneeId, status: s.status ?? 'TODO', submittedAt: s.submittedAt,
        reviewDecision: s.review?.decision, reviewNote: s.review?.note, reviewedAt: s.review?.at, reviewerId: s.review?.by,
        updates: { create: (s.updates ?? []).map((u) => ({ authorId: u.by, createdAt: u.at, pct: u.pct, note: u.note })) },
      } });
    }
  }

  await project('PRJ-1001', { title: 'Manpower deployment — Kanpur Central yard', category: 'Manpower deployment', client: 'HBL Engineering', site: 'Kanpur Central, UP', workOrder: 'HBL/WO/2026/118', start: ago(16), due: ago(-14), budget: 1850000, createdAt: ago(16),
    brief: 'Deploy 24 skilled and semi-skilled workers at Kanpur Central yard for two-shift signalling maintenance support, as per the survey report.', ownerId: amit.id,
    members: [[manoj.id, 'CONTRIBUTE'], [ravi.id, 'CONTRIBUTE'], [hbl.id, 'VIEW']],
    steps: [
      { title: 'Site survey & requirement assessment', assigneeId: manoj.id, status: 'APPROVED', updates: [{ by: manoj.id, at: ago(14), pct: 100, note: 'Confirmed 24 workers across two shifts; added 2 standby helpers.' }], review: { by: amit.id, at: ago(13), decision: 'approved', note: 'Good. Proceed.' } },
      { title: 'Manpower sourcing & mobilisation', assigneeId: manoj.id, status: 'REVIEW', submittedAt: ago(0, 20), updates: [{ by: manoj.id, at: ago(5), pct: 70, note: '18 workers mobilised, stay arranged near Gate 2.' }, { by: manoj.id, at: ago(1, 3), pct: 100, note: 'All 26 workers on site. Attendance register started.' }] },
      { title: 'Documentation & safety induction', assigneeId: ravi.id, status: 'IN_PROGRESS', updates: [{ by: ravi.id, at: ago(0, 14), pct: 45, note: 'Safety induction for the first batch of 12 done. PPE issued.' }] },
      { title: 'Deployment & daily operations', assigneeId: manoj.id },
      { title: 'Handover & closure', assigneeId: amit.id },
    ] });
  await project('PRJ-1002', { title: 'OFC trenching & cable laying — Station C', category: 'Cable laying & trenching', client: 'EPC Partner', site: 'Station C, Prayagraj division', workOrder: 'EPC/STC/2026/044', start: ago(2), due: ago(-36), budget: 640000, createdAt: ago(2),
    brief: 'Trench 2.4 km along the marked route, lay 24F OFC in HDPE duct, joint and test. No digging within 3 m of the track without a railway supervisor present.', ownerId: satyam.id,
    members: [[pawan.id, 'CONTRIBUTE'], [amit.id, 'MANAGE']],
    steps: [
      { title: 'Route survey & marking', assigneeId: pawan.id, status: 'CHANGES', updates: [{ by: pawan.id, at: ago(1, 5), pct: 80, note: 'Route marked for 1.9 km with lime and pegs.' }], review: { by: satyam.id, at: ago(0, 22), decision: 'changes', note: 'Mark the last 500 m near the culvert too, with photos.' } },
      { title: 'Trenching', assigneeId: pawan.id }, { title: 'Cable laying & jointing', assigneeId: pawan.id }, { title: 'Testing & megger report', assigneeId: amit.id }, { title: 'Backfilling & handover', assigneeId: pawan.id },
    ] });
  await project('PRJ-1003', { title: 'Kavach tower foundation — Depot D', category: 'Civil / foundation', client: 'HBL Engineering', site: 'Depot D, Jhansi', workOrder: 'HBL/WO/2026/097', start: ago(34), due: ago(-7), budget: 220000, createdAt: ago(34),
    brief: 'Two RCC foundations for Kavach communication towers as per drawing KV-F-12, with cube testing.', ownerId: satyam.id,
    members: [[ravi.id, 'CONTRIBUTE'], [hbl.id, 'VIEW']],
    steps: ['Layout & excavation', 'PCC & reinforcement', 'Casting & curing', 'Quality check & cube test'].map((title, i) => ({ title, assigneeId: ravi.id, status: 'APPROVED' as const, updates: [{ by: ravi.id, at: ago(29 - i * 4), pct: 100, note: ['Excavation to 2.1 m done for both pits.', 'Reinforcement tied and inspected.', 'Both foundations cast, M25.', '7-day cube strength 18.6 MPa.'][i] }], review: { by: satyam.id, at: ago(28 - i * 4), decision: 'approved' as const } })) });
  await project('PRJ-1004', { title: 'Site survey — Prayagraj goods shed', category: 'Site survey', client: 'EPC Partner', site: 'Prayagraj goods shed', start: day('2026-10-05'), due: day('2026-10-20'), budget: 75000, createdAt: day('2026-10-05'), completed: day('2026-10-19'),
    brief: 'Survey the goods shed for the lighting upgrade tender: measurements, fittings and photos.', ownerId: amit.id, members: [[manoj.id, 'CONTRIBUTE']],
    steps: ['Desk review of drawings', 'Site visit', 'Measurements & photos', 'Survey report'].map((title, i) => ({ title, assigneeId: manoj.id, status: 'APPROVED' as const, updates: [{ by: manoj.id, at: day(`2026-10-0${6 + i}`), pct: 100, note: 'Done.' }], review: { by: amit.id, at: day(`2026-10-1${i}`), decision: 'approved' as const } })) });
  console.log('Seeded 7 users and 4 projects.');
}
main().finally(() => db.$disconnect());
