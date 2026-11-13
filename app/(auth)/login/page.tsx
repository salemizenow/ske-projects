import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
  return (
    <>
      <div><div className="eyebrow">SKE Projects</div><h1 style={{ marginTop: 8 }}>Welcome back</h1><p className="sub">Sign in with your work email.</p></div>
      <LoginForm next={next ?? ''} />
    </>
  );
}
