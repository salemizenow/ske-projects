import { Icon } from '@/components/Icon';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-form">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo-l" src="/brand/logo.svg" alt="Shri Krishna Enterprises" />
        <div className="auth-in">{children}</div>
      </section>
      <aside className="auth-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo-d" src="/brand/logo-dark.svg" alt="" />
        <div><h2>Every project, every site, one place.</h2><p>Create a project, choose who works on it, and approve each step as the team finishes it.</p></div>
        <div className="feat">
          <div><span className="k"><Icon name="link" /></span><span><b>A link for every project</b><small>Share it with the people you pick. Nobody else can open it.</small></span></div>
          <div><span className="k"><Icon name="shield" /></span><span><b>Access by role</b><small>Managers approve, team members update their steps, clients only watch.</small></span></div>
          <div><span className="k"><Icon name="task" /></span><span><b>Steps with owners</b><small>Every step has one person and a clear status.</small></span></div>
        </div>
      </aside>
    </div>
  );
}
