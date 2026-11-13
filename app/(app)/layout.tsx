import { requireUser } from '@/lib/auth';
import { navCounts, navMe } from '@/lib/view';
import { Sidebar, TabBar } from '@/components/Nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const counts = await navCounts(u);
  const me = navMe(u);
  return (
    <div className="shell">
      <Sidebar me={me} counts={counts} />
      {children}
      <TabBar me={me} counts={counts} />
    </div>
  );
}
