import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { visibleProjects, type ListProject } from '@/lib/queries';
import { accessOf, isAdmin } from '@/lib/access';
import { isOverdue } from '@/lib/format';
import { Page } from '@/components/Page';
import { ProjectCard } from '@/components/ProjectCard';
import { Icon } from '@/components/Icon';
import { Empty } from '@/components/ui';
import type { User } from '@prisma/client';

export const metadata = { title: 'Projects' };
const FILTERS = [['all', 'All'], ['mine', 'I manage'], ['open', 'Open'], ['review', 'Needs approval'], ['overdue', 'Overdue'], ['done', 'Completed']] as const;
type F = (typeof FILTERS)[number][0];
const match = (u: User, p: ListProject, f: F) => f === 'all' || (f === 'mine' && accessOf(u, p) === 'MANAGE') || (f === 'open' && p.state === 'ACTIVE') || (f === 'review' && p.steps.some((s) => s.status === 'REVIEW')) || (f === 'overdue' && isOverdue(p)) || (f === 'done' && p.state === 'COMPLETED');

export default async function Projects({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const u = await requireUser(); const sp = await searchParams;
  const f = (FILTERS.find(([k]) => k === sp.f)?.[0] ?? 'all') as F; const q = (sp.q ?? '').trim().toLowerCase();
  const all = await visibleProjects(u);
  const list = all.filter((p) => match(u, p, f)).filter((p) => !q || [p.code, p.title, p.client, p.site].join(' ').toLowerCase().includes(q));
  const href = (k: string) => `/projects?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  return (
    <Page me={u} title="Projects">
      <div className="ph"><div className="h"><h1>Projects</h1><p>{isAdmin(u) ? 'Every project in the company.' : 'Projects you were added to.'}</p></div>
        <form className="search" action="/projects" role="search"><Icon name="search" /><input type="hidden" name="f" value={f} /><label className="sr" htmlFor="q">Search</label><input id="q" name="q" type="search" placeholder="Search by name, site or client" defaultValue={sp.q ?? ''} /></form></div>
      <div className="filters" role="group" aria-label="Filter">{FILTERS.map(([k, l]) => <Link key={k} className="chip" href={href(k)} aria-current={f === k ? "page" : undefined}>{l}<span className="n num">{all.filter((p) => match(u, p, k)).length}</span></Link>)}</div>
      {list.length ? <div className="pgrid">{list.map((p) => <ProjectCard key={p.id} p={p} me={u} />)}</div> : <div className="card"><Empty title="No projects here" text="Try another filter or search." /></div>}
    </Page>
  );
}
