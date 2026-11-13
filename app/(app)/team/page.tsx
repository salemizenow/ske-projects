import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { Page } from '@/components/Page';
import { Avatar } from '@/components/ui';
import { TeamControls, UserDecision } from './TeamClient';

export const metadata = { title: 'Team & access' };
const ORDER = { PENDING: 0, ACTIVE: 1, DISABLED: 2 } as const;

export default async function Team() {
  const me = await requireAdmin();
  const users = await db.user.findMany({ include: { _count: { select: { owned: true, memberships: true } } } });
  users.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name));
  return (
    <Page me={me} title="Team & access">
      <div className="ph"><div className="h"><h1>Team & access</h1><p>Approve new accounts, make admins, and choose who can create projects.</p></div></div>
      <section className="card"><div>{users.map((x) => (
        <div className="urow" key={x.id}>
          <div className="who"><Avatar name={x.name} admin={x.role === 'ADMIN'} /><span className="t"><b>{x.name}{x.id === me.id ? ' (you)' : ''}</b><small>{x.email} · {x.designation || '—'} · {x._count.owned + x._count.memberships} projects</small></span></div>
          {x.status === 'PENDING' ? <><span className="pill p-review">Waiting</span><UserDecision userId={x.id} /></>
            : <TeamControls userId={x.id} self={x.id === me.id} role={x.role} canCreate={x.role === 'ADMIN' || x.canCreate} active={x.status === 'ACTIVE'} />}
        </div>))}</div></section>
      <p className="muted" style={{ fontSize: 13 }}>Admins see every project. Members see only projects they are added to. New accounts sign up on the register page and wait here for approval.</p>
    </Page>
  );
}
