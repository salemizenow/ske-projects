import { requireUser } from '@/lib/auth';
import { canCreateProjects, isAdmin } from '@/lib/access';
import { logout } from '@/app/actions/auth';
import { Page } from '@/components/Page';
import { Avatar } from '@/components/ui';
import { Icon } from '@/components/Icon';

export const metadata = { title: 'Profile' };

export default async function Profile() {
  const u = await requireUser();
  return (
    <Page me={u} title="Profile">
      <section className="phero"><div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><Avatar name={u.name} admin={isAdmin(u)} size="lg" /><div><h1 style={{ fontSize: 24 }}>{u.name}</h1><p className="muted">{u.designation}</p></div></div>
        <div className="facts"><div className="fact"><small>Email</small><b>{u.email}</b></div><div className="fact"><small>Mobile</small><b className="num">{u.phone ? `+91 ${u.phone}` : '—'}</b></div><div className="fact"><small>Access</small><b>{isAdmin(u) ? 'Admin' : canCreateProjects(u) ? 'Member, creates projects' : 'Member'}</b></div></div></section>
      <form action={logout}><button className="btn ghost" type="submit"><Icon name="out" size="sm" />Sign out</button></form>
      <p className="ver">next-v1.0</p>
    </Page>
  );
}
