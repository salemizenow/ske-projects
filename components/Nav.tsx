'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icon';
import { initials } from '@/lib/format';
import { logout } from '@/app/actions/auth';

type Me = { name: string; designation: string | null; admin: boolean; canCreate: boolean };
type Counts = { approvals: number; pending: number };

function useActive() {
  const path = usePathname();
  return (href: string) => (href === '/' ? path === '/' : path === href || (href === '/projects' && path.startsWith('/projects/') && path !== '/projects/new'));
}

export function Sidebar({ me, counts }: { me: Me; counts: Counts }) {
  const active = useActive();
  const item = (href: string, icon: IconName, label: string, badge = 0) => (
    <Link href={href} aria-current={active(href) ? 'page' : undefined}><Icon name={icon} /><span>{label}</span>{badge > 0 && <span className="badge">{badge}</span>}</Link>
  );
  return (
    <aside className="side">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-l" src="/brand/logo.svg" alt="Shri Krishna Enterprises" />
      <span className="lab">SKE PROJECTS</span>
      {me.canCreate && <Link className="btn gold newp" href="/projects/new"><Icon name="plus" />New project</Link>}
      <nav aria-label="Main">
        {item('/', 'home', 'Home')}
        {item('/projects', 'folder', 'Projects')}
        {item('/approvals', 'flag', 'Approvals', counts.approvals + (me.admin ? counts.pending : 0))}
        {me.admin && item('/team', 'users', 'Team & access', counts.pending)}
        {item('/profile', 'user', 'Profile')}
      </nav>
      <div className="meu">
        <span className={`av ${me.admin ? 'navy' : ''}`}>{initials(me.name)}</span>
        <span className="t"><b>{me.name}</b><small>{me.admin ? 'Admin' : me.canCreate ? 'Can create projects' : 'Member'}{me.designation ? ` · ${me.designation}` : ''}</small></span>
        <form action={logout}><button type="submit" aria-label="Sign out"><Icon name="out" size="sm" /></button></form>
      </div>
    </aside>
  );
}

export function TabBar({ me, counts }: { me: Me; counts: Counts }) {
  const active = useActive();
  const tab = (href: string, icon: IconName, label: string, badge = 0) => (
    <Link className="tab" href={href} aria-current={active(href) ? 'page' : undefined}><Icon name={icon} /><span>{label}</span>{badge > 0 && <span className="badge">{badge}</span>}</Link>
  );
  return (
    <nav className="tabs" aria-label="Main">
      <div className="tabs-in">
        {tab('/', 'home', 'Home')}
        {tab('/projects', 'folder', 'Projects')}
        {me.canCreate && <Link className="tab fab" href="/projects/new" aria-label="New project"><span className="f"><Icon name="plus" /></span></Link>}
        {tab('/approvals', 'flag', 'Approvals', counts.approvals + (me.admin ? counts.pending : 0))}
        {me.admin ? tab('/team', 'users', 'Team', counts.pending) : tab('/profile', 'user', 'Profile')}
      </div>
    </nav>
  );
}

export function TopBar({ title, sub, back, me }: { title: string; sub?: string; back?: string; me: Me }) {
  return (
    <header className="top"><div className="top-in">
      {back ? <Link className="back" href={back} aria-label="Back"><Icon name="back" /></Link>
        : <span className="emblem">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/emblem.svg" alt="" /></span>}
      <div className="ttl"><b>{title}</b>{sub && <small>{sub}</small>}</div>
      <Link className="me" href="/profile" aria-label="Profile"><span className={`av ${me.admin ? 'navy' : ''}`}>{initials(me.name)}</span></Link>
    </div></header>
  );
}
