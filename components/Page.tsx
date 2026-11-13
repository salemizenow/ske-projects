import type { User } from '@prisma/client';
import { TopBar } from './Nav';
import { navMe } from '@/lib/view';

export function Page({ me, title, sub, back, children }: { me: User; title: string; sub?: string; back?: string; children: React.ReactNode }) {
  return (<><TopBar title={title} sub={sub} back={back} me={navMe(me)} /><main className="content" id="main">{children}</main></>);
}
