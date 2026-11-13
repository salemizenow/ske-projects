import { requireCreator } from '@/lib/auth';
import { db } from '@/lib/db';
import { Page } from '@/components/Page';
import { NewProjectForm } from './NewProjectForm';

export const metadata = { title: 'New project' };

export default async function NewProject() {
  const u = await requireCreator();
  const people = await db.user.findMany({ where: { status: 'ACTIVE', id: { not: u.id } }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, designation: true, role: true } });
  return (
    <Page me={u} title="New project" back="/">
      <div className="ph"><div className="h"><div className="eyebrow">New project</div><h1>Create a project</h1><p>Pick the people, give each step an owner, and share the link.</p></div></div>
      <NewProjectForm me={{ id: u.id, name: u.name }} people={people} />
    </Page>
  );
}
