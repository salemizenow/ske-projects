'use client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { register, type FormState } from '@/app/actions/auth';
import { Icon } from '@/components/Icon';
import { ErrorNote } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(register, {});
  const [show, setShow] = useState(false);
  if (state.ok) return (
    <div className="sent"><span className="tick"><Icon name="check" /></span><h1>Request sent</h1>
      <p className="sub">We created the account for <b>{state.email}</b>. An admin will approve it, then you can sign in.</p>
      <Link className="btn" href="/login">Back to sign in</Link></div>
  );
  const f = state.fields ?? {};
  return (
    <>
      <div><div className="eyebrow">Create account</div><h1 style={{ marginTop: 8 }}>Join your team</h1><p className="sub">An admin approves new accounts and decides what you can see.</p></div>
      <form action={action} className="form" noValidate>
        <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" defaultValue={f.name} required /></div>
        <div className="field"><label htmlFor="email">Work email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="name@company.com" defaultValue={f.email} required /></div>
        <div className="grid2">
          <div className="field"><label htmlFor="phone">Mobile</label><input id="phone" name="phone" inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder="98765 43210" defaultValue={f.phone} /></div>
          <div className="field"><label htmlFor="designation">Designation</label><input id="designation" name="designation" placeholder="Site supervisor" defaultValue={f.designation} /></div>
        </div>
        <div className="field"><label htmlFor="password">Password</label>
          <div className="pw"><input id="password" name="password" type={show ? 'text' : 'password'} autoComplete="new-password" required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'eyeoff' : 'eye'} /></button></div>
          <span className="hint">At least 8 characters.</span></div>
        <div className="field"><label htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></div>
        <ErrorNote text={state.error} />
        <SubmitButton className="btn block" pendingText="Creating…">Create account</SubmitButton>
      </form>
      <p className="auth-alt">Already have an account? <Link className="link" href="/login">Sign in</Link></p>
    </>
  );
}
