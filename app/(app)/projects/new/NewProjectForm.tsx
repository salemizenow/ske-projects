'use client';
import { startTransition, useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { createProject } from '@/app/actions/projects';
import type { FormState } from '@/app/actions/auth';
import { ACCESS_LABEL, TEMPLATES, initials, kb } from '@/lib/format';
import { uploadFiles } from '@/lib/upload-client';
import { Icon } from '@/components/Icon';
import { ErrorNote } from '@/components/ui';

type Person = { id: string; name: string; email: string; designation: string | null; role: 'ADMIN' | 'MEMBER' };
type Access = 'MANAGE' | 'CONTRIBUTE' | 'VIEW';
const iso = (d: Date) => new Date(d.getTime() + 5.5 * 36e5).toISOString().slice(0, 10);

export function NewProjectForm({ me, people }: { me: { id: string; name: string }; people: Person[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createProject, {});
  const [d, setD] = useState(() => ({ title: '', category: 'Manpower deployment', client: '', site: '', workOrder: '', start: iso(new Date()), due: iso(new Date(Date.now() + 30 * 864e5)), budget: '', brief: '' }));
  const [members, setMembers] = useState<Record<string, Access>>({});
  const [steps, setSteps] = useState(() => TEMPLATES['Manpower deployment'].map((title) => ({ title, assigneeId: '' })));
  const [files, setFiles] = useState<File[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  const workers = useMemo(() => [{ id: me.id, name: me.name + ' (you)' }, ...people.filter((p) => members[p.id] && members[p.id] !== 'VIEW')], [me, people, members]);
  const unassign = (id: string) => setSteps((s) => s.map((x) => (x.assigneeId === id ? { ...x, assigneeId: '' } : x)));

  async function onSubmit(form: FormData) {
    setErr('');
    const clean = steps.filter((s) => s.title.trim());
    const check = !d.title.trim() ? 'Give the project a name.' : !d.brief.trim() ? 'Write a short brief.' : d.due < d.start ? 'The due date is before the start date.' : !clean.length ? 'Add at least one step.' : clean.some((s) => !s.assigneeId) ? 'Choose an owner for every step.' : '';
    if (check) { setErr(check); return; }
    setBusy(true);
    try {
      const up = await uploadFiles(files, null);
      form.set('payload', JSON.stringify({ ...d, budget: Number(d.budget.replace(/\D/g, '')) || 0, members: Object.entries(members).map(([userId, access]) => ({ userId, access })), steps: clean, files: up.files }));
      startTransition(() => action(form));
    } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setBusy(false); }
  }

  return (
    <form action={onSubmit} className="form" noValidate>
      <section className="card fsec"><div className="sh"><span className="n">1</span><div><b>Details</b><small>What everyone sees first.</small></div></div>
        <div className="field"><label htmlFor="title">Project name *</label><input id="title" value={d.title} onChange={set('title')} placeholder="e.g. Manpower deployment — Kanpur yard" /></div>
        <div className="grid2">
          <div className="field"><label htmlFor="category">Type of work</label><select id="category" value={d.category} onChange={(e) => { setD({ ...d, category: e.target.value }); setSteps(TEMPLATES[e.target.value].map((title) => ({ title, assigneeId: '' }))); }}>{Object.keys(TEMPLATES).map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="client">Client</label><input id="client" value={d.client} onChange={set('client')} placeholder="HBL Engineering" /></div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="site">Site</label><input id="site" value={d.site} onChange={set('site')} placeholder="Kanpur Central, UP" /></div>
          <div className="field"><label htmlFor="wo">Work order no.</label><input id="wo" value={d.workOrder} onChange={set('workOrder')} placeholder="HBL/WO/2026/118" /></div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="start">Start *</label><input id="start" type="date" value={d.start} onChange={set('start')} /></div>
          <div className="field"><label htmlFor="due">Due *</label><input id="due" type="date" value={d.due} onChange={set('due')} /></div>
          <div className="field"><label htmlFor="budget">Value (₹)</label><input id="budget" inputMode="numeric" value={d.budget} onChange={set('budget')} placeholder="1850000" /></div>
        </div>
        <div className="field"><label htmlFor="brief">Brief *</label><textarea id="brief" value={d.brief} onChange={set('brief')} placeholder="Scope, headcount, timings, safety needs" /></div>
        <label className="drop"><Icon name="clip" /><span><b>Attach documents</b><br /><small>{files.length ? `${files.length} attached` : 'Work order, drawings, survey report'}</small></span><input type="file" multiple onChange={(e) => setFiles([...files, ...Array.from<File>(e.target.files ?? [])])} /></label>
        {files.length > 0 && <div className="files">{files.map((f, i) => <span className="file" key={i}><Icon name="doc" size="sm" /><span>{f.name}</span><small>{kb(f.size)}</small><button type="button" className="link" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><Icon name="x" size="sm" /></button></span>)}</div>}
      </section>

      <section className="card fsec"><div className="sh"><span className="n">2</span><div><b>People & access</b><small>Only the people you tick will see this project. You are the manager.</small></div></div>
        <div className="access-help">{(Object.keys(ACCESS_LABEL) as Access[]).map((k) => <div key={k}><span className={`tag ${ACCESS_LABEL[k].cls}`} style={{ alignSelf: 'flex-start' }}>{ACCESS_LABEL[k].label}</span>{ACCESS_LABEL[k].help}</div>)}</div>
        <div className="pick">{people.length ? people.map((p) => { const on = !!members[p.id]; return (
          <label key={p.id} className={`prow ${on ? 'on' : ''}`}>
            <input type="checkbox" checked={on} onChange={(e) => { const m = { ...members }; if (e.target.checked) m[p.id] = 'CONTRIBUTE'; else { delete m[p.id]; unassign(p.id); } setMembers(m); }} />
            <span className={`av ${p.role === 'ADMIN' ? 'navy' : ''}`}>{initials(p.name)}</span>
            <span className="t"><b>{p.name}</b><small>{p.designation ? `${p.designation} · ` : ''}{p.email}</small></span>
            {on && <select aria-label={`Access for ${p.name}`} value={members[p.id]} onChange={(e) => { const v = e.target.value as Access; setMembers({ ...members, [p.id]: v }); if (v === 'VIEW') unassign(p.id); }}>{(Object.keys(ACCESS_LABEL) as Access[]).map((k) => <option key={k} value={k}>{ACCESS_LABEL[k].label}</option>)}</select>}
          </label>); }) : <p className="muted">No other active accounts yet. Approve people in Team first.</p>}</div>
      </section>

      <section className="card fsec"><div className="sh"><span className="n">3</span><div><b>Steps & owners</b><small>Each step goes to one person. They update it and send it to you for approval.</small></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{steps.map((s, i) => (
          <div className="srow" key={i}><span className="idx num">{i + 1}</span>
            <input aria-label={`Step ${i + 1}`} value={s.title} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <select aria-label={`Owner of step ${i + 1}`} value={s.assigneeId} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, assigneeId: e.target.value } : x)))}><option value="">Choose owner</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            <button type="button" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label="Remove step"><Icon name="trash" size="sm" /></button></div>))}</div>
        <button type="button" className="btn ghost" onClick={() => setSteps([...steps, { title: '', assigneeId: '' }])}><Icon name="plus" size="sm" />Add step</button>
      </section>

      <ErrorNote text={err || state.error} />
      <div className="sticky-foot"><Link className="btn ghost" href="/">Cancel</Link><button className="btn gold" type="submit" disabled={busy || pending}><Icon name="link" size="sm" />{busy ? 'Uploading…' : pending ? 'Creating…' : 'Create & get link'}</button></div>
    </form>
  );
}
