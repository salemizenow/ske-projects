import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { visibleProjects } from '@/lib/queries';
import { approvalsFor } from '@/lib/view';
import { isAdmin } from '@/lib/access';
import { ago } from '@/lib/format';
import { Page } from '@/components/Page';
import { Icon } from '@/components/Icon';
import { Avatar, Empty } from '@/components/ui';
import { UserDecision } from '../team/TeamClient';

export const metadata = { title: 'Approvals' };

export default async function Approvals() {
  const u = await requireUser();
  const list = approvalsFor(u, await visibleProjects(u));
  const pending = isAdmin(u) ? await db.user.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } }) : [];
  const names = new Map((await db.user.findMany({ where: { id: { in: list.map((a) => a.from).filter(Boolean) as string[] } }, select: { id: true, name: true } })).map((x) => [x.id, x.name]));
  return (
    <Page me={u} title="Approvals" back="/">
      <div className="ph"><div className="h"><h1>Approvals</h1><p>Steps sent to you, projects ready to close{isAdmin(u) ? ', and new accounts' : ''}.</p></div></div>
      {pending.length > 0 && <section className="card"><div className="card-h"><h3>New accounts</h3><span className="pill p-review">{pending.length}</span></div>
        <div className="list">{pending.map((p) => <div className="row" key={p.id}><Avatar name={p.name} /><span className="t"><b>{p.name}</b><small>{p.email} · {p.designation || 'No designation'}</small></span><UserDecision userId={p.id} /></div>)}</div></section>}
      <section className="card"><div className="card-h"><h3>Steps & projects</h3></div>
        {list.length ? <div className="list">{list.map((a) => (
          <Link className="row" key={a.project.id + (a.stepId ?? 'close')} href={`/projects/${a.project.code}${a.stepId ? '#step-' + a.stepId : ''}`}><span className="ic r"><Icon name={a.close ? 'shield' : 'flag'} /></span>
            <span className="t"><b>{a.close ? `Ready to close: ${a.project.title}` : a.stepTitle}</b><small>{a.project.code} · {a.close ? 'All steps approved' : `from ${names.get(a.from ?? '') ?? 'team'}${a.at ? ' · ' + ago(a.at) : ''}`}</small></span><Icon name="chev" size="sm" /></Link>))}</div>
          : <Empty title="Nothing waiting" text="When someone sends a step for approval it appears here." />}</section>
    </Page>
  );
}
