import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { visibleProjects, visibleWhere } from '@/lib/queries';
import { approvalsFor } from '@/lib/view';
import { accessOf, canCreateProjects, isAdmin } from '@/lib/access';
import { ago, fmtDay, greeting, isOverdue } from '@/lib/format';
import { Page } from '@/components/Page';
import { ProjectCard } from '@/components/ProjectCard';
import { Feed } from '@/components/Feed';
import { Icon } from '@/components/Icon';
import { Empty } from '@/components/ui';

export default async function Home() {
  const u = await requireUser();
  const [projects, pending, activity] = await Promise.all([
    visibleProjects(u),
    isAdmin(u) ? db.user.count({ where: { status: 'PENDING' } }) : 0,
    db.activity.findMany({ where: { project: visibleWhere(u) }, orderBy: { createdAt: 'desc' }, take: 7, include: { user: true, project: { select: { code: true } } } }),
  ]);
  const open = projects.filter((p) => p.state === 'ACTIVE');
  const tasks = open.filter((p) => accessOf(u, p) !== 'VIEW').flatMap((p) => p.steps.filter((s) => s.assigneeId === u.id && ['TODO', 'IN_PROGRESS', 'CHANGES'].includes(s.status)).map((s) => ({ p, s })));
  const approvals = approvalsFor(u, projects);
  const names = new Map((await db.user.findMany({ where: { id: { in: approvals.map((a) => a.from).filter(Boolean) as string[] } }, select: { id: true, name: true } })).map((x) => [x.id, x.name]));
  return (
    <Page me={u} title="SKE Projects" sub="Shri Krishna Enterprises">
      <div className="ph"><div className="h"><div className="eyebrow">{fmtDay(new Date())}</div><h1>{greeting()}, {u.name.split(' ')[0]}</h1>
        <p>{isAdmin(u) ? 'You have admin access to every project.' : canCreateProjects(u) ? 'You can create projects and choose who works on them.' : 'Here are the projects you are part of.'}</p></div></div>
      <section className="kpis">
        <div className="kpi"><div className="k"><span><Icon name="folder" size="sm" /></span>Open projects</div><div className="v">{open.length}</div><div className="s">{projects.length - open.length} completed</div></div>
        <div className="kpi"><div className="k"><span className="n"><Icon name="task" size="sm" /></span>My tasks</div><div className="v">{tasks.length}</div><div className="s">Steps given to you</div></div>
        <div className="kpi"><div className="k"><span className="w"><Icon name="flag" size="sm" /></span>For approval</div><div className="v">{approvals.length}</div><div className="s">{approvals.length ? 'Waiting on you' : 'Nothing waiting'}</div></div>
        <div className="kpi"><div className="k"><span className="o"><Icon name="clock" size="sm" /></span>Overdue</div><div className="v" style={open.some((p) => isOverdue(p)) ? { color: 'var(--bad)' } : undefined}>{open.filter((p) => isOverdue(p)).length}</div><div className="s">Past due date</div></div>
      </section>
      {pending > 0 && <div className="note" style={{ background: 'var(--gold-soft)', color: 'var(--warn)' }}><Icon name="users" size="sm" /><span><b>{pending} new account{pending > 1 ? 's' : ''}</b> waiting for approval. <Link className="link" href="/team">Review</Link></span></div>}
      <div className="cols two">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <section className="card"><div className="card-h"><h3>My tasks</h3><span className="muted num" style={{ fontSize: 13 }}>{tasks.length}</span></div>
            {tasks.length ? <div className="list">{tasks.map(({ p, s }) => (
              <Link className="row" key={s.id} href={`/projects/${p.code}#step-${s.id}`}><span className={`ic ${s.status === 'CHANGES' ? 'b' : ''}`}><Icon name={s.status === 'CHANGES' ? 'x' : 'task'} /></span>
                <span className="t"><b>{s.title}</b><small>{p.code} · {p.title}{s.status === 'CHANGES' ? ' · changes asked' : ''}</small></span><Icon name="chev" size="sm" /></Link>))}</div>
              : <Empty title="No tasks right now" text="Steps assigned to you show up here." />}</section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div className="card-h" style={{ padding: 0 }}><h3>{isAdmin(u) ? 'All projects' : 'My projects'}</h3><Link className="link" href="/projects">View all</Link></div>
            {open.length ? <div className="pgrid">{open.slice(0, 6).map((p) => <ProjectCard key={p.id} p={p} me={u} />)}</div>
              : <div className="card"><Empty title="No open projects" text={canCreateProjects(u) ? 'Create one and pick the people who will work on it.' : 'When someone adds you to a project, it appears here.'}>{canCreateProjects(u) && <Link className="btn" href="/projects/new"><Icon name="plus" />New project</Link>}</Empty></div>}</section>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <section className="card"><div className="card-h"><h3>Waiting for your approval</h3>{approvals.length > 0 && <span className="pill p-review">{approvals.length}</span>}</div>
            {approvals.length ? <div className="list">{approvals.slice(0, 5).map((a) => (
              <Link className="row" key={a.project.id + (a.stepId ?? 'close')} href={`/projects/${a.project.code}${a.stepId ? '#step-' + a.stepId : ''}`}><span className="ic r"><Icon name={a.close ? 'shield' : 'flag'} /></span>
                <span className="t"><b>{a.close ? 'All steps approved: close project' : `Approve: ${a.stepTitle}`}</b><small>{a.project.code} · {a.close ? a.project.title : `${names.get(a.from ?? '') ?? ''}${a.at ? ' · ' + ago(a.at) : ''}`}</small></span><Icon name="chev" size="sm" /></Link>))}</div>
              : <Empty title="All clear" text="No steps are waiting for you." />}</section>
          <section className="card"><div className="card-h"><h3>Recent activity</h3></div><Feed items={activity.map((e) => ({ ...e, code: e.project.code }))} /></section>
        </div>
      </div>
    </Page>
  );
}
