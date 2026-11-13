import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { loadProjectFor } from '@/lib/queries';
import { assignableIds, canComplete, canReviewStep, canUpdateStep } from '@/lib/access';
import { ACCESS_LABEL, STEP_LABEL, ago, dueText, fmtDate, isOverdue, kb, progress, projectStatus, rupees } from '@/lib/format';
import { Page } from '@/components/Page';
import { Icon } from '@/components/Icon';
import { Avatar, Empty } from '@/components/ui';
import { Feed } from '@/components/Feed';
import { CopyButton } from '@/components/CopyButton';
import { StepActions, AddStepButton, CompleteButton, MemberAccess, AddMembersButton, CreatedDialog } from './ProjectClient';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) { return { title: (await params).code }; }

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ created?: string }> }) {
  const u = await requireUser();
  const { code } = await params; const { created } = await searchParams;
  const { project: p, access: a, exists } = await loadProjectFor(u, code);
  if (!exists) notFound();
  if (!p || !a) return (
    <Page me={u} title={code} back="/"><div className="card"><Empty title="You don't have access to this project" text="Ask the project manager or an admin to add you."><Link className="btn" href="/">Go home</Link></Empty></div></Page>
  );
  const manage = a === 'MANAGE'; const active = p.state === 'ACTIVE';
  const [label, cls] = projectStatus(p); const pc = progress(p.steps);
  const link = `${process.env.APP_URL || ''}/projects/${p.code}`;
  const people = [{ user: p.owner, access: 'MANAGE' as const, owner: true }, ...p.members.filter((m) => m.userId !== p.ownerId).map((m) => ({ user: m.user, access: m.access, owner: false }))];
  const team = assignableIds(p).map((id) => people.find((x) => x.user.id === id)!.user).map((x) => ({ id: x.id, name: x.name }));
  const outsiders = manage && active ? await db.user.findMany({ where: { status: 'ACTIVE', id: { notIn: people.map((x) => x.user.id) } }, orderBy: { name: 'asc' }, select: { id: true, name: true, designation: true, email: true } }) : [];
  const wa = (name: string, phone: string) => `https://wa.me/91${phone}?text=${encodeURIComponent(`Namaste ${name.split(' ')[0]}, you are added to ${p.code} ${p.title} on SKE Projects. Open: ${link}`)}`;
  const fileHref = (id: string, key: string | null) => (key ? `/api/files/${id}` : undefined);

  return (
    <Page me={u} title={p.code} sub={p.client ?? undefined} back="/projects">
      {created && manage && <CreatedDialog code={p.code} title={p.title} link={link} people={people.filter((x) => !x.owner).map((x) => ({ name: x.user.name, wa: x.user.phone ? wa(x.user.name, x.user.phone) : null }))} />}
      <section className="phero">
        <div className="meta"><span className="mono">{p.code}</span>·<span>{p.category}</span><span className={`tag ${ACCESS_LABEL[a].cls}`}>Your access: {ACCESS_LABEL[a].label}</span></div>
        <h1>{p.title}</h1>
        <div className="meta"><span className={`pill ${cls}`}>{label}</span><span style={isOverdue(p) ? { color: 'var(--bad)', fontWeight: 600 } : undefined}>Due {fmtDate(p.due)} · {dueText(p)}</span></div>
        <div className="prog"><span className={`bar ${pc === 100 ? 'done' : ''}`}><i style={{ width: `${pc}%` }} /></span><b className="num">{pc}%</b><span className="muted num" style={{ fontSize: 13 }}>{p.steps.filter((s) => s.status === 'APPROVED').length}/{p.steps.length} approved</span></div>
        <div className="facts"><div className="fact"><small>Client</small><b>{p.client || '—'}</b></div><div className="fact"><small>Site</small><b>{p.site || '—'}</b></div><div className="fact"><small>Manager</small><b>{p.owner.name}</b></div>{manage && <div className="fact"><small>Value</small><b className="num">{rupees(p.budget)}</b></div>}</div>
        {canComplete(u, p) && <div className="acts"><CompleteButton code={p.code} /></div>}
      </section>

      <div className="cols two">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div className="card-h" style={{ padding: 0 }}><h3>Steps</h3><span className="muted" style={{ fontSize: 13 }}>{a === 'VIEW' ? 'View only' : a === 'CONTRIBUTE' ? 'You can update the steps given to you' : 'You approve each step'}</span></div>
          <div className="steps">{p.steps.map((s, i) => {
            const [sl, sc] = STEP_LABEL[s.status]; const mine = s.assigneeId === u.id && a !== 'VIEW';
            return (
              <article className={`step ${s.status.toLowerCase()} ${mine && s.status !== 'APPROVED' ? 'mine' : ''}`} id={`step-${s.id}`} key={s.id}>
                <span className="no">{s.status === 'APPROVED' ? <Icon name="check" size="sm" /> : i + 1}</span>
                <div className="hd"><b>{s.title}</b><span className={`pill ${sc}`}>{sl}</span></div>
                <div className="who">{s.assignee ? <><Avatar name={s.assignee.name} />{s.assignee.name}{mine && <b style={{ color: 'var(--gold)' }}>· your step</b>}</> : <span>Not assigned yet</span>}</div>
                <div className="body">
                  {s.updates.map((up) => (
                    <div className="upd" key={up.id}><Avatar name={up.author.name} /><span className="w"><b>{up.author.name}</b>· {ago(up.createdAt)} · <b className="num">{up.pct}%</b></span><p>{up.note}</p>
                      {up.files.length > 0 && <div className="files" style={{ gridColumn: 2 }}>{up.files.map((f) => { const h = fileHref(f.id, f.key); const inner = <><Icon name="clip" size="sm" /><span>{f.name}</span><small>{kb(f.size)}</small></>; return h ? <a className="file" key={f.id} href={h} target="_blank" rel="noopener">{inner}</a> : <span className="file" key={f.id}>{inner}</span>; })}</div>}</div>))}
                  {s.reviewDecision && <div className={`verdict ${s.reviewDecision === 'approved' ? 'ok' : 'bad'}`}><Icon name={s.reviewDecision === 'approved' ? 'check' : 'x'} size="sm" /><span><b>{s.reviewer?.name ?? 'Manager'} {s.reviewDecision === 'approved' ? 'approved' : 'asked for changes'}</b>{s.reviewNote ? `: ${s.reviewNote}` : ''}</span></div>}
                  <StepActions code={p.code} step={{ id: s.id, title: s.title, assigneeId: s.assigneeId, lastPct: s.updates.at(-1)?.pct ?? 0 }} owner={p.owner.name}
                    can={{ update: canUpdateStep(u, p, s), submit: canUpdateStep(u, p, s) && s.updates.length > 0, review: canReviewStep(u, p, s), assign: manage && active && s.status !== 'APPROVED' }} team={team} />
                </div>
              </article>);
          })}</div>
          {manage && active && <AddStepButton code={p.code} team={team} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <section className="share">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="row" style={{ padding: 0, border: 'none', width: 'auto' }}><span className="ic"><Icon name="link" /></span></span><div><b style={{ display: 'block' }}>Project link</b><small className="muted">Only the people on this project can open it.</small></div></div>
            <div className="lk"><code>{link}</code><CopyButton text={link} /></div>
            {manage && <div className="acts">{people.filter((x) => x.user.id !== u.id && x.user.phone).slice(0, 6).map((x) => <a key={x.user.id} className="btn sm ghost" target="_blank" rel="noopener" href={wa(x.user.name, x.user.phone!)}><Icon name="wa" size="sm" />{x.user.name.split(' ')[0]}</a>)}</div>}
          </section>
          <section className="card"><div className="card-h"><h3>People</h3>{manage && active && <AddMembersButton code={p.code} candidates={outsiders} />}</div>
            <div>{people.map((x) => (
              <div className="member" key={x.user.id}><Avatar name={x.user.name} admin={x.user.role === 'ADMIN'} />
                <span className="t"><b>{x.user.name}{x.user.id === u.id ? ' (you)' : ''}</b><small>{x.user.designation || x.user.email}</small></span>
                {manage && active && !x.owner ? <MemberAccess code={p.code} userId={x.user.id} name={x.user.name} access={x.access} /> : <span className={`tag ${ACCESS_LABEL[x.access].cls}`}>{x.owner ? 'Owner' : ACCESS_LABEL[x.access].label}</span>}
              </div>))}</div></section>
          <section className="card"><div className="card-h"><h3>Brief</h3></div><div className="card-b"><p style={{ whiteSpace: 'pre-wrap' }}>{p.brief}</p>
            {p.documents.length > 0 && <div className="files">{p.documents.map((f) => { const h = fileHref(f.id, f.key); const inner = <><Icon name="clip" size="sm" /><span>{f.name}</span><small>{kb(f.size)}</small></>; return h ? <a className="file" key={f.id} href={h} target="_blank" rel="noopener">{inner}</a> : <span className="file" key={f.id}>{inner}</span>; })}</div>}
            <div className="facts"><div className="fact"><small>Start</small><b>{fmtDate(p.start)}</b></div><div className="fact"><small>Due</small><b>{fmtDate(p.due)}</b></div>{p.workOrder && <div className="fact"><small>Work order</small><b>{p.workOrder}</b></div>}</div></div></section>
          <section className="card"><div className="card-h"><h3>Activity</h3></div><Feed items={p.activity} /></section>
        </div>
      </div>
    </Page>
  );
}
