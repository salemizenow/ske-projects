'use client';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMembers, addStep, addUpdate, assignStep, changeMemberAccess, completeProject, reviewStep, submitStep } from '@/app/actions/projects';
import type { FormState } from '@/app/actions/auth';
import { ACCESS_LABEL, initials } from '@/lib/format';
import { uploadFiles } from '@/lib/upload-client';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { ErrorNote } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { CopyButton } from '@/components/CopyButton';

type Act = (state: FormState, form: FormData) => Promise<FormState>;
type Person = { id: string; name: string };

/** A sheet wrapping one server action; closes itself when the action succeeds. */
function ActionSheet({ act, title, sub, submit, tone = '', onClose, children, prepare }: { act: Act; title: string; sub?: string; submit: string; tone?: string; onClose: () => void; children: React.ReactNode; prepare?: (f: FormData) => Promise<string | void> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(act, {});
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (state.ok) onClose(); }, [state, onClose]);
  async function run(f: FormData) {
    setErr('');
    if (prepare) { setBusy(true); try { const w = await prepare(f); if (w) setErr(w); } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed.'); setBusy(false); return; } setBusy(false); }
    startTransition(() => action(f));
  }
  return (
    <Sheet title={title} sub={sub} onClose={onClose}>
      <form action={run} className="form" noValidate>
        {children}
        <ErrorNote text={state.error || err} />
        <div className="acts" style={{ flexWrap: 'nowrap' }}><button type="button" className="btn ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className={`btn ${tone}`} type="submit" style={{ flex: 1.4 }} disabled={busy || pending}>{busy ? 'Uploading…' : pending ? 'Saving…' : submit}</button></div>
      </form>
    </Sheet>
  );
}

export function StepActions({ code, step, owner, can, team }: { code: string; step: { id: string; title: string; assigneeId: string | null; lastPct: number }; owner: string; can: { update: boolean; submit: boolean; review: boolean; assign: boolean }; team: Person[] }) {
  const [open, setOpen] = useState<null | 'update' | 'submit' | 'approve' | 'changes' | 'assign'>(null);
  const [pct, setPct] = useState(Math.max(step.lastPct, 10));
  const [files, setFiles] = useState<File[]>([]);
  const close = () => { setOpen(null); setFiles([]); };
  if (!can.update && !can.submit && !can.review && !can.assign) return null;
  return (
    <>
      <div className="acts">
        {can.update && <button className={`btn sm ${step.lastPct ? 'ghost' : ''}`} onClick={() => setOpen('update')}><Icon name="edit" size="sm" />Add update</button>}
        {can.submit && <button className="btn sm" onClick={() => setOpen('submit')}><Icon name="send" size="sm" />Send for approval</button>}
        {can.review && <><button className="btn sm ok" onClick={() => setOpen('approve')}><Icon name="check" size="sm" />Approve</button><button className="btn sm bad" onClick={() => setOpen('changes')}><Icon name="x" size="sm" />Ask for changes</button></>}
        {can.assign && <button className="btn sm ghost" onClick={() => setOpen('assign')}><Icon name="users" size="sm" />Assign</button>}
      </div>
      {open === 'update' && <ActionSheet act={addUpdate.bind(null, code, step.id)} title="Add update" sub={step.title} submit="Post update" onClose={close}
        prepare={async (f) => { const up = await uploadFiles(files, code); f.set('files', JSON.stringify(up.files)); return up.warning; }}>
        <div className="field"><span className="flabel">How much of this step is done?</span><div className="range"><input name="pct" type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(+e.target.value)} aria-label="Percent done" /><output className="num">{pct}%</output></div></div>
        <div className="field"><label htmlFor="note">What was done</label><textarea id="note" name="note" placeholder="e.g. 18 workers on site, PPE issued" /></div>
        <label className="drop"><Icon name="clip" /><span><b>Add photos or files</b><br /><small>{files.length ? `${files.length} attached` : 'Optional'}</small></span><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => setFiles(Array.from<File>(e.target.files ?? []))} /></label>
      </ActionSheet>}
      {open === 'submit' && <ActionSheet act={submitStep.bind(null, code, step.id)} title="Send for approval" sub={step.title} submit="Send" onClose={close}>
        <p className="muted">{owner} will check it and approve it or ask for changes.</p>
        <div className="field"><label htmlFor="note">Note (optional)</label><textarea id="note" name="note" /></div>
      </ActionSheet>}
      {open === 'approve' && <ActionSheet act={reviewStep.bind(null, code, step.id, 'approved')} title="Approve step" sub={step.title} submit="Approve" tone="ok" onClose={close}>
        <div className="field"><label htmlFor="note">Comment (optional)</label><textarea id="note" name="note" placeholder="Good work." /></div>
      </ActionSheet>}
      {open === 'changes' && <ActionSheet act={reviewStep.bind(null, code, step.id, 'changes')} title="Ask for changes" sub={step.title} submit="Send back" tone="bad" onClose={close}>
        <div className="field"><label htmlFor="note">What needs to change *</label><textarea id="note" name="note" /></div>
      </ActionSheet>}
      {open === 'assign' && <ActionSheet act={assignStep.bind(null, code, step.id)} title="Assign step" sub={step.title} submit="Assign" onClose={close}>
        <div className="pick">{team.map((m) => <label key={m.id} className="prow"><input type="radio" name="assigneeId" value={m.id} defaultChecked={m.id === step.assigneeId} /><span className="av">{initials(m.name)}</span><span className="t"><b>{m.name}</b></span></label>)}</div>
      </ActionSheet>}
    </>
  );
}

export function AddStepButton({ code, team }: { code: string; team: Person[] }) {
  const [open, setOpen] = useState(false);
  return (<>
    <button className="btn ghost" onClick={() => setOpen(true)}><Icon name="plus" size="sm" />Add step</button>
    {open && <ActionSheet act={addStep.bind(null, code)} title="Add step" submit="Add step" onClose={() => setOpen(false)}>
      <div className="field"><label htmlFor="title">Step name *</label><input id="title" name="title" /></div>
      <div className="field"><label htmlFor="who">Owner *</label><select id="who" name="assigneeId">{team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
    </ActionSheet>}
  </>);
}

export function AddMembersButton({ code, candidates }: { code: string; candidates: { id: string; name: string; designation: string | null; email: string }[] }) {
  const [open, setOpen] = useState(false);
  return (<>
    <button className="btn sm ghost" onClick={() => setOpen(true)}><Icon name="plus" size="sm" />Add</button>
    {open && (candidates.length ? <ActionSheet act={addMembers.bind(null, code)} title="Add people" submit="Add" onClose={() => setOpen(false)}>
      <div className="pick">{candidates.map((c) => <label key={c.id} className="prow"><input type="checkbox" name="userId" value={c.id} /><span className="av">{initials(c.name)}</span><span className="t"><b>{c.name}</b><small>{c.designation || c.email}</small></span></label>)}</div>
      <div className="field"><label htmlFor="acc">Access</label><select id="acc" name="access" defaultValue="CONTRIBUTE">{(['MANAGE', 'CONTRIBUTE', 'VIEW'] as const).map((k) => <option key={k} value={k}>{ACCESS_LABEL[k].label}: {ACCESS_LABEL[k].help}</option>)}</select></div>
    </ActionSheet> : <Sheet title="Add people" onClose={() => setOpen(false)}><p className="muted">Everyone with an active account is already on this project.</p><button className="btn ghost" onClick={() => setOpen(false)}>Close</button></Sheet>)}
  </>);
}

export function MemberAccess({ code, userId, name, access }: { code: string; userId: string; name: string; access: 'MANAGE' | 'CONTRIBUTE' | 'VIEW' }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <select aria-label={`Access for ${name}`} defaultValue={access} disabled={busy} onChange={async (e) => { setBusy(true); setErr(''); const r = await changeMemberAccess(code, userId, e.target.value); if (r.error) setErr(r.error); setBusy(false); }}>
        {(['MANAGE', 'CONTRIBUTE', 'VIEW'] as const).map((k) => <option key={k} value={k}>{ACCESS_LABEL[k].label}</option>)}<option value="REMOVE">Remove</option>
      </select>{err && <small style={{ color: 'var(--bad)' }}>{err}</small>}
    </span>
  );
}

export function CompleteButton({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  return (<>
    <button className="btn ok" onClick={() => setOpen(true)}><Icon name="shield" size="sm" />Mark project complete</button>
    {open && <ActionSheet act={async () => completeProject(code)} title="Mark project complete" submit="Complete project" tone="ok" onClose={() => setOpen(false)}>
      <p className="muted">All steps are approved. The project moves to Completed for everyone on it.</p>
    </ActionSheet>}
  </>);
}

export function CreatedDialog({ code, title, link, people }: { code: string; title: string; link: string; people: { name: string; wa: string | null }[] }) {
  const router = useRouter(); const [open, setOpen] = useState(true);
  if (!open) return null;
  const close = () => { setOpen(false); router.replace(`/projects/${code}`, { scroll: false }); };
  return (
    <Sheet title="Project created" sub={`${code} · ${title}`} onClose={close}>
      <div className="note" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}><Icon name="check" size="sm" /><span>It now shows on the home page of {people.length ? people.map((p) => p.name.split(' ')[0]).join(', ') : 'only you'}.</span></div>
      <div className="share" style={{ boxShadow: 'none' }}><b>Project link</b><div className="lk"><code>{link}</code><CopyButton text={link} /></div>
        <div className="acts">{people.filter((p) => p.wa).map((p) => <a key={p.name} className="btn sm ghost" target="_blank" rel="noopener" href={p.wa!}><Icon name="wa" size="sm" />Send to {p.name.split(' ')[0]}</a>)}</div></div>
      <button className="btn" onClick={close}>Done</button>
    </Sheet>
  );
}
