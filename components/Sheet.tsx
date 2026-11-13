'use client';
import { useEffect, useRef } from 'react';

/** Bottom sheet on phones, centred dialog on desktop. Closes on Escape or a click outside. */
export function Sheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('textarea,input:not([type=hidden]):not([type=range]):not([type=file]),select')?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', key);
    return () => { removeEventListener('keydown', key); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={ref}>
        <span className="grab" />
        <div><h2 id="sheet-title">{title}</h2>{sub && <p className="sub">{sub}</p>}</div>
        {children}
      </div>
    </div>
  );
}
