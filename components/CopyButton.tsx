'use client';
import { useState } from 'react';
import { Icon } from './Icon';

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn sm ghost" onClick={async (e) => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }
      catch { const code = (e.currentTarget.parentElement as HTMLElement).querySelector('code'); if (code) { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); } }
    }}><Icon name={done ? 'check' : 'copy'} size="sm" />{done ? 'Copied' : 'Copy'}</button>
  );
}
