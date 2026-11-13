import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, burnPasswordCheck } from '../lib/password.ts';
import { accessOf, canUpdateStep, canReviewStep, canComplete, canCreateProjects, assignableIds, type UserLike, type ProjectLike } from '../lib/access.ts';
import { presign, objectKey } from '../lib/storage.ts';
import { progress, projectStatus, dueText, istDay } from '../lib/format.ts';

test('passwords hash with salt and verify', async () => {
  const h = await hashPassword('ske@1234');
  assert.match(h, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(h, await hashPassword('ske@1234'), 'salted');
  assert.equal(await verifyPassword('ske@1234', h), true);
  assert.equal(await verifyPassword('ske@1235', h), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
  assert.equal(await burnPasswordCheck('anything'), false);
});

const U = (id: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER', canCreate = false, status: UserLike['status'] = 'ACTIVE'): UserLike => ({ id, role, canCreate, status });
const P: ProjectLike = { ownerId: 'amit', state: 'ACTIVE', members: [{ userId: 'manoj', access: 'CONTRIBUTE' }, { userId: 'hbl', access: 'VIEW' }] };

test('access follows role, ownership and membership', () => {
  assert.equal(accessOf(U('satyam', 'ADMIN'), P), 'MANAGE');
  assert.equal(accessOf(U('amit'), P), 'MANAGE');
  assert.equal(accessOf(U('manoj'), P), 'CONTRIBUTE');
  assert.equal(accessOf(U('hbl'), P), 'VIEW');
  assert.equal(accessOf(U('pawan'), P), null, 'not added: no access');
  assert.equal(accessOf(U('satyam', 'ADMIN', true, 'DISABLED'), P), null, 'disabled admin: nothing');
  assert.equal(canCreateProjects(U('amit', 'MEMBER', true)), true);
  assert.equal(canCreateProjects(U('manoj')), false);
  assert.deepEqual(assignableIds(P), ['amit', 'manoj']);
});

test('only the step owner updates; only managers approve', () => {
  const step = { assigneeId: 'manoj', status: 'IN_PROGRESS' as const };
  assert.equal(canUpdateStep(U('manoj'), P, step), true);
  assert.equal(canUpdateStep(U('amit'), P, step), false, 'manager is not the owner of this step');
  assert.equal(canUpdateStep(U('hbl'), P, { ...step, assigneeId: 'hbl' }), false, 'viewer never works on steps');
  assert.equal(canUpdateStep(U('manoj'), P, { ...step, status: 'REVIEW' }), false, 'locked while in review');
  assert.equal(canUpdateStep(U('manoj'), { ...P, state: 'COMPLETED' }, step), false);
  assert.equal(canReviewStep(U('amit'), P, { ...step, status: 'REVIEW' }), true);
  assert.equal(canReviewStep(U('manoj'), P, { ...step, status: 'REVIEW' }), false);
  assert.equal(canComplete(U('amit'), { ...P, steps: [{ assigneeId: 'manoj', status: 'APPROVED' }] }), true);
  assert.equal(canComplete(U('amit'), { ...P, steps: [{ assigneeId: 'manoj', status: 'REVIEW' }] }), false);
});

test('S3 presigned URL matches the AWS documentation example', () => {
  const url = presign({ bucket: 'examplebucket', region: 'us-east-1', accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', endpoint: 'https://s3.amazonaws.com' },
    { method: 'GET', key: 'test.txt', expires: 86400, now: new Date('2013-05-24T00:00:00Z'), virtualHost: true });
  assert.ok(url.startsWith('https://examplebucket.s3.amazonaws.com/test.txt?'));
  assert.ok(url.endsWith('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'), url);
  assert.equal(objectKey('PRJ-1001', '../../etc/pass wd?.pdf', 'ab12'), 'projects/PRJ-1001/ab12-.-.-etc-pass-wd-.pdf');
});

test('progress, status and due text', () => {
  const steps = [{ status: 'APPROVED' as const, updates: [] }, { status: 'REVIEW' as const, updates: [{ pct: 100 }] }, { status: 'IN_PROGRESS' as const, updates: [{ pct: 40 }] }, { status: 'TODO' as const, updates: [] }];
  assert.equal(progress(steps), 60);
  const now = new Date('2026-11-13T12:00:00+05:30');
  assert.deepEqual(projectStatus({ state: 'ACTIVE', due: new Date('2026-11-27T00:00:00+05:30'), steps }, now), ['Needs approval', 'p-review']);
  assert.deepEqual(projectStatus({ state: 'ACTIVE', due: new Date('2026-11-12T00:00:00+05:30'), steps }, now), ['Overdue', 'p-bad']);
  assert.equal(dueText({ state: 'ACTIVE', due: new Date('2026-11-27T00:00:00+05:30'), closedAt: null }, now), '14d left');
  assert.equal(dueText({ state: 'ACTIVE', due: new Date('2026-11-13T00:00:00+05:30'), closedAt: null }, new Date('2026-11-13T23:50:00+05:30')), 'Due today');
  assert.equal(istDay(new Date('2026-11-13T23:59:00+05:30')), istDay(new Date('2026-11-13T00:01:00+05:30')));
});
