import Link from 'next/link';
import { ago } from '@/lib/format';
import { Icon, type IconName } from './Icon';

const KIND: Record<string, IconName> = { create: 'plus', update: 'edit', submit: 'send', approve: 'check', changes: 'x', member: 'users', close: 'shield', info: 'clock' };
export function Feed({ items }: { items: { id: string; text: string; kind: string; createdAt: Date; user: { name: string }; code?: string }[] }) {
  if (!items.length) return <div className="empty">No activity yet.</div>;
  return (
    <div className="feed">{items.map((e) => (
      <div className="ev" key={e.id}><span className="d"><Icon name={KIND[e.kind] ?? 'clock'} size="sm" /></span>
        <div><p><b>{e.user.name}</b> {e.text}{e.code && <> <Link className="link" href={`/projects/${e.code}`}>{e.code}</Link></>}</p><small>{ago(e.createdAt)}</small></div></div>
    ))}</div>
  );
}
