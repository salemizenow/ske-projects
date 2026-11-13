'use client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { login, type FormState } from '@/app/actions/auth';
import { Icon } from '@/components/Icon';
import { ErrorNote } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, {});
  const [show, setShow] = useState(false);
  return (
    <>
      {next.startsWith('/projects/') && <div className="note"><Icon name="link" size="sm" /><span>Sign in to open the shared project.</span></div>}
      <form action={action} className="form" noValidate>
        <input type="hidden" name="next" value={next} />
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" placeholder="name@company.com" defaultValue={state.email} required /></div>
        <div className="field"><label htmlFor="password">Password</label>
          <div className="pw"><input id="password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'eyeoff' : 'eye'} /></button></div></div>
        <ErrorNote text={state.error} />
        <SubmitButton className="btn block" pendingText="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="auth-alt">New to SKE Projects? <Link className="link" href="/register">Create an account</Link></p>
      <p className="ver">next-v1.0</p>
    </>
  );
}
