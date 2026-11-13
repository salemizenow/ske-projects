import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser } from './session';
import { canCreateProjects, isAdmin } from './access';

/** For pages: sends signed-out visitors to the login page. */
export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u;
}
export async function requireAdmin() {
  const u = await requireUser();
  if (!isAdmin(u)) redirect('/');
  return u;
}
export async function requireCreator() {
  const u = await requireUser();
  if (!canCreateProjects(u)) redirect('/');
  return u;
}
