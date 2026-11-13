'use client';
import { useState, useTransition } from 'react';
import { rejectUser, setCanCreate, setRole, setUserStatus } from '@/app/actions/team';
import type { FormState } from '@/app/actions/auth';

function useRun() {
  const [pending, start] = useTransition(); const [err, setErr] = useState('');
  const run = (fn: () => Promise<FormState>) => start(async () => { setErr(''); const r = await fn(); if (r.error) setErr(r.error); });
  return { pending, err, run };
}

export function UserDecision({ userId }: { userId: string }) {
  const { pending, err, run } = useRun();
  return (<span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    <button className="btn sm ok" disabled={pending} onClick={() => run(() => setUserStatus(userId, 'ACTIVE'))}>Approve</button>
    <button className="btn sm bad" disabled={pending} onClick={() => run(() => rejectUser(userId))}>Reject</button>
    {err && <small style={{ color: 'var(--bad)' }}>{err}</small>}
  </span>);
}

export function TeamControls({ userId, self, role, canCreate, active }: { userId: string; self: boolean; role: 'ADMIN' | 'MEMBER'; canCreate: boolean; active: boolean }) {
  const { pending, err, run } = useRun();
  return (<>
    <select aria-label="Role" defaultValue={role} disabled={self || pending} onChange={(e) => run(() => setRole(userId, e.target.value as 'ADMIN' | 'MEMBER'))}><option value="ADMIN">Admin</option><option value="MEMBER">Member</option></select>
    <label className="sw"><span className="switch"><input type="checkbox" defaultChecked={canCreate} disabled={role === 'ADMIN' || pending} onChange={(e) => run(() => setCanCreate(userId, e.target.checked))} /><span /></span>Creates projects</label>
    <label className="sw"><span className="switch"><input type="checkbox" defaultChecked={active} disabled={self || pending} onChange={(e) => run(() => setUserStatus(userId, e.target.checked ? 'ACTIVE' : 'DISABLED'))} /><span /></span>Can sign in</label>
    {err && <small style={{ color: 'var(--bad)', gridColumn: '1 / -1' }}>{err}</small>}
  </>);
}
