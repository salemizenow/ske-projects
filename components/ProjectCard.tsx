import Link from 'next/link';
import type { User } from '@prisma/client';
import type { ListProject } from '@/lib/queries';
import { accessOf } from '@/lib/access';
import { ACCESS_LABEL, dueText, fmtDate, isOverdue, progress, projectStatus } from '@/lib/format';
import { Icon } from './Icon';
import { Avatar } from './ui';

export function ProjectCard({ p, me }: { p: ListProject; me: User }) {
  const a = accessOf(me, p)!; const [label, cls] = projectStatus(p); const pc = progress(p.steps);
  const people = [p.owner, ...p.members.map((m) => m.user).filter((u) => u.id !== p.ownerId)];
  return (
    <Link className="pc" href={`/projects/${p.code}`}>
      <span className="m"><span className="mono muted">{p.code}</span><span className={`tag ${ACCESS_LABEL[a].cls}`}>{ACCESS_LABEL[a].label}</span><span className={`pill ${cls}`} style={{ marginLeft: 'auto' }}>{label}</span></span>
      <h4>{p.title}</h4>
      <span className="sub"><Icon name="pin" size="sm" />{p.site || '—'}{p.client ? ` · ${p.client}` : ''}</span>
      <span className="foot"><span className="stack">{people.slice(0, 4).map((u) => <Avatar key={u.id} name={u.name} size="sm" />)}</span><span className={`bar ${pc === 100 ? 'done' : ''}`}><i style={{ width: `${pc}%` }} /></span><b className="num">{pc}%</b></span>
      <span className="sub" style={isOverdue(p) ? { color: 'var(--bad)', fontWeight: 600 } : undefined}><Icon name="clock" size="sm" />{p.state === 'COMPLETED' ? dueText(p) : `Due ${fmtDate(p.due)} · ${dueText(p)}`}</span>
    </Link>
  );
}
